import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import { GridsterModule } from 'angular-gridster2';
import { PreviewComponent } from '../report/template/preview/preview.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/shared.module';

@NgModule({
    declarations: [
        PreviewComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        GridsterModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        NgxEchartsModule.forRoot({
            echarts: () => import('echarts')
        })
    ],
    exports: [
        PreviewComponent
    ]
})
export class PreviewModule { } 