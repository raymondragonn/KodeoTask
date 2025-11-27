import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getUsers(): Observable<User[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<User[]>(`${this.apiUrl}/api/users`, { headers });
  }
}


