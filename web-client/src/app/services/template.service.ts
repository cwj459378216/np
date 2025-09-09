import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TemplateService {
    private apiUrl = `${environment.apiUrl}/templates`;

    constructor(private http: HttpClient) {}

    getTemplates(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    exportPdf(id: number, startTime?: number, endTime?: number): Observable<Blob> {
        let url = `${this.apiUrl}/${id}/export-pdf`;
        const params: string[] = [];
        if (startTime !== undefined && Number.isFinite(startTime)) params.push(`startTime=${startTime}`);
        if (endTime !== undefined && Number.isFinite(endTime)) params.push(`endTime=${endTime}`);
        if (params.length > 0) url += `?${params.join('&')}`;
        return this.http.get(url, { responseType: 'blob' });
    }
}
