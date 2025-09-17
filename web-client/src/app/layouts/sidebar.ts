import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { slideDownUp } from '../shared/animations';
import { filter } from 'rxjs/operators';
import { ZeekConfigService, ZeekLogType } from '../services/zeek-config.service';

@Component({
    selector: 'sidebar',
    templateUrl: './sidebar.html',
    animations: [slideDownUp],
})
export class SidebarComponent implements OnInit {
    active = false;
    store: any;
    activeDropdown: string[] = [];
    parentDropdown: string = '';
    zeekProtocols: ZeekLogType[] = [];
    
    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private zeekConfigService: ZeekConfigService
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
        // 获取 Zeek 配置
        this.loadZeekProtocols();
        
        // 初始化时检查当前路由
        this.setActiveDropdown();
        
        // 监听路由变化
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.setActiveDropdown();
        });
    }

    loadZeekProtocols() {
        this.zeekConfigService.getZeekConfig().subscribe({
            next: (config) => {
                console.log('Zeek config:', config);
                this.zeekProtocols = config.Zeek;
                console.log('Zeek protocols:', this.zeekProtocols);
            },
            error: (error) => {
                console.error('Error loading Zeek protocols:', error);
            }
        });
    }

    setActiveDropdown() {
        const currentPath = this.router.url;
        
        // 检查是否是 report 相关路径
        if (currentPath.includes('/report')) {
            // 确保 report 菜单展开
            if (!this.activeDropdown.includes('report')) {
                this.activeDropdown = [...this.activeDropdown, 'report'];
            }

            // 根据不同的子路径设置对应的 active 状态
            setTimeout(() => {
                let selector;
                if (currentPath.includes('/report/template')) {
                    selector = document.querySelector('.sidebar ul a[routerLink="/report/template/list"]');
                } else if (currentPath.includes('/report/list')) {
                    selector = document.querySelector('.sidebar ul a[routerLink="/report/list"]');
                } else if (currentPath.includes('/report/notification-rule')) {
                    selector = document.querySelector('.sidebar ul a[routerLink="/report/notification-rule"]');
                } else if (currentPath.includes('/report/scheduler')) {
                    selector = document.querySelector('.sidebar ul a[routerLink="/report/scheduler"]');
                }

                if (selector) {
                    // 移除其他 active 类
                    document.querySelectorAll('.sidebar ul a').forEach(el => {
                        el.classList.remove('active');
                    });
                    // 添加 active 类到当前元素
                    selector.classList.add('active');
                }
            });
        }
        
        // 检查是否是 alarm 相关路径
        if (currentPath.includes('/alarm/')) {
            if (!this.activeDropdown.includes('eventAlarm')) {
                this.activeDropdown.push('eventAlarm');
            }
        }
        
        // 检查是否是协议分析相关路径
        if (currentPath.includes('/protocol-analysis')) {
            if (!this.activeDropdown.includes('protocolAnalysis')) {
                this.activeDropdown.push('protocolAnalysis');
            }
            if (currentPath.includes('/application-protocols')) {
                if (!this.activeDropdown.includes('Application Protocols')) {
                    this.activeDropdown.push('Application Protocols');
                }
            }
        }
        
        // 检查是否是 collector 相关路径
        if (currentPath.includes('/collector')) {
            if (!this.activeDropdown.includes('collector')) {
                this.activeDropdown.push('collector');
            }
        }
        
        // 检查是否是系统设置相关路径
        if (currentPath.includes('/user-management') || 
            currentPath.includes('/role-management') || 
            currentPath.includes('/notification-settings') ||
            currentPath.includes('/system-time') || 
            currentPath.includes('/asset-book') || 
            currentPath.includes('/interface-management')) {
            if (!this.activeDropdown.includes('systemSettings')) {
                this.activeDropdown.push('systemSettings');
            }
        }
        
        // 检查是否是 threat management 相关路径
        if (currentPath.includes('/threat-management')) {
            if (!this.activeDropdown.includes('threatManagement')) {
                this.activeDropdown.push('threatManagement');
            }
            // 检查是否是 IDS 相关路径
            if (currentPath.includes('/basic-configuration') || 
                currentPath.includes('/rules-policy') || 
                currentPath.includes('/rule-update') || 
                currentPath.includes('/local-rules')) {
                if (!this.activeDropdown.includes('ids')) {
                    this.activeDropdown.push('ids');
                }
            }
        }
        
        // 设置当前路径的 active 状态
        setTimeout(() => {
            const selector = document.querySelector('.sidebar ul a[routerLink="' + currentPath + '"]');
            if (selector) {
                // 移除其他 active 类
                document.querySelectorAll('.sidebar ul a').forEach(el => {
                    el.classList.remove('active');
                });
                // 添加 active 类到当前元素
                selector.classList.add('active');
            }
        });
    }

    toggleMobileMenu() {
        if (window.innerWidth < 1024) {
            this.storeData.dispatch({ type: 'toggleSidebar' });
        }
    }

    toggleAccordion(name: string, parent?: string) {
        if (this.activeDropdown.includes(name)) {
            this.activeDropdown = this.activeDropdown.filter((d) => d !== name);
        } else {
            this.activeDropdown.push(name);
        }
    }
}
