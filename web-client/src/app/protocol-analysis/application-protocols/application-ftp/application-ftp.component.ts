import { Component } from '@angular/core';
import { colDef } from '@bhplugin/ng-datatable';
import { toggleAnimation } from 'src/app/shared/animations';

@Component({
  selector: 'app-application-ftp',
  templateUrl: './application-ftp.component.html',
  styleUrl: './application-ftp.component.css',
  animations: [toggleAnimation],

})
export class ApplicationFtpComponent {
  search = '';
  cols = [
    { field: 'srcIP', title: 'Src.IP:Port', hide: false },
    { field: 'dstIP', title: 'Dst.IP:Port', hide: false  },
    { field: 'webSite', title: 'Web Site', hide: false  },
    { field: 'responseDate', title: 'Response Data', hide: true  },
    { field: 'lastUpdateTime', title: 'Last Updated Time', hide: true  },
  ];

  rows = [
    {
      srcIP: "192.168.1.1:80",
      dstIP: "192.168.1.2:1110",
      webSite: "www.baidu.com",
      responseDate: "128kb",
      lastUpdateTime: "2019-09-09 12:00:00"
    },
    {
      srcIP: "192.168.1.1:80",
      dstIP: "192.168.1.2:1110",
      webSite: "www.baidu.com",
      responseDate: "128kb",
      lastUpdateTime: "2019-09-09 12:00:00"
    },
    {
      srcIP: "192.168.1.1:80",
      dstIP: "192.168.1.2:1110",
      webSite: "www.baidu.com",
      responseDate: "128kb",
      lastUpdateTime: "2019-09-09 12:00:00"
    },
    {
      srcIP: "192.168.1.1:80",
      dstIP: "192.168.1.2:1110",
      webSite: "www.baidu.com",
      responseDate: "128kb",
      lastUpdateTime: "2019-09-09 12:00:00"
    }, {
      srcIP: "192.168.1.1:80",
      dstIP: "192.168.1.2:1110",
      webSite: "www.baidu.com",
      responseDate: "128kb",
      lastUpdateTime: "2019-09-09 12:00:00"
    }
  ];
  jsonData = this.rows;
  ngOnInit() {
    this.jsonData = this.rows.map((obj: any) => {
      const newObj: any = {};
      this.cols.forEach((col) => {
        newObj[col.field] = obj[col.field];
      });
      return newObj;
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

  formatDate(date: any) {
    if (date) {
      const dt = new Date(date);
      const month = dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
      const day = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
      return day + '/' + month + '/' + dt.getFullYear();
    }
    return '';
  }

  updateColumn(col: colDef) {
    // col.hide = !col.hide;
    this.cols = [...this.cols]; // Create a new reference of the array
}
}
