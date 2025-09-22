import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import ApexCharts from 'apexcharts';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DashboardDataService, ProtocolTrendsResponse, TrendingData, BandwidthTrendsResponse, SystemInfo, ServiceNameAggregationResponse } from '../services/dashboard-data.service';
import { TimeRangeService, TimeRange } from '../services/time-range.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  // 模板引用，便于在需要时强制触发重绘
  @ViewChild('bandwidthChartRef') bandwidthChartRef?: ElementRef;
  @ViewChild('protocolTrendingChartRef') protocolTrendingChartRef?: ElementRef;
  @ViewChild('serviceNameChartRef') serviceNameChartRef?: ElementRef;
  @ViewChild('tcpTrendingChartRef') tcpTrendingChartRef?: ElementRef;
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
  networkProtocolFlowCount: number = 0; // 新增：网络协议趋势总流量计数

  // 资产表数据
  assets: import('../services/dashboard-data.service').AssetItem[] = [];
  // 告警表数据
  alarms: import('../services/dashboard-data.service').AlarmItem[] = [];

  // 系统信息属性
  systemInfo: SystemInfo | null = null;
  cpuUsage: number = 0;
  memoryUsage: number = 0;
  diskInfos: Array<{name: string, mountPoint: string, usage: number, total: number, used: number, free: number}> = [];

  // 颜色计算方法
  getUsageColor(usage: number): string {
    if (usage <= 30) {
      return '#10b981'; // 绿色
    } else if (usage <= 60) {
      return '#f59e0b'; // 黄色
    } else if (usage <= 80) {
      return '#f97316'; // 橙色
    } else {
      return '#ef4444'; // 红色
    }
  }

  getUsageGradient(usage: number): string {
    if (usage <= 30) {
      return 'from-[#10b981] to-[#34d399]'; // 绿色渐变
    } else if (usage <= 60) {
      return 'from-[#f59e0b] to-[#fbbf24]'; // 黄色渐变
    } else if (usage <= 80) {
      return 'from-[#f97316] to-[#fb923c]'; // 橙色渐变
    } else {
      return 'from-[#ef4444] to-[#f87171]'; // 红色渐变
    }
  }

  // ServiceName聚合数据属性
  serviceNameData: ServiceNameAggregationResponse | null = null;

  // 缓存带宽数据属性
  private cachedBandwidthData: BandwidthTrendsResponse | null = null;

  // 定时器
  private systemInfoInterval: any;

  // 时间范围订阅
  private timeRangeSubscription: Subscription = new Subscription();
  private currentTimeRange: TimeRange | null = null;

  // 语言切换订阅
  private languageSubscription: Subscription = new Subscription();

  constructor(public storeData: Store<any>, private dashboardDataService: DashboardDataService, private translate: TranslateService, private timeRangeService: TimeRangeService) {
    this.initStore();
    this.isLoading = false;
  }

  ngOnInit(): void {
    console.log('Dashboard component initializing...');

    // 订阅时间范围变化
    this.timeRangeSubscription = this.timeRangeService.timeRange$.subscribe(timeRange => {
      console.log('Dashboard received time range update:', timeRange);
      this.currentTimeRange = timeRange;
      this.loadDataForTimeRange(timeRange);
    });

    // 订阅语言切换变化
    this.languageSubscription = this.translate.onLangChange.subscribe(() => {
      console.log('Dashboard language changed, refreshing charts...');
      // 重新初始化图表以应用新的语言设置
      this.refreshChartsAfterLanguageChange();
    });

    // 初始化时间范围
    this.currentTimeRange = this.timeRangeService.getCurrentTimeRange();
    console.log('Dashboard initial time range:', this.currentTimeRange);

    // 确保在初始化时就加载数据
    if (this.currentTimeRange) {
      this.loadDataForTimeRange(this.currentTimeRange);
    } else {
      // 如果没有获取到时间范围，使用默认时间范围
      console.warn('No initial time range found, using default time range');
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 默认24小时
      const defaultTimeRange: TimeRange = {
        startTime,
        endTime,
        label: 'Last 24 Hours',
        value: '24h',
        filePath: undefined
      };
      this.currentTimeRange = defaultTimeRange;
      this.loadDataForTimeRange(defaultTimeRange);
    }

    this.loadSystemInfo();

    // 每30秒更新一次系统信息
    this.systemInfoInterval = setInterval(() => {
      this.loadSystemInfo();
    }, 30000);
  }

  // 视图挂载后兜底初始化，避免路由切换回来时三个图表对象尚未准备导致 *ngIf 不渲染
  ngAfterViewInit(): void {
    // 若数据尚未到达，先绘制默认图，提升首屏可见性
    if (!this.revenueChart) {
      this.initDefaultBandwidthChart();
    }
    if (!this.protocolTrending) {
      this.initDefaultProtocolTrendingChart();
    }
    if (!this.tcpTrending) {
      this.initDefaultNetworkProtocolChart();
    }
    if (!this.salesByCategory) {
      this.setEmptyServiceNameChart();
    }

    // 强制 ApexCharts 在路由切换后重新计算尺寸
    setTimeout(() => {
      this.ensureChartsVisibility();
    }, 0);
  }

  // 强制图表重绘，修复从其它页面切回后需要拖拽窗口才能显示的问题
  private ensureChartsVisibility(): void {
    try {
      // 1) 触发全局 resize（ApexCharts 会监听）
      window.dispatchEvent(new Event('resize'));

      // 2) 使用 ApexCharts.exec 针对具体图表触发重绘
      const ids = ['bandwidthChart', 'protocolTrendingChart', 'serviceNameChart', 'tcpTrendingChart'];
      ids.forEach((id) => {
        try {
          ApexCharts.exec(id, 'updateOptions', {} as any, false, true);
        } catch { /* 忽略单个 chart 的异常 */ }
      });
    } catch { /* 忽略 */ }
  }

  private loadNetworkProtocolTrends(startTimeTimestamp?: number, endTimeTimestamp?: number, interval: string = '1h', filePath?: string) {
    const endTime = endTimeTimestamp ? new Date(endTimeTimestamp) : new Date();
    const startTime = startTimeTimestamp ? new Date(startTimeTimestamp) : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const startTs = startTime.getTime();
    const endTs = endTime.getTime();

    this.dashboardDataService.getNetworkProtocolTrends(startTs, endTs, filePath, interval)
      .subscribe({
        next: (data) => {
          // 将返回的多协议数据映射为 series
          const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
          const isRtl = this.store?.rtlClass === 'rtl' ? true : false;
          const colors = isDark ? ['#1b55e2', '#e7515a', '#00ab55', '#e2a03f', '#4361ee', '#5c1ac3'] : ['#2196f3', '#e7515a', '#00ab55', '#e2a03f', '#4361ee', '#5c1ac3'];

          const series = Object.keys(data).map((key, idx) => ({
            name: key.toUpperCase(),
            data: (data as any)[key].map((item: any) => [item.timestamp, item.count])
          }));

          // 统计该时段内所有协议的总流量计数
          try {
            const total = Object.values(data as any)
              .flat()
              .reduce((acc: number, item: any) => acc + (typeof item?.count === 'number' ? item.count : 0), 0);
            this.networkProtocolFlowCount = total;
          } catch (e) {
            console.warn('Failed to compute networkProtocolFlowCount:', e);
            this.networkProtocolFlowCount = 0;
          }

          // 复用 tcpTrending 配置渲染该大图
          this.tcpTrending = {
            chart: { height: 350, type: 'area', fontFamily: 'Nunito, sans-serif', id: 'tcpTrendingChart', zoom: { enabled: false }, toolbar: { show: false } },
            dataLabels: { enabled: false },
            stroke: { show: true, curve: 'smooth', width: 2, lineCap: 'square' },
            dropShadow: { enabled: true, opacity: 0.2, blur: 10, left: -7, top: 22 },
            colors: colors.slice(0, series.length),
            markers: { size: 0, colors, strokeColor: '#fff', strokeWidth: 2, shape: 'circle', hover: { size: 6, sizeOffset: 3 } },
            xaxis: { type: 'datetime', axisBorder: { show: false }, axisTicks: { show: false }, crosshairs: { show: true }, labels: { offsetX: isRtl ? 2 : 0, offsetY: 5, style: { fontSize: '12px', cssClass: 'apexcharts-xaxis-title' }, formatter: (value: number) => this.formatChartLabel(value) } },
            yaxis: { tickAmount: 5, labels: { formatter: (v: number) => v.toString(), offsetX: isRtl ? -30 : -10, offsetY: 0, style: { fontSize: '12px', cssClass: 'apexcharts-yaxis-title' } }, opposite: isRtl ? true : false },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed', strokeDashArray: 5, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } }, padding: { top: 0, right: 20, bottom: 0, left: 0 } },
            legend: { position: 'top', horizontalAlign: 'right', fontSize: '16px', markers: { width: 10, height: 10, offsetX: -2 }, itemMargin: { horizontal: 10, vertical: 5 } },
            tooltip: { marker: { show: true }, x: { show: false } },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, inverseColors: false, opacityFrom: isDark ? 0.19 : 0.28, opacityTo: 0.05, stops: isDark ? [100, 100] : [45, 100] } },
            series
          };
          this.ensureChartsVisibility();
        },
        error: (err) => {
          console.error('Error loading network protocol trends:', err);
          // 提供默认的空图表
          this.initDefaultNetworkProtocolChart();
          this.ensureChartsVisibility();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.systemInfoInterval) {
      clearInterval(this.systemInfoInterval);
    }
    if (this.timeRangeSubscription) {
      this.timeRangeSubscription.unsubscribe();
    }
    if (this.languageSubscription) {
      this.languageSubscription.unsubscribe();
    }
  }

  // 语言切换后刷新图表
  private refreshChartsAfterLanguageChange(): void {
    console.log('Refreshing all charts after language change...');

    // 重新初始化所有图表（会应用新的主题和语言设置）
    this.initCharts();

    // 使用延迟来确保DOM更新完成后再刷新图表
    setTimeout(() => {
      // 如果有已加载的带宽数据，重新应用到图表
      if (this.cachedBandwidthData) {
        this.updateBandwidthChart(this.cachedBandwidthData);
      }

      // 如果有已加载的ServiceName数据，重新应用到图表（这会更新翻译的标签）
      if (this.serviceNameData) {
        this.updateServiceNameChart(this.serviceNameData);
      } else {
        // 如果没有数据，确保空图表也使用正确的翻译
        this.setEmptyServiceNameChart();
      }

      // 重新加载当前时间范围的数据以刷新所有图表
      if (this.currentTimeRange) {
        this.loadDataForTimeRange(this.currentTimeRange);
      }
    }, 150);
  }

  // 根据时间范围加载数据
  private loadDataForTimeRange(timeRange: TimeRange): void {
    if (!timeRange) {
      console.warn('No time range provided, skipping data load');
      return;
    }

    const startTimeTimestamp = timeRange.startTime.getTime();
    const endTimeTimestamp = timeRange.endTime.getTime();
    const filePath = timeRange.filePath; // 获取文件路径

    // 根据时间范围长度自适应计算间隔（最小 1m，最大 1y）
    const timeSpan = endTimeTimestamp - startTimeTimestamp;
    const interval = this.computeAutoInterval(timeSpan, 20);

    console.log('Loading data for time range:', {
      startTime: timeRange.startTime.toISOString(),
      endTime: timeRange.endTime.toISOString(),
      interval,
      filePath,
      timeSpan: timeSpan / (1000 * 60 * 60) + ' hours'
    });

    // 加载协议趋势数据，传递 filePath
    this.loadProtocolTrendsData(startTimeTimestamp, endTimeTimestamp, interval, filePath);

    // 加载网络协议趋势数据，传递 filePath
    this.loadNetworkProtocolTrends(startTimeTimestamp, endTimeTimestamp, interval, filePath);

    // 加载带宽数据，传递 filePath
    this.loadBandwidthData(startTimeTimestamp, endTimeTimestamp, interval, filePath);

    // 加载Application Protocol (Service Name)数据，传递 filePath
    this.loadServiceNameData(startTimeTimestamp, endTimeTimestamp, filePath);

  // 加载资产表数据（event-*），传递 filePath
  this.loadAssetsData(startTimeTimestamp, endTimeTimestamp, filePath);
  // 加载告警表数据（event-*），传递 filePath
  this.loadAlarmsData(startTimeTimestamp, endTimeTimestamp, filePath);
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
          this.diskInfos = data.disks || [];
        },
        error: (error) => {
          console.error('Error loading system info:', error);
          // 设置默认值
          this.cpuUsage = 65;
          this.memoryUsage = 40;
          this.diskInfos = [
            { name: 'OS', mountPoint: '/', usage: 25, total: 500, used: 125, free: 375 },
            { name: 'Upload', mountPoint: '/datastore/pcap/upload', usage: 15, total: 1000, used: 150, free: 850 },
            { name: 'Capture', mountPoint: '/datastore/pcap/capture', usage: 20, total: 2000, used: 400, free: 1600 }
          ];
        }
      });
  }

  loadProtocolTrendsData(startTimeTimestamp?: number, endTimeTimestamp?: number, interval: string = '1h', filePath?: string) {
    // 使用传入的时间戳或默认获取最近24小时的数据
    const endTime = endTimeTimestamp ? new Date(endTimeTimestamp) : new Date();
    const startTime = startTimeTimestamp ? new Date(startTimeTimestamp) : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const startTs = startTime.getTime();
    const endTs = endTime.getTime();

    // 传递 filePath 参数
    this.dashboardDataService.getProtocolTrends(startTs, endTs, filePath, interval)
      .subscribe({
        next: (data: ProtocolTrendsResponse) => {
          this.updateProtocolTrendingChart(data);
        },
        error: (error) => {
          console.error('Error loading protocol trends data:', error);
          // 如果API调用失败，设置默认值并使用模拟数据
          this.initDefaultProtocolTrendingChart();
        }
      });
  }

  loadBandwidthData(startTimeTimestamp?: number, endTimeTimestamp?: number, interval: string = '1h', filePath?: string) {
    // 使用传入的时间戳或默认获取最近24小时的数据
    const endTime = endTimeTimestamp ? new Date(endTimeTimestamp) : new Date();
    const startTime = startTimeTimestamp ? new Date(startTimeTimestamp) : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const startTs = startTime.getTime();
    const endTs = endTime.getTime();

    // 传递 filePath 参数
    this.dashboardDataService.getBandwidthTrends(startTs, endTs, filePath, interval)
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

  loadServiceNameData(startTime?: number, endTime?: number, filePath?: string) {
    console.log('Loading service name data with time range...', { startTime, endTime, filePath });
    // 传递 filePath 参数
    this.dashboardDataService.getServiceNameAggregation(10, startTime, endTime, filePath)
      .subscribe({
        next: (data: ServiceNameAggregationResponse) => {
          console.log('Service name data received:', data);
          this.serviceNameData = data;
          try { this.updateServiceNameChart(data); } catch (error) { console.error(error); this.setEmptyServiceNameChart(); }
        },
        error: (error) => {
          console.error('Error loading service name data:', error);
          // 没有数据时显示空图表
          this.setEmptyServiceNameChart();
        }
      });
  }

  loadAssetsData(startTime?: number, endTime?: number, filePath?: string, size: number = 5) {
    if (!startTime || !endTime) {
      const end = Date.now();
      const start = end - 24 * 60 * 60 * 1000;
      startTime = start;
      endTime = end;
    }
    this.dashboardDataService.getAssets(startTime!, endTime!, filePath, size).subscribe({
      next: (resp) => {
        this.assets = Array.isArray(resp?.data) ? resp.data : [];
      },
      error: (err) => {
        console.error('Failed to load assets', err);
        this.assets = [];
      }
    });
  }

  getSeverityBadgeClass(sev: number): string {
    switch (sev) {
      case 1: return 'bg-danger';
      case 2: return 'bg-warning';
      default: return 'bg-success';
    }
  }

  loadAlarmsData(startTime?: number, endTime?: number, filePath?: string, size: number = 5) {
    if (!startTime || !endTime) {
      const end = Date.now();
      const start = end - 24 * 60 * 60 * 1000;
      startTime = start;
      endTime = end;
    }
    this.dashboardDataService.getAlarms(startTime!, endTime!, filePath, size).subscribe({
      next: (resp) => {
        this.alarms = Array.isArray(resp?.data) ? resp.data : [];
      },
      error: (err) => {
        console.error('Failed to load alarms', err);
        this.alarms = [];
      }
    });
  }

  // 依据时间跨度计算最接近目标点数的常用间隔（最小 1m，最大 1y）
  private computeAutoInterval(spanMillis: number, desiredPoints: number): string {
    const safeSpan = Math.max(1, spanMillis);
    const targetBucketMs = Math.max(60_000, Math.floor(safeSpan / Math.max(1, desiredPoints)));
    const steps: number[] = [
      60_000,               // 1m
      5 * 60_000,           // 5m
      15 * 60_000,          // 15m
      30 * 60_000,          // 30m
      60 * 60_000,          // 1h
      3 * 60 * 60_000,      // 3h
      6 * 60 * 60_000,      // 6h
      12 * 60 * 60_000,     // 12h
      24 * 60 * 60_000,     // 1d
      3 * 24 * 60 * 60_000, // 3d
      7 * 24 * 60 * 60_000, // 7d
      14 * 24 * 60 * 60_000,// 14d
      30 * 24 * 60 * 60_000,// 30d
      90 * 24 * 60 * 60_000,// 90d
      180 * 24 * 60 * 60_000,// 180d
      365 * 24 * 60 * 60_000 // 1y
    ];
    const labels: string[] = ['1m','5m','15m','30m','1h','3h','6h','12h','1d','3d','7d','14d','30d','90d','180d','1y'];
    for (let i = 0; i < steps.length; i++) {
      if (steps[i] >= targetBucketMs) return labels[i];
    }
    return '1y';
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
        id: 'protocolTrendingChart',
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
          formatter: (value: number) => this.formatChartLabel(value),
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
    this.ensureChartsVisibility();
  }

  initDefaultBandwidthChart() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const isRtl = this.store?.rtlClass === 'rtl' ? true : false;

    this.revenueChart = {
      chart: {
        height: 200,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        id: 'bandwidthChart',
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
          formatter: (value: number) => this.formatChartLabel(value),
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => this.formatBps(value),
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
        y: {
          formatter: (value: number) => this.formatBps(value)
        }
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
      series: [],
    };
    // 空数据时平均带宽为 0
    this.averageBandwidth = 0;
  }

  // 将 bps 数值转换为带单位的字符串（bps/Kbps/Mbps/Gbps）
  public formatBps(value: number): string {
    if (value == null || !isFinite(value)) return '0 bps';
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + ' Gbps';
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(2) + ' Mbps';
    if (abs >= 1_000) return (value / 1_000).toFixed(2) + ' Kbps';
    return Math.round(value) + ' bps';
  }

  initDefaultNetworkProtocolChart() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const isRtl = this.store?.rtlClass === 'rtl' ? true : false;

    // 设置默认的网络协议流量计数
    this.networkProtocolFlowCount = 0;

    this.tcpTrending = {
      chart: {
        height: 350,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        id: 'tcpTrendingChart',
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
      colors: isDark ? ['#1b55e2', '#e7515a', '#00ab55'] : ['#2196f3', '#e7515a', '#00ab55'],
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
          formatter: (value: number) => this.formatChartLabel(value),
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (v: number) => v.toString(),
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
          name: 'TCP',
          data: [],
        },
        {
          name: 'UDP',
          data: [],
        },
        {
          name: 'ICMP',
          data: [],
        },
      ],
    };
  }

  initDefaultProtocolTrendingChart() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const isRtl = this.store?.rtlClass === 'rtl' ? true : false;

    // 设置默认的总流量计数
    this.totalFlowCount = 0;

    this.protocolTrending = {
      chart: {
        height: 350,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        id: 'protocolTrendingChart',
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
          formatter: (value: number) => this.formatChartLabel(value),
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => {
            return value.toString();
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
          data: [],
        },
        {
          name: 'DNS',
          data: [],
        },
        {
          name: 'Others',
          data: [],
        },
      ],
    };

    // 如果数据加载成功，初始化其他图表
    this.initCharts();
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

    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error('Invalid service name data:', data);
      this.setEmptyServiceNameChart();
      return;
    }

    if (data.data.length === 0) {
      console.warn('Empty service name data received');
      this.setEmptyServiceNameChart();
      return;
    }

    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const labels = data.data.map(item => (item && typeof item.serviceName === 'string') ? item.serviceName : 'Unknown');
    const series = data.data.map(item => (item && typeof item.count === 'number') ? Number(item.count) : 0);

    if (labels.length !== series.length || labels.length === 0 || series.length === 0 || series.every(v => v === 0)) {
      this.setEmptyServiceNameChart();
      return;
    }

    this.salesByCategory = {
      chart: {
        type: 'donut',
        height: 520,
        fontFamily: 'Nunito, sans-serif',
        id: 'serviceNameChart'
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: [isDark ? '#0e1726' : '#fff']
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px',
        markers: {
          width: 5,
          height: 5,
          offsetX: -2
        },
        height: 80,
        offsetY: 10,
        itemMargin: {
          horizontal: 10,
          vertical: 8
        }
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
                offsetY: -10
              },
              value: {
                show: true,
                fontSize: '26px',
                color: isDark ? '#bfc9d4' : undefined,
                offsetY: 16,
                formatter: (val: number) => String(val)
              },
              total: {
                show: true,
                label: this.translate.instant('Total'),
                color: '#888ea8',
                fontSize: '29px',
                formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              }
            }
          }
        }
      },
      states: {
        hover: {
          filter: {
            type: 'none',
            value: 0.15
          }
        },
        active: {
          filter: {
            type: 'none',
            value: 0.15
          }
        }
      },
      labels: labels,
      colors: isDark ?
        ['#5c1ac3','#e2a03f','#e7515a','#00ab55','#4361ee','#f59e0b','#10b981','#ef4444','#3b82f6','#9333ea'] :
        ['#e2a03f','#5c1ac3','#e7515a','#00ab55','#4361ee','#f97316','#14b8a6','#dc2626','#2563eb','#7c3aed'],
      series: series
    };
    // 确保图表立即重绘
    this.ensureChartsVisibility();
  }

  // 空的 ServiceName 图表（无数据）
  private setEmptyServiceNameChart() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;

    this.salesByCategory = {
      chart: {
        type: 'donut',
        height: 460,
        fontFamily: 'Nunito, sans-serif',
        id: 'serviceNameChart'
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: [isDark ? '#0e1726' : '#fff']
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px',
        markers: {
          width: 5,
          height: 5,
          offsetX: -2
        },
        height: 60,
        offsetY: 10,
        itemMargin: {
          horizontal: 10,
          vertical: 4
        }
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
                fontSize: '22px',
                offsetY: -5,
                formatter: () => this.translate.instant('No Data')
              },
              value: {
                show: true,
                fontSize: '20px',
                color: isDark ? '#bfc9d4' : undefined,
                offsetY: 10,
                formatter: () => '0'
              },
              total: {
                show: true,
                label: this.translate.instant('Total'),
                color: '#888ea8',
                fontSize: '22px',
                formatter: () => 0
              }
            }
          }
        }
      },
      states: {
        hover: {
          filter: {
            type: 'none',
            value: 0.15
          }
        },
        active: {
          filter: {
            type: 'none',
            value: 0.15
          }
        }
      },
      labels: [],
      colors: [],
      series: []
    };
    // 确保空图表也能正确渲染
    this.ensureChartsVisibility();
  }

  loadBandwidthChartTheme() {
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
          name: `Channel ${channelKey.replace('channel', '')} Throughput`,
          data: []
        };
      }

      const processedData = channelData.map(item => [item.timestamp, item.count]);
      return {
        name: `Channel ${channelKey.replace('channel', '')} Throughput`,
        data: processedData
      };
    });

    // 计算平均带宽（bps）
    const allBps = Object.values(data).flat().map(item => item.count);
    this.averageBandwidth = allBps.length > 0
      ? allBps.reduce((sum, v) => sum + v, 0) / allBps.length
      : 0;

    this.revenueChart = {
      chart: {
        height: 200,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        id: 'bandwidthChart',
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
          formatter: (value: number) => this.formatChartLabel(value),
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => this.formatBps(value),
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
        y: {
          formatter: (value: number) => this.formatBps(value)
        }
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
    this.ensureChartsVisibility();
  }

  initCharts() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode ? true : false;
    const isRtl = this.store?.rtlClass === 'rtl' ? true : false;

    // 如果还没有 revenueChart 数据（即带宽数据），则初始化默认的带宽图表
    if (!this.revenueChart) {
      this.initDefaultBandwidthChart();
    }

    // 如果还没有 protocolTrending 数据，则初始化默认的协议趋势图表
    if (!this.protocolTrending) {
      this.initDefaultProtocolTrendingChart();
      return; // 避免重复初始化
    }

    // 如果还没有 tcpTrending 数据，则初始化默认的网络协议图表
    if (!this.tcpTrending) {
      this.initDefaultNetworkProtocolChart();
    }

    // 如果还没有 salesByCategory 数据，则初始化默认的应用协议图表
    if (!this.salesByCategory) {
      this.setEmptyServiceNameChart();
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
      this.setEmptyServiceNameChart();
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
          formatter: (value: number) => this.formatChartLabel(value),
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
          formatter: (value: number) => this.formatChartLabel(value),
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

    if (!this.tcpTrending) {
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
          formatter: (value: number) => this.formatChartLabel(value),
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

    // 统一触发一次重绘，确保路由切回后尺寸与显示正确
    this.ensureChartsVisibility();
  }

  // ================= 自定义时间格式化 =================
  /**
   * 依据当前选定时间范围决定是否包含日期。
   * >= 1 天: yyyy/M/d HH:mm:ss
   * <  1 天: HH:mm:ss
   */
  private formatChartLabel(timestamp: number): string {
    try {
      const date = new Date(Number(timestamp));
      if (isNaN(date.getTime())) return '';
      const span = this.currentTimeRange ? (this.currentTimeRange.endTime.getTime() - this.currentTimeRange.startTime.getTime()) : null;
      const showDate = span == null || span >= 24 * 60 * 60 * 1000; // 没有范围信息时默认显示日期
      const Y = date.getFullYear();
      const M = date.getMonth() + 1; // 不补零，符合示例格式 2025/9/10
      const D = date.getDate();
      const hh = this.pad(date.getHours());
      const mm = this.pad(date.getMinutes());
      const ss = this.pad(date.getSeconds());
      if (showDate) {
        return `${Y}/${M}/${D} ${hh}:${mm}:${ss}`;
      }
      return `${hh}:${mm}:${ss}`;
    } catch {
      return '';
    }
  }

  private pad(n: number): string { return n < 10 ? '0' + n : '' + n; }

  // ================ 辅助：带宽图是否有数据 ================
  public hasBandwidthData(): boolean {
    try {
      const series: any[] = (this.revenueChart && this.revenueChart.series) ? (this.revenueChart.series as any[]) : [];
      if (!Array.isArray(series) || series.length === 0) return false;
      return series.some((s: any) => {
        const data = s?.data;
        if (!Array.isArray(data) || data.length === 0) return false;
        // 任意点存在数值即可认为有数据
        return data.some((pt: any) => {
          if (Array.isArray(pt) && pt.length >= 2) {
            const v = Number(pt[1]);
            return !Number.isNaN(v) && v !== 0;
          }
          const v = Number(pt);
          return !Number.isNaN(v) && v !== 0;
        });
      });
    } catch {
      return false;
    }
  }

}
