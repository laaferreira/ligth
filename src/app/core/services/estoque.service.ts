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
    const { data: authData, error: authError } = await this.supabaseService.getAuth().getUser();
    if (authError || !authData.user) {
      throw authError || new Error('Usuário autenticado não encontrado.');
    }

    // Buscar estoque atual antes de movimentar
    const { data: produtoAntes } = await this.supabaseService.getClient()
      .from(this.produtosTable)
      .select('quantidadeEstoque, quantidade')
      .eq('id', produtoId)
      .single();

    const estoqueAnterior = this.obterQuantidadeAtual(produtoAntes ?? {});
    const delta = tipo === 'saida' ? -quantidade : quantidade;
    const estoqueAtualCalc = estoqueAnterior + delta;

    const movimentacao = {
      produto_id: produtoId,
      quantidade: delta,
      preco_compra: precoCompra,
      observacao,
      tipo,
      data: new Date().toISOString(),
      user_id: authData.user.id,
      estoque_anterior: estoqueAnterior,
      estoque_atual: estoqueAtualCalc
    };

    const { data, error } = await this.supabaseService.getClient()
      .from(this.movimentacoesTable)
      .insert([movimentacao])
      .select()
      .single();

    if (error) throw error;

    // Atualizar quantidade em produtos
    if (produtoAntes) {
      await this.supabaseService.getClient()
        .from(this.produtosTable)
        .update({ quantidadeEstoque: estoqueAtualCalc, quantidade: estoqueAtualCalc })
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
      .select('*, produtos(descricao, nome, codigo)')
      .order('data', { ascending: false });

    if (produtoId) {
      query = query.eq('produto_id', produtoId);
    }

    return from(query).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as any[]).map(row => this.mapMovimentacao(row));
      })
    );
  }

  private mapMovimentacao(row: any): Movimentacao {
    const produto = row.produtos as { descricao?: string; nome?: string; codigo?: string } | null;
    const descricao = produto?.descricao || produto?.nome || '';
    const codigo = produto?.codigo || '';
    const produtoDescricao = codigo && descricao ? `${codigo} - ${descricao}` : descricao || codigo || String(row.produto_id ?? '');
    const qtd = Number(row.quantidade ?? 0);

    return {
      id: row.id,
      produtoId: row.produto_id,
      produtoDescricao,
      tipo: String(row.tipo ?? '').toUpperCase(),
      quantidade: Math.abs(qtd),
      estoqueAnterior: row.estoque_anterior != null ? Number(row.estoque_anterior) : (row.estoqueAnterior != null ? Number(row.estoqueAnterior) : 0),
      estoqueAtual: row.estoque_atual != null ? Number(row.estoque_atual) : (row.estoqueAtual != null ? Number(row.estoqueAtual) : 0),
      observacao: row.observacao || '',
      dataMovimentacao: row.data || row.created_at || row.dataMovimentacao || ''
    };
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
