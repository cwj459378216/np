import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { slideDownUp } from '../shared/animations';
import { filter } from 'rxjs/operators';

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
    
    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
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
        // 初始化时检查当前路由
        this.setActiveDropdown();
        
        // 监听路由变化
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.setActiveDropdown();
        });
    }

    setActiveDropdown() {
        const currentPath = this.router.url;
        
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
            currentPath.includes('/system-time') || 
            currentPath.includes('/interface-management')) {
            if (!this.activeDropdown.includes('systemSettings')) {
                this.activeDropdown.push('systemSettings');
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
