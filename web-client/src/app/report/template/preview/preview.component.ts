import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GridsterConfig, GridsterItem } from 'angular-gridster2';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TemplateService } from '../../../services/template.service';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { combineLatest } from 'rxjs';

interface CustomGridsterItem extends GridsterItem {
    uniqueId: string;
    id: string;
    type: string;
    chartType?: string;
    chartConfig?: any;
    name?: string;
    index?: string;
    filter?: any;
    aggregation?: string;
    titles?: string[];
}

@Component({
    selector: 'app-preview',
    templateUrl: './preview.component.html',
    styles: [`
        :host-context(.standalone-preview) .preview-content {
            width: 100%;
            height: 100vh;
            padding: 20px;
            background: white;
        }
    `]
})
export class PreviewComponent implements OnInit {
    isStandalone = false;
    id?: string;
    startTime?: number;
    endTime?: number;
    dashboard: Array<CustomGridsterItem> = [];
    options: GridsterConfig = {};
    echartsInstances: {[key: string]: any} = {};
    private pendingWidgets = 0;

    // 表格数据
    tableData = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'johndoe@yahoo.com' },
        { id: 2, firstName: 'Andy', lastName: 'King', email: 'andyking@gmail.com' },
        { id: 3, firstName: 'Lisa', lastName: 'Doe', email: 'lisadoe@yahoo.com' },
        { id: 4, firstName: 'Vincent', lastName: 'Carpenter', email: 'vinnyc@yahoo.com' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private templateService: TemplateService,
        private translate: TranslateService
    ) {
        this.initOptions();
        this.isStandalone = this.router.url.includes('standalone/preview');
    }

    ngOnInit() {
        combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, query]) => {
            const newId = params['id'] || query['id'];

            // 解析可选时间范围（仅在值为有效数字时生效）
            const stRaw = query['startTime'];
            const etRaw = query['endTime'];
            const stParsed = (stRaw !== undefined && stRaw !== null && stRaw !== '') ? parseInt(stRaw, 10) : undefined;
            const etParsed = (etRaw !== undefined && etRaw !== null && etRaw !== '') ? parseInt(etRaw, 10) : undefined;
            const newStart = (stParsed !== undefined && Number.isFinite(stParsed)) ? stParsed : undefined;
            const newEnd = (etParsed !== undefined && Number.isFinite(etParsed)) ? etParsed : undefined;

            const idChanged = newId !== this.id;
            const timeChanged = newStart !== this.startTime || newEnd !== this.endTime;

            this.id = newId;
            this.startTime = newStart;
            this.endTime = newEnd;

            // 调试日志
            console.debug('Preview params:', { id: this.id, startTime: this.startTime, endTime: this.endTime });

            if (!this.id) return;

            if (idChanged || this.dashboard.length === 0) {
                this.loadTemplate();
            } else if (timeChanged) {
                // 仅时间变化时，重新加载每个 widget 的数据
                this.dashboard.forEach(item => this.loadWidgetData(item));
            }
        });
    }

    initOptions() {
        this.options = {
            gridType: 'fit',
            displayGrid: 'always',
            margin: 10,
            outerMargin: true,
            draggable: {
                enabled: false
            },
            resizable: {
                enabled: false
            },
            pushItems: true,
            minCols: 12,
            maxCols: 12,
            minRows: 12,
            maxRows: 12,
            itemChangeCallback: (item: GridsterItem) => {
                this.resizeChart(item);
            },
            itemResizeCallback: (item: GridsterItem) => {
                this.resizeChart(item);
            }
        };
    }

    resizeChart(item: any) {
        const chartElement = document.getElementById(`chart_${item.uniqueId}`);
        if (chartElement && this.echartsInstances[item.uniqueId]) {
            setTimeout(() => {
                this.echartsInstances[item.uniqueId].resize();
            });
        }
    }

    trackByFn(index: number, item: CustomGridsterItem): string {
        return `${item.uniqueId}_${item.type}_${item.chartType}`;
    }

    onChartInit(ec: any, item: CustomGridsterItem) {
        this.echartsInstances[item.uniqueId] = ec;
    }

    loadTemplate() {
        this.http.get(`${environment.apiUrl}/templates/${this.id}`).subscribe(
            (template: any) => {
                const content = typeof template.content === 'string'
                    ? JSON.parse(template.content)
                    : template.content;

                if (content.dashboard) {
                    (window as any).__reportError__ = false;
                    this.dashboard = content.dashboard.map((item: CustomGridsterItem) => ({
                        ...item,
                        x: item.x,
                        y: item.y,
                        cols: item.cols,
                        rows: item.rows
                    }));

                    // 为每个 widget 加载数据
                    this.pendingWidgets = this.dashboard.length;
                    (window as any).__reportReady__ = false;
                    if (this.pendingWidgets === 0) {
                        // 无控件，直接标记渲染完成
                        setTimeout(() => {
                            (window as any).__reportReady__ = true;
                            console.debug('Preview render complete (no widgets)');
                        }, 100);
                    } else {
                        this.dashboard.forEach(item => {
                            this.loadWidgetData(item);
                        });
                    }
                }

                if (content.options) {
                    this.options = {
                        ...content.options,
                        draggable: {
                            enabled: false
                        },
                        resizable: {
                            enabled: false
                        }
                    };
                }

                if (content.echartsOptions) {
                    setTimeout(() => {
                        Object.keys(content.echartsOptions).forEach(key => {
                            if (this.echartsInstances[key]) {
                                this.echartsInstances[key].setOption(content.echartsOptions[key]);
                            }
                        });
                    });
                }
            },
            error => {
                console.error('Error loading template:', error);
                this.translate.get('Error loading template').subscribe(message => {
                    this.showMessage(message, 'error');
                });
                // 避免 PDF 生成端无限等待
                setTimeout(() => {
                    (window as any).__reportError__ = true;
                    (window as any).__reportReady__ = true;
                    console.debug('Template load failed: __reportReady__=true');
                }, 200);
            }
        );
    }

    showMessage(msg = '', type = 'success') {
        const toast: any = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 3000,
            customClass: { container: 'toast' },
        });
        toast.fire({
            icon: type,
            title: msg,
            padding: '10px 20px',
        });
    }

    // 添加打印方法
    printTemplate() {
        window.print();
    }

    // 获取表格的列标题
    getTableHeaders(item: CustomGridsterItem): string[] {
        // 如果有定义的标题，使用定义的标题
        if (item.titles && item.titles.length > 0) {
            return item.titles;
        }

        // 如果有表格数据，使用表格数据的字段作为标题
        if ((item as any).tableData && (item as any).tableData.length > 0) {
            return Object.keys((item as any).tableData[0]);
        }

        // 默认列顺序
        return ['id', 'email', 'lastName', 'firstName'];
    }

    // 加载 widget 数据
    private loadWidgetData(item: CustomGridsterItem) {
    const req: any = {
            index: (item as any).index,
            widgetType: item.chartType || item.type,
            aggregationField: (item as any).aggregation?.field || '',
            aggregationType: (item as any).aggregation?.type || 'count',
            metricField: (item as any).metricField || '',
            filters: (item as any).filters || [],
            yField: (item as any).yField || '',
            topN: (item as any).topN || 100,
            sortField: (item as any).sortField || '',
            sortOrder: (item as any).sortOrder || 'desc'
        };

        // 追加时间范围（可选）
        if (this.startTime !== undefined && Number.isFinite(this.startTime)) {
            req.startTime = this.startTime;
        }
        if (this.endTime !== undefined && Number.isFinite(this.endTime)) {
            req.endTime = this.endTime;
        }

        console.log('Sending widget query request:', req);

    this.http.post(`${environment.apiUrl}/es/widget/query`, req).subscribe({
            next: (res: any) => {
                if (item.type === 'chart') {
                    if (item.chartType === 'line' || item.chartType === 'bar') {
                        const x: any[] = res.x || [];
                        const y: any[] = res.y || [];
                        let categories: string[];

                        if (res.chartType === 'category') {
                            categories = x.map(v => String(v));
                        } else {
                            categories = x.map(v => new Date(v).toLocaleString());
                        }

                        item.chartConfig = {
                            tooltip: { trigger: 'axis' },
                            xAxis: { type: 'category', data: categories },
                            yAxis: { type: 'value' },
                            series: [{ name: req.aggregationType, type: item.chartType, data: y }]
                        };
                    } else if (item.chartType === 'pie') {
                        const labels: string[] = res.labels || [];
                        const values: number[] = res.values || [];
                        item.chartConfig = {
                            tooltip: { trigger: 'item' },
                            legend: { orient: 'vertical', left: 'left' },
                            series: [{
                                type: 'pie',
                                radius: '60%',
                                data: labels.map((l, i) => ({ name: l, value: values[i] })),
                                emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }
                            }]
                        };
                    }
                } else if (item.type === 'table') {
                    // 确保表格数据正确设置
                    const tableData = res.data || [];
                    (item as any).tableData = tableData;

                    console.log('Table data set:', tableData);
                    console.log('Table total records:', res.total);
                    console.log('Table columns to display:', item.titles);

                    // 如果没有设置列标题，使用数据的键作为默认列
                    if (!item.titles || item.titles.length === 0) {
                        if (tableData.length > 0) {
                            // 从第一行数据中提取字段名，包括嵌套字段
                            const firstRow = tableData[0];
                            const allFields = this.extractAllFields(firstRow);

                            // 选择前5个字段作为默认列
                            item.titles = allFields.slice(0, 5);
                            console.log('Auto-selected table columns:', item.titles);
                        }
                    }
                }
                // 每个 widget 完成后递减计数
                this.pendingWidgets = Math.max(0, this.pendingWidgets - 1);
                if (this.pendingWidgets === 0) {
                    // 略等一帧，确保 ECharts 完成渲染
                    setTimeout(() => {
                        (window as any).__reportReady__ = true;
                        console.debug('Preview render complete: __reportReady__=true');
                    }, 200);
                }
            },
            error: (error) => {
                console.error('Error loading widget data:', error);
                this.translate.get('Load data failed').subscribe(msg => this.showMessage(msg, 'error'));
                // 出错也要推进，避免永远不就绪
                this.pendingWidgets = Math.max(0, this.pendingWidgets - 1);
                if (this.pendingWidgets === 0) {
                    setTimeout(() => {
                        (window as any).__reportReady__ = true;
                        console.debug('Preview render complete with errors: __reportReady__=true');
                    }, 200);
                }
            }
        });
    }

    // 提取对象的所有字段路径（包括嵌套字段）
    private extractAllFields(obj: any, prefix: string = ''): string[] {
        const fields: string[] = [];

        if (!obj || typeof obj !== 'object') {
            return fields;
        }

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const fullPath = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];

                if (value === null || value === undefined) {
                    fields.push(fullPath);
                } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                    // 递归处理嵌套对象，但限制深度
                    if (prefix.split('.').length < 2) { // 限制最多2层嵌套
                        fields.push(...this.extractAllFields(value, fullPath));
                    }
                    // 也添加对象本身的路径
                    fields.push(fullPath);
                } else {
                    fields.push(fullPath);
                }
            }
        }

        return fields;
    }

    // 获取数据属性名
    getDataField(header: string): string {
        // 直接使用标题作为属性名，因为它们经是正确的格式了
        return header;
    }

    // 计算需要的网格大小
    private calculateGridSize(dashboard: CustomGridsterItem[]): { cols: number; rows: number } {
        let maxCols = 0;
        let maxRows = 0;

        dashboard.forEach(item => {
            // 计算每个项目占用的最大列数和行数
            const itemEndCol = (item.x || 0) + (item.cols || 0);
            const itemEndRow = (item.y || 0) + (item.rows || 0);

            maxCols = Math.max(maxCols, itemEndCol);
            maxRows = Math.max(maxRows, itemEndRow);
        });

        // 确保至少有最小的网格大小
        return {
            cols: Math.max(maxCols, 12),  // 最小 12 列
            rows: Math.max(maxRows, 12)   // 最小 12 行
        };
    }

    // 添加导出PDF方法
    exportPdf() {
        if (!this.id) return;

        Swal.fire({
            title: '正在生成PDF...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

    this.templateService.exportPdf(Number(this.id), this.startTime, this.endTime)
            .subscribe({
                next: (blob: Blob) => {
                    // 创建下载链接
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `template-${this.id}-${new Date().getTime()}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);

                    Swal.close();
                    this.translate.get('PDF generated successfully').subscribe(message => {
                        this.showMessage(message, 'success');
                    });
                },
                error: (error) => {
                    Swal.close();
                    this.translate.get('Error generating PDF').subscribe(message => {
                        this.showMessage(message, 'error');
                    });
                    console.error('PDF generation error:', error);
                }
            });
    }

    // 获取嵌套对象的值
    getNestedValue(obj: any, path: string): any {
        if (!obj || !path) {
            return '';
        }

        // 如果不是嵌套路径，直接返回
        if (!path.includes('.')) {
            return obj[path];
        }

        // 处理嵌套路径
        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current && typeof current === 'object' && current[part] !== undefined) {
                current = current[part];
            } else {
                return '';
            }
        }

        return current;
    }

    // 格式化表格单元格值
    formatTableCellValue(row: any, fieldName: string): string {
        // 使用嵌套值获取方法
        const value = this.getNestedValue(row, fieldName);

        if (value === null || value === undefined) {
            return '';
        }

        // 特殊处理 timestamp 字段
        if (fieldName && (fieldName.toLowerCase() === 'timestamp' || fieldName.toLowerCase().includes('time'))) {
            // 如果是时间戳（数字且大于某个阈值，比如2000年以后）
            if (typeof value === 'number' && value > 946684800000) {
                return new Date(value).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
            // 如果是 ISO 字符串格式
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                return new Date(value).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        }

        // 如果是时间戳（数字且大于某个阈值，比如2000年以后）
        if (typeof value === 'number' && value > 946684800000) {
            return new Date(value).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        // 如果是数组，显示数组长度或第一个元素
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '';
            } else if (value.length === 1) {
                return String(value[0]);
            } else {
                return `${value[0]} (+${value.length - 1} more)`;
            }
        }

        // 如果是对象，转换为简化的JSON字符串
        if (typeof value === 'object') {
            try {
                // 对于小对象，显示关键信息
                if (Object.keys(value).length <= 3) {
                    return JSON.stringify(value);
                } else {
                    // 对于大对象，只显示前几个属性
                    const keys = Object.keys(value).slice(0, 2);
                    const simplified = keys.reduce((acc: any, key) => {
                        acc[key] = value[key];
                        return acc;
                    }, {});
                    return JSON.stringify(simplified) + '...';
                }
            } catch (e) {
                return '[Object]';
            }
        }

        return String(value);
    }

    // 格式化表格标题
    formatTableHeader(header: string): string {
        if (!header) {
            return '';
        }

        // 处理驼峰命名和下划线命名
        let formatted = header
            // 处理驼峰命名：在大写字母前添加空格
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            // 处理下划线：替换为空格
            .replace(/_/g, ' ')
            // 处理点号：替换为空格
            .replace(/\./g, ' ')
            // 首字母大写，其他单词首字母也大写
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        return formatted;
    }
}
