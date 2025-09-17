import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

// 已登录用户不允许再访问登录/注册页面，重定向到 dashboard
export const noAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isAuthenticated = !!localStorage.getItem('auth_token');
  if (isAuthenticated) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
