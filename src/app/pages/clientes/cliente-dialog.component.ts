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
import { ClienteService } from '../../core/services/cliente.service';
import { Cliente } from '../../core/models/cliente.model';
import { AppUser } from '../../core/models/user.model';

type ClienteDialogData = {
  modo: 'criar' | 'editar';
  cliente?: Cliente;
  responsaveis: AppUser[];
  responsavelPadraoId: string | null;
};

@Component({
  selector: 'app-cliente-dialog',
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
        <h2 class="dialog-title">{{ data.modo === 'criar' ? 'Novo Cliente' : 'Editar Cliente' }}</h2>
        <p class="dialog-subtitle">Cadastro otimizado para preenchimento rápido no celular.</p>
      </div>
      <button mat-icon-button type="button" (click)="fechar()" [disabled]="salvando || excluindo" aria-label="Fechar popup">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="form">
        <div class="form-row two-columns">
          <mat-form-field appearance="outline">
            <mat-label>Nome *</mat-label>
            <input matInput formControlName="nome">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>CPF/CNPJ</mat-label>
            <input matInput formControlName="cpfCnpj">
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
        </div>

        <div class="form-row three-columns">
          <mat-form-field appearance="outline">
            <mat-label>Endereço</mat-label>
            <input matInput formControlName="endereco">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Logradouro</mat-label>
            <input matInput formControlName="logradouro">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Número</mat-label>
            <input matInput formControlName="numero" inputmode="numeric">
          </mat-form-field>
        </div>

        <div class="form-row three-columns">
          <mat-form-field appearance="outline">
            <mat-label>Complemento</mat-label>
            <input matInput formControlName="complemento">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Bairro</mat-label>
            <input matInput formControlName="bairro">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Cidade</mat-label>
            <input matInput formControlName="cidade">
          </mat-form-field>
        </div>

        <div class="form-row three-columns">
          <mat-form-field appearance="outline">
            <mat-label>UF</mat-label>
            <input matInput formControlName="uf" maxlength="2" autocapitalize="characters">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>CEP</mat-label>
            <input matInput formControlName="cep" inputmode="numeric" autocomplete="postal-code">
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
          <mat-label>Observação</mat-label>
          <textarea matInput rows="3" formControlName="observacao"></textarea>
        </mat-form-field>
      </form>

      @if (confirmandoExclusao) {
        <div class="confirmacao-exclusao">
          <p>Tem certeza que deseja excluir este registro?</p>
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
            {{ confirmandoExclusao ? 'Cancelar exclusão' : 'Excluir registro' }}
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
export class ClienteDialogComponent {
  form: FormGroup;
  salvando = false;
  excluindo = false;
  confirmandoExclusao = false;

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ClienteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClienteDialogData
  ) {
    this.form = this.fb.group({
      nome: [data.cliente?.nome || '', [Validators.required, Validators.maxLength(200)]],
      cpfCnpj: [data.cliente?.cpfCnpj || '', Validators.maxLength(20)],
      telefone: [data.cliente?.telefone || '', Validators.maxLength(20)],
      contato: [data.cliente?.contato || '', Validators.maxLength(200)],
      email: [data.cliente?.email || '', Validators.maxLength(200)],
      endereco: [data.cliente?.endereco || '', Validators.maxLength(500)],
      logradouro: [data.cliente?.logradouro || '', Validators.maxLength(255)],
      numero: [data.cliente?.numero || '', Validators.maxLength(50)],
      complemento: [data.cliente?.complemento || '', Validators.maxLength(255)],
      bairro: [data.cliente?.bairro || '', Validators.maxLength(255)],
      cidade: [data.cliente?.cidade || '', Validators.maxLength(255)],
      uf: [data.cliente?.uf || '', Validators.maxLength(2)],
      cep: [data.cliente?.cep || '', Validators.maxLength(20)],
      observacao: [data.cliente?.observacao || '', Validators.maxLength(1000)],
      responsavelId: [data.cliente?.responsavelId || data.responsavelPadraoId, Validators.required]
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
    const requisicao = this.data.modo === 'editar' && this.data.cliente?.id
      ? this.clienteService.atualizar(this.data.cliente.id, dados)
      : this.clienteService.criar(dados);

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.snackBar.open(this.data.modo === 'editar' ? 'Cliente atualizado!' : 'Cliente criado!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.salvando = false;
        this.snackBar.open('Erro ao salvar cliente.', 'OK', { duration: 4000 });
      }
    });
  }

  excluir(): void {
    if (!this.data.cliente?.id) {
      return;
    }

    this.excluindo = true;
    this.clienteService.excluir(this.data.cliente.id).subscribe({
      next: () => {
        this.excluindo = false;
        this.snackBar.open('Cliente excluído!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.excluindo = false;
        this.snackBar.open('Erro ao excluir cliente.', 'OK', { duration: 4000 });
      }
    });
  }

  private prepararDados(): Cliente {
    const dados = this.form.getRawValue() as Cliente;
    if (!dados.endereco?.trim()) {
      dados.endereco = [
        dados.logradouro,
        dados.numero,
        dados.complemento,
        dados.bairro,
        dados.cidade,
        dados.uf,
        dados.cep
      ].filter((parte): parte is string => !!parte && !!parte.trim()).join(', ');
    }

    return dados;
  }
}