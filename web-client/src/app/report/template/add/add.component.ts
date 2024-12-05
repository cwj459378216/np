import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { GridsterConfig, GridsterItem, GridsterItemComponentInterface } from 'angular-gridster2';

// 首先定义 GridsterItem 接口
interface CustomGridsterItem extends GridsterItem {
    uniqueId: string;
    id: string;
    type: string;
    chartType?: string;
    chartConfig?: any;
}

@Component({
    selector: 'app-add',
    templateUrl: './add.component.html',
    encapsulation: ViewEncapsulation.None
})
export class AddComponent implements OnInit {
    dashboard: Array<CustomGridsterItem> = [];
    options: GridsterConfig = {};
    lineChart: any;
    barChart: any;
    pieChart: any;
    echartsInstances: {[key: string]: any} = {};

    // 表单相关
    items: any[] = [];
    selectedCurrency = 'USD - US Dollar';
    currencyList = [
        'USD - US Dollar',
        'GBP - British Pound',
        'IDR - Indonesian Rupiah',
        'INR - Indian Rupee',
        'BRL - Brazilian Real',
        'EUR - Germany (Euro)',
        'TRY - Turkish Lira',
    ];
    tax: number = 0;
    discount: number = 0;
    shippingCharge: number = 0;
    paymentMethod: string = '';

    // 添加新的属性
    public name: string = '';
    public description: string = '';

    @ViewChild('addChartModal') addChartModal: any;
    @ViewChild('widgetFormRef') widgetFormRef: any;

