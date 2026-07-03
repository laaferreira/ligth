import { Component, Injectable, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Pedido } from '../../core/models/pedido.model';
import { AppUser } from '../../core/models/user.model';
import { ValeVendedor } from '../../core/models/vale-vendedor.model';
import { PedidoService } from '../../core/services/pedido.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { ValeVendedorService } from '../../core/services/vale-vendedor.service';
import { ErrorPresenterService } from '../../core/errors/error-presenter.service';

const COMISSOES_DATE_FORMATS = {
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
class ComissoesDateAdapter extends NativeDateAdapter {
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
  selector: 'app-comissoes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: DateAdapter, useClass: ComissoesDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: COMISSOES_DATE_FORMATS }
  ],
  templateUrl: './comissoes.component.html',
  styleUrl: './comissoes.component.scss'
})
export class ComissoesComponent implements OnInit {
  readonly displayedColumns = ['numero', 'dataFinalizacao', 'clienteNome', 'valorTotal', 'custoTotal', 'lucroTotal'];

  private readonly brandLogoPath = 'assets/light-brand.png';
  private brandLogoDataUrlPromise: Promise<string> | null = null;

  readonly form = this.fb.group({
    usuarioId: ['', Validators.required],
    dataInicio: [null as Date | null, Validators.required],
    dataFim: [null as Date | null, Validators.required]
  });

  usuarios: AppUser[] = [];
  pedidos: Pedido[] = [];
  vales: ValeVendedor[] = [];
  usuarioSelecionado: AppUser | null = null;
  carregando = false;
  consultaRealizada = false;

  constructor(
    private fb: FormBuilder,
    private pedidoService: PedidoService,
    private userManagementService: UserManagementService,
    private valeVendedorService: ValeVendedorService,
    private errorPresenter: ErrorPresenterService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  carregarUsuarios(): void {
    this.userManagementService.listarUsuarios({ role: 'vendedor', is_active: true }).subscribe({
      next: usuarios => {
        this.usuarios = usuarios;
      },
      error: error => {
        this.errorPresenter.handle(error, {
          context: 'Comissoes.CarregarUsuarios',
          source: 'supabase',
          code: 'COMMISSION_USERS_LOAD_FAILED',
          title: 'Falha ao carregar vendedores',
          fallbackMessage: 'Não foi possível carregar os vendedores.',
          duration: 5000
        });
      }
    });
  }

  consultar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { usuarioId, dataInicio, dataFim } = this.form.getRawValue();
    if (!usuarioId || !dataInicio || !dataFim) {
      return;
    }

    const dataInicioFormatada = this.formatarDataParaFiltro(dataInicio);
    const dataFimFormatada = this.formatarDataParaFiltro(dataFim);

    if (dataInicioFormatada > dataFimFormatada) {
      this.snackBar.open('O período inicial não pode ser maior que o período final.', 'Fechar', { duration: 4000 });
      return;
    }

    this.usuarioSelecionado = this.usuarios.find(usuario => usuario.id === usuarioId) || null;
    this.carregando = true;
    this.consultaRealizada = false;

    forkJoin({
      pedidos: this.pedidoService.listarFinalizadosPorUsuarioPeriodo(usuarioId, dataInicioFormatada, dataFimFormatada),
      vales: this.valeVendedorService.listarPorVendedorPeriodo(usuarioId, dataInicioFormatada, dataFimFormatada)
    }).subscribe({
      next: ({ pedidos, vales }) => {
        this.pedidos = pedidos;
        this.vales = vales;
        this.carregando = false;
        this.consultaRealizada = true;
      },
      error: error => {
        this.carregando = false;
        this.consultaRealizada = true;
        this.errorPresenter.handle(error, {
          context: 'Comissoes.Consultar',
          source: 'supabase',
          code: 'COMMISSION_QUERY_FAILED',
          title: 'Falha ao consultar comissões',
          fallbackMessage: 'Não foi possível consultar os pedidos finalizados.',
          duration: 5000
        });
      }
    });
  }

  limpar(): void {
    this.form.reset();
    this.pedidos = [];
    this.vales = [];
    this.usuarioSelecionado = null;
    this.consultaRealizada = false;
  }

  get totalPedidos(): number {
    return this.pedidos.reduce((total, pedido) => total + Number(pedido.valorTotal || 0), 0);
  }

  get custoTotal(): number {
    return this.pedidos.reduce((total, pedido) => total + Number(pedido.custoTotal || 0), 0);
  }

  get lucroTotal(): number {
    return this.pedidos.reduce((total, pedido) => total + Number(pedido.lucroTotal || 0), 0);
  }

