import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { debounceTime, filter, switchMap } from 'rxjs';
import { PedidoService } from '../../core/services/pedido.service';
import { ConsultaService } from '../../core/services/consulta.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { AuthService } from '../../core/services/auth.service';
import { Pedido, CriarPedido } from '../../core/models/pedido.model';
import { AutocompleteItem, ProdutoAutocompleteItem } from '../../core/models/consulta.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatAutocompleteModule, MatButtonModule, MatIconModule,
    MatTableModule, MatMenuModule, MatSnackBarModule, MatChipsModule, MatSelectModule, MatNativeDateModule
  ],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss'
})
export class PedidosComponent implements OnInit {
  todosPedidos: Pedido[] = [];
  pedidos: Pedido[] = [];
  displayedColumns = ['numero', 'dataPedido', 'clienteNome', 'valorTotal', 'status', 'acoes'];
  mostrarForm = false;
  editandoId: number | null = null;

  // Filtros
  filtroTexto = '';
  filtroStatus = '';
  filtroDataDe = '';
  filtroDataAte = '';

  clienteControl = new FormControl('');
  clientesFiltrados: AutocompleteItem[] = [];
  clienteSelecionado: AutocompleteItem | null = null;

  produtoControl = new FormControl('');
  produtosFiltrados: ProdutoAutocompleteItem[] = [];
  produtoSelecionado: ProdutoAutocompleteItem | null = null;

  estoqueInfo: { estoqueAtual: number; comprometido: number; estoqueFuturo: number } | null = null;

  itemForm: FormGroup;
  get qtdControl(): FormControl { return this.itemForm.get('quantidade') as FormControl; }
  get vlrControl(): FormControl { return this.itemForm.get('valorUnitario') as FormControl; }

  itensNovoPedido: { produtoId: number; produtoLabel: string; quantidade: number; valorUnitario: number; valorTotal: number }[] = [];
  itensColumns = ['produto', 'quantidade', 'valorUnitario', 'valorTotal', 'remover'];

