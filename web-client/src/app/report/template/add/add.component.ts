import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { GridsterConfig, GridsterItem, GridsterItemComponentInterface } from 'angular-gridster2';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
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
    indexList = [
        { value: 'index1', label: 'Index 1' },
        { value: 'index2', label: 'Index 2' },
        { value: 'index3', label: 'Index 3' }
    ];

    filterFields = [
        { value: 'field1', label: 'Field 1' },
        { value: 'field2', label: 'Field 2' },
        { value: 'field3', label: 'Field 3' }
    ];

    titleOptions = [
        { value: 'id', label: 'Id' },
        { value: 'email', label: 'Email' },
        { value: 'lastName', label: 'LastName' },
        { value: 'firstName', label: 'FirstName' }
    ];

    aggregationFields = [
        { value: 'field1', label: 'Field 1' },
        { value: 'field2', label: 'Field 2' },
        { value: 'field3', label: 'Field 3' }
    ];

    aggregationTypes = [
        { value: 'sum', label: 'Sum' },
        { value: 'avg', label: 'Average' },
        { value: 'count', label: 'Count' }
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
        aggregationType: ''
    };

    filters: Array<{field: string, value: string}> = [];
    selectedTitles: string[] = [];

    constructor(
        private http: HttpClient,
        private router: Router
    ) {}

    ngOnInit() {
        this.dashboard = [];
        this.initializeGridsterOptions();
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
            aggregationType: ''
        };
        this.filters = [{ field: '', value: '' }];
        this.selectedTitles = [];
        this.addChartModal.open();
    }

    // 处理添加图表的提交
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
                    }
                };
                break;

            default:
                this.showMessage('Invalid widget type', 'error');
                return;
        }

        this.dashboard.push(newItem);
        this.addChartModal.close();
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
        this.filters.push({ field: '', value: '' });
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1);
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
            createdAt: new Date().toISOString()
        };

        this.http.post(`${environment.apiUrl}/api/templates`, template).subscribe(
            () => {
                this.showMessage('Template has been saved successfully');
                this.router.navigate(['/report/template/list']);
            },
            error => {
                console.error('Error saving template:', error);
                this.showMessage('Error saving template', 'error');
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
} 