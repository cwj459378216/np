import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, SimpleChanges, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { toggleAnimation } from 'src/app/shared/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SharedModule } from 'src/shared.module';
import { ZeekConfigService, ZeekLogType } from 'src/app/services/zeek-config.service';
import { co } from '@fullcalendar/core/internal-common';
import { TimeRangeService, TimeRange } from 'src/app/services/time-range.service';
import { TimeIntervalUtil } from 'src/app/shared/utils/time-interval.util';
import { Subscription } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

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
export class BaseProtocolComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
    @Input() protocolName: string = '';
    @Input() indexName: string = '';
    @Input() cols: any[] = [];
    @Input() rows: any[] = [];

    // ViewChild 引用AI模态框内容区域
    @ViewChild('aiModalContent', { static: false }) aiModalContent!: ElementRef;

    search = '';
    loading = false;
    chartLoading = false;
    currentPage = 1;
    pageSize = 10;
    total = 0;
    private refreshInterval: NodeJS.Timeout | undefined;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    // 搜索输入防抖计时器，避免在同一变更检测周期内多次触发导致 NG0100
    private searchDebounce: any;

    // AI 解释相关（基础文本 + Markdown 增强）
    showAiModal = false;
    aiLoading = false;
    aiContent = '';
    currentRowData: any = null;
    // Markdown 渲染状态
    aiHtml: string = '';
    private aiMarkdownRaw: string = '';
    private aiLines: string[] = [];
    private aiRawContent: string = '';

    // 字段描述信息，用于AI分析
    protected fieldDescriptions: any[] = [];

    // 供子组件设置字段描述（CommonProtocolComponent 调用）
    public setFieldDescriptions(descriptions: any[]) {
        this.fieldDescriptions = Array.isArray(descriptions) ? descriptions : [];
    }

    // 资产簿：IP -> 资产信息 映射
    private assetMap: Map<string, { id: number; asset_name: string; ip_address: string; mac_address: string; type: string; status: string; last_updated: string } > = new Map();

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
                    // 隐藏平移(pan)图标
                    pan: false,
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

    private timeRangeSubscription?: Subscription;
    private routeSubscription?: Subscription; // 监听URL变化
    private languageSubscription?: Subscription; // 监听语言变化
    private currentTimeRange?: TimeRange;
    // 图表选择的时间范围（通过拖拽或缩放）
    private selectedStartTime?: number;
    private selectedEndTime?: number;

    constructor(
        protected http: HttpClient,
        protected cdr: ChangeDetectorRef,
        protected zeekConfigService: ZeekConfigService,
        private timeRangeService: TimeRangeService,
        private router: Router,
        private translate: TranslateService
    ) {
        // 监听路由变化：URL切换时初始化状态（需求2）
        this.routeSubscription = this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(() => {
                this.resetForUrlChange();
            });
    }

    // 处理趋势图选择的时间范围
    private onChartRangeSelected(start: number, end: number) {
        if (end <= start) return;
        this.selectedStartTime = start;
        this.selectedEndTime = end;
        // 重新加载表格数据（不重新加载趋势图，保持当前视图）
        this.loadData();
    }

    // 清除图表自定义选择范围
    private clearChartRangeSelection() {
        if (this.selectedStartTime || this.selectedEndTime) {
            this.selectedStartTime = undefined;
            this.selectedEndTime = undefined;
            // 恢复到全局时间范围
            this.loadData();
        }
    }

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

        // 当列配置变化时，确保操作列存在
        if (changes['cols'] && this.cols) {
            this.ensureActionColumn();
        }
    }

    ngOnInit() {
        console.log('BaseProtocolComponent ngOnInit 开始');
        console.log('当前 protocolName:', this.protocolName);
        console.log('当前 indexName:', this.indexName);
        console.log('当前 rows:', this.rows);
        console.log('当前 cols:', this.cols);

        // 初始化图表配置
        this.initChart();

        // 监听语言变化，重新初始化图表
        this.languageSubscription = this.translate.onLangChange.subscribe(() => {
            this.initChart();
        });

        // 预加载资产数据，用于 SrcIP/DstIp 替换显示
        this.loadAssetsForMapping();

        // 确保操作列存在
        this.ensureActionColumn();

        // 如果没有字段描述信息，添加默认的字段描述
        this.addDefaultFieldDescriptions();

        // 订阅全局时间范围变化
        this.timeRangeSubscription = this.timeRangeService.timeRange$.subscribe(tr => {
            this.currentTimeRange = tr;
            if (this.protocolName && this.indexName) {
                // 时间范围变化后重新加载趋势与表格数据（使用微任务延迟避免同周期变更检测冲突）
                this.deferDataReload();
            }
        });

        // 记录当前时间范围，真正的初始加载放到 ngAfterViewInit 防止 ExpressionChanged
        this.currentTimeRange = this.timeRangeService.getCurrentTimeRange();
    }

    ngAfterViewInit() {
        if (this.protocolName && this.indexName) {
            this.deferDataReload();
        }
    }

    private initChart() {
        const currentLang = this.translate.currentLang || this.translate.defaultLang || 'en';

        // 重新配置图表以支持本地化
        this.revenueChart = {
            ...this.baseChartConfig,
            series: this.revenueChart.series || [{ name: '', data: [] }],
            chart: {
                ...this.baseChartConfig.chart,
                defaultLocale: currentLang === 'zh' ? 'zh' : 'en',
                locales: [
                    {
                        name: 'en',
                        options: {
                            toolbar: {
                                exportToSVG: 'Download SVG',
                                exportToPNG: 'Download PNG',
                                exportToCSV: 'Download CSV'
                            }
                        }
                    },
                    {
                        name: 'zh',
                        options: {
                            toolbar: {
                                exportToSVG: '下载 SVG',
                                exportToPNG: '下载 PNG',
                                exportToCSV: '下载 CSV'
                            }
                        }
                    }
                ],
                events: {
                    selection: (_chart: any, ctx: any) => {
                        const xaxis = ctx?.xaxis;
                        if (xaxis?.min != null && xaxis?.max != null) {
                            this.onChartRangeSelected(Math.round(xaxis.min), Math.round(xaxis.max));
                        }
                    },
                    zoomed: (_chart: any, ctx: any) => {
                        const xaxis = ctx?.xaxis;
                        if (xaxis?.min != null && xaxis?.max != null) {
                            this.onChartRangeSelected(Math.round(xaxis.min), Math.round(xaxis.max));
                        }
                    },
                    beforeResetZoom: () => {
                        this.clearChartRangeSelection();
                    }
                }
            },
            yaxis: {
                title: {
                    text: ''
                }
            }
        };
    }

    ngOnDestroy() {
    // 不再需要定时器：已移除自动刷新
    if (this.refreshInterval) { clearInterval(this.refreshInterval); }
        this.timeRangeSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
    this.languageSubscription?.unsubscribe();
    }

    private addDefaultFieldDescriptions() {
        if (this.fieldDescriptions.length === 0 && this.protocolName) {
            // 动态加载当前协议的字段描述
            this.zeekConfigService.getZeekConfig().subscribe({
                next: (config) => {
                    const protocol = this.protocolName.toLowerCase();
                    const protocolConfig = config.Zeek.find(
                        (p: ZeekLogType) => p.logName.toLowerCase() === protocol
                    );

                    if (protocolConfig) {
                        const fieldDescriptions: any[] = [];

                        // 添加通用开始字段 (BeginAttr)
                        if (protocolConfig.needBeginAttr && config.BeginAttr) {
                            config.BeginAttr.forEach((attr: any) => {
                                fieldDescriptions.push({
                                    keyWord: attr.keyWord,
                                    keyAlias: attr.keyAlias,
                                    keyType: attr.keyType,
                                    description: attr.description,
                                    defaultShow: attr.defaultShow || false
                                });
                            });
                        }

                        // 添加协议特定字段
                        if (protocolConfig.attribute) {
                            console.log(protocolConfig.attribute);
                            protocolConfig.attribute.forEach((attr: any) => {
                                fieldDescriptions.push({
                                    keyWord: attr.keyWord,
                                    keyAlias: attr.keyAlias,
                                    keyType: attr.keyType,
                                    description: attr.description,
                                    defaultShow: attr.defaultShow || false
                                });
                            });
                        }

                        // 添加通用结束字段 (EndAttr)
                        if (protocolConfig.needEndAttr && config.EndAttr) {
                            config.EndAttr.forEach((attr: any) => {
                                fieldDescriptions.push({
                                    keyWord: attr.keyWord,
                                    keyAlias: attr.keyAlias,
                                    keyType: attr.keyType,
                                    description: attr.description,
                                    defaultShow: attr.defaultShow || false
                                });
                            });
                        }

                        this.fieldDescriptions = fieldDescriptions;
                        console.log('动态加载的字段描述信息已设置:', this.fieldDescriptions);
                    } else {
                        console.log('未找到协议配置:', protocol);
                    }
                },
                error: (error) => {
                    console.error('加载字段描述失败:', error);
                }
            });
        }
    }



    private ensureActionColumn() {
        if (this.cols && this.cols.length > 0) {
            // 检查是否已存在操作列
            const hasActionColumn = this.cols.some(col => col.field === 'actions');

            if (!hasActionColumn) {
                // 添加操作列
                this.cols.push({
                    field: 'actions',
                    title: 'AI',
                    sort: false,
                    width: '120px',
                    headerAlign: 'center',
                    align: 'center',
                    hide: false
                });
            }
        }
    }

    // 检查字段是否为时间类型
    private isTimeField(fieldName: string): boolean {
        const timeFieldNames = [
            'timestamp', 'ts', 'lastUpdateTime', 'from', 'till', 'date',
            'time', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
            'start_time', 'end_time', 'startTime', 'endTime'
        ];

        const fieldLower = (fieldName || '').toLowerCase();

        // 直接匹配字段名
        if (timeFieldNames.some(name => fieldLower === name.toLowerCase())) {
            return true;
        }

        // 匹配包含time的字段
        if (fieldLower.includes('time') || fieldLower.includes('date')) {
            return true;
        }

        // 通过字段描述配置判断时间类型
        if (this.fieldDescriptions && this.fieldDescriptions.length > 0) {
            const fieldDesc = this.fieldDescriptions.find(desc =>
                desc.keyWord === fieldName || desc.keyAlias === fieldName
            );
            if (fieldDesc && fieldDesc.keyType === 'time') {
                return true;
            }
        }

        return false;
    }

    // 统一的延迟加载方法（微任务队列），避免在同一个变更检测周期内修改绑定值
    private deferDataReload() {
        Promise.resolve().then(() => {
            this.loadTrendingData();
            this.loadData();
        });
    }

    // 使用当前选择的时间范围加载趋势数据
    protected loadTrendingData() {
        if (!this.indexName) return;

        // 使用微任务来避免在同一变更检测周期内修改状态
        Promise.resolve().then(() => {
            this.chartLoading = true;
            this.cdr.detectChanges();
        });

        const endTime = this.currentTimeRange?.endTime?.getTime() || Date.now();
        const startTime = this.currentTimeRange?.startTime?.getTime() || (endTime - 24 * 60 * 60 * 1000);
        const spanMillis = endTime - startTime;
        const interval = TimeIntervalUtil.computeAutoInterval(spanMillis, 20);
        const filePath = this.currentTimeRange?.filePath; // 获取当前选择的文件路径

        // 构建请求参数
        let params: any = {
            startTime: startTime.toString(),
            endTime: endTime.toString(),
            index: this.indexName,
            interval: interval
        };

        // 如果有文件路径，添加到参数中
        if (filePath) {
            params.filePath = filePath;
        }

        this.http.get<any[]>(`${environment.apiUrl}/es/trending`, { params }).subscribe({
            next: (data) => {
                if (Array.isArray(data) && data.length > 0) {
                    const chartData = {
                        series: [{
                            name: `${this.protocolName} Sessions` ,
                            data: data.map(item => ({ x: item.timestamp, y: item.count }))
                        }]
                    };
                    Object.assign(this.revenueChart, chartData);
                } else {
                    // 清空数据以显示 noData
                    this.revenueChart.series = [{ name: `${this.protocolName} Sessions`, data: [] }];
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

    // URL切换时重置状态 & 重新加载
    private resetForUrlChange() {
        // 重置分页、搜索、排序、图表选择范围
        this.currentPage = 1;
        this.pageSize = 10;
        this.search = '';
        this.sortField = undefined;
        this.sortOrder = undefined;
        this.selectedStartTime = undefined;
        this.selectedEndTime = undefined;
        // 清空数据表与趋势图数据
        this.rows = [];
        this.total = 0;
        this.revenueChart.series = [{ name: `${this.protocolName} Sessions`, data: [] }];
        this.cdr.detectChanges();
        if (this.protocolName && this.indexName) {
            this.loadTrendingData();
            this.loadData();
        }
    }

    // 使用当前时间范围加载表格数据
    protected loadData() {
        if (!this.indexName) return;

        // 使用微任务来避免在同一变更检测周期内修改状态
        Promise.resolve().then(() => {
            this.loading = true;
            this.cdr.detectChanges();
        });

        const rangeEnd = this.selectedEndTime ?? this.currentTimeRange?.endTime?.getTime() ?? Date.now();
        const rangeStart = this.selectedStartTime ?? this.currentTimeRange?.startTime?.getTime() ?? (rangeEnd - 24 * 60 * 60 * 1000);
        const filePath = this.currentTimeRange?.filePath; // 获取当前选择的文件路径

        // 构建请求参数
        let params: any = {
            startTime: rangeStart.toString(),
            endTime: rangeEnd.toString(),
            index: this.indexName,
            size: this.pageSize.toString(),
            from: ((this.currentPage - 1) * this.pageSize).toString()
        };

        // 添加搜索参数
        if (this.search && this.search.trim()) {
            params.search = this.search.trim();
        }

        // 添加排序参数
        if (this.sortField) {
            params.sortField = this.sortField;
            params.sortOrder = this.sortOrder || 'asc';
        }

        // 如果有文件路径，添加到参数中
        if (filePath) {
            params.filePath = filePath;
        }

        console.log('Loading data with params:', params); // 调试日志

        this.http.get<any>(`${environment.apiUrl}/es/query`, { params }).subscribe({
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
        // 处理查询响应数据
        if (response && response.hits && Array.isArray(response.hits) && response.hits.length > 0) {
            this.rows = [...response.hits];
            this.total = response.total;

            // 将 Src/Dst 等 IP 字段替换为资产名（命中资产簿时）
            const isIpAlias = (alias: string) => {
                const a = (alias || '').toLowerCase();
                return /(^|\b)(src.*ip|dst.*ip|source.*ip|dest.*ip|id\.orig_h|id\.resp_h|clientip|serverip|ip)$/.test(a);
            };
            const isIpvXLike = (v: any) => typeof v === 'string' && (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(v) || /\[?[0-9a-fA-F:]+\]?(:\d+)?$/.test(v));

            if (Array.isArray(this.cols) && this.cols.length > 0) {
                this.rows = this.rows.map((row: any) => {
                    const updated: any = { ...row };
                    this.cols.forEach(col => {
                        const key = col?.field;
                        if (!key) return;
                        const value = updated[key];

                        // 处理 IP 字段
                        if (isIpAlias(key) || isIpvXLike(value)) {
                            updated[key] = this.resolveIpToAsset(value);
                        }

                        // 处理时间字段 - 在数据层面进行预处理
                        if (this.isTimeField(key) && value) {
                            // 为时间字段创建一个显示用的副本字段
                            const displayKey = key + '_display';
                            updated[displayKey] = this.formatTimeField(value);
                            // 保留原始值用于排序和其他操作
                            updated[key + '_raw'] = value;
                        }
                    });
                    return updated;
                });
            }
        } else {
            // 清空数据显示
            this.rows = [];
            this.total = 0;
        }
        // 使用 markForCheck 而不是 detectChanges 来避免立即触发变更检测
        this.cdr.markForCheck();
    }

    onServerChange(event: any) {
        console.log('Server change event:', event); // 调试日志

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

        // 只有当配置了真实数据源时才重新加载
        if (this.protocolName && this.indexName) {
            this.loadData();
        }
    }

    onPageChange(event: any) {
        console.log('Page change event:', event); // 调试日志
        if (this.currentPage !== event) {
            this.currentPage = event;
            // 只有当配置了真实数据源时才重新加载
            if (this.protocolName && this.indexName) {
                this.loadData();
            }
        }
    }

    onPageSizeChange(event: any) {
        console.log('Page size change event:', event); // 调试日志
        if (this.pageSize !== event) {
            this.pageSize = event;
            this.currentPage = 1;
            // 只有当配置了真实数据源时才重新加载
            if (this.protocolName && this.indexName) {
                this.loadData();
            }
        }
    }

    onSortChange(event: any) {
        console.log('Sort change event:', event); // 调试日志
        this.sortField = event.column;
        this.sortOrder = event.direction;
        this.currentPage = 1;
        // 只有当配置了真实数据源时才重新加载
        if (this.protocolName && this.indexName) {
            this.loadData();
        }
    }

    onSearchChange(event: any) {
        console.log('Search change event:', event); // 调试日志
        if (this.search !== event) {
            this.search = event;
            this.currentPage = 1;
            if (this.protocolName && this.indexName) {
                this.loadData();
            }
        }
    }

    // 新增：直接由输入框触发的防抖搜索方法
    onSearchInputChange(value: string) {
        this.search = value || '';
        this.currentPage = 1; // 搜索时重置到第一页

        // 清除之前的防抖计时器
        if (this.searchDebounce) {
            clearTimeout(this.searchDebounce);
        }

        // 设置新的防抖计时器
        this.searchDebounce = setTimeout(() => {
            if (this.protocolName && this.indexName) {
                console.log('Search triggered with value:', this.search); // 调试日志
                this.loadData();
            }
        }, 300);
    }

    // ========== 资产映射（移植自 event 组件简化版） ==========
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
        if (raw.includes(':') && !raw.includes('.')) { const last = raw.lastIndexOf(':'); if (last > 0) return raw.substring(0, last).replace(/^[\[]|[\]]$/g,''); }
        if (raw.includes(':')) return raw.split(':')[0];
        return raw.replace(/^[\[]|[\]]$/g,'');
    }
    resolveIpToAsset(value: any): string {
        const ip = this.extractIp(value);
        if (!ip) return value ?? '';
        const hit = this.assetMap.get(ip);
        return hit?.asset_name || value;
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

    // 通用时间格式化方法，支持多种时间格式
    formatTimeField(value: any): string {
        if (!value) return '';

        try {
            let date: Date;

            // 处理不同类型的时间值
            if (typeof value === 'number') {
                // 时间戳处理：检查是否是秒或毫秒
                if (value.toString().length === 10) {
                    date = new Date(value * 1000); // 秒时间戳
                } else {
                    date = new Date(value); // 毫秒时间戳
                }
            } else if (typeof value === 'string') {
                // 字符串时间处理
                if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
                    // UTC格式：2025-09-14T11:07:28
                    date = new Date(value + 'Z');
                } else if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+/)) {
                    // 带微秒的格式：2025-09-14T14:05:08.427829
                    const cleanValue = value.replace(/(\.\d{3})\d*/, '$1'); // 保留3位小数
                    date = new Date(cleanValue + 'Z');
                } else {
                    // 其他字符串格式
                    date = new Date(value);
                }
            } else {
                date = new Date(value);
            }

            // 验证日期是否有效
            if (isNaN(date.getTime())) {
                return String(value); // 如果无法解析，返回原值
            }

            // 使用中文本地化格式
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (error) {
            console.warn('Error formatting time field:', value, error);
            return String(value); // 格式化失败时返回原值
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
            .replace(/([A-Z])/g, '$1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // AI 解释功能
    explainWithAI(rowData: any) {
        this.currentRowData = rowData;
        this.showAiModal = true;
        this.aiLoading = true;
        this.aiContent = '';
        // 新增: reset markdown buffers
        this.aiHtml = '';
        this.aiMarkdownRaw = '';
        this.aiLines = [];
        this.aiRawContent = '';
        const prompt = this.buildAiPrompt(rowData);
        setTimeout(() => {
            this.scrollToBottom();
            this.callAiStream(prompt);
        }, 80);
    }

    private buildAiPrompt(rowData: any): string {
        const protocol = this.protocolName || rowData.protocol || this.translate.instant('aiAssistant.protocolAnalysisPrompt.defaultProtocol');
        const dataStr = JSON.stringify(rowData, null, 2);

        // 构建字段说明文档
        let fieldDocumentation = '';
        console.log(this.fieldDescriptions);
        if (this.fieldDescriptions && this.fieldDescriptions.length > 0) {
            const prompt = this.translate.instant('aiAssistant.protocolAnalysisPrompt');
            fieldDocumentation = `\n\n${prompt.fieldDocumentation}\n`;
            this.fieldDescriptions.forEach((field, index) => {
                console.log(`字段 ${index + 1}:`, field);
                fieldDocumentation += `${index + 1}. ${field.keyAlias}:\n`;
                fieldDocumentation += `   - ${prompt.fieldDescription}: ${field.description || prompt.noDescription}\n`;
                fieldDocumentation += '\n';
            });
        }
        console.log('构建的字段说明文档:', fieldDocumentation);

        // 使用翻译服务构建提示词
        const prompt = this.translate.instant('aiAssistant.protocolAnalysisPrompt');

        return `${prompt.analysisRequest.replace('{protocol}', protocol)}

${prompt.dataContent}
${dataStr}${fieldDocumentation}

${prompt.analysisAspects}
${prompt.basicInfo}
${prompt.protocolFields}
${prompt.securityRisks}
${prompt.performance}
${prompt.geolocation}
${prompt.recommendations}

${prompt.guidance}

${prompt.languageInstruction}`;
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
                    const parts = buffer.split(/\r?\n/);
                    buffer = parts.pop() || '';
                    for (const line of parts) {
                        const trimmed = line.trim();
                        if (!trimmed) continue;
                        try {
                            const obj = JSON.parse(trimmed);
                            let chunk: string = obj.response || '';
                            if (!chunk) continue;
                            chunk = chunk.replace(/\\u003c/gi,'<').replace(/\\u003e/gi,'>');
                            if (chunk.includes('<think>') || chunk.includes('<THINK>')) { inThink = true; }
                            if (!inThink) {
                                this.aiRawContent += chunk;
                                this.aiMarkdownRaw += chunk;
                                this.updateMarkdownRender();
                            }
                            if (chunk.includes('</think>') || chunk.includes('</THINK>')) { inThink = false; }
                        } catch { /* ignore */ }
                    }
                    this.aiContent = this.stripHtml(this.aiRawContent);
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

    // 自动滚动到 AI 内容底部
    private scrollToBottom() {
        setTimeout(() => {
            try {
                if (this.aiModalContent && this.aiModalContent.nativeElement) {
                    const el = this.aiModalContent.nativeElement;
                    el.scrollTop = el.scrollHeight;
                }
            } catch {}
        }, 0);
    }

    // ===== Markdown 渲染 & 语法高亮 (复用 event 组件逻辑简化版) =====
    private stripHtml(input: string): string {
        if (!input) return '';
        return input
            .replace(/<\s*br\s*\/?\s*>/gi, '\n')
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
            htmlLines.push(`<div><pre class="rounded ${isCmd?'ai-cmd-block':''} bg-white dark:bg-[#101827] border border-gray-200 dark:border-gray-700 p-3 overflow-auto text-[13px] leading-relaxed font-mono ${isNew?'ring-1 ring-yellow-400/60':''}" data-lang="${lang}"><code class="language-${lang}">${codeHtmlEscaped}</code></pre></div>`);
            inCode=false; codeLang=''; codeBuffer=[]; codeStartIndex=-1;
        };
        while (i < lines.length) {
            const originalLine = lines[i];
            const isNew = i >= this.aiLines.length;
            const noTrail = originalLine.replace(/\s+$/,'');
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
            if (heading) { flushLists(); const lvl=heading[1].length; const content=this.inlineMarkdown(this.escapeHtml(heading[2].trim())); htmlLines.push(`<h${lvl} class="mt-4 mb-2 font-semibold text-primary/90 ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}">${content}</h${lvl}>`); i++; continue; }
            const pseudoNum = core.match(/^(\d+)\.\s+(?:\*\*)?(.{1,60}?)(?:\*\*)?\s*[:：]?$/);
            if (pseudoNum) { flushLists(); const titleText = pseudoNum[2].trim(); const titleRendered = this.inlineMarkdown(this.escapeHtml(titleText.replace(/[:：]$/,''))); htmlLines.push(`<h3 class="mt-5 mb-2 font-semibold text-primary/90 tracking-tight ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}">${pseudoNum[1]}. ${titleRendered}</h3>`); i++; continue; }
            const strongOnly = core.match(/^\*\*([^*]{2,80})\*\*$/);
            if (strongOnly) { flushLists(); const t = this.escapeHtml(strongOnly[1].trim().replace(/[:：]$/,'')); htmlLines.push(`<h3 class="mt-6 mb-2 font-semibold text-primary/90 ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}">${t}</h3>`); i++; continue; }
            const ordered = core.match(/^\d+\.\s+(.*)$/);
            if (ordered) { if (!inOl){ flushLists(); inOl=true; htmlLines.push('<ol class="list-decimal list-inside ml-4">'); } htmlLines.push(`<li class="mb-1 ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}">${this.inlineMarkdown(this.escapeHtml(ordered[1]))}</li>`); i++; continue; }
            const unordered = core.match(/^[-*+]\s+(.*)$/);
            if (unordered) { if (!inUl){ flushLists(); inUl=true; htmlLines.push('<ul class="list-disc list-inside ml-4">'); } htmlLines.push(`<li class="mb-1 ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}">${this.inlineMarkdown(this.escapeHtml(unordered[1]))}</li>`); i++; continue; }
            if (core.trim()==='') { flushLists(); htmlLines.push('<div class="h-2"></div>'); i++; continue; }
            flushLists();
            htmlLines.push(`<p class="mb-2 leading-relaxed break-words ${isNew?'bg-yellow-50 dark:bg-yellow-900/30':''}">${this.inlineMarkdown(this.escapeHtml(core))}</p>`);
            i++;
        }
        flushCode(); flushLists();
        this.aiHtml = htmlLines.join('\n');
        this.aiLines = lines;
        this.deferHighlightJs();
    }

    private inlineMarkdown(text: string): string {
        return text
            .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
            .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,'<em>$1</em>')
            .replace(/`([^`]+)`/g,'<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">$1</code>');
    }
    private escapeHtml(s: string): string { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    private highlightCode(code: string, lang: string): string {
        const esc = this.escapeHtml(code);
        if (!lang || /(bash|sh|shell|cmd|powershell)/.test(lang)) {
            return esc
                .replace(/(^|\n)\s*#(.*)$/gm,(m,p1,p2)=>`${p1}<span class="tk-comment">#${this.escapeHtml(p2)}</span>`)
                .replace(/\b(cd|ls|grep|awk|sed|export|curl|nc|ingress|filter|tcp|udp|iptables|nslookup|ddosfilter)\b/g,'<span class="tk-cmd">$1</span>')
                .replace(/\s(-{1,2}[a-zA-Z0-9_-]+)/g,' <span class="tk-flag">$1</span>')
                .replace(/\b(\d+\.\d+\.\d+\.\d+)(:\d+)?\b/g,'<span class="tk-ip">$1$2</span>')
                .replace(/\b(port|srcport|dstport|src|dst)\b/gi,'<span class="tk-key">$1</span>');
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
        style.innerHTML = `.ai-cmd-block { position: relative; padding-top: 1.6rem; }\n.ai-cmd-block:before { content: attr(data-lang); position: absolute; left: 0.75rem; top:0.25rem; font-size:0.65rem; letter-spacing:0.06em; background: linear-gradient(90deg,#6366f1,#4338ca); color:#fff; padding:2px 6px; border-radius:4px; text-transform:uppercase; font-weight:600; }\n[data-lang="bash"].ai-cmd-block:before { content:'bash'; }\n[data-lang="sh"].ai-cmd-block:before,[data-lang="shell"].ai-cmd-block:before { content:'sh'; }\n[data-lang="cmd"].ai-cmd-block:before { content:'cmd'; }\n[data-lang="powershell"].ai-cmd-block:before { content:'ps'; }\n.tk-cmd { color:#2563eb; font-weight:600; }\n.tk-flag { color:#d97706; }\n.tk-ip { color:#059669; font-weight:500; }\n.tk-key { color:#7c3aed; }\n.tk-comment { color:#6b7280; font-style:italic; }\n.tk-str { color:#16a34a; }\n.dark .tk-cmd { color:#60a5fa; }\n.dark .tk-flag { color:#fbbf24; }\n.dark .tk-ip { color:#34d399; }\n.dark .tk-key { color:#c084fc; }\n.dark .tk-comment { color:#9ca3af; }\n.dark .tk-str { color:#4ade80; }`;
        document.head.appendChild(style);
    }
    private deferHighlightJs() {
        try {
            const w: any = window as any;
            if (w._hljsLoading) { return; }
            if (w.hljs) { setTimeout(()=>{ try { w.hljs.highlightAll(); } catch {} },0); return; }
            w._hljsLoading = true;
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
            script.onload = () => { try { w.hljs?.highlightAll?.(); } catch {} };
            document.head.appendChild(script);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
            document.head.appendChild(link);
        } catch {}
    }
}
