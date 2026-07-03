import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { CriarValeVendedor, ValeVendedor } from '../models/vale-vendedor.model';

type ValeDbRow = {
  id: number;
  vendedor_id: string;
  valor: number | string;
  observacao?: string | null;
  data_vale: string;
  created_at?: string;
  user_id?: string | null;
};

@Injectable({ providedIn: 'root' })
export class ValeVendedorService {
  private readonly table = 'vales_vendedores';

  constructor(private supabaseService: SupabaseService) {}

  listarRecentes(limit = 50, vendedorId?: string): Observable<ValeVendedor[]> {
    return from(this.listarComNomes(limit, vendedorId));
  }

  listarPorVendedorPeriodo(vendedorId: string, dataInicio: string, dataFim: string): Observable<ValeVendedor[]> {
    return from(this.listarPorPeriodoComNomes(vendedorId, dataInicio, dataFim));
  }

  criar(payload: CriarValeVendedor): Observable<ValeVendedor> {
    return from(this.criarComUsuario(payload));
  }

  private async listarComNomes(limit: number, vendedorId?: string): Promise<ValeVendedor[]> {
    let query = this.supabaseService.getClient()
      .from(this.table)
      .select('id, vendedor_id, valor, observacao, data_vale, created_at, user_id')
      .order('data_vale', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (vendedorId) {
      query = query.eq('vendedor_id', vendedorId);
    }

    const response = await query;
    if (response.error) {
      throw response.error;
    }

    return this.mapWithNames((response.data || []) as ValeDbRow[]);
  }

  private async listarPorPeriodoComNomes(vendedorId: string, dataInicio: string, dataFim: string): Promise<ValeVendedor[]> {
    const response = await this.supabaseService.getClient()
      .from(this.table)
      .select('id, vendedor_id, valor, observacao, data_vale, created_at, user_id')
      .eq('vendedor_id', vendedorId)
      .gte('data_vale', dataInicio)
      .lte('data_vale', dataFim)
      .order('data_vale', { ascending: false })
      .order('id', { ascending: false });

    if (response.error) {
      throw response.error;
    }

    return this.mapWithNames((response.data || []) as ValeDbRow[]);
  }

  private async criarComUsuario(payload: CriarValeVendedor): Promise<ValeVendedor> {
    const { data: authData, error: authError } = await this.supabaseService.getAuth().getUser();
    if (authError || !authData.user) {
      throw authError || new Error('Usuário autenticado não encontrado.');
    }

    const observacao = payload.observacao?.trim() || null;
    const response = await this.supabaseService.getClient()
      .from(this.table)
      .insert([
        {
          vendedor_id: payload.vendedorId,
          valor: Number(payload.valor),
          observacao,
          data_vale: payload.dataVale,
          user_id: authData.user.id
        }
      ])
      .select('id, vendedor_id, valor, observacao, data_vale, created_at, user_id')
      .single();

    if (response.error || !response.data) {
      throw response.error || new Error('Não foi possível registrar o vale.');
    }

    const lista = await this.mapWithNames([response.data as ValeDbRow]);
    return lista[0];
  }

  private async mapWithNames(rows: ValeDbRow[]): Promise<ValeVendedor[]> {
    if (!rows.length) {
      return [];
    }

    const vendedorIds = Array.from(new Set(rows.map(row => row.vendedor_id).filter(Boolean)));
    let nomesPorId = new Map<string, string>();

    if (vendedorIds.length) {
      const usuariosResponse = await this.supabaseService.getClient()
        .from('app_users')
        .select('id, nome')
        .in('id', vendedorIds);

      if (!usuariosResponse.error) {
        nomesPorId = new Map(
          ((usuariosResponse.data || []) as Array<{ id: string; nome: string }>).map(item => [item.id, item.nome])
        );
      }
    }

    return rows.map(row => ({
      id: row.id,
      vendedorId: row.vendedor_id,
      vendedorNome: nomesPorId.get(row.vendedor_id) || 'Vendedor',
      valor: Number(row.valor || 0),
      observacao: row.observacao ?? null,
      dataVale: row.data_vale,
      createdAt: row.created_at,
      userId: row.user_id ?? null
    }));
  }
}
