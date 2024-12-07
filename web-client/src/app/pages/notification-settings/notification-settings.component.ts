import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
    selector: 'app-notification-settings',
    templateUrl: './notification-settings.component.html'
})
export class NotificationSettingsComponent implements OnInit {
    @ViewChild('addSettingModal') addSettingModal: any;
    
    displayType: string = 'list';
    searchText: string = '';
    params: FormGroup;

    serviceOptions = [
        { value: 'email', label: 'Email' },
        { value: 'syslog', label: 'Syslog' }
    ];

    securityOptions = [
        { value: 'none', label: 'None' },
        { value: 'ssl', label: 'SSL' },
        { value: 'tls', label: 'TLS' }
    ];

    settings = [
        {
            id: 1,
            name: 'Email Server',
            description: 'SMTP server configuration for email notifications',
            service: 'email',
            mailServer: 'smtp.example.com',
            security: 'ssl',
            port: '587',
            accountName: 'admin@example.com',
            password: '******',
            sender: 'noreply@example.com',
            receiver: 'admin@company.com',
            subject: 'System Notification',
            creationTime: '2024-01-15 10:30:00'
        },
        {
            id: 2,
            name: 'Syslog Server',
            description: 'Syslog server for system notifications',
            service: 'syslog',
            endpoint: '192.168.1.100:514',
            creationTime: '2024-01-16 14:20:00'
        }
    ];

    filteredSettings: any[] = [];

    constructor(private fb: FormBuilder) {
        this.params = this.fb.group({
            id: [''],
            name: [''],
            description: [''],
            service: [''],
            mailServer: [''],
            security: [''],
            emailPort: [''],
            accountName: [''],
            password: [''],
            sender: [''],
            receiver: [''],
            subject: [''],
            host: [''],
            syslogPort: ['']
        });

        this.params.get('service')?.valueChanges.subscribe(value => {
            if (value === 'syslog') {
                this.params.patchValue({
                    mailServer: '',
                    security: '',
                    emailPort: '',
                    accountName: '',
                    password: '',
                    sender: '',
                    receiver: '',
                    subject: '',
                    host: '',
                    syslogPort: ''
                });
            } else {
                this.params.patchValue({
                    host: '',
                    syslogPort: ''
                });
            }
        });
    }

    ngOnInit(): void {
        this.filteredSettings = [...this.settings];
    }

    editSetting(setting: any = null) {
        if (setting) {
            if (setting.service === 'syslog') {
                const [host, port] = setting.endpoint?.split(':') || ['', ''];
                this.params.patchValue({
                    id: setting.id,
                    name: setting.name,
                    description: setting.description,
                    service: setting.service,
                    host: host,
                    syslogPort: port
                });
            } else {
                this.params.patchValue({
                    id: setting.id,
                    name: setting.name,
                    description: setting.description,
                    service: setting.service,
                    mailServer: setting.mailServer,
                    security: setting.security,
                    emailPort: setting.port,
                    accountName: setting.accountName,
                    password: setting.password,
                    sender: setting.sender,
                    receiver: setting.receiver,
                    subject: setting.subject
                });
            }
        } else {
            this.params.reset();
        }
        this.addSettingModal.open();
    }

    deleteSetting(setting: any) {
        this.settings = this.settings.filter(item => item.id !== setting.id);
        this.searchSettings();
    }

    saveSetting() {
        const formValue = this.params.value;
        let settingData: any = {
            id: formValue.id,
            name: formValue.name,
            description: formValue.description,
            service: formValue.service,
            creationTime: formValue.id ? 
                this.settings.find(s => s.id === formValue.id)?.creationTime : 
                new Date().toLocaleString()
        };

        if (formValue.service === 'syslog') {
            settingData.endpoint = `${formValue.host}:${formValue.syslogPort}`;
        } else {
            settingData = {
                ...settingData,
                mailServer: formValue.mailServer,
                security: formValue.security,
                port: formValue.emailPort,
                accountName: formValue.accountName,
                password: formValue.password,
                sender: formValue.sender,
                receiver: formValue.receiver,
                subject: formValue.subject
            };
        }

        if (formValue.id) {
            const index = this.settings.findIndex(d => d.id === formValue.id);
            this.settings[index] = settingData;
        } else {
            const maxId = Math.max(...this.settings.map(d => d.id), 0);
            this.settings.push({ ...settingData, id: maxId + 1 });
        }
        this.searchSettings();
        this.addSettingModal.close();
    }

    searchSettings() {
        this.filteredSettings = this.settings.filter(item => {
            const searchStr = this.searchText.toLowerCase();
            return (
                item.name.toLowerCase().includes(searchStr) ||
                item.description.toLowerCase().includes(searchStr) ||
                item.service.toLowerCase().includes(searchStr) ||
                (item.endpoint?.toLowerCase().includes(searchStr) || false)
            );
        });
    }
} 