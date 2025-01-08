import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/shared.module';
import { BoxedSigninComponent } from './boxed-signin';
import { AUTH_ROUTES } from './auth.routes';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(AUTH_ROUTES),
        SharedModule,
        BoxedSigninComponent
    ]
})
export class AuthModule { }
