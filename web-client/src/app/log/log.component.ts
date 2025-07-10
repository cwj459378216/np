import { Component, LOCALE_ID, OnInit } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

registerLocaleData(localeEn);

@Component({
    selector: 'app-log',
    templateUrl: './log.component.html',
    providers: [
        { provide: LOCALE_ID, useValue: 'en-US' }
    ]
})
export class LogComponent implements OnInit {
    search = '';
    cols = [
        {
            field: 'date',
            title: 'Date',
            type: 'date',
            filterConfig: {
                type: 'date',
                format: 'MM/dd/yyyy',
                placeholder: 'Year/Month/Day',
                locale: 'en-US'
            }
        },
        { field: 'level', title: 'Level' },
        { field: 'user', title: 'User' },
        { field: 'module', title: 'Module' },
        { field: 'content', title: 'Log Content' }
    ];

    rows = [];

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.loadLogs();
    }

    loadLogs() {
        this.http.get(`${environment.apiUrl}/logs`).subscribe(
            (data: any) => {
                this.rows = data;
            },
            error => {
                console.error('Error loading logs:', error);
            }
        );
    }

    formatDate(date: any) {
        if (date) {
            const dt = new Date(date);
            const year = dt.getFullYear();
            const month = (dt.getMonth() + 1).toString().padStart(2, '0');
            const day = dt.getDate().toString().padStart(2, '0');
            const hours = dt.getHours().toString().padStart(2, '0');
            const minutes = dt.getMinutes().toString().padStart(2, '0');
            const seconds = dt.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        return '';
    }
}
