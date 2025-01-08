import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(private router: Router) {}

    logout() {
        // 清除所有认证相关的数据
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        
        // 跳转到登录页面
        this.router.navigate(['/auth/boxed-signin']);
    }
} 