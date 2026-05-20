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
      .select('quantidade')
      .eq('id', produtoId)
      .single();

    if (produto) {
      const novaQuantidade = produto.quantidade + (tipo === 'saida' ? -quantidade : quantidade);
      await this.supabaseService.getClient()
        .from(this.produtosTable)
        .update({ quantidade: novaQuantidade })
        .eq('id', produtoId);
    }

    return data;
  }

  estoqueBaixo(): Observable<Produto[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.produtosTable)
        .select('*')
        .lt('quantidade', 10)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Produto[];
      })
    );
  }

  estoqueProduto(produtoId: number): Observable<any> {
    return from(
      this.supabaseService.getClient()
        .from(this.produtosTable)
        .select('id, quantidade')
        .eq('id', produtoId)
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return {
          produtoId: response.data.id,
          estoqueAtual: response.data.quantidade,
          comprometido: 0,
          estoqueFuturo: response.data.quantidade
        };
      })
    );
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
}
