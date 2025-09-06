import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrendingData {
  timestamp: number;
  count: number;
}

export interface ProtocolTrendsResponse {
  HTTP: TrendingData[];
  DNS: TrendingData[];
  Others: TrendingData[];
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
  disk: {
    usage: number; // 磁盘使用率百分比
    total: number; // 总磁盘空间 (GB)
    used: number; // 已使用磁盘空间 (GB)
    free: number; // 空闲磁盘空间 (GB)
  };
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
   * @param interval 时间间隔 (默认: 1h)
   * @returns Observable<BandwidthTrendsResponse>
   */
  getBandwidthTrends(startTime: number, endTime: number, interval: string = '1h'): Observable<BandwidthTrendsResponse> {
    const params = new HttpParams()
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
      .set('interval', interval);

    console.log('Fetching bandwidth trends with params:', { startTime, endTime, interval });
    return this.http.get<BandwidthTrendsResponse>(`${this.apiUrl}/bandwidth-trends`, { params });
  }

  /**
   * 获取协议交易趋势数据
   * @param startTime 开始时间戳（毫秒）
   * @param endTime 结束时间戳（毫秒）
   * @param interval 时间间隔 (默认: 1h)
   * @returns Observable<ProtocolTrendsResponse>
   */
  getProtocolTrends(startTime: number, endTime: number, interval: string = '1h'): Observable<ProtocolTrendsResponse> {
    const params = new HttpParams()
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
      .set('interval', interval);

    console.log('Fetching protocol trends with params:', { startTime, endTime, interval });
    return this.http.get<ProtocolTrendsResponse>(`${this.apiUrl}/protocol-trends`, { params });
  }

  /**
   * 获取基于 conn-realtime 按 protoName 聚合的网络协议趋势
   */
  getNetworkProtocolTrends(startTime: number, endTime: number, interval: string = '1h'): Observable<NetworkProtocolTrendsResponse> {
    const params = new HttpParams()
      .set('startTime', startTime.toString())
      .set('endTime', endTime.toString())
      .set('interval', interval);

    console.log('Fetching network protocol trends with params:', { startTime, endTime, interval });
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
   * 获取serviceName聚合统计数据
   * @param topN 返回Top N的数据条数 (默认: 10)
   * @param startTime 开始时间戳 (可选)
   * @param endTime 结束时间戳 (可选)
   * @returns Observable<ServiceNameAggregationResponse>
   */
  getServiceNameAggregation(topN: number = 10, startTime?: number, endTime?: number): Observable<ServiceNameAggregationResponse> {
    let params = new HttpParams()
      .set('topN', topN.toString());

    if (startTime) {
      params = params.set('startTime', startTime.toString());
    }
    if (endTime) {
      params = params.set('endTime', endTime.toString());
    }

    console.log('Fetching serviceName aggregation with topN:', topN, 'startTime:', startTime, 'endTime:', endTime);
    return this.http.get<ServiceNameAggregationResponse>(`${this.apiUrl}/service-name-aggregation`, { params });
  }
}
