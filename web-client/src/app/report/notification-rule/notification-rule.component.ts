import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { NotificationSettingService } from '../../services/notification-setting.service';

@Component({
    selector: 'app-notification-rule',
    templateUrl: './notification-rule.component.html'
})
export class NotificationRuleComponent implements OnInit {
    @ViewChild('addRuleModal') addRuleModal: any;

    displayType: string = 'list';
    searchText: string = '';
    params!: FormGroup;

    timeWindowOptions = [
        { value: '24 hours', label: '24 Hours' },
        { value: '7 days', label: '7 Days' },
        { value: '30 days', label: '30 Days' }
    ];

    triggerConditionOptions = [
        { value: 'new_event', label: 'On New Event' },
        { value: 'condition', label: 'On Specific Condition' }
    ];

    // 由通知设置动态生成
    notificationMethodOptions: { value: string | number; label: string }[] = [];

    // 通知设置列表（来自 Notification Settings）
    notificationSettings: any[] = [];

    rules = [
        {
            id: 1,
            ruleName: 'High CPU Usage Alert',
            timeWindow: '24 hours',
            triggerCondition: 'new_event',
            // 仅用于占位/演示；实际从后端加载时使用 notificationSettingId
            notificationMethod: 'email',
            status: 'Active',
            filters: []
        },
        {
            id: 2,
            ruleName: 'Memory Usage Warning',
            timeWindow: '7 days',
            triggerCondition: 'condition',
            // 仅用于占位/演示；实际从后端加载时使用 notificationSettingId
            notificationMethod: 'syslog',
            status: 'Inactive',
            filters: [{ field: 'severity', value: 'high' }]
        }
    ];

    filteredRules: any[] = [];

