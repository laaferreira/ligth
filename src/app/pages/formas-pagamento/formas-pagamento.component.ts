import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { FormaPagamentoService } from '../../core/services/forma-pagamento.service';
import { FormaPagamento } from '../../core/models/forma-pagamento.model';

@Component({
  selector: 'app-formas-pagamento',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatPaginatorModule, MatSnackBarModule, MatTooltipModule, MatChipsModule
  ],
  template: `
    <div class="page-wrapper">
      <main class="main-content">
        <section class="page-hero">
          <div>
            <p class="hero-kicker">Configurações financeiras</p>
            <h1>Prazos para Pagamento</h1>
            <p class="hero-text">Gerencie os prazos para pagamento disponíveis para associar aos pedidos.</p>
          </div>
          <div class="hero-highlights">
            <div class="hero-highlight">
              <span class="highlight-label">Total</span>
              <strong>{{ formas.length }} prazo(s)</strong>
            </div>
            <div class="hero-highlight destaque">
              <span class="highlight-label">Ativas</span>
              <strong>{{ formasAtivasCount }} ativo(s)</strong>
            </div>
          </div>
        </section>

        <mat-card class="filtros-card">
          <mat-card-content>
            <div class="section-heading">
              <p class="section-kicker">Operação</p>
              <h2>Novo prazo para pagamento</h2>
            </div>

            <form class="nova-forma-row" (ngSubmit)="criar()">
              <mat-form-field appearance="outline" class="descricao-field">
                <mat-label>Descrição</mat-label>
                <input matInput [formControl]="novaDescricaoControl" placeholder="Ex: Cartão de Crédito, PIX, Boleto..." maxlength="100">
                <mat-hint>Máx. 100 caracteres. A descrição não pode ser editada após a criação.</mat-hint>
                <mat-error *ngIf="novaDescricaoControl.hasError('required')">Descrição é obrigatória</mat-error>
                <mat-error *ngIf="novaDescricaoControl.hasError('maxlength')">Máximo 100 caracteres</mat-error>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="novaDescricaoControl.invalid || salvando">
                <mat-icon>add</mat-icon> Adicionar
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        @if (formas.length === 0 && !carregando) {
          <mat-card class="estado estado-vazio">
            <mat-card-content>
              <mat-icon>payment</mat-icon>
              <div>
                <strong>Nenhum prazo para pagamento cadastrado</strong>
                <p>Adicione um prazo para pagamento para que ele fique disponível na criação de pedidos.</p>
              </div>
            </mat-card-content>
          </mat-card>
        } @else if (formas.length > 0) {
          <mat-card class="resultado-card">
            <mat-card-content>
              <div class="resultado-header">
                <div>
                  <p class="section-kicker">Resultado</p>
                  <h2>Prazos para pagamento cadastrados</h2>
                  <p class="resultado-subtitle">A descrição é imutável após a criação. Para remover, use a exclusão lógica.</p>
                </div>
                <div class="resultado-chip">
                  <span>{{ formas.length }}</span>
                  <small>registro(s)</small>
                </div>
              </div>

              <div class="table-wrapper desktop-table">
                <table mat-table [dataSource]="formasPaginadas">
                  <ng-container matColumnDef="descricao">
                    <th mat-header-cell *matHeaderCellDef>Descrição</th>
                    <td mat-cell *matCellDef="let r">{{ r.descricao }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let r">
                      <span [class]="r.ativo ? 'badge-ativo' : 'badge-inativo'">{{ r.ativo ? 'Ativa' : 'Inativa' }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="acoes">
                    <th mat-header-cell *matHeaderCellDef class="acoes-col"></th>
                    <td mat-cell *matCellDef="let r" class="acoes-col">
                      @if (r.ativo) {
                        <button mat-icon-button color="warn" (click)="desativar(r)"
                          matTooltip="Desativar prazo para pagamento">
                          <mat-icon>block</mat-icon>
                        </button>
                      } @else {
                        <button mat-icon-button color="primary" (click)="reativar(r)"
                          matTooltip="Reativar prazo para pagamento">
                          <mat-icon>check_circle</mat-icon>
                        </button>
                      }
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let r; columns: displayedColumns;" [class.row-inativa]="!r.ativo"></tr>
                </table>
              </div>

              <mat-paginator
                [length]="formas.length"
                [pageIndex]="paginaAtual"
                [pageSize]="itensPorPagina"
                [pageSizeOptions]="[10, 25, 50]"
                [showFirstLastButtons]="true"
                (page)="aoMudarPagina($event)">
              </mat-paginator>

              <div class="mobile-cards">
                @for (r of formasPaginadas; track r.id) {
                  <mat-card class="mobile-card" [class.row-inativa]="!r.ativo">
                    <div class="mobile-card-header">
                      <div>
                        <div class="mobile-card-title">{{ r.descricao }}</div>
                        <div class="mobile-card-subtitle">
                          <span [class]="r.ativo ? 'badge-ativo' : 'badge-inativo'">{{ r.ativo ? 'Ativa' : 'Inativa' }}</span>
                        </div>
                      </div>
                      <div class="mobile-card-header-side">
                        @if (r.ativo) {
                          <button mat-icon-button color="warn" (click)="desativar(r)" matTooltip="Desativar">
                            <mat-icon>block</mat-icon>
                          </button>
                        } @else {
                          <button mat-icon-button color="primary" (click)="reativar(r)" matTooltip="Reativar">
                            <mat-icon>check_circle</mat-icon>
                          </button>
                        }
                      </div>
                    </div>
                  </mat-card>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }
      </main>
    </div>
  `,
  styles: [`
    @use '../clientes/clientes.component' as base;

    .nova-forma-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .nova-forma-row button { min-height: 56px; }
    .descricao-field { flex: 1; min-width: 260px; }

    .badge-ativo {
      background: #e6f4ea; color: #1e7e34;
      padding: 3px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
    }
    .badge-inativo {
      background: #fce8e6; color: #c62828;
      padding: 3px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
    }
    .row-inativa td, .row-inativa .mobile-card-title { opacity: 0.55; }
    .acoes-col { width: 60px; text-align: right; }
  `],
})
export class FormasPagamentoComponent implements OnInit {
  formas: FormaPagamento[] = [];
  carregando = true;
  salvando = false;
  displayedColumns = ['descricao', 'status', 'acoes'];
  paginaAtual = 0;
  itensPorPagina = 10;

