import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TimeRange {
  startTime: Date;
  endTime: Date;
  label: string;
  value: string;
  filePath?: string; // 新增文件路径字段
}

@Injectable({
  providedIn: 'root'
})
export class TimeRangeService {
  private timeRangeSubject = new BehaviorSubject<TimeRange>({
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 默认24小时前
    endTime: new Date(),
    label: 'Last 24 Hours',
    value: '24h',
    filePath: undefined
  });

  public timeRange$ = this.timeRangeSubject.asObservable();

  constructor() {}

  updateTimeRange(startTime: Date, endTime: Date, label: string, value: string, filePath?: string) {
    const timeRange: TimeRange = {
      startTime,
      endTime,
      label,
      value,
      filePath
    };
    console.log('TimeRangeService updating time range:', timeRange);
    this.timeRangeSubject.next(timeRange);
  }

  getCurrentTimeRange(): TimeRange {
    return this.timeRangeSubject.value;
  }

  calculateStartTime(rangeValue: string, endTime: Date): Date {
    const startTime = new Date(endTime);
    
    switch (rangeValue) {
      case '1h':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case '6h':
        startTime.setHours(startTime.getHours() - 6);
        break;
      case '12h':
        startTime.setHours(startTime.getHours() - 12);
        break;
      case '24h':
        startTime.setDate(startTime.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(startTime.getDate() - 7);
        break;
      default:
        startTime.setHours(startTime.getHours() - 1);
    }
    
    return startTime;
  }
}
