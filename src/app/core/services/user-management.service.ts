import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { AppUser, CreateUserFunctionResponse, CreateUserRequest, UpdateUserRequest, UserRole } from '../models/user.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly table = 'app_users';
  private readonly createUserFunctionName = environment.supabase.createUserFunctionName;

  constructor(private supabaseService: SupabaseService) {}

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private emailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private normalizarComissao(comissao: number): number {
    if (!Number.isFinite(comissao)) {
      throw new Error('Informe uma comissão válida.');
    }

    const valorNormalizado = Number(comissao);

    if (valorNormalizado < 0 || valorNormalizado > 100) {
      throw new Error('A comissão deve estar entre 0 e 100.');
    }

    return valorNormalizado;
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

    const comissaoNormalizada = this.normalizarComissao(dados.comissao);

    try {
      const response = await this.supabaseService.invokeFunction<CreateUserRequest, CreateUserFunctionResponse>(
        this.createUserFunctionName,
        {
          email: emailNormalizado,
          nome: dados.nome.trim(),
          role: dados.role,
          comissao: comissaoNormalizada,
          password: dados.password
        }
      );

      if (!response?.user) {
        throw new Error('A Edge Function não retornou o usuário criado.');
      }

      return response.user;
    } catch (error: any) {
      console.error('[criarUsuario] Erro na Edge Function:', error);

      const message = error?.message || '';

      if (message.toLowerCase().includes('functionshttperror') || message.toLowerCase().includes('non-2xx')) {
        throw new Error('A Edge Function de criação de usuários retornou erro. Verifique se ela foi publicada e se usa a service_role key.');
      }

      throw new Error(message || 'Erro ao criar usuário pela Edge Function.');
    }
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

    const payload: UpdateUserRequest = { ...dados };

    if (dados.comissao !== undefined) {
      payload.comissao = this.normalizarComissao(dados.comissao);
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.table)
      .update(payload)
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
