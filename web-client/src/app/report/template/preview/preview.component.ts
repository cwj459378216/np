import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GridsterConfig, GridsterItem } from 'angular-gridster2';

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
    encapsulation: ViewEncapsulation.None
})
export class PreviewComponent implements OnInit {
    id?: string;
    dashboard: Array<CustomGridsterItem> = [];
    options: GridsterConfig = {};
    echartsInstances: {[key: string]: any} = {};

    // 表格数据
    tableData = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'johndoe@yahoo.com' },
        { id: 2, firstName: 'Andy', lastName: 'King', email: 'andyking@gmail.com' },
        { id: 3, firstName: 'Lisa', lastName: 'Doe', email: 'lisadoe@yahoo.com' },
        { id: 4, firstName: 'Vincent', lastName: 'Carpenter', email: 'vinnyc@yahoo.com' },
    ];

    constructor(private route: ActivatedRoute) {
        this.initOptions();
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.id = params['id'];
            // TODO: 根据 id 获取模板数据
            // 这里暂时使用模拟数据
            this.loadTemplateData();
        });
    }

    initOptions() {
        this.options = {
            gridType: 'fit',
            margin: 10,
            outerMargin: true,
            draggable: {
                enabled: false  // 禁用拖拽
            },
            resizable: {
                enabled: false  // 禁用调整大小
            },
            minCols: 6,
            maxCols: 6,
            minRows: 6,
            maxRows: 6,
            pushItems: false,
            displayGrid: 'none',  // 隐藏网格
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

    onChartInit(ec: any, item: CustomGridsterItem) {
        this.echartsInstances[item.uniqueId] = ec;
    }

    // 模拟加载模板数据
    private loadTemplateData() {
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
                chartConfig: {
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
                }
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
                chartConfig: {
                    tooltip: {
                        trigger: 'axis'
                    },
                    legend: {
                        data: ['Revenue'],
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
                        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: [{
                        name: 'Revenue',
                        type: 'bar',
                        data: [120, 200, 150, 80, 70, 110, 130]
                    }]
                }
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
                chartConfig: {
                    tooltip: {
                        trigger: 'item'
                    },
                    legend: {
                        bottom: '0',
                        left: 'center'
                    },
                    series: [{
                        name: 'Access From',
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
                            { value: 1048, name: 'Search Engine' },
                            { value: 735, name: 'Direct' },
                            { value: 580, name: 'Email' },
                            { value: 484, name: 'Union Ads' },
                            { value: 300, name: 'Video Ads' }
                        ]
                    }]
                }
            },
            {
                uniqueId: generateUniqueId(),
                id: 'table_1',
                cols: 3,
                rows: 2,
                y: 2,
                x: 0,
                type: 'table',
                name: 'User List',
                index: 'users',
                filter: {},
                aggregation: 'count',
                titles: ['id', 'firstName', 'lastName', 'email']
            }
        ];
    }

    // 添加打印方法
    printTemplate() {
        window.print();
    }
} 