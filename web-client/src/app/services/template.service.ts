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

    exportPdf(id: number): Observable<Blob> {
        const url = `${this.apiUrl}/${id}/export-pdf`;
        return this.http.get(url, {
            responseType: 'blob'
        });
    }
}
