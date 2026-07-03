import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DashboardService, Dashboard } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { BackupService } from '../../core/services/backup.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatToolbarModule, MatCardModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatSelectModule, MatFormFieldModule,
    MatTableModule, MatTooltipModule, NgChartsModule, MatSnackBarModule, MatProgressBarModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  data: Dashboard | null = null;
  userRole: string | null = null;
  readonly clientesSemCompraCols = ['nome', 'responsavel', 'dataUltimaCompra', 'diasSemComprar'];
  readonly itensPorPaginaClientesSemCompra = 10;
  paginaClientesSemCompra = 0;

  // Charts
  faturamentoChart: ChartConfiguration<'bar'> | null = null;
  produtosChart: ChartConfiguration<'bar'> | null = null;
  clientesChart: ChartConfiguration<'bar'> | null = null;
  statusChart: ChartConfiguration<'doughnut'> | null = null;
  vendedoresChart: ChartConfiguration<'bar'> | null = null;

  backupEmAndamento = false;
  backupProgresso = '';
  backupPercentual = 0;

  estoqueCols = ['codigo', 'descricao', 'estoque', 'minimo'];
  filterMes: number | null = null;
  filterAno: number | null = null;
  filtroAtivo = false;
  filtroLabel = '';

  readonly meses = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
  ];

  readonly anos: number[] = (() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  })();

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private backupService: BackupService,
    private snackBar: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.userManagementService.obterUsuarioAtualComRole().then(u => {
      this.userRole = u?.role || null;
    }).catch(() => {});
  }

  buildCharts(d: Dashboard): void {
    // Faturamento e Lucro por mes
    this.faturamentoChart = {
      type: 'bar',
      data: {
        labels: d.faturamentoPorMes.map(m => m.mes),
        datasets: [
          { label: 'Faturamento', data: d.faturamentoPorMes.map(m => m.faturamento), backgroundColor: '#5b2d8e' },
          { label: 'Lucro', data: d.faturamentoPorMes.map(m => m.lucro), backgroundColor: '#c9a84c' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
    };

    // Top produtos
    this.produtosChart = {
      type: 'bar',
      data: {
        labels: d.produtosMaisVendidos.map(p => p.label.substring(0, 25)),
        datasets: [{ label: 'Qtd Vendida', data: d.produtosMaisVendidos.map(p => p.quantidade), backgroundColor: '#7b4bab' }]
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
    };

    // Top clientes
    this.clientesChart = {
      type: 'bar',
      data: {
        labels: d.clientesMaisCompraram.map(c => c.label.substring(0, 20)),
        datasets: [{ label: 'Valor (R$)', data: d.clientesMaisCompraram.map(c => c.valor), backgroundColor: '#c9a84c' }]
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
    };

    // Pedidos por status
    const statusColors: Record<string, string> = {
      EM_ABERTO: '#e65100', CONFIRMADO: '#5b2d8e', FINALIZADO: '#2e7d32', CANCELADO: '#c62828'
    };
    this.statusChart = {
      type: 'doughnut',
      data: {
        labels: d.pedidosPorStatus.map(s => this.statusLabel(s.status)),
        datasets: [{
          data: d.pedidosPorStatus.map(s => s.quantidade),
          backgroundColor: d.pedidosPorStatus.map(s => statusColors[s.status] || '#999')
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    };

    // Faturamento por vendedor no mês
    if (d.faturamentoPorUsuario.length > 0) {
      const barColors = ['#5b2d8e','#c9a84c','#7b4bab','#2e7d32','#e65100','#1565c0','#c62828','#00796b'];
      this.vendedoresChart = {
        type: 'bar',
        data: {
          labels: d.faturamentoPorUsuario.map(u => u.label),
          datasets: [{
            label: 'Valor Total (R$)',
            data: d.faturamentoPorUsuario.map(u => u.valor),
            backgroundColor: d.faturamentoPorUsuario.map((_, i) => barColors[i % barColors.length])
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      };
    }
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { EM_ABERTO: 'Em Aberto', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', FINALIZADO: 'Finalizado' };
    return m[s] || s;
  }

  get faturamentoLabel(): string {
    return this.filtroAtivo ? `Faturamento ${this.filtroLabel}` : 'Faturamento do Mês';
  }

  get vendedoresChartTitle(): string {
    return this.filtroAtivo
      ? `Faturamento por Vendedor — ${this.filtroLabel}`
      : 'Faturamento por Vendedor — Mês Atual';
  }

  loadDashboard(mes?: number, ano?: number): void {
    this.dashboardService.getDashboard(mes, ano).subscribe(d => {
      this.data = d;
      this.paginaClientesSemCompra = 0;
      this.faturamentoChart = null;
      this.produtosChart = null;
      this.clientesChart = null;
      this.statusChart = null;
      this.vendedoresChart = null;
      this.cdr.detectChanges(); // destrói os canvas sincronamente
      this.buildCharts(d);     // recria com novos dados
    });
  }

  aplicarFiltro(): void {
    if (this.filterMes != null && this.filterAno != null) {
      this.filtroAtivo = true;
      const mesSelecionado = this.meses.find(m => m.value === this.filterMes);
      this.filtroLabel = `${mesSelecionado?.label} de ${this.filterAno}`;
      this.loadDashboard(this.filterMes, this.filterAno);
    }
  }

  limparFiltro(): void {
    this.filterMes = null;
    this.filterAno = null;
    this.filtroAtivo = false;
    this.filtroLabel = '';
    this.loadDashboard();
  }

  get clientesSemCompraPaginados(): Array<{ nome: string; responsavelNome: string | null; dataUltimaCompra: string | null; diasSemComprar: number | null }> {
    const origem = this.data?.clientesSemCompraHaMaisTempo || [];
    const inicio = this.paginaClientesSemCompra * this.itensPorPaginaClientesSemCompra;
    return origem.slice(inicio, inicio + this.itensPorPaginaClientesSemCompra);
  }

  get totalPaginasClientesSemCompra(): number {
    const totalItens = this.data?.clientesSemCompraHaMaisTempo.length || 0;
    return Math.max(1, Math.ceil(totalItens / this.itensPorPaginaClientesSemCompra));
  }

  get intervaloClientesSemCompra(): string {
    const totalItens = this.data?.clientesSemCompraHaMaisTempo.length || 0;
    if (!totalItens) {
      return '0-0 de 0';
    }

    const inicio = this.paginaClientesSemCompra * this.itensPorPaginaClientesSemCompra + 1;
    const fim = Math.min(totalItens, (this.paginaClientesSemCompra + 1) * this.itensPorPaginaClientesSemCompra);
    return `${inicio}-${fim} de ${totalItens}`;
  }

  paginaAnteriorClientesSemCompra(): void {
    if (this.paginaClientesSemCompra > 0) {
      this.paginaClientesSemCompra -= 1;
    }
  }

  proximaPaginaClientesSemCompra(): void {
    if (this.paginaClientesSemCompra < this.totalPaginasClientesSemCompra - 1) {
      this.paginaClientesSemCompra += 1;
    }
  }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }

  async gerarBackup(): Promise<void> {
    if (this.backupEmAndamento) return;
    this.backupEmAndamento = true;
    this.backupPercentual = 0;
    this.backupProgresso = 'Iniciando...';
    try {
      const blob = await this.backupService.gerarBackupZip((tabela, atual, total) => {
        this.backupProgresso = `Exportando ${tabela} (${atual}/${total})`;
        this.backupPercentual = Math.round((atual / total) * 100);
      });
      const dataStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      this.backupService.baixarArquivo(blob, `backup_${dataStr}.zip`);
      this.snackBar.open('Backup gerado com sucesso!', 'OK', { duration: 4000 });
    } catch {
      this.snackBar.open('Erro ao gerar backup.', 'OK', { duration: 5000 });
    } finally {
      this.backupEmAndamento = false;
      this.backupProgresso = '';
      this.backupPercentual = 0;
    }
  }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  navegarGerenciaUsuarios(): void { this.router.navigate(['/gerencia-usuarios']); }
  podeGerenciarUsuarios(): boolean { return this.userRole === 'administrador' || this.userRole === 'gerente'; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
