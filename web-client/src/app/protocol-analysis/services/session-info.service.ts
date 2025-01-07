import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface SessionInfo {
  srcIP: string;
  dstIP: string;
  service: string;
  bytyes: string;
  packets: string;
  lastUpdateTime: string;
  channelID: string;
  connState: string;
  duration: number;
  filePath: string;
  history: string;
  localOrig: string;
  localResp: string;
  missedBytes: number;
  origBytes: number;
  origIpBytes: number;
  origPkts: number;
  orig_l2_addr: string;
  respBytes: number;
  respIpBytes: number;
  respPkts: number;
  resp_l2_addr: string;
  uid: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionInfoService {
  private mockData: SessionInfo[] = [];

  constructor() {
    // 生成200条mock数据
    for (let i = 0; i < 200; i++) {
      this.mockData.push({
        srcIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 65535)}`,
        dstIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 65535)}`,
        service: ['HTTP', 'FTP', 'DNS', 'SMTP', 'SSH'][Math.floor(Math.random() * 5)],
        bytyes: `${Math.floor(Math.random() * 1000)}kb`,
        packets: `${Math.floor(Math.random() * 100)}`,
        lastUpdateTime: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString(),
        channelID: Math.random().toString(),
        connState: ['CONNECTED', 'DISCONNECTED', 'PENDING'][Math.floor(Math.random() * 3)],
        duration: Math.floor(Math.random() * 1000),
        filePath: Math.random().toString(),
        history: Math.random().toString(),
        localOrig: Math.random().toString(),
        localResp: Math.random().toString(),
        missedBytes: Math.floor(Math.random() * 1000),
        origBytes: Math.floor(Math.random() * 1000000),
        origIpBytes: Math.floor(Math.random() * 1000000),
        origPkts: Math.floor(Math.random() * 1000),
        orig_l2_addr: Math.random().toString(),
        respBytes: Math.floor(Math.random() * 1000000),
        respIpBytes: Math.floor(Math.random() * 1000000),
        respPkts: Math.floor(Math.random() * 1000),
        resp_l2_addr: Math.random().toString(),
        uid: Math.random().toString()
      });
    }
  }

  getSessionInfo(params: {
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }): Observable<{ data: SessionInfo[]; total: number }> {
    console.log('Service receiving params:', params);
    let filteredData = [...this.mockData];

    // 搜索过滤
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredData = filteredData.filter(item =>
        Object.values(item).some(val => 
          val.toString().toLowerCase().includes(searchLower)
        )
      );
    }

    // 排序
    if (params.sortField) {
      filteredData.sort((a: any, b: any) => {
        const aVal = a[params.sortField!];
        const bVal = b[params.sortField!];
        const compare = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return params.sortOrder === 'desc' ? -compare : compare;
      });
    }

    // 计算总数
    const total = filteredData.length;

    // 分页 - 使用从0开始的页码计算
    const pageSize = Math.max(1, params.pageSize);
    const start = params.page * pageSize;
    const end = Math.min(start + pageSize, total);
    
    // 创建新的分页数据数组
    const paginatedData = filteredData.slice(start, end);

    console.log('Service pagination details:', {
      total,
      pageSize,
      requestedPage: params.page,
      start,
      end,
      dataLength: paginatedData.length,
      firstItem: paginatedData[0],
      lastItem: paginatedData[paginatedData.length - 1]
    });

    // 返回新的数据对象
    return of({ 
      data: [...paginatedData],
      total 
    }).pipe(delay(300));
  }

  exportData(format: string, search?: string): Observable<SessionInfo[]> {
    let filteredData = [...this.mockData];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(item =>
        Object.values(item).some(val => 
          val.toString().toLowerCase().includes(searchLower)
        )
      );
    }

    return of(filteredData).pipe(delay(300));
  }
} 