export type UserRole = 'administrador' | 'gerente' | 'vendedor';

export interface AppUser {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  created_at: string;
  created_by: string; // ID do usuário que criou
  is_active: boolean;
}

export interface CreateUserRequest {
  email: string;
  nome: string;
  role: UserRole;
  password: string;
}

export interface CreateUserFunctionResponse {
  user: AppUser;
}

export interface UpdateUserRequest {
  nome?: string;
  role?: UserRole;
  is_active?: boolean;
}
