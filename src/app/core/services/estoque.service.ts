import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Produto } from '../models/produto.model';
import { Movimentacao } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class EstoqueService {
  private readonly produtosTable = 'produtos';
  private readonly movimentacoesTable = 'movimentacoes_estoque';

  constructor(private supabaseService: SupabaseService) {}

  entrada(produtoId: number, quantidade: number, precoCompra: number | null, observacao: string): Observable<any> {
    return from(this.registrarMovimentacao('entrada', produtoId, quantidade, precoCompra, observacao));
  }

  saida(produtoId: number, quantidade: number, observacao: string): Observable<any> {
    return from(this.registrarMovimentacao('saida', produtoId, quantidade, null, observacao));
  }

  private async registrarMovimentacao(tipo: string, produtoId: number, quantidade: number, precoCompra: number | null, observacao: string) {
    const movimentacao = {
      produto_id: produtoId,
      quantidade: tipo === 'saida' ? -quantidade : quantidade,
      preco_compra: precoCompra,
      observacao,
      tipo,
      data: new Date().toISOString()
    };

    const { data, error } = await this.supabaseService.getClient()
      .from(this.movimentacoesTable)
      .insert([movimentacao])
      .select()
      .single();

    if (error) throw error;

    // Atualizar quantidade em produtos
    const { data: produto } = await this.supabaseService.getClient()
      .from(this.produtosTable)
      .select('quantidadeEstoque, quantidade')
      .eq('id', produtoId)
      .single();

    if (produto) {
      const quantidadeAtual = this.obterQuantidadeAtual(produto);
      const novaQuantidade = quantidadeAtual + (tipo === 'saida' ? -quantidade : quantidade);
      await this.supabaseService.getClient()
        .from(this.produtosTable)
        .update({ quantidadeEstoque: novaQuantidade, quantidade: novaQuantidade })
        .eq('id', produtoId);
    }

    return data;
  }

  estoqueBaixo(): Observable<Produto[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.produtosTable)
        .select('*')
        .lt('quantidadeEstoque', 10)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Produto[];
      })
    );
  }

  estoqueProduto(produtoId: number): Observable<any> {
    return from(this.obterEstoqueProduto(produtoId));
  }

  historico(produtoId?: number): Observable<Movimentacao[]> {
    let query = this.supabaseService.getClient()
      .from(this.movimentacoesTable)
      .select('*')
      .order('data', { ascending: false });

    if (produtoId) {
      query = query.eq('produto_id', produtoId);
    }

    return from(query).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Movimentacao[];
      })
    );
  }

  private obterQuantidadeAtual(produto: { quantidadeEstoque?: number | null; quantidade?: number | null }): number {
    return Number(produto.quantidadeEstoque ?? produto.quantidade ?? 0);
  }

  private async obterEstoqueProduto(produtoId: number): Promise<{ produtoId: number; estoqueAtual: number; comprometido: number; estoqueFuturo: number }> {
    const client = this.supabaseService.getClient();

    const [{ data: produto, error: produtoError }, { data: pedidos, error: pedidosError }] = await Promise.all([
      client
        .from(this.produtosTable)
        .select('id, quantidadeEstoque, quantidade')
        .eq('id', produtoId)
        .single(),
      client
        .from('pedidos')
        .select('status, itens')
        .in('status', ['EM_ABERTO', 'CONFIRMADO', 'pendente', 'confirmado'])
    ]);

    if (produtoError) {
      throw produtoError;
    }

    if (pedidosError) {
      throw pedidosError;
    }

    const estoqueAtual = this.obterQuantidadeAtual(produto);
    const comprometido = (pedidos || []).reduce((totalPedido, pedido) => {
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      const quantidadeComprometida = itens.reduce((totalItem: number, item: any) => {
        return item?.produtoId === produtoId ? totalItem + Number(item.quantidade || 0) : totalItem;
      }, 0);

      return totalPedido + quantidadeComprometida;
    }, 0);

    return {
      produtoId,
      estoqueAtual,
      comprometido,
      estoqueFuturo: estoqueAtual - comprometido
    };
  }
}
