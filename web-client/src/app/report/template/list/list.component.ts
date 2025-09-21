import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';
import { TemplateService } from '../../../services/template.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html'
})
export class ListComponent implements OnInit {
    @ViewChild('datatable') datatable: any;

    items: any = [];
    search = '';

    cols: any[] = [];

    constructor(
        private router: Router,
        private http: HttpClient,
        private templateService: TemplateService,
        private translate: TranslateService
    ) {}

    ngOnInit() {
        this.initializeColumns();
        this.loadTemplates();

        // 监听语言变化，重新初始化列标题
        this.translate.onLangChange.subscribe(() => {
            this.initializeColumns();
        });
    }

    initializeColumns() {
        this.translate.get(['Name', 'Description', 'Creation Time', 'Creator', 'Actions']).subscribe(translations => {
            this.cols = [
                { field: 'name', title: translations['Name'] },
                { field: 'description', title: translations['Description'] },
                { field: 'createdAt', title: translations['Creation Time'] },
                { field: 'creator', title: translations['Creator'] },
                { field: 'actions', title: translations['Actions'], sort: false, headerClass: 'justify-center' },
            ];
            console.log(this.cols);
        });
    }

    loadTemplates() {
        this.http.get(`${environment.apiUrl}/templates`).subscribe(
            (data: any) => {
                this.items = data;
            },
            error => {
                console.error('Error loading templates:', error);
            }
        );
    }

    deleteRow(id: number | null = null) {
        this.translate.get(['Are you sure?', "You won't be able to revert this!", 'Yes, delete it!', 'Template has been deleted successfully', 'Templates have been deleted successfully', 'Error deleting template', 'Error deleting templates', 'Cancel'])
        .subscribe(translations => {
            Swal.fire({
                title: translations['Are you sure?'],
                text: translations["You won't be able to revert this!"],
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: translations['Yes, delete it!'],
                cancelButtonText: translations['Cancel'],
                padding: '2em'
            }).then((result) => {
                if (result.value) {
                    if (id) {
                        this.http.delete(`${environment.apiUrl}/templates/${id}`).subscribe(
                            () => {
                                this.loadTemplates();
                                this.datatable?.clearSelectedRows();
                                this.showMessage(translations['Template has been deleted successfully']);
                            },
                            error => {
                                console.error('Error deleting template:', error);
                                // 显示服务器返回的具体错误信息
                                let errorMessage = translations['Error deleting template'];
                                if (error.error && typeof error.error === 'string') {
                                    errorMessage = error.error;
                                } else if (error.message) {
                                    errorMessage = error.message;
                                }
                                this.showMessage(errorMessage, 'error');
                            }
                        );
                    } else {
                        let selectedRows = this.datatable.getSelectedRows();
                        const ids: number[] = selectedRows.map((d: any) => d.id);

                        // 批量删除
                        let hasErrors = false;
                        let errorMessages: string[] = [];

                        Promise.allSettled(
                            ids.map((id: number) =>
                                this.http.delete(`${environment.apiUrl}/templates/${id}`).toPromise()
                            )
                        ).then((results) => {
                            results.forEach((result, index) => {
                                if (result.status === 'rejected') {
                                    hasErrors = true;
                                    const error = result.reason;
                                    let errorMsg = `Template ID ${ids[index]}: `;
                                    if (error.error && typeof error.error === 'string') {
                                        errorMsg += error.error;
                                    } else if (error.message) {
                                        errorMsg += error.message;
                                    } else {
                                        errorMsg += 'Unknown error';
                                    }
                                    errorMessages.push(errorMsg);
                                }
                            });

                            this.loadTemplates();
                            this.datatable.clearSelectedRows();

                            if (hasErrors) {
                                // 显示详细的错误信息
                                const detailedError = errorMessages.join('\n');
                                this.showMessage(detailedError, 'error');
                            } else {
                                this.showMessage(translations['Templates have been deleted successfully']);
                            }
                        });
                    }
                }
            });
        });
    }

    showMessage(msg = '', type = 'success') {
        const toast: any = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: type === 'error' ? 5000 : 3000, // 错误消息显示更长时间
            customClass: { container: 'toast' },
        });

        // 如果是错误消息且包含多行，使用弹窗而不是toast
        if (type === 'error' && msg.includes('\n')) {
            Swal.fire({
                icon: 'error',
                title: 'Error Details',
                text: msg,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'error-popup'
                }
            });
        } else {
            toast.fire({
                icon: type,
                title: msg,
                padding: '10px 20px',
            });
        }
    }

    downloadTemplate(id: number) {
        this.http.get(`${environment.apiUrl}/templates/${id}`).subscribe(
            (template: any) => {
                // 创建并下载 JSON 文件
                const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `template_${id}.json`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error => {
                console.error('Error downloading template:', error);
            }
        );
    }

    exportPdf(id: number) {
        Swal.fire({
            title: '正在生成PDF...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this.templateService.exportPdf(id)
            .subscribe({
                next: (blob: Blob) => {
                    // 创建下载链接
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `template-${id}-${new Date().getTime()}.pdf`;
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

    formatDate(dateString: string): string {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            // 格式化为本地时间 YYYY-MM-DD HH:MM:SS
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }
}
