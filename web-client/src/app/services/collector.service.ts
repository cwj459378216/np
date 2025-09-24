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
  filePath?: string;
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
    // performanceMode: string;
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

export interface EsDeleteTaskStatus {
  taskId: string;
  state: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  deletedCount?: number;
  errorMessage?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface SessionConnStats {
  sessionId: string;
  logs: number;
  avgConnDuration: number | null;
}

export interface SessionEventCount {
  sessionId: string;
  eventCount: number;
}

export interface SessionTrafficItem {
  errorPackets?: number;
  pps?: number;
  bps?: number;
  util?: string;
  port?: number;
  filePath?: string;
  totalBytes?: number;
  dropPackets?: number;
  tage?: string;
  totalPackets?: number;
  timestamp?: string;
}

export interface EsTimeRangeByFilePathResp {
  filePath: string;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  hasData: boolean;
  isDefaultRange: boolean;
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

  // Upload pcap file to a target directory on server
  uploadPcap(file: File, targetPath: string): Observable<{ path: string }> {
    const formData = new FormData();
    // 传入第三个参数以明确文件名，避免后端在某些环境下获取到空文件
    formData.append('file', file, file.name);
    formData.append('path', targetPath);
    return this.http.post<{ path: string }>(`${this.apiUrl}/capture-files/upload`, formData);
  }

  // 带进度监听的文件上传方法
  uploadPcapWithProgress(file: File, targetPath: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('path', targetPath);
    
    return this.http.post<{ path: string }>(`${this.apiUrl}/capture-files/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  // Start async ES deletion for a collector
  startEsDelete(collectorId: number): Observable<{ taskId: string }> {
    return this.http.post<{ taskId: string }>(`${this.apiUrl}/collectors/${collectorId}/es-delete`, {});
  }

  // Get ES deletion task status
  getEsDeleteStatus(taskId: string): Observable<EsDeleteTaskStatus> {
    return this.http.get<EsDeleteTaskStatus>(`${this.apiUrl}/collectors/es-delete/${taskId}`);
  }

  // ========== Session-based ES queries ==========
  getSessionConnStats(sessionId: string, startTime?: number, endTime?: number): Observable<SessionConnStats> {
    const params: any = { sessionId };
    if (startTime != null) params.startTime = startTime;
    if (endTime != null) params.endTime = endTime;
    return this.http.get<SessionConnStats>(`${this.apiUrl}/es/session/conn-stats`, { params });
  }

  getSessionEventCount(sessionId: string, startTime?: number, endTime?: number): Observable<SessionEventCount> {
    const params: any = { sessionId };
    if (startTime != null) params.startTime = startTime;
    if (endTime != null) params.endTime = endTime;
    return this.http.get<SessionEventCount>(`${this.apiUrl}/es/session/event-count`, { params });
  }

  getSessionTraffic(sessionId: string, startTime?: number, endTime?: number, desiredPoints?: number): Observable<SessionTrafficItem[]> {
    const params: any = { sessionId };
    if (startTime != null) params.startTime = startTime;
    if (endTime != null) params.endTime = endTime;
    if (desiredPoints != null) params.desiredPoints = desiredPoints;
    return this.http.get<SessionTrafficItem[]>(`${this.apiUrl}/es/session/traffic`, { params });
  }

  // Query ES time range by filePath in a specific index pattern
  getEsTimeRangeByFilePath(filePath: string, index: string = 'octopusx-data-*'): Observable<EsTimeRangeByFilePathResp> {
    const params: any = { filePath, index };
    return this.http.get<EsTimeRangeByFilePathResp>(`${this.apiUrl}/es/query-by-filepath`, { params });
  }
}
