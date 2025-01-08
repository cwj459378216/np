import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const token = localStorage.getItem('auth_token');
    
    console.log('AuthGuard executing, token:', !!token); // 添加日志便于调试
    
    if (!token) {
        console.log('No token found, redirecting to login');
        router.navigate(['/auth/boxed-signin']);
        return false;
    }
    
    console.log('Token found, allowing navigation');
    return true;
};
