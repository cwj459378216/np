import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import Swal from 'sweetalert2';
import { NotificationSettingService } from '../../services/notification-setting.service';

interface NotificationSetting {
    id: number;
    name: string;
    description: string;
    service: string;
    mailServer?: string;
    security?: string;
    emailPort?: string;
    accountName?: string;
    password?: string;
    sender?: string;
    receiver?: string;
    subject?: string;
    host?: string;
    syslogPort?: string;
    createdAt: string;
}

@Component({
    selector: 'app-notification-settings',
    templateUrl: './notification-settings.component.html'
})
export class NotificationSettingsComponent implements OnInit {
    @ViewChild('addSettingModal') addSettingModal!: NgxCustomModalComponent;
    
    displayType: string = 'list';
    searchText: string = '';
    params!: FormGroup;

    serviceOptions = [
        { value: 'email', label: 'Email' },
        { value: 'syslog', label: 'Syslog' }
    ];

    securityOptions = [
        { value: 'none', label: 'None' },
        { value: 'ssl', label: 'SSL' },
        { value: 'tls', label: 'TLS' }
    ];

    settings: NotificationSetting[] = [];
    filteredSettings: NotificationSetting[] = [];

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private notificationSettingService: NotificationSettingService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.loadSettings();
    }

    initForm() {
        this.params = this.fb.group({
            id: [null],
            name: ['', Validators.required],
            description: ['', Validators.required],
            service: ['', Validators.required],
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

        // 监听服务类型变化
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
                    subject: ''
                });
            } else {
                this.params.patchValue({
                    host: '',
                    syslogPort: ''
                });
            }
        });
    }

    loadSettings() {
        this.http.get<NotificationSetting[]>(`${environment.apiUrl}/api/notifications`).subscribe(
            (data) => {
                this.settings = data;
                this.searchSettings();
            },
            error => {
                console.error('Error loading settings:', error);
                this.showMessage('Error loading settings', 'error');
            }
        );
    }

    searchSettings() {
        if (!this.searchText.trim()) {
            this.filteredSettings = [...this.settings];
            return;
        }

        const searchStr = this.searchText.toLowerCase();
        this.filteredSettings = this.settings.filter(item => 
            item.name.toLowerCase().includes(searchStr) ||
            item.description.toLowerCase().includes(searchStr) ||
            item.service.toLowerCase().includes(searchStr)
        );
    }

    editSetting(setting: NotificationSetting | null = null) {
        this.addSettingModal.open();
        this.initForm();

        if (setting) {
            this.params.patchValue({
                id: setting.id,
                name: setting.name,
                description: setting.description,
                service: setting.service,
                mailServer: setting.mailServer,
                security: setting.security,
                emailPort: setting.emailPort,
                accountName: setting.accountName,
                password: setting.password,
                sender: setting.sender,
                receiver: setting.receiver,
                subject: setting.subject,
                host: setting.host,
                syslogPort: setting.syslogPort
            });
        }
    }

    saveSetting() {
        if (!this.params.valid) {
            this.showMessage('Please fill all required fields.', 'error');
            return;
        }

        const setting = this.params.value;
        const url = `${environment.apiUrl}/api/notifications${setting.id ? `/${setting.id}` : ''}`;
        const method = setting.id ? 'put' : 'post';

        this.http[method](url, setting).subscribe(
            () => {
                this.loadSettings();
                this.showMessage('Setting has been saved successfully.');
                this.addSettingModal.close();
            },
            error => {
                console.error('Error saving setting:', error);
                this.showMessage('Error saving setting', 'error');
            }
        );
    }

    deleteSetting(setting: NotificationSetting) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.http.delete(`${environment.apiUrl}/api/notifications/${setting.id}`).subscribe(
                    () => {
                        this.loadSettings();
                        this.showMessage('Setting has been deleted successfully.');
                    },
                    error => {
                        console.error('Error deleting setting:', error);
                        this.showMessage('Error deleting setting', 'error');
                    }
                );
            }
        });
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

    testSetting(): void {
        if (!this.params.valid) {
            this.showMessage('Please fill all required fields before testing.', 'error');
            return;
        }

        Swal.fire({
            title: 'Testing Notification',
            text: 'Please wait while we test the notification settings...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this.notificationSettingService.testNotification(this.params.value).subscribe({
            next: (isValid: boolean) => {
                if (isValid) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Test Successful',
                        text: 'The notification settings are working correctly.',
                        confirmButtonText: 'OK'
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Test Failed',
                        text: 'Failed to send test notification. Please check your settings.',
                        confirmButtonText: 'OK'
                    });
                }
            },
            error: (error: Error) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Test Failed',
                    text: 'An error occurred while testing the notification settings.',
                    confirmButtonText: 'OK'
                });
            }
        });
    }
} 