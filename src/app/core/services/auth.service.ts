import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

export interface LoginRequest {
  email: string;
  password: string;
}


@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn$ = new BehaviorSubject<boolean>(false);
  private currentUser$ = new BehaviorSubject<any>(null);

  private readonly INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];
  private boundResetTimer = this.resetInactivityTimer.bind(this);

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
    if (data?.session) this.startInactivityWatcher();

    // Listen for auth changes
    this.supabaseService.getAuth().onAuthStateChange((event, session) => {
      this.loggedIn$.next(!!session);
      this.currentUser$.next(session?.user || null);
      if (session) {
        this.startInactivityWatcher();
      } else {
        this.stopInactivityWatcher();
      }
    });
  }

  private startInactivityWatcher(): void {
    this.stopInactivityWatcher();
    this.ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, this.boundResetTimer, { passive: true }));
    this.resetInactivityTimer();
  }

  private stopInactivityWatcher(): void {
    this.ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, this.boundResetTimer));
    if (this.inactivityTimer) { clearTimeout(this.inactivityTimer); this.inactivityTimer = null; }
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => this.logout(), this.INACTIVITY_TIMEOUT_MS);
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
        if (!environment.production) { console.error('Login error:', error); }
        throw error;
      })
    );
  }

  async logout(): Promise<void> {
    this.stopInactivityWatcher();
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
