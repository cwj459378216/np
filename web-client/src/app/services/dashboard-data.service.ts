import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrendingData {
  timestamp: number;
  count: number;
}

export interface ProtocolTrendsResponse {
  [serviceName: string]: TrendingData[];
}

export interface NetworkProtocolTrendsResponse {
  [proto: string]: TrendingData[];
}

export interface BandwidthData {
  timestamp: number;
  bps: number;
  pps: number;
  util: number;
  channelIndex: number;
  totalBytes: number;
  totalPackets: number;
  dropPackets: number;
  errorPackets: number;
  port: number;
  tag: string;
  tage: string;
  filePath: string;
}

export interface BandwidthTrendsResponse {
  [key: string]: TrendingData[]; // 动态的channel，如 channel0, channel1, channel2 等
}

export interface ServiceNameAggregationItem {
  serviceName: string;
  count: number;
  rank: number;
}

export interface ServiceNameAggregationResponse {
  data: ServiceNameAggregationItem[];
  total: number;
  field?: string;
}

export interface SystemInfo {
  cpu: {
    usage: number; // CPU使用率百分比
    cores: number; // CPU核心数
    model: string; // CPU型号
  };
  memory: {
    usage: number; // 内存使用率百分比
    total: number; // 总内存 (GB)
    used: number; // 已使用内存 (GB)
    free: number; // 空闲内存 (GB)
  };
  disks: Array<{
    name: string; // 磁盘名称
    mountPoint: string; // 挂载点
    usage: number; // 磁盘使用率百分比
    total: number; // 总磁盘空间 (GB)
    used: number; // 已使用磁盘空间 (GB)
    free: number; // 空闲磁盘空间 (GB)
  }>;
  network: {
    interfaces: NetworkInterface[];
  };
  system: {
    hostname: string;
    platform: string;
    release: string;
    uptime: number; // 系统运行时间（秒）
  };
}

export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
}

export interface AssetItem {
  asset: string; // IP
  severity: number; // 1=High,2=Medium,3=Low
  severityLabel: string;
  eventCount: number;
  lastTimestamp: number; // epoch millis
}

export interface AssetAggregationResponse {
  total: number;
  data: AssetItem[];
}

export interface AlarmItem {
  sourceClass: string;
  signature: string;
  severity: number;
  severityLabel: string;
  eventCount: number;
  lastTimestamp: number;
}

