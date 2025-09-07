import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReportSchedulerService } from '../../services/report-scheduler.service';
import { TemplateService } from '../../services/template.service';
import { NotificationSettingService } from '../../services/notification-setting.service';
import { environment } from '../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-report-scheduler',
    templateUrl: './report-scheduler.component.html'
})
export class ReportSchedulerComponent implements OnInit {
    @ViewChild('addSchedulerModal') addSchedulerModal: any;

    displayType: string = 'list';
    searchText: string = '';
    params!: FormGroup;

    whereToSendOptions: any[] = [];
    templateOptions: any[] = [];

    schedulers: any[] = [];
    filteredSchedulers: any[] = [];

    constructor(
        private fb: FormBuilder,
        private reportSchedulerService: ReportSchedulerService,
        private templateService: TemplateService,
        private notificationSettingService: NotificationSettingService,
        private translate: TranslateService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.loadSchedulers();
        this.loadTemplates();
        this.loadNotificationSettings();
    }

    loadTemplates() {
        this.templateService.getTemplates().subscribe({
            next: (data) => {
                this.templateOptions = data.map(template => ({
                    value: template.name,
                    label: template.name
                }));
            },
            error: (error) => {
                console.error('Error loading templates:', error);
            }
        });
    }

    loadNotificationSettings() {
        this.notificationSettingService.getSettings().subscribe({
            next: (data) => {
                this.whereToSendOptions = data.map(setting => ({
                    value: setting.service === 'email' ? setting.receiver : `${setting.host}:${setting.syslogPort}`,
                    label: `${setting.name} (${setting.service === 'email' ? setting.receiver : `${setting.host}:${setting.syslogPort}`})`
                }));
            },
            error: (error) => {
                console.error('Error loading notification settings:', error);
            }
        });
    }

    initForm() {
        this.params = this.fb.group({
            id: [null],
            name: ['', [Validators.required, Validators.minLength(2)]],
            description: ['', [Validators.required, Validators.minLength(5)]],
            template: ['', Validators.required],
            frequency: ['', Validators.required],
            time: ['', Validators.required],
            whereToSend: ['', Validators.required],
            status: ['Active', Validators.required]
        });
    }

    loadSchedulers() {
        this.reportSchedulerService.getSchedulers().subscribe({
            next: (data) => {
                this.schedulers = data;
                this.searchSchedulers();
            },
            error: (error) => {
                console.error('Error loading schedulers:', error);
            }
        });
    }

    editScheduler(scheduler: any = null) {
        if (scheduler) {
            // 确保时间格式正确 (HH:mm)
            let timeValue = scheduler.time;
            if (timeValue && typeof timeValue === 'string') {
                // 如果时间是数组格式 [HH, mm] 或其他格式，转换为 HH:mm
                if (timeValue.includes(',')) {
                    const timeParts = timeValue.split(',');
                    if (timeParts.length >= 2) {
                        const hours = timeParts[0].trim().padStart(2, '0');
                        const minutes = timeParts[1].trim().padStart(2, '0');
                        timeValue = `${hours}:${minutes}`;
                    }
                } else if (timeValue.length === 8 && timeValue.includes(':')) {
                    // 如果是 HH:mm:ss 格式，截取 HH:mm
                    timeValue = timeValue.substring(0, 5);
                }
            }

            console.log('Editing scheduler:', scheduler);
            console.log('Time value:', timeValue);

            this.params.patchValue({
                id: scheduler.id,
                name: scheduler.name,
                description: scheduler.description,
                template: scheduler.template,
                frequency: scheduler.frequency,
                time: timeValue,
                whereToSend: scheduler.whereToSend,
                status: scheduler.status
            });
        } else {
            this.params.reset();
            this.params.patchValue({ status: 'Active' });
        }
        this.addSchedulerModal.open();
    }

    deleteScheduler(scheduler: any) {
        this.translate.get(['Are you sure?', "You won't be able to revert this!", 'Yes, delete it!', 'Scheduler has been deleted successfully', 'Error deleting scheduler'])
        .subscribe(translations => {
            Swal.fire({
                title: translations['Are you sure?'],
                text: translations["You won't be able to revert this!"],
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: translations['Yes, delete it!'],
                padding: '2em'
            }).then((result) => {
                if (result.value) {
                    this.reportSchedulerService.deleteScheduler(scheduler.id).subscribe({
                        next: () => {
                            this.loadSchedulers();
                            this.showMessage(translations['Scheduler has been deleted successfully']);
                        },
                        error: (error) => {
                            console.error('Error deleting scheduler:', error);
                            this.showMessage(translations['Error deleting scheduler'], 'error');
                        }
                    });
                }
            });
        });
    }

    executeScheduler(scheduler: any) {
        this.translate.get(['Execute Scheduler', 'Are you sure you want to execute this scheduler now?', 'Yes, execute it!', 'Scheduler executed successfully', 'Error executing scheduler'])
        .subscribe(translations => {
            Swal.fire({
                title: translations['Execute Scheduler'],
                text: translations['Are you sure you want to execute this scheduler now?'],
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: translations['Yes, execute it!'],
                padding: '2em'
            }).then((result) => {
                if (result.value) {
                    this.reportSchedulerService.executeScheduler(scheduler.id).subscribe({
                        next: (response: any) => {
                            console.log('Scheduler execution response:', response);
                            this.showMessage(translations['Scheduler executed successfully']);
                        },
                        error: (error: any) => {
                            console.error('Error executing scheduler:', error);
                            let errorMessage = translations['Error executing scheduler'];
                            if (error.error && typeof error.error === 'string') {
                                errorMessage += ': ' + error.error;
                            } else if (error.message) {
                                errorMessage += ': ' + error.message;
                            }
                            this.showMessage(errorMessage, 'error');
                        }
                    });
                }
            });
        });
    }

