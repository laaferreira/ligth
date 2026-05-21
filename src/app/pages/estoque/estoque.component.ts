import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EstoqueService } from '../../core/services/estoque.service';
import { AuthService } from '../../core/services/auth.service';
import { Produto } from '../../core/models/produto.model';
import { Movimentacao } from '../../core/models/pedido.model';
import { EstoqueMovimentoDialogComponent } from './estoque-movimento-dialog.component';

@Component({
  selector: 'app-estoque',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatTableModule, MatMenuModule, MatTabsModule, MatSnackBarModule, MatPaginatorModule
  ],
  templateUrl: './estoque.component.html',
  styleUrl: './estoque.component.scss'
})
export class EstoqueComponent implements OnInit {
  produtosBaixo: Produto[] = [];
  movimentacoes: Movimentacao[] = [];
  colsBaixo = ['codigo', 'descricao', 'quantidadeEstoque', 'estoqueMinimo'];
  colsMov = ['data', 'produto', 'tipo', 'quantidade', 'anterior', 'atual', 'obs'];
  paginaBaixoAtual = 0;
  itensPorPaginaBaixo = 10;
  paginaHistoricoAtual = 0;
  itensPorPaginaHistorico = 10;
  readonly opcoesItensPorPagina = [10, 25, 50];

  constructor(
    private estoqueService: EstoqueService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.estoqueService.estoqueBaixo().subscribe({
      next: d => {
        this.produtosBaixo = d;
        this.paginaBaixoAtual = 0;
      },
      error: () => {
        this.produtosBaixo = [];
        this.paginaBaixoAtual = 0;
        this.snackBar.open('Não foi possível carregar os produtos com estoque baixo.', 'OK', { duration: 4000 });
      }
    });
    this.estoqueService.historico().subscribe({
      next: d => {
        this.movimentacoes = d;
        this.paginaHistoricoAtual = 0;
      },
      error: () => {
        this.movimentacoes = [];
        this.paginaHistoricoAtual = 0;
        this.snackBar.open('Não foi possível carregar o histórico de estoque.', 'OK', { duration: 4000 });
      }
    });
  }

  abrirMovimentacao(): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    this.dialog.open(EstoqueMovimentoDialogComponent, {
      width: isMobile ? '100vw' : '760px',
      height: isMobile ? '100dvh' : undefined,
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      autoFocus: false,
      disableClose: true
    }).afterClosed().subscribe(recarregar => {
      if (recarregar) {
        this.carregar();
      }
    });
  }

  get produtosBaixoPaginados(): Produto[] {
    const inicio = this.paginaBaixoAtual * this.itensPorPaginaBaixo;
    return this.produtosBaixo.slice(inicio, inicio + this.itensPorPaginaBaixo);
  }

  get movimentacoesPaginadas(): Movimentacao[] {
    const inicio = this.paginaHistoricoAtual * this.itensPorPaginaHistorico;
    return this.movimentacoes.slice(inicio, inicio + this.itensPorPaginaHistorico);
  }

  aoMudarPaginaBaixo(event: PageEvent): void {
    this.paginaBaixoAtual = event.pageIndex;
    this.itensPorPaginaBaixo = event.pageSize;
  }

  aoMudarPaginaHistorico(event: PageEvent): void {
    this.paginaHistoricoAtual = event.pageIndex;
    this.itensPorPaginaHistorico = event.pageSize;
  }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
