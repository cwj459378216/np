import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

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

    cols: any[] = [];

    constructor(private http: HttpClient, private translate: TranslateService) {}

    ngOnInit() {
        this.initializeColumns();
        this.loadReports();
        this.startPolling();

        // 监听语言变化，重新初始化列标题
        this.translate.onLangChange.subscribe(() => {
            this.initializeColumns();
        });
    }

    initializeColumns() {
        this.translate.get(['Name', 'Description', 'Creation Time', 'Creator', 'Trigger Mode', 'Actions']).subscribe(translations => {
            this.cols = [
                { field: 'name', title: translations['Name'] },
                { field: 'description', title: translations['Description'] },
                { field: 'createTime', title: translations['Creation Time'] },
                { field: 'creator', title: translations['Creator'] },
                { field: 'triggerMode', title: translations['Trigger Mode'] },
                { field: 'actions', title: translations['Actions'], sort: false, headerClass: 'justify-center' }
            ];
        });
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
        this.http.get(`${environment.apiUrl}/reports/latest-update`)
            .pipe(takeUntil(this.destroy$))
            .subscribe((response: any) => {
                if (response.lastUpdate !== this.lastUpdate) {
                    this.loadReports();
                    this.lastUpdate = response.lastUpdate;
                }
            });
    }

    loadReports() {
        this.http.get(`${environment.apiUrl}/reports`)
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

    deleteRow(id: number | null = null) {
        this.translate.get(['Are you sure?', "You won't be able to revert this!", 'Yes, delete it!', 'Report has been deleted successfully', 'Reports have been deleted successfully', 'Error deleting report', 'Error deleting reports', 'Cancel'])
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
                        this.http.delete(`${environment.apiUrl}/reports/${id}`).subscribe(
                            () => {
                                this.loadReports();
                                this.datatable?.clearSelectedRows();
                                this.showMessage(translations['Report has been deleted successfully']);
                            },
                            error => {
                                console.error('Error deleting report:', error);
                                this.showMessage(translations['Error deleting report'], 'error');
                            }
                        );
                    } else {
                        let selectedRows = this.datatable.getSelectedRows();
                        const ids: number[] = selectedRows.map((d: any) => d.id);
                        // 批量删除
                        Promise.all(
                            ids.map((id: number) =>
                                this.http.delete(`${environment.apiUrl}/reports/${id}`).toPromise()
                            )
                        ).then(() => {
                            this.loadReports();
                            this.datatable.clearSelectedRows();
                            this.showMessage(translations['Reports have been deleted successfully']);
                        }).catch(() => {
                            this.showMessage(translations['Error deleting reports'], 'error');
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
        window.location.href = `${environment.apiUrl}/reports/download/${id}`;
    }
}
