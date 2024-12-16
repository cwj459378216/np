import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlarmSettingsComponent } from './alarm-settings.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxCustomModalModule } from 'ngx-custom-modal';
import { HlMenuModule } from 'src/app/components/menu';
import { IconModule } from 'src/app/shared/icon.module';
import { NgScrollbarModule } from 'ngx-scrollbar';

@NgModule({
  declarations: [AlarmSettingsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgxCustomModalModule,
    HlMenuModule,
    IconModule,
    NgScrollbarModule
  ],
  exports: [AlarmSettingsComponent]
})
export class AlarmSettingsModule { } 