  constructor(
    private pedidoService: PedidoService,
    private consultaService: ConsultaService,
    private estoqueService: EstoqueService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.itemForm = this.fb.group({
      quantidade: [1, [Validators.required, Validators.min(1)]],
      valorUnitario: [null, [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit(): void {
    this.carregar();
    this.clienteControl.valueChanges.pipe(
      debounceTime(300), filter(v => typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarClientes(v as string))
    ).subscribe(c => this.clientesFiltrados = c);
    this.produtoControl.valueChanges.pipe(
      debounceTime(300), filter(v => typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarProdutosComPreco(v as string))
    ).subscribe(p => this.produtosFiltrados = p);
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
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.filtroDataDe = '';
    this.filtroDataAte = '';
    this.aplicarFiltros();
  }
  displayFn(item: AutocompleteItem): string { return item?.label || ''; }
  onClienteSelected(item: AutocompleteItem): void { this.clienteSelecionado = item; }
  onProdutoSelected(item: ProdutoAutocompleteItem): void {
    this.produtoSelecionado = item;
    this.estoqueInfo = null;
    this.estoqueService.estoqueProduto(item.id).subscribe(info => this.estoqueInfo = info);
  }

  get precoTabela(): number | null { return this.produtoSelecionado?.precoTabela ?? null; }
  get margemLucro(): number | null {
    const vlr = this.itemForm.value.valorUnitario;
    const tab = this.precoTabela;
    if (!vlr || !tab || tab === 0) return null;
    return ((vlr - tab) / tab) * 100;
  }

  adicionarItem(): void {
    if (!this.produtoSelecionado || this.itemForm.invalid) return;
    const qty = this.itemForm.value.quantidade, unit = this.itemForm.value.valorUnitario;
    this.itensNovoPedido = [...this.itensNovoPedido, {
      produtoId: this.produtoSelecionado.id, produtoLabel: this.produtoSelecionado.label,
      quantidade: qty, valorUnitario: unit, valorTotal: qty * unit
    }];
    this.produtoSelecionado = null;
    this.estoqueInfo = null;
    this.produtoControl.setValue('', { emitEvent: false });
    this.itemForm.patchValue({ quantidade: 1, valorUnitario: null });
  }

  removerItem(i: number): void { this.itensNovoPedido = this.itensNovoPedido.filter((_, idx) => idx !== i); }
  get totalPedido(): number { return this.itensNovoPedido.reduce((s, i) => s + i.valorTotal, 0); }

  novo(): void {
    this.editandoId = null;
    this.mostrarForm = true;
    this.itensNovoPedido = [];
    this.clienteSelecionado = null;
    this.clienteControl.setValue('');
  }

  editar(p: Pedido): void {
    this.editandoId = p.id!;
    this.pedidoService.buscarPorId(p.id!).subscribe(pedido => {
      this.clienteSelecionado = { id: pedido.clienteId, label: pedido.clienteNome || '' };
      this.clienteControl.setValue(this.clienteSelecionado as any);
      this.itensNovoPedido = (pedido.itens || []).map(i => ({
        produtoId: i.produtoId,
        produtoLabel: `${i.produtoCodigo} - ${i.produtoDescricao}`,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario,
        valorTotal: i.valorTotal || i.quantidade * i.valorUnitario
      }));
      this.mostrarForm = true;
    });
  }

  salvarPedido(): void {
    if (!this.clienteSelecionado || this.itensNovoPedido.length === 0) return;
    const dto: CriarPedido = { clienteId: this.clienteSelecionado.id,
      itens: this.itensNovoPedido.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, valorUnitario: i.valorUnitario }))
    };
    const obs = this.editandoId
      ? this.pedidoService.atualizar(this.editandoId, dto)
      : this.pedidoService.criar(dto);
    obs.subscribe({
      next: () => {
        this.snackBar.open(this.editandoId ? 'Pedido atualizado!' : 'Pedido criado!', 'OK', { duration: 3000 });
        this.mostrarForm = false;
        this.editandoId = null;
        this.carregar();
      },
      error: (e) => this.snackBar.open(e.error?.message || 'Erro ao salvar', 'OK', { duration: 3000 })
    });
  }

  confirmar(p: Pedido): void {
    this.pedidoService.confirmar(p.id!).subscribe({
      next: () => { this.snackBar.open('Pedido confirmado! Estoque atualizado.', 'OK', { duration: 3000 }); this.carregar(); },
      error: (e) => this.snackBar.open(e.error?.message || 'Erro ao confirmar', 'OK', { duration: 4000 })
    });
  }

  finalizar(p: Pedido): void {
    this.pedidoService.finalizar(p.id!).subscribe({
      next: () => { this.snackBar.open('Pedido finalizado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: (e) => this.snackBar.open(e.error?.message || 'Erro ao finalizar', 'OK', { duration: 4000 })
    });
  }

  cancelarPedido(p: Pedido): void {
    if (!confirm(`Cancelar pedido ${p.numero}?`)) return;
    this.pedidoService.cancelar(p.id!).subscribe({
      next: () => { this.snackBar.open('Pedido cancelado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao cancelar', 'OK', { duration: 3000 })
    });
  }

  excluir(p: Pedido): void {
    if (!confirm(`Excluir pedido ${p.numero}?`)) return;
    this.pedidoService.excluir(p.id!).subscribe({
      next: () => { this.snackBar.open('Excluido!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao excluir', 'OK', { duration: 3000 })
    });
  }

  cancelar(): void { this.mostrarForm = false; this.editandoId = null; }

  statusLabel(s: string): string {
    const map: Record<string, string> = { EM_ABERTO: 'Em Aberto', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', FINALIZADO: 'Finalizado' };
    return map[s] || s;
  }

  statusClass(s: string): string {
    const map: Record<string, string> = { EM_ABERTO: 'badge-aberto', CONFIRMADO: 'badge-confirmado', CANCELADO: 'badge-cancelado', FINALIZADO: 'badge-finalizado' };
    return map[s] || '';
  }

  gerarPDF(pedido: Pedido): void {
    this.pedidoService.buscarPorId(pedido.id!).subscribe(p => {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      doc.setFillColor(106, 27, 154); doc.rect(14, 10, 30, 30, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(8);
      doc.text('LIGHT', 22, 25, { align: 'center' }); doc.text('COMERCIAL', 22, 30, { align: 'center' });
      doc.setTextColor(0, 0, 0); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
      doc.text('LIGHT COMERCIAL', pw / 2, 25, { align: 'center' });
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

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
