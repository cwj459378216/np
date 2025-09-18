import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
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
export class NotificationSettingsComponent implements OnInit, OnDestroy {
    @ViewChild('addSettingModal') addSettingModal!: NgxCustomModalComponent;

    displayType: string = 'list';
    searchText: string = '';
    params!: FormGroup;

    serviceOptions: { value: string, label: string }[] = [];

    securityOptions = [
        { value: 'none', label: 'None' },
        { value: 'ssl', label: 'SSL' },
        { value: 'tls', label: 'TLS' }
    ];

    settings: NotificationSetting[] = [];
    filteredSettings: NotificationSetting[] = [];

    private langChangeSubscription?: Subscription;

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private notificationSettingService: NotificationSettingService,
        private translate: TranslateService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        // 等待翻译加载后再初始化选项
        this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
            this.initializeOptions();
        });

        // 立即初始化一次（如果翻译已经加载）
        this.initializeOptions();
        this.loadSettings();
    }

    ngOnDestroy(): void {
        if (this.langChangeSubscription) {
            this.langChangeSubscription.unsubscribe();
        }
    }

    initializeOptions() {
        this.serviceOptions = [
            { value: 'email', label: this.translate.instant('notification.email') || 'Email' },
            { value: 'syslog', label: this.translate.instant('notification.syslog') || 'Syslog' }
        ];
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
        this.http.get<NotificationSetting[]>(`${environment.apiUrl}/notifications`).subscribe(
            (data) => {
                this.settings = data;
                this.searchSettings();
            },
            error => {
                console.error('Error loading settings:', error);
                this.showMessage(this.translate.instant('notification.errorLoadingSettings'), 'error');
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
            this.showMessage(this.translate.instant('notification.pleaseAllRequiredFields'), 'error');
            return;
        }

        const setting = this.params.value;
        const url = `${environment.apiUrl}/notifications${setting.id ? `/${setting.id}` : ''}`;
        const method = setting.id ? 'put' : 'post';

        this.http[method](url, setting).subscribe(
            () => {
                this.loadSettings();
                this.showMessage(this.translate.instant('notification.settingSavedSuccessfully'));
                this.addSettingModal.close();
            },
            error => {
                console.error('Error saving setting:', error);
                this.showMessage(this.translate.instant('notification.errorSavingSetting'), 'error');
            }
        );
    }

    deleteSetting(setting: NotificationSetting) {
        Swal.fire({
            title: this.translate.instant('notification.areYouSure'),
            text: this.translate.instant('notification.deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: this.translate.instant('notification.yesDeleteIt'),
            cancelButtonText: this.translate.instant('general.cancel'),
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.http.delete(`${environment.apiUrl}/notifications/${setting.id}`).subscribe(
                    () => {
                        this.loadSettings();
                        this.showMessage(this.translate.instant('notification.settingDeletedSuccessfully'));
                    },
                    error => {
                        console.error('Error deleting setting:', error);
                        this.showMessage(this.translate.instant('notification.errorDeletingSetting'), 'error');
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
            this.showMessage(this.translate.instant('notification.pleaseAllRequiredFieldsTesting'), 'error');
            return;
        }

        Swal.fire({
            title: this.translate.instant('notification.testingNotification'),
            text: this.translate.instant('notification.testingWaitMessage'),
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
                        title: this.translate.instant('notification.testSuccessful'),
                        text: this.translate.instant('notification.testSuccessMessage'),
                        confirmButtonText: this.translate.instant('general.ok')
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: this.translate.instant('notification.testFailed'),
                        text: this.translate.instant('notification.testFailedMessage'),
                        confirmButtonText: this.translate.instant('general.ok')
                    });
                }
            },
            error: (error: Error) => {
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('notification.testFailed'),
                    text: this.translate.instant('notification.testErrorMessage'),
                    confirmButtonText: this.translate.instant('general.ok')
                });
            }
        });
    }
}
