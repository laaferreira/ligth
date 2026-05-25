import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { AutocompleteItem, ProdutoAutocompleteItem, HistoricoPedido } from '../models/consulta.model';

@Injectable({ providedIn: 'root' })
export class ConsultaService {
  private readonly clientesTable = 'clientes';
  private readonly produtosTable = 'produtos';
  private readonly pedidosTable = 'pedidos';
  private readonly itensPedidosTable = 'itens_pedidos';

  constructor(private supabaseService: SupabaseService) {}

  buscarClientes(termo: string, responsavelId?: string | null): Observable<AutocompleteItem[]> {
    let query = this.supabaseService.getClient()
      .from(this.clientesTable)
      .select('id, nome')
      .ilike('nome', `%${termo}%`)
      .limit(10);

    if (responsavelId) {
      query = query.eq('responsavel_id', responsavelId);
    }

    return from(query).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map(item => ({
          id: item.id,
          label: item.nome
        })) as AutocompleteItem[];
      })
    );
  }

  buscarProdutos(termo: string): Observable<AutocompleteItem[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.produtosTable)
        .select('id, nome, descricao, codigo, sku')
        .or(`descricao.ilike.%${termo}%,codigo.ilike.%${termo}%,nome.ilike.%${termo}%,sku.ilike.%${termo}%`)
        .limit(10)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map(item => ({
          id: item.id,
          label: this.formatarProdutoLabel(item)
        })) as AutocompleteItem[];
      })
    );
  }

  buscarProdutosComPreco(termo: string): Observable<ProdutoAutocompleteItem[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.produtosTable)
        .select('id, nome, descricao, codigo, sku, preco_venda, precoVenda, preco_custo, precoCusto, quantidadeEstoque, quantidade')
        .or(`descricao.ilike.%${termo}%,codigo.ilike.%${termo}%,nome.ilike.%${termo}%,sku.ilike.%${termo}%`)
        .limit(10)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map(item => ({
          id: item.id,
          label: this.formatarProdutoLabel(item),
          valor: item.preco_venda,
          precoCusto: item.precoCusto ?? item.preco_custo ?? 0,
          quantidadeEstoque: Number(item.quantidadeEstoque ?? item.quantidade ?? 0)
        } as ProdutoAutocompleteItem));
      })
    );
  }

  buscarHistorico(clienteId: number, produtoIds: number[]): Observable<HistoricoPedido[]> {
    return from(this.buscarHistoricoData(clienteId, produtoIds)).pipe(
      map(response => {
        return response;
      })
    );
  }

  private async buscarHistoricoData(clienteId: number, produtoIds: number[]): Promise<HistoricoPedido[]> {
    if (!produtoIds.length) {
      return [];
    }

    const client = this.supabaseService.getClient();
    const pedidosResponse = await client
      .from(this.pedidosTable)
      .select('id, data')
      .eq('cliente_id', clienteId);

    if (pedidosResponse.error) {
      throw pedidosResponse.error;
    }

    const pedidos = (pedidosResponse.data || []) as Array<{ id: number; data?: string | null }>;
    if (!pedidos.length) {
      return [];
    }

    const pedidosPorId = new Map(pedidos.map(pedido => [pedido.id, pedido]));
    const itensResponse = await client
      .from(this.itensPedidosTable)
      .select('pedido_id, produto_id, quantidade, preco_unitario, subtotal, produtos(descricao, nome)')
      .in('pedido_id', pedidos.map(pedido => pedido.id))
      .in('produto_id', produtoIds);

    if (itensResponse.error) {
      throw itensResponse.error;
    }

    const itens = (itensResponse.data || []) as Array<{
      pedido_id?: number | null;
      produto_id?: number | null;
      quantidade?: number | string | null;
      preco_unitario?: number | string | null;
      subtotal?: number | string | null;
      produtos?: { descricao?: string | null; nome?: string | null } | Array<{ descricao?: string | null; nome?: string | null }> | null;
    }>;

    return itens
      .map(item => {
        const pedidoId = item.pedido_id ?? 0;
        const pedido = pedidosPorId.get(pedidoId);
        const produto = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;

        return {
          numeroPedido: String(pedidoId),
          dataPedido: pedido?.data || '',
          descricaoProduto: produto?.descricao || produto?.nome || '',
          quantidade: this.toNumber(item.quantidade),
          valorUnitario: this.toNumber(item.preco_unitario),
          valorTotal: this.toNumber(item.subtotal)
        } as HistoricoPedido;
      })
      .sort((a, b) => String(b.dataPedido).localeCompare(String(a.dataPedido)));
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatarProdutoLabel(item: {
    codigo?: string | null;
    sku?: string | null;
    descricao?: string | null;
    nome?: string | null;
  }): string {
    const codigo = (item.codigo || item.sku || '').trim();
    const descricao = (item.descricao || item.nome || '').trim();

    if (codigo && descricao) {
      return `${codigo} - ${descricao}`;
    }

    return codigo || descricao;
  }
}
