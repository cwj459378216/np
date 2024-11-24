import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { SessionInfoService, SessionInfo } from '../services/session-info.service';

@Component({
  selector: 'app-session-info',
  templateUrl: './session-info.component.html',
  styleUrl: './session-info.component.css',
  animations: [toggleAnimation]
})
export class SessionInfoComponent implements OnInit {
    search = '';
    loading = false;
    currentPage = 1;
    pageSize = 10;
    total = 0;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';

    revenueChart: any = {
        series: [
            {
                name: 'Sessions',
                data: [50, 60, 70, 80, 90, 100]
            }
        ],
        chart: {
            height: 300,
            type: 'line',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                },
                autoSelected: 'zoom'
            },
            zoom: {
                enabled: true,
                type: 'x',
                autoScaleYaxis: true
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        colors: ['#4361ee'],
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
        },
        yaxis: {
            title: {
                text: 'Sessions'
            }
        },
        grid: {
            borderColor: '#e0e6ed'
        },
        tooltip: {
            theme: 'dark'
        },
        markers: {
            size: 4
        },
        labels: [],
        legend: {
            show: true
        },
        fill: {
            type: 'solid'
        }
    };

    cols = [
        { field: 'srcIP', title: 'Src.IP:Port', hide: false },
        { field: 'dstIP', title: 'Dst.IP:Port', hide: false },
        { field: 'service', title: 'Service', hide: false },
        { field: 'bytyes', title: 'Bytyes', hide: false },
        { field: 'packets', title: 'Packets', hide: false },
        { field: 'aart', title: 'AART(ms)', hide: false },
        { field: 'nrt', title: 'NRT(ms)', hide: true },
        { field: 'srt', title: 'SRT(ms)', hide: true },
        { field: 'art', title: 'ART(ms)', hide: true },
        { field: 'ptt', title: 'PTT(ms)', hide: true },
        { field: 'crt', title: 'CRT(ms)', hide: true },
        { field: 'latency', title: 'Latency(ms)', hide: true },
        { field: 'rety', title: 'Rety', hide: true },
        { field: 'lastUpdateTime', title: 'Last Updated Time', hide: false },
    ];

    rows: SessionInfo[] = [];

    constructor(
        private sessionInfoService: SessionInfoService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        console.log('Loading data with params:', {
            page: this.currentPage,
            pageSize: this.pageSize,
            sortField: this.sortField,
            sortOrder: this.sortOrder,
            search: this.search,
            currentRows: this.rows.length
        });
        
        this.loading = true;
        this.cdr.detectChanges();
        
        this.sessionInfoService.getSessionInfo({
            page: this.currentPage - 1,
            pageSize: this.pageSize,
            sortField: this.sortField,
            sortOrder: this.sortOrder,
            search: this.search
        }).subscribe({
            next: (response) => {
                console.log('Data loaded:', {
                    dataLength: response.data.length,
                    total: response.total,
                    currentPage: this.currentPage,
                    sortField: this.sortField,
                    sortOrder: this.sortOrder
                });
                
                this.rows = [...response.data];
                this.total = response.total;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error loading data:', error);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    onServerChange(event: any) {
        console.log('Server change:', event);
        
        if (event.current_page !== undefined) {
            this.currentPage = event.current_page;
        }
        
        if (event.sort_column !== undefined) {
            this.sortField = event.sort_column;
            this.sortOrder = event.sort_direction;
        }
        
        if (event.page_size !== undefined) {
            this.pageSize = event.page_size;
        }
        
        if (event.search !== undefined) {
            this.search = event.search;
        }
        
        this.loadData();
    }

    onPageChange(event: any) {
        console.log('Page changed:', {
            fromPage: this.currentPage,
            toPage: event,
            eventType: typeof event
        });
        
        if (this.currentPage !== event) {
            this.currentPage = event;
        }
    }

    onPageSizeChange(event: any) {
        console.log('Page size changed:', event);
        if (this.pageSize !== event) {
            this.pageSize = event;
            this.currentPage = 1;
        }
    }

    onSortChange(event: any) {
        console.log('Sort changed:', {
            column: event.column,
            direction: event.direction,
            event: event
        });
        
        this.sortField = event.column;
        this.sortOrder = event.direction;
        
        this.currentPage = 1;
    }

    onSearchChange(event: any) {
        console.log('Search changed:', event);
        if (this.search !== event) {
            this.search = event;
            this.currentPage = 1;
        }
    }

    updateColumn(col: any) {
        this.cols = [...this.cols];
    }

    async exportTable(type: string) {
        this.loading = true;
        this.cdr.detectChanges();

        try {
            const data = await this.sessionInfoService.exportData(type, this.search).toPromise();
            if (!data) return;

            const columns = this.cols.filter(col => !col.hide).map(col => col.field);
            
            if (type === 'csv') {
                this.exportToCsv(columns, data);
            } else if (type === 'txt') {
                this.exportToTxt(columns, data);
            } else if (type === 'print') {
                this.printData(columns, data);
            }
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    private exportToCsv(columns: string[], data: SessionInfo[]) {
        const coldelimiter = ';';
        const linedelimiter = '\n';
        
        let result = columns.map(col => this.capitalize(col)).join(coldelimiter);
        result += linedelimiter;
        
        data.forEach(item => {
            result += columns.map(col => item[col as keyof SessionInfo]).join(coldelimiter);
            result += linedelimiter;
        });

        const blob = new Blob([result], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'session_info.csv';
        link.click();
    }

    private exportToTxt(columns: string[], data: SessionInfo[]) {
        const coldelimiter = '\t';
        const linedelimiter = '\n';
        
        let result = columns.map(col => this.capitalize(col)).join(coldelimiter);
        result += linedelimiter;
        
        data.forEach(item => {
            result += columns.map(col => item[col as keyof SessionInfo]).join(coldelimiter);
            result += linedelimiter;
        });

        const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'session_info.txt';
        link.click();
    }

    private printData(columns: string[], data: SessionInfo[]) {
        let printContent = '<div style="padding: 20px;">';
        printContent += '<h2 style="text-align: center;">Session Information</h2>';
        printContent += '<table style="width: 100%; border-collapse: collapse;">';
        
        // Header
        printContent += '<tr>';
        columns.forEach(col => {
            printContent += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">${this.capitalize(col)}</th>`;
        });
        printContent += '</tr>';
        
        // Data
        data.forEach(item => {
            printContent += '<tr>';
            columns.forEach(col => {
                printContent += `<td style="border: 1px solid #ddd; padding: 8px;">${item[col as keyof SessionInfo]}</td>`;
            });
            printContent += '</tr>';
        });
        
        printContent += '</table></div>';
        
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Session Information</title></head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        }
    }

    capitalize(text: string) {
        return text
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    formatDate(date: string) {
        if (date) {
            const dt = new Date(date);
            const month = dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
            const day = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
            return day + '/' + month + '/' + dt.getFullYear();
        }
        return '';
    }
}
