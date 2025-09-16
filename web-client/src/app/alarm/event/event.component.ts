import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TimeRange, TimeRangeService } from '../../services/time-range.service';

// 定义列接口
interface TableColumn { title: string; field: string; hide?: boolean; }

// 定义行数据接口
interface EventData {
    action?: string;
    category?: string;
    gid?: number;
    rev?: number;
    severity?: number | string;
    signature?: string;
    signature_id?: number;
    app_proto?: string;
    dest_ip?: string;
    dest_port?: number;
    direction?: string;
    event_type?: string;
    in_iface?: string;
    pkt_src?: string;
    proto?: string;
    src_ip?: string;
    src_port?: number;
    timestamp?: string; // 已转换为本地时间的展示字符串
}

@Component({
    selector: 'app-event',
    templateUrl: './event.component.html',
    animations: [
        trigger('toggleAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.95)' }),
                animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
            ]),
            transition(':leave', [
                animate('75ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' })),
            ]),
        ]),
    ],
})
export class EventComponent implements OnInit, OnDestroy {
    // 搜索与列
    search = '';
    rows: EventData[] = [];
    cols: TableColumn[] = [
        // 前置关键列：时间、IP、severity、signature
        { title: 'timestamp', field: 'timestamp' },
        { title: 'src_ip', field: 'src_ip' },
        { title: 'dest_ip', field: 'dest_ip' },
        { title: 'severity', field: 'severity' },
        { title: 'signature', field: 'signature' },
        // 其余列
        { title: 'action', field: 'action' },
        { title: 'category', field: 'category' },
        { title: 'gid', field: 'gid' },
        { title: 'rev', field: 'rev' },
        { title: 'signature_id', field: 'signature_id' },
        { title: 'app_proto', field: 'app_proto' },
        { title: 'dest_port', field: 'dest_port' },
        { title: 'direction', field: 'direction' },
        { title: 'event_type', field: 'event_type' },
        { title: 'in_iface', field: 'in_iface' },
        { title: 'pkt_src', field: 'pkt_src' },
        { title: 'proto', field: 'proto' },
        { title: 'src_port', field: 'src_port' },
    ];

    // 趋势图 & 表格状态
    revenueChart: any;
    loading = false;
    chartLoading = false;
    currentPage = 1;
    pageSize = 10;
    total = 0;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';

    private timeRangeSubscription?: Subscription;
    private currentTimeRange?: TimeRange;
    private selectedStartTime?: number; // 图表框选开始
    private selectedEndTime?: number;   // 图表框选结束

    // 资产簿：IP->资产信息
    private assetMap: Map<string, { id: number; asset_name: string; ip_address: string } > = new Map();

    @ViewChild('aiModalContent', { static: false }) aiModalContent!: ElementRef; // 预留，不使用AI弹窗

    constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private timeRangeService: TimeRangeService) {
        this.initChart();
    }

    ngOnInit() {
        // 预加载资产映射
        this.loadAssetsForMapping();

        // 订阅全局时间范围
        this.timeRangeSubscription = this.timeRangeService.timeRange$.subscribe(tr => {
            this.currentTimeRange = tr;
            this.currentPage = 1;
            this.loadTrendingData();
            this.loadData();
        });

        // 初始加载（如果有默认时间范围）
        this.currentTimeRange = this.timeRangeService.getCurrentTimeRange();
        this.loadTrendingData();
        this.loadData();
    }

    ngOnDestroy(): void {
        this.timeRangeSubscription?.unsubscribe();
    }

    // 初始化趋势图配置（参考 BaseProtocol）
    private initChart() {
        const self = this;
        this.revenueChart = {
            series: [{ name: 'Events', data: [] }],
            chart: {
                height: 325,
                type: 'line',
                animations: { enabled: true },
                toolbar: { show: true, tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true }, autoSelected: 'zoom' },
                zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
                events: {
                    selection: (_chart: any, ctx: any) => {
                        if (ctx?.xaxis?.min != null && ctx?.xaxis?.max != null) {
                            self.onChartRangeSelected(ctx.xaxis.min, ctx.xaxis.max);
                        }
                    },
                    zoomed: (_chart: any, ctx: any) => {
                        if (ctx?.xaxis?.min != null && ctx?.xaxis?.max != null) {
                            self.onChartRangeSelected(ctx.xaxis.min, ctx.xaxis.max);
                        }
                    },
                    beforeResetZoom: () => {
                        self.clearChartRangeSelection();
                    }
                }
            },
            colors: ['#4361ee'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            xaxis: {
                type: 'datetime',
                labels: {
                    datetimeFormatter: { year: 'yyyy', month: "MMM 'yy", day: 'dd MMM', hour: 'HH:mm' },
                }
            },
            yaxis: { min: 0 },
            grid: { borderColor: '#e0e6ed' },
            tooltip: {
                x: {
                    formatter: function(value: number) {
                        const date = new Date(value);
                        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                    }
                },
                theme: 'dark'
            },
            markers: { size: 3 },
            legend: { show: false },
            fill: { type: 'solid' },
            noData: { text: 'Loading...' }
        };
    }

    private onChartRangeSelected(start: number, end: number) {
        if (end <= start) return;
        this.selectedStartTime = start;
        this.selectedEndTime = end;
        this.currentPage = 1;
        this.loadData();
    }

    private clearChartRangeSelection() {
        if (this.selectedStartTime || this.selectedEndTime) {
            this.selectedStartTime = undefined;
            this.selectedEndTime = undefined;
            this.currentPage = 1;
            this.loadData();
        }
    }

    // 趋势数据
    private getTrendingInterval(rangeValue: string): string {
        switch (rangeValue) {
            case '1h': return '1m';
            case '6h': return '5m';
            case '12h': return '15m';
            case '24h': return '1h';
            case '7d': return '6h';
            default: return '1h';
        }
    }

    private loadTrendingData() {
        if (!this.currentTimeRange) return;
        this.chartLoading = true;
        const endTime = this.currentTimeRange.endTime?.getTime() || Date.now();
        const startTime = this.currentTimeRange.startTime?.getTime() || (endTime - 24 * 60 * 60 * 1000);
        const interval = this.getTrendingInterval(this.currentTimeRange.value || '24h');
        const filePath = this.currentTimeRange.filePath;

        const params: any = {
            startTime: startTime.toString(),
            endTime: endTime.toString(),
            index: 'event-*',
            interval: interval
        };
        if (filePath) params.filePath = filePath;

        this.http.get<any[]>(`${environment.apiUrl}/es/trending`, { params }).subscribe({
            next: (data) => {
                const points = Array.isArray(data) ? data : [];
                this.revenueChart.series = [{ name: 'Events', data: points.map(p => [p.timestamp, p.count]) }];
                this.chartLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.revenueChart.series = [{ name: 'Events', data: [] }];
                this.chartLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    // 表格数据（服务端分页）
    private loadData() {
        if (!this.currentTimeRange) return;
        this.loading = true;
        const rangeEnd = this.selectedEndTime ?? this.currentTimeRange.endTime?.getTime() ?? Date.now();
        const rangeStart = this.selectedStartTime ?? this.currentTimeRange.startTime?.getTime() ?? (rangeEnd - 24 * 60 * 60 * 1000);
        const filePath = this.currentTimeRange.filePath;

        const params: any = {
            startTime: rangeStart.toString(),
            endTime: rangeEnd.toString(),
            index: 'event-*',
            size: this.pageSize.toString(),
            from: ((this.currentPage - 1) * this.pageSize).toString()
        };
        if (filePath) params.filePath = filePath;

        this.http.get<any>(`${environment.apiUrl}/es/query`, { params }).subscribe({
            next: (response) => {
                this.processQueryResponse(response);
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.rows = [];
                this.total = 0;
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private processQueryResponse(response: any) {
        const hits: any[] = Array.isArray(response?.hits) ? response.hits : [];
        this.total = Number(response?.total || 0);
        this.rows = hits.map((src: any) => {
            const tsRaw = src?.timestamp ?? src?.['@timestamp'] ?? src?.time;
            const alert = src?.alert || {};
            // 字段容错：支持 alert.* 嵌套 & 点号扁平
            const sevValue = src?.severity ?? alert?.severity ?? src?.['alert.severity'] ?? '';
            const row: EventData = {
                action: src?.action ?? alert?.action ?? src?.['alert.action'],
                category: src?.category ?? alert?.category ?? src?.['alert.category'] ?? '',
                gid: Number(src?.gid ?? alert?.gid ?? src?.['alert.gid'] ?? ''),
                rev: Number(src?.rev ?? alert?.rev ?? src?.['alert.rev'] ?? ''),
                severity: this.mapSeverity(sevValue),
                signature: src?.signature ?? alert?.signature ?? src?.['alert.signature'] ?? '',
                signature_id: Number(src?.signature_id ?? alert?.signature_id ?? src?.['alert.signature_id'] ?? ''),
                app_proto: src?.app_proto ?? src?.appProto ?? '',
                dest_ip: src?.dest_ip ?? src?.dst_ip ?? src?.['destination.ip'] ?? '',
                dest_port: Number(src?.dest_port ?? src?.dst_port ?? src?.['destination.port'] ?? ''),
                direction: src?.direction ?? '',
                event_type: src?.event_type ?? src?.eventType ?? '',
                in_iface: src?.in_iface ?? src?.iface ?? src?.inIface ?? '',
                pkt_src: src?.pkt_src ?? '',
                proto: src?.proto ?? src?.protocol ?? '',
                src_ip: src?.src_ip ?? src?.srcIp ?? src?.['source.ip'] ?? '',
                src_port: Number(src?.src_port ?? src?.['source.port'] ?? ''),
                timestamp: this.formatDateLocal(tsRaw)
            };
            return row;
        });
    }

    private mapSeverity(sev: any): string { const n = Number(sev); if (n === 1) return 'High'; if (n === 2) return 'Medium'; if (n === 3) return 'Low'; return String(sev ?? ''); }

    // 事件：表格交互
    onServerChange(event: any) {
        if (event.current_page !== undefined) this.currentPage = event.current_page;
        if (event.page_size !== undefined) this.pageSize = event.page_size;
        if (event.sort_column !== undefined) this.sortField = event.sort_column;
        if (event.sort_direction !== undefined) this.sortOrder = event.sort_direction;
        this.loadData();
    }
    onPageChange(p: number) { if (this.currentPage !== p) { this.currentPage = p; this.loadData(); } }
    onPageSizeChange(ps: number) { if (this.pageSize !== ps) { this.pageSize = ps; this.currentPage = 1; this.loadData(); } }
    onSortChange(e: any) { this.sortField = e.column; this.sortOrder = e.direction; this.currentPage = 1; this.loadData(); }
    onSearchChange(e: any) { this.search = e; /* 后端暂无搜索参数，保留 */ }

    updateColumn(col: TableColumn) { this.cols = [...this.cols]; }

    exportTable(type: string) {
        const columns = this.visibleColumns.map(d => d.field);
        const records = this.rows;
        const filename = `event_data`;
        switch (type) {
            case 'csv': this.exportToCsv(columns, records, filename); break;
            case 'txt': this.exportToTxt(columns, records, filename); break;
            case 'print': this.printData(columns, records, filename); break;
        }
    }

    private exportToCsv(columns: string[], data: any[], filename: string) {
        const sep = ';';
        const ls = '\n';
        let result = columns.join(sep) + ls;
        data.forEach(item => { result += columns.map(col => JSON.stringify(item[col] ?? '')).join(sep) + ls; });
        this.downloadFile(result, filename, 'csv');
    }
    private exportToTxt(columns: string[], data: any[], filename: string) {
        const sep = '\t';
        const ls = '\n';
        let result = columns.join(sep) + ls;
        data.forEach(item => { result += columns.map(col => String(item[col] ?? '')).join(sep) + ls; });
        this.downloadFile(result, filename, 'txt');
    }
    private printData(columns: string[], data: any[], filename: string) {
        let html = `<div style="padding:20px;"><h2 style="text-align:center;">${filename}</h2><table style="width:100%;border-collapse:collapse;">`;
        html += '<tr>' + columns.map(c => `<th style="border:1px solid #ddd;padding:8px;background:#f2f2f2;">${c}</th>`).join('') + '</tr>';
        data.forEach(row => { html += '<tr>' + columns.map(c => `<td style="border:1px solid #ddd;padding:8px;">${row[c] ?? ''}</td>`).join('') + '</tr>'; });
        html += '</table></div>';
        const w = window.open('', '', 'height=600,width=800');
        if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); w.close(); }
    }
    private downloadFile(content: string, filename: string, ext: string) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.${ext}`;
        link.click();
    }

    // 时间/格式化
    private formatDateLocal(value: any): string {
        try {
            if (value == null) return '';
            let ms: number | null = null;
            if (typeof value === 'number') {
                ms = value;
            } else if (typeof value === 'string') {
                if (/^\d+(\.\d+)?$/.test(value)) {
                    ms = Number(value);
                } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
                    // 纯ISO无时区，按UTC处理再转本地
                    ms = Date.parse(value + 'Z');
                } else {
                    ms = Date.parse(value);
                }
            }
            if (ms == null || isNaN(ms)) return String(value);
            const d = new Date(ms);
            const yyyy = d.getFullYear();
            const MM = (d.getMonth() + 1).toString().padStart(2, '0');
            const dd = d.getDate().toString().padStart(2, '0');
            const hh = d.getHours().toString().padStart(2, '0');
            const mm = d.getMinutes().toString().padStart(2, '0');
            const ss = d.getSeconds().toString().padStart(2, '0');
            return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
        } catch { return String(value ?? ''); }
    }

    // 资产映射
    private loadAssetsForMapping() {
        this.http.get<any[]>(`${environment.apiUrl}/assets`).subscribe({
            next: (list) => {
                if (Array.isArray(list)) {
                    this.assetMap.clear();
                    list.forEach((a: any) => {
                        const ip = (a?.ip_address || '').trim();
                        if (ip) this.assetMap.set(ip, a);
                    });
                }
            },
            error: () => {}
        });
    }
    private extractIp(value: any): string {
        const raw = (value ?? '').toString().trim();
        if (!raw) return '';
        if (raw.includes(':') && !raw.includes('.')) { const last = raw.lastIndexOf(':'); if (last > 0) return raw.substring(0, last).replace(/^\[|\]$/g, ''); }
        if (raw.includes(':')) return raw.split(':')[0];
        return raw.replace(/^\[|\]$/g, '');
    }
    resolveIpToAsset(value: any): string {
        const ip = this.extractIp(value);
        if (!ip) return value ?? '';
        const hit = this.assetMap.get(ip);
        return hit?.asset_name || (value ?? '');
    }

    // 可见列
    get visibleColumns(): TableColumn[] { return this.cols.filter(col => !col.hide); }
}