export interface AlarmAggregationResponse {
  total: number;
  data: AlarmItem[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardDataService {
  private apiUrl = `${environment.apiUrl}/es`;
  private systemApiUrl = `${environment.apiUrl}/system`;

  constructor(private http: HttpClient) { }

  /**
   * 获取带宽趋势数据
   * @param startTime 开始时间戳（毫秒）
   * @param endTime 结束时间戳（毫秒）
   * @param filePath 文件路径（可选）
   * @param interval 时间间隔 (默认: 1h)
   * @returns Observable<BandwidthTrendsResponse>
   */
  getBandwidthTrends(startTime: number, endTime: number, filePath?: string, interval: string = '1h'): Observable<BandwidthTrendsResponse> {
    let params = new HttpParams()
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
      .set('interval', interval);

    if (filePath) {
      params = params.set('filePath', filePath);
    }

    console.log('Fetching bandwidth trends with params:', { startTime, endTime, filePath, interval });
    return this.http.get<BandwidthTrendsResponse>(`${this.apiUrl}/bandwidth-trends`, { params });
  }

  /**
   * 获取协议交易趋势数据
   * @param startTime 开始时间戳（毫秒）
   * @param endTime 结束时间戳（毫秒）
   * @param filePath 文件路径（可选）
   * @param interval 时间间隔 (默认: 1h)
   * @returns Observable<ProtocolTrendsResponse>
   */
  getProtocolTrends(startTime: number, endTime: number, filePath?: string, interval: string = '1h'): Observable<ProtocolTrendsResponse> {
    let params = new HttpParams()
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
      .set('interval', interval);

    if (filePath) {
      params = params.set('filePath', filePath);
    }

    console.log('Fetching protocol trends with params:', { startTime, endTime, filePath, interval });
    return this.http.get<ProtocolTrendsResponse>(`${this.apiUrl}/protocol-trends`, { params });
  }

  /**
   * 获取基于 conn-realtime 按 protoName 聚合的网络协议趋势
   * @param startTime 开始时间戳（毫秒）
   * @param endTime 结束时间戳（毫秒）
   * @param filePath 文件路径（可选）
   * @param interval 时间间隔 (默认: 1h)
   * @returns Observable<NetworkProtocolTrendsResponse>
   */
  getNetworkProtocolTrends(startTime: number, endTime: number, filePath?: string, interval: string = '1h'): Observable<NetworkProtocolTrendsResponse> {
    let params = new HttpParams()
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
      .set('interval', interval);

    if (filePath) {
      params = params.set('filePath', filePath);
    }

    console.log('Fetching network protocol trends with params:', { startTime, endTime, filePath, interval });
    return this.http.get<NetworkProtocolTrendsResponse>(`${this.apiUrl}/network-protocol-trends`, { params });
  }

  /**
   * 获取趋势数据（原有方法）
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param filePath 文件路径
   * @param index 索引名称
   * @param interval 时间间隔
   * @returns Observable<TrendingData[]>
   */
  getTrending(
    startTime: string,
    endTime: string,
    filePath?: string,
    index: string = 'conn-realtime',
    interval: string = '1h'
  ): Observable<TrendingData[]> {
    let params = new HttpParams()
      .set('startTime', startTime)
      .set('endTime', endTime)
      .set('index', index)
      .set('interval', interval);

    if (filePath) {
      params = params.set('filePath', filePath);
    }

    console.log('Fetching trending data with params:', { startTime, endTime, filePath, index, interval });
    return this.http.get<TrendingData[]>(`${this.apiUrl}/trending`, { params });
  }

  /**
   * 查询ES数据
   * @param startTime 开始时间戳（毫秒）
   * @param endTime 结束时间戳（毫秒）
   * @param filePath 文件路径
   * @param index 索引名称
   * @param size 返回数量
   * @param from 起始位置
   * @returns Observable<any>
   */
  queryData(
    startTime: number,
    endTime: number,
    filePath?: string,
    index: string = 'conn-realtime',
    size: number = 10,
    from: number = 0
  ): Observable<any> {
    let params = new HttpParams()
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
      .set('index', index)
      .set('size', size.toString())
      .set('from', from.toString());

    if (filePath) {
      params = params.set('filePath', filePath);
    }

    console.log('Querying ES data with params:', { startTime, endTime, filePath, index, size, from });
    return this.http.get<any>(`${this.apiUrl}/query`, { params });
  }

  /**
   * 搜索ES数据
   * @param keyword 关键字
   * @returns Observable<any[]>
   */
  searchData(keyword?: string): Observable<any[]> {
    let params = new HttpParams();

    if (keyword) {
      params = params.set('keyword', keyword);
    }

    console.log('Searching ES data with keyword:', keyword);
    return this.http.get<any[]>(`${this.apiUrl}/search`, { params });
  }

  /**
   * 获取系统信息
   * @returns Observable<SystemInfo>
   */
  getSystemInfo(): Observable<SystemInfo> {
    return this.http.get<SystemInfo>(`${this.systemApiUrl}/info`);
  }

  /**
   * 获取服务名称聚合数据
   * @param topN 返回前N个结果
   * @param startTime 开始时间戳（毫秒，可选）
   * @param endTime 结束时间戳（毫秒，可选）
   * @param filePath 文件路径（可选）
   * @returns Observable<ServiceNameAggregationResponse>
   */
  getServiceNameAggregation(topN: number = 10, startTime?: number, endTime?: number, filePath?: string): Observable<ServiceNameAggregationResponse> {
    let params = new HttpParams()
      .set('topN', topN.toString());

    if (startTime) {
      params = params.set('startTime', startTime.toString());
    }
    if (endTime) {
      params = params.set('endTime', endTime.toString());
    }
    if (filePath) {
      params = params.set('filePath', filePath);
    }

    console.log('Fetching serviceName aggregation with topN:', topN, 'startTime:', startTime, 'endTime:', endTime, 'filePath:', filePath);
    return this.http.get<ServiceNameAggregationResponse>(`${this.apiUrl}/service-name-aggregation`, { params });
  }

  /**
   * 获取资产聚合（event-* 索引）
   */
  getAssets(startTime: number, endTime: number, filePath?: string, size: number = 10): Observable<AssetAggregationResponse> {
    let params = new HttpParams()
      .set('startTime', String(startTime))
      .set('endTime', String(endTime))
      .set('size', String(size));
    if (filePath) params = params.set('filePath', filePath);
    return this.http.get<AssetAggregationResponse>(`${this.apiUrl}/assets`, { params });
  }

  /**
   * 获取告警聚合（event-* 索引）
   */
  getAlarms(startTime: number, endTime: number, filePath?: string, size: number = 10): Observable<AlarmAggregationResponse> {
    let params = new HttpParams()
      .set('startTime', String(startTime))
      .set('endTime', String(endTime))
      .set('size', String(size));
    if (filePath) params = params.set('filePath', filePath);
    return this.http.get<AlarmAggregationResponse>(`${this.apiUrl}/alarms`, { params });
  }

  /**
   * 根据文件路径查询数据（不限制时间范围）
   * @param filePath 文件路径
   * @param index 索引名称
   * @returns Observable<any>
   */
  queryDataByFilePath(
    filePath: string,
    index: string = '*'
  ): Observable<any> {
    let params = new HttpParams()
      .set('filePath', filePath)
      .set('index', index);

    console.log('Querying ES data by filePath with params:', { filePath, index });
    return this.http.get<any>(`${this.apiUrl}/query-by-filepath`, { params });
  }

}