  get percentualComissao(): number {
    return Number(this.usuarioSelecionado?.comissao || 0);
  }

  get valorTotalComissao(): number {
    return this.arredondar(this.totalPedidos * (this.percentualComissao / 100));
  }

  get valorTotalVales(): number {
    return this.arredondar(this.vales.reduce((total, vale) => total + Number(vale.valor || 0), 0));
  }

  get valorComissaoLiquida(): number {
    return this.arredondar(this.valorTotalComissao - this.valorTotalVales);
  }

  get lucroAposComissao(): number {
    return this.arredondar(this.lucroTotal - this.valorTotalComissao);
  }

  get podeImprimir(): boolean {
    return !this.carregando && !!this.usuarioSelecionado && (this.pedidos.length > 0 || this.vales.length > 0);
  }

  imprimirPDF(): void {
    if (!this.podeImprimir || !this.usuarioSelecionado) {
      return;
    }

    this.imprimirPDFAsync();
  }

  private async imprimirPDFAsync(): Promise<void> {
    if (!this.usuarioSelecionado) return;

    const { dataInicio, dataFim } = this.form.getRawValue();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    let headerEndY = 28;

    try {
      const brandIcon = await this.getBrandLogoDataUrl();
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          doc.addImage(brandIcon, 'PNG', 10, 4, 14, 14);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = brandIcon;
      });
    } catch { /* ícone opcional */ }
    doc.setTextColor(27, 43, 84);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Mega Luz Comercial', pw / 2, 13, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(10, 22, pw - 10, 22);
    headerEndY = 27;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Relatório de Comissões', 14, headerEndY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Vendedor: ${this.usuarioSelecionado.nome}`, 14, headerEndY + 16);
    doc.text(`Período: ${this.formatarData(dataInicio)} a ${this.formatarData(dataFim)}`, 14, headerEndY + 22);
    doc.text(`Comissão: ${this.percentualComissao.toFixed(2)}%`, 14, headerEndY + 28);
    doc.text(`Total de vales no período: ${this.formatarMoeda(this.valorTotalVales)}`, 14, headerEndY + 34);

    autoTable(doc, {
      startY: headerEndY + 40,
      head: [['Pedido', 'Finalização', 'Cliente', 'Valor total']],
      body: this.pedidos.map(pedido => [
        pedido.numero || '-',
        this.formatarData(pedido.dataFinalizacao || ''),
        pedido.clienteNome || '-',
        this.formatarMoeda(Number(pedido.valorTotal || 0))
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [91, 45, 142] },
      margin: { left: 14, right: 14 }
    });

    let finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || (headerEndY + 40);

    if (this.vales.length > 0) {
      autoTable(doc, {
        startY: finalY + 10,
        head: [['Vale', 'Data', 'Observação', 'Valor']],
        body: this.vales.map(vale => [
          `#${vale.id}`,
          this.formatarData(vale.dataVale),
          vale.observacao || '-',
          this.formatarMoeda(Number(vale.valor || 0))
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [201, 168, 76] },
        margin: { left: 14, right: 14 }
      });

      finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || finalY;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Valor total dos pedidos: ${this.formatarMoeda(this.totalPedidos)}`, 14, finalY + 12);
    doc.text(`Comissão bruta (${this.percentualComissao.toFixed(2)}%): ${this.formatarMoeda(this.valorTotalComissao)}`, 14, finalY + 19);
    doc.text(`Desconto de vales: ${this.formatarMoeda(this.valorTotalVales)}`, 14, finalY + 26);
    doc.text(`Comissão líquida a pagar: ${this.formatarMoeda(this.valorComissaoLiquida)}`, 14, finalY + 33);

    doc.save(`comissoes-${this.usuarioSelecionado.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  private getBrandLogoDataUrl(): Promise<string> {
    if (!this.brandLogoDataUrlPromise) {
      this.brandLogoDataUrlPromise = fetch(this.brandLogoPath)
        .then(r => { if (!r.ok) throw new Error('logo'); return r.blob(); })
        .then(blob => new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(String(reader.result || ''));
          reader.onerror = () => rej(new Error('logo read error'));
          reader.readAsDataURL(blob);
        }));
    }
    return this.brandLogoDataUrlPromise;
  }

  private formatarData(data: string | Date | null | undefined): string {
    if (!data) {
      return '-';
    }

    if (data instanceof Date) {
      return data.toLocaleDateString('pt-BR');
    }

    const [ano, mes, dia] = data.slice(0, 10).split('-');
    if (!ano || !mes || !dia) {
      return data;
    }

    return `${dia}/${mes}/${ano}`;
  }

  private formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  private arredondar(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private formatarDataParaFiltro(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}