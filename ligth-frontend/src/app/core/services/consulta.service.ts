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

  constructor(private supabaseService: SupabaseService) {}

  buscarClientes(termo: string): Observable<AutocompleteItem[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.clientesTable)
        .select('id, nome')
        .ilike('nome', `%${termo}%`)
        .limit(10)
    ).pipe(
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
        .select('id, nome')
        .ilike('nome', `%${termo}%`)
        .limit(10)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map(item => ({
          id: item.id,
          label: item.nome
        })) as AutocompleteItem[];
      })
    );
  }

  buscarProdutosComPreco(termo: string): Observable<ProdutoAutocompleteItem[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.produtosTable)
        .select('id, nome, preco_venda, preco_custo')
        .ilike('nome', `%${termo}%`)
        .limit(10)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map(item => ({
          id: item.id,
          label: item.nome,
          valor: item.preco_venda,
          precoCusto: item.preco_custo || 0
        } as ProdutoAutocompleteItem));
      })
    );
  }

  buscarHistorico(clienteId: number, produtoIds: number[]): Observable<HistoricoPedido[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.pedidosTable)
        .select('*')
        .eq('cliente_id', clienteId)
        .in('id', produtoIds.length > 0 ? produtoIds : [0])
        .order('data', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as HistoricoPedido[];
      })
    );
  }
}
