import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AlarmSetting {
  id?: number;
  name: string;
  type: string;
  priority: string;
  threshold: number;
  description: string;
  isEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AlarmSettingsService {
  private apiUrl = `${environment.apiUrl}/alarm-settings`;

  constructor(private http: HttpClient) {}

  getAllSettings(): Observable<AlarmSetting[]> {
    return this.http.get<AlarmSetting[]>(this.apiUrl);
  }

  getSettingById(id: number): Observable<AlarmSetting> {
    return this.http.get<AlarmSetting>(`${this.apiUrl}/${id}`);
  }

  createSetting(setting: AlarmSetting): Observable<AlarmSetting> {
    return this.http.post<AlarmSetting>(this.apiUrl, setting);
  }

  updateSetting(id: number, setting: AlarmSetting): Observable<AlarmSetting> {
    return this.http.put<AlarmSetting>(`${this.apiUrl}/${id}`, setting);
  }

  deleteSetting(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
