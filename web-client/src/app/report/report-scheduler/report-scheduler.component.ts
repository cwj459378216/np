import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
            name: [''],
            description: [''],
            template: [''],
            frequency: [''],
            time: [''],
            whereToSend: [''],
            status: ['Active']
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

    saveScheduler() {
        if (!this.params.valid) {
            this.translate.get('Please fill all required fields.').subscribe(message => {
                this.showMessage(message, 'error');
            });
            return;
        }

        const formValue = this.params.value;
        const schedulerData = {
            ...formValue,
            time: formValue.time,
            status: formValue.status || 'Active'
        };

        if (formValue.id) {
            this.reportSchedulerService.updateScheduler(formValue.id, schedulerData).subscribe({
                next: () => {
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
}
