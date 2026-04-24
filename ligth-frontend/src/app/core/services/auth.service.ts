import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { LoginRequest, TokenResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private http: HttpClient) {}

  get isLoggedIn$(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  get isLoggedIn(): boolean {
    return this.loggedIn$.value;
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        this.storeTokens(response);
        this.loggedIn$.next(true);
      })
    );
  }

  refreshToken(): Observable<TokenResponse> {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    return this.http.post<TokenResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => this.storeTokens(response))
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.loggedIn$.next(false);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private storeTokens(response: TokenResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('accessToken');
  }
}
