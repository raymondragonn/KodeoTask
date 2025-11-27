import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthResponse, User } from '../models/task.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenKey = 'kodeotask_token';
  private userIdKey = 'kodeotask_userId';
  private usernameKey = 'kodeotask_username';
  private firstNameKey = 'kodeotask_firstName';
  private lastNameKey = 'kodeotask_lastName';

  constructor(private http: HttpClient) {
    // Restaurar sesión si existe
    const token = localStorage.getItem(this.tokenKey);
    const userId = localStorage.getItem(this.userIdKey);
    const username = localStorage.getItem(this.usernameKey);
    const firstName = localStorage.getItem(this.firstNameKey);
    const lastName = localStorage.getItem(this.lastNameKey);
    if (token && userId && username) {
      this.currentUserSubject.next({
        id: parseInt(userId),
        username: username,
        email: '',
        firstName: firstName || undefined,
        lastName: lastName || undefined
      });
    }
  }

  register(username: string, firstName: string, lastName: string, email: string, password: string): Observable<AuthResponse> {
    const body = { username, firstName, lastName, email, password };
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/register`, body);
  }

  login(username: string, password: string): Observable<AuthResponse> {
    const body = { username, password };
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/login`, body).pipe(
      tap(response => {
        if (response.success && response.token) {
          this.setSession(response);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userIdKey);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem(this.firstNameKey);
    localStorage.removeItem(this.lastNameKey);
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
      if (authResult.firstName) {
        localStorage.setItem(this.firstNameKey, authResult.firstName);
      }
      if (authResult.lastName) {
        localStorage.setItem(this.lastNameKey, authResult.lastName);
      }
      this.currentUserSubject.next({
        id: authResult.userId,
        username: authResult.username,
        email: '',
        firstName: authResult.firstName,
        lastName: authResult.lastName
      });
    }
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    console.log('=== DEBUG AuthService.getAuthHeaders ===');
    console.log('Token disponible:', !!token);
    console.log('Token (primeros 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
      console.error('ERROR: No hay token disponible en localStorage');
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}

