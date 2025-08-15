import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toggleAnimation } from 'src/app/shared/animations';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Store } from '@ngrx/store';
import { FileUploadWithPreview } from 'file-upload-with-preview';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { CollectorService } from 'src/app/services/collector.service';
import { Collector, StorageStrategy, CaptureRequest, CaptureResponse } from '../services/collector.service';

interface ContactList extends Collector {
  role?: string;
  email?: string;
  location?: string;
  phone?: string;
  posts?: number;
  followers?: string;
  following?: number;
  path?: string;
  action?: string;
  sessionId?: string;
}

@Component({
  selector: 'app-collector',
  templateUrl: './collector.component.html',
  styleUrl: './collector.component.css',
  animations: [toggleAnimation],
  // styleUrls: ['./collector.component.css', './css/core.css', './css/ipad.css', './css/sharkcss-3.15.0.css']
})
export class CollectorComponent implements OnInit {
  tab2: string = 'home';
  htmlContent: string = '';
  isLoading = true;
  store: any;
  revenueChart: any;
  showChannels = false;
  showUpload = false;
  showTimeRange = false;
  showAlarm = false;


  displayType = 'list';
  @ViewChild('addContactModal') addContactModal!: NgxCustomModalComponent;
  @ViewChild('storageStrategyModal') storageStrategyModal!: NgxCustomModalComponent;
  params!: FormGroup;
  filterdContactsList: ContactList[] = [];
  searchUser = '';
  contactList: ContactList[] = [
    {
      id: 1,
      name: 'Alan Green',
      role: 'Web Developer',
      email: 'alan@mail.com',
      location: 'Boston, USA',
      phone: '+1 202 555 0197',
      posts: 25,
      followers: '5K',
      following: 500,
      path: 'profile-35.png',
      creationTime: "2024/01/01 12:00:00",
      interfaceName: "admin",
      storageStrategy: "B",
      filterStrategy: "CC",
      protocolAnalysisEnabled: true,
      idsEnabled: false,
      status: "active",
      action: "",
    },
  ];
  options: string[] = ['File','Adapter'];
  optionsFileSize = ['256M','512M', '1G','2G', '4G'];
  optionsTrigger = ['Timer', 'Alarm'];
  optionsAlarm = ['Alarm1', 'Alarm2']
  input5: string | undefined;
  input3: string | undefined;
  input4: string | undefined;
  rangeCalendar: FlatpickrDefaultsInterface;
  form3!: FormGroup;
  storageParams!: FormGroup;
  storageStrategies: StorageStrategy[] = [];
  private statusPollingMap = new Map<number, any>(); // 存储轮询定时器
  constructor(
    private http: HttpClient,
    public fb: FormBuilder,
    public storeData: Store<any>,
    private collectorService: CollectorService
  ) {
    this.initStore();
    this.isLoading = false;
    this.form3 = this.fb.group({
      date3: ['2022-07-05 00:00:00 to 2022-07-10 23:59:59'],
  });
    this.rangeCalendar = {
      dateFormat: 'Y-m-d H:i:S',
      enableTime: true,
      enableSeconds: true,
      time24hr: true,
      mode: 'range',
      // position: this.store.rtlClass === 'rtl' ? 'auto right' : 'auto left',
      monthSelectorType: 'dropdown',
    };
  }
  ngOnInit() {
    this.loadCollectors();
    this.loadStorageStrategies();
    this.http.get('assets/decode/index.html', { responseType: 'text' })
      .subscribe(data => {
        this.htmlContent = data;
      });

    this.searchContacts();
    this.loadNetworkInterfaces();
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

  initCharts() {
    const isDark = this.store.theme === 'dark' || this.store.isDarkMode ? true : false;
    const isRtl = this.store.rtlClass === 'rtl' ? true : false;
    // revenue
    this.revenueChart = {
      chart: {
        height: 150,
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
        show: false,
        size: 6,  // 设置标记的大小
        colors: ['#1b55e2', '#e7515a'],  // 设置标记的颜色，可以设置为�������������的颜色数组
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
          show: false,
        },
        labels: {
          show: false,
          offsetX: isRtl ? 2 : 0,
          offsetY: 3,
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
        tickAmount: 2,
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
          bottom: 20,
          left: 0,
        },
      },
      legend: {
        show: false,
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
            [1609459200000, 0.2], // 时间戳，收入
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
  }

  initForm() {
    this.params = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      interfaceName: ['', Validators.required],
      storageStrategy: ['', Validators.required],
      filterStrategy: ['', Validators.required],
      protocolAnalysisEnabled: [false],
      idsEnabled: [false],
      status: ['stopped']
    });
  }

