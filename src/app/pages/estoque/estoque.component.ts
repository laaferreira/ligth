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
    MatTableModule, MatMenuModule, MatTabsModule, MatSnackBarModule
  ],
  templateUrl: './estoque.component.html',
  styleUrl: './estoque.component.scss'
})
export class EstoqueComponent implements OnInit {
  produtosBaixo: Produto[] = [];
  movimentacoes: Movimentacao[] = [];
  colsBaixo = ['codigo', 'descricao', 'quantidadeEstoque', 'estoqueMinimo'];
  colsMov = ['data', 'produto', 'tipo', 'quantidade', 'anterior', 'atual', 'obs'];

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
    this.estoqueService.estoqueBaixo().subscribe(d => this.produtosBaixo = d);
    this.estoqueService.historico().subscribe(d => this.movimentacoes = d);
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

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
