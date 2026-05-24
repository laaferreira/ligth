import { Component, Injectable, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PedidoService } from '../../core/services/pedido.service';
import { AuthService } from '../../core/services/auth.service';
import { Pedido, ImportarPedidoLinha, ImportarPedidoErro, ImportarPedidoResumoErro } from '../../core/models/pedido.model';
import { ErrorPresenterService } from '../../core/errors/error-presenter.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { UserRole } from '../../core/models/user.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PedidoDialogComponent } from './pedido-dialog.component';

const PEDIDOS_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

@Injectable()
class PedidosDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const valor = value.trim();
      if (!valor) {
        return null;
      }

      const match = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        const [, dia, mes, ano] = match;
        const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
        return this.isValid(data) ? data : null;
      }
    }

    const data = value instanceof Date ? value : new Date(value as string);
    return this.isValid(data) ? data : null;
  }

  override format(date: Date): string {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule,
    MatTableModule, MatMenuModule, MatSnackBarModule, MatSelectModule, MatPaginatorModule, MatTooltipModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: DateAdapter, useClass: PedidosDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: PEDIDOS_DATE_FORMATS }
  ],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss'
})
export class PedidosComponent implements OnInit {
  private readonly importBatchMaxLines = 300;
  private readonly brandLogoPath = 'assets/light-brand.png';
  private brandLogoDataUrlPromise: Promise<string> | null = null;
  todosPedidos: Pedido[] = [];
  pedidos: Pedido[] = [];
  displayedColumns = ['numero', 'dataPedido', 'clienteNome', 'valorTotal', 'custoTotal', 'lucroTotal', 'status', 'acoes'];
  userRole: UserRole | null = null;
  podeImportarXls = false;
  importando = false;
  resumoImportacao = '';
  detalhesImportacao: ImportarPedidoErro[] = [];
  resumoErrosImportacao: ImportarPedidoResumoErro[] = [];
  detalhesImportacaoLimitados = false;

  // Filtros
  filtroTexto = '';
  filtroStatus = '';
  filtroDataDe: Date | null = null;
  filtroDataAte: Date | null = null;
  paginaAtual = 0;
  itensPorPagina = 10;
  readonly opcoesItensPorPagina = [10, 25, 50];

  constructor(
    private pedidoService: PedidoService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar,
    private errorPresenter: ErrorPresenterService
  ) {}

  ngOnInit(): void {
    this.carregarUsuarioAtual();
    this.carregar();
  }

  private carregarUsuarioAtual(): void {
    this.userManagementService.obterUsuarioAtualComRole().then(usuario => {
      this.userRole = usuario?.role || null;
      this.podeImportarXls = usuario?.role === 'administrador';
    });
  }

  carregar(): void {
    this.pedidoService.listar().subscribe(d => {
      this.todosPedidos = d;
      this.aplicarFiltros();
    });
  }

  aplicarFiltros(): void {
    let resultado = this.todosPedidos;

    // Filtro texto (numero ou cliente)
    if (this.filtroTexto.trim()) {
      const termo = this.filtroTexto.toLowerCase().trim();
      resultado = resultado.filter(p =>
        (p.numero || '').toLowerCase().includes(termo) ||
        (p.clienteNome || '').toLowerCase().includes(termo)
      );
    }

    // Filtro status
    if (this.filtroStatus) {
      resultado = resultado.filter(p => p.status === this.filtroStatus);
    }

    // Filtro data de
    if (this.filtroDataDe) {
      const dataDe = this.formatarDataFiltro(this.filtroDataDe);
      resultado = resultado.filter(p => (p.dataPedido || '') >= dataDe);
    }

    // Filtro data ate
    if (this.filtroDataAte) {
      const dataAte = this.formatarDataFiltro(this.filtroDataAte);
      resultado = resultado.filter(p => (p.dataPedido || '') <= dataAte);
    }

    this.pedidos = resultado;
    this.paginaAtual = 0;
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.filtroDataDe = null;
    this.filtroDataAte = null;
    this.aplicarFiltros();
  }

