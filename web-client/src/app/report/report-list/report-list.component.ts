import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-report-list',
    templateUrl: './report-list.component.html'
})
export class ReportListComponent implements OnInit {
    @ViewChild('datatable') datatable: any;
    
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
    }

    loadReports() {
        this.http.get(`${environment.apiUrl}/api/reports`).subscribe(
            (data: any) => {
                this.items = data;
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