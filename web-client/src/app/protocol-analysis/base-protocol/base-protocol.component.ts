import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, SimpleChanges, OnChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { toggleAnimation } from 'src/app/shared/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SharedModule } from 'src/shared.module';


@Component({
    selector: 'app-base-protocol',
    templateUrl: './base-protocol.component.html',
    styleUrls: ['./base-protocol.component.css'],
    animations: [toggleAnimation],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NgApexchartsModule,
        SharedModule
    ]
})
export class BaseProtocolComponent implements OnInit, OnDestroy, OnChanges {
    @Input() protocolName: string = '';
    @Input() indexName: string = '';
    @Input() cols: any[] = [];
    @Input() rows: any[] = [];
    
    search = '';
    loading = false;
    chartLoading = false; 
    currentPage = 1;
    pageSize = 10;
    total = 0;
    private refreshInterval: NodeJS.Timeout | undefined;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';

    // 图表基础配置
    protected baseChartConfig = {
        chart: {
            height: 300,
            type: 'line',
            animations: {
                enabled: true
            },
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                },
                autoSelected: 'zoom'
            },
            zoom: {
                enabled: true,
                type: 'x',
                autoScaleYaxis: true
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        colors: ['#4361ee'],
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeFormatter: {
                    year: 'yyyy',
                    month: "MMM 'yy",
                    day: 'dd MMM',
                    hour: 'HH:mm'
                },
                formatter: function(value: string) {
                    const date = new Date(Number(value));
                    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                }
            }
        },
        grid: {
            borderColor: '#e0e6ed'
        },
        tooltip: {
            x: {
                formatter: function(value: number) {
                    const date = new Date(value);
                    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                }
            },
            theme: 'dark'
        },
        markers: {
            size: 4
        },
        legend: {
            show: true
        },
        fill: {
            type: 'solid'
        },
        noData: {
            text: 'Loading...',
            align: 'center',
            verticalAlign: 'middle',
            style: {
                fontSize: '16px'
            }
        }
    };

    protected revenueChart: any = {
        ...this.baseChartConfig,
        series: [{
            name: '',
            data: []
        }],
        yaxis: {
            title: {
                text: ''
            }
        }
    };

    constructor(
        protected http: HttpClient,
        protected cdr: ChangeDetectorRef
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        // 当 protocolName 或 indexName 变化时重新加载数据
        if ((changes['protocolName'] || changes['indexName']) && !changes['protocolName']?.firstChange) {
            console.log('Protocol or index changed, reloading data...');
            // 重置分页
            this.currentPage = 1;
            this.pageSize = 10;
            // 重新加载数据
            this.loadTrendingData();
            this.loadData();
        }
    }

    ngOnInit() {
        if (this.protocolName && this.indexName) {
            this.loadTrendingData();
            this.loadData();

            this.refreshInterval = setInterval(() => {
                this.loadTrendingData();
            }, 60000);
        }
    }

    ngOnDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    protected loadTrendingData() {
        this.chartLoading = true;
        const endTime = Date.now();
        const startTime = endTime - ( 100 * 24 * 60 * 60 * 1000);

        this.http.get<any[]>(`${environment.apiUrl}/es/trending`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: this.indexName,
                interval: '1h'
            }
        }).subscribe({
            next: (data) => {
                if (Array.isArray(data) && data.length > 0) {
                    const chartData = {
                        series: [{
                            name: `${this.protocolName} Sessions`,
                            data: data.map(item => ({
                                x: item.timestamp,
                                y: item.count
                            }))
                        }]
                    };
                    Object.assign(this.revenueChart, chartData);
                }
                this.chartLoading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error loading trending data:', error);
                this.chartLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    protected loadData() {
        this.loading = true;
        const endTime = Date.now();
        const startTime = endTime - (365 * 7 * 24 * 60 * 60 * 1000);

        this.http.get<any>(`${environment.apiUrl}/es/query`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: this.indexName,
                size: this.pageSize.toString(),
                from: ((this.currentPage - 1) * this.pageSize).toString()
            }
        }).subscribe({
            next: (response) => {
                this.processQueryResponse(response);
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error loading data:', error);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    protected processQueryResponse(response: any): void {
        this.rows = [...response.hits];
        this.total = response.total;
        this.cdr.detectChanges();
    }

    formatDate(date: string) {
        if (date) {
            const dt = new Date(date);
            return dt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        }
        return '';
    }

    onServerChange(event: any) {
        if (event.current_page !== undefined) {
            this.currentPage = event.current_page;
        }
        
        if (event.sort_column !== undefined) {
            this.sortField = event.sort_column;
            this.sortOrder = event.sort_direction;
        }
        
        if (event.page_size !== undefined) {
            this.pageSize = event.page_size;
        }
        
        if (event.search !== undefined) {
            this.search = event.search;
        }
        
        this.loadData();
    }

    onPageChange(event: any) {
        if (this.currentPage !== event) {
            this.currentPage = event;
            this.loadData();
        }
    }

    onPageSizeChange(event: any) {
        if (this.pageSize !== event) {
            this.pageSize = event;
            this.currentPage = 1;
            this.loadData();
        }
    }

    onSortChange(event: any) {
        this.sortField = event.column;
        this.sortOrder = event.direction;
        this.currentPage = 1;
        this.loadData();
    }

    onSearchChange(event: any) {
        if (this.search !== event) {
            this.search = event;
            this.currentPage = 1;
            this.loadData();
        }
    }

    updateColumn(col: any) {
        this.cols = [...this.cols];
    }

    exportTable(type: string) {
        const columns = this.cols.map(d => d.field);
        const records = this.rows;
        const filename = `${this.protocolName.toLowerCase()}_data`;

        switch (type) {
            case 'csv':
                this.exportToCsv(columns, records, filename);
                break;
            case 'txt':
                this.exportToTxt(columns, records, filename);
                break;
            case 'print':
                this.printData(columns, records, filename);
                break;
        }
    }

    private exportToCsv(columns: string[], data: any[], filename: string) {
        const separator = ';';
        const lineSeparator = '\n';
        let result = columns.map(col => this.capitalize(col)).join(separator);
        result += lineSeparator;
        data.forEach(item => {
            result += columns.map(col => item[col] || '').join(separator);
            result += lineSeparator;
        });
        this.downloadFile(result, filename, 'csv');
    }

    private exportToTxt(columns: string[], data: any[], filename: string) {
        const separator = '\t';
        const lineSeparator = '\n';
        let result = columns.map(col => this.capitalize(col)).join(separator);
        result += lineSeparator;
        data.forEach(item => {
            result += columns.map(col => item[col] || '').join(separator);
            result += lineSeparator;
        });
        this.downloadFile(result, filename, 'txt');
    }

    private downloadFile(content: string, filename: string, extension: string) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.${extension}`;
        link.click();
    }

    private printData(columns: string[], data: any[], filename: string) {
        let printContent = `<div style="padding: 20px;"><h2 style="text-align: center;">${filename}</h2>`;
        printContent += '<table style="width: 100%; border-collapse: collapse;">';
        printContent += '<tr>' + columns.map(col => 
            `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">
                ${this.capitalize(col)}
            </th>`
        ).join('') + '</tr>';
        data.forEach(item => {
            printContent += '<tr>' + columns.map(col =>
                `<td style="border: 1px solid #ddd; padding: 8px;">
                    ${item[col] || ''}
                </td>`
            ).join('') + '</tr>';
        });
        printContent += '</table></div>';
        
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(`
                <html><head><title>${filename}</title></head>
                <body>${printContent}</body></html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    }

    protected capitalize(text: string) {
        return text
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
} 