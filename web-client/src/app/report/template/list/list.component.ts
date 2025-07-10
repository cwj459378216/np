import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';
import { TemplateService } from '../../../services/template.service';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html'
})
export class ListComponent implements OnInit {
    @ViewChild('datatable') datatable: any;

    items: any = [];
    search = '';

    cols = [
        { field: 'name', title: 'Name' },
        { field: 'description', title: 'Description' },
        { field: 'createdAt', title: 'Creation Time' },
        { field: 'creator', title: 'Creator' },
        { field: 'actions', title: 'Actions', sort: false, headerClass: 'justify-center' },
    ];

    constructor(
        private router: Router,
        private http: HttpClient,
        private templateService: TemplateService
    ) {}

    ngOnInit() {
        this.loadTemplates();
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
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                if (id) {
                    this.http.delete(`${environment.apiUrl}/templates/${id}`).subscribe(
                        () => {
                            this.loadTemplates();
                            this.datatable?.clearSelectedRows();
                            this.showMessage('Template has been deleted successfully');
                        },
                        error => {
                            console.error('Error deleting template:', error);
                            this.showMessage('Error deleting template', 'error');
                        }
                    );
                } else {
                    let selectedRows = this.datatable.getSelectedRows();
                    const ids: number[] = selectedRows.map((d: any) => d.id);
                    // 批量删除
                    Promise.all(
                        ids.map((id: number) =>
                            this.http.delete(`${environment.apiUrl}/templates/${id}`).toPromise()
                        )
                    ).then(() => {
                        this.loadTemplates();
                        this.datatable.clearSelectedRows();
                        this.showMessage('Templates have been deleted successfully');
                    }).catch(() => {
                        this.showMessage('Error deleting templates', 'error');
                    });
                }
            }
        });
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
                    this.showMessage('PDF已成功生成', 'success');
                },
                error: (error) => {
                    Swal.close();
                    this.showMessage('生成PDF时出错', 'error');
                    console.error('PDF generation error:', error);
                }
            });
    }
}
