import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface AuthResponse {
  token: string;
  user: any; // 可根据后端定义细化类型
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private TOKEN_KEY = 'auth_token';
  private USER_KEY = 'user_info';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/users/login`, { username, password }).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
        }
        if (res?.user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): any | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
