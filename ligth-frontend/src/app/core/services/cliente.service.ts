import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Cliente } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly table = 'clientes';

  constructor(private supabaseService: SupabaseService) {}

  listar(): Observable<Cliente[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Cliente[];
      })
    );
  }

  buscarPorId(id: number): Observable<Cliente> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Cliente;
      })
    );
  }

  criar(cliente: Cliente): Observable<Cliente> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .insert([cliente])
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Cliente;
      })
    );
  }

  atualizar(id: number, cliente: Partial<Cliente>): Observable<Cliente> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update(cliente)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Cliente;
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

  // Busca com filtros
  buscar(filtros: Record<string, any>): Observable<Cliente[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .match(filtros)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as Cliente[];
      })
    );
  }
}
