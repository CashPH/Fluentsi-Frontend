import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError } from 'rxjs';
import { of } from 'rxjs';

export interface StudentLoginResponse {
  token: string;
  userId: number;
  role: string;
  nombre: string;
}

export interface StudentRegisterRequest {
  nombre: string;
  ap_paterno: string;
  ap_materno?: string;
  correo: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:4000/api';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private userSubject = new BehaviorSubject<any>(this.getStoredUser());
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initAuthState();
  }

  private initAuthState(): void {
    const token = localStorage.getItem('authToken');
    const user = this.getStoredUser();
    
    if (token && user) {
      this.isAuthenticatedSubject.next(true);
      this.userSubject.next(user);
    } else {
      this.isAuthenticatedSubject.next(false);
      this.userSubject.next(null);
    }
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('authToken');
  }

  private getStoredUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  registerStudent(data: StudentRegisterRequest): Observable<StudentLoginResponse> {
    return this.http.post<StudentLoginResponse>(`${this.apiUrl}/auth/student/register`, data).pipe(
      tap((response) => {
        this.setAuthData(response);
      }),
      catchError((error) => {
        console.error('Registration error:', error);
        throw error;
      })
    );
  }

  loginStudent(correo: string, password: string): Observable<StudentLoginResponse> {
    return this.http.post<StudentLoginResponse>(`${this.apiUrl}/auth/student/login`, { correo, password }).pipe(
      tap((response) => {
        this.setAuthData(response);
      }),
      catchError((error) => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  loginTeacher(correo: string, password: string): Observable<StudentLoginResponse> {
    return this.http.post<StudentLoginResponse>(`${this.apiUrl}/auth/teacher/login`, { correo, password }).pipe(
      tap((response) => {
        this.setAuthData(response);
      }),
      catchError((error) => {
        console.error('Teacher Login error:', error);
        throw error;
      })
    );
  }

  private setAuthData(response: StudentLoginResponse): void {
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('user', JSON.stringify({
      userId: response.userId,
      role: response.role,
      nombre: response.nombre
    }));
    this.isAuthenticatedSubject.next(true);
    this.userSubject.next(this.getStoredUser());
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    this.isAuthenticatedSubject.next(false);
    this.userSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getUser(): any {
    return this.getStoredUser();
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }
}
