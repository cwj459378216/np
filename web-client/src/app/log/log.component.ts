import { Component, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';

registerLocaleData(localeEn);

@Component({
    selector: 'app-log',
    templateUrl: './log.component.html',
    providers: [
        { provide: LOCALE_ID, useValue: 'en-US' }
    ]
})
export class LogComponent {
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

    rows = [
        {
            date: '2024-11-25',
            level: 'INFO',
            user: 'admin',
            module: 'Auth',
            content: 'User login successful'
        },
        {
            date: '2024-11-24',
            level: 'INFO', 
            user: 'admin',
            module: 'Database',
            content: 'Database backup completed'
        },
        {
            date: '2024-11-23',
            level: 'WARNING',
            user: 'system',
            module: 'Network',
            content: 'Network connection anomaly'
        },
        {
            date: '2024-11-22',
            level: 'ERROR',
            user: 'admin',
            module: 'Security',
            content: 'Unauthorized access detected'
        }
    ];

    formatDate(date: any) {
        if (date) {
            const dt = new Date(date);
            const month = dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
            const day = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
            return month + '/' + day + '/' + dt.getFullYear();
        }
        return '';
    }
} 