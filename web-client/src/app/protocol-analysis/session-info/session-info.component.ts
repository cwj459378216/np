import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { SessionInfoService, SessionInfo } from '../services/session-info.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface TrendingData {
    timestamp: number;
    count: number;
}

export interface ESQueryResponse {
    total: number;
    hits: Array<{
        channelID: string;
        connState: string;
        dstIP: string;
        dstPort: number;
        duration: number;
        filePath: string;
        history: string;
        localOrig: string;
        localResp: string;
        missedBytes: number;
        origBytes: number;
        origIpBytes: number;
        origPkts: number;
        orig_l2_addr: string;
        proto: string;
        respBytes: number;
        respIpBytes: number;
        respPkts: number;
        resp_l2_addr: string;
        srcIP: string;
        srcPort: number;
        timestamp: string;
        ts: number;
        uid: string;
    }>;
}

@Component({
  selector: 'app-session-info',
  templateUrl: './session-info.component.html',
  styleUrl: './session-info.component.css',
  animations: [toggleAnimation]
})
export class SessionInfoComponent implements OnInit, OnDestroy {
    search = '';
    loading = false;
    currentPage = 1;
    pageSize = 10;
    total = 0;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';

    // 添加加载状态
    chartLoading = false;

    revenueChart: any = {
        series: [{
            name: 'Sessions',
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
            categories: [],
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
                text: 'Sessions Count'
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

    cols = [
        { field: 'srcIP', title: 'Src.IP:Port', hide: false },
        { field: 'dstIP', title: 'Dst.IP:Port', hide: false },
        { field: 'service', title: 'Service', hide: false },
        { field: 'bytyes', title: 'Bytyes', hide: false },
        { field: 'packets', title: 'Packets', hide: false },
        { field: 'lastUpdateTime', title: 'Last Updated Time', hide: false },
        { field: 'channelID', title: 'Channel ID', hide: true },
        { field: 'connState', title: 'Conn State', hide: true },
        { field: 'duration', title: 'Duration', hide: true },
        { field: 'filePath', title: 'File Path', hide: true },
        { field: 'history', title: 'History', hide: true },
        { field: 'localOrig', title: 'Local Orig', hide: true },
        { field: 'localResp', title: 'Local Resp', hide: true },
        { field: 'missedBytes', title: 'Missed Bytes', hide: true },
        { field: 'origBytes', title: 'Orig Bytes', hide: true },
        { field: 'origIpBytes', title: 'Orig IP Bytes', hide: true },
        { field: 'origPkts', title: 'Orig Packets', hide: true },
        { field: 'orig_l2_addr', title: 'Orig L2 Addr', hide: true },
        { field: 'respBytes', title: 'Resp Bytes', hide: true },
        { field: 'respIpBytes', title: 'Resp IP Bytes', hide: true },
        { field: 'respPkts', title: 'Resp Packets', hide: true },
        { field: 'resp_l2_addr', title: 'Resp L2 Addr', hide: true },
        { field: 'uid', title: 'UID', hide: true }
    ];

    rows: SessionInfo[] = [];

    private refreshInterval: NodeJS.Timeout | undefined;

    constructor(
        private sessionInfoService: SessionInfoService,
        private cdr: ChangeDetectorRef,
        private http: HttpClient
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

        this.http.get<TrendingData[]>(`${environment.apiUrl}/es/trending`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: 'conn-realtime',
                interval: '1h'
            }
        }).subscribe({
            next: (data) => {
                console.log('Trending data received:', data);

                // 更新图表数据
                const chartData = {
                    series: [{
                        name: 'Sessions',
                        data: data.map(item => ({
                            x: item.timestamp,
                            y: item.count
                        }))
                    }]
                };

                // 使用 Object.assign 更新图表配置
                Object.assign(this.revenueChart, chartData);
                
                console.log('Chart data updated:', this.revenueChart);
                
                this.chartLoading = false;
                // 强制更新视图
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

        this.http.get<ESQueryResponse>(`${environment.apiUrl}/es/query`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: 'conn-realtime',
                size: this.pageSize.toString(),
                from: ((this.currentPage - 1) * this.pageSize).toString()
            }
        }).subscribe({
            next: (response) => {
                this.rows = response.hits.map(hit => ({
                    srcIP: `${hit.srcIP}:${hit.srcPort}`,
                    dstIP: `${hit.dstIP}:${hit.dstPort}`,
                    service: hit.proto,
                    bytyes: `${hit.origIpBytes + hit.respIpBytes}`,
                    packets: `${hit.origPkts + hit.respPkts}`,
                    lastUpdateTime: this.formatDate(hit.timestamp),
                    channelID: hit.channelID,
                    connState: hit.connState,
                    duration: hit.duration,
                    filePath: hit.filePath,
                    history: hit.history,
                    localOrig: hit.localOrig,
                    localResp: hit.localResp,
                    missedBytes: hit.missedBytes,
                    origBytes: hit.origBytes,
                    origIpBytes: hit.origIpBytes,
                    origPkts: hit.origPkts,
                    orig_l2_addr: hit.orig_l2_addr,
                    respBytes: hit.respBytes,
                    respIpBytes: hit.respIpBytes,
                    respPkts: hit.respPkts,
                    resp_l2_addr: hit.resp_l2_addr,
                    uid: hit.uid
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

    onServerChange(event: any) {
        console.log('Server change:', event);
        
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
        console.log('Page changed:', {
            fromPage: this.currentPage,
            toPage: event,
            eventType: typeof event
        });
        
        if (this.currentPage !== event) {
            this.currentPage = event;
        }
    }

    onPageSizeChange(event: any) {
        console.log('Page size changed:', event);
        if (this.pageSize !== event) {
            this.pageSize = event;
            this.currentPage = 1;
        }
    }

    onSortChange(event: any) {
        console.log('Sort changed:', {
            column: event.column,
            direction: event.direction,
            event: event
        });
        
        this.sortField = event.column;
        this.sortOrder = event.direction;
        
        this.currentPage = 1;
    }

    onSearchChange(event: any) {
        console.log('Search changed:', event);
        if (this.search !== event) {
            this.search = event;
            this.currentPage = 1;
        }
    }

    updateColumn(col: any) {
        this.cols = [...this.cols];
    }

    async exportTable(type: string) {
        this.loading = true;
        this.cdr.detectChanges();

        try {
            const data = await this.sessionInfoService.exportData(type, this.search).toPromise();
            if (!data) return;

            const columns = this.cols.filter(col => !col.hide).map(col => col.field);
            
            if (type === 'csv') {
                this.exportToCsv(columns, data);
            } else if (type === 'txt') {
                this.exportToTxt(columns, data);
            } else if (type === 'print') {
                this.printData(columns, data);
            }
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    private exportToCsv(columns: string[], data: SessionInfo[]) {
        const coldelimiter = ';';
        const linedelimiter = '\n';
        
        let result = columns.map(col => this.capitalize(col)).join(coldelimiter);
        result += linedelimiter;
        
        data.forEach(item => {
            result += columns.map(col => item[col as keyof SessionInfo]).join(coldelimiter);
            result += linedelimiter;
        });

        const blob = new Blob([result], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'session_info.csv';
        link.click();
    }

    private exportToTxt(columns: string[], data: SessionInfo[]) {
        const coldelimiter = '\t';
        const linedelimiter = '\n';
        
        let result = columns.map(col => this.capitalize(col)).join(coldelimiter);
        result += linedelimiter;
        
        data.forEach(item => {
            result += columns.map(col => item[col as keyof SessionInfo]).join(coldelimiter);
            result += linedelimiter;
        });

        const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'session_info.txt';
        link.click();
    }

    private printData(columns: string[], data: SessionInfo[]) {
        let printContent = '<div style="padding: 20px;">';
        printContent += '<h2 style="text-align: center;">Session Information</h2>';
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
                printContent += `<td style="border: 1px solid #ddd; padding: 8px;">${item[col as keyof SessionInfo]}</td>`;
            });
            printContent += '</tr>';
        });
        
        printContent += '</table></div>';
        
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Session Information</title></head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        }
    }

    capitalize(text: string) {
        return text
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
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
}
