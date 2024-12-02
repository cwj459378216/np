import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// 导入共享模块
import { SharedModule } from 'src/shared.module';

// 导入组件
import { ListComponent } from './template/list/list.component';
import { PreviewComponent } from './template/preview/preview.component';
import { AddComponent } from './template/add/add.component';
import { EditComponent } from './template/edit/edit.component';

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
    }
];

@NgModule({
    declarations: [
        ListComponent,
        AddComponent,
        EditComponent,
        PreviewComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        FormsModule,
        ReactiveFormsModule,
        SharedModule
    ]
})
export class ReportModule { } 