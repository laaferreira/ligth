import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'consulta',
    loadComponent: () => import('./pages/consulta/consulta.component').then(m => m.ConsultaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'clientes',
    loadComponent: () => import('./pages/clientes/clientes.component').then(m => m.ClientesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'produtos',
    loadComponent: () => import('./pages/produtos/produtos.component').then(m => m.ProdutosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pedidos',
    loadComponent: () => import('./pages/pedidos/pedidos.component').then(m => m.PedidosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'estoque',
    loadComponent: () => import('./pages/estoque/estoque.component').then(m => m.EstoqueComponent),
    canActivate: [authGuard]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
