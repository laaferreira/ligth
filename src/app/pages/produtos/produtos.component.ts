import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProdutoService } from '../../core/services/produto.service';
import { PedidoService } from '../../core/services/pedido.service';
import { AuthService } from '../../core/services/auth.service';
import { Produto } from '../../core/models/produto.model';
import { ProdutoDialogComponent } from './produto-dialog.component';
import { Fornecedor } from '../../core/models/fornecedor.model';
import { FornecedorService } from '../../core/services/fornecedor.service';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatToolbarModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatMenuModule, MatSelectModule, MatPaginatorModule,
    MatSnackBarModule
  ],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.scss'
})
export class ProdutosComponent implements OnInit {
  todosProdutos: Produto[] = [];
  produtos: Produto[] = [];
  fornecedores: Fornecedor[] = [];
  filtro = '';
  importando = false;
  resumoImportacao = '';
  paginaAtual = 0;
  itensPorPagina = 10;
  readonly opcoesItensPorPagina = [10, 25, 50];
  custoTotalEstoque = 0;
  valorPrevistoFaturamento = 0;
  displayedColumns = ['descricao', 'fornecedor', 'precoCusto', 'precoVenda', 'quantidadeEstoque', 'acoes'];

  constructor(
    private produtoService: ProdutoService,
    private pedidoService: PedidoService,
    private fornecedorService: FornecedorService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregar();
    this.carregarFornecedores();
  }

  carregar(): void {
    this.produtoService.listar().subscribe(d => {
      this.todosProdutos = d;
      this.custoTotalEstoque = d.reduce(
        (total, produto) => total + Number(produto.quantidadeEstoque || 0) * Number(produto.precoCusto || 0),
        0
      );
      this.aplicarFiltro();
    });

    this.pedidoService.listar().subscribe(pedidos => {
      this.valorPrevistoFaturamento = pedidos
        .filter(pedido => pedido.status === 'EM_ABERTO' || pedido.status === 'CONFIRMADO')
        .reduce((total, pedido) => total + Number(pedido.valorTotal || 0), 0);
    });
  }

