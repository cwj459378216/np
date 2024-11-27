import { Routes } from '@angular/router';
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CollectorComponent } from './collector/collector.component';
import { RoleManagementComponent } from './system-settings/role-management/role-management.component';
import { UserManagementComponent } from './system-settings/user-management/user-management.component';
import { SystemTimeComponent } from './system-settings/system-time/system-time.component';
import { InterfaceManagementComponent } from './system-settings/interface-management/interface-management.component';
import { AssetBookComponent } from './pages/asset-book/asset-book.component';

// 导入 threat-management 相关组件
import { BasicConfigurationComponent } from './pages/threat-management/basic-configuration/basic-configuration.component';
import { RulesPolicyComponent } from './pages/threat-management/rules-policy/rules-policy.component';
import { RuleUpdateComponent } from './pages/threat-management/rule-update/rule-update.component';
import { LocalRulesComponent } from './pages/threat-management/local-rules/local-rules.component';

export const routes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            // ... 其他路由 ...
            {
                path: 'dashboard',
                component: DashboardComponent,
            },
            {
                path: 'user-management',
                component: UserManagementComponent,
            },
            {
                path: 'role-management',
                component: RoleManagementComponent,
            },
            {
                path: 'system-time',
                component: SystemTimeComponent,
            },
            {
                path: 'interface-management',
                component: InterfaceManagementComponent,
            },
            {
                path: 'asset-book',
                component: AssetBookComponent,
            },
            // 添加 threat-management 相关路由
            {
                path: 'threat-management/basic-configuration',
                component: BasicConfigurationComponent,
            },
            {
                path: 'threat-management/rules-policy',
                component: RulesPolicyComponent,
            },
            {
                path: 'threat-management/rule-update',
                component: RuleUpdateComponent,
            },
            {
                path: 'threat-management/local-rules',
                component: LocalRulesComponent,
            },
            // ... 其他路由 ...
        ],
    },
    {
        path: 'auth',
        component: AuthLayout,
        children: [
            // ... auth相关路由 ...
        ],
    },
];
