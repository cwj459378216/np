import { Component, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

// 定义列接口
interface TableColumn {
    title: string;
    field: string;
    hide?: boolean;
}

// 定义行数据接口
interface EventData {
    time: string;
    eventType: string;
    sourceIp: string;
    destinationIp: string;
    protocol: string;
    status: string;
}

@Component({
    selector: 'app-event',
    templateUrl: './event.component.html',
    animations: [
        trigger('toggleAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.95)' }),
                animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
            ]),
            transition(':leave', [
                animate('75ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' })),
            ]),
        ]),
    ],
})
export class EventComponent implements OnInit {
    search = '';
    rows: EventData[] = []; // 使用 EventData 类型
    cols: TableColumn[] = []; // 使用 TableColumn 类型
    revenueChart: any;

    constructor() {
        // 初始化表格列
        this.cols = [
            { title: 'Time', field: 'time' },
            { title: 'Event', field: 'eventType' },
            { title: 'Source IP', field: 'sourceIp' },
            { title: 'Destination IP', field: 'destinationIp' },
            { title: 'Protocol', field: 'protocol' },
            { title: 'Status', field: 'status' },
        ];

        // 初始化图表配置
        this.initChart();
    }

    ngOnInit() {
        // 模拟数据
        this.rows = [
            {
                time: '2024-03-20 10:30:15',
                eventType: 'Executable code was detected',
                sourceIp: '192.168.1.100',
                destinationIp: '10.0.0.50',
                protocol: 'TCP',
                status: 'Critical'
            },
            {
                time: '2024-03-20 11:00:00',
                eventType: 'Misc Attack',
                sourceIp: '192.168.1.1',
                destinationIp: '192.168.1.100',
                protocol: 'UDP',
                status: 'Warning'
            },
            {
                time: '2024-03-20 11:15:30',
                eventType: 'Attempted Information Leak',
                sourceIp: '192.168.1.1',
                destinationIp: '192.168.1.100',
                protocol: 'TCP',
                status: 'Critical'
            },
            {
                time: '2024-03-20 12:00:00',
                eventType: 'Information Leak',
                sourceIp: '192.168.1.1',
                destinationIp: '192.168.1.100',
                protocol: 'TCP',
                status: 'Critical'
            },
            {   time: '2024-03-20 12:30:00',
                eventType: 'Detection of a Network Scan',
                sourceIp: '192.168.1.1',
                destinationIp: '192.168.1.100',
                protocol: 'TCP',
                status: 'High'
            },
            // ... 添加更多数据
        ];
    }

    initChart() {
        this.revenueChart = {
            series: [
                {
                    name: 'Events',
                    data: [16, 19, 21, 16, 12, 15, 18],
                },
            ],
            chart: {
                height: 325,
                type: 'line',
                toolbar: false,
            },
            colors: ['#4361ee'],
            dataLabels: {
                enabled: false,
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            xaxis: {
                categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            },
            yaxis: {
                min: 0,
                max: 30,
                tickAmount: 5,
            },
            grid: {
                borderColor: '#e0e6ed',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: false,
                    },
                },
                yaxis: {
                    lines: {
                        show: true,
                    },
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            tooltip: {
                x: {
                    show: false,
                },
            },
            legend: {
                show: false,
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: !1,
                    opacityFrom: 0.4,
                    opacityTo: 0.1,
                    stops: [15, 100],
                },
            },
        };
    }

    updateColumn(col: TableColumn) {
        // 找到对应的列
        const column = this.cols.find(c => c.field === col.field);
        if (column) {
            // 更新列的隐藏状态
            // column.hide = !column.hide;

            // 重新构建列数组以触发变更检测
            this.cols = [...this.cols];
        }
    }

    exportTable(type: string) {
        // 处理导出功能
    }

    // 添加一个计算属性来获取可见的列
    get visibleColumns(): TableColumn[] {
        return this.cols.filter(col => !col.hide);
    }
}
