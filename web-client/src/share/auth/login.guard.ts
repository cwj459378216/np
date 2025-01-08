import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';

export const loginGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const token = localStorage.getItem('auth_token');
    
    // 只检查登录页面的路径
    if (state.url === '/auth/boxed-signin' && token) {
        // 如果已经登录且访问登录页面，重定向到dashboard
        router.navigate(['/dashboard']);
        return false;
    }
    
    return true;
}; 