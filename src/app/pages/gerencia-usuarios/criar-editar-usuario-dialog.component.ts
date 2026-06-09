import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UserManagementService } from '../../core/services/user-management.service';
import { AppUser, UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-criar-editar-usuario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-title-row" mat-dialog-title>
      <div>
        <h2 class="dialog-title">{{ data.modo === 'criar' ? 'Novo Usuário' : 'Editar ' + data.usuario?.nome }}</h2>
        <p class="dialog-subtitle">Formulário otimizado para preenchimento rápido no celular.</p>
      </div>
      <button mat-icon-button (click)="onCancel()" [disabled]="saving" aria-label="Fechar popup">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" [readonly]="data.modo === 'editar'" inputmode="email" autocomplete="email">
          <mat-error *ngIf="form.get('email')?.hasError('required')">Email é obrigatório</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Email inválido</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" required autocomplete="name">
          <mat-error *ngIf="form.get('nome')?.hasError('required')">Nome é obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Perfil</mat-label>
          <mat-select formControlName="role" required>
            <mat-option value="vendedor">Vendedor</mat-option>
            <mat-option value="gerente" *ngIf="podeSelectarGerente()">Gerente</mat-option>
            <mat-option value="administrador" *ngIf="data.usuarioAtual?.role === 'administrador'">
              Administrador
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('role')?.hasError('required')">Perfil é obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Comissão (%)</mat-label>
          <input matInput type="number" min="0" max="100" step="0.01" formControlName="comissao" required>
          <mat-hint>Percentual aplicado sobre cada pedido finalizado.</mat-hint>
          <mat-error *ngIf="form.get('comissao')?.hasError('required')">Comissão é obrigatória</mat-error>
          <mat-error *ngIf="form.get('comissao')?.hasError('min') || form.get('comissao')?.hasError('max')">
            A comissão deve estar entre 0 e 100.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Margem de Venda Elite (%)</mat-label>
          <input matInput type="number" min="0" max="1000" step="0.01" formControlName="margemVendaElite" required>
          <mat-hint>Preço Elite mostrado ao vendedor no pedido.</mat-hint>
          <mat-error *ngIf="form.get('margemVendaElite')?.hasError('required')">Margem Elite é obrigatória</mat-error>
          <mat-error *ngIf="form.get('margemVendaElite')?.hasError('min') || form.get('margemVendaElite')?.hasError('max')">
            A margem Elite deve estar entre 0 e 1000.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Margem de Venda Ouro (%)</mat-label>
          <input matInput type="number" min="0" max="1000" step="0.01" formControlName="margemVendaOuro" required>
          <mat-hint>Preço Ouro mostrado ao vendedor no pedido.</mat-hint>
          <mat-error *ngIf="form.get('margemVendaOuro')?.hasError('required')">Margem Ouro é obrigatória</mat-error>
          <mat-error *ngIf="form.get('margemVendaOuro')?.hasError('min') || form.get('margemVendaOuro')?.hasError('max')">
            A margem Ouro deve estar entre 0 e 1000.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Margem de Venda Prata (%)</mat-label>
          <input matInput type="number" min="0" max="1000" step="0.01" formControlName="margemVendaPrata" required>
          <mat-hint>Preço Prata mostrado ao vendedor no pedido.</mat-hint>
          <mat-error *ngIf="form.get('margemVendaPrata')?.hasError('required')">Margem Prata é obrigatória</mat-error>
          <mat-error *ngIf="form.get('margemVendaPrata')?.hasError('min') || form.get('margemVendaPrata')?.hasError('max')">
            A margem Prata deve estar entre 0 e 1000.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Margem de Venda Bronze (%)</mat-label>
          <input matInput type="number" min="0" max="1000" step="0.01" formControlName="margemVendaBronze" required>
          <mat-hint>Preço Bronze mostrado ao vendedor no pedido.</mat-hint>
          <mat-error *ngIf="form.get('margemVendaBronze')?.hasError('required')">Margem Bronze é obrigatória</mat-error>
          <mat-error *ngIf="form.get('margemVendaBronze')?.hasError('min') || form.get('margemVendaBronze')?.hasError('max')">
            A margem Bronze deve estar entre 0 e 1000.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="data.modo === 'criar'">
          <mat-label>Senha</mat-label>
          <input matInput type="password" formControlName="password" required autocomplete="new-password">
          <mat-error *ngIf="form.get('password')?.hasError('required')">Senha é obrigatória</mat-error>
          <mat-error *ngIf="form.get('password')?.hasError('minlength')">Mínimo 6 caracteres</mat-error>
        </mat-form-field>

        <p class="info-text">
          <strong>Nota:</strong> 
          <span *ngIf="data.usuarioAtual?.role === 'administrador'">
            Você pode criar qualquer tipo de usuário.
          </span>
          <span *ngIf="data.usuarioAtual?.role === 'gerente'">
            Você pode criar Vendedores e Gerentes, mas não Administradores.
          </span>
        </p>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()" [disabled]="saving">Cancelar</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!form.valid || saving">
        {{ saving ? 'Salvando...' : (data.modo === 'criar' ? 'Criar' : 'Salvar') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.3rem;
      line-height: 1.2;
    }

    .dialog-subtitle {
      margin: 6px 0 0;
      color: #666;
      font-size: 0.9rem;
    }

    .dialog-content {
      max-height: min(72vh, 800px);
      -webkit-overflow-scrolling: touch;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 12px;
    }

    .full-width {
      width: 100%;
    }

    .info-text {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
      font-style: italic;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid #ece3f4;
      position: sticky;
      bottom: 0;
      background: #fff;
    }

    .dialog-actions .mdc-button {
      min-height: 44px;
    }

    @media (max-width: 768px) {
      .dialog-title-row {
        position: sticky;
        top: 0;
        background: #fff;
        z-index: 2;
        padding-bottom: 8px;
        border-bottom: 1px solid #ece3f4;
      }

      .dialog-content {
        max-height: calc(100dvh - 180px);
      }

      .dialog-actions {
        flex-direction: column;
      }

      .dialog-actions button {
        width: 100%;
      }
    }
  `]
})
export class CriarEditarUsuarioDialogComponent {
  form: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private userManagementService: UserManagementService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CriarEditarUsuarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      usuario?: AppUser;
      usuarioAtual: AppUser | null;
      modo: 'criar' | 'editar';
    }
  ) {
    this.form = this.criarForm();
  }

  private criarForm(): FormGroup {
    const isEditar = this.data.modo === 'editar' && this.data.usuario;

    return this.fb.group({
      email: [
        { value: isEditar ? this.data.usuario?.email : '', disabled: isEditar },
        [Validators.required, Validators.email]
      ],
      nome: [isEditar ? this.data.usuario?.nome : '', Validators.required],
      role: [isEditar ? this.data.usuario?.role : '', Validators.required],
      comissao: [isEditar ? this.data.usuario?.comissao : 0, [Validators.required, Validators.min(0), Validators.max(100)]],
      margemVendaOuro: [isEditar ? this.data.usuario?.margemVendaOuro : 35, [Validators.required, Validators.min(0), Validators.max(1000)]],
      margemVendaPrata: [isEditar ? this.data.usuario?.margemVendaPrata : 50, [Validators.required, Validators.min(0), Validators.max(1000)]],
      margemVendaBronze: [isEditar ? this.data.usuario?.margemVendaBronze : 100, [Validators.required, Validators.min(0), Validators.max(1000)]],
      margemVendaElite: [isEditar ? this.data.usuario?.margemVendaElite : 20, [Validators.required, Validators.min(0), Validators.max(1000)]],
      password: [
        '',
        this.data.modo === 'criar' ? [Validators.required, Validators.minLength(6)] : []
      ]
    });
  }

  podeSelectarGerente(): boolean {
    return this.data.usuarioAtual?.role === 'administrador' || 
           this.data.usuarioAtual?.role === 'gerente';
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (!this.form.valid) return;

    if (this.data.modo === 'criar') {
      this.criarNovoUsuario();
    } else {
      this.atualizarUsuario();
    }
  }

  private criarNovoUsuario() {
    if (!this.data.usuarioAtual) return;

    const formValue = this.form.getRawValue();
    this.saving = true;

    this.userManagementService.criarUsuario(formValue, this.data.usuarioAtual).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Usuário criado com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.snackBar.open(`Erro: ${error.message}`, 'Fechar', { duration: 5000 });
        console.error(error);
      }
    });
  }

  private atualizarUsuario() {
    if (!this.data.usuario || !this.data.usuarioAtual) return;

    const formValue = this.form.getRawValue();
    const atualizacoes = {
      nome: formValue.nome,
      role: formValue.role,
      comissao: formValue.comissao,
      margemVendaOuro: formValue.margemVendaOuro,
      margemVendaPrata: formValue.margemVendaPrata,
      margemVendaBronze: formValue.margemVendaBronze,
      margemVendaElite: formValue.margemVendaElite
    };

    this.saving = true;

    this.userManagementService.atualizarUsuario(
      this.data.usuario.id,
      atualizacoes,
      this.data.usuarioAtual
    ).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Usuário atualizado com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.snackBar.open(`Erro: ${error.message}`, 'Fechar', { duration: 5000 });
        console.error(error);
      }
    });
  }
}
