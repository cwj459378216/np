import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  // 使用 inject 来注入 Router 实例
  const router = inject(Router);

  // 检查是否存在认证 token，假设保存在 localStorage 中
  const isAuthenticated = !!localStorage.getItem('auth_token');

  // 如果已认证，返回 true 允许访问
  if (isAuthenticated) {
    return true;
  }

  // 如果未认证，重定向到登录页面
  router.navigate(['/auth/boxed-signin']);
  return false;
};
