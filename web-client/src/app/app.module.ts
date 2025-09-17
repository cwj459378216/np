import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpBackend, HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { NgxEchartsModule } from 'ngx-echarts';

//Routes
import { routes } from './app.route';

import { AppComponent } from './app.component';

// store
import { StoreModule } from '@ngrx/store';
import { indexReducer } from './store/index.reducer';

// shared module
import { SharedModule } from 'src/shared.module';

// i18n
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
// AOT compilation support
export function HttpLoaderFactory(httpHandler: HttpBackend): TranslateHttpLoader {
    return new TranslateHttpLoader(new HttpClient(httpHandler));
}

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

// pages
import { KnowledgeBaseComponent } from './pages/knowledge-base';
import { FaqComponent } from './pages/faq';

// Layouts
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';

import { HeaderComponent } from './layouts/header';
import { FooterComponent } from './layouts/footer';
import { SidebarComponent } from './layouts/sidebar';
import { ThemeCustomizerComponent } from './layouts/theme-customizer';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CollectorComponent } from './collector/collector.component';
import { AnalyzeAnimationComponent } from "./collector/analyze-animation/analyze-animation.component";
import { RoleManagementComponent } from './system-settings/role-management/role-management.component';
import { UserManagementComponent } from './system-settings/user-management/user-management.component';
import { SystemTimeComponent } from './system-settings/system-time/system-time.component';
import { InterfaceManagementComponent } from './system-settings/interface-management/interface-management.component';
import { SettingsComponent } from './protocol-analysis/settings/settings.component';
import { SessionInfoComponent } from './protocol-analysis/session-info/session-info.component';
import { ApplicationFtpComponent } from './protocol-analysis/application-protocols/application-ftp/application-ftp.component';
import { ApplicationSmtpComponent } from './protocol-analysis/application-protocols/application-smtp/application-smtp.component';
import { ApplicationSslComponent } from './protocol-analysis/application-protocols/application-ssl/application-ssl.component';
import { EventComponent } from './alarm/event/event.component';
import { AlarmSettingsComponent } from './alarm/alarm-settings/alarm-settings.component';
import { BasicConfigurationComponent } from './pages/threat-management/basic-configuration/basic-configuration.component';
import { RulesPolicyComponent } from './pages/threat-management/rules-policy/rules-policy.component';
import { RuleUpdateComponent } from './pages/threat-management/rule-update/rule-update.component';
import { LocalRulesComponent } from './pages/threat-management/local-rules/local-rules.component';
import { LogComponent } from './log/log.component';
import { AssetBookComponent } from './pages/asset-book/asset-book.component';
import { NotificationSettingsComponent } from './pages/notification-settings/notification-settings.component';
import { RulesPolicyService } from './services/rules-policy.service';
import { RuleUpdateService } from './services/rule-update.service';
import { LocalRuleService } from './services/local-rule.service';
import { SystemTimeService } from './services/system-time.service';
import { PreviewModule } from './shared/preview.module';
import { AuthInterceptor } from './services/auth/auth.interceptor';

@NgModule({
    imports: [
        RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' }),
        BrowserModule,
        BrowserAnimationsModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpBackend],
            },
        }),
        StoreModule.forRoot({ index: indexReducer }),
        SharedModule.forRoot(),
        NgxEchartsModule.forRoot({
            echarts: () => import('echarts')
        }),
        PreviewModule,
        AnalyzeAnimationComponent,
    ],
    declarations: [
        AppComponent,
        HeaderComponent,
        FooterComponent,
        SidebarComponent,
        ThemeCustomizerComponent,
        TablesComponent,
        FontIconsComponent,
        ChartsComponent,
        IndexComponent,
        AnalyticsComponent,
        FinanceComponent,
        CryptoComponent,
        WidgetsComponent,
        DragndropComponent,
        AppLayout,
        AuthLayout,
        KnowledgeBaseComponent,
        FaqComponent,
      DashboardComponent,
      CollectorComponent,
      RoleManagementComponent,
      UserManagementComponent,
      SystemTimeComponent,
      InterfaceManagementComponent,
      SettingsComponent,
      SessionInfoComponent,
      ApplicationFtpComponent,
      ApplicationSmtpComponent,
      ApplicationSslComponent,
      EventComponent,
      AlarmSettingsComponent,
      BasicConfigurationComponent,
      RulesPolicyComponent,
      RuleUpdateComponent,
      LocalRulesComponent,
      LogComponent,
      AssetBookComponent,
      NotificationSettingsComponent,
    ],

    providers: [
        Title,
        RulesPolicyService,
        RuleUpdateService,
        LocalRuleService,
        SystemTimeService,
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
