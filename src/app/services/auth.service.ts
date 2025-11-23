import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthResponse, User } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenKey = 'taskcore_token';
  private userIdKey = 'taskcore_userId';
  private usernameKey = 'taskcore_username';

  constructor(private http: HttpClient) {
    // Restaurar sesión si existe
    const token = localStorage.getItem(this.tokenKey);
    const userId = localStorage.getItem(this.userIdKey);
    const username = localStorage.getItem(this.usernameKey);
    if (token && userId && username) {
      this.currentUserSubject.next({
        id: parseInt(userId),
        username: username,
        email: ''
      });
    }
  }

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    // SERVICIO DESACTIVADO - Modo mock
    // const body = { username, email, password };
    // return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/register`, body);
    
    // Simulación de registro exitoso
    return new Observable(observer => {
      setTimeout(() => {
        const response: AuthResponse = {
          success: true,
          message: 'Usuario registrado correctamente (modo mock)',
          userId: 1
        };
        observer.next(response);
        observer.complete();
      }, 500);
    });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    // SERVICIO DESACTIVADO - Modo mock
    // const body = { username, password };
    // return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/login`, body).pipe(
    //   tap(response => {
    //     if (response.success && response.token) {
    //       this.setSession(response);
    //     }
    //   })
    // );
    
    // Simulación de login exitoso
    return new Observable(observer => {
      setTimeout(() => {
        const response: AuthResponse = {
          success: true,
          token: 'mock_token_' + Date.now(),
          userId: 1,
          username: username
        };
        this.setSession(response);
        observer.next(response);
        observer.complete();
      }, 500);
    });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userIdKey);
    localStorage.removeItem(this.usernameKey);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private setSession(authResult: AuthResponse): void {
    if (authResult.token && authResult.userId && authResult.username) {
      localStorage.setItem(this.tokenKey, authResult.token);
      localStorage.setItem(this.userIdKey, authResult.userId.toString());
      localStorage.setItem(this.usernameKey, authResult.username);
      this.currentUserSubject.next({
        id: authResult.userId,
        username: authResult.username,
        email: ''
      });
    }
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}

