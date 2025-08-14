import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

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

    notificationMethodOptions = [
        { value: 'email', label: 'Email' },
        { value: 'syslog', label: 'Syslog' }
    ];

    rules = [
        {
            id: 1,
            ruleName: 'High CPU Usage Alert',
            timeWindow: '24 hours',
            triggerCondition: 'new_event',
            notificationMethod: 'email',
            endpoint: 'admin@example.com',
            status: 'Active',
            filters: []
        },
        {
            id: 2,
            ruleName: 'Memory Usage Warning',
            timeWindow: '7 days',
            triggerCondition: 'condition',
            notificationMethod: 'syslog',
            endpoint: '192.168.1.100:514',
            status: 'Inactive',
            filters: [{ field: 'memory_usage', value: '80' }]
        }
    ];

    filteredRules: any[] = [];

    filters: any[] = [{ field: '', value: '' }];
    filterFields = [
        { value: 'cpu_usage', label: 'CPU Usage' },
        { value: 'memory_usage', label: 'Memory Usage' },
        { value: 'disk_usage', label: 'Disk Usage' },
        { value: 'network_traffic', label: 'Network Traffic' }
    ];

    constructor(private fb: FormBuilder, private http: HttpClient, private translate: TranslateService) {
        this.initForm();
    }

    ngOnInit(): void {
        this.loadRules();
    }

    initForm() {
        this.params = this.fb.group({
            id: [null],
            ruleName: ['', Validators.required],
            description: [''],
            timeWindow: ['', Validators.required],
            triggerCondition: ['', Validators.required],
            notificationMethod: ['', Validators.required],
            endpoint: [''],
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
            const formValue = {
                id: rule.id,
                ruleName: rule.ruleName,
                description: rule.description,
                timeWindow: rule.timeWindow,
                triggerCondition: rule.triggerCondition,
                notificationMethod: rule.notificationMethod,
                endpoint: rule.endpoint,
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
        const requiredFields = ['ruleName', 'timeWindow', 'triggerCondition', 'notificationMethod'];
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
        this.filteredRules = this.rules.filter(rule =>
            rule.ruleName.toLowerCase().includes(searchTerm) ||
            rule.triggerCondition.toLowerCase().includes(searchTerm) ||
            rule.notificationMethod.toLowerCase().includes(searchTerm)
        );
    }

    loadRules() {
        this.http.get(`${environment.apiUrl}/notification-rules`).subscribe(
            (data: any) => {
                this.rules = data;
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

    showMessage(message: string, type: 'success' | 'error') {
        this.translate.get([type === 'success' ? 'Success' : 'Error']).subscribe(translations => {
            const title = Object.values(translations)[0] as string;
            Swal.fire({
                title: title,
                text: message,
                icon: type === 'success' ? 'success' : 'error',
                padding: '2em'
            });
        });
    }
}
