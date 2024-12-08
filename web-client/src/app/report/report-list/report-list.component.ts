import { Component, OnInit, ViewChild } from '@angular/core';

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
        { field: 'actions', title: 'Actions', sort: false, headerClass: 'justify-center' },
    ];

    constructor() {}

    ngOnInit() {
        // 模拟数据
        this.items = [
            {
                id: 1,
                name: 'Monthly Report',
                description: 'Monthly security analysis report',
                createTime: '2024-01-15 10:30',
                creator: 'John Doe',
                triggerMode: 'Manual'
            },
            {
                id: 2,
                name: 'Weekly Report',
                description: 'Weekly security status report',
                createTime: '2024-01-16 14:20',
                creator: 'Jane Smith',
                triggerMode: 'Scheduled'
            }
        ];
    }

    deleteRow(item: any = null) {
        if (confirm('Are you sure want to delete selected row ?')) {
            if (item) {
                this.items = this.items.filter((d: any) => d.id != item);
                this.datatable.clearSelectedRows();
            } else {
                let selectedRows = this.datatable.getSelectedRows();
                const ids = selectedRows.map((d: any) => {
                    return d.id;
                });
                this.items = this.items.filter((d: any) => !ids.includes(d.id as never));
                this.datatable.clearSelectedRows();
            }
        }
    }

    downloadReport(id: number) {
        console.log('Downloading report:', id);
    }
} 