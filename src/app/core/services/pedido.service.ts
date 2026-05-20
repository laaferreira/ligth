import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Pedido, CriarPedido } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly table = 'pedidos';

  constructor(private supabaseService: SupabaseService) {}

  listar(): Observable<Pedido[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .order('id', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Pedido[];
      })
    );
  }

  buscarPorId(id: number): Observable<Pedido> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  criar(pedido: CriarPedido): Observable<Pedido> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .insert([pedido])
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  atualizar(id: number, pedido: Partial<CriarPedido>): Observable<Pedido> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update(pedido)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  confirmar(id: number): Observable<Pedido> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ status: 'confirmado' } as any)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  cancelar(id: number): Observable<Pedido> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ status: 'cancelado' } as any)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
      })
    );
  }

  finalizar(id: number): Observable<Pedido> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ status: 'finalizado' } as any)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Pedido;
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

  buscar(filtros: Record<string, any>): Observable<Pedido[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .match(filtros)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Pedido[];
      })
    );
  }
}
