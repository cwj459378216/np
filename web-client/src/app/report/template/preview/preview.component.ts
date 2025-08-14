import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GridsterConfig, GridsterItem } from 'angular-gridster2';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TemplateService } from '../../../services/template.service';
import { TranslateService } from '@ngx-translate/core';
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
        if (this.isStandalone) {
            this.route.params.subscribe(params => {
                this.id = params['id'];
                if (this.id) {
                    this.loadTemplate();
                }
            });
        } else {
            this.route.queryParams.subscribe(params => {
                this.id = params['id'];
                if (this.id) {
                    this.loadTemplate();
                }
            });
        }
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
                    this.dashboard = content.dashboard.map((item: CustomGridsterItem) => ({
                        ...item,
                        x: item.x,
                        y: item.y,
                        cols: item.cols,
                        rows: item.rows
                    }));
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

        // 默认列顺序
        return ['id', 'email', 'lastName', 'firstName'];
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

        this.templateService.exportPdf(Number(this.id))
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
}
