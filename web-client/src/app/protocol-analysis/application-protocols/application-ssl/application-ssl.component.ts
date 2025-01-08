import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { toggleAnimation } from 'src/app/shared/animations';

export interface SslTrendingData {
    timestamp: number;
    count: number;
}

export interface SslQueryResponse {
    total: number;
    hits: Array<{
        channelID: string;
        cipher: string;
        dstIP: string;
        dstPort: number;
        established: string;
        filePath: string;
        resumed: string;
        serverName: string;
        srcIP: string;
        srcPort: number;
        sslHistory: string;
        timestamp: string;
        ts: number;
        uid: string;
        version: string;
    }>;
}

@Component({
    selector: 'app-application-ssl',
    templateUrl: './application-ssl.component.html',
    styleUrls: ['./application-ssl.component.css'],
    animations: [toggleAnimation]
})
export class ApplicationSslComponent implements OnInit, OnDestroy {
    search = '';
    loading = false;
    chartLoading = false;
    currentPage = 1;
    pageSize = 10;
    total = 0;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    private refreshInterval: NodeJS.Timeout | undefined;

    cols = [
        { field: 'serverName', title: 'Server Name', hide: false },
        { field: 'version', title: 'Version', hide: false },
        { field: 'cipher', title: 'Cipher', hide: false, template: true },
        { field: 'srcIP', title: 'Source IP', hide: false },
        { field: 'srcPort', title: 'Source Port', hide: false },
        { field: 'dstIP', title: 'Destination IP', hide: false },
        { field: 'dstPort', title: 'Destination Port', hide: false },
        { field: 'established', title: 'Established', hide: false },
        { field: 'resumed', title: 'Resumed', hide: false },
        { field: 'timestamp', title: 'Last Update Time', hide: false },
        // 隐藏的列
        { field: 'uid', title: 'UID', hide: true },
        { field: 'channelID', title: 'Channel ID', hide: true },
        { field: 'filePath', title: 'Interface', hide: true },
        { field: 'sslHistory', title: 'SSL History', hide: true }
    ];

    rows: any[] = [];

    revenueChart: any = {
        series: [{
            name: 'SSL Connections',
            data: []
        }],
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
                    month: 'MMM \'yy',
                    day: 'dd MMM',
                    hour: 'HH:mm'
                },
                formatter: function(value: string) {
                    const date = new Date(Number(value));
                    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                }
            }
        },
        yaxis: {
            title: {
                text: 'SSL Connections Count'
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

    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadTrendingData();
        this.loadData();

        this.refreshInterval = setInterval(() => {
            this.loadTrendingData();
        }, 60000);
    }

    ngOnDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    loadTrendingData() {
        this.chartLoading = true;
        const endTime = Date.now();
        const startTime = endTime - (7 * 24 * 60 * 60 * 1000);

        this.http.get<SslTrendingData[]>(`${environment.apiUrl}/es/trending`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: 'ssl-realtime',
                interval: '1h'
            }
        }).subscribe({
            next: (data) => {
                if (Array.isArray(data) && data.length > 0) {
                    const chartData = {
                        series: [{
                            name: 'SSL Connections',
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

    loadData() {
        this.loading = true;
        const endTime = Date.now();
        const startTime = endTime - (7 * 24 * 60 * 60 * 1000);

        this.http.get<SslQueryResponse>(`${environment.apiUrl}/es/query`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: 'ssl-realtime',
                size: this.pageSize.toString(),
                from: ((this.currentPage - 1) * this.pageSize).toString()
            }
        }).subscribe({
            next: (response) => {
                this.rows = response.hits.map(hit => ({
                    ...hit,
                    timestamp: this.formatDate(hit.timestamp)
                }));
                this.total = response.total;
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

    public truncateText(text: string): string {
        if (!text) return '';
        return text.length > 50 ? text.substring(0, 47) + '...' : text;
    }

    exportTable(type: string) {
        let columns: string[] = this.cols
            .filter(col => !col.hide)
            .map(col => col.field);
        
        let records = this.rows;
        let filename = 'ssl_connections';

        if (type === 'csv') {
            this.exportToCsv(columns, records, filename);
        } else if (type === 'txt') {
            this.exportToTxt(columns, records, filename);
        } else if (type === 'print') {
            this.printData(columns, records, filename);
        }
    }

    private exportToCsv(columns: string[], data: any[], filename: string) {
        const coldelimiter = ';';
        const linedelimiter = '\n';
        
        let result = columns.map(col => this.capitalize(col)).join(coldelimiter);
        result += linedelimiter;
        
        data.forEach(item => {
            result += columns.map(col => item[col] || '').join(coldelimiter);
            result += linedelimiter;
        });

        const blob = new Blob([result], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
    }

    private exportToTxt(columns: string[], data: any[], filename: string) {
        const coldelimiter = '\t';
        const linedelimiter = '\n';
        
        let result = columns.map(col => this.capitalize(col)).join(coldelimiter);
        result += linedelimiter;
        
        data.forEach(item => {
            result += columns.map(col => item[col] || '').join(coldelimiter);
            result += linedelimiter;
        });

        const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.txt`;
        link.click();
    }

    private printData(columns: string[], data: any[], filename: string) {
        let printContent = '<div style="padding: 20px;">';
        printContent += `<h2 style="text-align: center;">${filename}</h2>`;
        printContent += '<table style="width: 100%; border-collapse: collapse;">';
        
        // Header
        printContent += '<tr>';
        columns.forEach(col => {
            printContent += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">${this.capitalize(col)}</th>`;
        });
        printContent += '</tr>';
        
        // Data
        data.forEach(item => {
            printContent += '<tr>';
            columns.forEach(col => {
                printContent += `<td style="border: 1px solid #ddd; padding: 8px;">${item[col] || ''}</td>`;
            });
            printContent += '</tr>';
        });
        
        printContent += '</table></div>';
        
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>SSL Connections</title></head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        }
    }

    private capitalize(text: string) {
        return text
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
} 