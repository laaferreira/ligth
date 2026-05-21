# Setup Completo do Supabase

Siga este guia passo a passo para configurar completamente o banco de dados no Supabase.

## Passo 1: Criar as Tabelas

Acesse [Supabase Console](https://supabase.com), vá para **SQL Editor** e execute o seguinte script:

```sql
-- 1. Criar tabela de Clientes
CREATE TABLE clientes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  contato TEXT,
  endereco TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES app_users(id) ON DELETE SET NULL
);

-- 2. Criar tabela de Produtos
CREATE TABLE produtos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_venda DECIMAL(10, 2),
  preco_custo DECIMAL(10, 2),
  quantidade BIGINT DEFAULT 0,
  sku TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Criar tabela de Pedidos
CREATE TABLE pedidos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cliente_id BIGINT REFERENCES clientes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'finalizado', 'cancelado')),
  valor_total DECIMAL(10, 2),
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Criar tabela de Itens de Pedidos
CREATE TABLE itens_pedidos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id BIGINT REFERENCES produtos(id),
  quantidade BIGINT NOT NULL,
  preco_unitario DECIMAL(10, 2),
  subtotal DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Criar tabela de Movimentações de Estoque
CREATE TABLE movimentacoes_estoque (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  produto_id BIGINT REFERENCES produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade BIGINT NOT NULL,
  preco_compra DECIMAL(10, 2),
  observacao TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 6. Criar índices para melhor performance
CREATE INDEX idx_clientes_user_id ON clientes(user_id);
CREATE INDEX idx_clientes_responsavel_id ON clientes(responsavel_id);
CREATE INDEX idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
CREATE INDEX idx_produtos_user_id ON produtos(user_id);
CREATE INDEX idx_pedidos_user_id ON pedidos(user_id);
CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX idx_itens_pedidos_pedido_id ON itens_pedidos(pedido_id);
CREATE INDEX idx_movimentacoes_produto_id ON movimentacoes_estoque(produto_id);
CREATE INDEX idx_movimentacoes_user_id ON movimentacoes_estoque(user_id);
```

## Passo 2: Habilitar Row Level Security (RLS)

Execute este comando para habilitar RLS:

```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
```

## Passo 3: Criar Políticas de Segurança

Consulte o arquivo `SUPABASE_RLS.md` para executar todas as políticas.

## Passo 4: Habilitar Realtime (Opcional)

Se desejar usar recursos em tempo real:

1. No console do Supabase, vá para **Replication**
2. Selecione a tabela
3. Clique em **Enable Realtime**

## Passo 5: Criar um Usuário de Teste

1. Vá para **Authentication > Users**
2. Clique em **Add user**
3. Email: `teste@exemplo.com`
4. Password: seu-senha-segura
5. Auto send invite email: desmarcar
6. Clique em **Create user**

## Passo 6: Verificar Configurações de Banco de Dados

1. Vá para **Project Settings > Database**
2. Anote a URL de conexão
3. As credenciais estão em **Settings > API**

## Dados de Teste (Opcional)

Para popular com dados de teste, execute:

```sql
-- Inserir cliente de teste
INSERT INTO clientes (nome, email, telefone, endereco, user_id)
SELECT
  'Cliente Teste',
  'cliente@teste.com',
  '1234567890',
  'Rua Teste, 123',
  auth.users.id
FROM auth.users
LIMIT 1;

-- Inserir produto de teste
INSERT INTO produtos (nome, descricao, preco_venda, preco_custo, quantidade, sku, user_id)
SELECT
  'Produto Teste',
  'Um produto de teste',
  99.90,
  50.00,
  100,
  'SKU-001',
  auth.users.id
FROM auth.users
LIMIT 1;
```

## Troubleshooting

### Erro: "permission denied for schema public"
- Confirme que RLS está habilitado
- Crie as políticas corretamente

### Erro: "violates foreign key constraint"
- Certifique-se de que os IDs referenciados existem
- Use `REFERENCES ... ON DELETE CASCADE`

### Dados vazios após login
- Verifique se RLS está criada corretamente
- Teste com `Impersonate user` no console

## Próximas Etapas

1. ✅ Tabelas criadas
2. ✅ RLS habilitado
3. ✅ Políticas criadas
4. [ ] Instalar dependências: `npm install`
5. [ ] Fazer build: `npm run build:prod`
6. [ ] Deploy: `git push origin main`
7. [ ] Acessar em: `https://laaferreira.github.io/ligth/`
