import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, filter, switchMap } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PedidoService } from '../../core/services/pedido.service';
import { ConsultaService } from '../../core/services/consulta.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { AutocompleteItem, ProdutoAutocompleteItem } from '../../core/models/consulta.model';
import { CriarPedido } from '../../core/models/pedido.model';
import { ErrorPresenterService } from '../../core/errors/error-presenter.service';

type PedidoDialogData = {
  modo: 'criar' | 'editar';
  pedidoId?: number;
};

@Component({
  selector: 'app-pedido-dialog',
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
    MatTableModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="dialog-title-row" mat-dialog-title>
      <div>
        <h2 class="dialog-title">{{ data.modo === 'criar' ? 'Novo Pedido' : 'Editar Pedido' }}</h2>
        <p class="dialog-subtitle">Monte o pedido em um popup otimizado para celular.</p>
      </div>
      <button mat-icon-button type="button" (click)="fechar()" [disabled]="salvando" aria-label="Fechar popup" matTooltip="Fechar pedido">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Cliente</mat-label>
          <input matInput [formControl]="clienteControl" [matAutocomplete]="autoCliente" placeholder="Buscar cliente...">
          <mat-icon matPrefix>person</mat-icon>
          <mat-autocomplete #autoCliente="matAutocomplete" [displayWith]="displayFn" (optionSelected)="onClienteSelected($event.option.value)">
            @for (c of clientesFiltrados; track c.id) {
              <mat-option [value]="c">{{c.label}}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <div class="add-item-row">
          <mat-form-field appearance="outline" class="field-produto">
            <mat-label>Produto</mat-label>
            <input matInput [formControl]="produtoControl" [matAutocomplete]="autoProduto" placeholder="Buscar produto...">
            <mat-autocomplete #autoProduto="matAutocomplete" [displayWith]="displayFn" (optionSelected)="onProdutoSelected($event.option.value)">
              @for (p of produtosFiltrados; track p.id) {
                <mat-option [value]="p">{{p.label}} <small class="option-preco">R$ {{p.precoCusto}}</small></mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>
          <mat-form-field appearance="outline" class="field-sm">
            <mat-label>Qtd</mat-label>
            <input matInput type="number" inputmode="numeric" [formControl]="qtdControl" min="1">
          </mat-form-field>
          <mat-form-field appearance="outline" class="field-sm">
            <mat-label>Vlr Unit.</mat-label>
            <input matInput type="number" inputmode="decimal" [formControl]="vlrControl" step="0.01">
          </mat-form-field>
          <mat-form-field appearance="outline" class="field-sm">
            <mat-label>Margem %</mat-label>
            <input matInput type="number" inputmode="decimal" [formControl]="margemControl" step="0.01">
          </mat-form-field>
          <button mat-mini-fab color="primary" type="button" class="btn-add-item" (click)="adicionarItem()" [disabled]="!produtoSelecionado || itemForm.invalid" matTooltip="Adicionar item ao pedido">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        @if (produtoSelecionado) {
          <div class="produto-info-panel">
            <div class="info-row">
              <div class="info-item">
                <span class="info-label">Estoque Atual:</span>
                <span class="info-value" [class.estoque-baixo]="estoqueAtualInfo <= 0">{{estoqueAtualInfo}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Comprometido:</span>
                <span class="info-value comprometido">{{comprometidoInfo}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Estoque Futuro:</span>
                <span class="info-value" [class.estoque-baixo]="estoqueFuturoInfo <= 0" [class.margem-positiva]="estoqueFuturoInfo > 0">{{estoqueFuturoInfo}}</span>
              </div>
            </div>
            <div class="info-row">
              <div class="info-item"><span class="info-label">Valor Total:</span><span class="info-value">{{valorTotalItem | currency:'BRL'}}</span></div>
              <div class="info-item"><span class="info-label">Valor Total Custo:</span><span class="info-value">{{valorTotalCustoItem | currency:'BRL'}}</span></div>
              <div class="info-item"><span class="info-label">Valor Total Lucro:</span><span class="info-value" [class.margem-positiva]="valorTotalLucroItem >= 0" [class.margem-negativa]="valorTotalLucroItem < 0">{{valorTotalLucroItem | currency:'BRL'}}</span></div>
            </div>
            @if (precoCusto !== null) {
              <div class="info-row">
                <div class="info-item"><span class="info-label">Custo Medio:</span><span class="info-value">{{precoCusto | currency:'BRL'}}</span></div>
                @if (margemLucro !== null) {
                  <div class="info-item"><span class="info-label">Margem:</span>
                    <span class="info-value" [class.margem-positiva]="margemLucro >= 0" [class.margem-negativa]="margemLucro < 0">{{margemLucro | number:'1.1-1'}}%</span>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (itensNovoPedido.length > 0) {
          <div class="table-wrapper">
            <table mat-table [dataSource]="itensNovoPedido">
              <ng-container matColumnDef="produto"><th mat-header-cell *matHeaderCellDef>Produto</th><td mat-cell *matCellDef="let r">{{r.produtoLabel}}</td></ng-container>
              <ng-container matColumnDef="quantidade"><th mat-header-cell *matHeaderCellDef>Qtd</th><td mat-cell *matCellDef="let r">{{r.quantidade}}</td></ng-container>
              <ng-container matColumnDef="valorUnitario"><th mat-header-cell *matHeaderCellDef>Unit.</th><td mat-cell *matCellDef="let r">{{r.valorUnitario | currency:'BRL'}}</td></ng-container>
              <ng-container matColumnDef="custoTotal"><th mat-header-cell *matHeaderCellDef>Custo</th><td mat-cell *matCellDef="let r">{{r.custoTotal | currency:'BRL'}}</td></ng-container>
              <ng-container matColumnDef="lucroTotal"><th mat-header-cell *matHeaderCellDef>Lucro</th><td mat-cell *matCellDef="let r"><span [class.margem-positiva]="r.lucroTotal >= 0" [class.margem-negativa]="r.lucroTotal < 0">{{r.lucroTotal | currency:'BRL'}}</span></td></ng-container>
              <ng-container matColumnDef="margemLucro"><th mat-header-cell *matHeaderCellDef>Margem</th><td mat-cell *matCellDef="let r">{{r.margemLucro === null ? '-' : ((r.margemLucro | number:'1.1-1') + '%')}}</td></ng-container>
              <ng-container matColumnDef="valorTotal"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let r">{{r.valorTotal | currency:'BRL'}}</td></ng-container>
              <ng-container matColumnDef="remover"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let r; let i = index"><button mat-icon-button color="warn" (click)="removerItem(i)" matTooltip="Remover item do pedido"><mat-icon>delete</mat-icon></button></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="itensColumns"></tr>
              <tr mat-row *matRowDef="let r; columns: itensColumns;"></tr>
            </table>
          </div>
          <div class="total-row">
            <strong>Total: {{totalPedido | currency:'BRL'}}</strong>
            <strong>Custo total: {{custoTotalPedido | currency:'BRL'}}</strong>
            <strong [class.margem-positiva]="lucroTotalPedido >= 0" [class.margem-negativa]="lucroTotalPedido < 0">Lucro total: {{lucroTotalPedido | currency:'BRL'}}</strong>
          </div>
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      @if (data.modo === 'editar') {
        <button mat-stroked-button color="warn" type="button" (click)="excluirPedidoAtual()" [disabled]="salvando" matTooltip="Excluir este pedido">
          Excluir pedido
        </button>
      }
      <button mat-button type="button" (click)="fechar()" [disabled]="salvando" matTooltip="Fechar sem salvar">Cancelar</button>
      <button mat-raised-button color="primary" type="button" (click)="salvarPedido()" [disabled]="!clienteSelecionado || itensNovoPedido.length === 0 || salvando" matTooltip="Salvar alterações do pedido">
        {{ salvando ? 'Salvando...' : (data.modo === 'criar' ? 'Criar pedido' : 'Salvar pedido') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .dialog-title { margin: 0; font-size: 1.3rem; line-height: 1.2; }
    .dialog-subtitle { margin: 6px 0 0; color: #666; font-size: 0.9rem; }
    .dialog-content { max-height: min(72vh, 820px); -webkit-overflow-scrolling: touch; }
    .dialog-form { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; width: min(100%, 920px); }
    .add-item-row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .field-produto { flex: 1; min-width: 200px; }
    .field-sm { width: 110px; }
    .btn-add-item { margin-top: 8px; }
    .option-preco { color: #6b5b7b; font-size: 12px; margin-left: 8px; }
    .produto-info-panel { background: linear-gradient(135deg, #f5f0fa, #ede4f7); border-radius: 12px; padding: 12px 16px; margin-bottom: 4px; display: flex; flex-direction: column; gap: 8px; border-left: 3px solid #c9a84c; }
    .info-row { display: flex; gap: 24px; flex-wrap: wrap; }
    .info-item { display: flex; gap: 6px; align-items: center; }
    .info-label { font-size: 13px; color: #6b5b7b; font-weight: 500; }
    .info-value { font-size: 14px; font-weight: 600; }
    .comprometido { color: #e65100; }
    .estoque-baixo { color: #c62828 !important; }
    .margem-positiva { color: #2e7d32; }
    .margem-negativa { color: #c62828; }
    .table-wrapper { overflow-x: auto; border-radius: 10px; border: 1px solid #e0d4ec; }
    .table-wrapper table { width: 100%; }
    .total-row { display: flex; justify-content: flex-end; gap: 20px; flex-wrap: wrap; padding: 12px 16px; font-size: 16px; color: #2e7d32; }
    .dialog-actions { display: flex; gap: 12px; padding-top: 12px; border-top: 1px solid #ece3f4; position: sticky; bottom: 0; background: #fff; }
    .dialog-actions .mdc-button { min-height: 44px; }
    mat-form-field { width: 100%; }
    @media (max-width: 768px) {
      .dialog-title-row { position: sticky; top: 0; background: #fff; z-index: 2; padding-bottom: 8px; border-bottom: 1px solid #ece3f4; }
      .dialog-content { max-height: calc(100dvh - 180px); }
      .add-item-row { flex-direction: column; }
      .field-produto, .field-sm, .btn-add-item { width: 100%; }
      .btn-add-item { border-radius: 12px; min-height: 44px; }
      .dialog-actions { flex-direction: column; }
      .dialog-actions button { width: 100%; }
      .total-row { justify-content: flex-start; padding-left: 0; padding-right: 0; }
    }
  `]
})
export class PedidoDialogComponent implements OnInit {
  clienteControl = new FormControl('');
  clientesFiltrados: AutocompleteItem[] = [];
  clienteSelecionado: AutocompleteItem | null = null;

  produtoControl = new FormControl('');
  produtosFiltrados: ProdutoAutocompleteItem[] = [];
  produtoSelecionado: ProdutoAutocompleteItem | null = null;

  estoqueInfo: { estoqueAtual: number; comprometido: number; estoqueFuturo: number } | null = null;

  itemForm: FormGroup;
  get qtdControl(): FormControl { return this.itemForm.get('quantidade') as FormControl; }
  get vlrControl(): FormControl { return this.itemForm.get('valorUnitario') as FormControl; }
  get margemControl(): FormControl { return this.itemForm.get('margemLucro') as FormControl; }

  itensNovoPedido: { produtoId: number; produtoLabel: string; quantidade: number; valorUnitario: number; custoUnitario: number; custoTotal: number; margemLucro: number | null; lucroTotal: number; valorTotal: number }[] = [];
  itensColumns = ['produto', 'quantidade', 'valorUnitario', 'custoTotal', 'lucroTotal', 'margemLucro', 'valorTotal', 'remover'];
  salvando = false;
  private atualizandoCamposPreco = false;

  constructor(
    private pedidoService: PedidoService,
    private consultaService: ConsultaService,
    private estoqueService: EstoqueService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private errorPresenter: ErrorPresenterService,
    public dialogRef: MatDialogRef<PedidoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PedidoDialogData
  ) {
    this.itemForm = this.fb.group({
      quantidade: [1, [Validators.required, Validators.min(1)]],
      valorUnitario: [null, [Validators.required, Validators.min(0.01)]],
      margemLucro: [null]
    });
  }

  ngOnInit(): void {
    this.vlrControl.valueChanges.subscribe(valor => {
      if (this.atualizandoCamposPreco) {
        return;
      }

      const margemCalculada = this.calcularMargemPorValorUnitario(this.toNumber(valor));
      if (margemCalculada === null) {
        return;
      }

      this.atualizandoCamposPreco = true;
      this.margemControl.setValue(margemCalculada, { emitEvent: false });
      this.atualizandoCamposPreco = false;
    });

    this.margemControl.valueChanges.subscribe(valor => {
      if (this.atualizandoCamposPreco) {
        return;
      }

      const valorUnitarioCalculado = this.calcularValorUnitarioPorMargem(this.toNumber(valor));
      if (valorUnitarioCalculado === null) {
        return;
      }

      this.atualizandoCamposPreco = true;
      this.vlrControl.setValue(valorUnitarioCalculado, { emitEvent: false });
      this.atualizandoCamposPreco = false;
    });

    this.clienteControl.valueChanges.pipe(
      debounceTime(300),
      filter(v => typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarClientes(v as string))
    ).subscribe(c => this.clientesFiltrados = c);

    this.produtoControl.valueChanges.pipe(
      debounceTime(300),
      filter(v => typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarProdutosComPreco(v as string))
    ).subscribe(p => this.produtosFiltrados = p);

    if (this.data.modo === 'editar' && this.data.pedidoId) {
      this.pedidoService.buscarPorId(this.data.pedidoId).subscribe(pedido => {
        this.clienteSelecionado = { id: pedido.clienteId, label: pedido.clienteNome || '' };
        this.clienteControl.setValue(this.clienteSelecionado as never, { emitEvent: false });
        this.itensNovoPedido = (pedido.itens || []).map(i => ({
          produtoId: i.produtoId,
          produtoLabel: `${i.produtoCodigo} - ${i.produtoDescricao}`,
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario,
          custoUnitario: i.custoUnitario || 0,
          custoTotal: i.custoTotal || i.quantidade * (i.custoUnitario || 0),
          margemLucro: i.custoUnitario ? this.roundToTwo(((i.valorUnitario - i.custoUnitario) / i.custoUnitario) * 100) : null,
          lucroTotal: (i.valorTotal || i.quantidade * i.valorUnitario) - (i.custoTotal || i.quantidade * (i.custoUnitario || 0)),
          valorTotal: i.valorTotal || i.quantidade * i.valorUnitario
        }));
      });
    }
  }

  displayFn(item: AutocompleteItem): string { return item?.label || ''; }

  onClienteSelected(item: AutocompleteItem): void {
    this.clienteSelecionado = item;
  }

  onProdutoSelected(item: ProdutoAutocompleteItem): void {
    this.produtoSelecionado = item;
    this.estoqueInfo = { estoqueAtual: item.quantidadeEstoque ?? 0, comprometido: 0, estoqueFuturo: item.quantidadeEstoque ?? 0 };
    this.estoqueService.estoqueProduto(item.id).subscribe({
      next: info => this.estoqueInfo = info,
      error: () => {
        this.estoqueInfo = { estoqueAtual: item.quantidadeEstoque ?? 0, comprometido: 0, estoqueFuturo: item.quantidadeEstoque ?? 0 };
      }
    });

    const margemAtual = this.toNumber(this.margemControl.value);
    const valorUnitarioAtual = this.toNumber(this.vlrControl.value);

    if (margemAtual !== null) {
      const valorUnitarioCalculado = this.calcularValorUnitarioPorMargem(margemAtual);
      if (valorUnitarioCalculado !== null) {
        this.atualizandoCamposPreco = true;
        this.vlrControl.setValue(valorUnitarioCalculado, { emitEvent: false });
        this.atualizandoCamposPreco = false;
      }
      return;
    }

    if (valorUnitarioAtual !== null) {
      const margemCalculada = this.calcularMargemPorValorUnitario(valorUnitarioAtual);
      if (margemCalculada !== null) {
        this.atualizandoCamposPreco = true;
        this.margemControl.setValue(margemCalculada, { emitEvent: false });
        this.atualizandoCamposPreco = false;
      }
    }
  }

  get precoCusto(): number | null { return this.produtoSelecionado?.precoCusto ?? null; }

  get estoqueAtualInfo(): number {
    return this.estoqueInfo?.estoqueAtual ?? 0;
  }

  get comprometidoInfo(): number {
    return this.estoqueInfo?.comprometido ?? 0;
  }

  get estoqueFuturoInfo(): number {
    return this.estoqueInfo?.estoqueFuturo ?? 0;
  }

  get margemLucro(): number | null {
    return this.calcularMargemPorValorUnitario(this.toNumber(this.vlrControl.value));
  }

  get valorTotalItem(): number {
    const quantidade = this.toNumber(this.qtdControl.value) ?? 0;
    const valorUnitario = this.toNumber(this.vlrControl.value) ?? 0;
    return this.roundToTwo(quantidade * valorUnitario);
  }

  get valorTotalCustoItem(): number {
    const quantidade = this.toNumber(this.qtdControl.value) ?? 0;
    const custo = this.precoCusto ?? 0;
    return this.roundToTwo(quantidade * custo);
  }

  get valorTotalLucroItem(): number {
    return this.roundToTwo(this.valorTotalItem - this.valorTotalCustoItem);
  }

  adicionarItem(): void {
    if (!this.produtoSelecionado || this.itemForm.invalid) return;
    const qty = this.itemForm.value.quantidade;
    const unit = this.itemForm.value.valorUnitario;
    const custoUnitario = this.precoCusto ?? 0;
    const valorTotal = qty * unit;
    const custoTotal = qty * custoUnitario;
    this.itensNovoPedido = [...this.itensNovoPedido, {
      produtoId: this.produtoSelecionado.id,
      produtoLabel: this.produtoSelecionado.label,
      quantidade: qty,
      valorUnitario: unit,
      custoUnitario,
      custoTotal,
      margemLucro: this.margemLucro,
      lucroTotal: this.roundToTwo(valorTotal - custoTotal),
      valorTotal
    }];
    this.produtoSelecionado = null;
    this.estoqueInfo = null;
    this.produtoControl.setValue('', { emitEvent: false });
    this.itemForm.patchValue({ quantidade: 1, valorUnitario: null, margemLucro: null });
  }

  removerItem(i: number): void {
    this.itensNovoPedido = this.itensNovoPedido.filter((_, idx) => idx !== i);
  }

  get totalPedido(): number {
    return this.itensNovoPedido.reduce((s, i) => s + i.valorTotal, 0);
  }

  get custoTotalPedido(): number {
    return this.itensNovoPedido.reduce((s, i) => s + i.custoTotal, 0);
  }

  get lucroTotalPedido(): number {
    return this.roundToTwo(this.totalPedido - this.custoTotalPedido);
  }

  salvarPedido(): void {
    if (!this.clienteSelecionado || this.itensNovoPedido.length === 0) return;

    this.salvando = true;
    const dto: CriarPedido = {
      clienteId: this.clienteSelecionado.id,
      itens: this.itensNovoPedido.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, valorUnitario: i.valorUnitario }))
    };
    const requisicao = this.data.modo === 'editar' && this.data.pedidoId
      ? this.pedidoService.atualizar(this.data.pedidoId, dto)
      : this.pedidoService.criar(dto);

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.snackBar.open(this.data.modo === 'editar' ? 'Pedido atualizado!' : 'Pedido criado!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.salvando = false;
        this.errorPresenter.handle(e, {
          context: this.data.modo === 'editar' ? 'Pedidos.Editar' : 'Pedidos.Criar',
          source: 'supabase',
          code: this.data.modo === 'editar' ? 'ORDER_UPDATE_FAILED' : 'ORDER_CREATE_FAILED',
          title: this.data.modo === 'editar' ? 'Falha ao atualizar pedido' : 'Falha ao criar pedido',
          fallbackMessage: 'Erro ao salvar pedido.',
          duration: 5000
        });
      }
    });
  }

  excluirPedidoAtual(): void {
    if (!this.data.pedidoId) {
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
      return;
    }

    this.salvando = true;
    this.pedidoService.excluir(this.data.pedidoId).subscribe({
      next: () => {
        this.salvando = false;
        this.snackBar.open('Pedido excluído!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.salvando = false;
        this.errorPresenter.handle(e, {
          context: 'Pedidos.ExcluirNoDialogo',
          source: 'supabase',
          code: 'ORDER_DELETE_FAILED',
          title: 'Falha ao excluir pedido',
          fallbackMessage: 'Erro ao excluir pedido.',
          duration: 5000
        });
      }
    });
  }

  fechar(): void {
    this.dialogRef.close();
  }

  private calcularMargemPorValorUnitario(valorUnitario: number | null): number | null {
    const custo = this.precoCusto;
    if (valorUnitario === null || custo === null || custo === 0) {
      return null;
    }

    return this.roundToTwo(((valorUnitario - custo) / custo) * 100);
  }

  private calcularValorUnitarioPorMargem(margemLucro: number | null): number | null {
    const custo = this.precoCusto;
    if (margemLucro === null || custo === null) {
      return null;
    }

    return this.roundToTwo(custo * (1 + margemLucro / 100));
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numero = Number(value);
    return Number.isFinite(numero) ? numero : null;
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}