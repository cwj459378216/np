import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface SessionInfo {
  srcIP: string;
  dstIP: string;
  service: string;
  bytyes: string;
  packets: string;
  aart: number;
  nrt: number;
  srt: number;
  art: number;
  ptt: number;
  crt: number;
  latency: number;
  rety: number;
  lastUpdateTime: string;
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
        aart: Math.floor(Math.random() * 1000),
        nrt: Math.floor(Math.random() * 1000),
        srt: Math.floor(Math.random() * 1000),
        art: Math.floor(Math.random() * 1000),
        ptt: Math.floor(Math.random() * 1000),
        crt: Math.floor(Math.random() * 1000),
        latency: Math.floor(Math.random() * 1000),
        rety: Math.floor(Math.random() * 10),
        lastUpdateTime: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString()
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