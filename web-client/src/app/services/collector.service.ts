import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// 定义接口
export interface Collector {
  id: number;
  name: string;
  creationTime: string;
  interfaceName: string;
  storageStrategy: string;
  filterStrategy: string;
  protocolAnalysisEnabled: boolean;
  idsEnabled: boolean;
  status: string;
}

export interface StorageStrategy {
  id: number;
  name: string;
  creationTime: string;
  fileSize: string;
  fileCount: number;
  outOfDiskAction: string;
  fileType: string;
  triggerType: string;
  timeRange?: string;
  alarmType?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CollectorService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  // Collector APIs
  getAllCollectors(): Observable<Collector[]> {
    return this.http.get<Collector[]>(`${this.apiUrl}/collectors`);
  }

  getCollectorById(id: number): Observable<Collector> {
    return this.http.get<Collector>(`${this.apiUrl}/collectors/${id}`);
  }

  createCollector(collector: Partial<Collector>): Observable<Collector> {
    console.log('Creating collector with data:', collector);
    return this.http.post<Collector>(`${this.apiUrl}/collectors`, collector);
  }

  updateCollector(id: number, collector: Partial<Collector>): Observable<Collector> {
    return this.http.put<Collector>(`${this.apiUrl}/collectors/${id}`, collector);
  }

  deleteCollector(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/collectors/${id}`);
  }

  updateCollectorStatus(id: number, status: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/collectors/${id}/status`, { status });
  }

  // Storage Strategy APIs  
  getAllStorageStrategies(): Observable<StorageStrategy[]> {
    return this.http.get<StorageStrategy[]>(`${this.apiUrl}/storage-strategies`);
  }

  getStorageStrategyById(id: number): Observable<StorageStrategy> {
    return this.http.get<StorageStrategy>(`${this.apiUrl}/storage-strategies/${id}`);
  }

  createStorageStrategy(strategy: Partial<StorageStrategy>): Observable<StorageStrategy> {
    console.log('Creating storage strategy with data:', strategy);
    return this.http.post<StorageStrategy>(`${this.apiUrl}/storage-strategies`, strategy);
  }

  updateStorageStrategy(id: number, strategy: Partial<StorageStrategy>): Observable<StorageStrategy> {
    return this.http.put<StorageStrategy>(`${this.apiUrl}/storage-strategies/${id}`, strategy);
  }

  deleteStorageStrategy(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/storage-strategies/${id}`);
  }

  // 添加更新 enabled 状态的方法
  updateCollectorEnabled(id: number, type: string, enabled: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/collectors/${id}/${type}-enabled`, { enabled });
  }
} 