  novaDescricaoControl = new FormControl('', [Validators.required, Validators.maxLength(100)]);

  constructor(
    private formaPagamentoService: FormaPagamentoService,
    private snackBar: MatSnackBar
  ) {}

  get formasAtivasCount(): number {
    return this.formas.filter(f => f.ativo).length;
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.formaPagamentoService.listar().subscribe({
      next: formas => {
        this.formas = formas;
        this.carregando = false;
        this.paginaAtual = 0;
      },
      error: () => {
        this.snackBar.open('Erro ao carregar prazos para pagamento.', 'OK', { duration: 4000 });
        this.carregando = false;
      }
    });
  }

  criar(): void {
    if (this.novaDescricaoControl.invalid || this.salvando) return;

    const descricao = (this.novaDescricaoControl.value ?? '').trim();
    if (!descricao) return;

    this.salvando = true;
    this.formaPagamentoService.criar(descricao).subscribe({
      next: nova => {
        this.formas = [nova, ...this.formas];
        this.novaDescricaoControl.reset();
        this.snackBar.open('Prazo para pagamento criado com sucesso.', 'OK', { duration: 3000 });
        this.salvando = false;
      },
      error: (err) => {
        this.snackBar.open(err?.message || 'Erro ao criar prazo para pagamento.', 'OK', { duration: 4000 });
        this.salvando = false;
      }
    });
  }

  desativar(forma: FormaPagamento): void {
    this.formaPagamentoService.desativar(forma.id).subscribe({
      next: atualizada => {
        this.atualizarNaLista(atualizada);
        this.snackBar.open(`"${atualizada.descricao}" desativada.`, 'OK', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err?.message || 'Erro ao desativar.', 'OK', { duration: 4000 })
    });
  }

  reativar(forma: FormaPagamento): void {
    this.formaPagamentoService.reativar(forma.id).subscribe({
      next: atualizada => {
        this.atualizarNaLista(atualizada);
        this.snackBar.open(`"${atualizada.descricao}" reativada.`, 'OK', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err?.message || 'Erro ao reativar.', 'OK', { duration: 4000 })
    });
  }

  get formasPaginadas(): FormaPagamento[] {
    const inicio = this.paginaAtual * this.itensPorPagina;
    return this.formas.slice(inicio, inicio + this.itensPorPagina);
  }

  aoMudarPagina(event: PageEvent): void {
    this.paginaAtual = event.pageIndex;
    this.itensPorPagina = event.pageSize;
  }

  private atualizarNaLista(atualizada: FormaPagamento): void {
    const idx = this.formas.findIndex(f => f.id === atualizada.id);
    if (idx !== -1) {
      this.formas = [
        ...this.formas.slice(0, idx),
        atualizada,
        ...this.formas.slice(idx + 1)
      ];
    }
  }
}
