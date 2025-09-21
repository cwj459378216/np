import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { Store } from '@ngrx/store';
import { Router, NavigationEnd } from '@angular/router';
import { AppService } from '../service/app.service';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { environment } from 'src/environments/environment';
import { CollectorService, Collector } from 'src/app/services/collector.service';
import { TimeRangeService } from 'src/app/services/time-range.service';
import { DashboardDataService } from 'src/app/services/dashboard-data.service';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
    selector: 'header',
    templateUrl: './header.html',
    animations: [toggleAnimation],
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
    store: any;
    search = false;
    notifications: { id: number; profile?: string; message?: string; time?: string }[] = [
        // {
        //     id: 1,
        //     profile: 'user-profile.jpeg',
        //     message: '<strong class="text-sm mr-1">John Doe</strong>invite you to <strong>Prototyping</strong>',
        //     time: '45 min ago',
        // },
        // {
        //     id: 2,
        //     profile: 'profile-34.jpeg',
        //     message: '<strong class="text-sm mr-1">Adam Nolan</strong>mentioned you to <strong>UX Basics</strong>',
        //     time: '9h Ago',
        // },
        // {
        //     id: 3,
        //     profile: 'profile-16.jpeg',
        //     message: '<strong class="text-sm mr-1">Anna Morgan</strong>Upload a file',
        //     time: '9h Ago',
        // },
    ];
    messages = [
        {
            id: 1,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>`,
            ),
            title: 'Congratulations!',
            message: 'Your OS has been updated.',
            time: '1hr',
        },
        {
            id: 2,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`,
            ),
            title: 'Did you know?',
            message: 'You can switch between artboards.',
            time: '2hr',
        },
        {
            id: 3,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`,
            ),
            title: 'Something went wrong!',
            message: 'Send Reposrt',
            time: '2days',
        },
        {
            id: 4,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>`,
            ),
            title: 'Warning',
            message: 'Your password strength is low.',
            time: '5days',
        },
    ];

    // 新增: 数据源与时间范围选择相关属性
    dataSources: { label: string; value: string; status: string }[] = [];
    timeRanges = [
        { label: this.translate.instant('Last 1 Hour') || '最近1小时', value: '1h' },
        { label: this.translate.instant('Last 6 Hours') || '最近6小时', value: '6h' },
        { label: this.translate.instant('Last 12 Hours') || '最近12小时', value: '12h' },
        { label: this.translate.instant('Last 24 Hours') || '最近24小时', value: '24h' },
        { label: this.translate.instant('Last 7 Days') || '最近7天', value: '7d' },
    ];
    selectedDataSource = { label: '', value: '', status: '' };
    selectedTimeRange = this.timeRanges[3].value; // 默认24小时
    selectedQuickRange = this.timeRanges[3].value;

    // 自动更新相关属性
    autoUpdateInterval: any = null;
    isAutoUpdateEnabled = false;
    autoUpdateStartTime: Date | null = null;

    // 防抖相关属性
    private dataSourceChangeTimeout: any = null;

    @ViewChild('customRangeBox', { static: false }) customRangeBox?: ElementRef<HTMLLIElement>;

    // 时间选择器配置 (加入 inline 防止关闭，closeOnSelect=false)
    dateTimePickerOptions: any = {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        time24hr: true,
        maxDate: new Date(),
        allowInput: false, // 禁止手动输入，避免 blur 触发关闭
        closeOnSelect: false,
        enableSeconds: false,
        mode: 'range',
        static: true, // 始终固定在容器内
        // appendTo 会在 ngAfterViewInit 中绑定到 customRangeBox
        onChange: (selectedDates: Date[], dateStr: string) => this.handleRangeSelection(selectedDates, dateStr),
        onValueUpdate: (selectedDates: Date[], dateStr: string) => this.handleRangeSelection(selectedDates, dateStr)
    };

    // 自定义时间范围 (range 模式单输入)
    customRangeValue: string = '';
    isCustomTimeRange: boolean = false;
    lastAppliedRange: string = '';

    private _flatpickrGuardsAdded = false;

    currentUser: any = null;

    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private appSetting: AppService,
        private sanitizer: DomSanitizer,
        private collectorService: CollectorService,
        private timeRangeService: TimeRangeService,
        private dashboardDataService: DashboardDataService,
        private auth: AuthService,
    ) {
        this.initStore();
    }
    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
        this.setActiveDropdown();
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.setActiveDropdown();
                // 每次路由变化时重新加载collectors
        // 先尝试恢复（如果本次导航还没恢复过）
        const restored = this.restorePersistedState();
        this.loadCollectors();
        
        // 检查是否有从 collector 页面传递过来的数据源
        this.checkForNavigatedDataSource();
            }
        });

        // 初始化时间范围标签
        this.updateTimeRangeLabels();
    const restored = this.restorePersistedState();
    this.loadCollectors();
    if (!restored) this.initializeDefaultTimeRange();
    
    // 检查是否有从 collector 页面传递过来的数据源
    this.checkForNavigatedDataSource();
    }

    logout() {
        this.auth.logout();
        this.currentUser = null;
        this.router.navigate(['/auth/boxed-signin']);
    }

    ngAfterViewInit(): void {
        // 绑定 flatpickr 容器
        if (this.customRangeBox) {
            this.dateTimePickerOptions = {
                ...this.dateTimePickerOptions,
                appendTo: this.customRangeBox.nativeElement
            };
        }
        this.addFlatpickrGuards();
    }

    private addFlatpickrGuards() {
        if (this._flatpickrGuardsAdded) return;
        const events = ['mousedown','mouseup','click','pointerdown','pointerup','touchstart','touchend','focusin'];
        const guard = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target && target.closest('.flatpickr-calendar')) {
                // 在冒泡阶段阻断，允许 flatpickr 自己先处理
                e.stopPropagation();
            }
        };
        events.forEach(ev => document.addEventListener(ev, guard, false)); // 改为冒泡阶段
        this._flatpickrGuardsAdded = true;
    }

    private initializeDefaultTimeRange() {
        const endTime = new Date();
        const startTime = this.calculateStartTime('24h', endTime);
        console.log('Header initializing default time range:', { startTime, endTime });
        this.timeRangeService.updateTimeRange(startTime, endTime, 'Last 24 Hours', '24h');
    }

    loadCollectors() {
        this.collectorService.getAllCollectors().subscribe({
            next: (collectors: Collector[]) => {
                // 显示状态为 "completed"、"running"、以及 "error"（Partial）的 collectors
                const activeCollectors = collectors.filter(collector =>
                    collector.status === 'completed' || collector.status === 'running' || collector.status === 'error'
                );

                // 将active collectors转换为dataSources选项，name作为label，sessionId作为value，status作为status
                this.dataSources = activeCollectors.map(collector => ({
                    label: collector.name,
                    value: (collector as any).sessionId || '',
                    status: collector.status
                }));

                if (this.dataSources.length > 0) {
                    // 如果之前通过本地存储已经恢复了 selectedDataSource（value 不为空），尝试保持它
                    const hasRestored = !!this.selectedDataSource.value;
                    if (hasRestored) {
                        const matched = this.dataSources.find(ds => ds.value === this.selectedDataSource.value);
                        if (matched) {
                            // 用最新状态替换（更新 status 等）
                            this.selectedDataSource = matched;
                            // 如果已持久化时间范围存在，则不强制重新查询，避免覆盖用户选择
                            // 仅在需要自动更新时启动
                            if (this.isAutoUpdateEnabled) {
                                this.checkAndStartAutoUpdate();
                            }
                        } else {
                            // 持久化的dataSource已经不在列表里，退化到第一个
                            this.selectedDataSource = this.dataSources[0];
                            this.checkAndStartAutoUpdate();
                            this.queryDataSourceTimeRange(this.selectedDataSource.value);
                        }
                    } else {
                        // 没有已恢复的，正常初始化第一个
                        this.selectedDataSource = this.dataSources[0];
                        this.checkAndStartAutoUpdate();
                        this.queryDataSourceTimeRange(this.selectedDataSource.value);
                    }
                } else {
                    this.selectedDataSource = { label: '', value: '', status: '' };
                    // 没有数据源时设置默认时间范围（且允许持久化覆盖）
                    if (!this.customRangeValue && !this.selectedQuickRange) {
                        this.setDefaultTimeRange();
                    }
                }

                console.log('Active collectors (completed/running) loaded, default selected:', {
                    selectedDataSource: this.selectedDataSource,
                    status: this.selectedDataSource.status,
                    isRunning: this.selectedDataSource.status === 'running',
                    autoUpdateEnabled: this.isAutoUpdateEnabled
                });
                // 加载完成后再持久化一次（保持最新status）
                this.persistState();
            },
            error: (error) => {
                console.error('Error loading collectors for data sources:', error);
                // 发生错误时设置为空
                this.dataSources = [];
                this.selectedDataSource = { label: '', value: '', status: '' };
                this.setDefaultTimeRange();
                this.persistState();
            }
        });
    }

    shouldShowDataSourceAndTimeRange(): boolean {
        const currentUrl = this.router.url;

        // Dashboard相关页面
        const dashboardRoutes = [
            '/',           // 首页dashboard
            '/dashboard',  // dashboard页面
            '/analytics',  // analytics页面
            '/finance',    // finance页面
            '/crypto',     // crypto页面
        ];

        // 检查是否是dashboard页面
        const isDashboardPage = dashboardRoutes.some(route => {
            if (route === '/') {
                return currentUrl === '/' || currentUrl === '';
            }
            return currentUrl.startsWith(route);
        });

        // 检查是否是protocol-analysis相关页面
        const isProtocolAnalysisPage = currentUrl.startsWith('/protocol-analysis');

        // 检查是否是event页面
        const isEventPage = currentUrl.startsWith('/alarm/event');

        const shouldShow = isDashboardPage || isProtocolAnalysisPage || isEventPage;

        // 开发环境下的调试信息
        // if (!environment.production) {
        //     console.log('Header visibility check:', {
        //         currentUrl,
        //         isDashboardPage,
        //         isProtocolAnalysisPage,
        //         isEventPage,
        //         shouldShow
        //     });
        // }

        return shouldShow;
    }

    updateTimeRangeLabels() {
        this.timeRanges = [
            { label: this.translate.instant('Last 1 Hour') || '最近1小时', value: '1h' },
            { label: this.translate.instant('Last 6 Hours') || '最近6小时', value: '6h' },
            { label: this.translate.instant('Last 12 Hours') || '最近12小时', value: '12h' },
            { label: this.translate.instant('Last 24 Hours') || '最近24小时', value: '24h' },
            { label: this.translate.instant('Last 7 Days') || '最近7天', value: '7d' },
        ];
    }

    setActiveDropdown() {
        const selector = document.querySelector('ul.horizontal-menu a[routerLink="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove('active');
            }
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add('active');
                    });
                }
            }
        }
    }

    removeNotification(value: number) {
        this.notifications = this.notifications.filter((d) => d.id !== value);
    }

    removeMessage(value: number) {
        this.messages = this.messages.filter((d) => d.id !== value);
    }

    changeLanguage(item: any) {
        this.translate.use(item.code);
        this.appSetting.toggleLanguage(item);
        if (this.store.locale?.toLowerCase() === 'ae') {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'rtl' });
        } else {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'ltr' });
        }
        window.location.reload();
    }

    // 新增: 选择变化事件
    onDataSourceChange(dataSource?: any) {
        if (dataSource) {
            console.log('Data source changing from', this.selectedDataSource.label, 'to', dataSource.label);

            // 清除之前的防抖定时器
            if (this.dataSourceChangeTimeout) {
                clearTimeout(this.dataSourceChangeTimeout);
            }

            // 先停止当前的自动更新
            this.stopAutoUpdate();

            // 更新选中的数据源
            this.selectedDataSource = dataSource;
            // 立即持久化当前已选择的数据源（即使时间范围稍后才查询完成）
            this.persistState();

            // 重置时间相关状态
            this.isCustomTimeRange = false;
            this.selectedQuickRange = '';
            this.customRangeValue = '';
            this.autoUpdateStartTime = null;

            // 使用防抖机制，避免快速切换导致的问题
            this.dataSourceChangeTimeout = setTimeout(() => {
                console.log('Executing data source change after debounce:', dataSource.label);
                this.queryDataSourceTimeRange(dataSource.value);
                this.persistState();
            }, 100); // 100ms 防抖延迟
        }
        console.log('Data source changed:', this.selectedDataSource);
    }

    onTimeRangeChange() {
        // TODO: 根据实际需求触发数据刷新或状态更新
        console.log('Time range changed:', this.selectedTimeRange);
    }

    onCustomTimeChange() {
        // 标记进入自定义模式（模板仍引用）
        this.isCustomTimeRange = true;
    }

    getTimeRangeDisplay(): string {
        if (this.isCustomTimeRange && this.customRangeValue) {
            return this.customRangeValue.replace(' to ', ' - ');
        }
        const range = this.timeRanges.find(tr => tr.value === this.selectedQuickRange);
        return range ? range.label : this.translate.instant('Select Time') || '选择时间';
    }

    onQuickTimeSelect(timeRange: any) {
        this.selectedQuickRange = timeRange.value;
        this.selectedTimeRange = timeRange.value;
        this.isCustomTimeRange = false;
        this.customRangeValue = '';

        // 计算实际的时间范围
        const endTime = new Date();
        const startTime = this.calculateStartTime(timeRange.value, endTime);

        console.log('Quick time selected:', {
            range: timeRange.label,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
        });

        // 如果当前是运行状态且自动更新已启用，更新开始时间
        if (this.selectedDataSource.status === 'running' && this.isAutoUpdateEnabled) {
            this.autoUpdateStartTime = startTime;
            console.log('Updated auto-update start time to:', startTime.toISOString());
        }

        // 触发数据刷新
        this.onTimeRangeApplied(startTime, endTime);
    this.persistState();
    }

    calculateStartTime(rangeValue: string, endTime: Date): Date {
        return this.timeRangeService.calculateStartTime(rangeValue, endTime);
    }

    onTimeRangeApplied(startTime: Date, endTime: Date) {
        // 更新时间范围服务的状态
        const currentRange = this.isCustomTimeRange
            ? { label: 'Custom Range', value: 'custom' }
            : this.timeRanges.find(tr => tr.value === this.selectedQuickRange) || { label: 'Custom', value: 'custom' };

        // 传递当前选择的文件路径
        this.timeRangeService.updateTimeRange(
            startTime,
            endTime,
            currentRange.label,
            currentRange.value,
            this.selectedDataSource.value // 传递文件路径
        );

        console.log('Time range applied:', {
            startTime,
            endTime,
            label: currentRange.label,
            filePath: this.selectedDataSource.value
        });
    this.persistState();
    }

    ngOnDestroy(): void {
        // 清理自动更新定时器
        this.stopAutoUpdate();

        // 清理防抖定时器
        if (this.dataSourceChangeTimeout) {
            clearTimeout(this.dataSourceChangeTimeout);
            this.dataSourceChangeTimeout = null;
        }

        // 不移除监听（菜单生命周期内复用），如需严格清理可记录并移除
    }

    // 保留 handleRangeSelection / applyCustomTimeRange / formatDate 等原有方法
    private formatDate(d: Date): string {
        const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    // 格式化日期为本地时间显示（用于UI显示）
    private formatDateLocal(d: Date): string {
        const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
        // 使用本地时间，不进行UTC转换
        const formatted = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

        console.log('formatDateLocal:', {
            input: d.toString(),
            utc: d.toISOString(),
            local: d.toLocaleString(),
            formatted: formatted,
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            date: d.getDate(),
            hours: d.getHours(),
            minutes: d.getMinutes()
        });

        return formatted;
    }

    // 解析时间戳，支持多种格式
    private parseTimestamp(timestamp: any): Date {
        if (!timestamp) {
            throw new Error('Timestamp is null or undefined');
        }

        let date: Date;

        // 如果是数字（Unix时间戳）
        if (typeof timestamp === 'number') {
            // 检查是否是毫秒时间戳（13位）还是秒时间戳（10位）
            if (timestamp.toString().length === 10) {
                date = new Date(timestamp * 1000);
            } else {
                date = new Date(timestamp);
            }
        }
        // 如果是字符串
        else if (typeof timestamp === 'string') {
            // 特殊处理格式：2025-09-14T11:07:28（没有时区信息）
            if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
                // 这种格式通常表示UTC时间，需要添加Z后缀
                const utcTimestamp = timestamp + 'Z';
                date = new Date(utcTimestamp);
                console.log('Detected UTC format without timezone, added Z suffix:', {
                    original: timestamp,
                    modified: utcTimestamp,
                    parsedAsUTC: date.toISOString(),
                    parsedAsLocal: date.toString()
                });
            }
            // 处理带微秒的格式：2025-09-14T14:05:08.427829
            else if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+$/)) {
                // 这种格式也通常表示UTC时间，需要添加Z后缀
                const utcTimestamp = timestamp + 'Z';
                date = new Date(utcTimestamp);
                console.log('Detected UTC format with microseconds, added Z suffix:', {
                    original: timestamp,
                    modified: utcTimestamp,
                    parsedAsUTC: date.toISOString(),
                    parsedAsLocal: date.toString()
                });
            }
            // 处理带时区的格式：2025-09-14T11:07:28Z
            else if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
                // 已经是UTC格式，直接解析
                date = new Date(timestamp);
                console.log('Detected UTC format with Z suffix:', {
                    original: timestamp,
                    parsedAsUTC: date.toISOString(),
                    parsedAsLocal: date.toString()
                });
            }
            else {
                // 尝试直接解析其他格式
                date = new Date(timestamp);
            }

            // 如果解析失败，尝试其他格式
            if (isNaN(date.getTime())) {
                // 尝试解析为数字
                const numTimestamp = parseInt(timestamp, 10);
                if (!isNaN(numTimestamp)) {
                    if (timestamp.length === 10) {
                        date = new Date(numTimestamp * 1000);
                    } else {
                        date = new Date(numTimestamp);
                    }
                } else {
                    throw new Error(`Unable to parse timestamp: ${timestamp}`);
                }
            }
        }
        // 其他类型
        else {
            date = new Date(timestamp);
        }

        // 验证解析结果
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid timestamp: ${timestamp}`);
        }

        console.log('Timestamp parsing result:', {
            original: timestamp,
            type: typeof timestamp,
            parsed: date.toString(),
            utc: date.toISOString(),
            local: date.toLocaleString(),
            timezoneOffset: date.getTimezoneOffset(),
            localHours: date.getHours(),
            localMinutes: date.getMinutes()
        });

        return date;
    }

    private handleRangeSelection(selectedDates: Date[], dateStr: string) {
        if (!selectedDates || selectedDates.length < 1) return;
        // 更新模型字符串（flatpickr 已写入 input, 但确保同步对象）
        this.customRangeValue = dateStr;
        if (selectedDates.length === 2) {
            let [start, end] = selectedDates;
            if (start > end) { const t = start; start = end; end = t; }
            const now = new Date();
            if (end > now) end = now;
            // 生成标准格式字符串
            const formatted = this.formatDateLocal(start) + ' to ' + this.formatDateLocal(end);
            this.customRangeValue = formatted;
            if (formatted === this.lastAppliedRange) return; // 避免重复
            this.isCustomTimeRange = true;
            this.selectedQuickRange = '';
            this.lastAppliedRange = formatted;
            this.onTimeRangeApplied(start, end);
        }
    }

    private parseRangeString(range: string): { start: Date; end: Date } | null {
        if (!range || !range.includes(' to ')) return null;
        const [s, e] = range.split(' to ');
        const start = new Date(s.trim());
        const end = new Date(e.trim());
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
        return { start, end };
    }

    applyCustomTimeRange(event?: Event) {
        if (event) event.stopPropagation();
        if (!this.customRangeValue) return;
        const parsed = this.parseRangeString(this.customRangeValue);
        if (!parsed) return;
        if (parsed.start >= parsed.end) {
            alert(this.translate.instant('Start time must be before end time') || '开始时间必须早于结束时间');
            return;
        }
        const now = new Date();
        if (parsed.end > now) parsed.end = now;
        const formatted = this.formatDateLocal(parsed.start) + ' to ' + this.formatDateLocal(parsed.end);
        this.customRangeValue = formatted;
        this.isCustomTimeRange = true;
        this.selectedQuickRange = '';

        // 如果当前是运行状态且自动更新已启用，更新开始时间
        if (this.selectedDataSource.status === 'running' && this.isAutoUpdateEnabled) {
            this.autoUpdateStartTime = parsed.start;
            console.log('Updated auto-update start time to:', parsed.start.toISOString());
        }

        if (formatted !== this.lastAppliedRange) {
            this.lastAppliedRange = formatted;
            this.onTimeRangeApplied(parsed.start, parsed.end);
            this.persistState();
        }
        // 关闭菜单: 触发一次 body click (hlMenu OutsideClick) 或使用更安全方式
        try {
            setTimeout(() => {
                document.body.click();
            }, 0);
        } catch {}
    }

    // 新增: 查询数据源时间范围的方法
    private queryDataSourceTimeRange(filePath: string) {
        if (!filePath) {
            // 如果没有filePath，使用默认时间范围
            this.setDefaultTimeRange();
            return;
        }

        // 只传递filePath和index参数，不传递时间参数
        this.dashboardDataService.queryDataByFilePath(
            filePath,
            '*' // 使用通配符索引
        ).subscribe({
            next: (data: any) => {
                this.processDataSourceTimeRange(data, filePath);
            },
            error: (error: any) => {
                console.error('Error querying data for data source:', error);
                this.setDefaultTimeRange();
            }
        });
    }

    // 新增: 处理数据源时间范围的方法
    private processDataSourceTimeRange(data: any, filePath: string) {
        try {
            let startTime: Date;
            let endTime: Date;

            if (data && data.firstTimestamp && data.lastTimestamp) {
                // 详细调试时间转换过程
                console.log('Raw timestamps from API:', {
                    firstTimestamp: data.firstTimestamp,
                    lastTimestamp: data.lastTimestamp,
                    firstTimestampType: typeof data.firstTimestamp,
                    lastTimestampType: typeof data.lastTimestamp
                });

                // 尝试不同的时间解析方式
                startTime = this.parseTimestamp(data.firstTimestamp);
                endTime = this.parseTimestamp(data.lastTimestamp);

                console.log('Parsed timestamps:', {
                    startTime: startTime.toString(),
                    endTime: endTime.toString(),
                    startTimeUTC: startTime.toISOString(),
                    endTimeUTC: endTime.toISOString(),
                    startTimeLocal: startTime.toLocaleString(),
                    endTimeLocal: endTime.toLocaleString(),
                    timezoneOffset: startTime.getTimezoneOffset()
                });
            } else {
                throw new Error('No timestamp data found');
            }

            // 确保时间范围合理
            if (startTime >= endTime) {
                console.warn('Start time is not before end time, adjusting...');
                startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 1天前
            }

            // 根据是否有实际数据来设置标签
            const timeRangeLabel = data.isDefaultRange
                ? `Data Source: ${this.selectedDataSource.label} (Default 24h)`
                : `Data Source: ${this.selectedDataSource.label}`;

            // 更新时间范围，传递文件路径
            this.timeRangeService.updateTimeRange(
                startTime,
                endTime,
                timeRangeLabel,
                'custom',
                filePath // 传递文件路径
            );

            // 更新UI状态 - 使用本地时间格式显示
            this.isCustomTimeRange = true;
            this.selectedQuickRange = '';
            this.customRangeValue = this.formatDateLocal(startTime) + ' to ' + this.formatDateLocal(endTime);

            // 如果是running状态，设置固定的开始时间用于自动更新
            if (this.selectedDataSource.status === 'running') {
                this.autoUpdateStartTime = startTime;
                console.log('Running state: set fixed firstTimestamp for auto update:', startTime.toISOString());

                // 在API调用完成后启动自动更新
                this.checkAndStartAutoUpdate();
            }

            console.log('Final display values:', {
                filePath,
                startTimeUTC: startTime.toISOString(),
                endTimeUTC: endTime.toISOString(),
                startTimeLocal: startTime.toString(),
                endTimeLocal: endTime.toString(),
                displayValue: this.customRangeValue,
                formattedStart: this.formatDateLocal(startTime),
                formattedEnd: this.formatDateLocal(endTime),
                hasData: data.hasData,
                isDefaultRange: data.isDefaultRange,
                isRunning: this.selectedDataSource.status === 'running',
                fixedStartTime: this.autoUpdateStartTime?.toISOString(),
                dataSourceLabel: this.selectedDataSource.label
            });

            // 成功处理后立即持久化（确保数据源切换后时间范围被保存）
            this.persistState();

        } catch (error) {
            console.error('Error processing data source time range:', error);
            this.setDefaultTimeRange();
        }
    }

    // 新增: 设置默认时间范围
    private setDefaultTimeRange() {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1小时前

        this.timeRangeService.updateTimeRange(
            startTime,
            endTime,
            'Last 1 Hour',
            '1h'
        );

        this.isCustomTimeRange = false;
        this.selectedQuickRange = '1h';
        this.customRangeValue = '';

        console.log('Default time range set (1 hour)');

    // 默认时间范围设定后持久化
    this.persistState();
    }

    // 检查并启动自动更新
    private checkAndStartAutoUpdate() {
        console.log('checkAndStartAutoUpdate called:', {
            status: this.selectedDataSource.status,
            isRunning: this.selectedDataSource.status === 'running',
            currentAutoUpdate: this.isAutoUpdateEnabled
        });

        if (this.selectedDataSource.status === 'running') {
            this.startAutoUpdate();
        } else {
            this.stopAutoUpdate();
        }
    }

    // 启动自动更新
    private startAutoUpdate() {
        if (this.isAutoUpdateEnabled) {
            return; // 已经在运行
        }

        this.isAutoUpdateEnabled = true;

        // 在running状态下，使用API返回的firstTimestamp作为固定的开始时间
        // 不要使用getCurrentStartTime()，因为那可能会改变开始时间
        if (this.selectedDataSource.status === 'running') {
            // 如果没有autoUpdateStartTime，尝试从当前时间范围获取
            if (!this.autoUpdateStartTime) {
                // 从customRangeValue解析开始时间
                if (this.customRangeValue && this.customRangeValue.includes(' to ')) {
                    const parsed = this.parseRangeString(this.customRangeValue);
                    if (parsed) {
                        this.autoUpdateStartTime = parsed.start;
                        console.log('Running state: extracted start time from customRangeValue:', this.autoUpdateStartTime.toISOString());
                    } else {
                        // 如果解析失败，使用1小时前作为默认值
                        this.autoUpdateStartTime = new Date(Date.now() - 60 * 60 * 1000);
                        console.log('Running state: using default start time (1 hour ago):', this.autoUpdateStartTime.toISOString());
                    }
                } else {
                    // 如果没有customRangeValue，使用1小时前作为默认值
                    this.autoUpdateStartTime = new Date(Date.now() - 60 * 60 * 1000);
                    console.log('Running state: using default start time (1 hour ago):', this.autoUpdateStartTime.toISOString());
                }
            } else {
                console.log('Running state: keeping existing firstTimestamp for auto update:', this.autoUpdateStartTime.toISOString());
            }
        } else {
            // 非running状态才获取当前时间范围的开始时间
            this.autoUpdateStartTime = this.getCurrentStartTime();
        }

        // 重新启动自动更新时，立即更新结束时间为当前时间
        this.updateEndTimeToNow();

        // 每6秒更新一次结束时间
        this.autoUpdateInterval = setInterval(() => {
            this.updateEndTimeToNow();
        }, 6000);

        console.log('Auto update started for running data source, start time:', this.autoUpdateStartTime?.toISOString());
    }

    // 停止自动更新
    private stopAutoUpdate() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
            this.autoUpdateInterval = null;
        }
        this.isAutoUpdateEnabled = false;
        this.autoUpdateStartTime = null;

        console.log('Auto update stopped');
    // 停止自动更新后持久化状态
    this.persistState();
    }

    // 手动切换自动更新状态
    public toggleAutoUpdate() {
        console.log('toggleAutoUpdate called:', {
            currentStatus: this.selectedDataSource.status,
            currentAutoUpdate: this.isAutoUpdateEnabled,
            hasAutoUpdateStartTime: !!this.autoUpdateStartTime,
            customRangeValue: this.customRangeValue
        });

        if (this.selectedDataSource.status !== 'running') {
            console.warn('Cannot toggle auto update: data source is not in running state');
            return; // 只有运行状态才能切换
        }

        if (this.isAutoUpdateEnabled) {
            console.log('Stopping auto update...');
            this.stopAutoUpdate();
        } else {
            console.log('Starting auto update... (will update end time to current time)');
            this.startAutoUpdate();
        }

        console.log('Auto update toggled result:', {
            enabled: this.isAutoUpdateEnabled,
            dataSource: this.selectedDataSource.label,
            status: this.selectedDataSource.status,
            hasInterval: !!this.autoUpdateInterval
        });
    // 切换自动更新后持久化状态
    this.persistState();
    }

    // 更新结束时间为当前时间
    private updateEndTimeToNow() {
        if (!this.isAutoUpdateEnabled) {
            return;
        }

        const now = new Date();
        let startTime: Date;

        // 在running状态下，始终使用API返回的firstTimestamp作为开始时间
        if (this.selectedDataSource.status === 'running' && this.autoUpdateStartTime) {
            startTime = this.autoUpdateStartTime;
            console.log('Running state: using fixed firstTimestamp as start time:', startTime.toISOString());
        } else if (this.autoUpdateStartTime) {
            startTime = this.autoUpdateStartTime;
        } else {
            console.warn('No start time available for auto update');
            return;
        }

        // 确保开始时间不会超过结束时间
        if (startTime >= now) {
            console.warn('Start time is not before end time, adjusting...');
            if (this.selectedDataSource.status === 'running') {
                // 在running状态下，不允许修改开始时间，停止自动更新
                console.error('Running state: cannot adjust start time, stopping auto update');
                this.stopAutoUpdate();
                return;
            } else {
                this.autoUpdateStartTime = new Date(now.getTime() - 60 * 60 * 1000); // 设置为1小时前
                return;
            }
        }

        // 更新时间范围，保持开始时间不变，结束时间更新为当前时间
        this.timeRangeService.updateTimeRange(
            startTime,
            now,
            `Live Data: ${this.selectedDataSource.label}`,
            'live',
            this.selectedDataSource.value
        );

        // 更新UI状态 - 保持开始时间不变
        this.isCustomTimeRange = true;
        this.selectedQuickRange = '';
        this.customRangeValue = this.formatDateLocal(startTime) + ' to ' + this.formatDateLocal(now);

        console.log('End time updated to now:', {
            startTime: startTime.toISOString(),
            endTime: now.toISOString(),
            duration: Math.round((now.getTime() - startTime.getTime()) / 1000 / 60) + ' minutes',
            startTimeFormatted: this.formatDateLocal(startTime),
            endTimeFormatted: this.formatDateLocal(now),
            isRunning: this.selectedDataSource.status === 'running',
            usingFixedStartTime: this.selectedDataSource.status === 'running',
            updateType: this.autoUpdateInterval ? 'scheduled' : 'immediate'
        });
    // 自动更新结束时间后持久化（保持实时显示刷新后的时间范围）
    this.persistState();
    }

    // 检查是否应该禁用时间选择
    public isTimeRangeDisabled(): boolean {
        return this.selectedDataSource.status === 'running' && this.isAutoUpdateEnabled;
    }

    // 获取自动更新状态显示文本
    public getAutoUpdateStatusText(): string {
        if (this.selectedDataSource.status !== 'running') {
            return '';
        }
        const onText = this.translate.instant('collectorStatus.autoUpdateOn') || 'Auto Update: ON';
        const offText = this.translate.instant('collectorStatus.autoUpdateOff') || 'Auto Update: OFF';
        return this.isAutoUpdateEnabled ? onText : offText;
    }

    // 获取当前时间范围的开始时间
    private getCurrentStartTime(): Date {
        // 如果已经有自定义时间范围，解析开始时间
        if (this.customRangeValue && this.customRangeValue.includes(' to ')) {
            const parsed = this.parseRangeString(this.customRangeValue);
            if (parsed) {
                return parsed.start;
            }
        }

        // 如果有快速选择的时间范围，计算开始时间
        if (this.selectedQuickRange && !this.isCustomTimeRange) {
            const endTime = new Date();
            return this.calculateStartTime(this.selectedQuickRange, endTime);
        }

        // 默认返回1小时前
        const endTime = new Date();
        return new Date(endTime.getTime() - 60 * 60 * 1000);
    }

    // 调试方法：测试时间转换
    public debugTimeConversion(timestamp: any) {
        console.log('=== Time Conversion Debug ===');
        console.log('Input timestamp:', timestamp, 'Type:', typeof timestamp);

        try {
            const parsed = this.parseTimestamp(timestamp);
            const formatted = this.formatDateLocal(parsed);

            console.log('Conversion result:', {
                original: timestamp,
                parsed: parsed.toString(),
                utc: parsed.toISOString(),
                local: parsed.toLocaleString(),
                formatted: formatted,
                timezoneOffset: parsed.getTimezoneOffset(),
                isUTCFormat: timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) ? 'Yes (added Z)' : 'No'
            });

            return {
                success: true,
                parsed,
                formatted
            };
        } catch (error) {
            console.error('Time conversion failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // 测试特定格式的时间转换
    public testApiTimeFormat() {
        console.log('=== Testing API Time Format ===');
        const testTimestamp = '2025-09-14T11:07:28';

        console.log('=== Detailed Time Analysis ===');
        console.log('Original timestamp:', testTimestamp);
        console.log('Current timezone offset:', new Date().getTimezoneOffset(), 'minutes');

        // 测试不同的解析方式
        const asUTC = new Date(testTimestamp + 'Z');
        const asLocal = new Date(testTimestamp);

        console.log('Parsing results:', {
            'as UTC (with Z)': {
                date: asUTC.toString(),
                iso: asUTC.toISOString(),
                local: asUTC.toLocaleString(),
                hours: asUTC.getHours(),
                minutes: asUTC.getMinutes()
            },
            'as Local (no Z)': {
                date: asLocal.toString(),
                iso: asLocal.toISOString(),
                local: asLocal.toLocaleString(),
                hours: asLocal.getHours(),
                minutes: asLocal.getMinutes()
            },
            'difference (ms)': asUTC.getTime() - asLocal.getTime(),
            'difference (hours)': (asUTC.getTime() - asLocal.getTime()) / (1000 * 60 * 60)
        });

        // 格式化测试
        const utcFormatted = this.formatDateLocal(asUTC);
        const localFormatted = this.formatDateLocal(asLocal);

        console.log('Formatting results:', {
            'UTC formatted': utcFormatted,
            'Local formatted': localFormatted,
            'Expected (UTC+8)': '2025-09-14 19:07'
        });

        // 手动验证
        console.log('=== Manual Verification ===');
        const manualUTC = new Date('2025-09-14T11:07:28Z');
        console.log('Manual UTC parsing:', {
            date: manualUTC.toString(),
            iso: manualUTC.toISOString(),
            local: manualUTC.toLocaleString(),
            formatted: this.formatDateLocal(manualUTC)
        });

        return this.debugTimeConversion(testTimestamp);
    }

    // 验证时间一致性
    public validateTimeConsistency() {
        console.log('=== Time Consistency Validation ===');
        console.log('Current state:', {
            selectedDataSource: this.selectedDataSource,
            customRangeValue: this.customRangeValue,
            isCustomTimeRange: this.isCustomTimeRange,
            autoUpdateStartTime: this.autoUpdateStartTime?.toISOString(),
            isAutoUpdateEnabled: this.isAutoUpdateEnabled
        });

        if (this.customRangeValue && this.customRangeValue.includes(' to ')) {
            const parsed = this.parseRangeString(this.customRangeValue);
            if (parsed) {
                console.log('Parsed time range:', {
                    start: parsed.start.toISOString(),
                    end: parsed.end.toISOString(),
                    startLocal: parsed.start.toString(),
                    endLocal: parsed.end.toString(),
                    formatted: this.formatDateLocal(parsed.start) + ' to ' + this.formatDateLocal(parsed.end)
                });
            }
        }
    }

    // 测试您提供的具体时间戳
    public testSpecificTimestamps() {
        console.log('=== Testing Specific API Timestamps ===');

        const firstTimestamp = "2025-09-14T11:07:28";
        const lastTimestamp = "2025-09-14T14:05:08.427829";

        console.log('Original API timestamps:', {
            firstTimestamp,
            lastTimestamp
        });

        // 解析时间戳
        const startTime = this.parseTimestamp(firstTimestamp);
        const endTime = this.parseTimestamp(lastTimestamp);

        // 格式化显示
        const formattedStart = this.formatDateLocal(startTime);
        const formattedEnd = this.formatDateLocal(endTime);
        const displayValue = formattedStart + ' to ' + formattedEnd;

        console.log('Parsed and formatted result:', {
            startTime: {
                original: firstTimestamp,
                parsed: startTime.toString(),
                utc: startTime.toISOString(),
                local: startTime.toLocaleString(),
                formatted: formattedStart
            },
            endTime: {
                original: lastTimestamp,
                parsed: endTime.toString(),
                utc: endTime.toISOString(),
                local: endTime.toLocaleString(),
                formatted: formattedEnd
            },
            displayValue: displayValue,
            expected: '2025-09-14 19:07 to 2025-09-14 22:05 (UTC+8)'
        });

        return {
            startTime,
            endTime,
            displayValue,
            formattedStart,
            formattedEnd
        };
    }

    // 检查并应用从其他页面传递过来的数据源
    private checkForNavigatedDataSource() {
        try {
            const savedDataSource = localStorage.getItem('selected_data_source');
            if (savedDataSource) {
                const dataSource = JSON.parse(savedDataSource);
                console.log('Found navigated data source:', dataSource);
                
                // 验证数据源格式
                if (dataSource && dataSource.label && dataSource.value) {
                    // 等待 collectors 加载完成后再设置数据源
                    const checkCollectors = () => {
                        if (this.dataSources && this.dataSources.length > 0) {
                            // 查找匹配的数据源
                            const matchedDataSource = this.dataSources.find(ds => ds.value === dataSource.value);
                            if (matchedDataSource) {
                                console.log('Setting data source from navigation:', matchedDataSource);
                                this.onDataSourceChange(matchedDataSource);
                            } else {
                                console.warn('Navigated data source not found in available sources:', dataSource);
                            }
                        } else {
                            // 如果 collectors 还没加载完，等待一段时间后重试
                            setTimeout(checkCollectors, 500);
                        }
                    };
                    
                    checkCollectors();
                }
                
                // 清除 localStorage 中的数据源信息，避免重复应用
                localStorage.removeItem('selected_data_source');
            }
        } catch (error) {
            console.error('Error processing navigated data source:', error);
            // 清除可能损坏的数据
            localStorage.removeItem('selected_data_source');
        }
    }

    // 获取翻译后的状态文本
    getStatusText(status: string): string {
        return this.translate.instant(`collectorStatus.${status}`) || status;
    }

    // ================= 持久化逻辑 =================
    private persistState(skipFrequent?: boolean) {
        try {
            const current = (this.timeRangeService as any).getCurrentTimeRange?.();
            let start: Date | undefined = current?.startTime;
            let end: Date | undefined = current?.endTime;

            // 如果服务里还没有时间范围（例如刚切换数据源尚未返回），尝试从UI状态推导
            if (!start || !end) {
                if (this.isCustomTimeRange && this.customRangeValue.includes(' to ')) {
                    const parsed = this.parseRangeString(this.customRangeValue);
                    if (parsed) { start = parsed.start; end = parsed.end; }
                } else if (this.selectedQuickRange) {
                    end = new Date();
                    start = this.calculateStartTime(this.selectedQuickRange, end);
                } else {
                    // fallback 默认24h
                    end = new Date();
                    start = new Date(end.getTime() - 24*60*60*1000);
                }
            }

            if (!start || !end) return; // 仍无法推导则放弃

            const state = {
                dataSource: this.selectedDataSource?.value ? this.selectedDataSource : null,
                rangeMode: this.isAutoUpdateEnabled ? 'live' : (this.isCustomTimeRange ? 'custom' : 'quick'),
                quickValue: this.isCustomTimeRange ? '' : this.selectedQuickRange,
                customRangeValue: (this.isCustomTimeRange || this.isAutoUpdateEnabled) ? this.customRangeValue : '',
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                isAutoUpdateEnabled: this.isAutoUpdateEnabled,
                autoUpdateStartTime: this.autoUpdateStartTime ? this.autoUpdateStartTime.toISOString() : null
            };
            localStorage.setItem('header_state_v1', JSON.stringify(state));
        } catch (e) {
            console.warn('Persist state failed', e);
        }
    }

    private restorePersistedState(): boolean {
        try {
            const raw = localStorage.getItem('header_state_v1');
            if (!raw) return false;
            const state = JSON.parse(raw);
            if (!state || !state.startTime || !state.endTime) return false;
            if (state.dataSource) {
                this.selectedDataSource = { ...state.dataSource };
            }
            this.isAutoUpdateEnabled = !!state.isAutoUpdateEnabled;
            this.autoUpdateStartTime = state.autoUpdateStartTime ? new Date(state.autoUpdateStartTime) : null;
            if (state.rangeMode === 'custom' || state.rangeMode === 'live') {
                this.isCustomTimeRange = true;
                this.selectedQuickRange = '';
                this.customRangeValue = state.customRangeValue || '';
            } else {
                this.isCustomTimeRange = false;
                this.selectedQuickRange = state.quickValue || '24h';
                this.customRangeValue = '';
            }
            const start = new Date(state.startTime);
            const end = new Date(state.endTime);
            this.timeRangeService.updateTimeRange(start, end, state.rangeMode, state.rangeMode, this.selectedDataSource?.value);
            if (state.rangeMode === 'custom' || state.rangeMode === 'live') {
                this.customRangeValue = this.formatDateLocal(start) + ' to ' + this.formatDateLocal(end);
            }
            return true;
        } catch (e) {
            console.warn('Restore state failed', e);
            return false;
        }
    }

    private restoreStateIfNeeded() {
        if (!this.customRangeValue && !this.selectedQuickRange) {
            this.restorePersistedState();
        }
    }
}
