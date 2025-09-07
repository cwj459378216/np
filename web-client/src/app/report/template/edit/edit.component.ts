import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GridsterConfig, GridsterItem, GridsterItemComponentInterface } from 'angular-gridster2';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

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
    yField?: string; // 添加 yField 属性
    topN?: number;   // 添加topN参数
    sortField?: string;  // 添加排序字段
    sortOrder?: 'asc' | 'desc';  // 添加排序顺序
}

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    encapsulation: ViewEncapsulation.None
})
export class EditComponent implements OnInit {
    id?: string;
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
    @ViewChild('widgetFormRef') widgetFormRef: any;

    // 表单数据
    formData = {
        name: '',
        type: '',
        index: '',
        filter: '',
        aggregationField: '',
        aggregationType: '',
        yField: '', // 添加 yField 属性
        topN: 10,  // 改为10条记录，符合新的选项
        sortField: '',  // 添加排序字段
        sortOrder: 'desc' as 'asc' | 'desc'  // 添加排序顺序，默认降序
    };

    // 下拉选项数据
    indexList = [
        { value: 'index1', label: 'Index 1' },
        { value: 'index2', label: 'Index 2' },
        { value: 'index3', label: 'Index 3' }
    ];

    // 添加 aggregationList
    aggregationList = [
        { value: 'count', label: 'Count' },
        { value: 'sum', label: 'Sum' },
        { value: 'avg', label: 'Average' },
        { value: 'min', label: 'Min' },
        { value: 'max', label: 'Max' }
    ];

    // 修改 filter 相关的数据结构
    filters: Array<{field: string, value: string}> = [
        { field: '', value: '' }
    ];

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

    originalTemplate: any = null;  // 添加这个属性

    constructor(
        private route: ActivatedRoute,
        private http: HttpClient,
        private router: Router
    ) {
        this.initCharts();
        this.initDashboard();
        this.initOptions();
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.id = params['id'];
            if (this.id) {
                this.loadTemplate();
            }
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
        const generateUniqueId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.dashboard = [
            {
                uniqueId: generateUniqueId(),
                id: 'chart_1',
                cols: 2,
                rows: 2,
                y: 0,
                x: 0,
                type: 'chart',
                chartType: 'line',
                chartConfig: {...this.lineChart}
            },
            {
                uniqueId: generateUniqueId(),
                id: 'chart_2',
                cols: 2,
                rows: 2,
                y: 0,
                x: 2,
                type: 'chart',
                chartType: 'bar',
                chartConfig: {...this.barChart}
            },
            {
                uniqueId: generateUniqueId(),
                id: 'chart_3',
                cols: 2,
                rows: 2,
                y: 0,
                x: 4,
                type: 'chart',
                chartType: 'pie',
                chartConfig: {...this.pieChart}
            },
            {
                uniqueId: generateUniqueId(),
                id: 'table_1',
                cols: 3,
                rows: 2,
                y: 2,
                x: 0,
                type: 'table',
                name: 'Default Table',
                index: 'index1',
                filter: {},
                aggregation: {
                    field: 'value',
                    type: 'sum'
                },
                titles: ['title1', 'title2', 'title3']
            }
        ];
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

    openAddChartModal() {
        this.addChartModal.open();
    }

    addWidget() {
        if (!this.formData.type) {
            this.showMessage('Please select widget type', 'error');
            return;
        }

        const uniqueId = `${this.formData.type}_${new Date().getTime()}`;
        let newItem: CustomGridsterItem;

        switch (this.formData.type) {
            case 'line':
            case 'bar':
            case 'pie':
                newItem = {
                    cols: 3,
                    rows: 3,
                    y: 0,
                    x: 0,
                    type: 'chart',
                    chartType: this.formData.type,
                    uniqueId: uniqueId,
                    id: uniqueId,
                    chartConfig: this.generateChartConfig(this.formData.type)
                };
                break;

            case 'table':
                newItem = {
                    cols: 6,
                    rows: 3,
                    y: 0,
                    x: 0,
                    type: 'table',
                    uniqueId: uniqueId,
                    id: uniqueId,
                    titles: this.selectedTitles,
                    aggregation: {
                        field: this.formData.aggregationField,
                        type: this.formData.aggregationType
                    },
                    filters: this.filters,
                    index: this.formData.index,
                    name: this.formData.name,
                    topN: this.formData.topN || 10,
                    sortField: this.formData.sortField || '',
                    sortOrder: this.formData.sortOrder || 'desc'
                } as any;
                break;

            default:
                this.showMessage('Invalid widget type', 'error');
                return;
        }

        this.dashboard.push(newItem);
        this.addChartModal.close();
    }

    private generateChartConfig(chartType: string) {
        const config: any = {
            title: {
                text: this.formData.name || 'Chart'
            },
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

    addFilter() {
        this.filters.push({ field: '', value: '' });
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1);
    }

    onChartInit(ec: any, item: CustomGridsterItem) {
        this.echartsInstances[item.uniqueId] = ec;
    }

    trackByFn(index: number, item: CustomGridsterItem): string {
        // ... 复制 AddComponent 中的方法
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
