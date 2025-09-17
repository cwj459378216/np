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
    _raw?: any; // 原始完整数据
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
    // AI 动作列
    { title: 'actions', field: 'actions' }
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

    // AI 解释相关状态
    showAiModal = false;
    aiLoading = false;
    aiContent = '';
    currentRowData: any = null;
    private aiRawContent = '';
    // Markdown & diff 渲染
    aiHtml = '';
    private aiMarkdownRaw = '';
    private aiLines: string[] = [];

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
                toolbar: { show: true, tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: false, reset: true }, autoSelected: 'zoom' },
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
                timestamp: this.formatDateLocal(tsRaw),
                _raw: src
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
    // 导出时排除 actions 列
    const columns = this.visibleColumns.filter(d => d.field !== 'actions').map(d => d.field);
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

    /* ============================== AI 分析功能 ============================== */
    explainWithAI(row: any) {
        if (!row) return;
        this.currentRowData = row;
        this.showAiModal = true;
        this.aiLoading = true;
    this.aiContent = '';
        this.aiRawContent = '';
    this.aiMarkdownRaw = '';
    this.aiHtml = '';
    this.aiLines = [];
        const prompt = this.buildAiPrompt(row);
        // 等待模态框渲染后开始流式读取
        setTimeout(() => this.callAiStream(prompt), 50);
    }

    private buildAiPrompt(row: any): string {
        // 优先使用原始完整数据
        const rawData = row?._raw ? { ...row._raw } : { ...row };
        // 附加格式化展示用字段（不会覆盖原始）
        rawData.__normalized = {
            timestamp_display: row.timestamp,
            severity_mapped: row.severity,
            src_ip: row.src_ip,
            dest_ip: row.dest_ip,
            signature: row.signature,
            category: row.category
        };
        let dataStr = '';
        try { dataStr = JSON.stringify(rawData, null, 2); } catch { dataStr = '[无法序列化数据]'; }
        return `你是资深网络安全分析专家。请对以下入侵/事件告警数据进行专业中文分析：\n\n` +
            `数据 JSON:\n${dataStr}\n\n` +
            `请分条说明：\n` +
            `1. 基本要素：时间(timestamp)、源/目的 IP 与端口、协议(proto/app_proto)、签名(signature/signature_id)、严重级别(severity)。\n` +
            `2. 签名和分类(category)说明：攻击/行为含义，常见触发原因。\n` +
            `3. 危害评估：基于 severity 与 signature 给出风险等级与潜在影响。\n` +
            `4. 溯源与影响面：可能的攻击阶段、是否内外网行为、是否横向移动迹象。\n` +
            `5. 误报可能：哪些字段组合可能导致误报，需要人工核实的点。\n` +
            `6. 建议的处置步骤：包含立即动作、进一步调查、加固/防护建议。\n` +
            `7. 如果必要，给出简短可执行的调查命令示例(不包含破坏性命令)。\n` +
            `请避免重复字段原文，注重解释与推理。`;
    }

    private callAiStream(prompt: string) {
        try {
            fetch(`${environment.apiUrl}/ai/generate/prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            }).then(res => {
                if (!res.body) return res.text().then(t => { this.aiContent = t; this.aiLoading = false; });
                const reader = res.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let inThink = false;
                const pump = (): any => reader.read().then(({ done, value }) => {
                    if (done) { this.aiLoading = false; return; }
                    buffer += decoder.decode(value, { stream: true });
                    // 根据换行分割 JSON 行
                    const parts = buffer.split(/\r?\n/);
                    // 保留最后一个未完成片段
                    buffer = parts.pop() || '';
                    for (const line of parts) {
                        const trimmed = line.trim();
                        if (!trimmed) continue;
                        try {
                            const obj = JSON.parse(trimmed);
                            let chunk: string = obj.response ?? '';
                            if (!chunk) continue;
                            // 处理 unicode 编码的尖括号 \u003c / \u003e
                            chunk = chunk.replace(/\\u003c/gi, '<').replace(/\\u003e/gi, '>');
                            // 过滤 think 区块
                            if (chunk.includes('<think>') || chunk.includes('<THINK>')) {
                                inThink = true;
                            }
                            if (!inThink) {
                                this.aiRawContent += chunk;
                                this.aiMarkdownRaw += chunk;
                                this.updateMarkdownRender();
                            }
                            if (chunk.includes('</think>') || chunk.includes('</THINK>')) {
                                inThink = false;
                            }
                        } catch { /* 忽略非 JSON 行 */ }
                    }
                    this.aiContent = this.stripHtml(this.aiRawContent); // 纯文本（备用）
                    this.scrollToBottom();
                    return pump();
                });
                return pump();
            }).catch(() => { this.aiLoading = false; });
        } catch { this.aiLoading = false; }
    }

    closeAiModal() {
        this.showAiModal = false;
        this.aiContent = '';
        this.currentRowData = null;
    this.aiHtml = '';
    }

    private scrollToBottom() {
        setTimeout(() => {
            try {
                if (this.aiModalContent && this.aiModalContent.nativeElement) {
                    this.aiModalContent.nativeElement.scrollTop = this.aiModalContent.nativeElement.scrollHeight;
                }
            } catch { /* ignore */ }
        }, 0);
    }

    private stripHtml(input: string): string {
        if (!input) return '';
        return input
            .replace(/<\s*br\s*\/?>/gi, '\n')
            .replace(/<\/?p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    private updateMarkdownRender() {
        const raw = this.aiMarkdownRaw.replace(/\r/g,'');
        const lines = raw.split('\n');
        const htmlLines: string[] = [];
        let i = 0;
        let inUl = false, inOl = false, inCode = false;
        let codeLang = '', codeBuffer: string[] = [], codeStartIndex = -1, fenceLen = 3;
        const flushLists = () => { if (inUl) { htmlLines.push('</ul>'); inUl=false; } if (inOl) { htmlLines.push('</ol>'); inOl=false; } };
        const flushCode = () => {
            if (!inCode) return;
            const rawCode = codeBuffer.join('\n');
            const lang = codeLang || '';
            const isCmd = /^(bash|sh|shell|cmd|powershell)$/.test(lang);
            const codeHtmlEscaped = this.highlightCode(rawCode, lang);
            const isNew = codeStartIndex >= this.aiLines.length;
            if (isCmd) this.ensureCmdStyleInjected();
            htmlLines.push(`<div><pre class=\"rounded ${isCmd?'ai-cmd-block':''} bg-white dark:bg-[#101827] border border-gray-200 dark:border-gray-700 p-3 overflow-auto text-[13px] leading-relaxed font-mono ${isNew?'ring-1 ring-yellow-400/60':''}\" data-lang=\"${lang}\"><code class=\"language-${lang}\">${codeHtmlEscaped}</code></pre></div>`);
            inCode=false; codeLang=''; codeBuffer=[]; codeStartIndex=-1;
        };
        while (i < lines.length) {
            const originalLine = lines[i];
            const isNew = i >= this.aiLines.length;
            const noTrail = originalLine.replace(/\s+$/,'');
            // 允许前置最多 3 个空格的缩进（兼容列表内或段落内缩进的 fenced code）
            const core = noTrail.replace(/^ {0,3}/,'');
            const fence = core.match(/^(`{2,3})\s*([a-zA-Z0-9_-]*)\s*$/);
            if (fence) {
                const marker = fence[1];
                const langCaptured = (fence[2] || '').toLowerCase();
                if (!inCode) { flushLists(); inCode=true; codeLang=langCaptured; codeStartIndex=i; fenceLen = marker.length; }
                else if (marker.length === fenceLen && langCaptured === '') { flushCode(); }
                i++; continue;
            }
            if (inCode) { codeBuffer.push(originalLine); i++; continue; }
            const heading = core.match(/^(#{1,6})\s+(.*)$/);
            if (heading) { flushLists(); const lvl=heading[1].length; const content=this.inlineMarkdown(this.escapeHtml(heading[2].trim())); htmlLines.push(`<h${lvl} class=\"mt-4 mb-2 font-semibold text-primary/90 ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}\">${content}</h${lvl}>`); i++; continue; }
            // 伪标题规则1：形如 “1. 标题：” 或 “2. **标题**” 的单行，转换为 h3（避免被渲染成单元素有序列表）
            const pseudoNum = core.match(/^(\d+)\.\s+(?:\*\*)?(.{1,60}?)(?:\*\*)?\s*[:：]?$/);
            if (pseudoNum) {
                flushLists();
                const titleText = pseudoNum[2].trim();
                const titleRendered = this.inlineMarkdown(this.escapeHtml(titleText.replace(/[:：]$/,'')));
                htmlLines.push(`<h3 class=\"mt-5 mb-2 font-semibold text-primary/90 tracking-tight ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}\">${pseudoNum[1]}. ${titleRendered}</h3>`);
                i++; continue;
            }
            // 伪标题规则2：整行仅包裹 **加粗文本** 也视为一个标题（h3）
            const strongOnly = core.match(/^\*\*([^*]{2,80})\*\*$/);
            if (strongOnly) {
                flushLists();
                const t = this.escapeHtml(strongOnly[1].trim().replace(/[:：]$/,''));
                htmlLines.push(`<h3 class=\"mt-6 mb-2 font-semibold text-primary/90 ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}\">${t}</h3>`);
                i++; continue;
            }
            const ordered = core.match(/^\d+\.\s+(.*)$/);
            if (ordered) { if (!inOl){ flushLists(); inOl=true; htmlLines.push('<ol class=\"list-decimal list-inside ml-4\">'); } htmlLines.push(`<li class=\"mb-1 ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}\">${this.inlineMarkdown(this.escapeHtml(ordered[1]))}</li>`); i++; continue; }
            const unordered = core.match(/^[-*+]\s+(.*)$/);
            if (unordered) { if (!inUl){ flushLists(); inUl=true; htmlLines.push('<ul class=\"list-disc list-inside ml-4\">'); } htmlLines.push(`<li class=\"mb-1 ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}\">${this.inlineMarkdown(this.escapeHtml(unordered[1]))}</li>`); i++; continue; }
            if (core.trim()==='') { flushLists(); htmlLines.push('<div class=\"h-2\"></div>'); i++; continue; }
            flushLists();
            htmlLines.push(`<p class=\"mb-2 leading-relaxed break-words ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}\">${this.inlineMarkdown(this.escapeHtml(core))}</p>`);
            i++;
        }
        flushCode(); flushLists();
        this.aiHtml = htmlLines.join('\n');
        this.aiLines = lines;
        this.deferHighlightJs();
    }

    private inlineMarkdown(text: string): string {
        // 粗体 & 斜体 & 行内代码
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">$1</code>');
    }

    private escapeHtml(s: string): string {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    private highlightCode(code: string, lang: string): string {
        const esc = this.escapeHtml(code);
        if (!lang || /(bash|sh|shell|cmd|powershell)/.test(lang)) {
            return esc
                // 注释
                .replace(/(^|\n)\s*#(.*)$/gm, (m, p1, p2) => `${p1}<span class=\"tk-comment\">#${this.escapeHtml(p2)}</span>`)
                // 命令词
                .replace(/\b(cd|ls|grep|awk|sed|export|curl|nc|ingress|filter|tcp|udp|iptables|nslookup|ddosfilter)\b/g,'<span class=\"tk-cmd\">$1</span>')
                // 选项
                .replace(/\s(-{1,2}[a-zA-Z0-9_-]+)/g,' <span class=\"tk-flag\">$1</span>')
                // IP:端口
                .replace(/\b(\d+\.\d+\.\d+\.\d+)(:\d+)?\b/g,'<span class=\"tk-ip\">$1$2</span>')
                // 关键字段
                .replace(/\b(port|srcport|dstport|src|dst)\b/gi,'<span class=\"tk-key\">$1</span>');
        }
        if (/json/.test(lang)) {
            return esc
                .replace(/(&quot;)([a-zA-Z0-9_]+)(&quot;)(\s*:\s*)/g,'<span class="tk-key">$1$2$3</span>$4')
                .replace(/:\s*(&quot;.*?&quot;)/g,': <span class="tk-str">$1</span>');
        }
        return esc;
    }

    private ensureCmdStyleInjected() {
        if (document.getElementById('ai-cmd-style')) return;
        const style = document.createElement('style');
        style.id = 'ai-cmd-style';
        style.innerHTML = `.ai-cmd-block { position: relative; padding-top: 1.6rem;background: black; }
.ai-cmd-block:before { content: attr(data-lang); position: absolute; left: 0.75rem; top:0.25rem; font-size:0.65rem; letter-spacing:0.06em; background: linear-gradient(90deg,#6366f1,#4338ca); color:#fff; padding:2px 6px; border-radius:4px; text-transform:uppercase; font-weight:600; }
[data-lang="bash"].ai-cmd-block:before { content:'bash'; }
[data-lang="sh"].ai-cmd-block:before,[data-lang="shell"].ai-cmd-block:before { content:'sh'; }
[data-lang="cmd"].ai-cmd-block:before { content:'cmd'; }
[data-lang="powershell"].ai-cmd-block:before { content:'ps'; }
.tk-cmd { color:#2563eb; font-weight:600; }
.tk-flag { color:#d97706; }
.tk-ip { color:#059669; font-weight:500; }
.tk-key { color:#7c3aed; }
.tk-comment { color:#6b7280; font-style:italic; }
.tk-str { color:#16a34a; }
.dark .tk-cmd { color:#60a5fa; }
.dark .tk-flag { color:#fbbf24; }
.dark .tk-ip { color:#34d399; }
.dark .tk-key { color:#c084fc; }
.dark .tk-comment { color:#9ca3af; }
.dark .tk-str { color:#4ade80; }`;
        document.head.appendChild(style);
    }

    // 延迟加载 highlight.js（仅首次注入）
    private deferHighlightJs() {
        try {
            const w: any = window as any;
            if (w._hljsLoading) { return; }
            if (w.hljs) { setTimeout(() => { try { w.hljs.highlightAll(); } catch {} }, 0); return; }
            w._hljsLoading = true;
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
            script.onload = () => { try { w.hljs?.highlightAll?.(); } catch {} };
            document.head.appendChild(script);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
            document.head.appendChild(link);
        } catch { /* ignore */ }
    }
}
