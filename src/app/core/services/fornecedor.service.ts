import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Fornecedor } from '../models/fornecedor.model';

type FornecedorDbRow = {
  id?: number;
  nome: string;
  razao_social?: string | null;
  cnpj_cpf?: string | null;
  telefone?: string | null;
  contato?: string | null;
  email?: string | null;
  endereco?: string | null;
  observacao?: string | null;
  responsavel_id?: string | null;
  user_id?: string | null;
  data_cadastro?: string | null;
  created_at?: string | null;
};

@Injectable({ providedIn: 'root' })
export class FornecedorService {
  private readonly table = 'fornecedores';

  constructor(private supabaseService: SupabaseService) {}

  listar(): Observable<Fornecedor[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as FornecedorDbRow[]).map(row => this.fromDb(row));
      })
    );
  }

  criar(fornecedor: Fornecedor): Observable<Fornecedor> {
    return from(this.criarComUsuario(fornecedor));
  }

  importar(fornecedores: Fornecedor[]): Observable<Fornecedor[]> {
    return from(this.importarComUsuario(fornecedores));
  }

  atualizar(id: number, fornecedor: Partial<Fornecedor>): Observable<Fornecedor> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update(this.toDb(fornecedor))
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.fromDb(response.data as FornecedorDbRow);
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

  private fromDb(row: FornecedorDbRow): Fornecedor {
    return {
      id: row.id,
      nome: row.nome,
      razaoSocial: row.razao_social || '',
      cnpjCpf: row.cnpj_cpf || '',
      telefone: row.telefone || '',
      contato: row.contato || '',
      email: row.email || '',
      endereco: row.endereco || '',
      observacao: row.observacao || '',
      responsavelId: row.responsavel_id || null,
      dataCadastro: row.data_cadastro || row.created_at || undefined
    };
  }

  private toDb(fornecedor: Partial<Fornecedor>): Partial<FornecedorDbRow> {
    return {
      nome: fornecedor.nome,
      razao_social: fornecedor.razaoSocial,
      cnpj_cpf: fornecedor.cnpjCpf,
      telefone: fornecedor.telefone,
      contato: fornecedor.contato,
      email: fornecedor.email,
      endereco: fornecedor.endereco,
      observacao: fornecedor.observacao,
      responsavel_id: fornecedor.responsavelId,
      data_cadastro: fornecedor.dataCadastro
    };
  }

  private async criarComUsuario(fornecedor: Fornecedor): Promise<Fornecedor> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.supabaseService.getClient()
      .from(this.table)
      .insert([{ ...this.toDb(fornecedor), user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return this.fromDb(data as FornecedorDbRow);
  }

  private async importarComUsuario(fornecedores: Fornecedor[]): Promise<Fornecedor[]> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.supabaseService.getClient()
      .from(this.table)
      .insert(fornecedores.map(fornecedor => ({ ...this.toDb(fornecedor), user_id: userId })))
      .select();

    if (error) throw error;
    return ((data || []) as FornecedorDbRow[]).map(row => this.fromDb(row));
  }

  private async getCurrentUserId(): Promise<string> {
    const { data, error } = await this.supabaseService.getAuth().getUser();
    if (error || !data.user) {
      throw error || new Error('Usuário autenticado não encontrado.');
    }

    return data.user.id;
  }
}