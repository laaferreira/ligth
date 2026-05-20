import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/services/auth.service';
import { UserManagementService } from './core/services/user-management.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    @if (deveExibirMenu()) {
      <mat-toolbar class="app-header">
        <div class="header-content">
          <div class="brand" (click)="navegar('/dashboard')">
            <mat-icon class="brand-icon">lightbulb</mat-icon>
            <span class="brand-name">LIGTH</span>
          </div>

          <div class="nav-links">
            <button mat-button (click)="navegar('/dashboard')" [disabled]="estaAtiva('/dashboard')">
              <mat-icon>dashboard</mat-icon> Dashboard
            </button>
            <button mat-button (click)="navegar('/consulta')" [disabled]="estaAtiva('/consulta')">
              <mat-icon>search</mat-icon> Consulta
            </button>
            <button mat-button (click)="navegar('/clientes')" [disabled]="estaAtiva('/clientes')">
              <mat-icon>people</mat-icon> Clientes
            </button>
            <button mat-button (click)="navegar('/produtos')" [disabled]="estaAtiva('/produtos')">
              <mat-icon>inventory_2</mat-icon> Produtos
            </button>
            <button mat-button (click)="navegar('/pedidos')" [disabled]="estaAtiva('/pedidos')">
              <mat-icon>receipt_long</mat-icon> Pedidos
            </button>
            <button mat-button (click)="navegar('/estoque')" [disabled]="estaAtiva('/estoque')">
              <mat-icon>warehouse</mat-icon> Estoque
            </button>
            @if (podeGerenciarUsuarios()) {
              <button mat-button (click)="navegar('/gerencia-usuarios')" [disabled]="estaAtiva('/gerencia-usuarios')">
                <mat-icon>manage_accounts</mat-icon> Usuários
              </button>
            }
          </div>

          <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="Menu do usuario">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Sair</span>
            </button>
          </mat-menu>
        </div>
      </mat-toolbar>
    }

    <router-outlet />
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .app-header {
      background: linear-gradient(90deg, #4f2a7f 0%, #6f43a9 100%);
      color: #fff;
      box-shadow: 0 6px 18px rgba(50, 30, 90, 0.18);
    }
    .header-content {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    .brand-name {
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      flex-wrap: wrap;
    }
    .nav-links button[mat-button] {
      color: #fff;
    }
    .nav-links button[mat-button][disabled] {
      opacity: 1;
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
    }
    @media (max-width: 900px) {
      .header-content {
        align-items: flex-start;
        flex-direction: column;
        padding: 8px 0;
      }
      .nav-links {
        width: 100%;
      }
    }
  `]
})
export class AppComponent {
  currentRoute = '';
  userRole: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private userManagementService: UserManagementService
  ) {
    this.currentRoute = this.router.url;

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.currentRoute = event.urlAfterRedirects;
      void this.carregarRole();
    });

    this.authService.user$.subscribe(user => {
      if (!user) {
        this.userRole = null;
        return;
      }
      void this.carregarRole();
    });
  }

  deveExibirMenu(): boolean {
    return !this.currentRoute.startsWith('/login');
  }

  estaAtiva(path: string): boolean {
    return this.currentRoute === path;
  }

  podeGerenciarUsuarios(): boolean {
    return this.userRole === 'administrador' || this.userRole === 'gerente';
  }

  navegar(path: string): void {
    if (!this.estaAtiva(path)) {
      void this.router.navigate([path]);
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  private async carregarRole(): Promise<void> {
    if (this.currentRoute.startsWith('/login')) {
      this.userRole = null;
      return;
    }

    const usuario = await this.userManagementService.obterUsuarioAtualComRole();
    this.userRole = usuario?.role || null;
  }
}
