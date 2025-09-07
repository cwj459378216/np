import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { GridsterConfig, GridsterItem, GridsterItemComponentInterface } from 'angular-gridster2';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

// 首先定义 GridsterItem 接口
interface CustomGridsterItem extends GridsterItem {
    uniqueId: string;
    id: string;
    type: string;
    chartType?: string;
    chartConfig?: any;
    titles?: string[];
    aggregation?: {
        field: string;
        type: string;
    };
    tableData?: any[];  // 添加表格数据字段
}

// 添加 ECharts 实例接口
interface EChartsInstance {
    getOption: () => any;
    setOption: (option: any) => void;
    resize: () => void;
    dispose: () => void;
}

interface EChartsInstances {
    [key: string]: EChartsInstance;
}

interface FormData {
    name: string;
    type: 'line' | 'bar' | 'pie' | 'table' | '';  // 限制类型选项
    chartType?: string;
    index: string;
    filter: string;
    aggregationField: string;
    aggregationType: string;
    metricField?: string; // For pie charts with non-count aggregations
    xField?: string; // metric (count / agg value)
    yField?: string; // dimension (time/date or category)
}

interface WidgetFilter {
    field: string;
    operator: 'exists' | 'not_exists' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
    value?: string;
}

@Component({
    selector: 'app-add',
    templateUrl: './add.component.html',
    encapsulation: ViewEncapsulation.None
})
export class AddComponent implements OnInit {
    dashboard: Array<CustomGridsterItem> = [];
    options: GridsterConfig = {};
    echartsInstances: EChartsInstances = {};