    filters: any[] = [{ field: '', value: '' }];
    filterFields = [
        { value: 'severity', label: 'Severity' },
        { value: 'signature', label: 'Signature' },
        { value: 'dest_ip', label: 'Destination IP' },
        { value: 'src_ip', label: 'Source IP' },
        { value: 'app_proto', label: 'Application Protocol' }
    ];

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private translate: TranslateService,
        private notificationSettingService: NotificationSettingService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
    // 并行加载通知设置与规则
    this.loadNotificationSettings();
    this.loadRules();
    }

    initForm() {
        this.params = this.fb.group({
            id: [null],
            ruleName: ['', Validators.required],
            description: [''],
            timeWindow: ['', Validators.required],
            triggerCondition: ['', Validators.required],
            notificationSettingId: [null, Validators.required],
            status: ['Active']
        });

        this.params.get('triggerCondition')?.valueChanges.subscribe(value => {
            if (value === 'condition') {
                this.filters = [{ field: '', value: '' }];
            } else {
                this.filters = [];
            }
        });
    }

    addFilter() {
        this.filters.push({ field: '', value: '' });
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1);
    }

    editRule(rule: any = null) {
        this.addRuleModal.open();
        this.initForm();

        if (rule) {
            // 兼容：如果是旧字段 notificationMethod，则尽力映射为设置ID
            let settingId: any = (rule as any).notificationSettingId;
            if (!settingId && (rule as any).notificationMethod) {
                const legacy = (rule as any).notificationMethod;
                if (legacy === 'email' || legacy === 'syslog') {
                    const mapped = this.getSettingIdByService(legacy);
                    if (mapped !== null) settingId = mapped;
                }
            }

            const formValue = {
                id: rule.id,
                ruleName: rule.ruleName,
                description: rule.description,
                timeWindow: rule.timeWindow,
                triggerCondition: rule.triggerCondition,
                notificationSettingId: settingId ?? null,
                status: rule.status
            };

            this.params.patchValue(formValue);
            this.filters = rule.filters || [];

            if (rule.triggerCondition === 'condition' && this.filters.length === 0) {
                this.filters = [{ field: '', value: '' }];
            }
        } else {
            this.filters = [];
        }
    }

    deleteRule(rule: any) {
        this.translate.get(['Are you sure?', "You won't be able to revert this!", 'Yes, delete it!', 'Rule has been deleted successfully', 'Error deleting rule'])
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
                    this.http.delete(`${environment.apiUrl}/notification-rules/${rule.id}`).subscribe(
                        () => {
                            this.loadRules();
                            this.showMessage(translations['Rule has been deleted successfully'], 'success');
                        },
                        error => {
                            console.error('Error deleting rule:', error);
                            this.showMessage(translations['Error deleting rule'], 'error');
                        }
                    );
                }
            });
        });
    }

    saveRule() {
    const requiredFields = ['ruleName', 'timeWindow', 'triggerCondition', 'notificationSettingId'];
        const invalidFields = requiredFields.filter(field => !this.params.get(field)?.valid);

        if (invalidFields.length > 0) {
            this.showMessage(`Please fill the following fields: ${invalidFields.join(', ')}`, 'error');
            return;
        }

        if (this.params.get('triggerCondition')?.value === 'condition') {
            const validFilters = this.filters.filter(f => f.field && f.value);
            if (validFilters.length === 0) {
                this.translate.get('Please add at least one valid condition').subscribe(message => {
                    this.showMessage(message, 'error');
                });
                return;
            }
        }

    const formValue = this.params.value;
    const ruleData = {
            ...formValue,
            filters: this.params.get('triggerCondition')?.value === 'condition'
                ? this.filters.filter(f => f.field && f.value)
                : []
        };

        const url = `${environment.apiUrl}/notification-rules${ruleData.id ? `/${ruleData.id}` : ''}`;
        const method = ruleData.id ? 'put' : 'post';

        this.http[method](url, ruleData).subscribe(
            () => {
                this.loadRules();
                this.translate.get('Rule has been saved successfully').subscribe(message => {
                    this.showMessage(message, 'success');
                });
                this.addRuleModal.close();
            },
            error => {
                console.error('Error saving rule:', error);
                this.translate.get('Error saving rule').subscribe(message => {
                    this.showMessage(message, 'error');
                });
            }
        );
    }

    searchRules() {
        if (!this.searchText.trim()) {
            this.filteredRules = [...this.rules];
            return;
        }

        const searchTerm = this.searchText.toLowerCase();
        this.filteredRules = this.rules.filter((rule: any) =>
            rule.ruleName?.toLowerCase().includes(searchTerm) ||
            rule.triggerCondition?.toLowerCase().includes(searchTerm) ||
            this.getSettingLabel(rule.notificationSettingId ?? (rule as any).notificationMethod).toLowerCase().includes(searchTerm)
        );
    }

    loadRules() {
        this.http.get(`${environment.apiUrl}/notification-rules`).subscribe(
            (data: any) => {
                // 兼容：若返回为旧结构，尽量映射 settingId
                this.rules = (data || []).map((r: any) => {
                    if (!r.notificationSettingId && r.notificationMethod) {
                        const legacy = r.notificationMethod;
                        if (legacy === 'email' || legacy === 'syslog') {
                            const mapped = this.getSettingIdByService(legacy);
                            if (mapped !== null) r.notificationSettingId = mapped;
                        }
                    }
                    return r;
                });
                this.searchRules();
            },
            error => {
                console.error('Error loading rules:', error);
                this.translate.get('Error loading rules').subscribe(message => {
                    this.showMessage(message, 'error');
                });
            }
        );
    }

    showMessage(message: string = '', type: 'success' | 'error' = 'success') {
        const toast: any = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 3000,
            customClass: { container: 'toast' },
        });
        toast.fire({
            icon: type,
            title: message,
            padding: '10px 20px',
        });
    }

    toggleRuleStatus(rule: any, event: Event) {
        const input = event.target as HTMLInputElement;
        const nextStatus = input.checked ? 'Active' : 'Inactive';
        const prevStatus = rule.status;
        rule.status = nextStatus; // optimistic
        const url = `${environment.apiUrl}/notification-rules/${rule.id}`;
        this.http.put(url, { ...rule, status: nextStatus }).subscribe({
            next: () => {
                this.showMessage(nextStatus === 'Active' ? 'Rule enabled successfully' : 'Rule disabled successfully', 'success');
            },
            error: () => {
                rule.status = prevStatus; // rollback
                this.showMessage('Failed to update rule status', 'error');
            }
        });
    }

    // 加载通知设置并生成下拉选项
    private loadNotificationSettings() {
        this.notificationSettingService.getSettings().subscribe({
            next: (settings) => {
                this.notificationSettings = settings || [];
                this.notificationMethodOptions = this.notificationSettings.map((s: any) => ({
                    value: s.id,
                    label: `${s.name} (${s.service})`
                }));
            },
            error: () => {
                this.notificationSettings = [];
                this.notificationMethodOptions = [];
            }
        });
    }

    // 根据 notificationSettingId（或旧值）返回显示标签
    getSettingLabel(settingIdOrLegacy: any): string {
        if (settingIdOrLegacy === undefined || settingIdOrLegacy === null) return '';
        // 如果存的是ID
        const setting = this.notificationSettings.find((s: any) => `${s.id}` === `${settingIdOrLegacy}`);
        if (setting) return `${setting.name} (${setting.service})`;
        // 兼容历史数据：直接存储了 'email' 或 'syslog'
        if (settingIdOrLegacy === 'email' || settingIdOrLegacy === 'syslog') return settingIdOrLegacy;
        return `${settingIdOrLegacy}`;
    }

    // 通过服务类型找到一个对应的通知设置 ID（优先第一个匹配）
    private getSettingIdByService(service: 'email' | 'syslog'): number | null {
        const found = this.notificationSettings.find((s: any) => s.service === service);
        return found ? found.id : null;
    }
}
