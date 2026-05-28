import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, filter, switchMap } from 'rxjs';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EstoqueService } from '../../core/services/estoque.service';
import { ConsultaService } from '../../core/services/consulta.service';
import { AutocompleteItem, ProdutoAutocompleteItem } from '../../core/models/consulta.model';

@Component({
  selector: 'app-estoque-movimento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-title-row" mat-dialog-title>
      <div>
        <h2 class="dialog-title">Movimentação de Estoque</h2>
        <p class="dialog-subtitle">Registre entradas e saídas em um popup otimizado para celular.</p>
      </div>
      <button class="close-button" type="button" (click)="fechar()" [disabled]="salvando" aria-label="Fechar popup">
        ×
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="movForm" class="dialog-form">
        <div class="field-group full-width">
          <label class="field-label">Produto</label>
          <input class="field-input" [formControl]="produtoControl" [matAutocomplete]="autoProd" placeholder="Buscar produto...">
          <mat-autocomplete #autoProd="matAutocomplete" [displayWith]="displayFn" (optionSelected)="onProdutoSelected($event.option.value)">
            <mat-option *ngFor="let p of produtosFiltrados; trackBy: trackProduto" [value]="p">{{p.label}}</mat-option>
          </mat-autocomplete>
        </div>

        @if (produtoSelecionado) {
          <div class="produto-info-panel">
            <div class="info-item"><span class="info-label-inline">Estoque Atual:</span><span class="info-value">{{produtoSelecionado.quantidadeEstoque}}</span></div>
            <div class="info-item"><span class="info-label-inline">Custo Médio:</span><span class="info-value">{{produtoSelecionado.precoCusto | currency:'BRL'}}</span></div>
          </div>
        }

        <div class="form-row two-columns">
          <div class="field-group">
            <label class="field-label">Qtd</label>
            <input class="field-input" type="number" inputmode="numeric" [formControl]="qtdMovControl" min="1">
          </div>
          <div class="field-group">
            <label class="field-label">Preço Compra</label>
            <input class="field-input" type="number" inputmode="decimal" [formControl]="precoCompraControl" step="0.01" placeholder="R$">
          </div>
        </div>

        <div class="form-row two-columns">
          <div class="field-group">
            <label class="field-label">Preço Venda</label>
            <input class="field-input" type="number" inputmode="decimal" [formControl]="precoVendaControl" step="0.01" placeholder="R$">
          </div>
          <div class="field-group">
            <label class="field-label">Preço Custo Vendedor</label>
            <input class="field-input" type="number" inputmode="decimal" [formControl]="precoCustoVendedorControl" step="0.01" placeholder="R$">
          </div>
        </div>

        <div class="form-row two-columns">
          <div class="field-group">
            <label class="field-label">Preço Venda Vendedor</label>
            <input class="field-input" type="number" inputmode="decimal" [formControl]="precoVendaVendedorControl" step="0.01" placeholder="R$">
          </div>
        </div>

        <div class="field-group full-width">
          <label class="field-label">Data da Compra</label>
          <input class="field-input" type="date" [formControl]="dataCompraControl">
        </div>

        <div class="field-group full-width">
          <label class="field-label">Observação</label>
          <input class="field-input" [formControl]="obsControl">
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button class="action-button secondary" type="button" (click)="fechar()" [disabled]="salvando">Cancelar</button>
      <button class="action-button primary" type="button" (click)="registrar('entrada')" [disabled]="!produtoSelecionado || movForm.invalid || salvando">
        {{ salvando && tipoAcao === 'entrada' ? 'Registrando...' : 'Registrar entrada' }}
      </button>
      <button class="action-button danger" type="button" (click)="registrar('saida')" [disabled]="!produtoSelecionado || movForm.invalid || salvando">
        {{ salvando && tipoAcao === 'saida' ? 'Registrando...' : 'Registrar saída' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .dialog-title { margin: 0; font-size: 1.3rem; line-height: 1.2; }
    .dialog-subtitle { margin: 6px 0 0; color: #666; font-size: 0.9rem; }
    .close-button {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: #16324f;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
    }
    .close-button:disabled { opacity: 0.5; cursor: default; }
    .dialog-content { max-height: min(72vh, 720px); -webkit-overflow-scrolling: touch; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; width: min(100%, 760px); }
    .form-row { display: grid; gap: 16px; }
    .two-columns { grid-template-columns: 1fr 1fr; }
    .field-group { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .full-width { width: 100%; }
    .produto-info-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      padding: 12px 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f5f0fa, #ede4f7);
      border-left: 3px solid #c9a84c;
    }
    .info-item { display: flex; gap: 6px; align-items: center; }
    .info-label-inline { font-size: 13px; color: #6b5b7b; font-weight: 600; }
    .info-value { font-size: 14px; font-weight: 700; color: #1f2430; }
    .field-label { font-size: 0.9rem; font-weight: 600; color: #4a4060; }
    .field-input {
      width: 100%;
      min-height: 48px;
      padding: 12px 14px;
      border: 1px solid #cbb9e0;
      border-radius: 12px;
      background: #fff;
      color: #1f2430;
      font: inherit;
      box-sizing: border-box;
      outline: none;
    }
    .field-input:focus {
      border-color: #5b2d8e;
      box-shadow: 0 0 0 3px rgba(91, 45, 142, 0.14);
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
    .action-button {
      min-height: 44px;
      padding: 0 18px;
      border: none;
      border-radius: 10px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .action-button:disabled { opacity: 0.5; cursor: default; transform: none; }
    .action-button.primary { background: #3f51b5; color: #fff; }
    .action-button.danger { background: #d14343; color: #fff; }
    .action-button.secondary { background: transparent; color: #222; }
    @media (max-width: 768px) {
      .dialog-title-row { position: sticky; top: 0; background: #fff; z-index: 2; padding-bottom: 8px; border-bottom: 1px solid #ece3f4; }
      .dialog-content { max-height: calc(100dvh - 180px); }
      .two-columns { grid-template-columns: 1fr; }
      .dialog-actions { flex-direction: column; }
      .dialog-actions button { width: 100%; }
    }
  `]
})
export class EstoqueMovimentoDialogComponent implements OnInit {
  produtosFiltrados: ProdutoAutocompleteItem[] = [];
  produtoSelecionado: ProdutoAutocompleteItem | null = null;
  produtoControl = new FormControl('');
  movForm: FormGroup;
  salvando = false;
  tipoAcao: 'entrada' | 'saida' | null = null;

  get qtdMovControl(): FormControl { return this.movForm.get('quantidade') as FormControl; }
  get precoCompraControl(): FormControl { return this.movForm.get('precoCompra') as FormControl; }
  get precoVendaControl(): FormControl { return this.movForm.get('precoVenda') as FormControl; }
  get precoCustoVendedorControl(): FormControl { return this.movForm.get('precoCustoVendedor') as FormControl; }
  get precoVendaVendedorControl(): FormControl { return this.movForm.get('precoVendaVendedor') as FormControl; }
  get dataCompraControl(): FormControl { return this.movForm.get('dataCompra') as FormControl; }
  get obsControl(): FormControl { return this.movForm.get('observacao') as FormControl; }

  constructor(
    private estoqueService: EstoqueService,
    private consultaService: ConsultaService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EstoqueMovimentoDialogComponent>
  ) {
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    this.movForm = this.fb.group({
      quantidade: [1, [Validators.required, Validators.min(1)]],
      precoCompra: [null],
      precoVenda: [null],
      precoCustoVendedor: [null],
      precoVendaVendedor: [null],
      dataCompra: [hojeStr, Validators.required],
      observacao: ['']
    });
  }

  ngOnInit(): void {
    this.produtoControl.valueChanges.pipe(
      debounceTime(300),
      filter(v => typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarProdutosComPreco(v as string))
    ).subscribe(p => this.produtosFiltrados = p);
  }

  displayFn(item: AutocompleteItem): string { return item?.label || ''; }

  trackProduto(_: number, item: ProdutoAutocompleteItem): number {
    return item.id;
  }

  onProdutoSelected(item: ProdutoAutocompleteItem): void {
    this.produtoSelecionado = item;
    this.precoCompraControl.setValue(item.precoCusto || null);
    this.precoVendaControl.setValue(item.valor ?? null);
    this.precoCustoVendedorControl.setValue(item.precoCustoVendedor ?? null);
    this.precoVendaVendedorControl.setValue(item.precoVendaVendedor ?? null);
  }

  registrar(tipo: 'entrada' | 'saida'): void {
    if (!this.produtoSelecionado || this.movForm.invalid) return;

    this.salvando = true;
    this.tipoAcao = tipo;
    const { quantidade, precoCompra, precoVenda, precoCustoVendedor, precoVendaVendedor, observacao, dataCompra } = this.movForm.value;
    const obs$ = tipo === 'entrada'
      ? this.estoqueService.entrada(this.produtoSelecionado.id, quantidade, precoCompra, observacao, dataCompra, precoVenda, precoVendaVendedor, precoCustoVendedor)
      : this.estoqueService.saida(this.produtoSelecionado.id, quantidade, observacao, dataCompra);

    obs$.subscribe({
      next: () => {
        this.salvando = false;
        this.snackBar.open(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada!`, 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.salvando = false;
        this.snackBar.open(e.error || 'Erro', 'OK', { duration: 4000 });
      }
    });
  }

  fechar(): void {
    this.dialogRef.close();
  }
}