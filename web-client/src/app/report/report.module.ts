import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GridsterModule } from 'angular-gridster2';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgxEchartsModule } from 'ngx-echarts';
import { NgSelectModule } from '@ng-select/ng-select';

// 导入共享模块
import { SharedModule } from 'src/shared.module';

// 导入组件
import { ListComponent } from './template/list/list.component';
import { PreviewComponent } from './template/preview/preview.component';
import { AddComponent } from './template/add/add.component';
import { EditComponent } from './template/edit/edit.component';
import { ReportListComponent } from './report-list/report-list.component';
import { NotificationRuleComponent } from './notification-rule/notification-rule.component';
import { ReportSchedulerComponent } from './report-scheduler/report-scheduler.component';
import { PreviewModule } from '../shared/preview.module';

const routes: Routes = [
    {
        path: 'template',
        children: [
            {
                path: 'list',
                component: ListComponent
            },
            {
                path: 'add',
                component: AddComponent
            },
            {
                path: 'edit',
                component: EditComponent
            },
            {
                path: 'preview',
                component: PreviewComponent
            }
        ]
    },
    {
        path: 'list',
        component: ReportListComponent
    },
    {
        path: 'notification-rule',
        component: NotificationRuleComponent
    },
    {
        path: 'scheduler',
        component: ReportSchedulerComponent
    }
];

@NgModule({
    declarations: [
        ListComponent,
        AddComponent,
        EditComponent,
        ReportListComponent,
        NotificationRuleComponent,
        ReportSchedulerComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        GridsterModule,
        NgApexchartsModule,
        NgxEchartsModule.forRoot({
            echarts: () => import('echarts')
        }),
        NgSelectModule,
        PreviewModule
    ]
})
export class ReportModule { } 