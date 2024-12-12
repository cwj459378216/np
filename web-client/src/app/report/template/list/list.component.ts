import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

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
        private http: HttpClient
    ) {}

    ngOnInit() {
        this.loadTemplates();
    }

    loadTemplates() {
        this.http.get(`${environment.apiUrl}/api/templates`).subscribe(
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
                    this.http.delete(`${environment.apiUrl}/api/templates/${id}`).subscribe(
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
                            this.http.delete(`${environment.apiUrl}/api/templates/${id}`).toPromise()
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
        this.http.get(`${environment.apiUrl}/api/templates/${id}`).subscribe(
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
} 