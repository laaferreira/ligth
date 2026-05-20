import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn$ = new BehaviorSubject<boolean>(false);
  private currentUser$ = new BehaviorSubject<any>(null);

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    const { data } = await this.supabaseService.getAuth().getSession();
    this.loggedIn$.next(!!data?.session);
    this.currentUser$.next(data?.session?.user || null);

    // Listen for auth changes
    this.supabaseService.getAuth().onAuthStateChange((event, session) => {
      this.loggedIn$.next(!!session);
      this.currentUser$.next(session?.user || null);
    });
  }

  get isLoggedIn$(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  get isLoggedIn(): boolean {
    return this.loggedIn$.value;
  }

  get user$(): Observable<any> {
    return this.currentUser$.asObservable();
  }

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  login(credentials: LoginRequest): Observable<any> {
    const email = this.normalizarEmail(credentials.email);

    return from(
      this.supabaseService.getAuth().signInWithPassword({
        email,
        password: credentials.password
      })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        this.loggedIn$.next(true);
        this.currentUser$.next(response.data?.user || null);
        return response.data;
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  signup(data: SignupRequest): Observable<any> {
    const email = this.normalizarEmail(data.email);

    return from(
      this.supabaseService.getAuth().signUp({
        email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName
          }
        }
      })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Signup error:', error);
        throw error;
      })
    );
  }

  async logout(): Promise<void> {
    const { error } = await this.supabaseService.getAuth().signOut();
    if (error) throw error;
    this.loggedIn$.next(false);
    this.currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await this.supabaseService.getAuth().getSession();
    return data?.session?.access_token || null;
  }

  async refreshSession(): Promise<any> {
    const { data, error } = await this.supabaseService.getAuth().refreshSession();
    if (error) throw error;
    return data;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabaseService.getAuth().resetPasswordForEmail(email);
    if (error) throw error;
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabaseService.getAuth().updateUser({
      password: newPassword
    });
    if (error) throw error;
  }
}
