import { Component, OnInit } from '@angular/core';
import { an } from '@fullcalendar/core/internal-common';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { DashboardDataService, ProtocolTrendsResponse, TrendingData } from '../services/dashboard-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  store: any;
  totalVisit: any;
  paidVisit: any;
  uniqueVisitor: any;
  followers: any;
  referral: any;
  engagement: any;
  salesByCategory: any;
  dailySales: any;
  totalOrders: any;
  isLoading = true;
  revenueChart: any;
  protocolTrending: any;
  icmpTrending: any;
  tcpTrending: any;
  udpTrending: any;
  totalFlowCount: number = 0; // 新增属性存储总流量计数

  constructor(public storeData: Store<any>, private dashboardDataService: DashboardDataService, private translate: TranslateService) {
    this.initStore();
    this.isLoading = false;
  }

  ngOnInit(): void {
    this.loadProtocolTrendsData();
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        const hasChangeTheme = this.store?.theme !== d?.theme;
        const hasChangeLayout = this.store?.layout !== d?.layout;
        const hasChangeMenu = this.store?.menu !== d?.menu;
        const hasChangeSidebar = this.store?.sidebar !== d?.sidebar;

        this.store = d;

        if (hasChangeTheme || hasChangeLayout || hasChangeMenu || hasChangeSidebar) {
          if (this.isLoading || hasChangeTheme) {
            this.initCharts(); //init charts
          } else {
            setTimeout(() => {
              this.initCharts(); // refresh charts
            }, 300);
          }
        }
      });
  }

  loadProtocolTrendsData() {
    // 获取最近24小时的数据
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24小时前

    const startTimeTimestamp = startTime.getTime();
    const endTimeTimestamp = endTime.getTime();

    this.dashboardDataService.getProtocolTrends(startTimeTimestamp, endTimeTimestamp, '1h')
      .subscribe({
        next: (data: ProtocolTrendsResponse) => {
          this.updateProtocolTrendingChart(data);
        },
        error: (error) => {
          console.error('Error loading protocol trends data:', error);
          // 如果API调用失败，设置默认值并使用模拟数据
          this.initCharts();
        }
      });
  }

  updateProtocolTrendingChart(data: ProtocolTrendsResponse) {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const isRtl = this.store?.rtlClass === 'rtl' ? true : false;

    // 转换数据格式为ApexCharts需要的格式
    const httpData = data.HTTP.map(item => [item.timestamp, item.count]);
    const dnsData = data.DNS.map(item => [item.timestamp, item.count]);
    const othersData = data.Others.map(item => [item.timestamp, item.count]);

    // 计算所有协议的总流量数
    const httpTotal = data.HTTP.reduce((sum, item) => sum + item.count, 0);
    const dnsTotal = data.DNS.reduce((sum, item) => sum + item.count, 0);
    const othersTotal = data.Others.reduce((sum, item) => sum + item.count, 0);
    this.totalFlowCount = httpTotal + dnsTotal + othersTotal;

    this.protocolTrending = {
      chart: {
        height: 350,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        curve: 'smooth',
        width: 2,
        lineCap: 'square',
      },
      dropShadow: {
        enabled: true,
        opacity: 0.2,
        blur: 10,
        left: -7,
        top: 22,
      },
      colors: isDark ? ['#2196f3', '#e7515a', '#00ab55'] : ['#1b55e2', '#e7515a', '#00ab55'],
      markers: {
        size: 0,
        colors: ['#1b55e2', '#e7515a', '#00ab55'],
        strokeColor: '#fff',
        strokeWidth: 2,
        shape: 'circle',
        hover: {
          size: 6,
          sizeOffset: 3,
        },
      },
      xaxis: {
        type: 'datetime',
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        crosshairs: {
          show: true,
        },
        labels: {
          offsetX: isRtl ? 2 : 0,
          offsetY: 5,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-xaxis-title',
          },
          formatter: (value: number) => {
            const date = new Date(value);
            const formatter = new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            return formatter.format(date);
          },
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => {
            return value / 1000 + "K";
          },
          offsetX: isRtl ? -30 : -10,
          offsetY: 0,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-yaxis-title',
          },
        },
        opposite: isRtl ? true : false,
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
        padding: {
          top: 0,
          right: 20,
          bottom: 0,
          left: 0,
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '16px',
        markers: {
          width: 10,
          height: 10,
          offsetX: -2,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
      },
      tooltip: {
        marker: {
          show: true,
        },
        x: {
          show: false,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: false,
          opacityFrom: isDark ? 0.19 : 0.28,
          opacityTo: 0.05,
          stops: isDark ? [100, 100] : [45, 100],
        },
      },
      series: [
        {
          name: 'HTTP',
          data: httpData,
        },
        {
          name: 'DNS',
          data: dnsData,
        },
        {
          name: 'Others',
          data: othersData,
        },
      ],
    };

    // 如果数据加载成功，初始化其他图表
    this.initCharts();
  }

  initCharts() {
    const isDark = this.store.theme === 'dark' || this.store.isDarkMode ? true : false;
    const isRtl = this.store.rtlClass === 'rtl' ? true : false;
    // revenue
    this.revenueChart = {
      chart: {
        height: 200,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        curve: 'smooth',
        width: 2,
        lineCap: 'square',
      },
      dropShadow: {
        enabled: true,
        opacity: 0.2,
        blur: 10,
        left: -7,
        top: 22,
      },
      colors: isDark ? ['#2196f3', '#e7515a'] : ['#1b55e2', '#e7515a'],
      markers: {
        size: 6,  // 设置标记的大小
        colors: ['#1b55e2', '#e7515a'],  // 设置标记的颜色，可以设置为不同的颜色数组
        strokeColor: '#fff',  // 设置标记的边框颜色
        strokeWidth: 2,  // 设置边框宽度
        shape: 'circle',  // 设置标记的形状为圆形
        hover: {
          size: 8,  // 鼠标悬停时标记的大小
          sizeOffset: 3,  // 鼠标悬停时标记的大小偏移
        },
      },
      // labels: ['Jan', 'Feb', 'M  ar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      xaxis: {
        type: 'datetime',
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        crosshairs: {
          show: true,
        },
        labels: {
          offsetX: isRtl ? 2 : 0,
          offsetY: 5,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-xaxis-title',
          },
          formatter: (value: number) => {
            // 使用固定格式化的日期
            const date = new Date(value);
            const formatter = new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            return formatter.format(date); // 返回固定格式
          },
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => {
            return parseInt(value * 100 + "") + '%';
          },
          offsetX: isRtl ? -30 : -10,
          offsetY: 0,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-yaxis-title',
          },
        },
        opposite: isRtl ? true : false,
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
        padding: {
          top: 0,
          right: 20,
          bottom: 0,
          left: 0,
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '16px',
        markers: {
          width: 10,
          height: 10,
          offsetX: -2,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
      },
      tooltip: {
        marker: {
          show: true,
        },
        x: {
          show: false,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: !1,
          opacityFrom: isDark ? 0.19 : 0.28,
          opacityTo: 0.05,
          stops: isDark ? [100, 100] : [45, 100],
        },
      },
      series: [
        {
          name: 'Channel 0 Utilization',
          data: [
            [1609459200000, 0.1], // 时间戳，收入
            [1612137600000, 0.2],
            [1614556800000, 0.5],
            [1617235200000, 0.8],
            [1619827200000, 0.3],
            [1622505600000, 0.6],
            [1625097600000, 0.5],
            [1627776000000, 0.9],
            [1630454400000, 0.7],
            [1633046400000, 0.4],
            [1635724800000, 0.8],
            [1638316800000, 0.6],
          ],
        },
        {
          name: 'Channel 1 Utilization',
          data: [
            [1609459200000, 0.2], // 时间戳，支出
            [1612137600000, 0.3],
            [1614556800000, 0.1],
            [1617235200000, 0.5],
            [1619827200000, 0.2],
            [1622505600000, 0.7],
            [1625097600000, 0.8],
            [1627776000000, 0.5],
            [1630454400000, 0.1],
            [1633046400000, 0.4],
            [1635724800000, 0.3],
            [1638316800000, 0.8],
          ],
        },
      ],
    };
    // statistics
    this.totalVisit = {
      chart: {
        height: 58,
        type: 'line',
        fontFamily: 'Nunito, sans-serif',
        sparkline: {
          enabled: true,
        },
        dropShadow: {
          enabled: true,
          blur: 3,
          color: '#009688',
          opacity: 0.4,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: ['#009688'],
      grid: {
        padding: {
          top: 5,
          bottom: 5,
          left: 5,
          right: 5,
        },
      },
      tooltip: {
        x: {
          show: false,
        },
        y: {
          title: {
            formatter: (val: any) => {
              return '';
            },
          },
        },
      },
      series: [
        {
          data: [21, 9, 36, 12, 44, 25, 59, 41, 66, 25],
        },
      ],
    };

    //paid visit
    this.paidVisit = {
      chart: {
        height: 58,
        type: 'line',
        fontFamily: 'Nunito, sans-serif',
        sparkline: {
          enabled: true,
        },
        dropShadow: {
          enabled: true,
          blur: 3,
          color: '#e2a03f',
          opacity: 0.4,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: ['#e2a03f'],
      grid: {
        padding: {
          top: 5,
          bottom: 5,
          left: 5,
          right: 5,
        },
      },
      tooltip: {
        x: {
          show: false,
        },
        y: {
          title: {
            formatter: (val: any) => {
              return '';
            },
          },
        },
      },
      series: [
        {
          data: [22, 19, 30, 47, 32, 44, 34, 55, 41, 69],
        },
      ],
    };

    // unique visitors
    this.uniqueVisitor = {
      chart: {
        height: 360,
        type: 'bar',
        fontFamily: 'Nunito, sans-serif',
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 2,
        colors: ['transparent'],
      },
      colors: ['#5c1ac3', '#ffbb44'],
      dropShadow: {
        enabled: true,
        blur: 3,
        color: '#515365',
        opacity: 0.4,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 10,
          borderRadiusApplication: 'end',
        },
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px',
        itemMargin: {
          horizontal: 8,
          vertical: 8,
        },
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        padding: {
          left: 20,
          right: 20,
        },
      },
      xaxis: {
        categories: ['HTTP', 'DNS', 'SMTP', 'HTTPS ', 'FTP', 'SFTP', 'POP3', 'IMAP', 'TCP', 'UDP', 'Other'],
        axisBorder: {
          show: true,
          color: isDark ? '#3b3f5c' : '#e0e6ed',
        },
      },
      yaxis: {
        tickAmount: 6,
        opposite: isRtl ? true : false,
        labels: {
          offsetX: isRtl ? -10 : 0,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: isDark ? 'dark' : 'light',
          type: 'vertical',
          shadeIntensity: 0.3,
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.8,
          stops: [0, 100],
        },
      },
      tooltip: {
        marker: {
          show: true,
        },
        y: {
          formatter: (val: any) => {
            return val;
          },
        },
      },
      series: [
        {
          name: 'Count',
          data: [91, 76, 85, 101, 98, 87, 105, 91, 114, 94, 66],
        },
        {
          name: 'Alarms',
          data: [58, 44, 55, 57, 56, 61, 58, 63, 60, 66, 56],
        },
      ],
    };

    // sales by category
    this.salesByCategory = {
      chart: {
        type: 'donut',
        height: 460,
        fontFamily: 'Nunito, sans-serif',
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 25,
        colors: isDark ? '#0e1726' : '#fff',
      },
      colors: isDark ? ['#5c1ac3', '#e2a03f', '#e7515a', '#00ab55', '#e2a03f', '#4361ee'] : ['#e2a03f', '#5c1ac3', '#e7515a', '#00ab55', '#4361ee', '#e2a03f'],
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px',
        markers: {
          width: 10,
          height: 10,
          offsetX: -2,
        },
        height: 50,
        offsetY: 20,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            background: 'transparent',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '29px',
                offsetY: -10,
              },
              value: {
                show: true,
                fontSize: '26px',
                color: isDark ? '#bfc9d4' : undefined,
                offsetY: 16,
                formatter: (val: any) => {
                  return val;
                },
              },
              total: {
                show: true,
                label: this.translate.instant('Total'),
                color: '#888ea8',
                fontSize: '29px',
                formatter: (w: any) => {
                  return w.globals.seriesTotals.reduce(function (a: any, b: any) {
                    return a + b;
                  }, 0);
                },
              },
            },
          },
        },
      },
      labels: ['HTTP', 'DNS', 'DHCP', 'Others'],
      states: {
        hover: {
          filter: {
            type: 'none',
            value: 0.15,
          },
        },
        active: {
          filter: {
            type: 'none',
            value: 0.15,
          },
        },
      },
      series: [985, 737, 270, 300],
    };

    // followers
    this.followers = {
      chart: {
        height: 176,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        sparkline: {
          enabled: true,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: ['#4361ee'],
      grid: {
        padding: {
          top: 5,
        },
      },
      yaxis: {
        show: false,
      },
      tooltip: {
        x: {
          show: false,
        },
        y: {
          title: {
            formatter: (val: any) => {
              return '';
            },
          },
        },
      },
      fill: isDark
        ? null
        : {
          type: 'gradient',
          gradient: {
            type: 'vertical',
            shadeIntensity: 1,
            inverseColors: !1,
            opacityFrom: 0.3,
            opacityTo: 0.05,
            stops: [100, 100],
          },
        },
      series: [
        {
          data: [38, 60, 38, 52, 36, 40, 28],
        },
      ],
    };

    // referral
    this.referral = {
      chart: {
        height: 176,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        sparkline: {
          enabled: true,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: ['#e7515a'],
      grid: {
        padding: {
          top: 5,
        },
      },
      yaxis: {
        show: false,
      },
      tooltip: {
        x: {
          show: false,
        },
        y: {
          title: {
            formatter: (val: any) => {
              return '';
            },
          },
        },
      },
      fill: isDark
        ? null
        : {
          type: 'gradient',
          gradient: {
            type: 'vertical',
            shadeIntensity: 1,
            inverseColors: !1,
            opacityFrom: 0.3,
            opacityTo: 0.05,
            stops: [100, 100],
          },
        },
      series: [
        {
          data: [60, 28, 52, 38, 40, 36, 38],
        },
      ],
    };

    // daily sales
    this.dailySales = {
      chart: {
        height: 180,
        type: 'bar',
        fontFamily: 'Nunito, sans-serif',
        toolbar: {
          show: false,
        },
        stacked: true,
        stackType: '100%',
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 1,
      },
      colors: ['#e2a03f', '#00ab55'],
      responsive: [
        {
          breakpoint: 480,
          options: {
            legend: {
              position: 'bottom',
              offsetX: -10,
              offsetY: 0,
            },
          },
        },
      ],
      xaxis: {
        labels: {
          show: true,
        },
        categories: ['TCP', 'UDP', 'ICMP', 'IGMP', 'FTP', 'IMAP', 'Others'],
      },
      yaxis: {
        show: false,
      },
      fill: {
        opacity: 1,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '25%',
        },
      },
      legend: {
        show: false,
      },
      grid: {
        show: false,
        xaxis: {
          lines: {
            show: false,
          },
        },
        padding: {
          top: 10,
          right: -20,
          bottom: -10,
          left: -20,
        },
      },
      series: [
        {
          name: 'Bytes',
          data: [44, 55, 41, 67, 22, 43, 21],
        },
        {
          name: 'Packets',
          data: [13, 23, 20, 8, 13, 27, 33],
        },
      ],
    };

    // engagement
    this.engagement = {
      chart: {
        height: 176,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        sparkline: {
          enabled: true,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: ['#1abc9c'],
      grid: {
        padding: {
          top: 5,
        },
      },
      yaxis: {
        show: false,
      },
      tooltip: {
        x: {
          show: false,
        },
        y: {
          title: {
            formatter: (val: any) => {
              return '';
            },
          },
        },
      },
      fill: isDark
        ? null
        : {
          type: 'gradient',
          gradient: {
            type: 'vertical',
            shadeIntensity: 1,
            inverseColors: !1,
            opacityFrom: 0.3,
            opacityTo: 0.05,
            stops: [100, 100],
          },
        },
      series: [
        {
          name: 'Sales',
          data: [28, 50, 36, 60, 38, 52, 38],
        },
      ],
    };

    // total orders
    this.totalOrders = {
      chart: {
        height: 290,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        sparkline: {
          enabled: true,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: isDark ? ['#00ab55'] : ['#00ab55'],
      labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      yaxis: {
        min: 0,
        show: false,
      },
      grid: {
        padding: {
          top: 125,
          right: 0,
          bottom: 0,
          left: 0,
        },
      },
      fill: {
        opacity: 1,
        type: 'gradient',
        gradient: {
          type: 'vertical',
          shadeIntensity: 1,
          inverseColors: !1,
          opacityFrom: 0.3,
          opacityTo: 0.05,
          stops: [100, 100],
        },
      },
      tooltip: {
        x: {
          show: false,
        },
      },
      series: [
        {
          name: 'Alarm',
          data: [28, 40, 36, 52, 38, 60, 38, 52, 36, 40],
        },
      ],
    };
    // protocolTrending
    // this.protocolTrending = {
    //   chart: {
    //     height: 350,
    //     type: 'area',
    //     fontFamily: 'Nunito, sans-serif',
    //     zoom: {
    //       enabled: false,
    //     },
    //     toolbar: {
    //       show: false,
    //     },
    //   },
    //   dataLabels: {
    //     enabled: false,
    //   },
    //   stroke: {
    //     show: true,
    //     curve: 'smooth',
    //     width: 2,
    //     lineCap: 'square',
    //   },
    //   dropShadow: {
    //     enabled: true,
    //     opacity: 0.2,
    //     blur: 10,
    //     left: -7,
    //     top: 22,
    //   },
    //   colors: isDark ? ['#2196f3', '#e7515a', '#00ab55'] : ['#1b55e2', '#e7515a', '#00ab55'],
    //   markers: {
    //     size: 0,  // 设置标记的大小
    //     colors: ['#1b55e2', '#e7515a', '#00ab55'],  // 设置标记的颜色，可以设置为不同的颜色数组
    //     strokeColor: '#fff',  // 设置标记的边框颜色
    //     strokeWidth: 2,  // 设置边框宽度
    //     shape: 'circle',  // 设置标记的形状为圆形
    //     hover: {
    //       size: 6,  // 鼠标悬停时标记的大小
    //       sizeOffset: 3,  // 鼠标悬停时标记的大小偏移
    //     },
    //   },
    //   // labels: ['Jan', 'Feb', 'M  ar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    //   xaxis: {
    //     type: 'datetime',
    //     axisBorder: {
    //       show: false,
    //     },
    //     axisTicks: {
    //       show: false,
    //     },
    //     crosshairs: {
    //       show: true,
    //     },
    //     labels: {
    //       offsetX: isRtl ? 2 : 0,
    //       offsetY: 5,
    //       style: {
    //         fontSize: '12px',
    //         cssClass: 'apexcharts-xaxis-title',
    //       },
    //       formatter: (value: number) => {
    //         // 使用固定格式化的日期
    //         const date = new Date(value);
    //         const formatter = new Intl.DateTimeFormat('en-GB', {
    //           day: '2-digit',
    //           month: 'short',
    //           year: 'numeric'
    //         });
    //         return formatter.format(date); // 返回固定格式
    //       },
    //     },
    //   },
    //   yaxis: {
    //     tickAmount: 5,
    //     labels: {
    //       formatter: (value: number) => {
    //         return value / 1000 + "KB";
    //       },
    //       offsetX: isRtl ? -30 : -10,
    //       offsetY: 0,
    //       style: {
    //         fontSize: '12px',
    //         cssClass: 'apexcharts-yaxis-title',
    //       },
    //     },
    //     opposite: isRtl ? true : false,
    //   },
    //   grid: {
    //     borderColor: isDark ? '#191e3a' : '#e0e6ed',
    //     strokeDashArray: 5,
    //     xaxis: {
    //       lines: {
    //         show: true,
    //       },
    //     },
    //     yaxis: {
    //       lines: {
    //         show: false,
    //       },
    //     },
    //     padding: {
    //       top: 0,
    //       right: 20,
    //       bottom: 0,
    //       left: 0,
    //     },
    //   },
    //   legend: {
    //     position: 'top',
    //     horizontalAlign: 'right',
    //     fontSize: '16px',
    //     markers: {
    //       width: 10,
    //       height: 10,
    //       offsetX: -2,
    //     },
    //     itemMargin: {
    //       horizontal: 10,
    //       vertical: 5,
    //     },
    //   },
    //   tooltip: {
    //     marker: {
    //       show: true,
    //     },
    //     x: {
    //       show: false,
    //     },
    //   },
    //   fill: {
    //     type: 'gradient',
    //     gradient: {
    //       shadeIntensity: 1,
    //       inverseColors: !1,
    //       opacityFrom: isDark ? 0.19 : 0.28,
    //       opacityTo: 0.05,
    //       stops: isDark ? [100, 100] : [45, 100],
    //     },
    //   },
    //   series: [
    //     {
    //       name: 'HTTP',
    //       data: [
    //         [1609459200000, 1000], // 时间戳，收入
    //         [1612137600000, 2000],
    //         [1614556800000, 5000],
    //         [1617235200000, 8000],
    //         [1619827200000, 3000],
    //         [1622505600000, 6000],
    //         [1625097600000, 5000],
    //         [1627776000000, 9000],
    //         [1630454400000, 7000],
    //         [1633046400000, 4000],
    //         [1635724800000, 8000],
    //         [1638316800000, 6000],
    //       ],
    //     },
    //     {
    //       name: 'DNS',
    //       data: [
    //         [1609459200000, 2000], // 时间戳，支出
    //         [1612137600000, 3000],
    //         [1614556800000, 1000],
    //         [1617235200000, 5000],
    //         [1619827200000, 2000],
    //         [1622505600000, 7000],
    //         [1625097600000, 8000],
    //         [1627776000000, 5000],
    //         [1630454400000, 1000],
    //         [1633046400000, 4000],
    //         [1635724800000, 3000],
    //         [1638316800000, 8000],
    //       ],
    //     },
    //     {
    //       name: 'Others',
    //       data: [
    //         [1609459200000, 1000], // 时间戳，支出
    //         [1612137600000, 2000],
    //         [1614556800000, 5000],
    //         [1617235200000, 2000],
    //         [1619827200000, 3000],
    //         [1622505600000, 5000],
    //         [1625097600000, 6000],
    //         [1627776000000, 2000],
    //         [1630454400000, 3000],
    //         [1633046400000, 1000],
    //         [1635724800000, 2000],
    //         [1638316800000, 8000],
    //       ],
    //     },
    //   ],
    // };

    this.icmpTrending = {
      chart: {
        height: 350,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        curve: 'smooth',
        width: 2,
        lineCap: 'square',
      },
      dropShadow: {
        enabled: true,
        opacity: 0.2,
        blur: 10,
        left: -7,
        top: 22,
      },
      colors: isDark ? ['#2196f3', '#e7515a', '#00ab55'] : ['#1b55e2', '#e7515a', '#00ab55'],
      markers: {
        size: 0,  // 设置标记的大小
        colors: ['#1b55e2', '#e7515a', '#00ab55'],  // 设置标记的颜色，可以设置为不同的颜色数组
        strokeColor: '#fff',  // 设置标记的边框颜色
        strokeWidth: 2,  // 设置边框宽度
        shape: 'circle',  // 设置标记的形状为圆形
        hover: {
          size: 6,  // 鼠标悬停时标记的大小
          sizeOffset: 3,  // 鼠标悬停时标记的大小偏移
        },
      },
      // labels: ['Jan', 'Feb', 'M  ar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      xaxis: {
        type: 'datetime',
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        crosshairs: {
          show: true,
        },
        labels: {
          offsetX: isRtl ? 2 : 0,
          offsetY: 5,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-xaxis-title',
          },
          formatter: (value: number) => {
            // 使用固定格式化的日期
            const date = new Date(value);
            const formatter = new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            return formatter.format(date); // 返回固定格式
          },
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => {
            return value / 1000 + "KB";
          },
          offsetX: isRtl ? -30 : -10,
          offsetY: 0,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-yaxis-title',
          },
        },
        opposite: isRtl ? true : false,
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
        padding: {
          top: 0,
          right: 20,
          bottom: 0,
          left: 0,
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '16px',
        markers: {
          width: 10,
          height: 10,
          offsetX: -2,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
      },
      tooltip: {
        marker: {
          show: true,
        },
        x: {
          show: false,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: !1,
          opacityFrom: isDark ? 0.19 : 0.28,
          opacityTo: 0.05,
          stops: isDark ? [100, 100] : [45, 100],
        },
      },
      series: [
        {
          name: 'ICMP',
          data: [
            [1609459200000, 1000], // 时间戳，收入
            [1612137600000, 2000],
            [1614556800000, 5000],
            [1617235200000, 8000],
            [1619827200000, 3000],
            [1622505600000, 6000],
            [1625097600000, 5000],
            [1627776000000, 9000],
            [1630454400000, 7000],
            [1633046400000, 4000],
            [1635724800000, 8000],
            [1638316800000, 6000],
          ],
        },


      ],
    };
    this.udpTrending = {
      chart: {
        height: 350,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        curve: 'smooth',
        width: 2,
        lineCap: 'square',
      },
      dropShadow: {
        enabled: true,
        opacity: 0.2,
        blur: 10,
        left: -7,
        top: 22,
      },
      colors: isDark ? ['#2196f3', '#e7515a', '#00ab55'] : ['#1b55e2', '#e7515a', '#00ab55'],
      markers: {
        size: 0,  // 设置标记的大小
        colors: ['#1b55e2', '#e7515a', '#00ab55'],  // 设置标记的颜色，可以设置为不同的颜色数组
        strokeColor: '#fff',  // 设置标记的边框颜色
        strokeWidth: 2,  // 设置边框宽度
        shape: 'circle',  // 设置标记的形状为圆形
        hover: {
          size: 6,  // 鼠标悬停时标记的大小
          sizeOffset: 3,  // 鼠标悬停时标记的大小偏移
        },
      },
      // labels: ['Jan', 'Feb', 'M  ar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      xaxis: {
        type: 'datetime',
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        crosshairs: {
          show: true,
        },
        labels: {
          offsetX: isRtl ? 2 : 0,
          offsetY: 5,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-xaxis-title',
          },
          formatter: (value: number) => {
            // 使用固定格式化的日期
            const date = new Date(value);
            const formatter = new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            return formatter.format(date); // 返回固定格式
          },
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => {
            return value / 1000 + "KB";
          },
          offsetX: isRtl ? -30 : -10,
          offsetY: 0,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-yaxis-title',
          },
        },
        opposite: isRtl ? true : false,
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
        padding: {
          top: 0,
          right: 20,
          bottom: 0,
          left: 0,
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '16px',
        markers: {
          width: 10,
          height: 10,
          offsetX: -2,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
      },
      tooltip: {
        marker: {
          show: true,
        },
        x: {
          show: false,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: !1,
          opacityFrom: isDark ? 0.19 : 0.28,
          opacityTo: 0.05,
          stops: isDark ? [100, 100] : [45, 100],
        },
      },
      series: [
        {
          name: 'UDP',
          data: [
            [1609459200000, 1000], // 时间戳，收入
            [1612137600000, 2000],
            [1614556800000, 5000],
            [1617235200000, 8000],
            [1619827200000, 3000],
            [1622505600000, 6000],
            [1625097600000, 5000],
            [1627776000000, 9000],
            [1630454400000, 7000],
            [1633046400000, 4000],
            [1635724800000, 8000],
            [1638316800000, 6000],
          ],
        },


      ],
    };

    this.tcpTrending = {
      chart: {
        height: 350,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        curve: 'smooth',
        width: 2,
        lineCap: 'square',
      },
      dropShadow: {
        enabled: true,
        opacity: 0.2,
        blur: 10,
        left: -7,
        top: 22,
      },
      colors: isDark ? ['#2196f3', '#e7515a', '#00ab55'] : ['#1b55e2', '#e7515a', '#00ab55'],
      markers: {
        size: 0,  // 设置标记的大小
        colors: ['#1b55e2', '#e7515a', '#00ab55'],  // 设置标记的颜色，可以设置为不同的颜色数组
        strokeColor: '#fff',  // 设置标记的边框颜色
        strokeWidth: 2,  // 设置边框宽度
        shape: 'circle',  // 设置标记的形状为圆形
        hover: {
          size: 6,  // 鼠标悬停时标记的大小
          sizeOffset: 3,  // 鼠标悬停时标记的大小偏移
        },
      },
      // labels: ['Jan', 'Feb', 'M  ar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      xaxis: {
        type: 'datetime',
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        crosshairs: {
          show: true,
        },
        labels: {
          offsetX: isRtl ? 2 : 0,
          offsetY: 5,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-xaxis-title',
          },
          formatter: (value: number) => {
            // 使用固定格式化的日期
            const date = new Date(value);
            const formatter = new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            return formatter.format(date); // 返回固定格式
          },
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => {
            return value / 1000 + "KB";
          },
          offsetX: isRtl ? -30 : -10,
          offsetY: 0,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-yaxis-title',
          },
        },
        opposite: isRtl ? true : false,
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
        padding: {
          top: 0,
          right: 20,
          bottom: 0,
          left: 0,
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '16px',
        markers: {
          width: 10,
          height: 10,
          offsetX: -2,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
      },
      tooltip: {
        marker: {
          show: true,
        },
        x: {
          show: false,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: !1,
          opacityFrom: isDark ? 0.19 : 0.28,
          opacityTo: 0.05,
          stops: isDark ? [100, 100] : [45, 100],
        },
      },
      series: [
        {
          name: 'TCP',
          data: [
            [1609459200000, 1000], // 时间戳，收入
            [1612137600000, 2000],
            [1614556800000, 5000],
            [1617235200000, 8000],
            [1619827200000, 3000],
            [1622505600000, 6000],
            [1625097600000, 5000],
            [1627776000000, 9000],
            [1630454400000, 7000],
            [1633046400000, 4000],
            [1635724800000, 8000],
            [1638316800000, 6000],
          ],
        },
        {
          name: 'UDP',
          data: [
            [1609459200000, 2000], // 时间戳，支出
            [1612137600000, 3000],
            [1614556800000, 1000],
            [1617235200000, 5000],
            [1619827200000, 2000],
            [1622505600000, 7000],
            [1625097600000, 8000],
            [1627776000000, 5000],
            [1630454400000, 1000],
            [1633046400000, 4000],
            [1635724800000, 3000],
            [1638316800000, 8000],
          ],
        },
        {
          name: 'ICMP',
          data: [
            [1609459200000, 1000], // 时间戳，支出
            [1612137600000, 2000],
            [1614556800000, 5000],
            [1617235200000, 2000],
            [1619827200000, 3000],
            [1622505600000, 5000],
            [1625097600000, 6000],
            [1627776000000, 2000],
            [1630454400000, 3000],
            [1633046400000, 1000],
            [1635724800000, 2000],
            [1638316800000, 8000],
          ],
        },
      ],
    };
  }

}
