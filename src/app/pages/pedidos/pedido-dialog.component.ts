import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, filter, firstValueFrom, switchMap } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PedidoService } from '../../core/services/pedido.service';
import { ConsultaService } from '../../core/services/consulta.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { FormaPagamentoService } from '../../core/services/forma-pagamento.service';
import { FormasDePagamentoService } from '../../core/services/formas-de-pagamento.service';
import { AutocompleteItem, ProdutoAutocompleteItem } from '../../core/models/consulta.model';
import { AtualizarPedido, CriarPedido, ItemPedido, Pedido } from '../../core/models/pedido.model';
import { FormaPagamento } from '../../core/models/forma-pagamento.model';
import { ErrorPresenterService } from '../../core/errors/error-presenter.service';
import { UserRole } from '../../core/models/user.model';
import { UserManagementService } from '../../core/services/user-management.service';

type PedidoDialogData = {
  modo: 'criar' | 'editar';
  pedidoId?: number;
  userRole?: UserRole | null;
  margemVendaOuro?: number | null;
  margemVendaPrata?: number | null;
  margemVendaBronze?: number | null;
  margemVendaElite?: number | null;
  responsavelId?: string | null;
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
    MatSelectModule,
    MatSlideToggleModule,
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
          <input matInput [formControl]="clienteControl" [matAutocomplete]="autoCliente" placeholder="Buscar cliente..." [readonly]="modoSomenteFinalizacao">
          <mat-icon matPrefix>person</mat-icon>
          <mat-autocomplete #autoCliente="matAutocomplete" [displayWith]="displayFn" (optionSelected)="onClienteSelected($event.option.value)">
            @for (c of clientesFiltrados; track c.id) {
              <mat-option [value]="c">
                <span>{{c.label}}</span>
                @if (c.inadimplente) {
                  <span style="margin-left:8px;color:#b71c1c;font-size:11px;font-weight:700">Inadimplente</span>
                }
              </mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        @if (clienteSelecionado?.inadimplente) {
          <div class="cliente-alerta-inadimplente">
            <mat-icon>warning</mat-icon>
            <span>Cliente marcado como inadimplente.</span>
          </div>
        }

        <mat-form-field appearance="outline">
          <mat-label>Forma de Pagamento</mat-label>
          <mat-select [formControl]="formaPagamentoControl">
            <mat-option [value]="null">-- Nenhuma --</mat-option>
            @for (fp of formasDePagamento; track fp.id) {
              <mat-option [value]="fp.id">{{ fp.descricao }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prazo para Pagamento</mat-label>
          <mat-select [formControl]="prazoPagamentoControl">
            <mat-option [value]="null">-- Nenhum --</mat-option>
            @for (fp of prazosPagamento; track fp.id) {
              <mat-option [value]="fp.id">{{ fp.descricao }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        @if (podeEditarDataFinalizacao) {
          <mat-form-field appearance="outline">
            <mat-label>Data de finalização</mat-label>
            <input matInput type="date" [formControl]="dataFinalizacaoControl">
            <mat-hint>Disponível para gerente e administrador.</mat-hint>
          </mat-form-field>
        }

        <div class="nota-fiscal-row">
          <mat-slide-toggle [formControl]="notaFiscalControl" color="primary">
            Emitir Nota Fiscal
          </mat-slide-toggle>
        </div>

        @if (notaFiscalControl.value) {
          <mat-form-field appearance="outline">
            <mat-label>Margem Nota Fiscal (%)</mat-label>
            <input matInput type="number" inputmode="decimal" [formControl]="margemNotaFiscalControl" min="0" max="100" step="0.01" placeholder="0.00">
            <mat-icon matPrefix>receipt_long</mat-icon>
            <mat-hint>Acréscimo sobre o total para emissão de NF</mat-hint>
          </mat-form-field>
        }

        @if (descontoHabilitado) {
          <mat-form-field appearance="outline">
            <mat-label>Desconto (%)</mat-label>
            <input matInput type="number" inputmode="decimal" [formControl]="descontoControl" min="0" max="100" step="0.01" placeholder="0.00">
            <mat-icon matPrefix>percent</mat-icon>
            <mat-hint>Aplicado sobre o total do pedido</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Observação</mat-label>
          <textarea matInput [formControl]="observacaoControl" rows="3" placeholder="Informações adicionais sobre o pedido..."></textarea>
          <mat-icon matPrefix>notes</mat-icon>
        </mat-form-field>

        @if (!modoSomenteFinalizacao) {
        <div class="add-item-row">
          <mat-form-field appearance="outline" class="field-produto">
            <mat-label>Produto</mat-label>
            <input matInput [formControl]="produtoControl" [matAutocomplete]="autoProduto" placeholder="Buscar produto...">
            <mat-autocomplete #autoProduto="matAutocomplete" [displayWith]="displayFn" (optionSelected)="onProdutoSelected($event.option.value)">
              @for (p of produtosFiltrados; track p.id) {
                <mat-option [value]="p">
                  <span>{{p.label}}</span>
                  @if (p.fornecedorNome) {
                    <span style="font-size:11px;color:#7b4bab;margin-left:8px;font-style:italic;opacity:0.85">{{p.fornecedorNome}}</span>
                  }
                  @if (podeVerCustos) {<small class="option-preco">R$ {{p.precoCusto}}</small>}
                </mat-option>
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
          @if (podeVerCustos) {
            <mat-form-field appearance="outline" class="field-sm">
              <mat-label>Margem %</mat-label>
              <input matInput type="number" inputmode="decimal" [formControl]="margemControl" step="0.01">
            </mat-form-field>
          }
          <button mat-mini-fab color="primary" type="button" class="btn-add-item" (click)="adicionarItem()" [disabled]="!produtoSelecionado || itemForm.invalid" matTooltip="Adicionar item ao pedido">
            <mat-icon>add</mat-icon>
          </button>
        </div>
        }

        @if (!modoSomenteFinalizacao && produtoSelecionado) {
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
            @if (isVendedor && precoCusto !== null) {
              <div class="price-tier-grid">
                <button mat-stroked-button type="button" class="price-tier" (click)="aplicarPrecoSugerido(precoOuro)">
                  <span class="price-tier-label">Preço Ouro</span>
                  <strong>{{precoOuro | currency:'BRL'}}</strong>
                </button>
                <button mat-stroked-button type="button" class="price-tier" (click)="aplicarPrecoSugerido(precoPrata)">
                  <span class="price-tier-label">Preço Prata</span>
                  <strong>{{precoPrata | currency:'BRL'}}</strong>
                </button>
                <button mat-stroked-button type="button" class="price-tier" (click)="aplicarPrecoSugerido(precoBronze)">
                  <span class="price-tier-label">Preço Bronze</span>
                  <strong>{{precoBronze | currency:'BRL'}}</strong>
                </button>
              </div>
            } @else if (podeVerCustos) {
              <div class="info-row">
                <div class="info-item"><span class="info-label">Valor Total:</span><span class="info-value">{{valorTotalItem | currency:'BRL'}}</span></div>
                <div class="info-item"><span class="info-label">Valor Total Custo:</span><span class="info-value">{{valorTotalCustoItem | currency:'BRL'}}</span></div>
                <div class="info-item"><span class="info-label">Valor Total Lucro:</span><span class="info-value" [class.margem-positiva]="valorTotalLucroItem >= 0" [class.margem-negativa]="valorTotalLucroItem < 0">{{valorTotalLucroItem | currency:'BRL'}}</span></div>
              </div>
            }
            @if (podeVerCustos && precoCusto !== null) {
              <div class="info-row">
                <div class="info-item"><span class="info-label">Custo Medio:</span><span class="info-value">{{precoCusto | currency:'BRL'}}</span></div>
                @if (produtoSelecionado && produtoSelecionado.valor) {
                  <div class="info-item"><span class="info-label">Valor de Venda:</span><span class="info-value margem-positiva">{{produtoSelecionado.valor | currency:'BRL'}}</span></div>
                }
                @if (margemLucro !== null) {
                  <div class="info-item"><span class="info-label">Margem:</span>
                    <span class="info-value" [class.margem-positiva]="margemLucro >= 0" [class.margem-negativa]="margemLucro < 0">{{margemLucro | number:'1.1-1'}}%</span>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (!modoSomenteFinalizacao && produtoSelecionado && clienteSelecionado) {
          @if (carregandoUltimaCompra) {
            <div class="ultima-compra-panel carregando">
              <mat-icon class="uc-icon">history</mat-icon>
              <span>Verificando histórico...</span>
            </div>
          } @else if (ultimaCompra) {
            <div class="ultima-compra-panel destaque">
              <mat-icon class="uc-icon">history</mat-icon>
              <div class="uc-content">
                <span class="uc-label">Última compra deste produto</span>
                <span class="uc-data">{{ultimaCompra.data | date:'dd/MM/yyyy'}}</span>
              </div>
              <div class="uc-values">
                <span class="uc-qtd">{{ultimaCompra.quantidade}} un.</span>
                <span class="uc-valor">{{ultimaCompra.valorUnitario | currency:'BRL'}}<small>/un</small></span>
              </div>
            </div>
          } @else {
            <div class="ultima-compra-panel sem-historico">
              <mat-icon class="uc-icon">history_toggle_off</mat-icon>
              <span>Cliente nunca comprou este produto</span>
            </div>
          }
        }

        @if (itensNovoPedido.length > 0) {
          @if (itemEditandoIdx !== null && !modoSomenteFinalizacao) {
            <div class="edit-item-panel">
              <div class="edit-item-label"><mat-icon>edit</mat-icon><span>{{ itensNovoPedido[itemEditandoIdx].produtoLabel }}</span></div>
              <div class="edit-item-fields">
                <mat-form-field appearance="outline" class="field-sm">
                  <mat-label>Qtd</mat-label>
                  <input matInput type="number" inputmode="numeric" [formControl]="editQtdControl" min="1">
                </mat-form-field>
                <mat-form-field appearance="outline" class="field-sm">
                  <mat-label>Vlr Unit.</mat-label>
                  <input matInput type="number" inputmode="decimal" [formControl]="editVlrControl" step="0.01">
                </mat-form-field>
                @if (podeVerCustos) {
                  <mat-form-field appearance="outline" class="field-sm">
                    <mat-label>Margem %</mat-label>
                    <input matInput type="number" inputmode="decimal" [formControl]="editMargemControl" step="0.01">
                  </mat-form-field>
                }
                <button mat-mini-fab color="primary" type="button" (click)="confirmarEdicaoItem()" [disabled]="editForm.invalid" matTooltip="Confirmar edição"><mat-icon>check</mat-icon></button>
                <button mat-mini-fab type="button" (click)="cancelarEdicaoItem()" matTooltip="Cancelar"><mat-icon>close</mat-icon></button>
              </div>
            </div>
          }
          <div class="table-wrapper">
            <table mat-table [dataSource]="itensNovoPedido">
              <ng-container matColumnDef="produto"><th mat-header-cell *matHeaderCellDef>Produto</th><td mat-cell *matCellDef="let r">{{r.produtoLabel}}</td></ng-container>
              <ng-container matColumnDef="fornecedor"><th mat-header-cell *matHeaderCellDef>Fornecedor</th><td mat-cell *matCellDef="let r"><span style="font-size:11px;color:#7b4bab;font-style:italic;">{{r.fornecedorNome || '-'}}</span></td></ng-container>
              <ng-container matColumnDef="quantidade"><th mat-header-cell *matHeaderCellDef>Qtd</th><td mat-cell *matCellDef="let r">{{r.quantidade}}</td></ng-container>
              <ng-container matColumnDef="valorUnitario"><th mat-header-cell *matHeaderCellDef>Unit.</th><td mat-cell *matCellDef="let r">{{r.valorUnitario | currency:'BRL'}}</td></ng-container>
              @if (podeVerCustos) {
                <ng-container matColumnDef="custoTotal"><th mat-header-cell *matHeaderCellDef>Custo</th><td mat-cell *matCellDef="let r">{{r.custoTotal | currency:'BRL'}}</td></ng-container>
                <ng-container matColumnDef="lucroTotal"><th mat-header-cell *matHeaderCellDef>Lucro</th><td mat-cell *matCellDef="let r"><span [class.margem-positiva]="r.lucroTotal >= 0" [class.margem-negativa]="r.lucroTotal < 0">{{r.lucroTotal | currency:'BRL'}}</span></td></ng-container>
                <ng-container matColumnDef="margemLucro"><th mat-header-cell *matHeaderCellDef>Margem</th><td mat-cell *matCellDef="let r">{{r.margemLucro === null ? '-' : ((r.margemLucro | number:'1.1-1') + '%')}}</td></ng-container>
                <ng-container matColumnDef="valorTotal"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let r">{{r.valorTotal | currency:'BRL'}}</td></ng-container>
              }
              <ng-container matColumnDef="remover"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let r; let i = index">@if (!modoSomenteFinalizacao) {
                <button mat-icon-button color="primary" (click)="iniciarEdicaoItem(i)" [disabled]="itemEditandoIdx !== null" matTooltip="Editar item"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button color="warn" (click)="removerItem(i)" [disabled]="itemEditandoIdx !== null" matTooltip="Remover item do pedido"><mat-icon>delete</mat-icon></button>
              }</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="itensColumns"></tr>
              <tr mat-row *matRowDef="let r; columns: itensColumns;"></tr>
            </table>
          </div>
          @if (podeVerCustos) {
            <div class="total-row">
              @if (descontoHabilitado && descontoValor > 0) {
                <strong>Subtotal: {{totalBruto | currency:'BRL'}}</strong>
                <strong class="margem-negativa">Desconto ({{descontoControl.value}}%): - {{descontoValor | currency:'BRL'}}</strong>
              }
              <strong>Total: {{totalPedido | currency:'BRL'}}</strong>
              @if (notaFiscalControl.value && margemNotaFiscalControl.value && margemNotaFiscalControl.value > 0) {
                <strong style="color:#1565C0">Margem NF ({{margemNotaFiscalControl.value}}%): + {{(totalComNF - totalPedido) | currency:'BRL'}}</strong>
                <strong style="color:#1565C0">Total c/ NF: {{totalComNF | currency:'BRL'}}</strong>
              }
              <strong>Custo total: {{custoTotalPedido | currency:'BRL'}}</strong>
              <strong [class.margem-positiva]="lucroTotalPedido >= 0" [class.margem-negativa]="lucroTotalPedido < 0">Lucro total: {{lucroTotalPedido | currency:'BRL'}}</strong>
            </div>
          }
          @if (isVendedor && descontoHabilitado && descontoValor > 0) {
            <div class="total-row">
              <strong class="margem-negativa">Desconto ({{descontoControl.value}}%): - {{descontoValor | currency:'BRL'}}</strong>
              <strong>Total: {{totalPedido | currency:'BRL'}}</strong>
              @if (notaFiscalControl.value && margemNotaFiscalControl.value && margemNotaFiscalControl.value > 0) {
                <strong style="color:#1565C0">Total c/ NF: {{totalComNF | currency:'BRL'}}</strong>
              }
            </div>
          }
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      @if (data.modo === 'editar') {
        <button mat-stroked-button color="warn" type="button" (click)="excluirPedidoAtual()" [disabled]="salvando || modoSomenteFinalizacao" matTooltip="Excluir este pedido">
          Excluir pedido
        </button>
      }
      <button mat-button type="button" (click)="fechar()" [disabled]="salvando" matTooltip="Fechar sem salvar">Cancelar</button>
      <button mat-raised-button color="primary" type="button" (click)="salvarPedido()" [disabled]="salvarDesabilitado" matTooltip="Salvar alterações do pedido">
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
    .price-tier-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .price-tier { min-height: 72px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 4px; text-align: left; border-radius: 12px; }
    .price-tier-label { font-size: 12px; color: #6b5b7b; text-transform: uppercase; letter-spacing: 0.04em; }
    .info-row { display: flex; gap: 24px; flex-wrap: wrap; }
    .info-item { display: flex; gap: 6px; align-items: center; }
    .info-label { font-size: 13px; color: #6b5b7b; font-weight: 500; }
    .info-value { font-size: 14px; font-weight: 600; }
    .comprometido { color: #e65100; }
    .estoque-baixo { color: #c62828 !important; }
    .margem-positiva { color: #2e7d32; }
    .margem-negativa { color: #c62828; }
    .ultima-compra-panel { display: flex; align-items: center; gap: 12px; border-radius: 12px; padding: 10px 14px; margin-bottom: 4px; font-size: 13px; }
    .ultima-compra-panel.destaque { background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-left: 3px solid #1565c0; }
    .ultima-compra-panel.sem-historico { background: #f5f5f5; border-left: 3px solid #bbb; color: #888; }
    .ultima-compra-panel.carregando { background: #f5f0fa; border-left: 3px solid #c9a84c; color: #6b5b7b; }
    .uc-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; color: #1565c0; }
    .sem-historico .uc-icon, .carregando .uc-icon { color: #999; }
    .uc-content { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .uc-label { font-weight: 600; color: #1565c0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .uc-data { font-weight: 700; font-size: 14px; color: #1f2430; }
    .uc-values { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .uc-qtd { font-size: 12px; color: #555; }
    .uc-valor { font-weight: 700; font-size: 15px; color: #1565c0; }
    .uc-valor small { font-size: 11px; font-weight: 400; color: #555; }
    .edit-item-panel { background: #e8f4e8; border-radius: 10px; padding: 12px 14px; border-left: 3px solid #2e7d32; display: flex; flex-direction: column; gap: 10px; margin-bottom: 4px; }
    .edit-item-label { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: #1b5e20; }
    .edit-item-label mat-icon { font-size: 18px; width: 18px; height: 18px; color: #2e7d32; }
    .edit-item-fields { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
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
      .price-tier-grid { grid-template-columns: 1fr; }
      .dialog-actions { flex-direction: column; }
      .dialog-actions button { width: 100%; }
      .total-row { justify-content: flex-start; padding-left: 0; padding-right: 0; }
    }
    .nota-fiscal-row {
      display: flex;
      align-items: center;
      padding: 8px 4px 16px;
    }
    .cliente-alerta-inadimplente {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      border-left: 4px solid #b71c1c;
      background: #ffebee;
      color: #8e0000;
      font-size: 13px;
      font-weight: 600;
    }
  `]
})
export class PedidoDialogComponent implements OnInit {
  perfilUsuarioCarregado = false;
  clienteControl = new FormControl('');
  clientesFiltrados: AutocompleteItem[] = [];
  clienteSelecionado: AutocompleteItem | null = null;

  formaPagamentoControl = new FormControl<number | null>(null);
  formasDePagamento: FormaPagamento[] = [];

  prazoPagamentoControl = new FormControl<number | null>(null);
  prazosPagamento: FormaPagamento[] = [];

  notaFiscalControl = new FormControl<boolean>(false);
  margemNotaFiscalControl = new FormControl<number | null>(null);
  descontoControl = new FormControl<number | null>(null);
  observacaoControl = new FormControl<string>('');

  produtoControl = new FormControl('');
  produtosFiltrados: ProdutoAutocompleteItem[] = [];
  produtoSelecionado: ProdutoAutocompleteItem | null = null;

  estoqueInfo: { estoqueAtual: number; comprometido: number; estoqueFuturo: number } | null = null;
  ultimaCompra: { data: string; valorUnitario: number; quantidade: number } | null = null;
  carregandoUltimaCompra = false;

  itemForm: FormGroup;
  get qtdControl(): FormControl { return this.itemForm.get('quantidade') as FormControl; }
  get vlrControl(): FormControl { return this.itemForm.get('valorUnitario') as FormControl; }
  get margemControl(): FormControl { return this.itemForm.get('margemLucro') as FormControl; }

  get editQtdControl(): FormControl { return this.editForm.get('quantidade') as FormControl; }
  get editVlrControl(): FormControl { return this.editForm.get('valorUnitario') as FormControl; }
  get editMargemControl(): FormControl { return this.editForm.get('margemLucro') as FormControl; }

  itensNovoPedido: { produtoId: number; produtoLabel: string; fornecedorNome?: string | null; quantidade: number; valorUnitario: number; custoUnitario: number; custoTotal: number; margemLucro: number | null; lucroTotal: number; valorTotal: number }[] = [];
  itemEditandoIdx: number | null = null;
  editForm!: FormGroup;
  private atualizandoCamposPrecoEdit = false;
  salvando = false;
  dataFinalizacaoControl = new FormControl('');
  pedidoAtual: Pedido | null = null;
  podeEditarDataFinalizacao = false;
  modoSomenteFinalizacao = false;
  private atualizandoCamposPreco = false;

  get salvarDesabilitado(): boolean {
    if (this.salvando) {
      return true;
    }

    if (this.modoSomenteFinalizacao) {
      return !this.podeEditarDataFinalizacao;
    }

    return !this.clienteSelecionado || this.itensNovoPedido.length === 0;
  }

  get isVendedor(): boolean {
    return this.data.userRole === 'vendedor';
  }

  get podeVerCustos(): boolean {
    return this.perfilUsuarioCarregado && !this.isVendedor;
  }

  get descontoHabilitado(): boolean {
    const fpId = this.formaPagamentoControl.value;
    const prazoId = this.prazoPagamentoControl.value;
    if (!fpId || !prazoId) return false;
    const fp = this.formasDePagamento.find(f => f.id === fpId);
    const prazo = this.prazosPagamento.find(p => p.id === prazoId);
    const fpLabel = fp?.descricao?.trim().toLowerCase() ?? '';
    const prazoLabel = prazo?.descricao?.trim() ?? '';
    return fpLabel === 'à vista' && ['7', '7/14/21'].includes(prazoLabel);
  }

  get itensColumns(): string[] {
    if (this.isVendedor) {
      return ['produto', 'fornecedor', 'quantidade', 'valorUnitario', 'remover'];
    }

    if (!this.podeVerCustos) {
      return ['produto', 'fornecedor', 'quantidade', 'valorUnitario', 'remover'];
    }

    return ['produto', 'fornecedor', 'quantidade', 'valorUnitario', 'custoTotal', 'lucroTotal', 'margemLucro', 'valorTotal', 'remover'];
  }

  constructor(
    private pedidoService: PedidoService,
    private consultaService: ConsultaService,
    private estoqueService: EstoqueService,
    private formaPagamentoService: FormaPagamentoService,
    private formasDePagamentoService: FormasDePagamentoService,
    private userManagementService: UserManagementService,
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
    this.editForm = this.fb.group({
      quantidade: [1, [Validators.required, Validators.min(1)]],
      valorUnitario: [null, [Validators.required, Validators.min(0.01)]],
      margemLucro: [null]
    });

    this.perfilUsuarioCarregado = this.data.userRole !== null && this.data.userRole !== undefined;
    this.definirEstadoControlesContextoUsuario(this.perfilUsuarioCarregado);
  }

  ngOnInit(): void {
    void this.garantirContextoUsuario();

    this.formaPagamentoService.listar(true).subscribe({
      next: fps => this.prazosPagamento = fps,
      error: () => {}
    });

    this.formasDePagamentoService.listar(true).subscribe({
      next: fps => this.formasDePagamento = fps,
      error: () => {}
    });

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

    this.editVlrControl.valueChanges.subscribe(valor => {
      if (this.atualizandoCamposPrecoEdit || this.itemEditandoIdx === null) return;
      const custo = this.itensNovoPedido[this.itemEditandoIdx]?.custoUnitario ?? 0;
      if (!custo) return;
      const margem = this.roundToTwo((((this.toNumber(valor) ?? 0) - custo) / custo) * 100);
      this.atualizandoCamposPrecoEdit = true;
      this.editMargemControl.setValue(margem, { emitEvent: false });
      this.atualizandoCamposPrecoEdit = false;
    });

    this.editMargemControl.valueChanges.subscribe(valor => {
      if (this.atualizandoCamposPrecoEdit || this.itemEditandoIdx === null) return;
      const custo = this.itensNovoPedido[this.itemEditandoIdx]?.custoUnitario ?? 0;
      if (!custo) return;
      const vlr = this.roundToTwo(custo * (1 + (this.toNumber(valor) ?? 0) / 100));
      this.atualizandoCamposPrecoEdit = true;
      this.editVlrControl.setValue(vlr, { emitEvent: false });
      this.atualizandoCamposPrecoEdit = false;
    });

    this.clienteControl.valueChanges.pipe(
      debounceTime(300),
      filter(v => typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarClientes(v as string, this.data.responsavelId))
    ).subscribe(c => this.clientesFiltrados = c);

    this.clienteControl.valueChanges.pipe(
      filter(v => typeof v === 'string')
    ).subscribe(() => {
      this.clienteSelecionado = null;
    });

    // Desabilitar desconto se forma/prazo mudar para condicão não permitida
    this.formaPagamentoControl.valueChanges.subscribe(() => {
      if (!this.descontoHabilitado) this.descontoControl.setValue(null, { emitEvent: false });
    });
    this.prazoPagamentoControl.valueChanges.subscribe(() => {
      if (!this.descontoHabilitado) this.descontoControl.setValue(null, { emitEvent: false });
    });

    this.produtoControl.valueChanges.pipe(
      debounceTime(300),
      filter(v => this.perfilUsuarioCarregado && typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarProdutosComPreco(v as string, this.isVendedor))
    ).subscribe(p => this.produtosFiltrados = p);

    if (this.data.modo === 'editar' && this.data.pedidoId) {
      this.pedidoService.buscarPorId(this.data.pedidoId).subscribe(pedido => {
        this.pedidoAtual = pedido;
        this.podeEditarDataFinalizacao = this.usuarioPodeEditarDataFinalizacao();
        this.modoSomenteFinalizacao = false;
        this.clienteSelecionado = { id: pedido.clienteId, label: pedido.clienteNome || '' };
        this.clienteControl.setValue(this.clienteSelecionado as never, { emitEvent: false });
        this.dataFinalizacaoControl.setValue(this.formatarDataInput(pedido.dataFinalizacao), { emitEvent: false });
        this.formaPagamentoControl.setValue(pedido.formaPagamentoId ?? null, { emitEvent: false });
        this.prazoPagamentoControl.setValue(pedido.prazoPagamentoId ?? null, { emitEvent: false });
        this.notaFiscalControl.setValue(pedido.notaFiscal ?? false, { emitEvent: false });
        this.margemNotaFiscalControl.setValue(pedido.margemNotaFiscal ?? null, { emitEvent: false });
        this.descontoControl.setValue(pedido.percentualDesconto ?? null, { emitEvent: false });
        this.observacaoControl.setValue(pedido.observacao ?? '', { emitEvent: false });
        this.itensNovoPedido = (pedido.itens || []).map(i => ({
          produtoId: i.produtoId,
          produtoLabel: `${i.produtoCodigo} - ${i.produtoDescricao}`,
          fornecedorNome: i.fornecedorNome ?? null,
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

  private usuarioPodeEditarDataFinalizacao(): boolean {
    return this.data.userRole === 'administrador' || this.data.userRole === 'gerente';
  }

  private async garantirContextoUsuario(): Promise<void> {
    if (this.perfilUsuarioCarregado) {
      return;
    }

    try {
      const usuarioAtual = await this.userManagementService.obterUsuarioAtualComRole();
      if (usuarioAtual) {
        this.data.userRole = usuarioAtual.role;
        this.data.margemVendaElite ??= usuarioAtual.margemVendaElite;
        this.data.margemVendaOuro ??= usuarioAtual.margemVendaOuro;
        this.data.margemVendaPrata ??= usuarioAtual.margemVendaPrata;
        this.data.margemVendaBronze ??= usuarioAtual.margemVendaBronze;
        this.data.responsavelId ??= usuarioAtual.role === 'vendedor' ? usuarioAtual.id : null;
      }
    } finally {
      this.perfilUsuarioCarregado = this.data.userRole !== null && this.data.userRole !== undefined;
      this.definirEstadoControlesContextoUsuario(this.perfilUsuarioCarregado);
    }
  }

  private definirEstadoControlesContextoUsuario(habilitado: boolean): void {
    const method = habilitado ? 'enable' : 'disable';
    this.clienteControl[method]({ emitEvent: false });
    this.produtoControl[method]({ emitEvent: false });
    this.itemForm[method]({ emitEvent: false });
  }

  displayFn(item: AutocompleteItem): string { return item?.label || ''; }

  onClienteSelected(item: AutocompleteItem): void {
    this.clienteSelecionado = item;
    this.ultimaCompra = null;
    if (this.produtoSelecionado) this.buscarUltimaCompra();
  }

  onProdutoSelected(item: ProdutoAutocompleteItem): void {
    this.produtoSelecionado = item;
    this.ultimaCompra = null;
    if (this.clienteSelecionado) this.buscarUltimaCompra();
    this.estoqueInfo = { estoqueAtual: item.quantidadeEstoque ?? 0, comprometido: 0, estoqueFuturo: item.quantidadeEstoque ?? 0 };
    this.estoqueService.estoqueProduto(item.id).subscribe({
      next: info => this.estoqueInfo = info,
      error: () => {
        this.estoqueInfo = { estoqueAtual: item.quantidadeEstoque ?? 0, comprometido: 0, estoqueFuturo: item.quantidadeEstoque ?? 0 };
      }
    });

    if (this.isVendedor) {
      this.atualizandoCamposPreco = true;
      this.vlrControl.setValue(this.precoOuro, { emitEvent: false });
      this.margemControl.setValue(null, { emitEvent: false });
      this.atualizandoCamposPreco = false;
      return;
    }

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

  private buscarUltimaCompra(): void {
    if (!this.clienteSelecionado || !this.produtoSelecionado) return;
    this.carregandoUltimaCompra = true;
    this.consultaService.buscarUltimaCompra(this.clienteSelecionado.id, this.produtoSelecionado.id).subscribe({
      next: r => { this.ultimaCompra = r; this.carregandoUltimaCompra = false; },
      error: () => { this.ultimaCompra = null; this.carregandoUltimaCompra = false; }
    });
  }

  get precoCusto(): number | null { return this.produtoSelecionado?.precoCusto ?? null; }

  get precoOuro(): number {
    return this.calcularPrecoPorMarkup(this.data.margemVendaOuro ?? 35);
  }

  get precoPrata(): number {
    return this.calcularPrecoPorMarkup(this.data.margemVendaPrata ?? 50);
  }

  get precoBronze(): number {
    return this.calcularPrecoPorMarkup(this.data.margemVendaBronze ?? 100);
  }

  get precoElite(): number {
    return this.calcularPrecoPorMarkup(this.data.margemVendaElite ?? 20);
  }

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

    if (this.isVendedor && unit < this.precoOuro) {
      this.snackBar.open('Vendedores não podem criar pedidos com valor unitário abaixo do Preço Ouro.', 'OK', { duration: 4000 });
      return;
    }

    const valorTotal = qty * unit;
    const custoTotal = qty * custoUnitario;
    this.itensNovoPedido = [...this.itensNovoPedido, {
      produtoId: this.produtoSelecionado.id,
      produtoLabel: this.produtoSelecionado.label,
      fornecedorNome: this.produtoSelecionado.fornecedorNome ?? null,
      quantidade: qty,
      valorUnitario: unit,
      custoUnitario,
      custoTotal,
      margemLucro: this.isVendedor ? null : this.margemLucro,
      lucroTotal: this.roundToTwo(valorTotal - custoTotal),
      valorTotal
    }];
    this.produtoSelecionado = null;
    this.estoqueInfo = null;
    this.produtoControl.setValue('', { emitEvent: false });
    this.itemForm.patchValue({ quantidade: 1, valorUnitario: null, margemLucro: null });
  }

  aplicarPrecoSugerido(valor: number): void {
    this.vlrControl.setValue(valor);
  }

  removerItem(i: number): void {
    this.itensNovoPedido = this.itensNovoPedido.filter((_, idx) => idx !== i);
  }

  iniciarEdicaoItem(idx: number): void {
    this.itemEditandoIdx = idx;
    const item = this.itensNovoPedido[idx];
    this.atualizandoCamposPrecoEdit = true;
    this.editForm.setValue({
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      margemLucro: item.margemLucro
    }, { emitEvent: false });
    this.atualizandoCamposPrecoEdit = false;
  }

  cancelarEdicaoItem(): void {
    this.itemEditandoIdx = null;
    this.editForm.reset({ quantidade: 1, valorUnitario: null, margemLucro: null }, { emitEvent: false });
  }

  confirmarEdicaoItem(): void {
    if (this.editForm.invalid || this.itemEditandoIdx === null) return;
    const idx = this.itemEditandoIdx;
    const item = this.itensNovoPedido[idx];
    const qtd = this.toNumber(this.editQtdControl.value) ?? 1;
    const vlr = this.toNumber(this.editVlrControl.value) ?? 0;
    const custo = item.custoUnitario;
    const valorTotal = this.roundToTwo(qtd * vlr);
    const custoTotal = this.roundToTwo(qtd * custo);
    const margemLucro = custo > 0 ? this.roundToTwo(((vlr - custo) / custo) * 100) : null;
    const lucroTotal = this.roundToTwo(valorTotal - custoTotal);
    this.itensNovoPedido = this.itensNovoPedido.map((it, i) =>
      i === idx ? { ...it, quantidade: qtd, valorUnitario: vlr, valorTotal, custoTotal, lucroTotal, margemLucro } : it
    );
    this.cancelarEdicaoItem();
  }

  get totalBruto(): number {
    return this.itensNovoPedido.reduce((s, i) => s + i.valorTotal, 0);
  }

  get descontoValor(): number {
    if (!this.descontoHabilitado) return 0;
    const pct = this.descontoControl.value;
    if (!pct || pct <= 0) return 0;
    return Math.round(this.totalBruto * pct / 100 * 100) / 100;
  }

  get totalPedido(): number {
    return Math.round((this.totalBruto - this.descontoValor) * 100) / 100;
  }

  get custoTotalPedido(): number {
    return this.itensNovoPedido.reduce((s, i) => s + i.custoTotal, 0);
  }

  get lucroTotalPedido(): number {
    return this.roundToTwo(this.totalPedido - this.custoTotalPedido);
  }

  get totalComNF(): number {
    const margem = this.notaFiscalControl.value ? (this.margemNotaFiscalControl.value ?? 0) : 0;
    if (!margem || margem <= 0) return this.totalPedido;
    return Math.round(this.totalPedido * (1 + margem / 100) * 100) / 100;
  }

  salvarPedido(): void {
    if (this.modoSomenteFinalizacao) {
      this.salvarDataFinalizacao();
      return;
    }

    if (!this.clienteSelecionado || this.itensNovoPedido.length === 0) return;

    this.salvando = true;
    const dto: AtualizarPedido = {
      clienteId: this.clienteSelecionado.id,
      formaPagamentoId: this.formaPagamentoControl.value ?? null,
      prazoPagamentoId: this.prazoPagamentoControl.value ?? null,
      notaFiscal: this.notaFiscalControl.value ?? false,
      margemNotaFiscal: this.notaFiscalControl.value ? (this.margemNotaFiscalControl.value ?? null) : null,
      percentualDesconto: this.descontoHabilitado ? (this.descontoControl.value ?? null) : null,
      observacao: this.observacaoControl.value?.trim() || null,
      ...(this.podeEditarDataFinalizacao ? { dataFinalizacao: this.dataFinalizacaoControl.value || null } : {}),
      itens: this.itensNovoPedido.map(i => ({
        produtoId: i.produtoId,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario,
        custoUnitario: i.custoUnitario
      }))
    };
    const requisicao = this.data.modo === 'editar' && this.data.pedidoId
      ? this.pedidoService.atualizar(this.data.pedidoId, dto)
      : this.pedidoService.criar(dto as CriarPedido);

    requisicao.subscribe({
      next: async () => {
        this.salvando = false;
        if (this.data.modo === 'editar' && this.pedidoAtual) {
          const status = this.pedidoAtual.status;
          if (status === 'CONFIRMADO' || status === 'FINALIZADO') {
            try {
              await this.ajustarEstoqueEdicao(this.pedidoAtual.itens || [], this.itensNovoPedido, this.pedidoAtual.numero);
            } catch {
              this.snackBar.open('Pedido salvo, mas houve erro ao ajustar o estoque.', 'OK', { duration: 5000 });
              this.dialogRef.close(true);
              return;
            }
          }
        }
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

  private salvarDataFinalizacao(): void {
    if (!this.data.pedidoId) {
      return;
    }

    this.salvando = true;

    const dto: AtualizarPedido = {
      dataFinalizacao: this.dataFinalizacaoControl.value || null
    };

    this.pedidoService.atualizar(this.data.pedidoId, dto).subscribe({
      next: () => {
        this.salvando = false;
        this.snackBar.open('Data de finalização atualizada!', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.salvando = false;
        this.errorPresenter.handle(e, {
          context: 'Pedidos.EditarDataFinalizacao',
          source: 'supabase',
          code: 'ORDER_FINISH_DATE_UPDATE_FAILED',
          title: 'Falha ao atualizar data de finalização',
          fallbackMessage: 'Erro ao atualizar data de finalização.',
          duration: 5000
        });
      }
    });
  }

  private formatarDataInput(data?: string): string {
    return data ? data.slice(0, 10) : '';
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

  private calcularPrecoPorMarkup(percentual: number): number {
    const custo = this.produtoSelecionado?.precoCustoVendedor ?? this.precoCusto ?? 0;
    return this.roundToTwo(custo * (1 + percentual / 100));
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numero = Number(value);
    return Number.isFinite(numero) ? numero : null;
  }

  private async ajustarEstoqueEdicao(
    itensAntigos: ItemPedido[],
    itensNovos: { produtoId: number; quantidade: number }[],
    numeroPedido?: string
  ): Promise<void> {
    const obs = `Pedido ${numeroPedido || ''} - Edição`;
    const mapaAntigo = new Map<number, number>();
    for (const item of itensAntigos) {
      mapaAntigo.set(item.produtoId, (mapaAntigo.get(item.produtoId) ?? 0) + item.quantidade);
    }
    const mapaFutura = new Map<number, number>();
    for (const item of itensNovos) {
      mapaFutura.set(item.produtoId, (mapaFutura.get(item.produtoId) ?? 0) + item.quantidade);
    }
    const todosProdutos = new Set([...mapaAntigo.keys(), ...mapaFutura.keys()]);
    for (const produtoId of todosProdutos) {
      const qtdAntiga = mapaAntigo.get(produtoId) ?? 0;
      const qtdNova = mapaFutura.get(produtoId) ?? 0;
      const diff = qtdNova - qtdAntiga;
      if (diff > 0) {
        await firstValueFrom(this.estoqueService.saida(produtoId, diff, obs));
      } else if (diff < 0) {
        await firstValueFrom(this.estoqueService.entrada(produtoId, -diff, null, obs));
      }
    }
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}