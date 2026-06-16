import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';

const ROTAS_PERMITIDAS_VENDEDOR = new Set(['/clientes', '/pedidos', '/produtos', '/consulta']);
const ROTAS_PERMITIDAS_AUXILIAR_CLIENTE = new Set(['/clientes']);

export const vendedorRestricaoGuard: CanActivateFn = async (_route, state) => {
  const userManagementService = inject(UserManagementService);
  const router = inject(Router);

  try {
    const usuarioAtual = await userManagementService.obterUsuarioAtualComRole();

    if (!usuarioAtual) {
      router.navigate(['/login']);
      return false;
    }

    if (usuarioAtual.role !== 'vendedor' && usuarioAtual.role !== 'auxiliar_cliente') {
      return true;
    }

    const rotaAtual = `/${state.url.replace(/^\/+/, '').split('?')[0].split('#')[0]}`;
    const rotasPermitidas = usuarioAtual.role === 'auxiliar_cliente'
      ? ROTAS_PERMITIDAS_AUXILIAR_CLIENTE
      : ROTAS_PERMITIDAS_VENDEDOR;

    if (rotasPermitidas.has(rotaAtual)) {
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