export type UserRole = 'administrador' | 'gerente' | 'vendedor' | 'auxiliar_cliente';

export interface AppUser {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  comissao: number;
  margemVendaOuro: number;
  margemVendaPrata: number;
  margemVendaBronze: number;
  margemVendaElite: number;
  created_at: string;
  created_by: string; // ID do usuário que criou
  is_active: boolean;
}

export interface CreateUserRequest {
  email: string;
  nome: string;
  role: UserRole;
  comissao: number;
  margemVendaOuro: number;
  margemVendaPrata: number;
  margemVendaBronze: number;
  margemVendaElite: number;
  password: string;
}

export interface CreateUserFunctionResponse {
  user: AppUser;
}

export interface UpdateUserRequest {
  nome?: string;
  role?: UserRole;
  comissao?: number;
  margemVendaOuro?: number;
  margemVendaPrata?: number;
  margemVendaBronze?: number;
  margemVendaElite?: number;
  is_active?: boolean;
}
