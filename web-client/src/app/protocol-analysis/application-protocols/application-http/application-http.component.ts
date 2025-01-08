import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { colDef } from '@bhplugin/ng-datatable';
import { toggleAnimation } from 'src/app/shared/animations';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface HttpTrendingData {
    timestamp: number;
    count: number;
}

export interface HttpQueryResponse {
    total: number;
    hits: Array<{
        channelID: string;
        dstIP: string;
        dstPort: number;
        filePath: string;
        requestBodyLen: number;
        respFuids: string;
        respMimeTypes: string;
        responseBodyLen: number;
        srcIP: string;
        srcPort: number;
        statusCode: number;
        statusMsg: string;
        tags: string;
        timestamp: string;
        transDepth: number;
        ts: number;
        uid: string;
        version: number;
    }>;
}

@Component({
  selector: 'app-application-http',
  templateUrl: './application-http.component.html',
  styleUrl: './application-http.component.css',
  animations: [toggleAnimation],

})
export class ApplicationHttpComponent implements OnInit, OnDestroy {
    search = '';
    loading = false;
    chartLoading = false;
    currentPage = 1;
    pageSize = 10;
    total = 0;
    private refreshInterval: NodeJS.Timeout | undefined;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';

    cols = [
        { field: 'srcIP', title: 'Src.IP:Port', hide: false },
        { field: 'dstIP', title: 'Dst.IP:Port', hide: false },
        { field: 'statusCode', title: 'Status Code', hide: false },
        { field: 'statusMsg', title: 'Status Message', hide: false },
        { field: 'requestBodyLen', title: 'Request Length', hide: false },
        { field: 'responseBodyLen', title: 'Response Length', hide: false },
        { field: 'respMimeTypes', title: 'MIME Types', hide: false },
        { field: 'lastUpdateTime', title: 'Last Updated Time', hide: false },
        // 隐藏的列
        { field: 'channelID', title: 'Channel ID', hide: true },
        { field: 'filePath', title: 'File Path', hide: true },
        { field: 'respFuids', title: 'Response FUIDs', hide: true },
        { field: 'tags', title: 'Tags', hide: true },
        { field: 'transDepth', title: 'Trans Depth', hide: true },
        { field: 'uid', title: 'UID', hide: true },
        { field: 'version', title: 'Version', hide: true }
    ];

    rows: any[] = [];

    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadTrendingData();
        this.loadData();

