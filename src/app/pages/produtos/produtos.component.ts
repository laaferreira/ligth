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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProdutoService } from '../../core/services/produto.service';
import { PedidoService } from '../../core/services/pedido.service';
import { AuthService } from '../../core/services/auth.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { Produto } from '../../core/models/produto.model';
import { AppUser, UserRole } from '../../core/models/user.model';
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
    MatSnackBarModule, MatTooltipModule
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
  valorPotencialEstoqueVenda = 0;
  userRole: UserRole | null = null;
  usuarioAtual: AppUser | null = null;
  carregandoUsuario = true;
  gerandoTabelaPrecos = false;
  gerandoTabelaPrecosGerente = false;

  get displayedColumns(): string[] {
    if (this.userRole === 'vendedor') {
      return ['codigoDescricao', 'precoOuro', 'precoPrata', 'precoBronze'];
    }
    return ['descricao', 'fornecedor', 'precoCusto', 'precoVenda', 'quantidadeEstoque', 'acoes'];
  }

  get isVendedor(): boolean {
    return this.userRole === 'vendedor';
  }

  constructor(
    private produtoService: ProdutoService,
    private pedidoService: PedidoService,
    private fornecedorService: FornecedorService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarUsuarioAtual();
    this.carregar();
    this.carregarFornecedores();
  }

  private async carregarUsuarioAtual(): Promise<void> {
    this.usuarioAtual = await this.userManagementService.obterUsuarioAtualComRole();
    this.userRole = this.usuarioAtual?.role || null;
    this.carregandoUsuario = false;
  }

  carregar(): void {
    this.produtoService.listar().subscribe(d => {
      this.todosProdutos = d;
      this.custoTotalEstoque = d.reduce(
        (total, produto) => total + this.parseNumeric(produto.quantidadeEstoque) * this.parseNumeric(produto.precoCusto),
        0
      );
      this.valorPotencialEstoqueVenda = d.reduce(
        (total, produto) => total + this.parseNumeric(produto.quantidadeEstoque) * this.parseNumeric(produto.precoVenda),
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

  novo(): void {
    if (this.userRole === 'vendedor') {
      this.snackBar.open('Vendedores não podem criar produtos.', 'OK', { duration: 4000 });
      return;
    }
    this.abrirDialogoProduto('criar');
  }

  editar(p: Produto): void {
    if (this.userRole === 'vendedor') {
      this.snackBar.open('Vendedores não podem editar produtos.', 'OK', { duration: 4000 });
      return;
    }
    this.abrirDialogoProduto('editar', p);
  }

  precoElite(produto: Produto): number {
    const custo = this.parseNumeric(produto.precoCustoVendedor ?? produto.precoCusto);
    const margem = this.usuarioAtual?.margemVendaElite ?? 20;
    return this.roundToTwo(custo * (1 + margem / 100));
  }

  precoOuro(produto: Produto): number {
    const custo = this.parseNumeric(produto.precoCustoVendedor ?? produto.precoCusto);
    const margem = this.usuarioAtual?.margemVendaOuro ?? 35;
    return this.roundToTwo(custo * (1 + margem / 100));
  }

  precoPrata(produto: Produto): number {
    const custo = this.parseNumeric(produto.precoCustoVendedor ?? produto.precoCusto);
    const margem = this.usuarioAtual?.margemVendaPrata ?? 50;
    return this.roundToTwo(custo * (1 + margem / 100));
  }

  precoBronze(produto: Produto): number {
    const custo = this.parseNumeric(produto.precoCustoVendedor ?? produto.precoCusto);
    const margem = this.usuarioAtual?.margemVendaBronze ?? 100;
    return this.roundToTwo(custo * (1 + margem / 100));
  }

  produtoCodigoDescricao(produto: Produto): string {
    return `${produto.codigo} - ${produto.descricao}`;
  }

  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
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

    const numero = this.parseNumeric(valor, fallback);
    return Number.isFinite(numero) ? numero : fallback;
  }

  private parseNumeric(value: unknown, fallback = 0): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }

    if (value == null) {
      return fallback;
    }

    const normalizado = String(value)
      .replace(/R\$/gi, '')
      .replace(/\s+/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
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

  async exportarTabelaPrecos(): Promise<void> {
    if (this.gerandoTabelaPrecos) return;
    this.gerandoTabelaPrecos = true;
    try {
      const JSZip = (await import('jszip')).default;
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const dataIso = new Date().toISOString().slice(0, 10);

      // Agrupar produtos por fornecedor
      const grupos = new Map<string, Produto[]>();
      for (const p of this.todosProdutos) {
        const nome = this.nomeFornecedor(p);
        if (!grupos.has(nome)) grupos.set(nome, []);
        grupos.get(nome)!.push(p);
      }

      const stylesXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>` +
        `<fonts count="3">` +
        `<font><sz val="11"/><name val="Calibri"/></font>` +
        `<font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
        `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
        `</fonts>` +
        `<fills count="6">` +
        `<fill><patternFill patternType="none"/></fill>` +
        `<fill><patternFill patternType="gray125"/></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FF4A1A7B"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FF6A2FA0"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFF4EEFF"/></patternFill></fill>` +
        `</fills>` +
        `<borders count="2">` +
        `<border><left/><right/><top/><bottom/><diagonal/></border>` +
        `<border><left/><right/><top/><bottom><color rgb="FFCFB8E8"/></bottom><diagonal/></border>` +
        `</borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="7">` +
        `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
        `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
        `<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
        `<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
        `<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
        `<xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>` +
        `<xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>` +
        `</cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
        `</styleSheet>`;

      const x = (s: unknown) => String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
      const makeRow = (r: number, ht: number, cells: Array<{ s: number; v: string | number; n?: true }>) =>
        `<row r="${r}" ht="${ht}" customHeight="1">${cells.map((c, i) =>
          c.n
            ? `<c r="${COLS[i]}${r}" s="${c.s}"><v>${c.v}</v></c>`
            : `<c r="${COLS[i]}${r}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${x(c.v)}</t></is></c>`
        ).join('')}</row>`;

      const buildXlsxBytes = async (prods: Produto[], nomeForn: string): Promise<Uint8Array> => {
        const rows: string[] = [];
        rows.push(makeRow(1, 32, [
          { s: 1, v: `${nomeForn} \u2014 Tabela de Pre\u00e7os para Vendedores \u2014 ${dataHoje}` },
          { s: 1, v: '' }, { s: 1, v: '' }, { s: 1, v: '' }, { s: 1, v: '' }, { s: 1, v: '' }
        ]));
        rows.push(makeRow(2, 22, [
          { s: 2, v: 'C\u00f3digo' }, { s: 2, v: 'Descri\u00e7\u00e3o' }, { s: 2, v: 'Fornecedor' },
          { s: 2, v: 'Pre\u00e7o Ouro' }, { s: 2, v: 'Pre\u00e7o Prata' }, { s: 2, v: 'Pre\u00e7o Bronze' }
        ]));
        prods.forEach((p, i) => {
          const odd = i % 2 === 0;
          rows.push(makeRow(i + 3, 18, [
            { s: odd ? 3 : 4, v: p.codigo },
            { s: odd ? 3 : 4, v: p.descricao },
            { s: odd ? 3 : 4, v: this.nomeFornecedor(p) },
            { s: odd ? 5 : 6, v: this.precoOuro(p), n: true },
            { s: odd ? 5 : 6, v: this.precoPrata(p), n: true },
            { s: odd ? 5 : 6, v: this.precoBronze(p), n: true }
          ]));
        });

        const xlsxZip = new JSZip();
        xlsxZip.file('[Content_Types].xml',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `</Types>`);
        xlsxZip.file('_rels/.rels',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`);
        xlsxZip.file('xl/workbook.xml',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets><sheet name="Tabela de Pre\u00e7os" sheetId="1" r:id="rId1"/></sheets>` +
          `</workbook>`);
        xlsxZip.file('xl/_rels/workbook.xml.rels',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `</Relationships>`);
        xlsxZip.file('xl/styles.xml', stylesXml);
        xlsxZip.file('xl/worksheets/sheet1.xml',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheetViews><sheetView workbookViewId="0"><pane xSplit="0" ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
          `<cols>` +
          `<col min="1" max="1" width="14" customWidth="1"/>` +
          `<col min="2" max="2" width="48" customWidth="1"/>` +
          `<col min="3" max="3" width="28" customWidth="1"/>` +
          `<col min="4" max="6" width="16" customWidth="1"/>` +
          `</cols>` +
          `<sheetData>${rows.join('')}</sheetData>` +
          `<mergeCells count="1"><mergeCell ref="A1:F1"/></mergeCells>` +
          `</worksheet>`);

        return xlsxZip.generateAsync({ type: 'uint8array' });
      };

      // Gerar um xlsx por fornecedor e empacotar no ZIP final
      const outerZip = new JSZip();

      // Planilha consolidada com todos os produtos (ordenados por fornecedor e descrição)
      const todosOrdenados = [...this.todosProdutos].sort((a, b) => {
        const fa = this.nomeFornecedor(a).localeCompare(this.nomeFornecedor(b), 'pt-BR');
        return fa !== 0 ? fa : a.descricao.localeCompare(b.descricao, 'pt-BR');
      });
      const bytesTodos = await buildXlsxBytes(todosOrdenados, 'Todos os Produtos');
      outerZip.file(`_TODOS_OS_PRODUTOS.xlsx`, bytesTodos);

      for (const [nomeForn, prods] of grupos) {
        const bytes = await buildXlsxBytes(prods, nomeForn);
        const safeNome = nomeForn.replace(/[/\\?%*:|"<>]/g, '-');
        outerZip.file(`${safeNome}.xlsx`, bytes);
      }

      const blob = await outerZip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tabela-precos-vendedores-${dataIso}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.snackBar.open(`Tabela de pre\u00e7os exportada (${grupos.size} fornecedor${grupos.size !== 1 ? 'es' : ''})!`, 'OK', { duration: 4000 });
    } catch (err) {
      console.error('Erro ao gerar tabela de pre\u00e7os:', err);
      this.snackBar.open('Erro ao gerar a tabela de pre\u00e7os.', 'OK', { duration: 4000 });
    } finally {
      this.gerandoTabelaPrecos = false;
    }
  }

  async exportarTabelaPrecosGerente(): Promise<void> {
    if (this.gerandoTabelaPrecosGerente) return;
    this.gerandoTabelaPrecosGerente = true;
    try {
      const JSZip = (await import('jszip')).default;
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const dataIso = new Date().toISOString().slice(0, 10);

      const grupos = new Map<string, Produto[]>();
      for (const p of this.todosProdutos) {
        const nome = this.nomeFornecedor(p);
        if (!grupos.has(nome)) grupos.set(nome, []);
        grupos.get(nome)!.push(p);
      }

      const stylesXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>` +
        `<fonts count="3">` +
        `<font><sz val="11"/><name val="Calibri"/></font>` +
        `<font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
        `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
        `</fonts>` +
        `<fills count="6">` +
        `<fill><patternFill patternType="none"/></fill>` +
        `<fill><patternFill patternType="gray125"/></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FF4A1A7B"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FF6A2FA0"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>` +
        `<fill><patternFill patternType="solid"><fgColor rgb="FFF4EEFF"/></patternFill></fill>` +
        `</fills>` +
        `<borders count="2">` +
        `<border><left/><right/><top/><bottom/><diagonal/></border>` +
        `<border><left/><right/><top/><bottom><color rgb="FFCFB8E8"/></bottom><diagonal/></border>` +
        `</borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="7">` +
        `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
        `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
        `<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
        `<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
        `<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
        `<xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>` +
        `<xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>` +
        `</cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
        `</styleSheet>`;

      const x = (s: unknown) => String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const makeRow = (r: number, ht: number, cells: Array<{ s: number; v: string | number; n?: true }>) =>
        `<row r="${r}" ht="${ht}" customHeight="1">${cells.map((c, i) =>
          c.n
            ? `<c r="${COLS[i]}${r}" s="${c.s}"><v>${c.v}</v></c>`
            : `<c r="${COLS[i]}${r}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${x(c.v)}</t></is></c>`
        ).join('')}</row>`;

      const buildXlsxBytesGerente = async (prods: Produto[], nomeForn: string): Promise<Uint8Array> => {
        const rows: string[] = [];
        rows.push(makeRow(1, 32, [
          { s: 1, v: `${nomeForn} \u2014 Tabela de Pre\u00e7os (Gerente) \u2014 ${dataHoje}` },
          { s: 1, v: '' }, { s: 1, v: '' }, { s: 1, v: '' }, { s: 1, v: '' }, { s: 1, v: '' }, { s: 1, v: '' }
        ]));
        rows.push(makeRow(2, 22, [
          { s: 2, v: 'C\u00f3digo' }, { s: 2, v: 'Descri\u00e7\u00e3o' }, { s: 2, v: 'Fornecedor' },
          { s: 2, v: 'Pre\u00e7o Elite' }, { s: 2, v: 'Pre\u00e7o Ouro' }, { s: 2, v: 'Pre\u00e7o Prata' }, { s: 2, v: 'Pre\u00e7o Bronze' }
        ]));
        prods.forEach((p, i) => {
          const odd = i % 2 === 0;
          rows.push(makeRow(i + 3, 18, [
            { s: odd ? 3 : 4, v: p.codigo },
            { s: odd ? 3 : 4, v: p.descricao },
            { s: odd ? 3 : 4, v: this.nomeFornecedor(p) },
            { s: odd ? 5 : 6, v: this.precoElite(p), n: true },
            { s: odd ? 5 : 6, v: this.precoOuro(p), n: true },
            { s: odd ? 5 : 6, v: this.precoPrata(p), n: true },
            { s: odd ? 5 : 6, v: this.precoBronze(p), n: true }
          ]));
        });

        const xlsxZip = new JSZip();
        xlsxZip.file('[Content_Types].xml',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `</Types>`);
        xlsxZip.file('_rels/.rels',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`);
        xlsxZip.file('xl/workbook.xml',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets><sheet name="Tabela de Pre\u00e7os" sheetId="1" r:id="rId1"/></sheets>` +
          `</workbook>`);
        xlsxZip.file('xl/_rels/workbook.xml.rels',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `</Relationships>`);
        xlsxZip.file('xl/styles.xml', stylesXml);
        xlsxZip.file('xl/worksheets/sheet1.xml',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheetViews><sheetView workbookViewId="0"><pane xSplit="0" ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
          `<cols>` +
          `<col min="1" max="1" width="14" customWidth="1"/>` +
          `<col min="2" max="2" width="48" customWidth="1"/>` +
          `<col min="3" max="3" width="28" customWidth="1"/>` +
          `<col min="4" max="7" width="16" customWidth="1"/>` +
          `</cols>` +
          `<sheetData>${rows.join('')}</sheetData>` +
          `<mergeCells count="1"><mergeCell ref="A1:G1"/></mergeCells>` +
          `</worksheet>`);

        return xlsxZip.generateAsync({ type: 'uint8array' });
      };

      const outerZip = new JSZip();

      const todosOrdenados = [...this.todosProdutos].sort((a, b) => {
        const fa = this.nomeFornecedor(a).localeCompare(this.nomeFornecedor(b), 'pt-BR');
        return fa !== 0 ? fa : a.descricao.localeCompare(b.descricao, 'pt-BR');
      });
      const bytesTodos = await buildXlsxBytesGerente(todosOrdenados, 'Todos os Produtos');
      outerZip.file(`_TODOS_OS_PRODUTOS.xlsx`, bytesTodos);

      for (const [nomeForn, prods] of grupos) {
        const bytes = await buildXlsxBytesGerente(prods, nomeForn);
        const safeNome = nomeForn.replace(/[/\\?%*:|"<>]/g, '-');
        outerZip.file(`${safeNome}.xlsx`, bytes);
      }

      const blob = await outerZip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tabela-precos-gerente-${dataIso}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.snackBar.open(`Tabela de pre\u00e7os (Gerente) exportada (${grupos.size} fornecedor${grupos.size !== 1 ? 'es' : ''})!`, 'OK', { duration: 4000 });
    } catch (err) {
      console.error('Erro ao gerar tabela de pre\u00e7os (Gerente):', err);
      this.snackBar.open('Erro ao gerar a tabela de pre\u00e7os.', 'OK', { duration: 4000 });
    } finally {
      this.gerandoTabelaPrecosGerente = false;
    }
  }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
