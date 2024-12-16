import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProtocolSetting {
  id?: number;
  protocolName: string;
  port: number;
  description: string;
  isEnabled: boolean;
  importanceLevel: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProtocolSettingsService {
  private apiUrl = `${environment.apiUrl}/api/protocol-settings`;

  constructor(private http: HttpClient) {}

  getAllSettings(): Observable<ProtocolSetting[]> {
    return this.http.get<ProtocolSetting[]>(this.apiUrl);
  }

  getSettingById(id: number): Observable<ProtocolSetting> {
    return this.http.get<ProtocolSetting>(`${this.apiUrl}/${id}`);
  }

  createSetting(setting: ProtocolSetting): Observable<ProtocolSetting> {
    return this.http.post<ProtocolSetting>(this.apiUrl, setting);
  }

  updateSetting(id: number, setting: ProtocolSetting): Observable<ProtocolSetting> {
    return this.http.put<ProtocolSetting>(`${this.apiUrl}/${id}`, setting);
  }

  deleteSetting(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
} 