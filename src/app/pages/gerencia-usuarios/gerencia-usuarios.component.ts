import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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

          <div class="table-container">
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
  `]
})
export class GerenciaUsuariosComponent implements OnInit {
  usuarios: AppUser[] = [];
  usuarioAtual: AppUser | null = null;
  filtroRole: string = '';
  filtroAtivo: any = '';
  colunas: string[] = ['email', 'nome', 'role', 'status', 'created_at', 'acoes'];

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
    const dialogRef = this.dialog.open(CriarEditarUsuarioDialogComponent, {
      width: '500px',
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
    const dialogRef = this.dialog.open(CriarEditarUsuarioDialogComponent, {
      width: '500px',
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
}
