import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Cliente } from '../models/cliente.model';

type ClienteDbRow = {
  id?: number;
  nome: string;
  inadimplente?: boolean | null;
  user_id?: string | null;
  cpf_cnpj?: string | null;
  telefone?: string | null;
  contato?: string | null;
  email?: string | null;
  endereco?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  observacao?: string | null;
  responsavel_id?: string | null;
  data_cadastro?: string | null;
  created_at?: string | null;
};

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly table = 'clientes';

  constructor(private supabaseService: SupabaseService) {}

  listar(responsavelId?: string | null): Observable<Cliente[]> {
    let query = this.supabaseService.getClient()
      .from(this.table)
      .select('*')
      .order('id', { ascending: true });

    if (responsavelId) {
      query = query.eq('responsavel_id', responsavelId);
    }

    return from(query).pipe(
      map(response => {
        if (response.error) throw response.error;
        return ((response.data || []) as ClienteDbRow[]).map(row => this.fromDb(row));
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
        return this.fromDb(response.data as ClienteDbRow);
      })
    );
  }

  criar(cliente: Cliente): Observable<Cliente> {
    return from(this.criarComUsuario(cliente));
  }

  importar(clientes: Cliente[]): Observable<Cliente[]> {
    return from(this.importarComUsuario(clientes));
  }

  atualizar(id: number, cliente: Partial<Cliente>): Observable<Cliente> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update(this.toDb(cliente))
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.fromDb(response.data as ClienteDbRow);
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
        return ((response.data || []) as ClienteDbRow[]).map(row => this.fromDb(row));
      })
    );
  }

  private fromDb(row: ClienteDbRow): Cliente {
    return {
      id: row.id,
      nome: row.nome,
      inadimplente: Boolean(row.inadimplente),
      cpfCnpj: row.cpf_cnpj || '',
      telefone: row.telefone || '',
      contato: row.contato || '',
      email: row.email || '',
      endereco: row.endereco || '',
      logradouro: row.logradouro || '',
      numero: row.numero || '',
      complemento: row.complemento || '',
      bairro: row.bairro || '',
      cidade: row.cidade || '',
      uf: row.uf || '',
      cep: row.cep || '',
      observacao: row.observacao || '',
      responsavelId: row.responsavel_id || null,
      dataCadastro: row.data_cadastro || row.created_at || undefined
    };
  }

  private toDb(cliente: Partial<Cliente>): Partial<ClienteDbRow> {
    return {
      nome: cliente.nome,
      inadimplente: cliente.inadimplente,
      cpf_cnpj: cliente.cpfCnpj,
      telefone: cliente.telefone,
      contato: cliente.contato,
      email: cliente.email,
      endereco: cliente.endereco,
      logradouro: cliente.logradouro,
      numero: cliente.numero,
      complemento: cliente.complemento,
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      uf: cliente.uf,
      cep: cliente.cep,
      observacao: cliente.observacao,
      responsavel_id: cliente.responsavelId,
      data_cadastro: cliente.dataCadastro
    };
  }

  private async criarComUsuario(cliente: Cliente): Promise<Cliente> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.supabaseService.getClient()
      .from(this.table)
      .insert([{ ...this.toDb(cliente), user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return this.fromDb(data as ClienteDbRow);
  }

  private async importarComUsuario(clientes: Cliente[]): Promise<Cliente[]> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.supabaseService.getClient()
      .from(this.table)
      .insert(clientes.map(cliente => ({ ...this.toDb(cliente), user_id: userId })))
      .select();

    if (error) throw error;
    return ((data || []) as ClienteDbRow[]).map(row => this.fromDb(row));
  }

  private async getCurrentUserId(): Promise<string> {
    const { data, error } = await this.supabaseService.getAuth().getUser();
    if (error || !data.user) {
      throw error || new Error('Usuário autenticado não encontrado.');
    }

    return data.user.id;
  }
}
