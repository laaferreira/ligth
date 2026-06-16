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
    return this.normalizarPercentual(comissao, 'comissão', 100);
  }

  private normalizarMargemVenda(margem: number, faixa: 'ouro' | 'prata' | 'bronze' | 'elite'): number {
    return this.normalizarPercentual(margem, `margem de venda ${faixa}`, 1000);
  }

  private normalizarPercentual(valor: number, label: string, maximo: number): number {
    if (!Number.isFinite(valor)) {
      throw new Error(`Informe ${label} válida.`);
    }

    const valorNormalizado = Number(valor);

    if (valorNormalizado < 0 || valorNormalizado > maximo) {
      throw new Error(`A ${label} deve estar entre 0 e ${maximo}.`);
    }

    return valorNormalizado;
  }

  private fromDb(row: any): AppUser {
    return {
      id: row.id,
      email: row.email,
      nome: row.nome,
      role: row.role,
      comissao: Number(row.comissao ?? 0),
      margemVendaOuro: Number(row.margemVendaOuro ?? row.margem_venda_ouro ?? 35),
      margemVendaPrata: Number(row.margemVendaPrata ?? row.margem_venda_prata ?? 50),
      margemVendaBronze: Number(row.margemVendaBronze ?? row.margem_venda_bronze ?? 100),
      margemVendaElite: Number(row.margemVendaElite ?? row.margem_venda_elite ?? 20),
      created_at: row.created_at,
      created_by: row.created_by,
      is_active: !!row.is_active
    };
  }

  private toDb(payload: UpdateUserRequest): Record<string, unknown> {
    return {
      ...(payload.nome !== undefined ? { nome: payload.nome } : {}),
      ...(payload.role !== undefined ? { role: payload.role } : {}),
      ...(payload.comissao !== undefined ? { comissao: payload.comissao } : {}),
      ...(payload.margemVendaOuro !== undefined ? { margem_venda_ouro: payload.margemVendaOuro } : {}),
      ...(payload.margemVendaPrata !== undefined ? { margem_venda_prata: payload.margemVendaPrata } : {}),
      ...(payload.margemVendaBronze !== undefined ? { margem_venda_bronze: payload.margemVendaBronze } : {}),
      ...(payload.margemVendaElite !== undefined ? { margem_venda_elite: payload.margemVendaElite } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {})
    };
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
    if (usuarioAtual.role === 'vendedor' || usuarioAtual.role === 'auxiliar_cliente') {
      throw new Error('Você não tem permissão para criar usuários');
    }

    if (usuarioAtual.role === 'gerente' && dados.role === 'administrador') {
      throw new Error('Apenas Administradores podem criar Administradores');
    }

    if (!this.emailValido(emailNormalizado)) {
      throw new Error('Informe um e-mail válido sem espaços extras');
    }

    const comissaoNormalizada = this.normalizarComissao(dados.comissao);
    const margemVendaOuroNormalizada = this.normalizarMargemVenda(dados.margemVendaOuro, 'ouro');
    const margemVendaPrataNormalizada = this.normalizarMargemVenda(dados.margemVendaPrata, 'prata');
    const margemVendaBronzeNormalizada = this.normalizarMargemVenda(dados.margemVendaBronze, 'bronze');
    const margemVendaEliteNormalizada = this.normalizarMargemVenda(dados.margemVendaElite, 'elite');

    try {
      const response = await this.supabaseService.invokeFunction<CreateUserRequest, CreateUserFunctionResponse>(
        this.createUserFunctionName,
        {
          email: emailNormalizado,
          nome: dados.nome.trim(),
          role: dados.role,
          comissao: comissaoNormalizada,
          margemVendaOuro: margemVendaOuroNormalizada,
          margemVendaPrata: margemVendaPrataNormalizada,
          margemVendaBronze: margemVendaBronzeNormalizada,
          margemVendaElite: margemVendaEliteNormalizada,
          password: dados.password
        }
      );

      if (!response?.user) {
        throw new Error('A Edge Function não retornou o usuário criado.');
      }

      return this.fromDb(response.user);
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
        return ((response.data || []) as any[]).map(row => this.fromDb(row));
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
        return this.fromDb(response.data);
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

    if (dados.margemVendaOuro !== undefined) {
      payload.margemVendaOuro = this.normalizarMargemVenda(dados.margemVendaOuro, 'ouro');
    }

    if (dados.margemVendaPrata !== undefined) {
      payload.margemVendaPrata = this.normalizarMargemVenda(dados.margemVendaPrata, 'prata');
    }

    if (dados.margemVendaBronze !== undefined) {
      payload.margemVendaBronze = this.normalizarMargemVenda(dados.margemVendaBronze, 'bronze');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.table)
      .update(this.toDb(payload))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb(data);
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
        return this.fromDb(response.data);
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
        return this.fromDb(response.data);
      })
    );
  }

  /**
   * Trocar a senha de um usuário (requer Admin ou Gerente)
   * Gerente não pode alterar senha de Administrador
   */
  trocarSenha(userId: string, novaSenha: string, usuarioAtual: AppUser): Observable<void> {
    return from(this.executarTrocaSenha(userId, novaSenha, usuarioAtual));
  }

  private async executarTrocaSenha(userId: string, novaSenha: string, usuarioAtual: AppUser): Promise<void> {
    if (!['administrador', 'gerente'].includes(usuarioAtual.role)) {
      throw new Error('Sem permissão para trocar senhas.');
    }
    try {
      await this.supabaseService.invokeFunction<{ userId: string; password: string }, { success: boolean }>(
        'admin-update-password',
        { userId, password: novaSenha }
      );
    } catch (error: any) {
      const message = error?.message || '';
      if (message.toLowerCase().includes('functionshttperror') || message.toLowerCase().includes('non-2xx')) {
        throw new Error('Erro na Edge Function. Verifique se ela foi publicada corretamente.');
      }
      throw new Error(message || 'Erro ao trocar a senha.');
    }
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
    return this.fromDb(userData);
  }
}