  initStorageForm() {
    this.storageParams = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      fileSize: ['256M', Validators.required],
      fileCount: [1, [Validators.required, Validators.min(1)]],
      outOfDiskAction: ['Wrap', Validators.required],
      fileType: ['PCAP', Validators.required],
      triggerType: ['Timer', Validators.required],
      timeRange: [''],
      alarmType: [''],
      duration: [null]
    });
  }

  searchContacts() {
    this.filterdContactsList = this.contactList.filter((d) => {
        if (!d || !d.name || !d.interfaceName || !d.storageStrategy) {
            return false;
        }
        return d.name.toLowerCase().includes(this.searchUser.toLowerCase()) ||
            d.interfaceName.toLowerCase().includes(this.searchUser.toLowerCase()) ||
            d.storageStrategy.toLowerCase().includes(this.searchUser.toLowerCase());
    });
  }

  editUser(user: ContactList | null = null) {
    this.addContactModal.open();
    this.initForm();

    if (!this.storageStrategies.length) {
      this.loadStorageStrategies();
    }

    if (user) {
      this.params.patchValue({
        id: user.id,
        name: user.name,
        interfaceName: user.interfaceName,
        storageStrategy: user.storageStrategy,
        filterStrategy: user.filterStrategy,
        protocolAnalysisEnabled: user.protocolAnalysisEnabled,
        idsEnabled: user.idsEnabled,
        status: user.status
      });
    }
  }

  saveUser() {
    if (!this.params.valid) {
        this.showMessage('Please fill all required fields.', 'error');
        return;
    }

    const collectorData: Partial<Collector> = {
        name: this.params.value.name,
        interfaceName: this.params.value.interfaceName,
        storageStrategy: this.params.value.storageStrategy,
        filterStrategy: this.params.value.filterStrategy,
        protocolAnalysisEnabled: this.params.value.protocolAnalysisEnabled || false,
        idsEnabled: this.params.value.idsEnabled || false,
        status: 'stopped',
        creationTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    if (this.params.value.id) {
        // 更新
        this.collectorService.updateCollector(this.params.value.id, collectorData).subscribe(
            response => {
                this.showMessage('Collector has been updated successfully.');
                this.loadCollectors();
                this.addContactModal.close();
            },
            error => {
                this.showMessage('Error updating collector.', 'error');
            }
        );
    } else {
        // 创建新的
        this.collectorService.createCollector(collectorData).subscribe(
            response => {
                this.showMessage('Collector has been created successfully.');
                this.loadCollectors();
                this.addContactModal.close();
            },
            error => {
                this.showMessage('Error creating collector.', 'error');
            }
        );
    }
  }

  deleteUser(user: ContactList) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        padding: '2em'
    }).then((result) => {
        if (result.value) {
            this.collectorService.deleteCollector(user.id).subscribe(
                () => {
                    this.loadCollectors();
                    this.showMessage('Collector has been deleted successfully.');
                },
                error => {
                    this.showMessage('Error deleting collector', 'error');
                }
            );
        }
    });
  }

  showMessage(msg = '', type = 'success') {
    const toast: any = Swal.mixin({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 3000,
      customClass: { container: 'toast' },
    });
    toast.fire({
      icon: type,
      title: msg,
      padding: '10px 20px',
    });
  }
  onAdapterChange(event: any) {

    // 根据选项来设置显示的内容
    if (event === 'File') {
      this.showChannels = false;
      this.showUpload = true;
      setTimeout(() => {
        new FileUploadWithPreview('myFirstImage', {
          images: {
            // baseImage: '/assets/images/file-preview.svg',
            // backgroundImage: '',
          },
        });
        let previewContainer = document.querySelector('.image-preview') as HTMLElement;
        if (previewContainer) {
          previewContainer.remove();
        }

      }, 100);
    } else {
      this.showChannels = true;
      this.showUpload = false;
    }
  }

  onTriggerChange(event: any) {
    if (event === 'Timer') {
      this.showTimeRange = true;
      this.showAlarm = false;
    } else {
      this.showTimeRange = false;
      this.showAlarm = true;
    }
  }

  loadCollectors() {
    this.collectorService.getAllCollectors().subscribe(
      data => {
        // 将Collector数据转换为ContactList格式
        this.contactList = data.map(collector => ({
          ...collector,
          role: 'Collector',
          email: '-',
          location: '-',
          phone: '-',
          posts: 0,
          followers: '0',
          following: 0,
          path: 'profile-35.png',
          action: '',
          creationTime: this.formatDate(collector.creationTime)
        }));

        // 检查并为正在运行的抓包任务启动状态轮询
        this.contactList.forEach(collector => {
          // 检查 status 为 running 或 STATUS_STARTED 的情况
          if (collector.sessionId && (collector.status === 'running' || collector.status === 'STATUS_STARTED')) {
            // 先获取一次当前状态
            this.collectorService.getSessionInfo(collector.sessionId).subscribe(
              (response: CaptureResponse) => {
                collector.status = response.status;
                // 如果状态是 STATUS_STARTED，启动轮询
                if (response.status === 'STATUS_STARTED') {
                  this.startStatusPolling(collector);
                }
              },
              error => {
                console.error('Error getting session info:', error);
                // 如果获取状态失败，将状态设置为 stopped
                collector.status = 'stopped';
                collector.sessionId = undefined;
                // 更新数据库中的状态
                this.collectorService.updateCollectorStatus(collector.id, 'stopped').subscribe();
                this.collectorService.updateCollectorSessionId(collector.id, '').subscribe();
              }
            );
          }
        });

        this.searchContacts();
      },
      error => {
        console.error('Error loading collectors:', error);
      }
    );
  }

  loadStorageStrategies() {
    this.collectorService.getAllStorageStrategies().subscribe(
      data => {
        this.storageStrategies = data;
      },
      error => {
        console.error('Error loading storage strategies:', error);
        this.showMessage('Error loading storage strategies', 'error');
      }
    );
  }

  editStorageStrategy(strategy: StorageStrategy | null = null) {
    this.storageStrategyModal.open();
    this.initStorageForm();
    if (strategy) {
      this.storageParams.patchValue({
        id: strategy.id,
        name: strategy.name,
        fileSize: strategy.fileSize,
        fileCount: strategy.fileCount,
        outOfDiskAction: strategy.outOfDiskAction,
        fileType: strategy.fileType,
        triggerType: strategy.triggerType,
        timeRange: strategy.timeRange,
        alarmType: strategy.alarmType,
        duration: strategy.duration
      });
    }
  }

  saveStorageStrategy() {
    if (!this.storageParams.valid) {
        this.showMessage('Please fill all required fields.', 'error');
        return;
    }

    const strategyData: Partial<StorageStrategy> = {
        name: this.storageParams.value.name,
        fileSize: this.storageParams.value.fileSize,
        fileCount: this.storageParams.value.fileCount,
        outOfDiskAction: this.storageParams.value.outOfDiskAction,
        fileType: this.storageParams.value.fileType,
        triggerType: this.storageParams.value.triggerType,
        timeRange: this.storageParams.value.timeRange,
        alarmType: this.storageParams.value.alarmType,
        duration: this.storageParams.value.duration,
        creationTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    if (this.storageParams.value.id) {
        // 更新
        this.collectorService.updateStorageStrategy(this.storageParams.value.id, strategyData).subscribe(
            response => {
                this.showMessage('Storage strategy has been updated successfully.');
                this.loadStorageStrategies();
                this.storageStrategyModal.close();
            },
            error => {
                this.showMessage('Error updating storage strategy.', 'error');
            }
        );
    } else {
        // 创建新的
        this.collectorService.createStorageStrategy(strategyData).subscribe(
            response => {
                this.showMessage('Storage strategy has been created successfully.');
                this.loadStorageStrategies();
                this.storageStrategyModal.close();
            },
            error => {
                this.showMessage('Error creating storage strategy.', 'error');
            }
        );
    }
  }

  deleteStorageStrategy(strategy: StorageStrategy) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        padding: '2em'
    }).then((result) => {
        if (result.value) {
            this.collectorService.deleteStorageStrategy(strategy.id).subscribe(
                () => {
                    this.loadStorageStrategies();
                    this.showMessage('Storage strategy has been deleted successfully.');
                },
                error => {
                    this.showMessage('Error deleting storage strategy', 'error');
                }
            );
        }
    });
  }

  // 添加 Storage Strategy 的搜索功能
  searchStorageStrategies() {
    return this.storageStrategies.filter((d) => {
        if (!d || !d.name || !d.fileType || !d.triggerType) {
            return false;
        }
        return d.name.toLowerCase().includes(this.searchUser.toLowerCase()) ||
            d.fileType.toLowerCase().includes(this.searchUser.toLowerCase()) ||
            d.triggerType.toLowerCase().includes(this.searchUser.toLowerCase());
    });
  }

  formatDate(date: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/\//g, '-');
  }

  onProtocolAnalysisChange(collector: ContactList, event: any) {
    const enabled = event.target.checked;
    this.collectorService.updateCollectorEnabled(collector.id, 'protocol-analysis', enabled).subscribe(
        () => {
            collector.protocolAnalysisEnabled = enabled;
            this.showMessage(`Protocol Analysis has been ${enabled ? 'enabled' : 'disabled'}.`);
        },
        error => {
            // 恢复开关状态
            event.target.checked = !enabled;
            this.showMessage('Error updating Protocol Analysis status.', 'error');
        }
    );
  }

  onIdsChange(collector: ContactList, event: any) {
    const enabled = event.target.checked;
    this.collectorService.updateCollectorEnabled(collector.id, 'ids', enabled).subscribe(
        () => {
            collector.idsEnabled = enabled;
            this.showMessage(`IDS has been ${enabled ? 'enabled' : 'disabled'}.`);
        },
        error => {
            // 恢复开关状态
            event.target.checked = !enabled;
            this.showMessage('Error updating IDS status.', 'error');
        }
    );
  }

  loadNetworkInterfaces() {
    this.collectorService.getNetworkInterfaces().subscribe(
      interfaces => {
        // 将网络接口名称添加到选项中
        this.options = ['File', ...interfaces.map(iface => iface.name)];
      },
      error => {
        console.error('Error loading network interfaces:', error);
        this.showMessage('Error loading network interfaces', 'error');
      }
    );
  }

  startCapture(collector: ContactList) {
    // 获取对应的存储策略
    const storageStrategy = this.storageStrategies.find(s => s.name === collector.storageStrategy);
    if (!storageStrategy) {
      this.showMessage('Storage strategy not found', 'error');
      return;
    }

    // 构建基本请求参数
    const request: Partial<CaptureRequest> = {
      filter: {
        capture: {
          items: ["192.168.0.24/24;192.168.0.1"],
          optReverse: true
        }
      },
      // index: 0 表示file，1表示其他
      index: collector.interfaceName === 'File' ? 0 : 1,
      port: "0x1",
      appOpt: {
        // apps 中默认包含 zeek
        apps: [
          'zeek',
          ...(collector.idsEnabled ? ['snort'] : [])
        ],
        zeek: {
          enable: collector.protocolAnalysisEnabled || false
        },
        // savePacket 完全使用 Storage Strategy 的配置
        savePacket: {
          enable: true,
          duration: storageStrategy.duration || 0,
          fileCount: storageStrategy.fileCount,
          fileName: storageStrategy.name, // 使用存储策略的名称作为文件名
          fileSize: this.parseFileSize(storageStrategy.fileSize),
          fileType: storageStrategy.fileType === 'PCAP' ? 0 : 1,
          performanceMode: "string",
          stopOnWrap: storageStrategy.outOfDiskAction === 'Stop'
        },
        snort: {
          enable: collector.idsEnabled || false
        }
      }
    };

    // 只有当选择File时才添加filePath
    if (collector.interfaceName === 'File') {
      request.filePath = `/path/to/${storageStrategy.name}.pcap`; // 使用存储策略名称作为文件名
    }

    this.collectorService.startCapture(request as CaptureRequest).subscribe(
      (response: CaptureResponse) => {
        this.showMessage('Capture started successfully');
        collector.status = 'running';
        collector.sessionId = response.uuid;

        // 保存 sessionId 到数据库
        this.collectorService.updateCollectorSessionId(collector.id, response.uuid).subscribe(
          () => {
            this.collectorService.updateCollectorStatus(collector.id, 'running').subscribe();
            this.startStatusPolling(collector);
          },
          error => {
            console.error('Error updating session ID:', error);
          }
        );
      },
      error => {
        console.error('Error starting capture:', error);
        this.showMessage('Error starting capture', 'error');
      }
    );
  }

  // 添加辅助方法来解析文件大小字符串
  private parseFileSize(size: string | undefined): number {
    if (!size) return 0;

    const match = size.match(/(\d+)M/);
    if (!match) return 0;

    return parseInt(match[1]) * 1024 * 1024; // 转换为字节
  }

  // 添加开始轮询状态的方法
  private startStatusPolling(collector: ContactList) {
    this.stopStatusPolling(collector.id);

    const timer = setInterval(() => {
      if (collector.sessionId) {
        this.collectorService.getSessionInfo(collector.sessionId).subscribe(
          (response: CaptureResponse) => {
            // 更新状态
            collector.status = response.status;

            // 只有当状态不是 STATUS_STARTED 时才停止轮询
            if (response.status !== 'STATUS_STARTED') {
              this.stopStatusPolling(collector.id);
              if (response.error !== 0) {
                this.showMessage(`Capture error: ${response.message}`, 'error');
              }
            }
          },
          error => {
            console.error('Error getting session info:', error);
            this.stopStatusPolling(collector.id);
          }
        );
      }
    }, 5000); // 每5秒轮询一次

    this.statusPollingMap.set(collector.id, timer);
  }

  // 添加停止轮询的方法
  private stopStatusPolling(collectorId: number) {
    const timer = this.statusPollingMap.get(collectorId);
    if (timer) {
      clearInterval(timer);
      this.statusPollingMap.delete(collectorId);
    }
  }

  // 添加停止抓包的方法
  stopCapture(collector: ContactList) {
    if (!collector.sessionId) {
      this.showMessage('No active capture session', 'error');
      return;
    }

    this.collectorService.stopCapture(collector.sessionId).subscribe(
      (response: CaptureResponse) => {
        if (response.error === 0) {
          // 立即停止状态轮询
          this.stopStatusPolling(collector.id);

          this.showMessage('Capture stopped successfully');
          collector.status = 'stopped';

          // 清除数据库中的 sessionId
          this.collectorService.updateCollectorSessionId(collector.id, '').subscribe(
            () => {
              this.collectorService.updateCollectorStatus(collector.id, 'stopped').subscribe();
              collector.sessionId = undefined;
            },
            error => {
              console.error('Error clearing session ID:', error);
            }
          );
        } else {
          this.showMessage(`Error stopping capture: ${response.message}`, 'error');
        }
      },
      error => {
        console.error('Error stopping capture:', error);
        this.showMessage('Error stopping capture', 'error');
      }
    );
  }

  // 在组件销毁时清理所有定时器
  ngOnDestroy() {
    this.statusPollingMap.forEach((timer) => clearInterval(timer));
    this.statusPollingMap.clear();
  }

  confirmStopCapture(collector: ContactList) {
    Swal.fire({
      title: 'Stop Capture',
      text: 'Are you sure you want to stop the capture?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, stop it!',
      cancelButtonText: 'No, keep it running',
      padding: '2em'
    }).then((result) => {
      if (result.value) {
        this.stopCapture(collector);
      }
    });
  }
}
