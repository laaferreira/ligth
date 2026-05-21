import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Produto } from '../models/produto.model';

type ProdutoDbRow = {
  id?: number;
  nome?: string | null;
  descricao?: string | null;
  codigo?: string | null;
  sku?: string | null;
  categoria?: string | null;
  precoCusto?: number | null;
  preco_custo?: number | null;
  precoVenda?: number | null;
  preco_venda?: number | null;
  quantidadeEstoque?: number | null;
  quantidade?: number | null;
  disponivel?: number | null;
  estoqueMaximo?: number | null;
  estoqueMinimo?: number | null;
  ativo?: boolean | null;
  fornecedorId?: number | null;
  fornecedorNome?: string | null;
  user_id?: string | null;
};

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly table = 'produtos';

  constructor(private supabaseService: SupabaseService) {}

  listar(): Observable<Produto[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as ProdutoDbRow[]).map(row => this.fromDb(row));
      })
    );
  }

  buscarPorId(id: number): Observable<Produto> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.fromDb(response.data as ProdutoDbRow);
      })
    );
  }

  criar(produto: Produto): Observable<Produto> {
    return from(this.criarComUsuario(produto));
  }

  importar(produtos: Produto[]): Observable<Produto[]> {
    return from(this.importarComUsuario(produtos));
  }

  atualizar(id: number, produto: Partial<Produto>): Observable<Produto> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update(this.toDb(produto))
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.fromDb(response.data as ProdutoDbRow);
      })
    );
  }

  excluir(id: number): Observable<void> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .delete()
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
      })
    );
  }

  buscar(filtros: Record<string, any>): Observable<Produto[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .match(filtros)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as ProdutoDbRow[]).map(row => this.fromDb(row));
      })
    );
  }

  private fromDb(row: ProdutoDbRow): Produto {
    const descricao = row.descricao || row.nome || '';
    const quantidadeEstoque = row.quantidadeEstoque ?? row.disponivel ?? row.quantidade ?? 0;

    return {
      id: row.id,
      codigo: row.codigo || row.sku || '',
      descricao,
      fornecedorId: row.fornecedorId ?? null,
      fornecedorNome: row.fornecedorNome || undefined,
      categoria: row.categoria || '',
      precoCusto: row.precoCusto ?? row.preco_custo ?? 0,
      precoVenda: row.precoVenda ?? row.preco_venda ?? 0,
      quantidadeEstoque,
      estoqueMaximo: row.estoqueMaximo ?? 0,
      estoqueMinimo: row.estoqueMinimo ?? 0,
      ativo: row.ativo ?? true
    };
  }

  private toDb(produto: Partial<Produto>): Partial<ProdutoDbRow> {
    const descricao = produto.descricao?.trim() || '';
    const codigo = produto.codigo?.trim() || '';
    const quantidadeEstoque = produto.quantidadeEstoque ?? 0;
    const precoCusto = produto.precoCusto ?? 0;
    const precoVenda = produto.precoVenda ?? 0;

    return {
      nome: descricao,
      descricao,
      codigo,
      sku: codigo || undefined,
      categoria: produto.categoria,
      precoCusto,
      preco_custo: precoCusto,
      precoVenda,
      preco_venda: precoVenda,
      quantidadeEstoque,
      quantidade: quantidadeEstoque,
      estoqueMaximo: produto.estoqueMaximo ?? 0,
      estoqueMinimo: produto.estoqueMinimo ?? 0,
      ativo: produto.ativo ?? true,
      fornecedorId: produto.fornecedorId ?? null,
      fornecedorNome: produto.fornecedorNome || null
    };
  }

  private async criarComUsuario(produto: Produto): Promise<Produto> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.supabaseService.getClient()
      .from(this.table)
      .insert([{ ...this.toDb(produto), user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return this.fromDb(data as ProdutoDbRow);
  }

  private async importarComUsuario(produtos: Produto[]): Promise<Produto[]> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.supabaseService.getClient()
      .from(this.table)
      .insert(produtos.map(produto => ({ ...this.toDb(produto), user_id: userId })))
      .select();

    if (error) throw error;
    return ((data || []) as ProdutoDbRow[]).map(row => this.fromDb(row));
  }

  private async getCurrentUserId(): Promise<string> {
    const { data, error } = await this.supabaseService.getAuth().getUser();
    if (error || !data.user) {
      throw error || new Error('Usuário autenticado não encontrado.');
    }

    return data.user.id;
  }
}
