import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DashboardService, Dashboard } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatToolbarModule, MatCardModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatTableModule, BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  data: Dashboard | null = null;

  // Charts
  faturamentoChart: ChartConfiguration<'bar'> | null = null;
  produtosChart: ChartConfiguration<'bar'> | null = null;
  clientesChart: ChartConfiguration<'bar'> | null = null;
  statusChart: ChartConfiguration<'doughnut'> | null = null;

  estoqueCols = ['codigo', 'descricao', 'estoque', 'minimo'];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dashboardService.getDashboard().subscribe(d => {
      this.data = d;
      this.buildCharts(d);
    });
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
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { EM_ABERTO: 'Em Aberto', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', FINALIZADO: 'Finalizado' };
    return m[s] || s;
  }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
