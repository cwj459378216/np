import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GridsterConfig, GridsterItem, GridsterItemComponentInterface } from 'angular-gridster2';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

interface CustomGridsterItem extends GridsterItem {
    uniqueId: string;
    id: string;
    type: string;
    chartType?: string;
    chartConfig?: any;
    name?: string;
    index?: string;
    filter?: any;
    aggregation?: {
        field: string;
        type: string;
    };
    titles?: string[];
    tableData?: any[];
}

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
    xField?: string; // metric
    yField?: string; // dimension (time/date or category)
    topN?: number;   // table: number of records
    sortField?: string;  // table: sort field
    sortOrder?: 'asc' | 'desc';  // table: sort order
}

interface WidgetFilter {
    field: string;
    operator: 'exists' | 'not_exists' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
    value?: string;
}

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    encapsulation: ViewEncapsulation.None
})
export class EditComponent implements OnInit {
    id?: string;
    // 可选时间范围（毫秒时间戳）
    private startTime?: number;
    private endTime?: number;
    dashboard: Array<CustomGridsterItem> = [];
    options: GridsterConfig = {};
    lineChart: any;
    barChart: any;
    pieChart: any;
    echartsInstances: EChartsInstances = {};

    // 表单相关
    name: string = '';
    description: string = '';
    selectedFile = null;

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
        topN: 10,
        sortField: '',
        sortOrder: 'desc'
    };

    // 下拉选项数据
    indexList: Array<{value: string, label: string}> = [];

    // 添加 aggregationList
    aggregationList = [
        { value: 'count', label: 'Count' },
        { value: 'sum', label: 'Sum' },
        { value: 'avg', label: 'Average' },
        { value: 'min', label: 'Min' },
        { value: 'max', label: 'Max' }
    ];

    // 过滤器（与 AddComponent 一致）
    filters: WidgetFilter[] = [];

    filterOperators: any[] = [];

    // 添加可选的字段列表
    filterFields = [
        { value: 'field1', label: 'Field 1' },
        { value: 'field2', label: 'Field 2' },
        { value: 'field3', label: 'Field 3' },
        { value: 'field4', label: 'Field 4' }
    ];

    // 修改标题选项
    titleOptions = [
        { value: 'id', label: 'Id' },
        { value: 'email', label: 'Email' },
        { value: 'lastName', label: 'LastName' },
        { value: 'firstName', label: 'FirstName' }
    ];

    // 选中的标题
    selectedTitles: string[] = [];

    // 编辑相关属性
    editFormData: FormData = {
        name: '',
        type: '',
        chartType: '',
        index: '',
        filter: '',
        aggregationField: '',
        aggregationType: 'count',
        xField: '',
        yField: '',
        topN: 10,
        sortField: '',
        sortOrder: 'desc'
    };
    editFilters: WidgetFilter[] = [];
    editSelectedTitles: string[] = [];
    currentEditingWidget: CustomGridsterItem | null = null;

    // 表格数据
    tableData = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'johndoe@yahoo.com' },
        { id: 2, firstName: 'Andy', lastName: 'King', email: 'andyking@gmail.com' },
        { id: 3, firstName: 'Lisa', lastName: 'Doe', email: 'lisadoe@yahoo.com' },
        { id: 4, firstName: 'Vincent', lastName: 'Carpenter', email: 'vinnyc@yahoo.com' },
    ];

    // 添加聚合字段选项
    aggregationFields = [
        { value: 'field1', label: 'Field 1' },
        { value: 'field2', label: 'Field 2' },
        { value: 'field3', label: 'Field 3' }
    ];

    // 添加聚合类型选项
    aggregationTypes = [
        { value: 'sum', label: 'Sum' },
        { value: 'avg', label: 'Average' },
        { value: 'count', label: 'Count' }
    ];

    // 添加缺失的字段属性
    categoryFields: Array<{value: string, label: string, type?: string}> = [];
    dateFields: Array<{value: string, label: string, type?: string}> = [];
    yAxisCandidates: Array<{value: string, label: string, type?: string}> = [];

    originalTemplate: any = null;  // 添加这个属性

    constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private translate: TranslateService
    ) {
        this.initCharts();
        this.initDashboard();
        this.initOptions();
    }

    ngOnInit() {
        this.initializeFilterOperators();
        this.loadIndices();

        // 监听语言变化，重新初始化翻译相关的数据
        this.translate.onLangChange.subscribe(() => {
            this.initializeFilterOperators();
        });

        this.route.queryParams.subscribe(params => {
            // 模板 id
            this.id = params['id'];
            // 解析可选时间范围
            const st = params['startTime'];
            const et = params['endTime'];
            this.startTime = (st !== undefined && st !== null && st !== '') ? Number(st) : undefined;
            this.endTime = (et !== undefined && et !== null && et !== '') ? Number(et) : undefined;

            if (this.id) {
                this.loadTemplate();
            }
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

    loadTemplate() {
        this.http.get(`${environment.apiUrl}/templates/${this.id}`).subscribe(
            (template: any) => {
                this.originalTemplate = template;  // 保存原始模板数据
                this.name = template.name;
                this.description = template.description;

                const content = typeof template.content === 'string'
                    ? JSON.parse(template.content)
                    : template.content;

                if (content.dashboard) {
                    this.dashboard = content.dashboard;
                    // 加载每个 widget 数据，应用当前 URL 时间范围（未提供则后端默认近7天）
                    this.dashboard.forEach(item => this.loadWidgetData(item));
                }

                if (content.options) {
                    // 使用保存的 gridster 配置，但保持编辑模式下的拖拽和调整大小功能
                    this.options = {
                        ...content.options,
                        draggable: {
                            enabled: true
                        },
                        resizable: {
                            enabled: true
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
                this.showMessage('Error loading template', 'error');
            }
        );
    }

    // 从 AddComponent 复制所有必要的方法
    initCharts() {
        // 折线图配置
        this.lineChart = {
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['Sales'],
                bottom: '0',
                left: 'center'
            },
            grid: {
                top: '5%',
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                name: 'Sales',
                type: 'line',
                smooth: true,
                data: [45, 55, 75, 25, 45, 110]
            }]
        };

        // 柱状图配置
        this.barChart = {
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['Sales'],
                bottom: '0',
                left: 'center'
            },
            grid: {
                top: '5%',
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                name: 'Sales',
                type: 'bar',
                data: [44, 55, 41, 67, 22, 43, 21, 70]
            }]
        };

        // 饼图配置
        this.pieChart = {
            tooltip: {
                trigger: 'item'
            },
            legend: {
                bottom: '0',
                left: 'center'
            },
            series: [{
                name: 'Teams',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    position: 'outside'
                },
                labelLine: {
                    show: true
                },
                data: [
                    { value: 44, name: 'Team A' },
                    { value: 55, name: 'Team B' },
                    { value: 13, name: 'Team C' },
                    { value: 43, name: 'Team D' },
                    { value: 22, name: 'Team E' }
                ]
            }]
        };
    }

    initDashboard() {
        // 编辑页初始不强塞示例项，由加载模板或用户添加
        this.dashboard = [];
    }

    initOptions() {
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

    resizeChart(item: any) {
        const chartElement = document.getElementById(`chart_${item.uniqueId}`);
        if (chartElement && this.echartsInstances[item.uniqueId]) {
            setTimeout(() => {
                this.echartsInstances[item.uniqueId].resize();
            });
        }
    }

    onIndexChange() {
        if (!this.formData.index) {
            this.filterFields = [];
            this.aggregationFields = [];
            this.categoryFields = [];
            this.dateFields = [];
            this.yAxisCandidates = [];
            this.titleOptions = [];
            return;
        }

        // 与 AddComponent 一致的字段加载逻辑
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields`).subscribe({
            next: (fields) => {
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

                const keywordFields = options.filter(o => o.type === 'keyword');
                this.yAxisCandidates = [...this.dateFields, ...keywordFields].map(o => ({ value: o.value, label: o.label, type: o.type }));

                if (!this.formData.yField && this.yAxisCandidates.length) {
                    this.formData.yField = this.yAxisCandidates[0].value as string;
                }
                if (!this.formData.aggregationType) this.formData.aggregationType = 'count';
            },
            error: () => {}
        });

        // 数值字段（度量）
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields/filtered?fieldType=numeric`).subscribe({
            next: (numericFields) => {
                this.aggregationFields = numericFields.map(f => ({ value: f.name, label: f.name, type: f.type }));
            },
            error: () => {
                // 回退
                this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields`).subscribe({
                    next: (fields) => {
                        const aggAllowed = ['integer','long','short','byte','double','float','half_float','scaled_float','unsigned_long'];
                        this.aggregationFields = fields.filter(f => aggAllowed.includes(f.type)).map(f => ({ value: f.name, label: f.name, type: f.type }));
                    },
                    error: () => {}
                });
            }
        });

        // 文本字段（饼图分类）
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields/filtered?fieldType=text`).subscribe({
            next: (textFields) => {
                this.categoryFields = textFields.map(f => ({ value: f.name, label: f.name, type: f.type }));
            },
            error: () => {
                // 回退
                this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.formData.index}/fields`).subscribe({
                    next: (fields) => {
                        const textAllowed = ['text', 'keyword', 'constant_keyword', 'wildcard'];
                        this.categoryFields = fields.filter(f => textAllowed.includes(f.type)).map(f => ({ value: f.name, label: f.name, type: f.type }));
                    },
                    error: () => {}
                });
            }
        });
    }

    openAddChartModal() {
        // 重置表单数据，保持与 AddComponent 一致
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
            topN: 10,
            sortField: '',
            sortOrder: 'desc'
        };
        this.filters = [{ field: '', operator: 'eq', value: '' }];
        this.selectedTitles = [];
        this.addChartModal.open();
    }

    addWidget() {
        if (!this.formData.type) {
            this.translate.get('Please select widget type').subscribe(message => this.showMessage(message, 'error'));
            return;
        }
        if ((this.formData.type === 'line' || this.formData.type === 'bar') && !this.formData.yField) {
            this.translate.get('Please select Y Axis Field').subscribe(msg => this.showMessage(msg, 'error'));
            return;
        }
        if (this.formData.type === 'table') {
            if (!this.formData.index) {
                this.translate.get('Please select data source index for table').subscribe(msg => this.showMessage(msg, 'error'));
                return;
            }
        }
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
                    metricField: this.formData.metricField,
                    xField: this.formData.xField, yField: this.formData.yField,
                    name: this.formData.name
                } as any;
                break;
            case 'table':
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
                    topN: this.formData.topN || 10,
                    sortField: this.formData.sortField || '',
                    sortOrder: this.formData.sortOrder || 'desc'
                } as any;
                break;
            default:
                this.translate.get('Invalid widget type').subscribe(message => this.showMessage(message, 'error'));
                return;
        }

        this.dashboard.push(newItem);
        this.addChartModal.close();
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
            metricField: (item as any).metricField || '',
            filters: (item as any).filters || [],
            yField: (item as any).yField || '',
            // 表格参数（图表忽略）
            topN: (item as any).topN || 100,
            sortField: (item as any).sortField || '',
            sortOrder: (item as any).sortOrder || 'desc'
        };

        // 透传可选时间范围，未提供则让后端按最近7天处理
        if (this.startTime !== undefined) {
            req.startTime = this.startTime;
        }
        if (this.endTime !== undefined) {
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
            },
            error: () => {
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

    private generateChartConfig(chartType: string) {
        const config: any = {
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['Data']
            }
        };

        switch (chartType) {
            case 'line':
                config.xAxis = {
                    type: 'category',
                    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                };
                config.yAxis = {
                    type: 'value'
                };
                config.series = [{
                    name: 'Data',
                    data: [120, 200, 150, 80, 70, 110, 130],
                    type: 'line',
                    smooth: true
                }];
                break;

            case 'bar':
                config.xAxis = {
                    type: 'category',
                    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                };
                config.yAxis = {
                    type: 'value'
                };
                config.series = [{
                    name: 'Data',
                    data: [120, 200, 150, 80, 70, 110, 130],
                    type: 'bar'
                }];
                break;

            case 'pie':
                config.series = [{
                    name: 'Access From',
                    type: 'pie',
                    radius: '50%',
                    data: [
                        { value: 1048, name: 'Search Engine' },
                        { value: 735, name: 'Direct' },
                        { value: 580, name: 'Email' },
                        { value: 484, name: 'Union Ads' },
                        { value: 300, name: 'Video Ads' }
                    ],
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }];
                break;
        }

        return config;
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

        // 填充编辑表单数据
        // 判断实际的widget类型：如果是chart类型，使用chartType，否则使用type
        const actualType = item.type === 'chart' ? item.chartType : item.type;

        this.editFormData = {
            name: (item as any).name || '',
            type: actualType as 'line' | 'bar' | 'pie' | 'table' | '',
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

        // 与 onIndexChange 相同的逻辑
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.editFormData.index}/fields`).subscribe({
            next: (fields) => {
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

                const keywordFields = options.filter(o => o.type === 'keyword');
                this.yAxisCandidates = [...this.dateFields, ...keywordFields].map(o => ({ value: o.value, label: o.label }));

                if (!this.editFormData.yField && this.yAxisCandidates.length) {
                    this.editFormData.yField = this.yAxisCandidates[0].value;
                }
            },
            error: () => {}
        });

        // 数值字段（度量）
        this.http.get<Array<{name: string; type: string}>>(`${environment.apiUrl}/es/indices/${this.editFormData.index}/fields/filtered?fieldType=numeric`).subscribe({
            next: (numericFields) => {
                this.aggregationFields = numericFields.map(f => ({ value: f.name, label: f.name }));
            },
            error: () => {}
        });

        // 文本字段（饼图分类）
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

    onChartInit(ec: any, item: CustomGridsterItem) {
        this.echartsInstances[item.uniqueId] = ec;
    }

    trackByFn(index: number, item: CustomGridsterItem): string {
        return `${item.uniqueId}_${item.type}_${item.chartType}`;
    }

    saveTemplate() {
        if (!this.name.trim()) {
            this.showMessage('Please enter template name', 'error');
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
            createdAt: this.originalTemplate?.createdAt || new Date().toISOString()  // 保持原始的创建时间
        };

        this.http.put(`${environment.apiUrl}/templates/${this.id}`, template).subscribe(
            () => {
                this.showMessage('Template has been updated successfully');
                this.router.navigate(['/report/template/list']);
            },
            error => {
                console.error('Error updating template:', error);
                this.showMessage('Error updating template', 'error');
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

    // 添加一个方法来处理选中的标题
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
