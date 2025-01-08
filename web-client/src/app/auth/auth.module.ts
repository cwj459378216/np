import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/shared.module';
import { loginGuard } from 'src/share/auth/login.guard';

import { BoxedSigninComponent } from './boxed-signin';

const routes: Routes = [
    {
        path: 'boxed-signin',
        component: BoxedSigninComponent,
        canActivate: [loginGuard]
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(routes),
        SharedModule
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AuthModule { }
