import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toggleAnimation } from 'src/app/shared/animations';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Store } from '@ngrx/store';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { CollectorService } from 'src/app/services/collector.service';
import { Collector, StorageStrategy, CaptureRequest, CaptureResponse, CaptureFileItem } from '../services/collector.service';

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
  analysisCompleted?: boolean; // 新增：分析完成状态
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
  selectedFile?: File;
  showTimeRange = false;
  showAlarm = false;

  // Channel selection states
  channelStates: { [key: string]: boolean } = {
    channel1: true,
    channel2: true,
    channel3: true,
    channel4: true
  };

  // Network interfaces with detailed information
  networkInterfaces: any[] = [];
  selectedInterface: any = null;
  availablePorts: any[] = [];


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
  // 文件列表相关
  captureFiles: CaptureFileItem[] = [];
  readonly captureBasePath = '/datastore/neteyez/datastore/pcap/capture/';
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
    // 若默认打开 Storage Strategy 也可触发加载，这里在切换时加载
  }

  // 处理 tab 切换（模板中直接赋值 tab2，这里监听并在切到 profile 时加载文件）
  setTab(tab: string) {
    this.tab2 = tab;
    if (this.tab2.toLowerCase() === 'profile') {
      this.loadCaptureFiles();
    }
  }

  loadCaptureFiles() {
    this.collectorService.listCaptureFiles(this.captureBasePath).subscribe({
      next: (files) => {
        this.captureFiles = files;
      },
      error: (err) => {
        console.error('Error loading capture files:', err);
        this.showMessage('Error loading capture files', 'error');
      }
    });
  }

  downloadFile(item: CaptureFileItem) {
    this.collectorService.downloadCaptureFile(item.name, this.captureBasePath).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Download failed:', err);
        this.showMessage('Download failed', 'error');
      }
    });
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
  // Storage Strategy 在 Adapter 为 File 时禁用且不必填
  storageStrategy: [{ value: '', disabled: false }],
  // Filter Strategy 输入框隐藏，移除必填校验，保留控件以兼容后端字段
  filterStrategy: [''],
      protocolAnalysisEnabled: [true],
      idsEnabled: [true],
  status: ['completed'],
  filePath: ['']
    });

    // 根据 interfaceName（Adapter）动态控制 Storage Strategy 可用性
    const ssCtrl = this.params.get('storageStrategy');
    const ifaceCtrl = this.params.get('interfaceName');
    ifaceCtrl?.valueChanges.subscribe((val: string) => {
      if (val === 'File') {
        ssCtrl?.disable({ emitEvent: false });
        ssCtrl?.setValue('', { emitEvent: false });
      } else {
        ssCtrl?.enable({ emitEvent: false });
      }
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
  status: user.status,
  filePath: (user as any).filePath || ''
      });

  // 根据当前 Adapter 同步禁用/启用 Storage Strategy
  this.onAdapterChange(this.params.value.interfaceName);
    }
  }

  saveUser() {
    if (!this.params.valid) {
        this.showMessage('Please fill all required fields.', 'error');
        return;
    }

  if (this.params.value.interfaceName === 'File' && !this.params.value.filePath) {
    this.showMessage('Please upload a file for File adapter', 'error');
    return;
  }

  // 非 File 适配器必须选择 Storage Strategy
  if (this.params.value.interfaceName !== 'File' && !this.params.value.storageStrategy) {
    this.showMessage('Please choose a Storage Strategy', 'error');
    return;
  }

  const isFile = this.params.value.interfaceName === 'File';
  // 后端 storage_strategy NOT NULL：File 模式写入占位值
  const storageStrategyName = isFile ? 'FILE' : (this.params.value.storageStrategy || '');

  const collectorData: Partial<Collector> = {
        name: this.params.value.name,
        interfaceName: this.params.value.interfaceName,
    storageStrategy: storageStrategyName,
        filterStrategy: this.params.value.filterStrategy,
        protocolAnalysisEnabled: this.params.value.protocolAnalysisEnabled || false,
        idsEnabled: this.params.value.idsEnabled || false,
  filePath: this.params.value.filePath || undefined,
        status: this.params.value.id ? 'completed' : 'start',
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
      this.params.patchValue({ filePath: '' });
      this.selectedFile = undefined;
      this.selectedInterface = null;
      this.availablePorts = [];
      // 使用原生文件输入，不再初始化第三方上传预览
    } else {
      this.showChannels = true;
      this.showUpload = false;
      this.params.patchValue({ filePath: '' });
      this.selectedFile = undefined;

      // 根据选择的接口名称找到对应的接口信息
      this.selectedInterface = this.networkInterfaces.find(iface => iface.name === event);
      if (this.selectedInterface && this.selectedInterface.ports) {
        this.availablePorts = this.selectedInterface.ports;
        // 重置channel状态为默认全选
        this.channelStates = {
          channel1: true,
          channel2: true,
          channel3: true,
          channel4: true
        };
      } else {
        this.availablePorts = [];
        // 如果没有找到接口信息，使用默认的4个channel
        this.channelStates = {
          channel1: true,
          channel2: true,
          channel3: true,
          channel4: true
        };
      }
    }

    // 同步控制 Storage Strategy 的可用性
    const ssCtrl = this.params?.get('storageStrategy');
    if (event === 'File') {
      ssCtrl?.disable({ emitEvent: false });
      ssCtrl?.setValue('', { emitEvent: false });
    } else {
      ssCtrl?.enable({ emitEvent: false });
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

  // 选择文件
  onFileSelected(event: any) {
    const file: File | undefined = event?.target?.files?.[0];
    this.selectedFile = file;
  }

  // 上传文件到固定目录并保存路径
  uploadSelectedFile() {
    if (!this.selectedFile) {
      this.showMessage('Please choose a file first', 'error');
      return;
    }
    if (this.selectedFile.size === 0) {
      this.showMessage('Selected file is empty', 'error');
      return;
    }
    const target = '/datastore/admin/pcap';
    this.collectorService.uploadPcap(this.selectedFile, target).subscribe({
      next: (resp) => {
        this.params.patchValue({ filePath: resp.path });
        this.showMessage('File uploaded successfully');
      },
      error: () => this.showMessage('File upload failed', 'error')
    });
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
          creationTime: this.formatDate(collector.creationTime),
          analysisCompleted: collector.status === 'completed' || collector.status === 'STATUS_FINISHED' // 初始化分析完成状态
        }));

        // 检查并为正在运行的抓包任务启动状态轮询
        this.contactList.forEach(collector => {
          // 检查 status 为 running 或 STATUS_STARTED 的情况
          if (collector.sessionId && (collector.status === 'running' || collector.status === 'STATUS_STARTED')) {
            // 先获取一次当前状态
            this.collectorService.getSessionInfo(collector.sessionId).subscribe(
              (response: CaptureResponse) => {
                // 规范化完成态
                if (response.status === 'STATUS_FINISHED' || response.status === 'completed') {
                  collector.analysisCompleted = true;
                  collector.status = 'completed';
                  // 持久化状态，但不清理 sessionId
                  this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
                  // 注释掉清理sessionId的代码
                  // this.collectorService.updateCollectorSessionId(collector.id, '').subscribe();
                  // collector.sessionId = undefined;
                } else {
                  collector.status = response.status;
                }
                // 如果状态是 STATUS_STARTED，启动轮询
                if (response.status === 'STATUS_STARTED') {
                  this.startStatusPolling(collector);
                }
              },
              error => {
                console.error('Error getting session info:', error);
                // 如果获取状态失败，将状态设置为 completed，但不删除sessionId
                collector.status = 'completed';
                // 注释掉清理sessionId的代码
                // collector.sessionId = undefined;
                // 更新数据库中的状态
                this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
                // 注释掉清理sessionId的代码
                // this.collectorService.updateCollectorSessionId(collector.id, '').subscribe();
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
        // 存储完整的网络接口信息
        this.networkInterfaces = interfaces;
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
    // 获取对应的存储策略（仅非 File 模式需要）
    let storageStrategy: StorageStrategy | undefined;
    if (collector.interfaceName !== 'File') {
      storageStrategy = this.storageStrategies.find(s => s.name === collector.storageStrategy);
      if (!storageStrategy) {
        this.showMessage('Storage strategy not found', 'error');
        return;
      }
    }

    // 为非File模式设置接口信息（如果还没有设置的话）
    if (collector.interfaceName !== 'File') {
      this.selectedInterface = this.networkInterfaces.find(iface => iface.name === collector.interfaceName);
      if (this.selectedInterface && this.selectedInterface.ports) {
        this.availablePorts = this.selectedInterface.ports;
        // 重置channel状态为默认全选
        this.channelStates = {
          channel1: true,
          channel2: true,
          channel3: true,
          channel4: true
        };
      } else {
        this.availablePorts = [];
        // 如果没有找到接口信息，使用默认的4个channel
        this.channelStates = {
          channel1: true,
          channel2: true,
          channel3: true,
          channel4: true
        };
      }
    }

    // 构建基本请求参数
    const apps = [
      'zeek',
    //   ...(collector.idsEnabled ? ['snort'] : [])
    ];
    const appOpt: any = {
      apps,
      zeek: { enable: collector.protocolAnalysisEnabled || false },
      suricata: { enable: collector.idsEnabled || false }
    };

    // 非 File 开启保存；File 关闭保存
    if (collector.interfaceName !== 'File' && storageStrategy) {
      appOpt.savePacket = {
        enable: true,
        duration: storageStrategy.duration || 0,
        fileCount: storageStrategy.fileCount,
        fileName: storageStrategy.name,
        fileSize: this.parseFileSize(storageStrategy.fileSize),
        fileType: storageStrategy.fileType === 'PCAP' ? 1 : 2,
        // performanceMode: 'string',
        stopOnWrap: storageStrategy.outOfDiskAction === 'Stop'
      };
    } else {
      appOpt.savePacket = { enable: false };
    }

    const request: Partial<CaptureRequest> = {
      // index: 0 表示 file，其他使用接口的 index
      index: collector.interfaceName === 'File' ? 0 : (this.selectedInterface?.index || 1),
      port: collector.interfaceName === 'File' ? "0x1" : this.calculatePortValue(),
      appOpt
    };

    // 只有当选择File时才添加filePath
    if (collector.interfaceName === 'File') {
      const fp = (collector as any).filePath;
      if (!fp) {
        this.showMessage('No file selected. Please upload a file in edit dialog first.', 'error');
        return;
      }
      request.filePath = fp;
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

    // return parseInt(match[1]) * 1024 * 1024; // 转换为字节
    return parseInt(match[1]); // M
  }

  // 计算port值：根据选择的channel和接口信息转换为16进制
  calculatePortValue(): string {
    if (this.availablePorts.length > 0) {
      // 如果有可用的 ports，根据选择的 channel 和 port 的 id 计算
      let decimalValue = 0;
      for (let i = 0; i < this.availablePorts.length; i++) {
        const port = this.availablePorts[i];
        const channelKey = `channel${i + 1}`;
        if (this.channelStates[channelKey]) {
          // 使用 port 的 id 作为位位置
          decimalValue |= (1 << port.id);
        }
      }
      return `0x${decimalValue.toString(16).toUpperCase()}`;
    } else {
      // 如果没有可用的 ports，使用默认的4个channel逻辑
      const { channel1, channel2, channel3, channel4 } = this.channelStates;

      // 构建二进制字符串：channel4 channel3 channel2 channel1
      // 例如：channel1=1, channel2=0, channel3=1, channel4=0 -> "0101"
      const binaryString = `${channel4 ? '1' : '0'}${channel3 ? '1' : '0'}${channel2 ? '1' : '0'}${channel1 ? '1' : '0'}`;

      // 转换为十进制数字
      const decimalValue = parseInt(binaryString, 2);

      // 转换为16进制，确保是大写并且有0x前缀
      return `0x${decimalValue.toString(16).toUpperCase()}`;
    }
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

              // 统一完成状态：将 STATUS_FINISHED 视为 completed
              const isFinished = response.status === 'completed' || response.status === 'STATUS_FINISHED';
              if (isFinished) {
                collector.analysisCompleted = true;
                if (response.status === 'STATUS_FINISHED') {
                  collector.status = 'completed';
                }
                // 持久化完成状态，但不清理 sessionId
                this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
                // 注释掉清理sessionId的代码
                // this.collectorService.updateCollectorSessionId(collector.id, '').subscribe();
                // collector.sessionId = undefined;
              }

              // 仅在未完成时显示错误
              if (response.error !== 0 && !isFinished) {
                this.showMessage(`Capture error: ${response.message || 'Unknown error'}`, 'error');
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

    // 保存sessionId用于API调用
    const sessionId = collector.sessionId;

    // 立即停止状态轮询，不等待API响应
    this.stopStatusPolling(collector.id);
    collector.status = 'completed';
    collector.analysisCompleted = true; // 标记分析完成
    // 注释掉清理sessionId的代码，保持sessionId
    // collector.sessionId = undefined;

    // 调用停止API，但不等待响应
    this.collectorService.stopCapture(sessionId).subscribe(
      (response: CaptureResponse) => {
        // 即使API调用成功，状态已经在上面更新了
        this.showMessage('Capture stopped successfully');
        
        // 注释掉清除数据库中的 sessionId 的代码
        // this.collectorService.updateCollectorSessionId(collector.id, '').subscribe(
        //   () => {
        //     this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
        //   },
        //   error => {
        //     console.error('Error clearing session ID:', error);
        //   }
        // );
        
        // 只更新状态，不清除sessionId
        this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
      },
      error => {
        console.error('Error stopping capture:', error);
        // 即使API调用失败，UI状态也已经更新了
        this.showMessage('Capture stopped (API call may have failed)', 'warning');
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