  aplicarFiltro(): void {
    const termo = this.filtro.toLowerCase().trim();
    if (!termo) {
      this.produtos = this.todosProdutos;
      this.paginaAtual = 0;
      return;
    }
    this.produtos = this.todosProdutos.filter(p =>
      p.codigo.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo) ||
      (p.categoria && p.categoria.toLowerCase().includes(termo)) ||
      (p.fornecedorNome && p.fornecedorNome.toLowerCase().includes(termo))
    );
    this.paginaAtual = 0;
  }

  onFiltroChange(valor: string): void {
    this.filtro = valor;
    this.aplicarFiltro();
  }

  limparFiltro(): void {
    this.filtro = '';
    this.aplicarFiltro();
  }

  async importarArquivo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    this.importando = true;
    this.resumoImportacao = '';

    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const primeiraAba = workbook.SheetNames[0];

      if (!primeiraAba) {
        throw new Error('A planilha não contém abas para importação.');
      }

      const sheet = workbook.Sheets[primeiraAba];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false
      });

      if (!rows.length) {
        throw new Error('A planilha está vazia.');
      }

      const produtosImportados = rows
        .map(row => this.mapearLinhaImportacao(row))
        .filter((produto): produto is Produto => !!produto);

      if (!produtosImportados.length) {
        throw new Error('Nenhum produto válido foi encontrado na planilha. Verifique se existe uma coluna com código e descrição.');
      }

      const inseridos = await firstValueFrom(this.produtoService.importar(produtosImportados));
      const totalInserido = inseridos?.length || produtosImportados.length;
      const ignorados = rows.length - produtosImportados.length;

      this.resumoImportacao = `${totalInserido} produto(s) importado(s)${ignorados > 0 ? `, ${ignorados} linha(s) ignorada(s)` : ''}.`;
      this.snackBar.open(this.resumoImportacao, 'OK', { duration: 5000 });
      this.carregar();
    } catch (error: any) {
      this.snackBar.open(error?.message || 'Erro ao importar arquivo XLSX', 'OK', { duration: 5000 });
    } finally {
      this.importando = false;
      input.value = '';
    }
  }

  novo(): void { this.abrirDialogoProduto('criar'); }

  editar(p: Produto): void {
    this.abrirDialogoProduto('editar', p);
  }

  estoqueBaixo(p: Produto): boolean { return p.ativo && p.quantidadeEstoque <= p.estoqueMinimo; }

  nomeFornecedor(produto: Produto): string {
    if (produto.fornecedorNome?.trim()) {
      return produto.fornecedorNome;
    }

    const fornecedor = this.fornecedores.find(item => item.id === produto.fornecedorId);
    return fornecedor?.nome || '-';
  }

  trackProduto(produto: Produto): string {
    return produto.id != null ? String(produto.id) : produto.codigo;
  }

  get produtosPaginados(): Produto[] {
    const inicio = this.paginaAtual * this.itensPorPagina;
    return this.produtos.slice(inicio, inicio + this.itensPorPagina);
  }

  aoMudarPagina(event: PageEvent): void {
    this.paginaAtual = event.pageIndex;
    this.itensPorPagina = event.pageSize;
  }

  private abrirDialogoProduto(modo: 'criar' | 'editar', produto?: Produto): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    this.dialog.open(ProdutoDialogComponent, {
      width: isMobile ? '100vw' : '720px',
      height: isMobile ? '100dvh' : undefined,
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      autoFocus: false,
      disableClose: true,
      data: { modo, produto, fornecedores: this.fornecedores }
    }).afterClosed().subscribe(recarregar => {
      if (recarregar) {
        this.carregar();
      }
    });
  }

  private carregarFornecedores(): void {
    this.fornecedorService.listar().subscribe({
      next: fornecedores => {
        this.fornecedores = fornecedores;
        this.aplicarFiltro();
      },
      error: () => {
        this.snackBar.open('Não foi possível carregar os fornecedores.', 'OK', { duration: 4000 });
      }
    });
  }

  private mapearLinhaImportacao(row: Record<string, unknown>): Produto | null {
    const codigo = this.obterValor(row, ['codigo', 'código']);
    const descricao = this.obterValor(row, ['descricao', 'descrição']);

    if (!codigo || !descricao) {
      return null;
    }

    const fornecedorNome = this.obterValor(row, ['fornecedor']);
    const fornecedor = this.localizarFornecedor(fornecedorNome);
    const quantidadeBase = this.obterNumero(row, ['qtdade', 'qtidade', 'quantidade']);
    const quantidadeEstoque = this.obterNumero(row, ['qtdade disponivel', 'qtdade disponível', 'quantidade disponivel', 'quantidade disponível', 'disponivel', 'disponível'], quantidadeBase);

    return {
      codigo,
      descricao,
      fornecedorId: fornecedor?.id ?? null,
      fornecedorNome: fornecedorNome || fornecedor?.nome || '',
      categoria: this.obterValor(row, ['categoria']),
      precoCusto: this.obterNumero(row, ['custo medio unit', 'custo médio unit', 'custo medio unit.', 'custo médio unit.']),
      precoVenda: this.obterNumero(row, ['valor venda']),
      quantidadeEstoque,
      estoqueMaximo: 0,
      estoqueMinimo: 0,
      ativo: quantidadeEstoque > 0
    };
  }

  private localizarFornecedor(nomeFornecedor: string): Fornecedor | undefined {
    const nomeNormalizado = this.normalizarCabecalho(nomeFornecedor);
    if (!nomeNormalizado) {
      return undefined;
    }

    return this.fornecedores.find(fornecedor => {
      const nome = this.normalizarCabecalho(fornecedor.nome);
      const razao = this.normalizarCabecalho(fornecedor.razaoSocial);
      return nome === nomeNormalizado || razao === nomeNormalizado;
    });
  }

  private obterValor(row: Record<string, unknown>, aliases: string[]): string {
    const entries = Object.entries(row);
    for (const [key, value] of entries) {
      const normalizedKey = this.normalizarCabecalho(key);
      if (aliases.some(alias => this.normalizarCabecalho(alias) === normalizedKey)) {
        return String(value ?? '').trim();
      }
    }
    return '';
  }

  private obterNumero(row: Record<string, unknown>, aliases: string[], fallback = 0): number {
    const valor = this.obterValor(row, aliases);
    if (!valor) {
      return fallback;
    }

    const normalizado = valor
      .replace(/R\$/gi, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();

    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : fallback;
  }

  private normalizarCabecalho(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
