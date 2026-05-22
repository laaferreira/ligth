import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface Dashboard {
  totalClientes: number;
  totalProdutos: number;
  totalPedidos: number;
  pedidosAbertos: number;
  faturamentoTotal: number;
  custoTotalEstoque: number;
  valorPrevistoFaturamento: number;
  valorPotencialEstoqueVenda: number;
  produtosEstoqueBaixo: number;
  produtosMaisVendidos: { label: string; valor: number; quantidade: number }[];
  clientesMaisCompraram: { label: string; valor: number; quantidade: number }[];
  faturamentoPorMes: { mes: string; faturamento: number; lucro: number }[];
  estoqueCritico: { codigo: string; descricao: string; estoque: number; minimo: number }[];
  pedidosPorStatus: { status: string; quantidade: number }[];
}

type PedidoDashboardRow = {
  id?: number | null;
  cliente_id?: number | null;
  status?: string | null;
  valor_total?: number | string | null;
  data?: string | null;
};

type ItemPedidoDashboardRow = {
  pedido_id?: number | null;
  produto_id?: number | null;
  quantidade?: number | string | null;
  preco_unitario?: number | string | null;
  subtotal?: number | string | null;
};

type ProdutoDashboardRow = {
  id?: number | null;
  nome?: string | null;
  descricao?: string | null;
  codigo?: string | null;
  sku?: string | null;
  quantidade?: number | string | null;
  quantidadeEstoque?: number | string | null;
  disponivel?: number | string | null;
  estoqueMinimo?: number | string | null;
  preco_custo?: number | string | null;
  precoCusto?: number | string | null;
  preco_venda?: number | string | null;
  precoVenda?: number | string | null;
};

