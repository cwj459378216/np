import { Component, LOCALE_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TranslateService } from '@ngx-translate/core';

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
    cols: any[] = [];
    rows: any[] = [];
    isColumnsInitialized = false;

    constructor(private http: HttpClient, private translate: TranslateService, private cdr: ChangeDetectorRef) {}

    ngOnInit() {
        this.setupTranslations();
        this.loadLogs();
    }

    setupTranslations() {
        // 使用异步方式获取翻译，确保翻译文件已加载
        const translationKeys = [
            'log.date',
            'log.level',
            'log.user',
            'log.module',
            'log.logContent',
            'log.placeholder.date'
        ];

        this.translate.get(translationKeys).subscribe(translations => {
            this.initializeColumns(translations);
            this.isColumnsInitialized = true;
        });

        // 监听语言变化
        this.translate.onLangChange.subscribe(() => {
            this.translate.get(translationKeys).subscribe(translations => {
                this.initializeColumns(translations);
            });
        });
    }

    initializeColumns(translations?: any) {
        // 如果没有传入翻译，使用instant方法（作为fallback）
        if (!translations) {
            translations = {
                'log.date': this.translate.instant('log.date'),
                'log.level': this.translate.instant('log.level'),
                'log.user': this.translate.instant('log.user'),
                'log.module': this.translate.instant('log.module'),
                'log.logContent': this.translate.instant('log.logContent'),
                'log.placeholder.date': this.translate.instant('log.placeholder.date')
            };
        }

        // 创建新的数组引用，确保变更检测能够捕获到变化
        this.cols = [
            {
                field: 'date',
                title: translations['log.date'],
                type: 'date',
                filterConfig: {
                    type: 'date',
                    format: 'MM/dd/yyyy',
                    placeholder: translations['log.placeholder.date'],
                    locale: 'en-US'
                }
            },
            { field: 'level', title: translations['log.level'] },
            { field: 'user', title: translations['log.user'] },
            { field: 'module', title: translations['log.module'] },
            { field: 'content', title: translations['log.logContent'] }
        ];

        // 强制触发变更检测
        this.cdr.detectChanges();
    }

    loadLogs() {
        this.http.get(`${environment.apiUrl}/logs`).subscribe(
            (data: any) => {
                // 确保前端默认按时间倒序显示（最新在前）
                const rows = Array.isArray(data) ? data : [];
                this.rows = rows.sort((a: any, b: any) => {
                    const ta = a?.date ? new Date(a.date).getTime() : 0;
                    const tb = b?.date ? new Date(b.date).getTime() : 0;
                    return tb - ta; // desc
                });
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
