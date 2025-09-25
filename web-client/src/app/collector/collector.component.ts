import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpEventType, HttpEvent } from '@angular/common/http';
import { Router } from '@angular/router';
import { toggleAnimation } from 'src/app/shared/animations';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Store } from '@ngrx/store';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { TranslateService } from '@ngx-translate/core';
import { CollectorService } from 'src/app/services/collector.service';
import { DashboardDataService, BandwidthTrendsResponse, TrendingData } from '../services/dashboard-data.service';
import { Collector, StorageStrategy, CaptureRequest, CaptureResponse, CaptureFileItem, SessionConnStats, SessionEventCount, SessionTrafficItem } from '../services/collector.service';

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
  // 展示指标
  uiAdapter?: string;
  uiDuration?: number | null;
  uiLogs?: number | null;
  uiEvents?: number | null;
  uiTrafficSeries?: any[] | null;
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

  // 文件上传进度相关属性
  uploadProgress = 0;
  isUploading = false;
  uploadStatusText = '';

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
  readonly captureBasePath = '/datastore/pcap/capture/';
  constructor(
    private http: HttpClient,
    public fb: FormBuilder,
    public storeData: Store<any>,
    private collectorService: CollectorService,
    private dashboardDataService: DashboardDataService,
    private translate: TranslateService,
    private router: Router
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
    // 从localStorage加载显示类型设置
    const savedDisplayType = localStorage.getItem('collector_displayType');
    if (savedDisplayType && (savedDisplayType === 'list' || savedDisplayType === 'grid')) {
      this.displayType = savedDisplayType;
    }

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
    // 重置搜索输入框内容
    this.searchUser = '';

    if (this.tab2.toLowerCase() === 'profile') {
      this.loadCaptureFiles();
    } else if (this.tab2.toLowerCase() === 'home') {
      // 切换到 Collector Analyzer 时重新执行搜索以重置过滤结果
      this.searchContacts();
    }
  }

  loadCaptureFiles() {
    this.collectorService.listCaptureFiles(this.captureBasePath).subscribe({
      next: (files) => {
        this.captureFiles = files;
      },
      error: (err) => {
        console.error('Error loading capture files:', err);
        this.translate.get('collectorMessages.errorLoadingCaptureFiles').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
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
        this.translate.get('collectorMessages.downloadFailed').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
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
      noData: {
        text: this.translate.instant('general.noData')
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
  // 移除默认静态数据，留空由实时数据填充
  series: [],
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
        if (!d || !d.name || !d.interfaceName) {
            return false;
        }
        return d.name.toLowerCase().includes(this.searchUser.toLowerCase()) ||
            d.interfaceName.toLowerCase().includes(this.searchUser.toLowerCase()) ||
            (d.storageStrategy && d.storageStrategy.toLowerCase().includes(this.searchUser.toLowerCase()));
    });
  }

  editUser(user: ContactList | null = null) {
    this.addContactModal.open();
    this.initForm();

    // 重置文件上传状态
    this.selectedFile = undefined;
    this.uploadProgress = 0;
    this.isUploading = false;
    this.uploadStatusText = '';

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
        filePath: user.path || ''
      });

      // 根据当前 Adapter 同步禁用/启用 Storage Strategy
      this.onAdapterChange(this.params.value.interfaceName);

      // 如果是 File 适配器且有文件路径，重新设置文件路径（因为 onAdapterChange 会清空它）
      if (user.interfaceName === 'File' && user.path) {
        this.params.patchValue({ filePath: user.path });
      }
    }
  }

  saveUser() {
    if (!this.params.valid) {
        this.translate.get('collectorMessages.pleaseFillRequiredFields').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
        return;
    }

  if (this.params.value.interfaceName === 'File' && !this.params.value.filePath) {
    this.translate.get('collectorMessages.pleaseUploadFileForAdapter').subscribe(msg => {
      this.showMessage(msg, 'error');
    });
    return;
  }

  // Storage Strategy 不是必填字段，移除验证

  const isFile = this.params.value.interfaceName === 'File';
  // 后端 storage_strategy NOT NULL：File 模式写入占位值；非 File 未选则传 undefined
  const storageStrategyName: string | undefined = isFile ? 'FILE' : (this.params.value.storageStrategy || undefined);

  const collectorData: Partial<Collector> = {
        name: this.params.value.name,
        interfaceName: this.params.value.interfaceName,
        storageStrategy: storageStrategyName,
        filterStrategy: this.params.value.filterStrategy,
        protocolAnalysisEnabled: this.params.value.protocolAnalysisEnabled || false,
        idsEnabled: this.params.value.idsEnabled || false,
        filePath: this.params.value.filePath || undefined,
        status: this.params.value.id ? this.params.value.status : 'start',
        creationTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    if (this.params.value.id) {
        // 更新
        this.collectorService.updateCollector(this.params.value.id, collectorData).subscribe(
            response => {
                this.translate.get('collectorMessages.collectorUpdatedSuccessfully').subscribe(msg => {
                  this.showMessage(msg);
                });
                this.loadCollectors();
                this.addContactModal.close();
            },
            error => {
                this.translate.get('collectorMessages.errorUpdatingCollector').subscribe(msg => {
                  this.showMessage(msg, 'error');
                });
            }
        );
    } else {
        // 创建新的
        this.collectorService.createCollector(collectorData).subscribe(
            response => {
                this.translate.get('collectorMessages.collectorCreatedSuccessfully').subscribe(msg => {
                  this.showMessage(msg);
                });
                this.loadCollectors();
                this.addContactModal.close();
            },
            error => {
                this.translate.get('collectorMessages.errorCreatingCollector').subscribe(msg => {
                  this.showMessage(msg, 'error');
                });
            }
        );
    }
  }

  deleteUser(user: ContactList) {
    this.translate.get(['Are you sure?', "You won't be able to revert this!", 'Yes, delete it!', 'Cancel', 'Deleting... Please wait', 'Deleting related data from Elasticsearch. This may take a while.'])
      .subscribe(translations => {
        Swal.fire({
            title: translations['Are you sure?'],
            text: translations["You won't be able to revert this!"],
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: translations['Yes, delete it!'],
            cancelButtonText: translations['Cancel'],
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                // 1) Start async ES deletion
                Swal.fire({
                  title: translations['Deleting... Please wait'],
                  html: translations['Deleting related data from Elasticsearch. This may take a while.'],
                  allowOutsideClick: false,
                  didOpen: () => Swal.showLoading()
                });

                this.collectorService.startEsDelete(user.id).subscribe({
                  next: ({ taskId }) => {
                    // 2) Poll status until DONE/FAILED
                    const pollInterval = 3000;
                    const poller = setInterval(() => {
                      this.collectorService.getEsDeleteStatus(taskId).subscribe({
                        next: (s) => {
                          if (!s || !s.state) return;
                          if (s.state === 'DONE') {
                            clearInterval(poller);
                            // 3) After ES deletion, delete the collector record
                            this.collectorService.deleteCollector(user.id).subscribe({
                              next: () => {
                                Swal.close();
                                this.loadCollectors();
                                this.translate.get('collectorMessages.collectorDeletedSuccessfully').subscribe(msg => {
                                  this.showMessage(msg);
                                });
                              },
                              error: () => {
                                Swal.close();
                                this.translate.get('collectorMessages.errorDeletingCollectorRecord').subscribe(msg => {
                                  this.showMessage(msg, 'error');
                                });
                              }
                            });
                          } else if (s.state === 'FAILED') {
                            clearInterval(poller);
                            Swal.close();
                            this.translate.get('collectorMessages.esDeletionFailed', { errorMessage: s.errorMessage || '' }).subscribe(msg => {
                              this.showMessage(msg, 'error');
                            });
                          }
                        },
                        error: () => {
                          clearInterval(poller);
                          Swal.close();
                          this.translate.get('collectorMessages.failedToQueryDeletionStatus').subscribe(msg => {
                            this.showMessage(msg, 'error');
                          });
                        }
                      });
                    }, pollInterval);
                  },
                  error: () => {
                    Swal.close();
                    this.translate.get('collectorMessages.failedToStartEsDeletionTask').subscribe(msg => {
                      this.showMessage(msg, 'error');
                    });
                  }
                });
            }
        });
      });
  }

  showMessage(msg = '', type = 'success') {
    this.translate.get(msg).subscribe(translatedMessage => {
      const toast: any = Swal.mixin({
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 3000,
        customClass: { container: 'toast' },
      });
      toast.fire({
        icon: type,
        title: translatedMessage,
        padding: '10px 20px',
      });
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
    // 重置上传状态
    this.uploadProgress = 0;
    this.isUploading = false;
    this.uploadStatusText = '';
  }

  // 清除文件选择
  clearFileSelection() {
    this.selectedFile = undefined;
    this.uploadProgress = 0;
    this.isUploading = false;
    this.uploadStatusText = '';
    // 清空文件输入框的值
    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    // 清空表单中的文件路径
    this.params.patchValue({ filePath: '' });
  }

  // 上传文件到固定目录并保存路径
  uploadSelectedFile() {
    if (!this.selectedFile) {
      this.translate.get('collectorMessages.pleaseChooseFileFirst').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
      return;
    }
    if (this.selectedFile.size === 0) {
      this.translate.get('collectorMessages.selectedFileEmpty').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
      return;
    }

    // 重置进度状态
    this.uploadProgress = 0;
    this.isUploading = true;
    this.uploadStatusText = '';

    const target = '/datastore/pcap/upload';
    this.collectorService.uploadPcapWithProgress(this.selectedFile, target).subscribe({
      next: (event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              this.uploadProgress = Math.round(100 * event.loaded / event.total);
              this.uploadStatusText = `${this.formatFileSize(event.loaded)} / ${this.formatFileSize(event.total)}`;
            }
            break;
          case HttpEventType.Response:
            this.isUploading = false;
            this.uploadProgress = 100;
            this.params.patchValue({ filePath: event.body.path });
            this.translate.get('collectorMessages.fileUploadedSuccessfully').subscribe(msg => {
              this.showMessage(msg);
              this.uploadStatusText = msg;
            });
            break;
        }
      },
      error: () => {
        this.isUploading = false;
        this.uploadProgress = 0;
        this.translate.get('collectorMessages.fileUploadFailed').subscribe(msg => {
          this.showMessage(msg, 'error');
          this.uploadStatusText = msg;
        });
      }
    });
  }

  // 格式化文件大小显示
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // 从文件路径中提取文件名
  getFileNameFromPath(filePath: string): string {
    if (!filePath) return '';
    return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
  }

  // 检查是否有已上传的文件
  hasUploadedFile(): boolean {
    return !!(this.params?.value?.filePath && this.params.value.filePath.trim() !== '');
  }

  loadCollectors() {
    this.collectorService.getAllCollectors().subscribe(
      data => {
        // 将Collector数据转换为ContactList格式
        this.contactList = data.map(collector => ({
          ...collector,
          role: '',
          email: '-',
          location: '-',
          phone: '-',
          posts: 0,
          followers: '0',
          following: 0,
          path: (collector as any).filePath || 'profile-35.png', // 使用后端返回的 filePath，如果没有则使用默认头像
          action: '',
          creationTime: this.formatDate(collector.creationTime),
          analysisCompleted: collector.status === 'completed' || collector.status === 'STATUS_FINISHED', // 初始化分析完成状态
          uiAdapter: collector.interfaceName,
          uiDuration: null,
          uiLogs: null,
          uiEvents: null,
          uiTrafficSeries: (collector.status === 'completed' || collector.status === 'STATUS_FINISHED' || collector.status === 'running' || collector.status === 'STATUS_STARTED' || collector.status === 'STATUS_READ_PKT_FIN' || collector.status === 'error') ? null : [] // 分析完成或正在运行的或部分完成的设置为null等待数据，否则设置为空数组显示默认样式
        }));

        // 检查并为正在运行的抓包任务启动状态轮询
        this.contactList.forEach(collector => {
          // 检查 status 为 running、STATUS_STARTED 或 STATUS_READ_PKT_FIN 的情况
          if (collector.sessionId && (collector.status === 'running' || collector.status === 'STATUS_STARTED' || collector.status === 'STATUS_READ_PKT_FIN')) {
            // 如果当前为 running，进入页面即开始轮询
            if (collector.status === 'running') {
              this.startStatusPolling(collector);
            }
            // 先获取一次当前状态
            this.collectorService.getSessionInfo(collector.sessionId).subscribe(
              (response: CaptureResponse) => {
                // 规范化完成态
                if (response.status === 'STATUS_FINISHED' || response.status === 'completed') {
                  collector.analysisCompleted = true;
                  collector.status = 'completed';
                  // 持久化状态，但不清理 sessionId
                  this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
                  // 提示分析完成
                  this.translate.get('collectorMessages.analysisCompleted').subscribe(msg => {
                    this.showMessage(msg);
                  });
                } else {
                  collector.status = response.status;
                }
                // 错误或会话不存在，处理异常情况
                if (response && response.error !== 0) {
                  const msg = (response.message || '').toLowerCase();
                  if (!response.status || msg.includes('no session found')) {
                    // 如果是分析文件模式且找不到session，说明分析已完成并自动清理了sessionId
                    if (collector.interfaceName === 'File') {
                      collector.analysisCompleted = true;
                      collector.status = 'completed';
                      this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
                      this.translate.get('collectorMessages.analysisCompleted').subscribe(msg => {
                        this.showMessage(msg);
                      });
                    } else {
                      // 非文件模式的调用异常才标记为异常
                      collector.status = 'error';
                      this.collectorService.updateCollectorStatus(collector.id, 'error').subscribe();
                    }
                    return;
                  }
                }
                // 如果状态是 STATUS_STARTED 或 STATUS_READ_PKT_FIN，启动轮询
                if (response.status === 'STATUS_STARTED' || response.status === 'STATUS_READ_PKT_FIN') {
                  this.startStatusPolling(collector);
                }
              },
              error => {
                console.error('Error getting session info:', error);
                // 如果是分析文件模式且找不到session，说明分析已完成并自动清理了sessionId
                // 这种情况应该认为是成功完成，而不是错误
                if (collector.interfaceName === 'File') {
                  collector.analysisCompleted = true;
                  collector.status = 'completed';
                  this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
                  this.translate.get('collectorMessages.analysisCompleted').subscribe(msg => {
                    this.showMessage(msg);
                  });
                } else {
                  // 非文件模式的调用异常才标记为异常
                  collector.status = 'error';
                  this.collectorService.updateCollectorStatus(collector.id, 'error').subscribe();
                }
              }
            );
          }
        });

        // 为每个有sessionId的条目加载ES指标
        this.contactList.forEach(c => {
          if (c.sessionId) {
            console.log('Loading metrics for collector:', c.name, 'with sessionId:', c.sessionId, 'status:', c.status);
            this.loadSessionMetrics(c);
          } else {
            console.log('Skipping metrics loading for collector:', c.name, 'no sessionId');
          }
        });

        this.searchContacts();
      },
      error => {
        console.error('Error loading collectors:', error);
      }
    );
  }

  private loadSessionMetrics(collector: ContactList) {
    const sessionId = collector.sessionId as string;
    console.log('Loading session metrics for collector:', collector.name, 'sessionId:', sessionId, 'status:', collector.status);

    // 判断是否应该加载带宽数据：分析完成 或 正在运行的状态 或 部分完成状态
    const shouldLoadBandwidth = collector.analysisCompleted ||
                               collector.status === 'running' ||
                               collector.status === 'STATUS_STARTED' ||
                               collector.status === 'STATUS_READ_PKT_FIN' ||
                               collector.status === 'error';

    console.log('Should load bandwidth:', shouldLoadBandwidth);

    // 如果既未完成分析也不在运行状态也不是部分完成状态，设置默认状态并跳过 Bandwidth 接口调用
    if (!shouldLoadBandwidth) {
      collector.uiLogs = 0;
      collector.uiDuration = 0;
      collector.uiEvents = 0;
      collector.uiTrafficSeries = []; // 设置为空数组，显示默认样式
      return;
    }

    // 连接统计（与interval无关）
    this.collectorService.getSessionConnStats(sessionId).subscribe({
      next: (s: SessionConnStats) => {
        collector.uiLogs = s.logs ?? 0;
        collector.uiDuration = s.avgConnDuration ?? 0;
      },
      error: () => {}
    });

    this.collectorService.getSessionEventCount(sessionId).subscribe({
      next: (e: SessionEventCount) => {
        collector.uiEvents = e.eventCount ?? 0;
      },
      error: () => {}
    });

    // 计算首末时间 -> 计算 interval -> 传给 ES 的 date_histogram
    this.collectorService.getEsTimeRangeByFilePath(sessionId, '*').subscribe({
      next: (range) => {
        if (!range || !range.hasData || !range.firstTimestamp || !range.lastTimestamp) {
          // 回退到旧逻辑（直接20点原始数据）
          this.loadTrafficFallback(sessionId, collector);
          return;
        }
        const startMs = new Date(range.firstTimestamp).getTime();
        const endMs = new Date(range.lastTimestamp).getTime();
        if (!isFinite(startMs) || !isFinite(endMs) || endMs <= startMs) {
          this.loadTrafficFallback(sessionId, collector);
          return;
        }
        const interval = this.computeAutoInterval(endMs - startMs, 20);
        this.dashboardDataService.getBandwidthTrends(startMs, endMs, sessionId, interval).subscribe({
          next: (resp: BandwidthTrendsResponse) => {
            console.log('Bandwidth trends response:', resp);
            const series = Object.keys(resp || {}).sort().map((key) => {
              const arr = (resp as any)[key] as TrendingData[];
              const idx = key.match(/(\d+)/)?.[1];
              const chName = idx != null ? `Channel ${Number(idx) + 1} Throughput` : key;
              const data = (arr || []).map(p => [p.timestamp, p.count]); // bps 数值
              return { name: chName, data };
            });
            console.log('Processed series:', series);
            collector.uiTrafficSeries = series.length ? series : [];
            console.log('Final uiTrafficSeries:', collector.uiTrafficSeries);
          },
          error: () => this.loadTrafficFallback(sessionId, collector)
        });
      },
      error: () => this.loadTrafficFallback(sessionId, collector)
    });
  }

  // 回退：不传 interval 的最少实现（最多20个点）
  private loadTrafficFallback(sessionId: string, collector: ContactList) {
    console.log('Using fallback traffic loading for sessionId:', sessionId);
    this.collectorService.getSessionTraffic(sessionId, undefined, undefined, 20).subscribe({
      next: (items: SessionTrafficItem[]) => {
        console.log('Fallback traffic items:', items);
        const groups: { [port: string]: [number, number][] } = {};
        for (const it of items || []) {
          const portKey = String(it.port ?? 0);
          const ts = typeof it.timestamp === 'number' ? (it.timestamp as unknown as number) : (it.timestamp ? new Date(it.timestamp).getTime() : Date.now());
          // 兼容回退：使用 util（百分比）已不再推荐；尽量从 bps 计算
          const utilNum = it.bps != null ? parseFloat(String((it as any).bps)) : (it.util != null ? parseFloat(String(it.util)) : 0);
          if (!groups[portKey]) groups[portKey] = [];
          groups[portKey].push([ts, utilNum]);
        }
        Object.values(groups).forEach(arr => arr.sort((a, b) => a[0] - b[0]));
  const series = Object.keys(groups).map(k => ({
          name: `Channel ${Number(k) + 1} Throughput`,
          data: groups[k]
        }));
  console.log('Fallback series:', series);
  collector.uiTrafficSeries = series.length ? series : [];
      },
      error: () => {
  console.log('Error in fallback traffic loading');
  collector.uiTrafficSeries = [];
      }
    });
  }

  // bps 格式化
  public formatBps(value: number): string {
    if (value == null || !isFinite(value)) return '0 bps';
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + ' Gbps';
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(2) + ' Mbps';
    if (abs >= 1_000) return (value / 1_000).toFixed(2) + ' Kbps';
    return Math.round(value) + ' bps';
  }

  // 依据时间跨度计算最接近目标点数的常用间隔
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

  loadStorageStrategies() {
    this.collectorService.getAllStorageStrategies().subscribe(
      data => {
        this.storageStrategies = data;
      },
      error => {
        console.error('Error loading storage strategies:', error);
        this.translate.get('collectorMessages.errorLoadingStorageStrategies').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
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
        this.translate.get('collectorMessages.pleaseFillRequiredFields').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
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
                this.translate.get('collectorMessages.storageStrategyUpdatedSuccessfully').subscribe(msg => {
                  this.showMessage(msg);
                });
                this.loadStorageStrategies();
                this.storageStrategyModal.close();
            },
            error => {
                this.translate.get('collectorMessages.errorUpdatingStorageStrategy').subscribe(msg => {
                  this.showMessage(msg, 'error');
                });
            }
        );
    } else {
        // 创建新的
        this.collectorService.createStorageStrategy(strategyData).subscribe(
            response => {
                this.translate.get('collectorMessages.storageStrategyCreatedSuccessfully').subscribe(msg => {
                  this.showMessage(msg);
                });
                this.loadStorageStrategies();
                this.storageStrategyModal.close();
            },
            error => {
                this.translate.get('collectorMessages.errorCreatingStorageStrategy').subscribe(msg => {
                  this.showMessage(msg, 'error');
                });
            }
        );
    }
  }

  deleteStorageStrategy(strategy: StorageStrategy) {
    this.translate.get(['Are you sure?', "You won't be able to revert this!", 'Yes, delete it!', 'Cancel'])
      .subscribe(translations => {
        Swal.fire({
            title: translations['Are you sure?'],
            text: translations["You won't be able to revert this!"],
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: translations['Yes, delete it!'],
            cancelButtonText: translations['Cancel'],
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.collectorService.deleteStorageStrategy(strategy.id).subscribe(
                    () => {
                        this.loadStorageStrategies();
                        this.translate.get('collectorMessages.storageStrategyDeletedSuccessfully').subscribe(msg => {
                          this.showMessage(msg);
                        });
                    },
                    error => {
                        this.translate.get('collectorMessages.errorDeletingStorageStrategy').subscribe(msg => {
                          this.showMessage(msg, 'error');
                        });
                    }
                );
            }
        });
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
            const statusKey = enabled ? 'collectorMessages.enabled' : 'collectorMessages.disabled';
            this.translate.get(statusKey).subscribe(status => {
              this.translate.get('collectorMessages.protocolAnalysisStatusChanged', { status }).subscribe(msg => {
                this.showMessage(msg);
              });
            });
        },
        error => {
            // 恢复开关状态
            event.target.checked = !enabled;
            this.translate.get('collectorMessages.errorUpdatingProtocolAnalysisStatus').subscribe(msg => {
              this.showMessage(msg, 'error');
            });
        }
    );
  }

  onIdsChange(collector: ContactList, event: any) {
    const enabled = event.target.checked;
    this.collectorService.updateCollectorEnabled(collector.id, 'ids', enabled).subscribe(
        () => {
            collector.idsEnabled = enabled;
            const statusKey = enabled ? 'collectorMessages.enabled' : 'collectorMessages.disabled';
            this.translate.get(statusKey).subscribe(status => {
              this.translate.get('collectorMessages.idsStatusChanged', { status }).subscribe(msg => {
                this.showMessage(msg);
              });
            });
        },
        error => {
            // 恢复开关状态
            event.target.checked = !enabled;
            this.translate.get('collectorMessages.errorUpdatingIdsStatus').subscribe(msg => {
              this.showMessage(msg, 'error');
            });
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
        this.translate.get('collectorMessages.errorLoadingNetworkInterfaces').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
      }
    );
  }

  startCapture(collector: ContactList) {
    // 同一 Adapter 类型（如 File 或 ens33）只能同时分析一个
    const adapter = collector.interfaceName;
    const hasRunningSameAdapter = this.contactList.some(c =>
      c.id !== collector.id && c.interfaceName === adapter && (c.status === 'running' || c.status === 'STATUS_STARTED' || c.status === 'STATUS_READ_PKT_FIN')
    );
    if (hasRunningSameAdapter) {
      this.translate.get('Adapter {{adapter}} already has a running task.', { adapter: adapter }).subscribe(message => {
        this.showMessage(message, 'error');
      });
      return;
    }

    // 获取对应的存储策略（仅非 File 模式尝试获取，未找到则继续，后续将不启用保存包）
    let storageStrategy: StorageStrategy | undefined;
    if (collector.interfaceName !== 'File') {
      storageStrategy = this.storageStrategies.find(s => s.name === collector.storageStrategy);
      // 如果未找到策略，不报错，继续执行（savePacket 将被禁用）
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

    // 非 File 开启保存；File 关闭保存；若未找到策略则禁用保存
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
        this.translate.get('collectorMessages.noFileSelectedUploadFirst').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
        return;
      }
      request.filePath = fp;
    }

    this.collectorService.startCapture(request as CaptureRequest).subscribe(
      (response: CaptureResponse) => {
        this.translate.get('collectorMessages.captureStartedSuccessfully').subscribe(msg => {
          this.showMessage(msg);
        });
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
        this.translate.get('collectorMessages.errorStartingCapture').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
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

            // 如果返回错误或会话不存在，处理异常情况
            if (response && response.error !== 0) {
              const msg = (response.message || '').toLowerCase();
              if (!response.status || msg.includes('no session found')) {
                this.stopStatusPolling(collector.id);
                // 如果是分析文件模式且找不到session，说明分析已完成并自动清理了sessionId
                if (collector.interfaceName === 'File') {
                  collector.analysisCompleted = true;
                  collector.status = 'completed';
                  this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
                  this.translate.get('collectorMessages.analysisCompleted').subscribe(msg => {
                    this.showMessage(msg);
                  });
                  // 刷新列表以反映UI变化
                  this.searchContacts();
                } else {
                  // 非文件模式的调用异常才标记为异常
                  collector.status = 'error';
                  this.collectorService.updateCollectorStatus(collector.id, 'error').subscribe();
                }
                return;
              }
            }

            // 只有当状态不是 STATUS_STARTED 或 STATUS_READ_PKT_FIN 时才停止轮询
            if (response.status !== 'STATUS_STARTED' && response.status !== 'STATUS_READ_PKT_FIN') {
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
                // 提示分析完成
                this.translate.get('collectorMessages.analysisCompleted').subscribe(msg => {
                  this.showMessage(msg);
                });
                // 刷新列表以反映UI变化
                this.searchContacts();
              }

              // 仅在未完成时显示错误
              if (response.error !== 0 && !isFinished) {
                this.translate.get('collectorMessages.captureError', { message: response.message || 'Unknown error' }).subscribe(msg => {
                  this.showMessage(msg, 'error');
                });
              }
            }
          },
          error => {
            console.error('Error getting session info:', error);
            this.stopStatusPolling(collector.id);
            // 如果是分析文件模式且找不到session，说明分析已完成并自动清理了sessionId
            // 这种情况应该认为是成功完成，而不是错误
            if (collector.interfaceName === 'File') {
              collector.analysisCompleted = true;
              collector.status = 'completed';
              this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
              this.translate.get('collectorMessages.analysisCompleted').subscribe(msg => {
                this.showMessage(msg);
              });
              // 刷新列表以反映UI变化
              this.searchContacts();
            } else {
              // 非文件模式的调用异常才标记为异常
              collector.status = 'error';
              this.collectorService.updateCollectorStatus(collector.id, 'error').subscribe();
            }
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
      this.translate.get('collectorMessages.noActiveCaptureSession').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
      return;
    }

    // 保存sessionId用于API调用
    const sessionId = collector.sessionId;

    // 停止轮询，等待API返回后再更新状态
    this.stopStatusPolling(collector.id);

    // 显示加载中
    this.translate.get(['Stopping...', 'Waiting for stop to complete.']).subscribe(translations => {
      Swal.fire({
        title: translations['Stopping...'],
        html: translations['Waiting for stop to complete.'],
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
    });

    this.collectorService.stopCapture(sessionId).subscribe(
      (response: CaptureResponse) => {
        Swal.close();
        // 根据返回结果更新状态
        const isFinished = response.status === 'completed' || response.status === 'STATUS_FINISHED';
        const isSuccess = response && response.error === 0;
        if (isFinished || isSuccess) {
          collector.status = 'completed';
          collector.analysisCompleted = true;
          this.collectorService.updateCollectorStatus(collector.id, 'completed').subscribe();
          this.searchContacts();
          this.translate.get('collectorMessages.captureStoppedSuccessfully').subscribe(msg => {
            this.showMessage(msg);
          });
        } else if (response.error !== 0) {
          // 停止失败，恢复为运行态并提示
          collector.status = 'running';
          this.translate.get('collectorMessages.stopFailed', { message: response.message || 'Unknown error' }).subscribe(msg => {
            this.showMessage(msg, 'error');
          });
          // 不再继续轮询，避免状态不一致
        } else {
          // 未返回完成，但也未报错，保持服务器返回状态（可能为null），不轮询
          collector.status = response.status || collector.status;
        }
      },
      error => {
        Swal.close();
        console.error('Error stopping capture:', error);
        // 失败则保持原状态（通常仍在运行），不再轮询
        this.translate.get('collectorMessages.failedToStopCapture').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
      }
    );
  }

  // 在组件销毁时清理所有定时器
  ngOnDestroy() {
    this.statusPollingMap.forEach((timer) => clearInterval(timer));
    this.statusPollingMap.clear();
  }

  confirmStopCapture(collector: ContactList) {
    this.translate.get(['Stop Capture', 'Are you sure you want to stop the capture?', 'Yes, stop it!', 'No, keep it running'])
      .subscribe(translations => {
        Swal.fire({
          title: translations['Stop Capture'],
          text: translations['Are you sure you want to stop the capture?'],
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: translations['Yes, stop it!'],
          cancelButtonText: translations['No, keep it running'],
          padding: '2em'
        }).then((result) => {
          if (result.value) {
            this.stopCapture(collector);
          }
        });
      });
  }

  // 跳转到 dashboard 并设置数据源
  navigateToDashboard(collector: ContactList) {
    // 检查 collector 是否有有效的 sessionId
    if (!collector.sessionId) {
      this.translate.get('collectorMessages.noSessionDataAvailable').subscribe(message => {
        this.showMessage(message, 'error');
      });
      return;
    }

    // 构造数据源信息
    const dataSource = {
      label: collector.name,
      value: collector.sessionId,
      status: collector.status || 'completed'
    };

    // 将数据源信息存储到 localStorage，供 header 组件使用
    try {
      localStorage.setItem('selected_data_source', JSON.stringify(dataSource));

      // 跳转到 dashboard
      this.router.navigate(['/']).then(() => {
        // 显示成功消息
        this.translate.get('collectorMessages.switchedToDataSource')
          .subscribe(message => {
            const successMessage = `${message || 'Switched to data source'}: ${collector.name}`;
            console.log('Navigating to dashboard with data source:', collector.name);
            this.showMessage(successMessage, 'success');
          });
      }).catch(error => {
        console.error('Navigation error:', error);
        this.translate.get('collectorMessages.errorNavigatingToDashboard').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
      });
    } catch (error) {
      console.error('Error saving data source:', error);
      this.translate.get('collectorMessages.errorNavigatingToDashboard').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
    }
  }

  // 切换显示类型并持久化保存
  setDisplayType(type: 'list' | 'grid') {
    this.displayType = type;
    localStorage.setItem('collector_displayType', type);
  }
}
