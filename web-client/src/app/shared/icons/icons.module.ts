import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IconCaretsDownComponent } from './icon-carets-down.component';
import { IconMenuDashboardComponent } from './icon-menu-dashboard.component';
import { IconMenuDatatablesComponent } from './icon-menu-datatables.component';
import { IconInfoCircleComponent } from './icon-info-circle.component';
import { IconMenuChartsComponent } from './icon-menu-charts.component';
import { IconMenuNotesComponent } from './icon-menu-notes.component';
import { IconLayoutComponent } from './icon-layout.component';
import { IconMenuCalendarComponent } from './icon-menu-calendar.component';
import { IconCaretDownComponent } from './icon-caret-down.component';

@NgModule({
    declarations: [
        IconCaretsDownComponent,
        IconMenuDashboardComponent,
        IconMenuDatatablesComponent,
        IconInfoCircleComponent,
        IconMenuChartsComponent,
        IconMenuNotesComponent,
        IconLayoutComponent,
        IconMenuCalendarComponent,
        IconCaretDownComponent
    ],
    imports: [CommonModule],
    exports: [
        IconCaretsDownComponent,
        IconMenuDashboardComponent,
        IconMenuDatatablesComponent,
        IconInfoCircleComponent,
        IconMenuChartsComponent,
        IconMenuNotesComponent,
        IconLayoutComponent,
        IconMenuCalendarComponent,
        IconCaretDownComponent
    ]
})
export class IconsModule {} 