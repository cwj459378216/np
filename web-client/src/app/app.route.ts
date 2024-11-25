import { Routes } from '@angular/router';
import { AppLayout } from './layouts/app-layout';

// dashboard
import { IndexComponent } from './index';
import { AnalyticsComponent } from './analytics';
import { FinanceComponent } from './finance';
import { CryptoComponent } from './crypto';

// widgets
import { WidgetsComponent } from './widgets';

// tables
import { TablesComponent } from './tables';

// font-icons
import { FontIconsComponent } from './font-icons';

// charts
import { ChartsComponent } from './charts';

// dragndrop
import { DragndropComponent } from './dragndrop';

// layouts
import { AuthLayout } from './layouts/auth-layout';

// pages
import { KnowledgeBaseComponent } from './pages/knowledge-base';
import { FaqComponent } from './pages/faq';

import {DashboardComponent} from './dashboard/dashboard.component'
import { CollectorComponent } from './collector/collector.component';
import { authGuard } from 'src/share/auth/auth.guard';
import { UserManagementComponent } from './system-settings/user-management/user-management.component';
import { RoleManagementComponent } from './system-settings/role-management/role-management.component';
import { SystemTimeComponent } from './system-settings/system-time/system-time.component';
import { InterfaceManagementComponent } from './system-settings/interface-management/interface-management.component';
import { SessionInfoComponent } from './protocol-analysis/session-info/session-info.component';
import { SettingsComponent } from './protocol-analysis/settings/settings.component';
import { ApplicationHttpComponent } from './protocol-analysis/application-protocols/application-http/application-http.component';
import { ApplicationSmtpComponent } from './protocol-analysis/application-protocols/application-smtp/application-smtp.component';
import { ApplicationFtpComponent } from './protocol-analysis/application-protocols/application-ftp/application-ftp.component';
import { EventComponent } from './alarm/event/event.component';
import { AlarmSettingsComponent } from './alarm/alarm-settings/alarm-settings.component';
import { BasicConfigurationComponent } from './pages/threat-management/basic-configuration/basic-configuration.component';
import { RulesPolicyComponent } from './pages/threat-management/rules-policy/rules-policy.component';
import { RuleUpdateComponent } from './pages/threat-management/rule-update/rule-update.component';
import { LocalRulesComponent } from './pages/threat-management/local-rules/local-rules.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'auth/boxed-signin',  // 默认跳转到登录页面
        pathMatch: 'full',
      },
    {
        path: '',
        component: AppLayout,
        children: [
            // dashboard
            // { path: '', redirectTo: 'auth/boxed-signin', pathMatch: 'full' }, // 默认重定向到 
            // { path: 'auth/boxed-signin', component: BoxedSigninComponent, data: { title: 'Boxed Signin' } },

            // { path: '', component: IndexComponent, data: { title: 'Sales Admin' } },
            { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' }, canActivate: [authGuard] },
            { path: 'collector', component: CollectorComponent, data: { title: 'Collector' }, canActivate: [authGuard] },
            { path: 'user-management', component: UserManagementComponent, data: { title: 'User Management' }, canActivate: [authGuard] },
            { path: 'role-management', component: RoleManagementComponent, data: { title: 'Role Management' }, canActivate: [authGuard] },
            { path: 'system-time', component: SystemTimeComponent, data: { title: 'System Time' }, canActivate: [authGuard] },
            { path: 'interface-management', component: InterfaceManagementComponent, data: { title: 'Interface Management' }, canActivate: [authGuard] },

            { path: 'protocol-analysis/session-info', component: SessionInfoComponent, data: { title: 'Session Info' }, canActivate: [authGuard] },
            // { path: 'protocol-analysis/application-protocols', component: ApplicationProtocolsComponent, data: { title: 'Application Protocols' }, canActivate: [authGuard] },
            { path: 'protocol-analysis/application-protocols/http', component: ApplicationHttpComponent, data: { title: 'HTTP' }, canActivate: [authGuard] },
            { path: 'protocol-analysis/application-protocols/smtp', component: ApplicationSmtpComponent, data: { title: 'SMTP' }, canActivate: [authGuard] },
            { path: 'protocol-analysis/application-protocols/ftp', component: ApplicationFtpComponent, data: { title: 'FTP' }, canActivate: [authGuard] },
            { path: 'protocol-analysis/settings', component: SettingsComponent, data: { title: 'Settings' }, canActivate: [authGuard] },

            // { path: 'finance', component: FinanceComponent, data: { title: 'Finance Admin' } },
            // { path: 'crypto', component: CryptoComponent, data: { title: 'Crypto Admin' } },

            // widgets
            // { path: 'widgets', component: WidgetsComponent, data: { title: 'Widgets' } },

            // // font-icons
            // { path: 'font-icons', component: FontIconsComponent, data: { title: 'Font Icons' } },

            // // charts
            // { path: 'charts', component: ChartsComponent, data: { title: 'Charts' } },

            // // dragndrop
            // { path: 'dragndrop', component: DragndropComponent, data: { title: 'Dragndrop' } },

            // // pages
            // { path: 'pages/knowledge-base', component: KnowledgeBaseComponent, data: { title: 'Knowledge Base' } },
            // { path: 'pages/faq', component: FaqComponent, data: { title: 'FAQ' } },

            //apps
            // { path: '', loadChildren: () => import('./apps/apps.module').then((d) => d.AppsModule) },

            // // components
            // { path: '', loadChildren: () => import('./components/components.module').then((d) => d.ComponentsModule) },

            // // elements
            // { path: '', loadChildren: () => import('./elements/elements.module').then((d) => d.ElementsModule) },

            // // forms
            // { path: '', loadChildren: () => import('./forms/form.module').then((d) => d.FormModule) },

            // // users
            // { path: '', loadChildren: () => import('./users/user.module').then((d) => d.UsersModule) },

            // // tables
            // { path: 'tables', component: TablesComponent, data: { title: 'Tables' } },
            // { path: '', loadChildren: () => import('./datatables/datatables.module').then((d) => d.DatatablesModule) },

            // Event Alarm routes
            { 
                path: 'alarm/event', 
                component: EventComponent, 
                data: { title: 'Event' },
                canActivate: [authGuard] 
            },
            { 
                path: 'alarm/settings', 
                component: AlarmSettingsComponent, 
                data: { title: 'Alarm Settings' },
                canActivate: [authGuard] 
            },
            {
                path: 'threat-management',
                children: [
                    {
                        path: 'basic-configuration',
                        component: BasicConfigurationComponent
                    },
                    {
                        path: 'rules-policy',
                        component: RulesPolicyComponent
                    },
                    {
                        path: 'rule-update',
                        component: RuleUpdateComponent
                    },
                    {
                        path: 'local-rules',
                        component: LocalRulesComponent
                    }
                ]
            }
        ],
    },

    {
        path: '',
        component: AuthLayout,
        children: [
            // pages
            { path: '', loadChildren: () => import('./pages/pages.module').then((d) => d.PagesModule) },

            // auth
            { path: '', loadChildren: () => import('./auth/auth.module').then((d) => d.AuthModule) },
        ],
    },
    {
        path: 'alarm',
        children: [
            {
                path: 'event',
                component: EventComponent
            },
            {
                path: 'settings',
                component: AlarmSettingsComponent
            }
        ]
    }
];
