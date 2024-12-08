import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  console.log('Guard executing for route:', state.url);
  const router = inject(Router);
  const isAuthenticated = !!localStorage.getItem('auth_token');
  console.log('isAuthenticated:', isAuthenticated);
  
  if (isAuthenticated) {
    console.log('Access granted');
    return true;
  }

  console.log('Access denied, redirecting to login');
  router.navigate(['/auth/boxed-signin']);
  return false;
};
