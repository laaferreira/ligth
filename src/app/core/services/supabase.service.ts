import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.key, {
      auth: {
        // Desabilita Web Locks API para evitar falhas em múltiplas abas / browsers sem suporte
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn()
      }
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAuth() {
    return this.supabase.auth;
  }

  // Método genérico para select
  async select<T>(table: string, columns: string = '*', filters?: Record<string, any>) {
    let query = this.supabase.from(table).select(columns);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }

  // Método genérico para insertar
  async insert<T extends Record<string, any>>(table: string, data: T) {
    const { data: result, error } = await this.supabase.from(table).insert([data as any]).select();
    if (error) throw error;
    return result as T[];
  }

  // Método genérico para atualizar
  async update<T extends Record<string, any>>(table: string, id: string, data: Partial<T>) {
    const { data: result, error } = await this.supabase
      .from(table)
      .update(data as any)
      .eq('id', id)
      .select();
    if (error) throw error;
    return result as T[];
  }

  // Método genérico para deletar
  async delete(table: string, id: string) {
    const { error } = await this.supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  // Subscribe a mudanças em tempo real
  subscribe<T>(table: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => callback(payload)
      )
      .subscribe();
  }
}
