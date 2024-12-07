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
        { field: 'name', title: 'Name' },
        { field: 'description', title: 'Description' },
        { field: 'createTime', title: 'Creation Time' },
        { field: 'creator', title: 'Creator' },
        { field: 'actions', title: 'Actions', sort: false, headerClass: 'justify-center' },
    ];

    constructor(private router: Router) {}

    ngOnInit() {
        // 模拟数据
        this.items = [
            {
                id: 1,
                name: 'Sales Dashboard',
                description: 'Monthly sales performance dashboard',
                createTime: '2024-01-15 10:30',
                creator: 'John Doe'
            },
            {
                id: 2,
                name: 'Marketing Analytics',
                description: 'Marketing campaign analysis dashboard',
                createTime: '2024-01-16 14:20',
                creator: 'Jane Smith'
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

    downloadTemplate(id: number) {
        // TODO: 实现下载逻辑
        console.log('Downloading template:', id);
    }
} 