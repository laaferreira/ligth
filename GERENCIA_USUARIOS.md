# Módulo de Gestão de Usuários

## Visão Geral

Módulo completo para gerenciar usuários da aplicação com sistema de permissões baseado em roles (perfis).

## Funcionalidades

### 1. Três Perfis Disponíveis
- **Administrador**: Acesso total, pode criar qualquer tipo de usuário
- **Gerente**: Pode criar Gerentes e Vendedores, não pode criar Administradores
- **Vendedor**: Sem acesso ao módulo de gerência

### 2. Controle de Acesso
- ✅ Apenas **Administrador** e **Gerente** podem acessar o módulo
- ✅ Apenas **Administrador** pode criar outro **Administrador**
- ✅ **Gerente** pode criar **Gerente** e **Vendedor**
- ✅ Validações implementadas no backend (service)

### 3. Funcionalidades do Módulo

#### Listar Usuários
- Visualizar todos os usuários
- Filtrar por perfil (Administrador, Gerente, Vendedor)
- Filtrar por status (Ativo/Inativo)
- Visualizar data de criação

#### Criar Usuário
- Criação com email, nome, perfil e senha
- Validações de permissão automáticas
- Feedback em tempo real

#### Editar Usuário
- Alterar nome e perfil
- Validações de permissão (ex: Gerente não pode fazer Admin)

#### Gerenciar Status
- Desativar usuário (soft delete)
- Reativar usuário
- Sem exclusão física de dados

## Setup no Supabase

### 1. Criar Tabela `app_users`

Execute no SQL Editor do Supabase:

```sql
CREATE TABLE app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrador', 'gerente', 'vendedor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_is_active ON app_users(is_active);
CREATE INDEX idx_app_users_created_by ON app_users(created_by);
```

### 2. Habilitar RLS (Row Level Security)

```sql
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver todos os usuários da mesma organização
-- (ou ajuste conforme sua necessidade de multi-tenant)
CREATE POLICY "Users can view all users" ON app_users
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins and gerentes can create users" ON app_users
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM app_users WHERE role IN ('administrador', 'gerente')
    )
  );

CREATE POLICY "Users can update their own data" ON app_users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Only admins and gerentes can update other users" ON app_users
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM app_users WHERE role IN ('administrador', 'gerente')
    )
  );
```

### 3. Criar Usuário Administrador Inicial

```sql
-- Após criar um usuário via Auth no Supabase:
INSERT INTO app_users (id, email, nome, role, is_active)
VALUES (
  'YOUR_USER_ID', -- Copie o ID do usuário criado em auth.users
  'admin@example.com',
  'Administrador',
  'administrador',
  true
);
```

## Arquivos do Módulo

```
src/app/
├── core/
│   ├── models/
│   │   └── user.model.ts              ← Interfaces de usuário
│   ├── services/
│   │   └── user-management.service.ts ← Lógica de negócio
│   └── guards/
│       └── gerencia-usuarios.guard.ts  ← Proteção de rota
└── pages/
    └── gerencia-usuarios/
        ├── gerencia-usuarios.component.ts       ← Componente principal
        └── criar-editar-usuario-dialog.component.ts ← Dialog de criação/edição
```

## Estrutura de Dados

### Interfaces

```typescript
type UserRole = 'administrador' | 'gerente' | 'vendedor';

interface AppUser {
  id: string;                // UUID do Supabase Auth
  email: string;
  nome: string;
  role: UserRole;
  created_at: string;        // ISO timestamp
  created_by: string;        // ID do usuário que criou
  is_active: boolean;
}

interface CreateUserRequest {
  email: string;
  nome: string;
  role: UserRole;
  password: string;
}

interface UpdateUserRequest {
  nome?: string;
  role?: UserRole;
  is_active?: boolean;
}
```

## Como Usar

### Na Rota
```typescript
{
  path: 'gerencia-usuarios',
  loadComponent: () => import('./pages/gerencia-usuarios/gerencia-usuarios.component')
    .then(m => m.GerenciaUsuariosComponent),
  canActivate: [authGuard, gerenciaUsuariosGuard]
}
```

### No Menu da Aplicação

Adicione o link apenas para Administrador e Gerente:

```html
<button 
  mat-menu-item 
  routerLink="/gerencia-usuarios"
  *ngIf="(usuarioRole$ | async) === 'administrador' || (usuarioRole$ | async) === 'gerente'"
>
  <mat-icon>people</mat-icon>
  <span>Gestão de Usuários</span>
</button>
```

### Usar o Service em Outro Component

```typescript
constructor(private userManagementService: UserManagementService) {}

// Listar usuários
this.userManagementService.listarUsuarios().subscribe(usuarios => {
  console.log(usuarios);
});

// Obter usuário atual com role
const usuario = await this.userManagementService.obterUsuarioAtualComRole();
console.log(usuario.role);
```

## Validações de Permissão

### Criação de Usuário

| Quem está criando | Pode criar Vendedor | Pode criar Gerente | Pode criar Admin |
|------------------|---------------------|-------------------|------------------|
| Administrador     | ✅ Sim             | ✅ Sim            | ✅ Sim           |
| Gerente           | ✅ Sim             | ✅ Sim            | ❌ Não           |
| Vendedor          | ❌ Não             | ❌ Não            | ❌ Não           |

### Alteração de Role

Mesmas regras da criação aplicam-se

## Eventos e Feedback

- ✅ Mensagens de sucesso/erro com Snackbar
- ✅ Confirmação de desativação de usuário
- ✅ Desabilitação de botões em estados inválidos
- ✅ Feedback visual de tipos de perfil (badges coloridas)
- ✅ Filtros em tempo real

## Segurança

- ✅ Validações no Frontend (UX)
- ✅ Validações no Service (lógica)
- ✅ RLS no Supabase (banco de dados)
- ✅ Soft delete (desativação sem remover dados)
- ✅ Rastreamento de quem criou cada usuário (`created_by`)

## Próximos Passos

1. Executar SQL para criar tabela e RLS
2. Criar usuário administrador inicial
3. Incluir link no menu da aplicação
4. Testar com diferentes perfis
5. Customizar filtros conforme necessário

## Troubleshooting

### "Você não tem permissão para criar um Administrador"
- Você é Gerente tentando criar Admin
- Solução: Use uma conta Administrador

### "Usuário não encontrado"
- Tabela `app_users` pode não estar sincronizada com `auth.users`
- Verifique se o usuário foi criado em ambas as tabelas

### Filtros não funcionam
- Verifique se RLS está configurado corretamente
- Teste a query diretamente no Supabase Console
