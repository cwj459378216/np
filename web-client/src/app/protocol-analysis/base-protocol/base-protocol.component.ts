import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, SimpleChanges, OnChanges, ViewChild, ElementRef } from '@angular/core';
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
import { Subscription } from 'rxjs';

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

    // AI 解释相关
    showAiModal = false;
    aiLoading = false;
    aiContent = '';
    currentRowData: any = null;

    // 字段描述信息，用于AI分析
    protected fieldDescriptions: any[] = [];

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

    private timeRangeSubscription?: Subscription;
    private currentTimeRange?: TimeRange;
    // 图表选择的时间范围（通过拖拽或缩放）
    private selectedStartTime?: number;
    private selectedEndTime?: number;

    constructor(
        protected http: HttpClient,
        protected cdr: ChangeDetectorRef,
        protected zeekConfigService: ZeekConfigService,
        private timeRangeService: TimeRangeService
    ) {
        // 初始化图表事件，用于捕获用户在趋势图上的拖拽选择和缩放
        // 使用 any 避免类型约束问题
        (this.revenueChart.chart as any).events = {
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
        };
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
        console.log('当前 rows:', this.rows);
        console.log('当前 cols:', this.cols);

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
                // 时间范围变化后重新加载趋势与表格数据
                this.loadTrendingData();
                this.loadData();
            }
        });

        // 初始加载（如果已经有值）
        this.currentTimeRange = this.timeRangeService.getCurrentTimeRange();
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
        this.timeRangeSubscription?.unsubscribe();
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
                    title: 'Actions',
                    sortable: false,
                    hide: false,
                    slot: 'actions',
                    headerClass: 'text-center',
                    cellClass: 'text-center'
                });

                // 触发变更检测
                this.cdr.detectChanges();
            }
        }
    }

    // 使用当前选择的时间范围加载趋势数据
    protected loadTrendingData() {
        if (!this.indexName) return;
        this.chartLoading = true;

        const endTime = this.currentTimeRange?.endTime?.getTime() || Date.now();
        const startTime = this.currentTimeRange?.startTime?.getTime() || (endTime - 24 * 60 * 60 * 1000);
        const interval = this.getTrendingInterval(this.currentTimeRange?.value || '24h');

        this.http.get<any[]>(`${environment.apiUrl}/es/trending`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: this.indexName,
                interval: interval
            }
        }).subscribe({
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

    // 使用当前时间范围加载表格数据
    protected loadData() {
        if (!this.indexName) return;
        this.loading = true;
        const rangeEnd = this.selectedEndTime ?? this.currentTimeRange?.endTime?.getTime() ?? Date.now();
        const rangeStart = this.selectedStartTime ?? this.currentTimeRange?.startTime?.getTime() ?? (rangeEnd - 24 * 60 * 60 * 1000);

        this.http.get<any>(`${environment.apiUrl}/es/query`, {
            params: {
                startTime: rangeStart.toString(),
                endTime: rangeEnd.toString(),
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

    // 根据选择的时间范围值决定聚合间隔
    private getTrendingInterval(rangeValue: string): string {
        switch (rangeValue) {
            case '1h':
                return '5m';
            case '6h':
                return '15m';
            case '12h':
                return '30m';
            case '24h':
                return '1h';
            case '7d':
                return '6h';
            default:
                return '1h';
        }
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
                        if (isIpAlias(key) || isIpvXLike(value)) {
                            updated[key] = this.resolveIpToAsset(value);
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

        // 只有当配置了真实数据源时才重新加载
        if (this.protocolName && this.indexName) {
            this.loadData();
        }
    }

    onPageChange(event: any) {
        if (this.currentPage !== event) {
            this.currentPage = event;
            // 只有当配置了真实数据源时才重新加载
            if (this.protocolName && this.indexName) {
                this.loadData();
            }
        }
    }

    onPageSizeChange(event: any) {
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
        this.sortField = event.column;
        this.sortOrder = event.direction;
        this.currentPage = 1;
        // 只有当配置了真实数据源时才重新加载
        if (this.protocolName && this.indexName) {
            this.loadData();
        }
    }

    onSearchChange(event: any) {
        if (this.search !== event) {
            this.search = event;
            this.currentPage = 1;
            // 只有当配置了真实数据源时才重新加载
            if (this.protocolName && this.indexName) {
                this.loadData();
            }
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

        // 构建详细的提示词
        const prompt = this.buildAiPrompt(rowData);

        // 等待模态框渲染完成后再开始流式请求
        setTimeout(() => {
            this.scrollToBottom();
            this.callAiStream(prompt);
        }, 100);
    }

    private buildAiPrompt(rowData: any): string {
        const protocol = this.protocolName || rowData.protocol || '网络';
        const dataStr = JSON.stringify(rowData, null, 2);

        // 构建字段说明文档
        let fieldDocumentation = '';
        console.log(this.fieldDescriptions);
        if (this.fieldDescriptions && this.fieldDescriptions.length > 0) {
            fieldDocumentation = '\n\n字段说明文档：\n';
            this.fieldDescriptions.forEach((field, index) => {
                console.log(`字段 ${index + 1}:`, field);
                fieldDocumentation += `${index + 1}. ${field.keyAlias}:\n`;
                fieldDocumentation += `   - 说明: ${field.description || '无描述'}\n`;
                fieldDocumentation += '\n';
            });
        }
        console.log('构建的字段说明文档:', fieldDocumentation);
        return `请分析以下${protocol}协议的网络流量数据，并提供详细的解释说明：

数据内容：
${dataStr}${fieldDocumentation}

请从以下几个方面进行分析：
1. 数据包的基本信息解读（源IP、目标IP、端口等）
2. 协议特定字段的含义和作用（结合字段说明文档进行详细解释）
3. 可能的安全风险或异常情况识别
4. 网络性能相关的观察（延迟、吞吐量等）
5. 地理位置和运营商信息分析
6. 建议的后续处理措施或优化建议

请用中文回答，并保持专业性和准确性。在解释字段时，请参考上面提供的字段说明文档。如果发现任何异常或可疑的模式，请特别指出。`;
    }

    private callAiStream(prompt: string) {
        // 使用fetch进行流式请求
        fetch(`${environment.apiUrl}/ai/generate/prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('无法获取响应流');
            }

            const decoder = new TextDecoder();

            const readStream = () => {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        this.aiLoading = false;
                        this.cdr.detectChanges();
                        return;
                    }

                    // 解码数据块
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    lines.forEach(line => {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                if (data.response) {
                                    // 处理特殊的AI响应格式
                                    let content = data.response;
                                    // 过滤掉<think>标签内容
                                    if (content.includes('<think>') || content.includes('</think>')) {
                                        return;
                                    }
                                    this.aiContent += content;
                                    this.cdr.detectChanges();
                                    // 自动滚动到底部
                                    this.scrollToBottom();
                                }
                                if (data.done) {
                                    this.aiLoading = false;
                                    this.cdr.detectChanges();
                                    // 完成时也滚动到底部
                                    this.scrollToBottom();
                                    return;
                                }
                            } catch (e) {
                                // 如果不是JSON格式，可能是错误信息
                                if (line.includes('error')) {
                                    try {
                                        const errorData = JSON.parse(line);
                                        if (errorData.error) {
                                            this.aiContent = `错误: ${errorData.error}`;
                                            this.aiLoading = false;
                                            this.cdr.detectChanges();
                                            this.scrollToBottom();
                                            return;
                                        }
                                    } catch (parseError) {
                                        // 忽略解析错误
                                    }
                                }
                                // 忽略其他解析错误，继续处理下一行
                                console.debug('解析AI响应时出错:', e, '原始内容:', line);
                            }
                        }
                    });

                    // 继续读取下一个数据块
                    readStream();
                }).catch(error => {
                    console.error('读取流时出错:', error);
                    this.aiContent = '读取AI响应时出现错误，请重试。';
                    this.aiLoading = false;
                    this.cdr.detectChanges();
                    this.scrollToBottom();
                });
            };

            readStream();
        })
        .catch(error => {
            console.error('AI请求失败:', error);
            this.aiContent = '抱歉，AI分析服务暂时不可用，请稍后重试。\n\n错误详情: ' + error.message;
            this.aiLoading = false;
            this.cdr.detectChanges();
            this.scrollToBottom();
        });
    }

    closeAiModal() {
        this.showAiModal = false;
        this.aiContent = '';
        this.currentRowData = null;
    }

    // 自动滚动到AI内容区域底部
    private scrollToBottom() {
        // 使用setTimeout确保DOM已更新
        setTimeout(() => {
            if (this.aiModalContent && this.aiModalContent.nativeElement) {
                const element = this.aiModalContent.nativeElement;
                element.scrollTop = element.scrollHeight;
            }
        }, 0);
    }

    // 滚动到AI内容区域顶部（初始化时使用）
    private scrollToTop() {
        setTimeout(() => {
            if (this.aiModalContent && this.aiModalContent.nativeElement) {
                const element = this.aiModalContent.nativeElement;
                element.scrollTop = 0;
            }
        }, 0);
    }

    // 设置字段描述信息，供子组件调用
    protected setFieldDescriptions(descriptions: any[]) {
        this.fieldDescriptions = descriptions;
        console.log('字段描述信息已设置:', this.fieldDescriptions);
    }

    // 加载资产列表并建立 IP->资产名 映射
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
            error: (err) => {
                console.debug('加载资产映射失败（不影响表格渲染）:', err);
            }
        });
    }

    // 从 "1.2.3.4:443" 中提取纯 IP 或直接返回 IP
    private extractIp(value: any): string {
        const raw = (value ?? '').toString().trim();
        if (!raw) return '';
        // 常见格式: ip:port 或 [ipv6]:port
        if (raw.includes(':') && !raw.includes('.')) {
            // 可能是 IPv6 或仅仅带端口，简单处理为去掉最后一个冒号后的端口
            const last = raw.lastIndexOf(':');
            if (last > 0) return raw.substring(0, last).replace(/^\[|\]$/g, '');
        }
        if (raw.includes(':')) {
            return raw.split(':')[0];
        }
        return raw.replace(/^\[|\]$/g, '');
    }

    // 将 IP 解析为资产名；若未命中则返回原 IP
    resolveIpToAsset(value: any): string {
        const ip = this.extractIp(value);
        if (!ip) return value ?? '';
        const hit = this.assetMap.get(ip);
        return hit?.asset_name || value;
    }
}
