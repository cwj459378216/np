import { Routes } from '@angular/router';
import { BoxedSigninComponent } from './boxed-signin';

export const AUTH_ROUTES: Routes = [
    {
        path: 'boxed-signin',
        component: BoxedSigninComponent,
        data: { title: 'Login' }
    }
]; 