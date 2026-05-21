import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProdutoService } from '../../core/services/produto.service';
import { AuthService } from '../../core/services/auth.service';
import { Produto } from '../../core/models/produto.model';
import { ProdutoDialogComponent } from './produto-dialog.component';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatMenuModule,
    MatSnackBarModule
  ],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.scss'
})
export class ProdutosComponent implements OnInit {
  todosProdutos: Produto[] = [];
  produtos: Produto[] = [];
  filtro = '';
  displayedColumns = ['codigo', 'descricao', 'categoria', 'precoCusto', 'quantidadeEstoque', 'ativo', 'acoes'];

  constructor(
    private produtoService: ProdutoService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void { this.carregar(); }
  carregar(): void {
    this.produtoService.listar().subscribe(d => {
      this.todosProdutos = d;
      this.aplicarFiltro();
    });
  }

  aplicarFiltro(): void {
    const termo = this.filtro.toLowerCase().trim();
    if (!termo) {
      this.produtos = this.todosProdutos;
      return;
    }
    this.produtos = this.todosProdutos.filter(p =>
      p.codigo.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo) ||
      (p.categoria && p.categoria.toLowerCase().includes(termo))
    );
  }

  onFiltroChange(valor: string): void {
    this.filtro = valor;
    this.aplicarFiltro();
  }

  limparFiltro(): void {
    this.filtro = '';
    this.aplicarFiltro();
  }
  novo(): void { this.abrirDialogoProduto('criar'); }

  editar(p: Produto): void {
    this.abrirDialogoProduto('editar', p);
  }

  excluir(p: Produto): void {
    if (!confirm(`Excluir "${p.descricao}"?`)) return;
    this.produtoService.excluir(p.id!).subscribe({
      next: () => { this.snackBar.open('Excluido!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao excluir', 'OK', { duration: 4000 })
    });
  }

  estoqueBaixo(p: Produto): boolean { return p.ativo && p.quantidadeEstoque <= p.estoqueMinimo; }

  private abrirDialogoProduto(modo: 'criar' | 'editar', produto?: Produto): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    this.dialog.open(ProdutoDialogComponent, {
      width: isMobile ? '100vw' : '720px',
      height: isMobile ? '100dvh' : undefined,
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      autoFocus: false,
      disableClose: true,
      data: { modo, produto }
    }).afterClosed().subscribe(recarregar => {
      if (recarregar) {
        this.carregar();
      }
    });
  }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
