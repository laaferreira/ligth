import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ProdutoService } from '../../core/services/produto.service';
import { AuthService } from '../../core/services/auth.service';
import { Produto } from '../../core/models/produto.model';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatMenuModule,
    MatSnackBarModule, MatSlideToggleModule
  ],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.scss'
})
export class ProdutosComponent implements OnInit {
  todosProdutos: Produto[] = [];
  produtos: Produto[] = [];
  filtro = '';
  displayedColumns = ['codigo', 'descricao', 'categoria', 'precoCusto', 'precoTabela', 'quantidadeEstoque', 'ativo', 'acoes'];
  form: FormGroup;
  editandoId: number | null = null;
  mostrarForm = false;

  constructor(
    private produtoService: ProdutoService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(100)]],
      descricao: ['', [Validators.required, Validators.maxLength(300)]],
      categoria: ['', Validators.maxLength(100)],
      precoCusto: [null],
      precoTabela: [null],
      quantidadeEstoque: [0],
      estoqueMinimo: [5],
      ativo: [true]
    });
  }

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
  novo(): void { this.editandoId = null; this.form.reset({ ativo: true, quantidadeEstoque: 0, estoqueMinimo: 5 }); this.mostrarForm = true; }

  editar(p: Produto): void {
    this.editandoId = p.id!;
    this.form.patchValue(p);
    this.mostrarForm = true;
  }

  salvar(): void {
    if (this.form.invalid) return;
    const dados = this.form.value as Produto;
    const obs = this.editandoId
      ? this.produtoService.atualizar(this.editandoId, dados)
      : this.produtoService.criar(dados);
    obs.subscribe({
      next: () => { this.snackBar.open(this.editandoId ? 'Atualizado!' : 'Criado!', 'OK', { duration: 3000 }); this.cancelar(); this.carregar(); },
      error: () => this.snackBar.open('Erro ao salvar', 'OK', { duration: 3000 })
    });
  }

  excluir(p: Produto): void {
    if (!confirm(`Excluir "${p.descricao}"?`)) return;
    this.produtoService.excluir(p.id!).subscribe({
      next: () => { this.snackBar.open('Excluido!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao excluir', 'OK', { duration: 4000 })
    });
  }

  cancelar(): void { this.mostrarForm = false; this.editandoId = null; this.form.reset(); }

  estoqueBaixo(p: Produto): boolean { return p.ativo && p.quantidadeEstoque <= p.estoqueMinimo; }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
