import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html'
})
export class ListComponent implements OnInit {
    @ViewChild('datatable') datatable: any;
    
    items: any = [];
    search = '';
    
    cols = [
        { field: 'template', title: 'Template' },
        { field: 'client', title: 'Client' },
        { field: 'createDate', title: 'Create Date' },
        { field: 'amount', title: 'Amount', headerClass: 'justify-end' },
        { field: 'status', title: 'Status' },
        { field: 'actions', title: 'Actions', sort: false, headerClass: 'justify-center' },
    ];

    constructor(private router: Router) {}

    ngOnInit() {
        // 模拟数据
        this.items = [
            {
                id: 1,
                template: 'Template 1',
                client: 'Client A',
                createDate: '2024-01-15',
                amount: '$100',
                status: 'Paid',
            },
            {
                id: 2,
                template: 'Template 2', 
                client: 'Client B',
                createDate: '2024-01-16',
                amount: '$200',
                status: 'Pending',
            },
            // 可以添加更多数据...
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
} 