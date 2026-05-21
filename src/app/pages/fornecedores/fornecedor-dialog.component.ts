import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FornecedorService } from '../../core/services/fornecedor.service';
import { Fornecedor } from '../../core/models/fornecedor.model';
import { AppUser } from '../../core/models/user.model';

type FornecedorDialogData = {
  modo: 'criar' | 'editar';
  fornecedor?: Fornecedor;
  responsaveis: AppUser[];
  responsavelPadraoId: string | null;
};

@Component({
  selector: 'app-fornecedor-dialog',
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
        <h2 class="dialog-title">{{ data.modo === 'criar' ? 'Novo Fornecedor' : 'Editar Fornecedor' }}</h2>
        <p class="dialog-subtitle">Cadastro e manutenção dos fornecedores importados ou criados manualmente.</p>
      </div>
      <button mat-icon-button type="button" (click)="fechar()" [disabled]="salvando || excluindo" aria-label="Fechar popup">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="form">
        <div class="form-row two-columns">
          <mat-form-field appearance="outline">
            <mat-label>Nome fantasia *</mat-label>
            <input matInput formControlName="nome">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Razão social</mat-label>
            <input matInput formControlName="razaoSocial">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>CNPJ/CPF</mat-label>
            <input matInput formControlName="cnpjCpf">
          </mat-form-field>
        </div>

        <div class="form-row three-columns">
          <mat-form-field appearance="outline">
            <mat-label>Contato</mat-label>
            <input matInput formControlName="contato" autocomplete="name">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Telefone</mat-label>
            <input matInput formControlName="telefone" inputmode="tel" autocomplete="tel">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" inputmode="email" autocomplete="email">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Responsável *</mat-label>
            <mat-select formControlName="responsavelId">
              @for (responsavel of data.responsaveis; track trackResponsavel(responsavel)) {
                <mat-option [value]="responsavel.id">{{ responsavel.nome }}{{ responsavel.is_active ? '' : ' (inativo)' }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Endereço</mat-label>
          <input matInput formControlName="endereco">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Observação</mat-label>
          <textarea matInput rows="3" formControlName="observacao"></textarea>
        </mat-form-field>
      </form>

      @if (confirmandoExclusao) {
        <div class="confirmacao-exclusao">
          <p>Tem certeza que deseja excluir este fornecedor?</p>
          <p class="confirmacao-aviso">Essa ação não pode ser desfeita.</p>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <div class="dialog-actions-primary">
        <button mat-button type="button" (click)="fechar()" [disabled]="salvando || excluindo">Fechar</button>
        <button mat-raised-button color="primary" type="button" (click)="salvar()" [disabled]="form.invalid || salvando || excluindo || confirmandoExclusao">
          {{ salvando ? 'Salvando...' : (data.modo === 'criar' ? 'Criar' : 'Salvar') }}
        </button>
      </div>

      @if (data.modo === 'editar') {
        <div class="dialog-actions-danger">
          <button mat-stroked-button color="warn" type="button" (click)="alternarConfirmacaoExclusao()" [disabled]="salvando || excluindo">
            <mat-icon>{{ confirmandoExclusao ? 'close' : 'delete' }}</mat-icon>
            {{ confirmandoExclusao ? 'Cancelar exclusão' : 'Excluir fornecedor' }}
          </button>

          @if (confirmandoExclusao) {
            <button mat-raised-button color="warn" type="button" (click)="excluir()" [disabled]="salvando || excluindo">
              {{ excluindo ? 'Excluindo...' : 'Confirmar exclusão' }}
            </button>
          }
        </div>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 0;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.35rem;
      line-height: 1.2;
    }

    .dialog-subtitle {
      margin: 6px 0 0;
      color: #6b5b7b;
      font-size: 0.9rem;
    }

    .dialog-content {
      max-height: min(72vh, 900px);
      padding-top: 8px;
      -webkit-overflow-scrolling: touch;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
      width: min(100%, 920px);
    }

    .form-row {
      display: grid;
      gap: 0 16px;
    }

    .two-columns {
      grid-template-columns: 1fr 1fr;
    }

    .three-columns {
      grid-template-columns: repeat(3, 1fr);
    }

    .full-width {
      width: 100%;
    }

    .dialog-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
      padding-top: 12px;
      border-top: 1px solid #ece3f4;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), #fff);
      position: sticky;
      bottom: 0;
    }

    .confirmacao-exclusao {
      margin-top: 8px;
      padding: 14px 16px;
      border-radius: 12px;
      background: #fff1f1;
      border: 1px solid #efb0b0;
      color: #7a1f1f;
    }

    .confirmacao-exclusao p {
      margin: 0;
    }

    .confirmacao-aviso {
      margin-top: 6px !important;
      font-size: 13px;
    }

    .dialog-actions-primary,
    .dialog-actions-danger {
      display: flex;
      gap: 12px;
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .dialog-actions-danger {
      justify-content: flex-start;
    }

    .dialog-actions .mdc-button {
      min-height: 44px;
    }

    mat-form-field {
      width: 100%;
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
        padding-bottom: 8px;
      }

      .form {
        width: 100%;
      }

      .two-columns,
      .three-columns {
        grid-template-columns: 1fr;
      }

      .dialog-actions-primary,
      .dialog-actions-danger {
        flex-direction: column;
      }

      .dialog-actions-primary button,
      .dialog-actions-danger button {
        width: 100%;
      }
    }
  `]
})
export class FornecedorDialogComponent {
  form: FormGroup;
  salvando = false;
  excluindo = false;
  confirmandoExclusao = false;

  constructor(
    private fb: FormBuilder,
    private fornecedorService: FornecedorService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<FornecedorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FornecedorDialogData
  ) {
    this.form = this.fb.group({
      nome: [data.fornecedor?.nome || '', [Validators.required, Validators.maxLength(200)]],
      razaoSocial: [data.fornecedor?.razaoSocial || '', Validators.maxLength(255)],
      cnpjCpf: [data.fornecedor?.cnpjCpf || '', Validators.maxLength(20)],
      telefone: [data.fornecedor?.telefone || '', Validators.maxLength(20)],
      contato: [data.fornecedor?.contato || '', Validators.maxLength(200)],
      email: [data.fornecedor?.email || '', Validators.maxLength(200)],
      endereco: [data.fornecedor?.endereco || '', Validators.maxLength(500)],
      observacao: [data.fornecedor?.observacao || '', Validators.maxLength(1000)],
      responsavelId: [data.fornecedor?.responsavelId || data.responsavelPadraoId, Validators.required]
    });
  }

  fechar(): void {
    this.dialogRef.close();
  }

  alternarConfirmacaoExclusao(): void {
    this.confirmandoExclusao = !this.confirmandoExclusao;
  }

  trackResponsavel(responsavel: AppUser): string {
    return responsavel.id;
  }

  salvar(): void {
    if (this.form.invalid) {
      return;
    }

    this.salvando = true;
    const dados = this.prepararDados();
    const requisicao = this.data.modo === 'editar' && this.data.fornecedor?.id
      ? this.fornecedorService.atualizar(this.data.fornecedor.id, dados)
      : this.fornecedorService.criar(dados);

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.snackBar.open(this.data.modo === 'editar' ? 'Fornecedor atualizado!' : 'Fornecedor criado!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.salvando = false;
        this.snackBar.open('Erro ao salvar fornecedor.', 'OK', { duration: 4000 });
      }
    });
  }

  excluir(): void {
    if (!this.data.fornecedor?.id) {
      return;
    }

    this.excluindo = true;
    this.fornecedorService.excluir(this.data.fornecedor.id).subscribe({
      next: () => {
        this.excluindo = false;
        this.snackBar.open('Fornecedor excluído!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.excluindo = false;
        this.snackBar.open('Erro ao excluir fornecedor.', 'OK', { duration: 4000 });
      }
    });
  }

  private prepararDados(): Fornecedor {
    const valor = this.form.getRawValue();
    return {
      nome: valor.nome?.trim() || '',
      razaoSocial: valor.razaoSocial?.trim() || '',
      cnpjCpf: valor.cnpjCpf?.trim() || '',
      telefone: valor.telefone?.trim() || '',
      contato: valor.contato?.trim() || '',
      email: valor.email?.trim() || '',
      endereco: valor.endereco?.trim() || '',
      observacao: valor.observacao?.trim() || '',
      responsavelId: valor.responsavelId,
      dataCadastro: this.data.fornecedor?.dataCadastro
    };
  }
}