        // 每分钟刷新一次趋势数据
        this.refreshInterval = setInterval(() => {
            this.loadTrendingData();
        }, 60000);
    }

    ngOnDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    loadTrendingData() {
        this.chartLoading = true;
        const endTime = Date.now();
        const startTime = endTime - (7 * 24 * 60 * 60 * 1000);

        this.http.get<HttpTrendingData[]>(`${environment.apiUrl}/es/trending`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: 'http-realtime',
                interval: '1h'
            }
        }).subscribe({
            next: (data) => {
                if (Array.isArray(data) && data.length > 0) {
                    const chartData = {
                        series: [{
                            name: 'HTTP Sessions',
                            data: data.map(item => ({
                                x: item.timestamp,
                                y: item.count
                            }))
                        }]
                    };
                    Object.assign(this.revenueChart, chartData);
                }
                this.chartLoading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error loading trending data:', error);
                this.chartLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadData() {
        this.loading = true;
        const endTime = Date.now();
        const startTime = endTime - (7 * 24 * 60 * 60 * 1000);

        this.http.get<HttpQueryResponse>(`${environment.apiUrl}/es/query`, {
            params: {
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                index: 'http-realtime',
                size: this.pageSize.toString(),
                from: ((this.currentPage - 1) * this.pageSize).toString()
            }
        }).subscribe({
            next: (response) => {
                this.rows = response.hits.map(hit => ({
                    srcIP: `${hit.srcIP}:${hit.srcPort}`,
                    dstIP: `${hit.dstIP}:${hit.dstPort}`,
                    statusCode: hit.statusCode,
                    statusMsg: hit.statusMsg,
                    requestBodyLen: hit.requestBodyLen,
                    responseBodyLen: hit.responseBodyLen,
                    respMimeTypes: hit.respMimeTypes,
                    lastUpdateTime: this.formatDate(hit.timestamp),
                    channelID: hit.channelID,
                    filePath: hit.filePath,
                    respFuids: hit.respFuids,
                    tags: hit.tags,
                    transDepth: hit.transDepth,
                    uid: hit.uid,
                    version: hit.version
                }));
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

    exportTable(type: string) {
      let columns: any = this.cols.map((d: { field: any }) => {
        return d.field;
      });
  
      let records = this.rows;
      let filename = 'table';
  
      let newVariable: any;
      newVariable = window.navigator;
  
      if (type == 'csv') {
        let coldelimiter = ';';
        let linedelimiter = '\n';
        let result = columns
          .map((d: any) => {
            return this.capitalize(d);
          })
          .join(coldelimiter);
        result += linedelimiter;
        records.map((item: { [x: string]: any }) => {
          columns.map((d: any, index: number) => {
            if (index > 0) {
              result += coldelimiter;
            }
            let val = item[d] ? item[d] : '';
            result += val;
          });
          result += linedelimiter;
        });
  
        if (result == null) return;
        if (!result.match(/^data:text\/csv/i) && !newVariable.msSaveOrOpenBlob) {
          var data = 'data:application/csv;charset=utf-8,' + encodeURIComponent(result);
          var link = document.createElement('a');
          link.setAttribute('href', data);
          link.setAttribute('download', filename + '.csv');
          link.click();
        } else {
          var blob = new Blob([result]);
          if (newVariable.msSaveOrOpenBlob) {
            newVariable.msSaveBlob(blob, filename + '.csv');
          }
        }
      } else if (type == 'print') {
        var rowhtml = '<p>' + filename + '</p>';
        rowhtml +=
          '<table style="width: 100%; " cellpadding="0" cellcpacing="0"><thead><tr style="color: #515365; background: #eff5ff; -webkit-print-color-adjust: exact; print-color-adjust: exact; "> ';
        columns.map((d: any) => {
          rowhtml += '<th>' + this.capitalize(d) + '</th>';
        });
        rowhtml += '</tr></thead>';
        rowhtml += '<tbody>';
  
        records.map((item: { [x: string]: any }) => {
          rowhtml += '<tr>';
          columns.map((d: any) => {
            let val = item[d] ? item[d] : '';
            rowhtml += '<td>' + val + '</td>';
          });
          rowhtml += '</tr>';
        });
        rowhtml +=
          '<style>body {font-family:Arial; color:#495057;}p{text-align:center;font-size:18px;font-weight:bold;margin:15px;}table{ border-collapse: collapse; border-spacing: 0; }th,td{font-size:12px;text-align:left;padding: 4px;}th{padding:8px 4px;}tr:nth-child(2n-1){background:#f7f7f7; }</style>';
        rowhtml += '</tbody></table>';
        var winPrint: any = window.open('', '', 'left=0,top=0,width=1000,height=600,toolbar=0,scrollbars=0,status=0');
        winPrint.document.write('<title>' + filename + '</title>' + rowhtml);
        winPrint.document.close();
        winPrint.focus();
        winPrint.onafterprint = () => {
          winPrint.close();
        };
        winPrint.print();
      } else if (type == 'txt') {
        let coldelimiter = ',';
        let linedelimiter = '\n';
        let result = columns
          .map((d: any) => {
            return this.capitalize(d);
          })
          .join(coldelimiter);
        result += linedelimiter;
        records.map((item: { [x: string]: any }) => {
          columns.map((d: any, index: number) => {
            if (index > 0) {
              result += coldelimiter;
            }
            let val = item[d] ? item[d] : '';
            result += val;
          });
          result += linedelimiter;
        });
  
        if (result == null) return;
        if (!result.match(/^data:text\/txt/i) && !newVariable.msSaveOrOpenBlob) {
          var data = 'data:application/txt;charset=utf-8,' + encodeURIComponent(result);
          var link = document.createElement('a');
          link.setAttribute('href', data);
          link.setAttribute('download', filename + '.txt');
          link.click();
        } else {
          var blob = new Blob([result]);
          if (newVariable.msSaveOrOpenBlob) {
            newVariable.msSaveBlob(blob, filename + '.txt');
          }
        }
      }
    }
  
    excelColumns() {
      return {
        Id: 'id',
        FirstName: 'firstName',
        LastName: 'lastName',
        Company: 'company',
        Age: 'age',
        'Start Date': 'dob',
        Email: 'email',
        'Phone No.': 'phone',
      };
    }
  
    excelItems() {
      return this.rows;
    }
  
    capitalize(text: string) {
      return text
        .replace('_', ' ')
        .replace('-', ' ')
        .toLowerCase()
        .split(' ')
        .map((s: string) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
    }
  
    formatDate(date: string) {
        if (date) {
            const dt = new Date(date);
            return dt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        }
        return '';
    }
  
    updateColumn(col: colDef) {
      // col.hide = !col.hide;
      this.cols = [...this.cols]; // Create a new reference of the array
  }
  
    revenueChart: any = {
        series: [{
            name: 'HTTP Sessions',
            data: []
        }],
        chart: {
            height: 300,
            type: 'line',
            animations: {
                enabled: true
            },
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
            type: 'datetime',
            labels: {
                datetimeFormatter: {
                    year: 'yyyy',
                    month: 'MMM \'yy',
                    day: 'dd MMM',
                    hour: 'HH:mm'
                },
                formatter: function(value: string) {
                    const date = new Date(Number(value));
                    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                }
            }
        },
        yaxis: {
            title: {
                text: 'HTTP Sessions Count'
            }
        },
        grid: {
            borderColor: '#e0e6ed'
        },
        tooltip: {
            x: {
                formatter: function(value: number) {
                    const date = new Date(value);
                    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                }
            },
            theme: 'dark'
        },
        markers: {
            size: 4
        },
        legend: {
            show: true
        },
        fill: {
            type: 'solid'
        },
        noData: {
            text: 'Loading...',
            align: 'center',
            verticalAlign: 'middle',
            style: {
                fontSize: '16px'
            }
        }
    };

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
            this.loadData();
        }
    }

    onPageSizeChange(event: any) {
        console.log('Page size changed:', event);
        if (this.pageSize !== event) {
            this.pageSize = event;
            this.currentPage = 1;
            this.loadData();
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
        this.loadData();
    }

    onSearchChange(event: any) {
        console.log('Search changed:', event);
        if (this.search !== event) {
            this.search = event;
            this.currentPage = 1;
            this.loadData();
        }
    }
}
  