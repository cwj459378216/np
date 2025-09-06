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
    dataSources: { label: string; value: string }[] = [];
    timeRanges = [
        { label: this.translate.instant('Last 1 Hour') || '最近1小时', value: '1h' },
        { label: this.translate.instant('Last 6 Hours') || '最近6小时', value: '6h' },
        { label: this.translate.instant('Last 12 Hours') || '最近12小时', value: '12h' },
        { label: this.translate.instant('Last 24 Hours') || '最近24小时', value: '24h' },
        { label: this.translate.instant('Last 7 Days') || '最近7天', value: '7d' },
    ];
    selectedDataSource = { label: '', value: '' };
    selectedTimeRange = this.timeRanges[3].value; // 默认24小时
    selectedQuickRange = this.timeRanges[3].value;
    
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

    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private appSetting: AppService,
        private sanitizer: DomSanitizer,
        private collectorService: CollectorService,
        private timeRangeService: TimeRangeService,
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
        this.setActiveDropdown();
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.setActiveDropdown();
            }
        });
        
        // 初始化时间范围标签
        this.updateTimeRangeLabels();
        
        // 加载collectors数据
        this.loadCollectors();
        
        // 初始化默认时间范围（24小时）
        this.initializeDefaultTimeRange();
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
                // 将collectors转换为dataSources选项，name作为label，sessionId作为value
                this.dataSources = collectors.map(collector => ({
                    label: collector.name,
                    value: (collector as any).sessionId || (collector as any).id || ''
                }));
                
                // 始终选择第一个作为默认值（如果有数据的话）
                if (this.dataSources.length > 0) {
                    this.selectedDataSource = this.dataSources[0];
                } else {
                    this.selectedDataSource = { label: '', value: '' };
                }
                
                console.log('Collectors loaded, default selected:', this.selectedDataSource);
            },
            error: (error) => {
                console.error('Error loading collectors for data sources:', error);
                // 发生错误时设置为空
                this.dataSources = [];
                this.selectedDataSource = { label: '', value: '' };
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
        if (!environment.production) {
            console.log('Header visibility check:', {
                currentUrl,
                isDashboardPage,
                isProtocolAnalysisPage,
                isEventPage,
                shouldShow
            });
        }
        
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
            this.selectedDataSource = dataSource;
        }
        // TODO: 根据实际需求触发数据刷新或状态更新
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
        
        // TODO: 触发数据刷新
        this.onTimeRangeApplied(startTime, endTime);
    }

    calculateStartTime(rangeValue: string, endTime: Date): Date {
        return this.timeRangeService.calculateStartTime(rangeValue, endTime);
    }

    onTimeRangeApplied(startTime: Date, endTime: Date) {
        // 更新时间范围服务的状态
        const currentRange = this.isCustomTimeRange 
            ? { label: 'Custom Range', value: 'custom' }
            : this.timeRanges.find(tr => tr.value === this.selectedQuickRange) || { label: 'Custom', value: 'custom' };
        
        this.timeRangeService.updateTimeRange(startTime, endTime, currentRange.label, currentRange.value);
        
        console.log('Time range applied:', { startTime, endTime, label: currentRange.label });
    }

    ngOnDestroy(): void {
        // 不移除监听（菜单生命周期内复用），如需严格清理可记录并移除
    }

    // 保留 handleRangeSelection / applyCustomTimeRange / formatDate 等原有方法
    private formatDate(d: Date): string {
        const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
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
            const formatted = this.formatDate(start) + ' to ' + this.formatDate(end);
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
        const formatted = this.formatDate(parsed.start) + ' to ' + this.formatDate(parsed.end);
        this.customRangeValue = formatted;
        this.isCustomTimeRange = true;
        this.selectedQuickRange = '';
        if (formatted !== this.lastAppliedRange) {
            this.lastAppliedRange = formatted;
            this.onTimeRangeApplied(parsed.start, parsed.end);
        }
        // 关闭菜单: 触发一次 body click (hlMenu OutsideClick) 或使用更安全方式
        try {
            setTimeout(() => {
                document.body.click();
            }, 0);
        } catch {}
    }
}
