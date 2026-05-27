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
          <div class="header-top-row">
            <div class="brand" (click)="navegar(rotaInicial())">
              <img class="brand-logo" src="assets/light-brand.png" alt="Light">
              <span class="brand-name">LIGHT</span>
            </div>

            <div class="header-mobile-actions">
              <button mat-icon-button class="mobile-nav-trigger" [matMenuTriggerFor]="mobileNavMenu" aria-label="Abrir navegacao">
                <mat-icon>menu</mat-icon>
              </button>

              <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="Menu do usuario">
                <mat-icon>account_circle</mat-icon>
              </button>
            </div>
          </div>

          <div class="nav-links">
            @if (podeAcessarRota('/dashboard')) {
              <button mat-button (click)="navegar('/dashboard')" [disabled]="estaAtiva('/dashboard')">
                <mat-icon>dashboard</mat-icon> Dashboard
              </button>
            }
            @if (podeAcessarRota('/consulta')) {
              <button mat-button (click)="navegar('/consulta')" [disabled]="estaAtiva('/consulta')">
                <mat-icon>search</mat-icon> Consulta
              </button>
            }
            @if (podeAcessarRota('/clientes')) {
              <button mat-button (click)="navegar('/clientes')" [disabled]="estaAtiva('/clientes')">
                <mat-icon>people</mat-icon> Clientes
              </button>
            }
            @if (podeAcessarRota('/fornecedores')) {
              <button mat-button (click)="navegar('/fornecedores')" [disabled]="estaAtiva('/fornecedores')">
                <mat-icon>local_shipping</mat-icon> Fornecedores
              </button>
            }
            @if (podeAcessarRota('/produtos')) {
              <button mat-button (click)="navegar('/produtos')" [disabled]="estaAtiva('/produtos')">
                <mat-icon>inventory_2</mat-icon> Produtos
              </button>
            }
            @if (podeAcessarRota('/pedidos')) {
              <button mat-button (click)="navegar('/pedidos')" [disabled]="estaAtiva('/pedidos')">
                <mat-icon>receipt_long</mat-icon> Pedidos
              </button>
            }
            @if (podeAcessarRota('/estoque')) {
              <button mat-button (click)="navegar('/estoque')" [disabled]="estaAtiva('/estoque')">
                <mat-icon>warehouse</mat-icon> Estoque
              </button>
            }
            @if (podeGerenciarUsuarios()) {
              <button mat-button (click)="navegar('/gerencia-usuarios')" [disabled]="estaAtiva('/gerencia-usuarios')">
                <mat-icon>manage_accounts</mat-icon> Usuários
              </button>
              <button mat-button (click)="navegar('/comissoes')" [disabled]="estaAtiva('/comissoes')">
                <mat-icon>percent</mat-icon> Comissões
              </button>
              <button mat-button (click)="navegar('/formas-pagamento')" [disabled]="estaAtiva('/formas-pagamento')">
                <mat-icon>payment</mat-icon> Prazos Pagto
              </button>
              <button mat-button (click)="navegar('/formas-de-pagamento')" [disabled]="estaAtiva('/formas-de-pagamento')">
                <mat-icon>credit_card</mat-icon> Formas de Pgto
              </button>
            }
          </div>

          <button mat-icon-button class="desktop-user-trigger" [matMenuTriggerFor]="userMenu" aria-label="Menu do usuario">
            <mat-icon>account_circle</mat-icon>
          </button>

          <mat-menu #mobileNavMenu="matMenu">
            @if (podeAcessarRota('/dashboard')) {
              <button mat-menu-item (click)="navegar('/dashboard')">
                <mat-icon>dashboard</mat-icon>
                <span>Dashboard</span>
              </button>
            }
            @if (podeAcessarRota('/consulta')) {
              <button mat-menu-item (click)="navegar('/consulta')">
                <mat-icon>search</mat-icon>
                <span>Consulta</span>
              </button>
            }
            @if (podeAcessarRota('/clientes')) {
              <button mat-menu-item (click)="navegar('/clientes')">
                <mat-icon>people</mat-icon>
                <span>Clientes</span>
              </button>
            }
            @if (podeAcessarRota('/fornecedores')) {
              <button mat-menu-item (click)="navegar('/fornecedores')">
                <mat-icon>local_shipping</mat-icon>
                <span>Fornecedores</span>
              </button>
            }
            @if (podeAcessarRota('/produtos')) {
              <button mat-menu-item (click)="navegar('/produtos')">
                <mat-icon>inventory_2</mat-icon>
                <span>Produtos</span>
              </button>
            }
            @if (podeAcessarRota('/pedidos')) {
              <button mat-menu-item (click)="navegar('/pedidos')">
                <mat-icon>receipt_long</mat-icon>
                <span>Pedidos</span>
              </button>
            }
            @if (podeAcessarRota('/estoque')) {
              <button mat-menu-item (click)="navegar('/estoque')">
                <mat-icon>warehouse</mat-icon>
                <span>Estoque</span>
              </button>
            }
            @if (podeGerenciarUsuarios()) {
              <button mat-menu-item (click)="navegar('/gerencia-usuarios')">
                <mat-icon>manage_accounts</mat-icon>
                <span>Usuários</span>
              </button>
              <button mat-menu-item (click)="navegar('/comissoes')">
                <mat-icon>percent</mat-icon>
                <span>Comissões</span>
              </button>
              <button mat-menu-item (click)="navegar('/formas-pagamento')">
                <mat-icon>payment</mat-icon>
                <span>Prazos Pagto</span>
              </button>
              <button mat-menu-item (click)="navegar('/formas-de-pagamento')">
                <mat-icon>credit_card</mat-icon>
                <span>Formas de Pgto</span>
              </button>
            }
          </mat-menu>

          <mat-menu #userMenu="matMenu">
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Sair</span>
            </button>
          </mat-menu>
        </div>
      </mat-toolbar>

      <nav class="mobile-bottom-nav" aria-label="Navegação principal mobile">
        @if (podeAcessarRota('/dashboard')) {
          <button mat-button class="mobile-bottom-link" (click)="navegar('/dashboard')" [class.active]="estaAtiva('/dashboard')">
            <mat-icon>dashboard</mat-icon>
            <span>Início</span>
          </button>
        }
        @if (podeAcessarRota('/clientes')) {
          <button mat-button class="mobile-bottom-link" (click)="navegar('/clientes')" [class.active]="estaAtiva('/clientes')">
            <mat-icon>people</mat-icon>
            <span>Clientes</span>
          </button>
        }
        @if (podeAcessarRota('/pedidos')) {
          <button mat-button class="mobile-bottom-link" (click)="navegar('/pedidos')" [class.active]="estaAtiva('/pedidos')">
            <mat-icon>receipt_long</mat-icon>
            <span>Pedidos</span>
          </button>
        }
        @if (podeAcessarRota('/estoque')) {
          <button mat-button class="mobile-bottom-link" (click)="navegar('/estoque')" [class.active]="estaAtiva('/estoque')">
            <mat-icon>warehouse</mat-icon>
            <span>Estoque</span>
          </button>
        }
        @if (podeGerenciarUsuarios()) {
          <button mat-button class="mobile-bottom-link" (click)="navegar('/gerencia-usuarios')" [class.active]="estaAtiva('/gerencia-usuarios')">
            <mat-icon>manage_accounts</mat-icon>
            <span>Usuários</span>
          </button>
        } @else if (!isVendedor()) {
          <button mat-button class="mobile-bottom-link" [matMenuTriggerFor]="mobileNavMenu">
            <mat-icon>more_horiz</mat-icon>
            <span>Mais</span>
          </button>
        }
      </nav>
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
      justify-content: space-between;
      gap: 16px;
    }
    .header-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 0 0 auto;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    .brand-logo {
      width: 34px;
      height: 34px;
      display: block;
      flex: 0 0 auto;
      filter: drop-shadow(0 4px 10px rgba(255, 181, 0, 0.28));
    }
    .brand-name {
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1 1 auto;
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
    .header-mobile-actions,
    .mobile-nav-trigger {
      display: none;
    }
    .mobile-bottom-nav {
      display: none;
    }
    @media (max-width: 900px) {
      :host {
        padding-bottom: 84px;
      }
      .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 8px 0;
      }
      .header-top-row {
        width: 100%;
      }
      .nav-links {
        display: none;
      }
      .desktop-user-trigger {
        display: none;
      }
      .header-mobile-actions,
      .mobile-nav-trigger {
        display: inline-flex;
      }
      .mobile-bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 120;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4px;
        padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px));
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(12px);
        border-top: 1px solid rgba(91, 45, 142, 0.14);
        box-shadow: 0 -8px 24px rgba(61, 26, 110, 0.12);
      }
      .mobile-bottom-link {
        min-width: 0;
        min-height: 56px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border-radius: 14px;
        color: #6b5b7b;
        padding: 6px 4px;
        line-height: 1;
      }
      .mobile-bottom-link span {
        font-size: 11px;
        font-weight: 600;
      }
      .mobile-bottom-link mat-icon {
        margin: 0;
      }
      .mobile-bottom-link.active {
        background: #f1e8fa;
        color: #5b2d8e;
      }
    }
  `]
})
export class AppComponent {
  currentRoute = '';
  userRole: string | null = null;
  private readonly vendedorRotasPermitidas = new Set(['/clientes', '/pedidos', '/produtos', '/consulta']);

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

  isVendedor(): boolean {
    return this.userRole === 'vendedor';
  }

  podeAcessarRota(path: string): boolean {
    if (!this.isVendedor()) {
      return true;
    }

    return this.vendedorRotasPermitidas.has(path);
  }

  rotaInicial(): string {
    return this.isVendedor() ? '/clientes' : '/dashboard';
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
