import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
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
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.modo === 'criar' ? 'Novo Usuário' : 'Editar ' + data.usuario?.nome }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" [readonly]="data.modo === 'editar'">
          <mat-error *ngIf="form.get('email')?.hasError('required')">Email é obrigatório</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Email inválido</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" required>
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

        <mat-form-field appearance="outline" class="full-width" *ngIf="data.modo === 'criar'">
          <mat-label>Senha</mat-label>
          <input matInput type="password" formControlName="password" required>
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

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!form.valid">
        {{ data.modo === 'criar' ? 'Criar' : 'Salvar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
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
  `]
})
export class CriarEditarUsuarioDialogComponent {
  form: FormGroup;

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
    this.userManagementService.criarUsuario(formValue, this.data.usuarioAtual).subscribe({
      next: () => {
        this.snackBar.open('Usuário criado com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.snackBar.open(`Erro: ${error.message}`, 'Fechar', { duration: 3000 });
        console.error(error);
      }
    });
  }

  private atualizarUsuario() {
    if (!this.data.usuario || !this.data.usuarioAtual) return;

    const formValue = this.form.getRawValue();
    const atualizacoes = {
      nome: formValue.nome,
      role: formValue.role
    };

    this.userManagementService.atualizarUsuario(
      this.data.usuario.id,
      atualizacoes,
      this.data.usuarioAtual
    ).subscribe({
      next: () => {
        this.snackBar.open('Usuário atualizado com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.snackBar.open(`Erro: ${error.message}`, 'Fechar', { duration: 3000 });
        console.error(error);
      }
    });
  }
}
