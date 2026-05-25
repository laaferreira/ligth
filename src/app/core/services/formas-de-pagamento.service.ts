import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { FormaPagamento } from '../models/forma-pagamento.model';

type FormaDbRow = {
  id: number;
  descricao: string;
  ativo: boolean;
  created_at?: string;
  user_id?: string | null;
};

@Injectable({ providedIn: 'root' })
export class FormasDePagamentoService {
  private readonly table = 'formas_pagamento';

  constructor(private supabaseService: SupabaseService) {}

  listar(apenasAtivas = false): Observable<FormaPagamento[]> {
    let query = this.supabaseService.getClient()
      .from(this.table)
      .select('id, descricao, ativo, created_at')
      .order('descricao', { ascending: true });

    if (apenasAtivas) {
      query = query.eq('ativo', true);
    }

    return from(query).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as FormaDbRow[]).map(row => this.fromDb(row));
      })
    );
  }

  criar(descricao: string): Observable<FormaPagamento> {
    return from(this.criarComUsuario(descricao.trim()));
  }

  desativar(id: number): Observable<FormaPagamento> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ ativo: false })
        .eq('id', id)
        .select('id, descricao, ativo, created_at')
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.fromDb(response.data as FormaDbRow);
      })
    );
  }

  reativar(id: number): Observable<FormaPagamento> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ ativo: true })
        .eq('id', id)
        .select('id, descricao, ativo, created_at')
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.fromDb(response.data as FormaDbRow);
      })
    );
  }

  private async criarComUsuario(descricao: string): Promise<FormaPagamento> {
    const { data: authData, error: authError } = await this.supabaseService.getAuth().getUser();
    if (authError || !authData.user) {
      throw authError || new Error('Usuário autenticado não encontrado.');
    }

    const { data, error } = await this.supabaseService.getClient()
      .from(this.table)
      .insert([{ descricao, ativo: true, user_id: authData.user.id }])
      .select('id, descricao, ativo, created_at')
      .single();

    if (error) throw error;
    return this.fromDb(data as FormaDbRow);
  }

  private fromDb(row: FormaDbRow): FormaPagamento {
    return {
      id: row.id,
      descricao: row.descricao,
      ativo: row.ativo,
      createdAt: row.created_at
    };
  }
}