    // 表单相关
    name: string = '';
    description: string = '';
    tableData = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'johndoe@yahoo.com' },
        { id: 2, firstName: 'Andy', lastName: 'King', email: 'andyking@gmail.com' },
        { id: 3, firstName: 'Lisa', lastName: 'Doe', email: 'lisadoe@yahoo.com' },
        { id: 4, firstName: 'Vincent', lastName: 'Carpenter', email: 'vinnyc@yahoo.com' },
    ];

    // 下拉选项数据
    indexList: Array<{value: string; label: string}> = [];
    filterFields: Array<{ value: string; label: string; type?: string }> = [];
    aggregationFields: Array<{ value: string; label: string }> = [];
    categoryFields: Array<{ value: string; label: string }> = []; // For pie chart category fields (text types)
    dateFields: Array<{ value: string; label: string }> = [];
    yAxisCandidates: Array<{ value: string; label: string }> = [];

    titleOptions = [
        { value: 'id', label: 'Id' },
        { value: 'email', label: 'Email' },
        { value: 'lastName', label: 'LastName' },
        { value: 'firstName', label: 'FirstName' }
    ];

    aggregationTypes = [
        { value: 'sum', label: 'Sum' },
        { value: 'avg', label: 'Average' },
        { value: 'count', label: 'Count' },
        { value: 'min', label: 'Min' },
        { value: 'max', label: 'Max' }
    ];

    @ViewChild('addChartModal') addChartModal: any;
    @ViewChild('widgetFormRef') widgetFormRef: any;

    // 表单数据
    formData: FormData = {
        name: '',
        type: '',
        chartType: '',
        index: '',
        filter: '',
        aggregationField: '',
        aggregationType: '',
        xField: '',
        yField: ''
    };

    filters: WidgetFilter[] = [];
    selectedTitles: string[] = [];

    filterOperators = [
        { value: 'exists', label: 'Exists' },
        { value: 'not_exists', label: 'Not Exists' },
        { value: 'eq', label: '=' },
        { value: 'neq', label: '!=' },
        { value: 'gt', label: '>' },
        { value: 'gte', label: '>=' },
        { value: 'lt', label: '<' },
        { value: 'lte', label: '<=' }
    ];

    constructor(
        private http: HttpClient,
        private router: Router,
        private translate: TranslateService
    ) {}

    ngOnInit() {
        this.dashboard = [];
        this.initializeGridsterOptions();
        this.loadIndices();
    }

    loadIndices() {
        this.http.get<string[]>(`${environment.apiUrl}/es/indices`).subscribe({
            next: (indices) => {
                this.indexList = indices.map(i => ({ value: i, label: i }));
            },
            error: () => {}
        });
    }

    onIndexChange() {
        if (!this.formData.index) {
            this.filterFields = [];
            this.aggregationFields = [];
            this.categoryFields = [];
            this.dateFields = [];
            this.yAxisCandidates = [];
            return;
        }
        
        // Load all fields for filter fields and y-axis candidates
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields`).subscribe({
            next: (fields) => {
                console.log('Loaded fields for index:', this.formData.index, fields);
                const options = fields.map(f => ({ value: f.name, label: f.name, type: f.type }));
                this.filterFields = options;
                this.dateFields = options.filter(o => o.type === 'date');
                // y-axis candidates: date fields first (time series) then keyword (category)
                const keywordFields = options.filter(o => o.type === 'keyword');
                this.yAxisCandidates = [...this.dateFields, ...keywordFields].map(o => ({ value: o.value, label: o.label }));
                console.log('yAxisCandidates:', this.yAxisCandidates);
                
                // default selections
                if (!this.formData.yField && this.yAxisCandidates.length) {
                    this.formData.yField = this.yAxisCandidates[0].value;
                }
                if (!this.formData.aggregationType) this.formData.aggregationType = 'count';
            },
            error: () => {}
        });
        
        // Load numeric fields specifically for aggregation (Metric Field)
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields/filtered?fieldType=numeric`).subscribe({
            next: (numericFields) => {
                console.log('Loaded numeric fields for aggregation:', numericFields);
                this.aggregationFields = numericFields.map(f => ({ value: f.name, label: f.name }));
                console.log('aggregationFields (numeric only):', this.aggregationFields);
            },
            error: (err) => {
                console.error('Failed to load numeric fields:', err);
                // Fallback to client-side filtering if the new API is not available
                this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields`).subscribe({
                    next: (fields) => {
                        const aggAllowed = ['integer','long','short','byte','double','float','half_float','scaled_float','unsigned_long'];
                        this.aggregationFields = fields.filter(f => aggAllowed.includes(f.type)).map(f => ({ value: f.name, label: f.name }));
                        console.log('aggregationFields (fallback):', this.aggregationFields);
                    },
                    error: () => {}
                });
            }
        });
        
        // Load text fields specifically for pie chart categories
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields/filtered?fieldType=text`).subscribe({
            next: (textFields) => {
                console.log('Loaded text fields for pie categories:', textFields);
                this.categoryFields = textFields.map(f => ({ value: f.name, label: f.name }));
                console.log('categoryFields (text only):', this.categoryFields);
            },
            error: (err) => {
                console.error('Failed to load text fields:', err);
                // Fallback to client-side filtering if the new API is not available
                this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields`).subscribe({
                    next: (fields) => {
                        const textAllowed = ['text', 'keyword', 'constant_keyword', 'wildcard'];
                        this.categoryFields = fields.filter(f => textAllowed.includes(f.type)).map(f => ({ value: f.name, label: f.name }));
                        console.log('categoryFields (fallback):', this.categoryFields);
                    },
                    error: () => {}
                });
            }
        });
    }

    // 添加新的图表或表格
    openAddChartModal() {
        // 重置表单数据
        this.formData = {
            name: '',
            type: '',
            chartType: '',
            index: '',
            filter: '',
            aggregationField: '',
            aggregationType: 'count',
            xField: 'count',
            yField: ''
        };
        this.filters = [{ field: '', operator: 'eq', value: '' }];
        this.selectedTitles = [];
        this.addChartModal.open();
    }

    // 处理添加图表的提交
    addWidget() {
        if (!this.formData.type) {
            this.translate.get('Please select widget type').subscribe(message => {
                this.showMessage(message, 'error');
            });
            return;
        }
        if ((this.formData.type === 'line' || this.formData.type === 'bar') && !this.formData.yField) {
            this.translate.get('Please select Y Axis Field').subscribe(msg => this.showMessage(msg, 'error'));
            return;
        }
        
        // Validate pie chart requirements
        if (this.formData.type === 'pie') {
            if (!this.formData.aggregationField) {
                this.translate.get('Please select Category Field for pie chart').subscribe(msg => this.showMessage(msg, 'error'));
                return;
            }
            if (this.formData.aggregationType && this.formData.aggregationType !== 'count' && !this.formData.metricField) {
                this.translate.get('Please select Metric Field for non-count aggregation').subscribe(msg => this.showMessage(msg, 'error'));
                return;
            }
        }

        // Debug log form data
        console.log('Adding widget with formData:', this.formData);
        console.log('aggregationField=', this.formData.aggregationField);
        console.log('yField=', this.formData.yField);

        const uniqueId = `${this.formData.type}_${new Date().getTime()}`;
        let newItem: CustomGridsterItem;

        switch (this.formData.type) {
            case 'line':
            case 'bar':
            case 'pie':
                newItem = {
                    cols: 3, rows: 3, y: 0, x: 0,
                    type: 'chart', chartType: this.formData.type,
                    uniqueId, id: uniqueId,
                    chartConfig: this.buildBaseChartConfig(this.formData.name || uniqueId),
                    filters: this.filters, index: this.formData.index,
                    aggregation: { field: this.formData.aggregationField, type: this.formData.aggregationType || 'count' },
                    metricField: this.formData.metricField, // Add metricField for pie charts
                    xField: this.formData.xField, yField: this.formData.yField,
                    name: this.formData.name
                } as any;
                break;

            case 'table':
                newItem = {
                    cols: 6, rows: 3, y: 0, x: 0,
                    type: 'table', uniqueId, id: uniqueId,
                    titles: this.selectedTitles,
                    aggregation: { field: this.formData.aggregationField, type: this.formData.aggregationType },
                    filters: this.filters, index: this.formData.index,
                    name: this.formData.name
                } as any;
                break;

            default:
                this.translate.get('Invalid widget type').subscribe(message => {
                    this.showMessage(message, 'error');
                });
                return;
        }

        this.dashboard.push(newItem);
        this.addChartModal.close();
        // load data from backend
        this.loadWidgetData(newItem);
    }

    private buildBaseChartConfig(title: string) {
        return {
            title: { text: title },
            tooltip: { trigger: 'axis' },
            legend: { data: ['Data'] },
            xAxis: { type: 'category', data: [] },
            yAxis: { type: 'value' },
            series: [{ name: 'Data', type: 'line', data: [] }]
        };
    }

    private loadWidgetData(item: CustomGridsterItem) {
        const req: any = {
            index: (item as any).index,
            widgetType: item.chartType || item.type,
            aggregationField: item.aggregation?.field || '',
            aggregationType: item.aggregation?.type || 'count',
            metricField: (item as any).metricField || '', // Add metricField for pie charts
            filters: (item as any).filters || [],
            yField: (item as any).yField || ''  // Add yField to request
        };
        
        // Debug log request
        console.log('Sending widget query request:', req);
        
        this.http.post(`${environment.apiUrl}/es/widget/query`, req).subscribe({
            next: (res: any) => {
                if (item.type === 'chart') {
                    if (item.chartType === 'line' || item.chartType === 'bar') {
                        const x: any[] = res.x || [];
                        const y: any[] = res.y || [];
                        let categories: string[];
                        
                        // Check if this is a category-based chart or time-based chart
                        if (res.chartType === 'category') {
                            // For category charts, x contains category names directly
                            categories = x.map(v => String(v));
                        } else {
                            // For time charts, x contains timestamps that need formatting
                            categories = x.map(v => new Date(v).toLocaleString());
                        }
                        
                        item.chartConfig = {
                            title: { text: item['name'] || item.uniqueId },
                            tooltip: { trigger: 'axis' },
                            xAxis: { type: 'category', data: categories },
                            yAxis: { type: 'value' },
                            series: [{ name: req.aggregationType, type: item.chartType, data: y }]
                        };
                    } else if (item.chartType === 'pie') {
                        const labels: string[] = res.labels || [];
                        const values: number[] = res.values || [];
                        item.chartConfig = {
                            title: { text: item['name'] || item.uniqueId },
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
                    (item as any).tableData = res.data || [];
                }
            },
            error: () => {
                this.translate.get('Load data failed').subscribe(msg => this.showMessage(msg, 'error'));
            }
        });
    }

    initializeGridsterOptions() {
        this.options = {
            gridType: 'fit',
            displayGrid: 'always',
            margin: 10,
            outerMargin: true,
            pushItems: true,
            draggable: {
                enabled: true
            },
            resizable: {
                enabled: true
            },
            minCols: 12,
            maxCols: 12,
            minRows: 12,
            maxRows: 12,
            fixedColWidth: 100,
            fixedRowHeight: 100
        };
    }

    removeWidget(item: CustomGridsterItem) {
        if (this.echartsInstances[item.uniqueId]) {
            this.echartsInstances[item.uniqueId].dispose();
            delete this.echartsInstances[item.uniqueId];
        }
        this.dashboard = this.dashboard.filter(widget => widget.uniqueId !== item.uniqueId);
    }

    onChartInit(ec: any, item: CustomGridsterItem) {
        this.echartsInstances[item.uniqueId] = ec;
    }

    trackByFn(index: number, item: CustomGridsterItem): string {
        return `${item.uniqueId}_${item.type}_${item.chartType}`;
    }

    addFilter() {
        this.filters.push({ field: '', operator: 'eq', value: '' });
    }

    requiresValue(op: string): boolean {
        return !['exists', 'not_exists'].includes(op);
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1);
        if (this.filters.length === 0) {
            this.filters.push({ field: '', operator: 'eq', value: '' });
        }
    }

    private generateChartConfig(chartType: string) {
        // legacy placeholder no longer used for final rendering
        return this.buildBaseChartConfig(this.formData.name || 'Chart');
    }

    saveTemplate() {
        if (!this.name.trim()) {
            this.translate.get('Please enter template name').subscribe(message => {
                this.showMessage(message, 'error');
            });
            return;
        }

        // 处理表格数据
        const dashboardWithData = this.dashboard.map(item => {
            if (item.type === 'table') {
                return {
                    ...item,
                    tableData: this.tableData
                };
            }
            return item;
        });

        // 获取当前的 gridster 配置
        const currentOptions = {
            ...this.options,
            minCols: this.options.minCols || 12,
            maxCols: this.options.maxCols || 12,
            minRows: this.options.minRows || 12,
            maxRows: this.options.maxRows || 12,
            gridType: this.options.gridType || 'fit',
            fixedColWidth: this.options.fixedColWidth,
            fixedRowHeight: this.options.fixedRowHeight,
            margin: this.options.margin || 10,
            outerMargin: this.options.outerMargin !== undefined ? this.options.outerMargin : true,
            displayGrid: this.options.displayGrid || 'always',
            pushItems: this.options.pushItems !== undefined ? this.options.pushItems : true
        };

        const template = {
            name: this.name,
            description: this.description,
            content: {
                dashboard: dashboardWithData,
                options: currentOptions,  // 保存完整的 gridster 配置
                echartsOptions: Object.keys(this.echartsInstances).reduce<{[key: string]: any}>((acc, key) => {
                    acc[key] = this.echartsInstances[key].getOption();
                    return acc;
                }, {})
            },
            creator: 'Current User',
            createdAt: new Date().toISOString()
        };

        this.http.post(`${environment.apiUrl}/templates`, template).subscribe(
            () => {
                this.translate.get('Template has been saved successfully').subscribe(message => {
                    this.showMessage(message);
                });
                this.router.navigate(['/report/template/list']);
            },
            error => {
                console.error('Error saving template:', error);
                this.translate.get('Error saving template').subscribe(message => {
                    this.showMessage(message, 'error');
                });
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

    onTitlesChange(event: any) {
        // 确保标题按照预定义的顺序排序
        const orderedTitles = ['id', 'email', 'lastName', 'firstName'];
        this.selectedTitles = this.selectedTitles.sort((a, b) =>
            orderedTitles.indexOf(a.toLowerCase()) - orderedTitles.indexOf(b.toLowerCase())
        );
    }

    onYFieldChange() {
        console.log('Y Field changed to:', this.formData.yField);
    }

    onAggFieldChange() {
        console.log('Aggregation Field changed to:', this.formData.aggregationField);
    }

    getAxisPreview(): string {
        if (this.formData.type === 'pie') {
            const field = this.formData.aggregationField || 'field';
            const aggType = this.formData.aggregationType || 'count';
            return `${aggType}(${field}) by categories`;
        }
        
        if (this.formData.type === 'line' || this.formData.type === 'bar') {
            const xAxis = this.formData.yField || 'time/category';
            const yField = this.formData.aggregationField || 'count';
            const yType = this.formData.aggregationType || 'count';
            const yAxisLabel = this.formData.aggregationField ? `${yType}(${yField})` : 'count';
            return `${xAxis} vs ${yAxisLabel}`;
        }
        
        return 'Select configuration';
    }
}