    saveScheduler() {
        if (!this.params.valid) {
            this.translate.get('Please fill all required fields.').subscribe(message => {
                this.showMessage(message, 'error');
            });
            return;
        }

        const formValue = this.params.value;
        
        // 确保时间格式正确 (HH:mm)
        let timeValue = formValue.time;
        if (timeValue && timeValue.length === 8) { // 如果是 HH:mm:ss 格式
            timeValue = timeValue.substring(0, 5); // 截取 HH:mm 部分
        }
        
        // 准备调度器数据，只包含需要更新的字段
        const schedulerData: any = {
            name: formValue.name,
            description: formValue.description,
            template: formValue.template,
            frequency: formValue.frequency,
            time: timeValue,
            whereToSend: formValue.whereToSend,
            status: formValue.status || 'Active'
        };

        console.log('Saving scheduler data:', schedulerData);

        // 如果是更新操作，添加ID但不包含时间戳字段
        if (formValue.id) {
            schedulerData.id = formValue.id;
            
            this.reportSchedulerService.updateScheduler(formValue.id, schedulerData).subscribe({
                next: (result) => {
                    console.log('Update scheduler result:', result);
                    this.loadSchedulers();
                    this.translate.get('Scheduler has been updated successfully').subscribe(message => {
                        this.showMessage(message);
                    });
                    this.addSchedulerModal.close();
                },
                error: (error) => {
                    console.error('Error updating scheduler:', error);
                    this.translate.get('Error updating scheduler').subscribe(message => {
                        this.showMessage(message, 'error');
                    });
                }
            });
        } else {
            // 创建新调度器
            this.reportSchedulerService.createScheduler(schedulerData).subscribe({
                next: () => {
                    this.loadSchedulers();
                    this.translate.get('Scheduler has been created successfully').subscribe(message => {
                        this.showMessage(message);
                    });
                    this.addSchedulerModal.close();
                },
                error: (error) => {
                    console.error('Error creating scheduler:', error);
                    if (error.error) {
                        console.error('Error details:', error.error);
                    }
                    this.translate.get('Error creating scheduler').subscribe(message => {
                        this.showMessage(message, 'error');
                    });
                }
            });
        }
    }

    searchSchedulers() {
        this.filteredSchedulers = this.schedulers.filter(item => {
            const searchStr = this.searchText.toLowerCase();
            return (
                item.name.toLowerCase().includes(searchStr) ||
                item.description.toLowerCase().includes(searchStr) ||
                item.template.toLowerCase().includes(searchStr) ||
                item.whereToSend.toLowerCase().includes(searchStr) ||
                item.frequency.toLowerCase().includes(searchStr)
            );
        });
    }

    getWhereToSendLabel(value: string): string {
        const option = this.whereToSendOptions.find(opt => opt.value === value);
        return option ? option.label : value;
    }

    getFrequencyLabel(value: string): string {
        switch (value) {
            case 'Daily':
                return this.translate.instant('common.Daily');
            case 'Weekly':
                return this.translate.instant('common.Weekly');
            case 'Monthly':
                return this.translate.instant('common.Monthly');
            default:
                return value;
        }
    }

    getTemplateLabel(value: string): string {
        switch (value) {
            case 'System Status Template':
                return this.translate.instant('templates.systemStatusTemplate');
            case 'Security Alert Template':
                return this.translate.instant('templates.securityAlertTemplate');
            case '系统状态模板':
                return this.translate.instant('templates.systemStatusTemplate');
            case '安全警报模板':
                return this.translate.instant('templates.securityAlertTemplate');
            default:
                return value;
        }
    }

    formatTime(time: string): string {
        if (!time) return '';
        // 确保时间格式为 HH:mm
        if (time.includes(':')) {
            return time;
        }
        // 如果是其他格式，尝试转换
        return time;
    }

    formatDate(dateTime: string): string {
        if (!dateTime) return '';
        try {
            const date = new Date(dateTime);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return dateTime;
        }
    }

    showMessage(msg = '', type = 'success') {
        const toast: any = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 3000,
            customClass: { container: 'toast' },
        });
        toast.fire({
            icon: type,
            title: msg,
            padding: '10px 20px',
        });
    }

    toggleSchedulerStatus(scheduler: any, event: Event) {
        const input = event.target as HTMLInputElement;
        const nextStatus = input.checked ? 'Active' : 'Inactive';
        const prevStatus = scheduler.status;
        scheduler.status = nextStatus; // optimistic
        this.reportSchedulerService.updateScheduler(scheduler.id, { ...scheduler, status: nextStatus }).subscribe({
            next: () => {
                this.showMessage(nextStatus === 'Active' ? 'Scheduler enabled successfully.' : 'Scheduler disabled successfully.');
            },
            error: () => {
                scheduler.status = prevStatus; // rollback
                this.showMessage('Failed to update scheduler status', 'error');
            }
        });
    }
}
