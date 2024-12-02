import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-preview',
    templateUrl: './preview.component.html'
})
export class PreviewComponent implements OnInit {
    reportData: any;

    constructor(private route: ActivatedRoute) {}

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const id = params['id'];
            // 这里获取报告数据
            this.reportData = {
                id: id,
                template: 'Template 1',
                client: 'Client A',
                createDate: '2024-01-15',
                // ... 其他数据
            };
        });
    }

    printReport() {
        window.print();
    }
} 