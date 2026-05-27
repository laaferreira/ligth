import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';

const ROTAS_PERMITIDAS_VENDEDOR = new Set(['/clientes', '/pedidos', '/produtos', '/consulta']);

export const vendedorRestricaoGuard: CanActivateFn = async (_route, state) => {
  const userManagementService = inject(UserManagementService);
  const router = inject(Router);

  try {
    const usuarioAtual = await userManagementService.obterUsuarioAtualComRole();

    if (!usuarioAtual) {
      router.navigate(['/login']);
      return false;
    }

    if (usuarioAtual.role !== 'vendedor') {
      return true;
    }

    const rotaAtual = `/${state.url.replace(/^\/+/, '').split('?')[0].split('#')[0]}`;
    if (ROTAS_PERMITIDAS_VENDEDOR.has(rotaAtual)) {
      return true;
    }

    router.navigate(['/clientes']);
    return false;
  } catch (error) {
    console.error('[vendedorRestricaoGuard] Erro ao verificar permissão:', error);
    router.navigate(['/login']);
    return false;
  }
};