import { Component, OnInit, ViewEncapsulation } from '@angular/core';
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
        // ECharts配置
        this.lineChart = {
            tooltip: {
                trigger: 'axis'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
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

    // 修改添加widget方法，添加唯一id
    addWidget(type: string) {
        let chartConfig;
        switch(type) {
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

        const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newItem: CustomGridsterItem = {
            uniqueId,
            id: `chart_${uniqueId}`,
            cols: 2,
            rows: 2,
            y: 0,
            x: 0,
            type: 'chart',
            chartType: type,
            chartConfig: chartConfig
        };

        this.dashboard = [...this.dashboard, newItem];
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
} 