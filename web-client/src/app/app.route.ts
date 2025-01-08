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
import { LogComponent } from './log/log.component';
import { ListComponent } from './report/template/list/list.component';
import { ReportListComponent } from './report/report-list/report-list.component';
import { NotificationRuleComponent } from './report/notification-rule/notification-rule.component';
import { ReportSchedulerComponent } from './report/report-scheduler/report-scheduler.component';
import { AssetBookComponent } from './pages/asset-book/asset-book.component';
import { NotificationSettingsComponent } from './pages/notification-settings/notification-settings.component';
import { PreviewComponent } from './report/template/preview/preview.component';
import { ApplicationDnsComponent } from './protocol-analysis/application-protocols/application-dns/application-dns.component';
import { ApplicationSslComponent } from './protocol-analysis/application-protocols/application-ssl/application-ssl.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'auth/boxed-signin',
        pathMatch: 'full',
    },
    {
        path: 'auth',
        component: AuthLayout,
        children: [
            {
                path: '',
                loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
            }
        ]
    },
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' } },
            { path: 'user-management', component: UserManagementComponent, data: { title: 'User Management' } },
            { path: 'role-management', component: RoleManagementComponent, data: { title: 'Role Management' } },
            { path: 'system-time', component: SystemTimeComponent, data: { title: 'System Time' } },
            { path: 'interface-management', component: InterfaceManagementComponent, data: { title: 'Interface Management' } },
            { path: 'protocol-analysis/session-info', component: SessionInfoComponent, data: { title: 'Session Info' } },
            { path: 'protocol-analysis/application-protocols/http', component: ApplicationHttpComponent, data: { title: 'HTTP' } },
            { path: 'protocol-analysis/application-protocols/smtp', component: ApplicationSmtpComponent, data: { title: 'SMTP' } },
            { path: 'protocol-analysis/application-protocols/ftp', component: ApplicationFtpComponent, data: { title: 'FTP' } },
            { path: 'protocol-analysis/application-protocols/dns', component: ApplicationDnsComponent, data: { title: 'DNS' } },
            { path: 'protocol-analysis/application-protocols/ssl', component: ApplicationSslComponent, data: { title: 'SSL' } },
            { path: 'protocol-analysis/settings', component: SettingsComponent, data: { title: 'Settings' } },
            { path: 'alarm/event', component: EventComponent, data: { title: 'Event' } },
            { path: 'alarm/settings', component: AlarmSettingsComponent, data: { title: 'Alarm Settings' } },
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
            },
            {
                path: 'log',
                component: LogComponent
            },
            {
                path: 'report',
                loadChildren: () => import('./report/report.module').then(m => m.ReportModule)
            },
            {
                path: 'preview/:id',
                component: PreviewComponent,
                data: { standalone: true }
            },
            { path: 'asset-book', component: AssetBookComponent, data: { title: 'Asset Book' } },
            { path: 'notification-settings', component: NotificationSettingsComponent, data: { title: 'Notification Settings' } }
        ]
    },
    {
        path: 'standalone/preview/:id',
        component: PreviewComponent,
    },
    {
        path: '**',
        redirectTo: 'auth/boxed-signin'
    }
];
