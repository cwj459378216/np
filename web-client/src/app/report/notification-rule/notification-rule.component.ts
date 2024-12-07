import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
    selector: 'app-notification-rule',
    templateUrl: './notification-rule.component.html'
})
export class NotificationRuleComponent implements OnInit {
    @ViewChild('addRuleModal') addRuleModal: any;
    
    displayType: string = 'list';
    searchText: string = '';
    params: FormGroup;
    
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
            status: 'Active'
        },
        {
            id: 2,
            ruleName: 'Memory Usage Warning',
            timeWindow: '7 days',
            triggerCondition: 'condition',
            notificationMethod: 'syslog',
            status: 'Inactive'
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
    
    constructor(private fb: FormBuilder) {
        this.params = this.fb.group({
            id: [''],
            ruleName: [''],
            timeWindow: [''],
            triggerCondition: [''],
            notificationMethod: [''],
            status: ['Active'],
            filters: [[]],
            host: [''],
            port: ['']
        });

        this.params.get('notificationMethod')?.valueChanges.subscribe(value => {
            if (value === 'syslog') {
                this.params.patchValue({
                    host: '',
                    port: ''
                });
            }
        });
    }

    ngOnInit(): void {
        this.filteredRules = [...this.rules];
    }

    addFilter() {
        this.filters.push({ field: '', value: '' });
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1);
    }

    editRule(rule: any = null) {
        if (rule) {
            if (rule.notificationMethod === 'syslog') {
                const [host, port] = rule.endpoint?.split(':') || ['', ''];
                this.params.patchValue({
                    id: rule.id,
                    ruleName: rule.ruleName,
                    timeWindow: rule.timeWindow,
                    triggerCondition: rule.triggerCondition,
                    notificationMethod: rule.notificationMethod,
                    status: rule.status,
                    host: host,
                    port: port
                });
            } else {
                this.params.patchValue({
                    id: rule.id,
                    ruleName: rule.ruleName,
                    timeWindow: rule.timeWindow,
                    triggerCondition: rule.triggerCondition,
                    notificationMethod: rule.notificationMethod,
                    status: rule.status,
                    host: '',
                    port: ''
                });
            }
            this.filters = rule.filters || [{ field: '', value: '' }];
        } else {
            this.params.reset();
            this.params.patchValue({ status: 'Active' });
            this.filters = [{ field: '', value: '' }];
        }
        this.addRuleModal.open();
    }

    deleteRule(rule: any) {
        // 实现删除逻辑
        this.rules = this.rules.filter(item => item.id !== rule.id);
        this.searchRules();
    }

    saveRule() {
        const formValue = this.params.value;
        const endpoint = formValue.notificationMethod === 'syslog' 
            ? `${formValue.host}:${formValue.port}`
            : '';
            
        const ruleData = {
            ...formValue,
            endpoint: endpoint,
            filters: this.filters
        };

        if (formValue.id) {
            const index = this.rules.findIndex(d => d.id === formValue.id);
            this.rules[index] = ruleData;
        } else {
            const maxId = Math.max(...this.rules.map(d => d.id), 0);
            this.rules.push({ ...ruleData, id: maxId + 1 });
        }
        this.searchRules();
        this.addRuleModal.close();
    }

    searchRules() {
        this.filteredRules = this.rules.filter(item => {
            return (
                item.ruleName.toLowerCase().includes(this.searchText.toLowerCase()) ||
                item.triggerCondition.toLowerCase().includes(this.searchText.toLowerCase()) ||
                item.notificationMethod.toLowerCase().includes(this.searchText.toLowerCase())
            );
        });
    }
} 