  async importarArquivo(event: Event): Promise<void> {
    if (!this.podeImportarXls) {
      this.snackBar.open('Somente administradores podem importar pedidos por XLSX.', 'OK', { duration: 4000 });
      return;
    }

    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    this.importando = true;
    this.resumoImportacao = '';
    this.detalhesImportacao = [];
    this.resumoErrosImportacao = [];
    this.detalhesImportacaoLimitados = false;

    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const primeiraAba = workbook.SheetNames[0];

      if (!primeiraAba) {
        throw new Error('A planilha não contém abas para importação.');
      }

      const sheet = workbook.Sheets[primeiraAba];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: true
      });

      if (!rows.length) {
        throw new Error('A planilha está vazia.');
      }

      this.validarCabecalhosObrigatorios(rows[0]);

      const linhas = rows
        .map((row, index) => this.mapearLinhaImportacao(row, index + 2))
        .filter((linha): linha is ImportarPedidoLinha => !!linha);

      if (!linhas.length) {
        throw new Error('Nenhuma linha válida foi encontrada para importação.');
      }

      const lotes = this.criarLotesImportacao(linhas, this.importBatchMaxLines);
      const resultado = await this.importarLotes(lotes);
      this.detalhesImportacao = resultado.errors;
      this.resumoErrosImportacao = resultado.resumoErros;
      this.detalhesImportacaoLimitados = resultado.detalhesLimitados;
      this.resumoImportacao = `${resultado.totalLinhasRecebidas} linha(s) lida(s), ${resultado.totalPedidosIdentificados} pedido(s) identificado(s), ` +
        `${resultado.pedidosInseridos} pedido(s) importado(s), ${resultado.itensInseridos} item(ns) inserido(s)` +
        `${resultado.linhasIgnoradas > 0 ? ` e ${resultado.linhasIgnoradas} linha(s) ignorada(s)` : ''}.` +
        `${lotes.length > 1 ? ` Processado(s) em ${lotes.length} lote(s).` : ''}`;

      this.snackBar.open(this.resumoImportacao, 'OK', { duration: 6000 });
      this.carregar();
    } catch (error: any) {
      this.snackBar.open(error?.message || 'Erro ao importar pedidos.', 'OK', { duration: 5000 });
    } finally {
      this.importando = false;
      input.value = '';
    }
  }

  private formatarDataFiltro(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private validarCabecalhosObrigatorios(primeiraLinha: Record<string, unknown>): void {
    const cabecalhos = Object.keys(primeiraLinha).map(cabecalho => this.normalizarCabecalho(cabecalho));
    const obrigatorios = ['pedidoid', 'cliente', 'datavenda', 'datafinalizacao', 'userid', 'descricaoproduto', 'custo', 'precounitario', 'quantidade'];
    const faltantes = obrigatorios.filter(cabecalho => !cabecalhos.includes(cabecalho));

    if (faltantes.length > 0) {
      throw new Error(`Cabeçalho inválido. Colunas ausentes: ${faltantes.join(', ')}`);
    }
  }

  private mapearLinhaImportacao(row: Record<string, unknown>, lineNumber: number): ImportarPedidoLinha | null {
    if (this.linhaVazia(row)) {
      return null;
    }

    return {
      lineNumber,
      pedidoId: this.obterValorTexto(row, ['pedido_id', 'pedido id']),
      cliente: this.obterValorTexto(row, ['cliente']),
      dataVenda: this.obterValor(row, ['data venda']),
      dataFinalizacao: this.obterValor(row, ['data finalizacao', 'data finalização']),
      userId: this.obterValorTexto(row, ['user_id', 'user id']),
      descricaoProduto: this.obterValorTexto(row, ['descricao produto', 'descrição produto']),
      custo: this.obterValor(row, ['custo']),
      valorUnitario: this.obterValor(row, ['preco unitario', 'preço unitário', 'preco unitário', 'preço unitario']),
      quantidade: this.obterValor(row, ['quantidade'])
    };
  }

  private obterValor(row: Record<string, unknown>, aliases: string[]): string | number | null {
    const entries = Object.entries(row);
    for (const [key, value] of entries) {
      const normalizedKey = this.normalizarCabecalho(key);
      if (aliases.some(alias => this.normalizarCabecalho(alias) === normalizedKey)) {
        if (typeof value === 'string' || typeof value === 'number') {
          return value;
        }

        return value == null ? null : String(value);
      }
    }

    return null;
  }

  private obterValorTexto(row: Record<string, unknown>, aliases: string[]): string {
    const valor = this.obterValor(row, aliases);
    return String(valor ?? '').trim();
  }

  private criarLotesImportacao(linhas: ImportarPedidoLinha[], maxLinhasPorLote: number): ImportarPedidoLinha[][] {
    const pedidosAgrupados = new Map<string, ImportarPedidoLinha[]>();

    linhas.forEach(linha => {
      const pedidoId = linha.pedidoId || `linha-${linha.lineNumber}`;
      const bucket = pedidosAgrupados.get(pedidoId) || [];
      bucket.push(linha);
      pedidosAgrupados.set(pedidoId, bucket);
    });

    const lotes: ImportarPedidoLinha[][] = [];
    let loteAtual: ImportarPedidoLinha[] = [];

    pedidosAgrupados.forEach(grupo => {
      if (loteAtual.length > 0 && loteAtual.length + grupo.length > maxLinhasPorLote) {
        lotes.push(loteAtual);
        loteAtual = [];
      }

      loteAtual.push(...grupo);
    });

    if (loteAtual.length > 0) {
      lotes.push(loteAtual);
    }

    return lotes;
  }

  private async importarLotes(lotes: ImportarPedidoLinha[][]): Promise<{
    totalLinhasRecebidas: number;
    totalLinhasComSucesso: number;
    totalPedidosIdentificados: number;
    totalPedidosAgrupados: number;
    pedidosInseridos: number;
    itensInseridos: number;
    linhasIgnoradas: number;
    detalhesLimitados: boolean;
    resumoErros: ImportarPedidoResumoErro[];
    errors: ImportarPedidoErro[];
  }> {
    const reasonSummary = new Map<string, ImportarPedidoResumoErro>();
    const mergedErrors: ImportarPedidoErro[] = [];
    const mergedPedidoIds = new Set<string>();
    let totalLinhasRecebidas = 0;
    let totalLinhasComSucesso = 0;
    let totalPedidosAgrupados = 0;
    let pedidosInseridos = 0;
    let itensInseridos = 0;
    let linhasIgnoradas = 0;
    let detalhesLimitados = false;

    for (let index = 0; index < lotes.length; index += 1) {
      const lote = lotes[index];
      this.resumoImportacao = `Importando lote ${index + 1} de ${lotes.length}...`;

      try {
        const resultado = await firstValueFrom(this.pedidoService.importarPedidos(lote));

        totalLinhasRecebidas += resultado.totalLinhasRecebidas;
        totalLinhasComSucesso += resultado.totalLinhasComSucesso;
        totalPedidosAgrupados += resultado.totalPedidosAgrupados;
        pedidosInseridos += resultado.pedidosInseridos;
        itensInseridos += resultado.itensInseridos;
        linhasIgnoradas += resultado.linhasIgnoradas;
        detalhesLimitados = detalhesLimitados || !!resultado.detalhesLimitados;

        lote.forEach(linha => {
          if (linha.pedidoId) {
            mergedPedidoIds.add(linha.pedidoId);
          }
        });

        (resultado.resumoErros || []).forEach(resumo => {
          const existing = reasonSummary.get(resumo.reason);
          if (existing) {
            existing.count += resumo.count;
            resumo.sampleLines.forEach(line => {
              if (existing.sampleLines.length < 5 && !existing.sampleLines.includes(line)) {
                existing.sampleLines.push(line);
              }
            });
            return;
          }

          reasonSummary.set(resumo.reason, {
            reason: resumo.reason,
            count: resumo.count,
            sampleLines: [...resumo.sampleLines].slice(0, 5)
          });
        });

        (resultado.errors || []).forEach(error => {
          if (mergedErrors.length < 200) {
            mergedErrors.push(error);
          } else {
            detalhesLimitados = true;
          }
        });
      } catch (error: any) {
        const processedLots = index;
        const message = error?.message || 'Erro ao importar pedidos.';
        throw new Error(`Falha no lote ${index + 1} de ${lotes.length} após ${processedLots} lote(s) concluído(s). ${message}`);
      }
    }

    return {
      totalLinhasRecebidas,
      totalLinhasComSucesso,
      totalPedidosIdentificados: mergedPedidoIds.size,
      totalPedidosAgrupados,
      pedidosInseridos,
      itensInseridos,
      linhasIgnoradas,
      detalhesLimitados,
      resumoErros: Array.from(reasonSummary.values()).sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason)),
      errors: mergedErrors
    };
  }

  private linhaVazia(row: Record<string, unknown>): boolean {
    return Object.values(row).every(value => String(value ?? '').trim() === '');
  }

  private normalizarCabecalho(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  novo(): void {
    this.abrirDialogoPedido('criar');
  }

  editar(p: Pedido): void {
    this.abrirDialogoPedido('editar', p.id);
  }

  podeEditarDataFinalizacao(p: Pedido): boolean {
    return p.status === 'FINALIZADO' && (this.userRole === 'administrador' || this.userRole === 'gerente');
  }

  confirmar(p: Pedido): void {
    this.pedidoService.confirmar(p.id!).subscribe({
      next: () => { this.snackBar.open('Pedido confirmado! Estoque atualizado.', 'OK', { duration: 3000 }); this.carregar(); },
      error: (e) => this.errorPresenter.handle(e, {
        context: 'Pedidos.Confirmar',
        source: 'supabase',
        code: 'ORDER_CONFIRM_FAILED',
        title: 'Falha ao confirmar pedido',
        fallbackMessage: 'Erro ao confirmar pedido.',
        duration: 5000
      })
    });
  }

  finalizar(p: Pedido): void {
    this.pedidoService.finalizar(p.id!).subscribe({
      next: () => { this.snackBar.open('Pedido finalizado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: (e) => this.errorPresenter.handle(e, {
        context: 'Pedidos.Finalizar',
        source: 'supabase',
        code: 'ORDER_FINISH_FAILED',
        title: 'Falha ao finalizar pedido',
        fallbackMessage: 'Erro ao finalizar pedido.',
        duration: 5000
      })
    });
  }

  cancelarPedido(p: Pedido): void {
    if (!confirm(`Cancelar pedido ${p.numero}?`)) return;
    this.pedidoService.cancelar(p.id!).subscribe({
      next: () => { this.snackBar.open('Pedido cancelado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: (e) => this.errorPresenter.handle(e, {
        context: 'Pedidos.Cancelar',
        source: 'supabase',
        code: 'ORDER_CANCEL_FAILED',
        title: 'Falha ao cancelar pedido',
        fallbackMessage: 'Erro ao cancelar pedido.',
        duration: 5000
      })
    });
  }

  statusLabel(s?: string): string {
    const map: Record<string, string> = { EM_ABERTO: 'Em Aberto', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', FINALIZADO: 'Finalizado' };
    return s ? (map[s] || s) : '-';
  }

  statusClass(s?: string): string {
    const map: Record<string, string> = { EM_ABERTO: 'badge-aberto', CONFIRMADO: 'badge-confirmado', CANCELADO: 'badge-cancelado', FINALIZADO: 'badge-finalizado' };
    return s ? (map[s] || '') : '';
  }

  get pedidosPaginados(): Pedido[] {
    const inicio = this.paginaAtual * this.itensPorPagina;
    return this.pedidos.slice(inicio, inicio + this.itensPorPagina);
  }

  trackPedido(index: number, pedido: Pedido): number | string {
    return pedido.id ?? pedido.numero ?? index;
  }

  aoMudarPagina(event: PageEvent): void {
    this.paginaAtual = event.pageIndex;
    this.itensPorPagina = event.pageSize;
  }

  gerarPDF(pedido: Pedido): void {
    this.pedidoService.buscarPorId(pedido.id!).subscribe(async p => {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      try {
        const brandLogo = await this.getBrandLogoDataUrl();
        doc.addImage(brandLogo, 'PNG', 14, 10, 28, 28);
      } catch {
        doc.setFillColor(255, 197, 22);
        doc.circle(28, 24, 12, 'F');
      }
      doc.setTextColor(91, 45, 142); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
      doc.text('LIGHT COMERCIAL', 50, 24);
      doc.setTextColor(107, 91, 123); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text('Sistema de pedidos', 50, 31);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      doc.text(p.clienteNome || '', pw / 2, 45, { align: 'center' });
      doc.setFontSize(10); doc.setTextColor(100, 100, 100);
      doc.text(`Pedido: ${p.numero}`, pw / 2, 52, { align: 'center' });
      doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text(`${p.itens?.length || 0} itens`, 14, 65);
      const rows = (p.itens || []).map(i => [i.quantidade,
        `${i.produtoCodigo} - ${i.produtoDescricao}`,
        `R$ ${i.valorUnitario.toFixed(2).replace('.', ',')}`,
        `R$ ${i.valorTotal!.toFixed(2).replace('.', ',')}`]);
      autoTable(doc, { startY: 70, head: [['Qtd', 'Descricao', 'Vlr.Unit.', 'Vlr.Total']], body: rows, theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, lineWidth: { bottom: 0.5 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
        columnStyles: { 0: { halign: 'center', cellWidth: 15 }, 1: { cellWidth: 'auto' }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 30 } },
        alternateRowStyles: { fillColor: [248, 248, 248] }, margin: { left: 14, right: 14 } });
      const fy = (doc as any).lastAutoTable.finalY + 15;
      doc.setDrawColor(0, 0, 0); doc.line(14, fy - 5, pw - 14, fy - 5);
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text(`Total a Pagar: R$ ${(p.valorTotal || 0).toFixed(2).replace('.', ',')}`, pw - 14, fy + 10, { align: 'right' });
      const fty = doc.internal.pageSize.getHeight() - 30;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(new Date().toLocaleDateString('pt-BR') + ' as ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' horas', pw / 2, fty + 10, { align: 'center' });
      doc.save(`pedido-${p.numero}.pdf`);
    });
  }

  private async getBrandLogoDataUrl(): Promise<string> {
    if (!this.brandLogoDataUrlPromise) {
      this.brandLogoDataUrlPromise = this.imageToDataUrl(this.brandLogoPath);
    }

    return this.brandLogoDataUrlPromise;
  }

  private async imageToDataUrl(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error('Nao foi possivel carregar o logo da marca.');
    }

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao processar o logo da marca.'));
      reader.readAsDataURL(blob);
    });
  }

  private abrirDialogoPedido(modo: 'criar' | 'editar', pedidoId?: number): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    this.dialog.open(PedidoDialogComponent, {
      width: isMobile ? '100vw' : '960px',
      height: isMobile ? '100dvh' : undefined,
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      autoFocus: false,
      disableClose: true,
      data: { modo, pedidoId, userRole: this.userRole }
    }).afterClosed().subscribe(recarregar => {
      if (recarregar) {
        this.carregar();
      }
    });
  }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
