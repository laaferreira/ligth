import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';

export const gerenciaUsuariosGuard: CanActivateFn = async (route, state) => {
  const userManagementService = inject(UserManagementService);
  const router = inject(Router);

  try {
    const usuarioAtual = await userManagementService.obterUsuarioAtualComRole();

    if (!usuarioAtual) {
      // Usuário autenticado mas sem registro em app_users
      console.warn('[gerenciaUsuariosGuard] Usuário não encontrado em app_users. Verifique se foi inserido na tabela.');
      router.navigate(['/dashboard']);
      return false;
    }

    // Apenas Gerente e Administrador acessam
    if (usuarioAtual.role !== 'gerente' && usuarioAtual.role !== 'administrador') {
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[gerenciaUsuariosGuard] Erro ao verificar permissão:', error);
    router.navigate(['/login']);
    return false;
  }
};
