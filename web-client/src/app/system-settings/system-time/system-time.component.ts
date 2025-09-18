import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { SystemTimeService, SystemTime } from '../../services/system-time.service';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-system-time',
  templateUrl: './system-time.component.html',
  styleUrl: './system-time.component.css'
})
export class SystemTimeComponent implements OnInit {
  timeSettingMethod: string = 'manual';
  optionsTimeZone = [
    'Pacific/Honolulu',     // UTC-10:00
    'America/Anchorage',    // UTC-09:00
    'America/Los_Angeles',  // UTC-08:00
    'America/Denver',       // UTC-07:00
    'America/Chicago',      // UTC-06:00
    'America/New_York',     // UTC-05:00
    'America/Halifax',      // UTC-04:00
    'America/Sao_Paulo',    // UTC-03:00
    'Atlantic/South_Georgia', // UTC-02:00
    'Atlantic/Azores',      // UTC-01:00
    'Europe/London',        // UTC+00:00
    'Europe/Paris',         // UTC+01:00
    'Europe/Helsinki',      // UTC+02:00
    'Europe/Moscow',        // UTC+03:00
    'Asia/Dubai',           // UTC+04:00
    'Asia/Karachi',         // UTC+05:00
    'Asia/Dhaka',          // UTC+06:00
    'Asia/Bangkok',         // UTC+07:00
    'Asia/Shanghai',        // UTC+08:00
    'Asia/Tokyo',          // UTC+09:00
    'Pacific/Guam',        // UTC+10:00
    'Pacific/Guadalcanal',  // UTC+11:00
    'Pacific/Fiji',        // UTC+12:00
  ];
  dateTime: FlatpickrDefaultsInterface;
  input5: any;
  ntpServer: string = '';
  form2!: FormGroup;

  constructor(
    public storeData: Store<any>,
    public fb: FormBuilder,
    private systemTimeService: SystemTimeService,
    private translate: TranslateService
  ) {
    this.initStore();
    this.form2 = this.fb.group({
      date2: [''],
    });
    this.dateTime = {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      monthSelectorType: 'dropdown',
      time24hr: true,
      formatDate: (date) => {
        return new Date(date).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
    };
  }

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.systemTimeService.getSettings().subscribe(settings => {
      this.timeSettingMethod = settings.timeSettingMethod;
      this.input5 = settings.timeZone;
      this.ntpServer = settings.ntpServer || '';
      if (settings.manualTime) {
        const localDate = new Date(settings.manualTime).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        this.form2.patchValue({
          date2: localDate
        });
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

  confirmAction(action: () => void) {
    Swal.fire({
      title: this.translate.instant('systemTime.areYouSure'),
      text: this.translate.instant('systemTime.actionWarning'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('systemTime.yesProceed'),
      cancelButtonText: this.translate.instant('general.cancel'),
      padding: '2em'
    }).then((result) => {
      if (result.value) {
        action();
      }
    });
  }

  onSubmit() {
    if (!this.input5) {
      this.showMessage(this.translate.instant('systemTime.pleaseSelectTimeZone'), 'error');
      return;
    }

    const dateValue = this.form2.get('date2')?.value;
    const localDate = new Date(dateValue);
    const timestamp = localDate.getTime();
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(timestamp - tzOffset);

    const settings: SystemTime = {
      timeSettingMethod: this.timeSettingMethod,
      timeZone: this.input5,
      manualTime: this.timeSettingMethod === 'manual' ?
        adjustedDate.toISOString().slice(0, 19) : undefined,
      ntpServer: this.timeSettingMethod === 'ntp' ? this.ntpServer : undefined,
    };

    this.confirmAction(() => {
      this.systemTimeService.updateSettings(settings).subscribe({
        next: (response) => {
          console.log('Settings updated successfully', response);
          this.showMessage(this.translate.instant('systemTime.settingsUpdatedSuccessfully'));
        },
        error: (error) => {
          console.error('Error updating settings:', error);
          this.showMessage(this.translate.instant('systemTime.updateFailed'), 'error');
        }
      });
    });
  }

  store: any;

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  onAdapterChange(event: any) {
    this.timeSettingMethod = event.target.value;
    console.log(event.target.value);
  }

  getUtcOffset(timezone: string): string {
    const date = new Date();
    const utcOffset = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset'
    }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '';

    return utcOffset.replace('GMT', '');
  }

}
