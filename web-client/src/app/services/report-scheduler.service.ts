import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface Scheduler {
    id?: number;
    name: string;
    description?: string;
    template: string;
    frequency: string;
    time: string;
    whereToSend: string;
    status: string;
}

@Injectable({
    providedIn: 'root'
})
export class ReportSchedulerService {
    private apiUrl = `${environment.apiUrl}/api/report-schedulers`;

    constructor(private http: HttpClient) {}

    getSchedulers(): Observable<Scheduler[]> {
        return this.http.get<Scheduler[]>(this.apiUrl);
    }

    getScheduler(id: number): Observable<Scheduler> {
        return this.http.get<Scheduler>(`${this.apiUrl}/${id}`);
    }

    createScheduler(scheduler: Scheduler): Observable<Scheduler> {
        return this.http.post<Scheduler>(this.apiUrl, scheduler);
    }

    updateScheduler(id: number, scheduler: Scheduler): Observable<Scheduler> {
        return this.http.put<Scheduler>(`${this.apiUrl}/${id}`, scheduler);
    }

    deleteScheduler(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
} 