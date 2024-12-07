import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
    selector: 'app-report-scheduler',
    templateUrl: './report-scheduler.component.html'
})
export class ReportSchedulerComponent implements OnInit {
    @ViewChild('addSchedulerModal') addSchedulerModal: any;
    
    displayType: string = 'list';
    searchText: string = '';
    params: FormGroup;

    whereToSendOptions = [
        { value: 'admin@example.com', label: 'Admin (admin@example.com)' },
        { value: 'security@example.com', label: 'Security Team (security@example.com)' },
        { value: 'syslog.server:514', label: 'Syslog Server (syslog.server:514)' },
        { value: 'monitor@example.com', label: 'Monitor Team (monitor@example.com)' }
    ];

    schedulers = [
        {
            id: 1,
            name: 'Daily System Report',
            description: 'Generate system status report daily',
            template: 'System Status Template',
            frequency: 'Daily',
            time: '00:00',
            whereToSend: 'admin@example.com',
            status: 'Active',
            creationTime: '2024-01-15 10:30:00'
        }
    ];

    templateOptions = [
        { value: 'System Status Template', label: 'System Status Template' },
        { value: 'Network Traffic Template', label: 'Network Traffic Template' },
        { value: 'Security Alert Template', label: 'Security Alert Template' }
    ];

    filteredSchedulers: any[] = [];

    constructor(private fb: FormBuilder) {
        this.params = this.fb.group({
            id: [''],
            name: [''],
            description: [''],
            template: [''],
            frequency: [''],
            time: [''],
            whereToSend: [''],
            status: ['Active']
        });
    }

    ngOnInit(): void {
        this.filteredSchedulers = [...this.schedulers];
    }

    // 添加编辑方法
    editScheduler(scheduler: any = null) {
        if (scheduler) {
            this.params.patchValue({
                id: scheduler.id,
                name: scheduler.name,
                description: scheduler.description,
                template: scheduler.template,
                frequency: scheduler.frequency,
                time: scheduler.time,
                whereToSend: scheduler.whereToSend,
                status: scheduler.status
            });
        } else {
            this.params.reset();
            this.params.patchValue({ status: 'Active' });
        }
        this.addSchedulerModal.open();
    }

    // 添加删除方法
    deleteScheduler(scheduler: any) {
        this.schedulers = this.schedulers.filter(item => item.id !== scheduler.id);
        this.searchSchedulers();
    }

    // 添加保存方法
    saveScheduler() {
        const formValue = this.params.value;
        
        if (formValue.id) {
            const index = this.schedulers.findIndex(d => d.id === formValue.id);
            this.schedulers[index] = {
                ...formValue,
                creationTime: this.schedulers[index].creationTime
            };
        } else {
            const maxId = Math.max(...this.schedulers.map(d => d.id), 0);
            this.schedulers.push({
                ...formValue,
                id: maxId + 1,
                creationTime: new Date().toLocaleString()
            });
        }
        this.searchSchedulers();
        this.addSchedulerModal.close();
    }

    // 添加搜索方法
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

    // 添加获取标签的方法
    getWhereToSendLabel(value: string): string {
        const option = this.whereToSendOptions.find(opt => opt.value === value);
        return option ? option.label : value;
    }
} 