import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SystemTime {
  id?: number;
  timeSettingMethod: string;
  manualTime?: string;
  ntpServer?: string;
  syncFrequency?: string;
  timeZone: string;
  autoTimezoneDetection: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SystemTimeService {
  private apiUrl = `${environment.apiUrl}/api/system-time`;

  constructor(private http: HttpClient) { }

  getSettings(): Observable<SystemTime> {
    return this.http.get<SystemTime>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  updateSettings(settings: SystemTime): Observable<SystemTime> {
    const payload = {
      ...settings,
      updatedAt: new Date()
    };
    console.log('Updating system time settings:', payload);
    return this.http.put<SystemTime>(this.apiUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // 客户端错误
      errorMessage = error.error.message;
    } else {
      // 服务器端错误
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
} 