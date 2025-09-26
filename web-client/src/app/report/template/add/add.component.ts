import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { GridsterConfig, GridsterItem, GridsterItemComponentInterface } from 'angular-gridster2';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth/auth.service';

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
    topN?: number; // For table: number of records to display
    sortField?: string; // For table: field to sort by
    sortOrder?: 'asc' | 'desc'; // For table: sort order
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

    titleOptions: Array<{ value: string; label: string }> = [];  // 动态字段选项

    aggregationTypes = [
        { value: 'sum', label: 'Sum' },
        { value: 'avg', label: 'Average' },
        { value: 'count', label: 'Count' },
        { value: 'min', label: 'Min' },
        { value: 'max', label: 'Max' }
    ];

    @ViewChild('addChartModal') addChartModal: any;
    @ViewChild('editChartModal') editChartModal: any;
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
        yField: '',
        topN: 10,  // 改为10条记录，符合新的选项
        sortField: '',  // 默认使用timestamp排序
        sortOrder: 'desc'  // 默认降序
    };

    // 编辑表单数据
    editFormData: FormData = {
        name: '',
        type: '',
        chartType: '',
        index: '',
        filter: '',
        aggregationField: '',
        aggregationType: '',
        xField: '',
        yField: '',
        topN: 10,
        sortField: '',
        sortOrder: 'desc'
    };

    filters: WidgetFilter[] = [];
    editFilters: WidgetFilter[] = [];
    selectedTitles: string[] = [];
    editSelectedTitles: string[] = [];
    currentEditingWidget: CustomGridsterItem | null = null;

    filterOperators: any[] = [];

    constructor(
        private http: HttpClient,
        private router: Router,
        private translate: TranslateService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.dashboard = [];
        this.initializeGridsterOptions();
        this.initializeFilterOperators();
        this.loadIndices();

        // 监听语言变化，重新初始化翻译相关的数据
        this.translate.onLangChange.subscribe(() => {
            this.initializeFilterOperators();
        });
    }

    initializeFilterOperators() {
        this.filterOperators = [
            { value: 'exists', label: this.translate.instant('Exists') },
            { value: 'not_exists', label: this.translate.instant('Not Exists') },
            { value: 'eq', label: '=' },
            { value: 'neq', label: '!=' },
            { value: 'gt', label: '>' },
            { value: 'gte', label: '>=' },
            { value: 'lt', label: '<' },
            { value: 'lte', label: '<=' }
        ];
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
            this.titleOptions = [];  // 也清空表格字段选项
            return;
        }

        // Load all fields for filter fields and y-axis candidates
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields`).subscribe({
            next: (fields) => {
                console.log('Loaded fields for index:', this.formData.index, fields);
                const options = fields.map(f => ({ value: f.name, label: f.name, type: f.type }));
                this.filterFields = options;
                this.dateFields = options.filter(o => o.type === 'date');

                // 设置表格字段选项（所有字段都可以作为表格列）
                // 为表格添加常见的嵌套字段
                const commonNestedFields = [
                    'alert.signature', 'alert.category', 'alert.severity', 'alert.action',
                    'flow.src_ip', 'flow.dest_ip', 'flow.src_port', 'flow.dest_port',
                    'flow.bytes_toserver', 'flow.bytes_toclient'
                ];

                const allTableFields = [
                    ...options.map(o => ({ value: o.value, label: o.label })),
                    ...commonNestedFields.map(field => ({ value: field, label: this.formatTableHeader(field) }))
                ];

                this.titleOptions = allTableFields;
                console.log('titleOptions:', this.titleOptions);

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
            yField: '',
            topN: 10,  // 改为10条记录，符合新的选项
            sortField: '',  // 默认使用timestamp排序
            sortOrder: 'desc'  // 默认降序
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

        // Validate table requirements
        if (this.formData.type === 'table') {
            if (!this.formData.index) {
                this.translate.get('Please select data source index for table').subscribe(msg => this.showMessage(msg, 'error'));
                return;
            }
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
                // 如果没有选择列，默认选择前5个字段或所有字段（如果少于5个）
                const defaultTitles = this.selectedTitles && this.selectedTitles.length > 0
                    ? this.selectedTitles
                    : this.titleOptions.slice(0, Math.min(5, this.titleOptions.length)).map(opt => opt.value);

                newItem = {
                    cols: 6, rows: 3, y: 0, x: 0,
                    type: 'table', uniqueId, id: uniqueId,
                    titles: defaultTitles,
                    aggregation: { field: this.formData.aggregationField, type: this.formData.aggregationType },
                    filters: this.filters, index: this.formData.index,
                    name: this.formData.name,
                    topN: this.formData.topN || 10,  // 改为10条记录默认值
                    sortField: this.formData.sortField || '',  // 添加排序字段
                    sortOrder: this.formData.sortOrder || 'desc'  // 添加排序顺序
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
            yField: (item as any).yField || '',  // Add yField to request
            // 为表格添加额外的参数
            topN: (item as any).topN || 10,
            sortField: (item as any).sortField || '',
            sortOrder: (item as any).sortOrder || 'desc'
        };

        // Debug log request
        console.log('Sending widget query request:', req);

        this.http.post(`${environment.apiUrl}/es/widget/query`, req).subscribe({
            next: (res: any) => {
                console.log('Received response:', res); // 添加调试日志

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
            },
            error: (error) => {
                console.error('Load widget data error:', error);
                this.translate.get('Load data failed').subscribe(msg => this.showMessage(msg, 'error'));
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

    // 编辑Widget
    editWidget(item: CustomGridsterItem) {
        this.currentEditingWidget = item;

        // 确定widget类型 - 如果是图表类型，使用chartType，否则使用type
        let widgetType = '';
        if (item.type === 'chart' && item.chartType) {
            widgetType = item.chartType;
        } else if (item.type === 'table') {
            widgetType = 'table';
        } else {
            widgetType = item.type;
        }

        // 填充编辑表单数据
        this.editFormData = {
            name: (item as any).name || '',
            type: widgetType as 'line' | 'bar' | 'pie' | 'table' | '',
            chartType: item.chartType || '',
            index: (item as any).index || '',
            filter: (item as any).filter || '',
            aggregationField: item.aggregation?.field || '',
            aggregationType: item.aggregation?.type || 'count',
            metricField: (item as any).metricField || '',
            xField: (item as any).xField || '',
            yField: (item as any).yField || '',
            topN: (item as any).topN || 10,
            sortField: (item as any).sortField || '',
            sortOrder: (item as any).sortOrder || 'desc'
        };

        // 填充过滤器
        this.editFilters = (item as any).filters ? [...(item as any).filters] : [{ field: '', operator: 'eq', value: '' }];

        // 填充表格标题
        this.editSelectedTitles = item.titles ? [...item.titles] : [];

        // 如果有索引，加载相关字段
        if (this.editFormData.index) {
            this.onEditIndexChange();
        }

        this.editChartModal.open();
    }

    // 更新Widget
    updateWidget() {
        if (!this.currentEditingWidget) return;

        // 验证必填字段
        if (!this.editFormData.type) {
            this.showMessage('Please select widget type', 'error');
            return;
        }

        // 更新widget数据
        const updatedItem = this.currentEditingWidget;
        (updatedItem as any).name = this.editFormData.name;
        // 如果是图表类型，设置chartType并保持type为chart
        if (['line', 'bar', 'pie'].includes(this.editFormData.type)) {
            updatedItem.type = 'chart';
            updatedItem.chartType = this.editFormData.type;
        } else {
            updatedItem.type = this.editFormData.type;
        }
        (updatedItem as any).index = this.editFormData.index;
        (updatedItem as any).filter = this.editFormData.filter;
        updatedItem.aggregation = {
            field: this.editFormData.aggregationField,
            type: this.editFormData.aggregationType
        };
        (updatedItem as any).metricField = this.editFormData.metricField;
        (updatedItem as any).xField = this.editFormData.xField;
        (updatedItem as any).yField = this.editFormData.yField;
        (updatedItem as any).topN = this.editFormData.topN;
        (updatedItem as any).sortField = this.editFormData.sortField;
        (updatedItem as any).sortOrder = this.editFormData.sortOrder;
        (updatedItem as any).filters = this.editFilters;
        updatedItem.titles = this.editSelectedTitles;

        // 重新加载数据
        this.loadWidgetData(updatedItem);

        this.editChartModal.close();
        this.showMessage('Widget updated successfully');
    }

    // 编辑索引变更
    onEditIndexChange() {
        if (!this.editFormData.index) {
            this.filterFields = [];
            this.aggregationFields = [];
            this.categoryFields = [];
            this.dateFields = [];
            this.yAxisCandidates = [];
            this.titleOptions = [];
            return;
        }

        // 加载字段，与onIndexChange相同的逻辑
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.editFormData.index}/fields`).subscribe({
            next: (fields) => {
                console.log('Loaded fields for edit index:', this.editFormData.index, fields);
                const options = fields.map(f => ({ value: f.name, label: f.name, type: f.type }));
                this.filterFields = options;
                this.dateFields = options.filter(o => o.type === 'date');
                this.titleOptions = options.map(o => ({ value: o.value, label: o.label }));

                const keywordFields = options.filter(o => o.type === 'keyword');
                this.yAxisCandidates = [...this.dateFields, ...keywordFields].map(o => ({ value: o.value, label: o.label }));

                if (!this.editFormData.yField && this.yAxisCandidates.length) {
                    this.editFormData.yField = this.yAxisCandidates[0].value;
                }
            },
            error: () => {}
        });

        // 加载数值字段
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.editFormData.index}/fields/filtered?fieldType=numeric`).subscribe({
            next: (numericFields) => {
                this.aggregationFields = numericFields.map(f => ({ value: f.name, label: f.name }));
            },
            error: () => {}
        });

        // 加载文本字段
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.editFormData.index}/fields/filtered?fieldType=text`).subscribe({
            next: (textFields) => {
                this.categoryFields = textFields.map(f => ({ value: f.name, label: f.name }));
            },
            error: () => {}
        });
    }

    // 编辑过滤器相关方法
    addEditFilter() {
        this.editFilters.push({ field: '', operator: 'eq', value: '' });
    }

    removeEditFilter(index: number) {
        this.editFilters.splice(index, 1);
        if (this.editFilters.length === 0) {
            this.editFilters.push({ field: '', operator: 'eq', value: '' });
        }
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
            creator: this.authService.getCurrentUser()?.username || this.authService.getCurrentUser()?.name || 'Unknown User',
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

    // 编辑模式的方法
    onEditYFieldChange() {
        console.log('Edit Y Field changed to:', this.editFormData.yField);
    }

    onEditAggFieldChange() {
        console.log('Edit Aggregation Field changed to:', this.editFormData.aggregationField);
    }

    onEditWidgetTypeChange() {
        console.log('Edit Widget Type changed to:', this.editFormData.type);
        // 当widget类型改变时，可能需要重置某些配置
        if (this.editFormData.type === 'table') {
            // 如果切换到表格，清除图表相关配置
            this.editFormData.aggregationField = '';
            this.editFormData.aggregationType = 'count';
            this.editFormData.yField = '';
        } else if (['line', 'bar', 'pie'].includes(this.editFormData.type)) {
            // 如果切换到图表，清除表格相关配置
            this.editSelectedTitles = [];
        }
    }

    getEditAxisPreview(): string {
        if (this.editFormData.type === 'pie') {
            const field = this.editFormData.aggregationField || 'field';
            const aggType = this.editFormData.aggregationType || 'count';
            return `${aggType}(${field}) by categories`;
        }

        if (this.editFormData.type === 'line' || this.editFormData.type === 'bar') {
            const xAxis = this.editFormData.yField || 'time/category';
            const yField = this.editFormData.aggregationField || 'count';
            const yType = this.editFormData.aggregationType || 'count';
            const yAxisLabel = this.editFormData.aggregationField ? `${yType}(${yField})` : 'count';
            return `${xAxis} vs ${yAxisLabel}`;
        }

        return 'Select configuration';
    }
}
