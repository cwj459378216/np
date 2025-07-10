import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class NotificationSettingService {
    private apiUrl = `${environment.apiUrl}/notifications`;

    constructor(private http: HttpClient) {}

    getSettings(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    testNotification(setting: any): Observable<boolean> {
        return this.http.post<boolean>(`${this.apiUrl}/test`, setting);
    }
}
