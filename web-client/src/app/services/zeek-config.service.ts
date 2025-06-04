import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ZeekLogAttribute {
  keyWord: string;
  keyAlias: string;
  keyType: string;
  defaultShow?: boolean;
  description?: string;
  extended?: boolean;
}

export interface ZeekLogType {
  logName: string;
  needBeginAttr: boolean;
  needEndAttr: boolean;
  attribute: ZeekLogAttribute[];
}

export interface ZeekLogsConfig {
  BeginAttr: ZeekLogAttribute[];
  EndAttr: ZeekLogAttribute[];
  Zeek: ZeekLogType[];
}

@Injectable({
  providedIn: 'root'
})
export class ZeekConfigService {
  constructor(private http: HttpClient) {}

  getZeekConfig(): Observable<ZeekLogsConfig> {
    return this.http.get<ZeekLogsConfig>(`${environment.apiUrl}/api/zeek-logs/config`);
  }
} 