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
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as Array<Record<string, any>>)
          .map(row => this.mapProduto(row))
          .filter(produto => produto.quantidadeEstoque <= produto.estoqueMinimo || produto.quantidadeEstoque < 10);
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

  private mapProduto(row: Record<string, any>): Produto {
    return {
      id: row['id'],
      codigo: row['codigo'] || row['sku'] || '',
      descricao: row['descricao'] || row['nome'] || '',
      fornecedorId: row['fornecedorId'] ?? null,
      fornecedorNome: row['fornecedorNome'] || undefined,
      categoria: row['categoria'] || '',
      precoCusto: Number(row['precoCusto'] ?? row['preco_custo'] ?? 0),
      precoVenda: Number(row['precoVenda'] ?? row['preco_venda'] ?? 0),
      quantidadeEstoque: Number(row['quantidadeEstoque'] ?? row['disponivel'] ?? row['quantidade'] ?? 0),
      estoqueMaximo: Number(row['estoqueMaximo'] ?? 0),
      estoqueMinimo: Number(row['estoqueMinimo'] ?? 0),
      ativo: row['ativo'] ?? true
    };
  }

  private async obterEstoqueProduto(produtoId: number): Promise<{ produtoId: number; estoqueAtual: number; comprometido: number; estoqueFuturo: number }> {
    const client = this.supabaseService.getClient();

    const { data: produto, error: produtoError } = await client
      .from(this.produtosTable)
      .select('id, quantidadeEstoque, quantidade')
      .eq('id', produtoId)
      .single();

    if (produtoError) {
      throw produtoError;
    }

    const estoqueAtual = this.obterQuantidadeAtual(produto);
    let comprometido = 0;

    const { data: itensComprometidos } = await client
      .from('itens_pedidos')
      .select('quantidade, pedidos!inner(status)')
      .eq('produto_id', produtoId)
      .in('pedidos.status', ['EM_ABERTO', 'CONFIRMADO', 'pendente', 'confirmado']);

    if (itensComprometidos) {
      comprometido = itensComprometidos.reduce((totalItem, item: any) => {
        return totalItem + Number(item?.quantidade || 0);
      }, 0);
    }

    return {
      produtoId,
      estoqueAtual,
      comprometido,
      estoqueFuturo: estoqueAtual - comprometido
    };
  }
}
