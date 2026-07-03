import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { gerenciaUsuariosGuard } from './core/guards/gerencia-usuarios.guard';
import { vendedorRestricaoGuard } from './core/guards/vendedor-restricao.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard, vendedorRestricaoGuard]
  },
  {
    path: 'consulta',
    loadComponent: () => import('./pages/consulta/consulta.component').then(m => m.ConsultaComponent),
    canActivate: [authGuard, vendedorRestricaoGuard]
  },
  {
    path: 'clientes',
    loadComponent: () => import('./pages/clientes/clientes.component').then(m => m.ClientesComponent),
    canActivate: [authGuard, vendedorRestricaoGuard]
  },
  {
    path: 'fornecedores',
    loadComponent: () => import('./pages/fornecedores/fornecedores.component').then(m => m.FornecedoresComponent),
    canActivate: [authGuard, vendedorRestricaoGuard]
  },
  {
    path: 'produtos',
    loadComponent: () => import('./pages/produtos/produtos.component').then(m => m.ProdutosComponent),
    canActivate: [authGuard, vendedorRestricaoGuard]
  },
  {
    path: 'pedidos',
    loadComponent: () => import('./pages/pedidos/pedidos.component').then(m => m.PedidosComponent),
    canActivate: [authGuard, vendedorRestricaoGuard]
  },
  {
    path: 'estoque',
    loadComponent: () => import('./pages/estoque/estoque.component').then(m => m.EstoqueComponent),
    canActivate: [authGuard, vendedorRestricaoGuard]
  },
  {
    path: 'gerencia-usuarios',
    loadComponent: () => import('./pages/gerencia-usuarios/gerencia-usuarios.component').then(m => m.GerenciaUsuariosComponent),
    canActivate: [authGuard, vendedorRestricaoGuard, gerenciaUsuariosGuard]
  },
  {
    path: 'formas-pagamento',
    loadComponent: () => import('./pages/formas-pagamento/formas-pagamento.component').then(m => m.FormasPagamentoComponent),
    canActivate: [authGuard, vendedorRestricaoGuard, gerenciaUsuariosGuard]
  },
  {
    path: 'formas-de-pagamento',
    loadComponent: () => import('./pages/formas-de-pagamento/formas-de-pagamento.component').then(m => m.FormasDePagamentoComponent),
    canActivate: [authGuard, vendedorRestricaoGuard, gerenciaUsuariosGuard]
  },
  {
    path: 'comissoes',
    loadComponent: () => import('./pages/comissoes/comissoes.component').then(m => m.ComissoesComponent),
    canActivate: [authGuard, vendedorRestricaoGuard, gerenciaUsuariosGuard]
  },
  {
    path: 'vales',
    loadComponent: () => import('./pages/vales/vales.component').then(m => m.ValesComponent),
    canActivate: [authGuard, vendedorRestricaoGuard, gerenciaUsuariosGuard]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
