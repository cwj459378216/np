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

export interface NetworkInterface {
  desc: string;
  index: number;
  name: string;
  ports: {
    duplex: string;
    id: number;
    mac: string;
    speed: string;
    state: string;
    type: string;
  }[];
}

export interface CaptureFilter {
  capture: {
    items: string[];
    optReverse: boolean;
  };
}

export interface AppOptions {
  apps: string[];
  zeek: {
    enable: boolean;
  };
  savePacket: {
    duration: number;
    enable: boolean;
    fileCount: number;
    fileName: string;
    fileSize: number;
    fileType: number;
    performanceMode: string;
    stopOnWrap: boolean;
  };
  snort: {
    enable: boolean;
  };
}

export interface CaptureRequest {
  filter: CaptureFilter;
  index: number;
  port: string;
  filePath?: string;
  appOpt: AppOptions;
}

export interface CaptureResponse {
  error: number;
  message: string;
  status: string;
  uuid: string;
  options: string;
}

export interface CaptureFileItem {
  name: string;
  size: number;
  creationTime: string; // ISO string from backend
}

@Injectable({
  providedIn: 'root'
})
export class CollectorService {
  private apiUrl = `${environment.apiUrl}`;

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

  getNetworkInterfaces(): Observable<NetworkInterface[]> {
    return this.http.get<NetworkInterface[]>(`${this.apiUrl}/capture/interfaces`);
  }

  // 添加开启抓包的方法
  startCapture(request: CaptureRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/capture/startCapture`, request);
  }

  // 添加获取会话状态的方法
  getSessionInfo(sessionId: string): Observable<CaptureResponse> {
    return this.http.get<CaptureResponse>(`${this.apiUrl}/capture/getSessionInfo`, {
      params: { sessionid: sessionId }
    });
  }

  // 添加停止抓包的方法
  stopCapture(sessionId: string): Observable<CaptureResponse> {
    return this.http.get<CaptureResponse>(`${this.apiUrl}/capture/stopCapture`, {
      params: { sessionid: sessionId }
    });
  }

  updateCollectorSessionId(id: number, sessionId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/collectors/${id}/session`, { sessionId });
  }

  // Capture files APIs
  listCaptureFiles(path?: string): Observable<CaptureFileItem[]> {
    const params: any = {};
    if (path) params.path = path;
    return this.http.get<CaptureFileItem[]>(`${this.apiUrl}/capture-files`, { params });
  }

  downloadCaptureFile(name: string, path?: string): Observable<Blob> {
    const params: any = {};
    if (path) params.path = path;
    return this.http.get(`${this.apiUrl}/capture-files/download/${encodeURIComponent(name)}`, {
      params,
      responseType: 'blob'
    });
  }
}
