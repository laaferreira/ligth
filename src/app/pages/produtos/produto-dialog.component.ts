import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProdutoService } from '../../core/services/produto.service';
import { Produto } from '../../core/models/produto.model';
import { Fornecedor } from '../../core/models/fornecedor.model';

type ProdutoDialogData = {
  modo: 'criar' | 'editar';
  produto?: Produto;
  fornecedores: Fornecedor[];
};

@Component({
  selector: 'app-produto-dialog',
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
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-title-row" mat-dialog-title>
      <div>
        <h2 class="dialog-title">{{ data.modo === 'criar' ? 'Novo Produto' : 'Editar Produto' }}</h2>
        <p class="dialog-subtitle">Cadastro ajustado para edição rápida no celular.</p>
      </div>
      <button mat-icon-button type="button" (click)="fechar()" [disabled]="salvando" aria-label="Fechar popup">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="form">
        <div class="form-row three-columns">
          <mat-form-field appearance="outline">
            <mat-label>Código *</mat-label>
            <input matInput formControlName="codigo" autocomplete="off">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fornecedor</mat-label>
            <mat-select formControlName="fornecedorId">
              <mat-option [value]="null">Sem fornecedor</mat-option>
              @for (fornecedor of data.fornecedores; track trackFornecedor(fornecedor)) {
                <mat-option [value]="fornecedor.id">{{ fornecedor.nome }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Categoria</mat-label>
            <input matInput formControlName="categoria" autocomplete="off">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrição *</mat-label>
          <input matInput formControlName="descricao" autocomplete="off">
        </mat-form-field>

        <div class="form-row two-columns">
          <mat-form-field appearance="outline">
            <mat-label>Preço custo</mat-label>
            <input matInput type="number" inputmode="decimal" formControlName="precoCusto">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Preço venda</mat-label>
            <input matInput type="number" inputmode="decimal" formControlName="precoVenda">
          </mat-form-field>
        </div>

        <div class="form-row two-columns">
          <mat-form-field appearance="outline">
            <mat-label>Preço custo vendedor</mat-label>
            <input matInput type="number" inputmode="decimal" formControlName="precoCustoVendedor">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Preço venda vendedor</mat-label>
            <input matInput type="number" inputmode="decimal" formControlName="precoVendaVendedor">
          </mat-form-field>
        </div>

        <div class="form-row two-columns">
          <mat-form-field appearance="outline">
            <mat-label>Qtd Estoque</mat-label>
            <input matInput type="number" inputmode="numeric" formControlName="quantidadeEstoque">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Estoque Máximo</mat-label>
            <input matInput type="number" inputmode="decimal" formControlName="estoqueMaximo">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Estoque Mínimo</mat-label>
            <input matInput type="number" inputmode="decimal" formControlName="estoqueMinimo">
          </mat-form-field>
        </div>

        <mat-slide-toggle formControlName="ativo" color="primary">Ativo</mat-slide-toggle>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button type="button" (click)="fechar()" [disabled]="salvando">Cancelar</button>
      <button mat-raised-button color="primary" type="button" (click)="salvar()" [disabled]="form.invalid || salvando">
        {{ salvando ? 'Salvando...' : (data.modo === 'criar' ? 'Criar' : 'Salvar') }}
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
      max-height: min(72vh, 760px);
      -webkit-overflow-scrolling: touch;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
      width: min(100%, 760px);
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

    .full-width,
    mat-form-field {
      width: 100%;
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

      .two-columns {
        grid-template-columns: 1fr;
      }

      .three-columns {
        grid-template-columns: 1fr;
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
export class ProdutoDialogComponent {
  form: FormGroup;
  salvando = false;

  constructor(
    private fb: FormBuilder,
    private produtoService: ProdutoService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ProdutoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProdutoDialogData
  ) {
    this.form = this.fb.group({
      codigo: [data.produto?.codigo || '', [Validators.required, Validators.maxLength(100)]],
      descricao: [data.produto?.descricao || '', [Validators.required, Validators.maxLength(300)]],
      fornecedorId: [data.produto?.fornecedorId ?? null],
      categoria: [data.produto?.categoria || '', Validators.maxLength(100)],
      precoCusto: [data.produto?.precoCusto ?? 0],
      precoVenda: [data.produto?.precoVenda ?? 0],
      precoCustoVendedor: [data.produto?.precoCustoVendedor ?? null],
      precoVendaVendedor: [data.produto?.precoVendaVendedor ?? null],
      quantidadeEstoque: [data.produto?.quantidadeEstoque ?? 0],
      estoqueMaximo: [data.produto?.estoqueMaximo ?? 0],
      estoqueMinimo: [data.produto?.estoqueMinimo ?? 5],
      ativo: [data.produto?.ativo ?? true]
    });
  }

  trackFornecedor(fornecedor: Fornecedor): string {
    return String(fornecedor.id ?? fornecedor.nome);
  }

  fechar(): void {
    this.dialogRef.close();
  }

  salvar(): void {
    if (this.form.invalid) {
      return;
    }

    this.salvando = true;
    const valor = this.form.getRawValue();
    const fornecedor = this.data.fornecedores.find(item => item.id === valor.fornecedorId);
    const dados: Produto = {
      ...valor,
      fornecedorId: valor.fornecedorId,
      fornecedorNome: valor.fornecedorId ? (fornecedor?.nome || this.data.produto?.fornecedorNome || '') : '',
      precoCusto: Number(valor.precoCusto || 0),
      precoVenda: Number(valor.precoVenda || 0),
      precoCustoVendedor: valor.precoCustoVendedor != null ? Number(valor.precoCustoVendedor) : null,
      precoVendaVendedor: valor.precoVendaVendedor != null ? Number(valor.precoVendaVendedor) : null,
      quantidadeEstoque: Number(valor.quantidadeEstoque || 0),
      estoqueMaximo: Number(valor.estoqueMaximo || 0),
      estoqueMinimo: Number(valor.estoqueMinimo || 0)
    };
    const requisicao = this.data.modo === 'editar' && this.data.produto?.id
      ? this.produtoService.atualizar(this.data.produto.id, dados)
      : this.produtoService.criar(dados);

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.snackBar.open(this.data.modo === 'editar' ? 'Produto atualizado!' : 'Produto criado!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.salvando = false;
        this.snackBar.open('Erro ao salvar produto.', 'OK', { duration: 4000 });
      }
    });
  }
}