    // 添加表格数据
    tableData = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'johndoe@yahoo.com' },
        { id: 2, firstName: 'Andy', lastName: 'King', email: 'andyking@gmail.com' },
        { id: 3, firstName: 'Lisa', lastName: 'Doe', email: 'lisadoe@yahoo.com' },
        { id: 4, firstName: 'Vincent', lastName: 'Carpenter', email: 'vinnyc@yahoo.com' },
    ];

    // 表单数据
    formData = {
        name: '',
        type: '',
        index: '',
        filter: '',
        aggregationField: '',
        aggregationType: ''
    };

    // 下拉选项数据
    indexList = [
        { value: 'index1', label: 'Index 1' },
        { value: 'index2', label: 'Index 2' },
        { value: 'index3', label: 'Index 3' }
    ];

    // 添加聚合字段选项
    aggregationFields = [
        { value: 'value', label: 'Value' },
        { value: 'count', label: 'Count' },
        { value: 'price', label: 'Price' },
        { value: 'quantity', label: 'Quantity' }
    ];

    // 添加聚合类型选项
    aggregationTypes = [
        { value: 'sum', label: 'Sum' },
        { value: 'avg', label: 'Average' },
        { value: 'min', label: 'Minimum' },
        { value: 'max', label: 'Maximum' },
        { value: 'count', label: 'Count' }
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

    // 添加标题选项
    titleOptions = [
        { value: 'title1', label: 'Title 1' },
        { value: 'title2', label: 'Title 2' },
        { value: 'title3', label: 'Title 3' },
        { value: 'title4', label: 'Title 4' },
        { value: 'title5', label: 'Title 5' }
    ];

    // 选中的标题
    selectedTitles: string[] = [];

    // 添加新的 filter 行
    addFilter() {
        this.filters.push({ field: '', value: '' });
    }

    // 删除指定的 filter 行
    removeFilter(index: number) {
        this.filters.splice(index, 1);
    }

    // 修改 addWidget 方法中处理 filter 的部分
    addWidget() {
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 将多个 filter 组合成一个字符串或对象
        const filterData = this.filters
            .filter(f => f.field && f.value)
            .reduce((acc, curr) => {
                acc[curr.field] = curr.value;
                return acc;
            }, {} as {[key: string]: string});

        if (this.formData.type === 'table') {
            const newItem: CustomGridsterItem = {
                uniqueId,
                id: `table_${uniqueId}`,
                cols: 3,
                rows: 2,
                y: 0,
                x: 0,
                type: 'table',
                name: this.formData.name,
                index: this.formData.index,
                filter: filterData,  // 使用新的 filter 数据
                aggregation: {
                    field: this.formData.aggregationField,
                    type: this.formData.aggregationType
                },
                titles: this.selectedTitles  // 添加选中的标题
            };
            this.dashboard = [...this.dashboard, newItem];
        } else {
            let chartConfig;
            switch(this.formData.type) {
                case 'line':
                    chartConfig = {...this.lineChart};
                    break;
                case 'bar':
                    chartConfig = {...this.barChart};
                    break;
                case 'pie':
                    chartConfig = {...this.pieChart};
                    break;
                default:
                    return;
            }

            const newItem: CustomGridsterItem = {
                uniqueId,
                id: `chart_${uniqueId}`,
                cols: 2,
                rows: 2,
                y: 0,
                x: 0,
                type: 'chart',
                chartType: this.formData.type,
                chartConfig: chartConfig,
                name: this.formData.name,
                index: this.formData.index,
                filter: filterData,
                aggregation: {
                    field: this.formData.aggregationField,
                    type: this.formData.aggregationType
                }
            };

            this.dashboard = [...this.dashboard, newItem];
        }

        // 重置表单时也要重置 filters 和标题选择
        this.formData = {
            name: '',
            type: '',
            index: '',
            filter: '',
            aggregationField: '',
            aggregationType: ''
        };
        this.filters = [{ field: '', value: '' }];
        this.selectedTitles = [];  // 重置选中的标题
        this.addChartModal.close();
    }

    // 修改 trackBy 函数
    trackByFn(index: number, item: CustomGridsterItem): string {
        // 确保返回一个真正唯一的标识符
        if (!item.uniqueId) {
            console.warn('Item without uniqueId found:', item);
            item.uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`;
        }
        return `${item.uniqueId}_${item.type}_${item.chartType}`;
    }

    openAddChartModal() {
        this.addChartModal.open();
    }

    constructor() {
        this.initCharts();
        this.initDashboard();
        this.initOptions();
    }

    initOptions() {
        this.options = {
            gridType: 'fit',
            margin: 10,
            outerMargin: true,
            draggable: {
                enabled: true
            },
            resizable: {
                enabled: true
            },
            minCols: 6,
            maxCols: 6,
            minRows: 6,
            maxRows: 6,
            pushItems: true,
            displayGrid: 'always',
            itemChangeCallback: (item: GridsterItem, itemComponent: GridsterItemComponentInterface) => {
                this.resizeChart(item);
            },
            itemResizeCallback: (item: GridsterItem, itemComponent: GridsterItemComponentInterface) => {
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

    onChartInit(ec: any, item: CustomGridsterItem) {
        this.echartsInstances[item.uniqueId] = ec;
    }

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
            // 添加默认的表格
            {
                uniqueId: generateUniqueId(),
                id: 'table_1',
                cols: 3,
                rows: 2,
                y: 2,  // 放在第二行
                x: 0,
                type: 'table',
                name: 'Default Table',
                index: 'index1',
                filter: {},
                aggregation: {
                    field: 'value',
                    type: 'sum'
                },
                titles: ['title1', 'title2', 'title3']  // 默认显示的列
            }
        ];
    }

    removeWidget(item: CustomGridsterItem) {
        if (this.echartsInstances[item.uniqueId]) {
            this.echartsInstances[item.uniqueId].dispose();
            delete this.echartsInstances[item.uniqueId];
        }
        this.dashboard = this.dashboard.filter(widget => widget.uniqueId !== item.uniqueId);
    }

    ngOnInit() {
        // 初始化默认项
        this.items = [{
            id: 1,
            title: '',
            description: '',
            rate: 0,
            quantity: 0,
            amount: 0,
        }];
    }

    addItem() {
        let maxId = 0;
        if (this.items && this.items.length) {
            maxId = this.items.reduce((max: number, character: any) => 
                (character.id > max ? character.id : max), this.items[0].id);
        }
        this.items.push({
            id: maxId + 1,
            title: '',
            description: '',
            rate: 0,
            quantity: 0,
            amount: 0,
        });
    }

    removeItem(item: any = null) {
        if (item) {
            this.items = this.items.filter((d: any) => d.id != item.id);
        }
    }
} 