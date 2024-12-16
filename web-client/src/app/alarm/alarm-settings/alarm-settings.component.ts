import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlarmSettingsService, AlarmSetting } from '../../services/alarm-settings.service';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { toggleAnimation } from 'src/app/shared/animations';
import Swal from 'sweetalert2';

interface Alarm {
  id: number;
  name: string;
  type: string;
  priority: string;
  threshold: number;
  description: string;
  isEnabled: boolean;
}

@Component({
  selector: 'app-alarm-settings',
  templateUrl: './alarm-settings.component.html',
  animations: [toggleAnimation]
})
export class AlarmSettingsComponent implements OnInit {
  defaultParams = {
    id: null,
    name: '',
    type: '',
    priority: '',
    threshold: 0,
    description: ''
  };

  @ViewChild('alarmModal') isAddAlarmModal!: NgxCustomModalComponent;
  @ViewChild('viewAlarmModal') isViewAlarmModal!: NgxCustomModalComponent;

  params!: FormGroup;
  isShowNoteMenu = false;
  alarmList: Alarm[] = [];
  filterdAlarmList: Alarm[] = [];
  selectedTab = 'all';
  selectedAlarm: Alarm = {
    id: 0,
    name: '',
    type: '',
    priority: '',
    threshold: 0,
    description: '',
    isEnabled: false
  };

  constructor(
    public fb: FormBuilder,
    private alarmSettingsService: AlarmSettingsService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadAlarmSettings();
  }

  loadAlarmSettings() {
    this.alarmSettingsService.getAllSettings().subscribe({
      next: (settings) => {
        this.alarmList = settings.map(setting => ({
          id: setting.id || 0,
          name: setting.name,
          type: setting.type,
          priority: setting.priority,
          threshold: setting.threshold,
          description: setting.description,
          isEnabled: setting.isEnabled
        }));
        this.searchAlarms();
      },
      error: () => {
        this.showMessage('Failed to load alarm settings', 'error');
      }
    });
  }

  initForm() {
    this.params = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      type: ['threshold'],
      priority: ['medium'],
      threshold: [0],
      description: ['']
    });
  }

  searchAlarms() {
    if (this.selectedTab === 'enabled') {
      this.filterdAlarmList = this.alarmList.filter((d: { isEnabled: boolean }) => d.isEnabled);
    } else if (this.selectedTab === 'disabled') {
      this.filterdAlarmList = this.alarmList.filter((d: { isEnabled: boolean }) => !d.isEnabled);
    } else if (this.selectedTab !== 'all') {
      this.filterdAlarmList = this.alarmList.filter((d: { priority: string }) => d.priority === this.selectedTab);
    } else {
      this.filterdAlarmList = this.alarmList;
    }
  }

  tabChanged(type: string) {
    this.selectedTab = type;
    this.searchAlarms();
    this.isShowNoteMenu = false;
  }

  toggleAlarm(alarm: Alarm) {
    const newStatus = !alarm.isEnabled;
    
    const setting: AlarmSetting = {
        name: alarm.name,
        type: alarm.type,
        priority: alarm.priority,
        threshold: alarm.threshold,
        description: alarm.description,
        isEnabled: newStatus
    };

    this.alarmSettingsService.updateSetting(alarm.id, setting).subscribe({
        next: () => {
            alarm.isEnabled = newStatus;
            this.showMessage(`Alarm has been ${newStatus ? 'enabled' : 'disabled'} successfully.`);
            this.searchAlarms();
        },
        error: () => {
            this.showMessage('Failed to update alarm status', 'error');
        }
    });
  }

  editAlarm(alarm: Alarm | null = null) {
    this.isShowNoteMenu = false;
    this.isAddAlarmModal.open();
    this.initForm();
    if (alarm) {
      this.params.setValue({
        id: alarm.id,
        name: alarm.name,
        type: alarm.type,
        priority: alarm.priority,
        threshold: alarm.threshold,
        description: alarm.description
      });
    }
  }

  viewAlarm(alarm: Alarm) {
    this.selectedAlarm = alarm;
    this.isViewAlarmModal.open();
  }

  saveAlarm() {
    if (this.params.controls['name'].errors) {
      this.showMessage('Name is required.', 'error');
      return;
    }

    const setting: AlarmSetting = {
      name: this.params.value.name,
      type: this.params.value.type,
      priority: this.params.value.priority,
      threshold: this.params.value.threshold,
      description: this.params.value.description,
      isEnabled: false
    };

    if (this.params.value.id) {
      this.alarmSettingsService.updateSetting(this.params.value.id, setting).subscribe({
        next: () => {
          this.showMessage('Alarm setting updated successfully.');
          this.loadAlarmSettings();
          this.isAddAlarmModal.close();
        },
        error: () => {
          this.showMessage('Failed to update alarm setting', 'error');
        }
      });
    } else {
      this.alarmSettingsService.createSetting(setting).subscribe({
        next: () => {
          this.showMessage('Alarm setting created successfully.');
          this.loadAlarmSettings();
          this.isAddAlarmModal.close();
        },
        error: () => {
          this.showMessage('Failed to create alarm setting', 'error');
        }
      });
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

  setPriority(alarm: Alarm, priority: string) {
    const setting: AlarmSetting = {
      name: alarm.name,
      type: alarm.type,
      priority: priority,
      threshold: alarm.threshold,
      description: alarm.description,
      isEnabled: alarm.isEnabled
    };

    this.alarmSettingsService.updateSetting(alarm.id, setting).subscribe({
      next: () => {
        let item = this.filterdAlarmList.find(d => d.id === alarm.id);
        if (item) {
          item.priority = priority;
          this.showMessage(`Alarm priority has been changed to ${priority} successfully.`);
        }
        this.searchAlarms();
      },
      error: () => {
        this.showMessage('Failed to update alarm priority', 'error');
      }
    });
  }

  selectAlarm(alarm: Alarm) {
    this.selectedAlarm = alarm;
  }
} 