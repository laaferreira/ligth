import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';
import { environment } from '@env/environment';

export const gerenciaUsuariosGuard: CanActivateFn = async (route, state) => {
  const userManagementService = inject(UserManagementService);
  const router = inject(Router);

  try {
    const usuarioAtual = await userManagementService.obterUsuarioAtualComRole();

    if (!usuarioAtual) {
      if (!environment.production) { console.warn('[gerenciaUsuariosGuard] Usuário não encontrado em app_users.'); }
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
    if (!environment.production) { console.error('[gerenciaUsuariosGuard] Erro ao verificar permissão:', error); }
    router.navigate(['/login']);
    return false;
  }
};
