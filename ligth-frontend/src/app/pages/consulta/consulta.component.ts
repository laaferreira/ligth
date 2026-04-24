import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { ConsultaService } from '../../core/services/consulta.service';
import { AuthService } from '../../core/services/auth.service';
import { AutocompleteItem, HistoricoPedido } from '../../core/models/consulta.model';

@Component({
  selector: 'app-consulta',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatAutocompleteModule, MatButtonModule, MatIconModule,
    MatTableModule, MatProgressSpinnerModule, MatMenuModule, MatChipsModule
  ],
  templateUrl: './consulta.component.html',
  styleUrl: './consulta.component.scss'
})
export class ConsultaComponent implements OnInit {
  clienteControl = new FormControl('');
  produtoControl = new FormControl('');

  clientesFiltrados: AutocompleteItem[] = [];
  produtosFiltrados: AutocompleteItem[] = [];

  clienteSelecionado: AutocompleteItem | null = null;
  produtosSelecionados: AutocompleteItem[] = [];

  resultados: HistoricoPedido[] = [];
  displayedColumns = ['dataPedido', 'descricaoProduto', 'quantidade', 'valorUnitario', 'valorTotal'];

  loading = false;
  pesquisaRealizada = false;

  @ViewChild('produtoInput') produtoInput!: ElementRef<HTMLInputElement>;
  @ViewChild(MatAutocompleteTrigger) produtoTrigger!: MatAutocompleteTrigger;

  constructor(
    private consultaService: ConsultaService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.clienteControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(value => typeof value === 'string' && value.length >= 2),
      switchMap(value => this.consultaService.buscarClientes(value as string))
    ).subscribe(clientes => this.clientesFiltrados = clientes);

    this.produtoControl.valueChanges.pipe(
      debounceTime(300),
      filter(value => typeof value === 'string' && value.length >= 2),
      switchMap(value => this.consultaService.buscarProdutos(value as string))
    ).subscribe(produtos => {
      // Filtrar produtos já selecionados
      const idsJaSelecionados = this.produtosSelecionados.map(p => p.id);
      this.produtosFiltrados = produtos.filter(p => !idsJaSelecionados.includes(p.id));
    });
  }

  displayCliente(item: AutocompleteItem): string {
    return item?.label || '';
  }

  onClienteSelected(item: AutocompleteItem): void {
    this.clienteSelecionado = item;
  }

  onProdutoSelected(item: AutocompleteItem): void {
    if (!this.produtosSelecionados.find(p => p.id === item.id)) {
      this.produtosSelecionados = [...this.produtosSelecionados, item];
    }
    // Reset sem emitir evento para não interferir no valueChanges
    this.produtoControl.setValue('', { emitEvent: false });
    if (this.produtoInput) {
      this.produtoInput.nativeElement.value = '';
      this.produtoInput.nativeElement.focus();
    }
  }

  removerProduto(produto: AutocompleteItem): void {
    this.produtosSelecionados = this.produtosSelecionados.filter(p => p.id !== produto.id);
  }

  pesquisar(): void {
    if (!this.clienteSelecionado || this.produtosSelecionados.length === 0) return;

    this.loading = true;
    this.pesquisaRealizada = false;

    const produtoIds = this.produtosSelecionados.map(p => p.id);

    this.consultaService.buscarHistorico(
      this.clienteSelecionado.id,
      produtoIds
    ).subscribe({
      next: (data) => {
        this.resultados = data;
        this.loading = false;
        this.pesquisaRealizada = true;
      },
      error: () => {
        this.loading = false;
        this.pesquisaRealizada = true;
      }
    });
  }

  limparCliente(event: Event): void {
    event.stopPropagation();
    this.clienteControl.reset();
    this.clienteSelecionado = null;
  }

  limpar(): void {
    this.clienteControl.reset();
    this.produtoControl.reset();
    this.clienteSelecionado = null;
    this.produtosSelecionados = [];
    this.resultados = [];
    this.pesquisaRealizada = false;
  }

  get podePesquisar(): boolean {
    return !!this.clienteSelecionado && this.produtosSelecionados.length > 0 && !this.loading;
  }

  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  navegarDashboard(): void { this.router.navigate(['/dashboard']); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
