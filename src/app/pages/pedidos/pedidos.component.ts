import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
import { Pedido } from '../../core/models/pedido.model';
import { ErrorPresenterService } from '../../core/errors/error-presenter.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { UserRole } from '../../core/models/user.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PedidoDialogComponent } from './pedido-dialog.component';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
    MatTableModule, MatMenuModule, MatSnackBarModule, MatSelectModule, MatPaginatorModule, MatTooltipModule
  ],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss'
})
export class PedidosComponent implements OnInit {
  private readonly brandLogoPath = 'assets/light-brand.png';
  private brandLogoDataUrlPromise: Promise<string> | null = null;
  todosPedidos: Pedido[] = [];
  pedidos: Pedido[] = [];
  displayedColumns = ['numero', 'dataPedido', 'clienteNome', 'valorTotal', 'custoTotal', 'lucroTotal', 'status', 'acoes'];
  userRole: UserRole | null = null;

  // Filtros
  filtroTexto = '';
  filtroStatus = '';
  filtroDataDe = '';
  filtroDataAte = '';
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
      resultado = resultado.filter(p => (p.dataPedido || '') >= this.filtroDataDe);
    }

    // Filtro data ate
    if (this.filtroDataAte) {
      resultado = resultado.filter(p => (p.dataPedido || '') <= this.filtroDataAte);
    }

    this.pedidos = resultado;
    this.paginaAtual = 0;
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.filtroDataDe = '';
    this.filtroDataAte = '';
    this.aplicarFiltros();
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
