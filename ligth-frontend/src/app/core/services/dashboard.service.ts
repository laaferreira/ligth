import { Injectable } from '@angular/core';
import { Observable, from, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface Dashboard {
  totalClientes: number;
  totalProdutos: number;
  totalPedidos: number;
  pedidosAbertos: number;
  faturamentoTotal: number;
  produtosEstoqueBaixo: number;
  produtosMaisVendidos: { label: string; valor: number; quantidade: number }[];
  clientesMaisCompraram: { label: string; valor: number; quantidade: number }[];
  faturamentoPorMes: { mes: string; faturamento: number; lucro: number }[];
  estoqueCritico: { codigo: string; descricao: string; estoque: number; minimo: number }[];
  pedidosPorStatus: { status: string; quantidade: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private supabaseService: SupabaseService) {}

  getDashboard(): Observable<Dashboard> {
    return from(this.fetchDashboardData()).pipe(
      map(data => data as Dashboard)
    );
  }

  private async fetchDashboardData(): Promise<Dashboard> {
    const client = this.supabaseService.getClient();

    // Obter contagens básicas
    const [{ count: totalClientes }, { count: totalProdutos }, { count: totalPedidos }] = await Promise.all([
      client.from('clientes').select('id', { count: 'exact', head: true }),
      client.from('produtos').select('id', { count: 'exact', head: true }),
      client.from('pedidos').select('id', { count: 'exact', head: true })
    ]);

    // Obter pedidos abertos
    const { data: pedidosAbertos } = await client
      .from('pedidos')
      .select('id')
      .in('status', ['pendente', 'confirmado']);

    // Obter produtos com estoque baixo
    const { data: produtosBaixo } = await client
      .from('produtos')
      .select('id')
      .lt('quantidade', 10);

    // Faturamento total (simulado)
    const { data: pedidosFaturamento } = await client
      .from('pedidos')
      .select('valor_total')
      .eq('status', 'finalizado');

    const faturamentoTotal = pedidosFaturamento?.reduce((sum, p) => sum + (p.valor_total || 0), 0) || 0;

    // Produtos mais vendidos (simulado)
    const produtosMaisVendidos: any[] = [];
    const clientesMaisCompraram: any[] = [];
    const faturamentoPorMes: any[] = [];
    const estoqueCritico: any[] = [];
    const pedidosPorStatus: any[] = [];

    // Contar por status
    const { data: statusCounts } = await client
      .from('pedidos')
      .select('status')
      .then(async (result) => {
        if (result.error) return result;
        const statusMap = new Map();
        result.data?.forEach(p => {
          statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
        });
        return {
          data: Array.from(statusMap).map(([status, quantidade]) => ({ status, quantidade }))
        };
      });

    return {
      totalClientes: totalClientes || 0,
      totalProdutos: totalProdutos || 0,
      totalPedidos: totalPedidos || 0,
      pedidosAbertos: pedidosAbertos?.length || 0,
      faturamentoTotal,
      produtosEstoqueBaixo: produtosBaixo?.length || 0,
      produtosMaisVendidos,
      clientesMaisCompraram,
      faturamentoPorMes,
      estoqueCritico,
      pedidosPorStatus: statusCounts || []
    };
  }
}
