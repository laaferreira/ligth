import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Produto } from '../models/produto.model';

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
        return (response.data || []) as Produto[];
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
        return response.data as Produto;
      })
    );
  }

  criar(produto: Produto): Observable<Produto> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .insert([produto])
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Produto;
      })
    );
  }

  atualizar(id: number, produto: Partial<Produto>): Observable<Produto> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update(produto)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Produto;
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
        return (response.data || []) as Produto[];
      })
    );
  }
}
