import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, filter, switchMap } from 'rxjs';
import { EstoqueService } from '../../core/services/estoque.service';
import { ConsultaService } from '../../core/services/consulta.service';
import { AuthService } from '../../core/services/auth.service';
import { Produto } from '../../core/models/produto.model';
import { Movimentacao } from '../../core/models/pedido.model';
import { AutocompleteItem } from '../../core/models/consulta.model';

@Component({
  selector: 'app-estoque',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatAutocompleteModule, MatButtonModule, MatIconModule,
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

  produtoControl = new FormControl('');
  produtosFiltrados: AutocompleteItem[] = [];
  produtoSelecionado: AutocompleteItem | null = null;
  movForm: FormGroup;

  get qtdMovControl(): FormControl { return this.movForm.get('quantidade') as FormControl; }
  get precoCompraControl(): FormControl { return this.movForm.get('precoCompra') as FormControl; }
  get obsControl(): FormControl { return this.movForm.get('observacao') as FormControl; }

  constructor(
    private estoqueService: EstoqueService,
    private consultaService: ConsultaService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.movForm = this.fb.group({
      quantidade: [1, [Validators.required, Validators.min(1)]],
      precoCompra: [null],
      observacao: ['']
    });
  }

  ngOnInit(): void {
    this.carregar();
    this.produtoControl.valueChanges.pipe(
      debounceTime(300), filter(v => typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarProdutos(v as string))
    ).subscribe(p => this.produtosFiltrados = p);
  }

  carregar(): void {
    this.estoqueService.estoqueBaixo().subscribe(d => this.produtosBaixo = d);
    this.estoqueService.historico().subscribe(d => this.movimentacoes = d);
  }

  displayFn(item: AutocompleteItem): string { return item?.label || ''; }
  onProdutoSelected(item: AutocompleteItem): void { this.produtoSelecionado = item; }

  registrar(tipo: 'entrada' | 'saida'): void {
    if (!this.produtoSelecionado || this.movForm.invalid) return;
    const { quantidade, precoCompra, observacao } = this.movForm.value;
    const obs$ = tipo === 'entrada'
      ? this.estoqueService.entrada(this.produtoSelecionado.id, quantidade, precoCompra, observacao)
      : this.estoqueService.saida(this.produtoSelecionado.id, quantidade, observacao);
    obs$.subscribe({
      next: () => { this.snackBar.open(`${tipo === 'entrada' ? 'Entrada' : 'Saida'} registrada!`, 'OK', { duration: 3000 }); this.carregar(); this.limpar(); },
      error: (e) => this.snackBar.open(e.error || 'Erro', 'OK', { duration: 4000 })
    });
  }

  limpar(): void { this.produtoSelecionado = null; this.produtoControl.setValue(''); this.movForm.reset({ quantidade: 1, observacao: '' }); }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
