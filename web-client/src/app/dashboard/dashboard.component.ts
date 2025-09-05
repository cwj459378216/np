import { Component, OnInit, OnDestroy } from '@angular/core';
import { an } from '@fullcalendar/core/internal-common';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { DashboardDataService, ProtocolTrendsResponse, TrendingData, BandwidthTrendsResponse, SystemInfo, ServiceNameAggregationResponse } from '../services/dashboard-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
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
  averageBandwidth: number = 0; // 新增属性存储平均带宽利用率

  // 系统信息属性
  systemInfo: SystemInfo | null = null;
  cpuUsage: number = 0;
  memoryUsage: number = 0;
  diskUsage: number = 0;

  // ServiceName聚合数据属性
  serviceNameData: ServiceNameAggregationResponse | null = null;

  // 缓存带宽数据属性
  private cachedBandwidthData: BandwidthTrendsResponse | null = null;

  // 定时器
  private systemInfoInterval: any;

  constructor(public storeData: Store<any>, private dashboardDataService: DashboardDataService, private translate: TranslateService) {
    this.initStore();
    this.isLoading = false;
  }

  ngOnInit(): void {
    this.loadProtocolTrendsData();
    this.loadBandwidthData();
    this.loadSystemInfo();
    this.loadServiceNameData();

    // 每30秒更新一次系统信息
    this.systemInfoInterval = setInterval(() => {
      this.loadSystemInfo();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.systemInfoInterval) {
      clearInterval(this.systemInfoInterval);
    }
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
            // 如果已有带宽数据，在主题切换时重新应用样式
            if (hasChangeTheme && this.cachedBandwidthData) {
              this.updateBandwidthChart(this.cachedBandwidthData);
            }
            // 如果已有ServiceName数据，在主题切换时重新应用样式
            if (hasChangeTheme && this.serviceNameData) {
              this.updateServiceNameChart(this.serviceNameData);
            }
          } else {
            setTimeout(() => {
              this.initCharts(); // refresh charts
              // 如果已有带宽数据，在主题切换时重新应用样式
              if (hasChangeTheme && this.cachedBandwidthData) {
                this.updateBandwidthChart(this.cachedBandwidthData);
              }
              // 如果已有ServiceName数据，在主题切换时重新应用样式
              if (hasChangeTheme && this.serviceNameData) {
                this.updateServiceNameChart(this.serviceNameData);
              }
            }, 300);
          }
        }
      });
  }

  loadSystemInfo() {
    this.dashboardDataService.getSystemInfo()
      .subscribe({
        next: (data: SystemInfo) => {
          this.systemInfo = data;
          this.cpuUsage = data.cpu.usage;
          this.memoryUsage = data.memory.usage;
          this.diskUsage = data.disk.usage;
        },
        error: (error) => {
          console.error('Error loading system info:', error);
          // 设置默认值
          this.cpuUsage = 65;
          this.memoryUsage = 40;
          this.diskUsage = 25;
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

  loadBandwidthData() {
    // 获取最近24小时的数据
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24小时前

    const startTimeTimestamp = startTime.getTime();
    const endTimeTimestamp = endTime.getTime();

    this.dashboardDataService.getBandwidthTrends(startTimeTimestamp, endTimeTimestamp, '1h')
      .subscribe({
        next: (data: BandwidthTrendsResponse) => {
          this.cachedBandwidthData = data; // 缓存数据
          this.updateBandwidthChart(data);
        },
        error: (error) => {
          console.error('Error loading bandwidth data:', error);
          // 如果API调用失败，使用默认带宽数据
          this.initDefaultBandwidthChart();
        }
      });
  }

  loadServiceNameData() {
    console.log('Loading service name data...');
    this.dashboardDataService.getServiceNameAggregation(10)
      .subscribe({
        next: (data: ServiceNameAggregationResponse) => {
          console.log('Service name data received:', data);
          this.serviceNameData = data;
          try {
            this.updateServiceNameChart(data);
            console.log('Service name chart updated');
          } catch (error) {
            console.error('Error updating service name chart:', error);
            // 如果图表更新失败，使用默认数据
            this.initDefaultServiceNameChart();
          }
        },
        error: (error) => {
          console.error('Error loading service name data:', error);
          // 如果API调用失败，使用默认数据
          this.initDefaultServiceNameChart();
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

  initDefaultBandwidthChart() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const isRtl = this.store?.rtlClass === 'rtl' ? true : false;

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
        size: 6,
        colors: ['#1b55e2', '#e7515a'],
        strokeColor: '#fff',
        strokeWidth: 2,
        shape: 'circle',
        hover: {
          size: 8,
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
            [1609459200000, 0.1],
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
            [1609459200000, 0.2],
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
    // 设置默认平均带宽
    this.averageBandwidth = 45.5;
  }

  private generateColors(count: number, isDark: boolean): string[] {
    const lightColors = ['#1b55e2', '#e7515a', '#00ab55', '#e2a03f', '#4361ee', '#5c1ac3', '#2196f3', '#ffbb44'];
    const darkColors = ['#2196f3', '#e7515a', '#00ab55', '#e2a03f', '#4361ee', '#5c1ac3', '#1b55e2', '#ffbb44'];

    const colors = isDark ? darkColors : lightColors;
    const result: string[] = [];

    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }

    return result;
  }

  updateServiceNameChart(data: ServiceNameAggregationResponse) {
    console.log('Updating service name chart with data:', data);

    // 数据验证
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error('Invalid service name data:', data);
      this.initDefaultServiceNameChart();
      return;
    }

    // 检查数据是否为空
    if (data.data.length === 0) {
      console.warn('Empty service name data received, using default chart');
      this.initDefaultServiceNameChart();
      return;
    }

    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;

    // 提取数据为ApexCharts格式
    const labels = data.data.map(item => {
      if (!item || typeof item.serviceName !== 'string') {
        console.warn('Invalid service name item:', item);
        return 'Unknown';
      }
      return item.serviceName;
    });

    const series = data.data.map(item => {
      if (!item || typeof item.count !== 'number') {
        console.warn('Invalid count item:', item);
        return 0;
      }
      // 确保返回的是数字类型
      return Number(item.count);
    });

    console.log('Chart labels:', labels);
    console.log('Chart series:', series);

    // 验证数据长度匹配
    if (labels.length !== series.length) {
      console.error('Labels and series length mismatch:', {
        labelsLength: labels.length,
        seriesLength: series.length,
        labels,
        series
      });
      this.initDefaultServiceNameChart();
      return;
    }

    // 验证数据不为空
    if (labels.length === 0 || series.length === 0) {
      console.warn('Empty data received, using default chart');
      this.initDefaultServiceNameChart();
      return;
    }

    this.salesByCategory = {
        chart: {
            type: 'donut',
            height: 520,
            fontFamily: 'Nunito, sans-serif',
        },
        dataLabels: { enabled: false },
        stroke: {
            show: true,
            width: 2,
            colors: [isDark ? '#0e1726' : '#fff'], // ✅ 改成数组
        },
        legend: {
            position: 'bottom',
            horizontalAlign: 'center',
            fontSize: '14px',
            markers: { width: 5, height: 5, offsetX: -2 },
            height: 80,
            offsetY: 10,
            itemMargin: { horizontal: 10, vertical: 8 },
        },
        plotOptions: {
            pie: {
            donut: {
                size: '65%',
                background: 'transparent',
                labels: {
                show: true,
                name: { show: true, fontSize: '29px', offsetY: -10 },
                value: {
                    show: true,
                    fontSize: '26px',
                    color: isDark ? '#bfc9d4' : undefined,
                    offsetY: 16,
                    formatter: (val: any) => val,
                },
                total: {
                    show: true,
                    label: this.translate.instant('Total'),
                    color: '#888ea8',
                    fontSize: '29px',
                    formatter: (w: any) =>
                    w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0),
                },
                },
            },
            },
        },
        states: {
            hover: { filter: { type: 'none', value: 0.15 } },
            active: { filter: { type: 'none', value: 0.15 } },
        },
        labels: labels,
        colors: isDark ? ['#5c1ac3', '#e2a03f', '#e7515a', '#00ab55', '#e2a03f', '#4361ee', '#e2a03f', '#e2a03f', '#e2a03f', '#e2a03f']
            : ['#e2a03f', '#5c1ac3', '#e7515a', '#00ab55', '#4361ee', '#e2a03f', '#e2a03f', '#e2a03f', '#e2a03f', '#e2a03f'],
        series: series,
        };

    // 验证最终的配置对象
    console.log('Final chart config labels:', this.salesByCategory.labels);
    console.log('Final chart config series:', this.salesByCategory.series);

    // 确保 series 是数字数组
    if (!Array.isArray(this.salesByCategory.series) ||
        this.salesByCategory.series.some((val: any) => typeof val !== 'number')) {
      console.error('Invalid series data for ApexCharts:', this.salesByCategory.series);
      // 使用默认数据
      this.initDefaultServiceNameChart();
      return;
    }

    // 确保 labels 是字符串数组
    if (!Array.isArray(this.salesByCategory.labels) ||
        this.salesByCategory.labels.some((val: any) => typeof val !== 'string')) {
      console.error('Invalid labels data for ApexCharts:', this.salesByCategory.labels);
      // 使用默认数据
      this.initDefaultServiceNameChart();
      return;
    }
  }

  initDefaultServiceNameChart() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    // 默认数据
    const defaultLabels = ['HTTP', 'HTTPS', 'DNS', 'FTP', 'SMTP', 'SSH', 'TCP', 'UDP', 'ICMP', 'Other'];
    const defaultSeries = [2803, 1900, 1245, 850, 750, 650, 1100, 950, 400, 300];

    this.salesByCategory = {
        chart: {
            type: 'donut',
            height: 460,
            fontFamily: 'Nunito, sans-serif',
        },
        dataLabels: { enabled: false },
        stroke: {
            show: true,
            width: 2,
            colors: [isDark ? '#0e1726' : '#fff'], // ✅ 改成数组
        },
        legend: {
            position: 'bottom',
            horizontalAlign: 'center',
            fontSize: '14px',
            markers: { width: 5, height: 5, offsetX: -2 },
            height: 80,
            offsetY: 10,
            itemMargin: { horizontal: 10, vertical: 8 },
        },
        plotOptions: {
            pie: {
            donut: {
                size: '65%',
                background: 'transparent',
                labels: {
                show: true,
                name: { show: true, fontSize: '29px', offsetY: -10 },
                value: {
                    show: true,
                    fontSize: '26px',
                    color: isDark ? '#bfc9d4' : undefined,
                    offsetY: 16,
                    formatter: (val: any) => val,
                },
                total: {
                    show: true,
                    label: this.translate.instant('Total'),
                    color: '#888ea8',
                    fontSize: '29px',
                    formatter: (w: any) =>
                    w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0),
                },
                },
            },
            },
        },
        states: {
            hover: { filter: { type: 'none', value: 0.15 } },
            active: { filter: { type: 'none', value: 0.15 } },
        },
        labels: defaultLabels,
        colors: isDark ? ['#5c1ac3', '#e2a03f', '#e7515a', '#00ab55', '#e2a03f', '#4361ee', '#e2a03f', '#e2a03f', '#e2a03f', '#e2a03f']
            : ['#e2a03f', '#5c1ac3', '#e7515a', '#00ab55', '#4361ee', '#e2a03f', '#e2a03f', '#e2a03f', '#e2a03f', '#e2a03f'],
        series: defaultSeries,
        };
  }

  updateBandwidthChartTheme() {
    if (!this.revenueChart) return;

    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const isRtl = this.store?.rtlClass === 'rtl' ? true : false;

    // 更新主题相关的配置
    this.revenueChart = {
      ...this.revenueChart,
      colors: this.generateColors(this.revenueChart.series?.length || 2, isDark),
      grid: {
        ...this.revenueChart.grid,
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
      },
      fill: {
        ...this.revenueChart.fill,
        gradient: {
          ...this.revenueChart.fill.gradient,
          opacityFrom: isDark ? 0.19 : 0.28,
          stops: isDark ? [100, 100] : [45, 100],
        }
      },
      yaxis: {
        ...this.revenueChart.yaxis,
        opposite: isRtl ? true : false,
        labels: {
          ...this.revenueChart.yaxis.labels,
          offsetX: isRtl ? -30 : -10,
        }
      },
      xaxis: {
        ...this.revenueChart.xaxis,
        labels: {
          ...this.revenueChart.xaxis.labels,
          offsetX: isRtl ? 2 : 0,
        }
      }
    };
  }

  updateBandwidthChart(data: BandwidthTrendsResponse) {
    // 数据验证：确保data是正确的格式
    if (!data || typeof data !== 'object') {
      console.error('Invalid bandwidth data format:', data);
      return;
    }

    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const isRtl = this.store?.rtlClass === 'rtl' ? true : false;

    // 获取所有channel的键并排序
    const channelKeys = Object.keys(data).sort((a, b) => {
      const aNum = parseInt(a.replace('channel', ''));
      const bNum = parseInt(b.replace('channel', ''));
      return aNum - bNum;
    });

    // 转换数据格式为ApexCharts需要的格式
    const series = channelKeys.map(channelKey => {
      const channelData = data[channelKey];

      // 验证channelData是数组
      if (!Array.isArray(channelData)) {
        console.error(`Channel data for ${channelKey} is not an array:`, channelData);
        return {
          name: `Channel ${channelKey.replace('channel', '')} Utilization`,
          data: []
        };
      }

      const processedData = channelData.map(item => [item.timestamp, item.count / 100]); // 转换回小数
      return {
        name: `Channel ${channelKey.replace('channel', '')} Utilization`,
        data: processedData
      };
    });

    // 计算平均带宽利用率
    const allUtilizations = Object.values(data).flat().map(item => item.count);
    this.averageBandwidth = allUtilizations.length > 0
      ? allUtilizations.reduce((sum, util) => sum + util, 0) / allUtilizations.length
      : 0;

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
      colors: this.generateColors(channelKeys.length, isDark),
      markers: {
        size: 6,
        colors: ['#1b55e2', '#e7515a'],
        strokeColor: '#fff',
        strokeWidth: 2,
        shape: 'circle',
        hover: {
          size: 8,
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
      series: series,
    };
  }

  initCharts() {
    const isDark = this.store.theme === 'dark' || this.store.isDarkMode ? true : false;
    const isRtl = this.store.rtlClass === 'rtl' ? true : false;

    // 如果还没有 revenueChart 数据（即带宽数据），则初始化默认的带宽图表
    if (!this.revenueChart) {
      this.initDefaultBandwidthChart();
    }

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

    // sales by category - 只有在没有真实数据时才初始化默认图表
    if (!this.salesByCategory || !this.serviceNameData) {
      this.initDefaultServiceNameChart();
    }

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
