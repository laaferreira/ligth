import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

import { UserManagementService } from '../../core/services/user-management.service';
import { AuthService } from '../../core/services/auth.service';
import { AppUser, UserRole, CreateUserRequest, UpdateUserRequest } from '../../core/models/user.model';
import { CriarEditarUsuarioDialogComponent } from './criar-editar-usuario-dialog.component';
import { TrocarSenhaDialogComponent } from './trocar-senha-dialog.component';

@Component({
  selector: 'app-gerencia-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatToolbarModule,
    MatCardModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-wrapper">
      <main class="main-content">
        <section class="usuarios-hero">
          <div>
            <p class="hero-kicker">Controle de acesso</p>
            <h1>Gestão de usuários</h1>
            <p class="hero-text">Cadastre, edite permissões, acompanhe status e ajuste a comissão dos usuários no mesmo padrão visual do restante do sistema.</p>
          </div>
          <div class="hero-highlights">
            <div class="hero-highlight">
              <span class="highlight-label">Cadastros</span>
              <strong>{{ usuarios.length }} usuário(s)</strong>
            </div>
            <div class="hero-highlight destaque">
              <span class="highlight-label">Acesso</span>
              <strong>Administrador e gerente</strong>
            </div>
          </div>
        </section>

        <mat-card class="filtros-card">
          <mat-card-content>
            <div class="section-heading">
              <p class="section-kicker">Consulta</p>
              <h2>Filtre e gerencie os usuários cadastrados</h2>
            </div>

            <div class="actions">
              <mat-form-field appearance="outline" class="filter filter-wide">
                <mat-label>Filtrar por perfil</mat-label>
                <mat-select [(ngModel)]="filtroRole" (change)="aplicarFiltro()">
                  <mat-option value="">Todos</mat-option>
                  <mat-option value="administrador">Administrador</mat-option>
                  <mat-option value="gerente">Gerente</mat-option>
                  <mat-option value="vendedor">Vendedor</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="filter">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="filtroAtivo" (change)="aplicarFiltro()">
                  <mat-option value="">Todos</mat-option>
                  <mat-option [value]="true">Ativos</mat-option>
                  <mat-option [value]="false">Inativos</mat-option>
                </mat-select>
              </mat-form-field>

              <div class="acoes">
                <button mat-raised-button color="primary" (click)="abrirDialogoCriarUsuario()">
                  <mat-icon>add</mat-icon>
                  Novo usuário
                </button>
                <button mat-stroked-button type="button" (click)="limparFiltros()">
                  <mat-icon>clear</mat-icon>
                  Limpar
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        @if (usuarios.length === 0) {
          <mat-card class="estado estado-vazio">
            <mat-card-content>
              <mat-icon>group_off</mat-icon>
              <div>
                <strong>Nenhum usuário encontrado</strong>
                <p>Ajuste os filtros ou crie um novo usuário para começar.</p>
              </div>
            </mat-card-content>
          </mat-card>
        } @else {
          <mat-card class="resultado-card">
            <mat-card-content>
              <div class="resultado-header">
                <div>
                  <p class="section-kicker">Resultado</p>
                  <h2>Usuários cadastrados</h2>
                  <p class="resultado-subtitle">Visualize perfil, comissão, status e data de criação em uma única listagem.</p>
                </div>
                <div class="resultado-chip">
                  <span>{{ usuarios.length }}</span>
                  <small>registro(s)</small>
                </div>
              </div>

              <div class="table-container desktop-table table-wrapper">
                <table mat-table [dataSource]="usuarios" class="usuarios-table">
              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let user">{{ user.email }}</td>
              </ng-container>

              <!-- Nome Column -->
              <ng-container matColumnDef="nome">
                <th mat-header-cell *matHeaderCellDef>Nome</th>
                <td mat-cell *matCellDef="let user">{{ user.nome }}</td>
              </ng-container>

              <!-- Role Column -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Perfil</th>
                <td mat-cell *matCellDef="let user">
                  <span [class]="'badge badge-' + user.role">{{ traduzirRole(user.role) }}</span>
                </td>
              </ng-container>

              <!-- Comissao Column -->
              <ng-container matColumnDef="comissao">
                <th mat-header-cell *matHeaderCellDef>Comissão</th>
                <td mat-cell *matCellDef="let user">{{ formatarComissao(user.comissao) }}</td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let user">
                  <span [class]="user.is_active ? 'status-ativo' : 'status-inativo'">
                    {{ user.is_active ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
              </ng-container>

              <!-- Criado em Column -->
              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef>Data de Criação</th>
                <td mat-cell *matCellDef="let user">
                  {{ user.created_at | date: 'dd/MM/yyyy' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="acoes">
                <th mat-header-cell *matHeaderCellDef>Ações</th>
                <td mat-cell *matCellDef="let user">
                  <button mat-icon-button (click)="editarUsuario(user)" matTooltip="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="abrirTrocarSenha(user)" matTooltip="Trocar senha" color="accent">
                    <mat-icon>lock_reset</mat-icon>
                  </button>
                  <button 
                    mat-icon-button 
                    (click)="mudarStatus(user)"
                    [matTooltip]="user.is_active ? 'Desativar' : 'Ativar'"
                    color="warn"
                  >
                    <mat-icon>{{ user.is_active ? 'block' : 'check_circle' }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="colunas"></tr>
              <tr mat-row *matRowDef="let row; columns: colunas;"></tr>
                </table>
              </div>

              <div class="mobile-cards">
                <mat-card class="user-mobile-card" *ngFor="let user of usuarios">
                  <div class="user-mobile-header">
                    <div>
                      <div class="user-mobile-name">{{ user.nome }}</div>
                      <div class="user-mobile-email">{{ user.email }}</div>
                    </div>
                    <div class="user-mobile-header-side">
                      <span [class]="'badge badge-' + user.role">{{ traduzirRole(user.role) }}</span>
                      <button mat-icon-button [matMenuTriggerFor]="userActionsMenu" aria-label="Ações do usuário">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #userActionsMenu="matMenu">
                        <button mat-menu-item (click)="editarUsuario(user)">
                          <mat-icon>edit</mat-icon>
                          <span>Editar</span>
                        </button>
                        <button mat-menu-item (click)="abrirTrocarSenha(user)">
                          <mat-icon>lock_reset</mat-icon>
                          <span>Trocar senha</span>
                        </button>
                        <button mat-menu-item (click)="mudarStatus(user)">
                          <mat-icon>{{ user.is_active ? 'block' : 'check_circle' }}</mat-icon>
                          <span>{{ user.is_active ? 'Desativar' : 'Ativar' }}</span>
                        </button>
                      </mat-menu>
                    </div>
                </div>

                  <div class="user-mobile-details">
                    <div class="user-mobile-detail">
                      <span class="detail-label">Comissão</span>
                      <span>{{ formatarComissao(user.comissao) }}</span>
                    </div>
                    <div class="user-mobile-detail">
                      <span class="detail-label">Status</span>
                      <span [class]="user.is_active ? 'status-ativo' : 'status-inativo'">
                        {{ user.is_active ? 'Ativo' : 'Inativo' }}
                      </span>
                    </div>
                    <div class="user-mobile-detail">
                      <span class="detail-label">Criado em</span>
                      <span>{{ user.created_at | date: 'dd/MM/yyyy' }}</span>
                    </div>
                  </div>

                  <div class="user-mobile-actions">
                    <button mat-stroked-button color="primary" (click)="editarUsuario(user)">
                      <mat-icon>edit</mat-icon>
                      Editar
                    </button>
                    <button mat-stroked-button color="accent" (click)="abrirTrocarSenha(user)">
                      <mat-icon>lock_reset</mat-icon>
                      Trocar senha
                    </button>
                  </div>
                </mat-card>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </main>
    </div>
  `,
  styles: [`
    .page-wrapper {
      min-height: 100vh;
      background: #f5f0fa;
    }

    .main-content {
      padding: 24px 16px 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .usuarios-hero {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: stretch;
      margin-bottom: 24px;
      padding: 24px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(91, 45, 142, 0.12), rgba(201, 168, 76, 0.16));
      border: 1px solid #e6d9f0;
    }

    .hero-kicker,
    .section-kicker {
      margin: 0 0 8px;
      color: #7b4bab;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 700;
    }

    .usuarios-hero h1,
    .section-heading h2,
    .resultado-header h2 {
      margin: 0;
      color: #3d1a6e;
    }

    .usuarios-hero h1 {
      font-size: 28px;
      line-height: 1.1;
      margin-bottom: 8px;
    }

    .hero-text,
    .resultado-subtitle {
      margin: 0;
      color: #6b5b7b;
    }

    .hero-highlights {
      display: grid;
      gap: 12px;
      min-width: 250px;
    }

    .hero-highlight {
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(91, 45, 142, 0.08);
    }

    .highlight-label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b5b7b;
      margin-bottom: 6px;
    }

    .hero-highlight strong {
      color: #3d1a6e;
      font-size: 18px;
    }

    .hero-highlight.destaque {
      background: rgba(255, 247, 232, 0.92);
      border-color: #f0d8a2;
    }

    .filtros-card,
    .resultado-card,
    .estado {
      margin-bottom: 20px;
      border-radius: 18px;
      box-shadow: 0 12px 30px rgba(61, 26, 110, 0.08);
    }

    .section-heading {
      margin-bottom: 16px;
    }

    .actions {
      display: grid;
      grid-template-columns: minmax(220px, 1.3fr) minmax(180px, 1fr) auto;
      gap: 16px;
      align-items: start;
    }

    .filter {
      min-width: 180px;
    }

    .filter-wide {
      min-width: 220px;
    }

    .acoes {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .acoes button {
      min-height: 44px;
    }

    .resultado-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .resultado-chip {
      min-width: 140px;
      padding: 14px 16px;
      border-radius: 16px;
      background: linear-gradient(135deg, #eef4ff 0%, #dfe9ff 100%);
      border: 1px solid #bed0f8;
      text-align: center;
    }

    .resultado-chip span {
      display: block;
      font-size: 28px;
      line-height: 1;
      font-weight: 700;
      color: #3d1a6e;
    }

    .resultado-chip small {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b5b7b;
    }

    .table-container {
      overflow-x: auto;
    }

    .table-wrapper {
      border-radius: 10px;
      border: 1px solid #e0d4ec;
    }

    .usuarios-table {
      width: 100%;
    }

    th {
      background: #f5f0fa;
      font-weight: 600;
      font-size: 13px;
      color: #3d1a6e;
    }

    td {
      font-size: 14px;
    }

    .mobile-cards {
      display: none;
      gap: 12px;
      margin-top: 12px;
    }

    .user-mobile-card {
      border-radius: 16px;
      margin-bottom: 12px;
      border: 1px solid #e5d9ef;
      box-shadow: none;
    }

    .user-mobile-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .user-mobile-header-side {
      display: flex;
      align-items: flex-start;
      gap: 4px;
    }

    .user-mobile-name {
      font-weight: 700;
      color: #3d1a6e;
      margin-bottom: 4px;
    }

    .user-mobile-email {
      font-size: 13px;
      color: #6b5b7b;
      word-break: break-word;
    }

    .user-mobile-details {
      display: grid;
      gap: 10px;
      margin-bottom: 14px;
    }

    .user-mobile-detail {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 14px;
    }

    .detail-label {
      color: #6b5b7b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .user-mobile-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-administrador {
      background-color: #f3e5f5;
      color: #6a1b9a;
    }

    .badge-gerente {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .badge-vendedor {
      background-color: #f1f8e9;
      color: #558b2f;
    }

    .status-ativo {
      color: #4caf50;
      font-weight: 600;
    }

    .status-inativo {
      color: #f44336;
      font-weight: 600;
    }

    .estado-vazio mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
    }

    .estado-vazio mat-icon {
      color: #7b4bab;
    }

    .estado-vazio p {
      margin: 4px 0 0;
      color: #6b5b7b;
    }

    @media (max-width: 960px) {
      .actions {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .acoes {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 900px) {
      .usuarios-hero,
      .resultado-header {
        flex-direction: column;
      }

      .hero-highlights,
      .resultado-chip {
        min-width: 0;
        width: 100%;
      }
    }

    @media (max-width: 768px) {
      .main-content {
        padding: 16px 12px 24px;
      }

      .usuarios-hero {
        padding: 18px 16px;
        border-radius: 18px;
      }

      .usuarios-hero h1 {
        font-size: 24px;
      }

      .actions {
        grid-template-columns: 1fr;
      }

      .acoes button,
      .filter,
      .filter-wide {
        width: 100%;
      }

      .desktop-table {
        display: none;
      }

      .mobile-cards {
        display: block;
      }

      .user-mobile-actions {
        flex-direction: column;
      }

      .user-mobile-actions button,
      .acoes button {
        width: 100%;
      }
    }
  `]
})
export class GerenciaUsuariosComponent implements OnInit {
  usuarios: AppUser[] = [];
  usuarioAtual: AppUser | null = null;
  filtroRole: string = '';
  filtroAtivo: any = '';
  colunas: string[] = ['email', 'nome', 'role', 'comissao', 'status', 'created_at', 'acoes'];

  constructor(
    private userManagementService: UserManagementService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.carregarUsuarioAtual();
    this.carregarUsuarios();
  }

  private carregarUsuarioAtual() {
    this.userManagementService.obterUsuarioAtualComRole().then(usuario => {
      this.usuarioAtual = usuario;
    });
  }

  carregarUsuarios() {
    const filtros: any = {};
    if (this.filtroRole) filtros.role = this.filtroRole as UserRole;
    if (this.filtroAtivo !== '') filtros.is_active = this.filtroAtivo;

    this.userManagementService.listarUsuarios(filtros).subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
      },
      error: (error) => {
        this.snackBar.open('Erro ao carregar usuários', 'Fechar', { duration: 3000 });
        console.error(error);
      }
    });
  }

  aplicarFiltro() {
    this.carregarUsuarios();
  }

  limparFiltros() {
    this.filtroRole = '';
    this.filtroAtivo = '';
    this.carregarUsuarios();
  }

  abrirDialogoCriarUsuario() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    const dialogRef = this.dialog.open(CriarEditarUsuarioDialogComponent, {
      width: isMobile ? '100vw' : '500px',
      height: isMobile ? '100dvh' : undefined,
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      autoFocus: false,
      data: {
        usuarioAtual: this.usuarioAtual,
        modo: 'criar'
      }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.carregarUsuarios();
      }
    });
  }

  editarUsuario(usuario: AppUser) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    const dialogRef = this.dialog.open(CriarEditarUsuarioDialogComponent, {
      width: isMobile ? '100vw' : '500px',
      height: isMobile ? '100dvh' : undefined,
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      autoFocus: false,
      data: {
        usuario,
        usuarioAtual: this.usuarioAtual,
        modo: 'editar'
      }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.carregarUsuarios();
      }
    });
  }

  mudarStatus(usuario: AppUser) {
    const acao = usuario.is_active ? 'Desativar' : 'Ativar';
    const confirmacao = confirm(`Tem certeza que deseja ${acao.toLowerCase()} ${usuario.nome}?`);

    if (!confirmacao) return;

    const observable = usuario.is_active
      ? this.userManagementService.desativarUsuario(usuario.id)
      : this.userManagementService.reativarUsuario(usuario.id);

    observable.subscribe({
      next: () => {
        this.snackBar.open(`Usuário ${acao.toLowerCase()} com sucesso!`, 'Fechar', { duration: 3000 });
        this.carregarUsuarios();
      },
      error: (error) => {
        this.snackBar.open(`Erro ao ${acao.toLowerCase()} usuário`, 'Fechar', { duration: 3000 });
        console.error(error);
      }
    });
  }

  traduzirRole(role: UserRole): string {
    const traducoes: Record<UserRole, string> = {
      administrador: 'Administrador',
      gerente: 'Gerente',
      vendedor: 'Vendedor',
      auxiliar_cliente: 'Auxiliar Cliente'
    };
    return traducoes[role] || role;
  }

  formatarComissao(comissao: number): string {
    return `${Number(comissao ?? 0).toFixed(2)}%`;
  }

  abrirTrocarSenha(usuario: AppUser): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    const dialogRef = this.dialog.open(TrocarSenhaDialogComponent, {
      width: isMobile ? '100vw' : '420px',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      autoFocus: false,
      data: { usuario, usuarioAtual: this.usuarioAtual }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.snackBar.open(`Senha de ${usuario.nome} alterada com sucesso!`, 'OK', { duration: 4000 });
      } else if (resultado?.error) {
        this.snackBar.open(resultado.error, 'OK', { duration: 5000 });
      }
    });
  }
}
