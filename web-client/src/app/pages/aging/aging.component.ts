import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { CollectorService, Collector } from 'src/app/services/collector.service';

interface TaskStatus {
    taskId: string;
    state: string;  // PENDING, RUNNING, DONE, FAILED
    deletedCount: number;
    errorMessage?: string;
    startedAt: number;
    finishedAt?: number;
}

interface AgingSchedule {
    enabled: boolean;
    scheduleType: string;
    executionTime: string;
    retentionDays: number;
}

@Component({
    selector: 'app-aging',
    templateUrl: './aging.component.html',
    styleUrls: ['./aging.component.scss']
})
export class AgingComponent implements OnInit {
    targetSessionId = 'eaec0ddf-8600-4d4a-ad5b-e19b72c960fa';
    isLoading = false;
    currentTask: TaskStatus | null = null;
    // 展示 ens33 的采集器名称（逗号分隔）和对应的 sessionId 列表
    ens33CollectorNames: string = '';
    ens33SessionIds: string[] = [];

    // 手动删除时间（前端本地时区），用于传递给后端作为时间条件
    manualBeforeTime: string = '';
    
    // 自动删除设置
    schedule: AgingSchedule = {
        enabled: false,
        scheduleType: 'daily',
        executionTime: '02:00',
        retentionDays: 30
    };

    scheduleOptions = [
        { value: 'daily', label: 'aiAssistant.aging.schedule.daily' },
        { value: 'weekly', label: 'aiAssistant.aging.schedule.weekly' },
        { value: 'monthly', label: 'aiAssistant.aging.schedule.monthly' }
    ];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private collectorService: CollectorService,
    ) {}

    ngOnInit() {
        this.loadScheduleSettings();
        this.loadEns33Collectors();
        // 默认时间设为当前时间
        this.manualBeforeTime = this.formatDateTimeLocal(new Date());
    }

    private formatDateTimeLocal(d: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    private loadEns33Collectors() {
        this.collectorService.getAllCollectors().subscribe({
            next: (collectors: Collector[]) => {
                const list = (collectors || []).filter(c => c.interfaceName === 'ens33');
                this.ens33CollectorNames = list.map(c => c.name).filter(Boolean).join(', ');
                this.ens33SessionIds = list
                    .map(c => (c as any).sessionId as (string | undefined))
                    .filter((v): v is string => !!v);
                // 默认选第一个 sessionId 作为展示（不再作为唯一参数）
                if (this.ens33SessionIds.length > 0) {
                    this.targetSessionId = this.ens33SessionIds[0];
                }
            },
            error: (err) => {
                console.error('Failed to load collectors:', err);
                this.ens33CollectorNames = '';
                this.ens33SessionIds = [];
            }
        });
    }

    loadScheduleSettings() {
        // 加载当前的调度设置
        this.http.get<AgingSchedule>(`${environment.apiUrl}/aging/schedule`).subscribe({
            next: (data) => {
                if (data) {
                    this.schedule = data;
                }
            },
            error: () => {
                console.log('No existing schedule found, using defaults');
            }
        });
    }

    async executeManualAging() {
        const beforeMillis = this.manualBeforeTime ? new Date(this.manualBeforeTime).getTime() : Date.now();
        const collectorsText = this.ens33CollectorNames || '-';
        const confirmText = this.ens33SessionIds.length > 1
            ? this.translate.instant('aiAssistant.aging.manual.confirmMessageMultiple', { 
                collectors: collectorsText, 
                time: new Date(beforeMillis).toLocaleString() 
              })
            : this.translate.instant('aiAssistant.aging.manual.confirmMessage', { 
                sessionId: this.targetSessionId 
              });
        const result = await Swal.fire({
            title: this.translate.instant('aiAssistant.aging.manual.confirmTitle'),
            text: confirmText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: this.translate.instant('aiAssistant.aging.manual.execute'),
            cancelButtonText: this.translate.instant('common.cancel'),
            confirmButtonColor: '#dc3545'
        });

        if (!result.isConfirmed) {
            return;
        }

        this.isLoading = true;
        try {
            // 传递所有 ens33 的 sessionIds 与 时间条件
            const payload: any = {
                sessionIds: this.ens33SessionIds,
                before: beforeMillis
            };
            const response = await this.http.post<{ taskId: string }>(
                `${environment.apiUrl}/aging/execute`,
                payload
            ).toPromise();

            if (response?.taskId) {
                this.currentTask = {
                    taskId: response.taskId,
                    state: 'RUNNING',
                    deletedCount: 0,
                    startedAt: Date.now()
                };

                this.monitorTask(response.taskId);
                
                // Show a simple toast notification that task started
                Swal.fire({
                    icon: 'info',
                    title: this.translate.instant('aiAssistant.aging.manual.started'),
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        } catch (error) {
            console.error('Error executing manual aging:', error);
            this.showError('Failed to execute manual aging');
        } finally {
            this.isLoading = false;
        }
    }

    saveScheduleSettings() {
        this.http.post(`${environment.apiUrl}/aging/schedule`, this.schedule).subscribe({
            next: () => {
                this.showSuccess(this.translate.instant('aiAssistant.aging.schedule.saved'));
            },
            error: (error) => {
                console.error('Error saving schedule:', error);
                this.showError('Failed to save schedule settings');
            }
        });
    }

    private monitorTask(taskId: string) {
        const pollInterval = setInterval(() => {
            this.http.get<TaskStatus>(`${environment.apiUrl}/aging/status/${taskId}`).subscribe({
                next: (status) => {
                    this.currentTask = status;
                    
                    if (status.state === 'DONE' || status.state === 'FAILED') {
                        clearInterval(pollInterval);
                        
                        if (status.state === 'DONE') {
                            this.showSuccess(this.translate.instant('aiAssistant.aging.completed', { 
                                count: status.deletedCount 
                            }));
                        } else {
                            this.showError(this.translate.instant('aiAssistant.aging.failed', { 
                                error: status.errorMessage 
                            }));
                        }
                    }
                },
                error: (error) => {
                    console.error('Error polling task status:', error);
                    clearInterval(pollInterval);
                    this.currentTask = null;
                }
            });
        }, 2000);
    }

    isTaskRunning(): boolean {
        return this.currentTask?.state === 'RUNNING';
    }

    getStateLabel(state: string): string {
        switch (state) {
            case 'PENDING':
                return this.translate.instant('aiAssistant.aging.states.pending');
            case 'RUNNING':
                return this.translate.instant('aiAssistant.aging.states.running');
            case 'DONE':
                return this.translate.instant('aiAssistant.aging.states.done');
            case 'FAILED':
                return this.translate.instant('aiAssistant.aging.states.failed');
            default:
                return state;
        }
    }

    private showSuccess(message: string) {
        Swal.fire({
            icon: 'success',
            title: this.translate.instant('common.success'),
            text: message,
            timer: 3000,
            showConfirmButton: false
        });
    }

    private showError(message: string) {
        Swal.fire({
            icon: 'error',
            title: this.translate.instant('common.error'),
            text: message
        });
    }
}
