import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { AppUser, CreateUserRequest, UpdateUserRequest, UserRole } from '../models/user.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly table = 'app_users';
  private readonly isolatedAuthClient = createClient(environment.supabase.url, environment.supabase.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-ligth-admin-create-user',
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn()
    }
  });

  constructor(private supabaseService: SupabaseService) {}

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private emailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Criar novo usuário (requer permissão)
   * - Administrador pode criar qualquer perfil
   * - Gerente pode criar Gerente ou Vendedor
   */
  criarUsuario(dados: CreateUserRequest, usuarioAtual: AppUser): Observable<AppUser> {
    return from(this.validarPermissaoCriacaoECriar(dados, usuarioAtual));
  }

  private async validarPermissaoCriacaoECriar(
    dados: CreateUserRequest,
    usuarioAtual: AppUser
  ): Promise<AppUser> {
    const emailNormalizado = this.normalizarEmail(dados.email);

    // Validar permissão
    if (usuarioAtual.role === 'vendedor') {
      throw new Error('Vendedores não podem criar usuários');
    }

    if (usuarioAtual.role === 'gerente' && dados.role === 'administrador') {
      throw new Error('Apenas Administradores podem criar Administradores');
    }

    if (!this.emailValido(emailNormalizado)) {
      throw new Error('Informe um e-mail válido sem espaços extras');
    }

    // Reutiliza um cliente isolado para não sobrescrever a sessão atual nem criar múltiplas instâncias concorrentes.
    const { data: authData, error: authError } = await this.isolatedAuthClient.auth.signUp({
      email: emailNormalizado,
      password: dados.password
    });

    if (authError) {
      console.error('[criarUsuario] Erro Supabase Auth:', authError);

      if (authError.status === 429 || authError.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Limite de criação de usuários atingido no Supabase. Aguarde alguns minutos antes de tentar novamente.');
      }

      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Usuário não retornado pelo Supabase. Verifique se confirmação de e-mail está desabilitada nas configurações de Auth.');
    }

    // Inserir registro em app_users
    const novoUsuario: Partial<AppUser> = {
      id: authData.user.id,
      email: emailNormalizado,
      nome: dados.nome,
      role: dados.role,
      created_by: usuarioAtual.id,
      is_active: true
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.table)
      .insert([novoUsuario as any])
      .select()
      .single();

    if (error) throw error;
    return data as AppUser;
  }

  /**
   * Listar todos os usuários (apenas para Admin e Gerente)
   */
  listarUsuarios(filtros?: { role?: UserRole; is_active?: boolean }): Observable<AppUser[]> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .match(filtros || {})
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []) as AppUser[];
      })
    );
  }

  /**
   * Buscar usuário por ID
   */
  buscarPorId(id: string): Observable<AppUser> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as AppUser;
      })
    );
  }

  /**
   * Atualizar usuário (com validações de permissão)
   */
  atualizarUsuario(
    id: string,
    dados: UpdateUserRequest,
    usuarioAtual: AppUser
  ): Observable<AppUser> {
    return from(this.validarPermissaoAtualizacaoEAtualizar(id, dados, usuarioAtual));
  }

  private async validarPermissaoAtualizacaoEAtualizar(
    id: string,
    dados: UpdateUserRequest,
    usuarioAtual: AppUser
  ): Promise<AppUser> {
    // Validar permissão para alterar role
    if (dados.role) {
      if (usuarioAtual.role === 'vendedor') {
        throw new Error('Vendedores não podem alterar roles');
      }

      if (usuarioAtual.role === 'gerente' && dados.role === 'administrador') {
        throw new Error('Apenas Administradores podem criar Administradores');
      }
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.table)
      .update(dados)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AppUser;
  }

  /**
   * Desativar usuário (soft delete)
   */
  desativarUsuario(id: string): Observable<AppUser> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as AppUser;
      })
    );
  }

  /**
   * Reativar usuário
   */
  reativarUsuario(id: string): Observable<AppUser> {
    return from(
      this.supabaseService.getClient()
        .from(this.table)
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as AppUser;
      })
    );
  }

  /**
   * Obter dados do usuário atual incluindo role
   */
  async obterUsuarioAtualComRole(): Promise<AppUser | null> {
    const { data } = await this.supabaseService.getAuth().getSession();
    if (!data?.session?.user) return null;

    const { data: userData, error } = await this.supabaseService
      .getClient()
      .from(this.table)
      .select('*')
      .eq('id', data.session.user.id)
      .single();

    if (error) return null;
    return userData as AppUser;
  }
}
