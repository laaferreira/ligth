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
    <mat-toolbar color="primary">
      <h1>Gestão de Usuários</h1>
    </mat-toolbar>

    <div class="container">
      <mat-card>
        <mat-card-content>
          <div class="actions">
            <button mat-raised-button color="accent" (click)="abrirDialogoCriarUsuario()">
              <mat-icon>add</mat-icon> Novo Usuário
            </button>
            
            <mat-form-field appearance="outline" class="filter">
              <mat-label>Filtrar por Perfil</mat-label>
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
          </div>

          <div class="table-container desktop-table">
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

          <div class="mobile-cards" *ngIf="usuarios.length > 0">
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
              </div>
            </mat-card>
          </div>

          <div *ngIf="usuarios.length === 0" class="sem-dados">
            <p>Nenhum usuário encontrado</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .actions {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter {
      min-width: 200px;
    }

    .table-container {
      overflow-x: auto;
    }

    .mobile-cards {
      display: none;
      gap: 12px;
    }

    .user-mobile-card {
      border-radius: 16px;
      margin-bottom: 12px;
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

    .usuarios-table {
      width: 100%;
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

    .sem-dados {
      text-align: center;
      padding: 48px 24px;
      color: #999;
    }

    mat-toolbar {
      margin-bottom: 16px;
    }

    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }

      .actions {
        flex-direction: column;
        align-items: stretch;
      }

      .actions button,
      .filter {
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

      .user-mobile-actions button {
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
      vendedor: 'Vendedor'
    };
    return traducoes[role] || role;
  }

  formatarComissao(comissao: number): string {
    return `${Number(comissao ?? 0).toFixed(2)}%`;
  }
}
