import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-report-list',
    templateUrl: './report-list.component.html'
})
export class ReportListComponent implements OnInit, OnDestroy {
    @ViewChild('datatable') datatable: any;
    
    private destroy$ = new Subject<void>();
    private polling: any;
    private lastUpdate: string = '';
    
    items: any = [];
    search = '';
    
    cols = [
        { field: 'name', title: 'Name' },
        { field: 'description', title: 'Description' },
        { field: 'createTime', title: 'Creation Time' },
        { field: 'creator', title: 'Creator' },
        { field: 'triggerMode', title: 'Trigger Mode' },
        { field: 'actions', title: 'Actions', sort: false, headerClass: 'justify-center' }
    ];

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.loadReports();
        this.startPolling();
    }

    ngOnDestroy() {
        this.stopPolling();
        this.destroy$.next();
        this.destroy$.complete();
    }

    private startPolling() {
        this.polling = setInterval(() => {
            this.checkForUpdates();
        }, 5000);
    }

    private stopPolling() {
        if (this.polling) {
            clearInterval(this.polling);
        }
    }

    private checkForUpdates() {
        // 只获取最新报告的创建时间
        this.http.get(`${environment.apiUrl}/api/reports/latest-update`)
            .pipe(takeUntil(this.destroy$))
            .subscribe((response: any) => {
                if (response.lastUpdate !== this.lastUpdate) {
                    this.loadReports();
                    this.lastUpdate = response.lastUpdate;
                }
            });
    }

    loadReports() {
        this.http.get(`${environment.apiUrl}/api/reports`)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
                (data: any) => {
                    this.items = data;
                    if (data.length > 0) {
                        // 更新最后更新时间
                        this.lastUpdate = Math.max(
                            ...data.map((item: any) => new Date(item.createTime).getTime())
                        ).toString();
                    }
                },
                error => {
                    console.error('Error loading reports:', error);
                }
            );
    }

    deleteRow(item?: any) {
        Swal.fire({
            title: 'Delete Report',
            text: 'Are you sure you want to delete this report?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                if (item) {
                    this.http.delete(`${environment.apiUrl}/api/reports/${item}`).subscribe(
                        () => {
                            this.loadReports();
                            this.showMessage('Report has been deleted successfully.');
                        },
                        error => {
                            console.error('Error deleting report:', error);
                            this.showMessage('Error deleting report', 'error');
                        }
                    );
                } else {
                    let selectedRows = this.datatable.getSelectedRows();
                    const ids = selectedRows.map((d: any) => d.id);
                    
                    this.http.delete(`${environment.apiUrl}/api/reports`, { body: ids }).subscribe(
                        () => {
                            this.loadReports();
                            this.showMessage('Reports have been deleted successfully.');
                        },
                        error => {
                            console.error('Error deleting reports:', error);
                            this.showMessage('Error deleting reports', 'error');
                        }
                    );
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

    downloadReport(id: number) {
        window.location.href = `${environment.apiUrl}/api/reports/download/${id}`;
    }
} 