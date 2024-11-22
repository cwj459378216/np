import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface Alarm {
  id?: number;
  name: string;
  type: 'threshold' | 'pattern' | 'anomaly';
  priority: 'high' | 'medium' | 'low';
  threshold: number;
  description: string;
  enabled: boolean;
}

@Component({
  selector: 'app-alarm-settings',
  templateUrl: './alarm-settings.component.html'
})
export class AlarmSettingsComponent {
  @ViewChild('alarmModal') alarmModal: any;

  isShowNoteMenu: boolean = false;
  selectedTab: string = 'all';
  filterdAlarmList: Alarm[] = [];
  selectedAlarm: Alarm | null = null;
  alarmForm: FormGroup;

  // 添加模拟数据
  alarmList: Alarm[] = [
    {
      id: 1,
      name: 'CPU Usage Alert',
      type: 'threshold',
      priority: 'high',
      threshold: 90,
      description: 'Alert when CPU usage exceeds 90%',
      enabled: true
    },
    {
      id: 2,
      name: 'Memory Usage Warning',
      type: 'threshold',
      priority: 'medium',
      threshold: 80,
      description: 'Warning when memory usage exceeds 80%',
      enabled: true
    },
    {
      id: 3,
      name: 'Network Traffic Pattern',
      type: 'pattern',
      priority: 'low',
      threshold: 1000,
      description: 'Monitor unusual network traffic patterns',
      enabled: false
    },
    {
      id: 4,
      name: 'Disk Space Alert',
      type: 'threshold',
      priority: 'high',
      threshold: 95,
      description: 'Critical alert when disk space usage exceeds 95%',
      enabled: true
    },
    {
      id: 5,
      name: 'Login Anomaly Detection',
      type: 'anomaly',
      priority: 'medium',
      threshold: 5,
      description: 'Detect unusual login patterns',
      enabled: true
    },
    {
      id: 6,
      name: 'Database Connection Alert',
      type: 'pattern',
      priority: 'high',
      threshold: 100,
      description: 'Monitor database connection failures',
      enabled: false
    }
  ];

  constructor(private fb: FormBuilder) {
    this.alarmForm = this.fb.group({
      name: [''],
      type: ['threshold'],
      priority: ['medium'],
      threshold: [0],
      description: [''],
      enabled: [true]
    });
    
    // 初始化过滤后的列表
    this.filterdAlarmList = [...this.alarmList];
  }

  tabChanged(tab: string) {
    this.selectedTab = tab;
    this.filterAlarms();
  }

  // 实现过滤逻辑
  private filterAlarms() {
    switch(this.selectedTab) {
      case 'enabled':
        this.filterdAlarmList = this.alarmList.filter(alarm => alarm.enabled);
        break;
      case 'disabled':
        this.filterdAlarmList = this.alarmList.filter(alarm => !alarm.enabled);
        break;
      case 'high':
        this.filterdAlarmList = this.alarmList.filter(alarm => alarm.priority === 'high');
        break;
      case 'medium':
        this.filterdAlarmList = this.alarmList.filter(alarm => alarm.priority === 'medium');
        break;
      case 'low':
        this.filterdAlarmList = this.alarmList.filter(alarm => alarm.priority === 'low');
        break;
      default:
        this.filterdAlarmList = [...this.alarmList];
    }
  }

  editAlarm(alarm: Alarm) {
    this.selectedAlarm = alarm;
    this.alarmForm.patchValue(alarm);
    this.alarmModal.open();
  }

  // 实现查看告警详情
  viewAlarm(alarm: Alarm) {
    this.selectedAlarm = alarm;
    // TODO: 实现查看详情的逻辑
  }

  // 实现切换告警状态
  toggleAlarm(alarm: Alarm) {
    const index = this.alarmList.findIndex(a => a.id === alarm.id);
    if (index !== -1) {
      this.alarmList[index].enabled = alarm.enabled;
      this.filterAlarms(); // 重新过滤列表
    }
  }

  // 实现保存告警
  saveAlarm() {
    if (this.alarmForm.valid) {
      const formValue = this.alarmForm.value;
      if (this.selectedAlarm?.id) {
        // 更新现有告警
        const index = this.alarmList.findIndex(a => a.id === this.selectedAlarm!.id);
        if (index !== -1) {
          this.alarmList[index] = { ...this.alarmList[index], ...formValue };
        }
      } else {
        // 添加新告警
        const newAlarm: Alarm = {
          id: this.alarmList.length + 1,
          ...formValue
        };
        this.alarmList.push(newAlarm);
      }
      this.filterAlarms();
      this.alarmModal.close();
      this.alarmForm.reset({
        type: 'threshold',
        priority: 'medium',
        threshold: 0,
        enabled: true
      });
      this.selectedAlarm = null;
    }
  }
} 