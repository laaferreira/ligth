import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AppUser } from '../../core/models/user.model';
import { UserManagementService } from '../../core/services/user-management.service';

function senhasIguaisValidator(control: AbstractControl): ValidationErrors | null {
  const nova = control.get('novaSenha')?.value;
  const confirmar = control.get('confirmarSenha')?.value;
  if (nova && confirmar && nova !== confirmar) {
    return { senhasDiferentes: true };
  }
  return null;
}

export interface TrocarSenhaDialogData {
  usuario: AppUser;
  usuarioAtual: AppUser;
}

@Component({
  selector: 'app-trocar-senha-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-title-row" mat-dialog-title>
      <div>
        <h2 class="dialog-title">Trocar Senha</h2>
        <p class="dialog-subtitle">{{ data.usuario.nome }} &mdash; {{ data.usuario.email }}</p>
      </div>
      <button mat-icon-button (click)="cancelar()" [disabled]="salvando" aria-label="Fechar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nova senha</mat-label>
          <input matInput formControlName="novaSenha"
                 [type]="mostrarNova ? 'text' : 'password'"
                 autocomplete="new-password">
          <button mat-icon-button matSuffix type="button"
                  (click)="mostrarNova = !mostrarNova" [attr.aria-label]="mostrarNova ? 'Ocultar senha' : 'Mostrar senha'">
            <mat-icon>{{ mostrarNova ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-hint>Mínimo 6 caracteres</mat-hint>
          <mat-error *ngIf="form.get('novaSenha')?.hasError('required')">Senha é obrigatória</mat-error>
          <mat-error *ngIf="form.get('novaSenha')?.hasError('minlength')">Mínimo 6 caracteres</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirmar senha</mat-label>
          <input matInput formControlName="confirmarSenha"
                 [type]="mostrarConfirmar ? 'text' : 'password'"
                 autocomplete="new-password">
          <button mat-icon-button matSuffix type="button"
                  (click)="mostrarConfirmar = !mostrarConfirmar" [attr.aria-label]="mostrarConfirmar ? 'Ocultar senha' : 'Mostrar senha'">
            <mat-icon>{{ mostrarConfirmar ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-error *ngIf="form.get('confirmarSenha')?.hasError('required')">Confirmação é obrigatória</mat-error>
        </mat-form-field>

        @if (form.hasError('senhasDiferentes') && form.get('confirmarSenha')?.touched) {
          <p class="erro-senhas">As senhas não coincidem.</p>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="cancelar()" [disabled]="salvando">Cancelar</button>
      <button mat-raised-button color="primary" (click)="salvar()"
              [disabled]="salvando || form.invalid">
        {{ salvando ? 'Salvando...' : 'Salvar senha' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 16px 0;
    }
    .dialog-title { margin: 0; color: #3d1a6e; font-size: 20px; }
    .dialog-subtitle { margin: 4px 0 0; color: #6b5b7b; font-size: 13px; }
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      min-width: min(360px, 90vw);
    }
    .full-width { width: 100%; }
    .erro-senhas { color: #c62828; font-size: 12px; margin: -4px 0 4px 16px; }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 12px 16px;
      border-top: 1px solid #ece3f4;
    }
  `]
})
export class TrocarSenhaDialogComponent {
  form: FormGroup;
  salvando = false;
  mostrarNova = false;
  mostrarConfirmar = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TrocarSenhaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TrocarSenhaDialogData,
    private userManagementService: UserManagementService
  ) {
    this.form = this.fb.group({
      novaSenha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', Validators.required]
    }, { validators: senhasIguaisValidator });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) return;
    this.salvando = true;

    this.userManagementService
      .trocarSenha(this.data.usuario.id, this.form.value.novaSenha, this.data.usuarioAtual)
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err: any) => {
          this.salvando = false;
          this.dialogRef.close({ error: err?.message || 'Erro ao trocar senha.' });
        }
      });
  }
}