type ClienteDashboardRow = {
  id?: number | null;
  nome?: string | null;
};

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

    const [
      clientesCountResponse,
      produtosCountResponse,
      pedidosCountResponse,
      clientesResponse,
      produtosResponse,
      pedidosResponse,
      itensResponse
    ] = await Promise.all([
      client.from('clientes').select('id', { count: 'exact', head: true }),
      client.from('produtos').select('id', { count: 'exact', head: true }),
      client.from('pedidos').select('id', { count: 'exact', head: true }),
      client.from('clientes').select('id, nome'),
      client.from('produtos').select('*'),
      client.from('pedidos').select('id, cliente_id, status, valor_total, data'),
      client.from('itens_pedidos').select('pedido_id, produto_id, quantidade, preco_unitario, subtotal')
    ]);

    if (clientesResponse.error) throw clientesResponse.error;
    if (produtosResponse.error) throw produtosResponse.error;
    if (pedidosResponse.error) throw pedidosResponse.error;
    if (itensResponse.error) throw itensResponse.error;

    const totalClientes = clientesCountResponse.count || 0;
    const totalProdutos = produtosCountResponse.count || 0;
    const totalPedidos = pedidosCountResponse.count || 0;

    const clientes = (clientesResponse.data || []) as ClienteDashboardRow[];
    const produtos = (produtosResponse.data || []) as ProdutoDashboardRow[];
    const pedidos = (pedidosResponse.data || []) as PedidoDashboardRow[];
    const itensPedidos = (itensResponse.data || []) as ItemPedidoDashboardRow[];

    const clientesPorId = new Map<number, ClienteDashboardRow>();
    clientes.forEach(cliente => {
      if (cliente.id != null) {
        clientesPorId.set(cliente.id, cliente);
      }
    });

    const produtosPorId = new Map<number, ProdutoDashboardRow>();
    produtos.forEach(produto => {
      if (produto.id != null) {
        produtosPorId.set(produto.id, produto);
      }
    });

    const pedidosPorId = new Map<number, PedidoDashboardRow>();
    pedidos.forEach(pedido => {
      if (pedido.id != null) {
        pedidosPorId.set(pedido.id, pedido);
      }
    });

    const pedidosAbertos = pedidos.filter(pedido => {
      const status = this.normalizeStatus(pedido.status);
      return status === 'EM_ABERTO' || status === 'CONFIRMADO';
    }).length;

    const custoTotalEstoque = produtos.reduce((sum, produto) => {
      const quantidade = this.parseNumeric(produto.quantidadeEstoque ?? produto.disponivel ?? produto.quantidade);
      const precoCusto = this.parseNumeric(produto.precoCusto ?? produto.preco_custo);
      return sum + quantidade * precoCusto;
    }, 0);

    const valorPotencialEstoqueVenda = produtos.reduce((sum, produto) => {
      const quantidade = this.parseNumeric(produto.quantidadeEstoque ?? produto.disponivel ?? produto.quantidade);
      const precoVenda = this.parseNumeric(produto.precoVenda ?? produto.preco_venda);
      return sum + quantidade * precoVenda;
    }, 0);

    const valorPrevistoFaturamento = pedidos.reduce((sum, pedido) => {
      const status = this.normalizeStatus(pedido.status);
      if (status !== 'EM_ABERTO' && status !== 'CONFIRMADO') {
        return sum;
      }

      return sum + this.parseNumeric(pedido.valor_total);
    }, 0);

    const faturamentoTotal = pedidos.reduce((sum, pedido) => {
      const status = this.normalizeStatus(pedido.status);
      if (status !== 'FINALIZADO') {
        return sum;
      }

      return sum + this.parseNumeric(pedido.valor_total);
    }, 0);

    const pedidosPorStatusMap = new Map<string, number>();
    pedidos.forEach(pedido => {
      const status = this.normalizeStatus(pedido.status) || 'SEM_STATUS';
      pedidosPorStatusMap.set(status, (pedidosPorStatusMap.get(status) || 0) + 1);
    });
    const pedidosPorStatus = Array.from(pedidosPorStatusMap.entries()).map(([status, quantidade]) => ({ status, quantidade }));

    const produtosMaisVendidosMap = new Map<number, { label: string; valor: number; quantidade: number }>();
    const clientesMaisCompraramMap = new Map<number, { label: string; valor: number; quantidade: number }>();
    const faturamentoPorMesMap = new Map<string, { faturamento: number; lucro: number }>();

    itensPedidos.forEach(item => {
      const pedidoId = item.pedido_id ?? 0;
      const pedido = pedidosPorId.get(pedidoId);
      if (!pedido) {
        return;
      }

      const status = this.normalizeStatus(pedido.status);
      if (status === 'CANCELADO') {
        return;
      }

      const produtoId = item.produto_id ?? 0;
      const produto = produtosPorId.get(produtoId);
      const quantidade = this.parseNumeric(item.quantidade);
      const subtotal = this.parseNumeric(item.subtotal) || quantidade * this.parseNumeric(item.preco_unitario);
      const precoCusto = this.parseNumeric(produto?.precoCusto ?? produto?.preco_custo);
      const custoTotalItem = quantidade * precoCusto;
      const produtoLabel = produto?.descricao || produto?.nome || produto?.codigo || produto?.sku || `Produto ${produtoId}`;

      const produtoAtual = produtosMaisVendidosMap.get(produtoId) || { label: produtoLabel, valor: 0, quantidade: 0 };
      produtoAtual.quantidade += quantidade;
      produtoAtual.valor += subtotal;
      produtosMaisVendidosMap.set(produtoId, produtoAtual);

      const clienteId = pedido.cliente_id ?? 0;
      const cliente = clientesPorId.get(clienteId);
      const clienteLabel = cliente?.nome || `Cliente ${clienteId}`;
      const clienteAtual = clientesMaisCompraramMap.get(clienteId) || { label: clienteLabel, valor: 0, quantidade: 0 };
      clienteAtual.valor += subtotal;
      clienteAtual.quantidade += quantidade;
      clientesMaisCompraramMap.set(clienteId, clienteAtual);

      if (status === 'FINALIZADO') {
        const monthKey = this.toMonthKey(pedido.data);
        const monthAtual = faturamentoPorMesMap.get(monthKey) || { faturamento: 0, lucro: 0 };
        monthAtual.faturamento += subtotal;
        monthAtual.lucro += subtotal - custoTotalItem;
        faturamentoPorMesMap.set(monthKey, monthAtual);
      }
    });

    const produtosMaisVendidos = Array.from(produtosMaisVendidosMap.values())
      .sort((a, b) => b.quantidade - a.quantidade || b.valor - a.valor)
      .slice(0, 8);

    const clientesMaisCompraram = Array.from(clientesMaisCompraramMap.values())
      .sort((a, b) => b.valor - a.valor || b.quantidade - a.quantidade)
      .slice(0, 8);

    const faturamentoPorMes = this.buildLastSixMonths(faturamentoPorMesMap);

    const estoqueCritico = produtos
      .map(produto => {
        const estoque = this.parseNumeric(produto.quantidadeEstoque ?? produto.disponivel ?? produto.quantidade);
        const minimo = this.parseNumeric(produto.estoqueMinimo);

        return {
          codigo: produto.codigo || produto.sku || '-',
          descricao: produto.descricao || produto.nome || 'Produto sem descricao',
          estoque,
          minimo
        };
      })
      .filter(produto => produto.estoque <= produto.minimo)
      .sort((a, b) => a.estoque - b.estoque)
      .slice(0, 10);

    const produtosEstoqueBaixo = estoqueCritico.length;

    return {
      totalClientes,
      totalProdutos,
      totalPedidos,
      pedidosAbertos,
      faturamentoTotal,
      custoTotalEstoque,
      valorPrevistoFaturamento,
      valorPotencialEstoqueVenda,
      produtosEstoqueBaixo,
      produtosMaisVendidos,
      clientesMaisCompraram,
      faturamentoPorMes,
      estoqueCritico,
      pedidosPorStatus
    };
  }

  private normalizeStatus(status?: string | null): string {
    const normalized = String(status || '').trim().toUpperCase();

    if (normalized === 'PENDENTE') {
      return 'EM_ABERTO';
    }

    return normalized;
  }

  private parseNumeric(value: unknown, fallback = 0): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }

    if (value == null) {
      return fallback;
    }

    const normalized = String(value)
      .replace(/R\$/gi, '')
      .replace(/\s+/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.')
      .trim();

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toMonthKey(value?: string | null): string {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      const fallback = new Date();
      return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`;
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private buildLastSixMonths(faturamentoPorMesMap: Map<string, { faturamento: number; lucro: number }>) {
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });
    const resultado: { mes: string; faturamento: number; lucro: number }[] = [];
    const now = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const reference = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`;
      const valor = faturamentoPorMesMap.get(key) || { faturamento: 0, lucro: 0 };

      resultado.push({
        mes: formatter.format(reference).replace('.', ''),
        faturamento: valor.faturamento,
        lucro: valor.lucro
      });
    }

    return resultado;
  }
}
