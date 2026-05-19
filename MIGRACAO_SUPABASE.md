# Guia de Migração para Supabase + GitHub Pages

Este documento descreve as mudanças realizadas para migrar a aplicação Ligth para usar **Supabase** como backend e hospedar o frontend no **GitHub Pages**.

## Alterações Realizadas

### 1. **Dependências do Projeto**
- ✅ Adicionado `@supabase/supabase-js` para integração com Supabase
- ✅ Adicionado `angular-cli-ghpages` para deploy no GitHub Pages
- ✅ Atualizado `package.json` com scripts de build e deploy

### 2. **Autenticação (AuthService)**
- ✅ Substituído HTTP REST por Supabase Auth
- ✅ Implementado gerenciamento automático de sessões
- ✅ Adicionados métodos para reset de senha e atualização de perfil
- ✅ Listeners em tempo real para mudanças de autenticação

### 3. **Banco de Dados**
- ✅ Criado `SupabaseService` como camada de abstração
- ✅ Adaptado todos os serviços de dados para usar Supabase:
  - `ClienteService`
  - `ProdutoService`
  - `PedidoService`
  - `EstoqueService`
  - `ConsultaService`
  - `DashboardService`

### 4. **Configuração de Ambiente**
```typescript
// environment.ts / environment.prod.ts
export const environment = {
  production: boolean,
  supabase: {
    url: 'https://jnqlzekeauauxsvpgnpm.supabase.co',
    key: 'sua-chave-publica'
  }
};
```

### 5. **GitHub Pages**
- ✅ Configurado `baseHref: '/ligth/'` em `angular.json`
- ✅ Criado workflow automático em `.github/workflows/deploy.yml`
- ✅ Deploy automático ao fazer push na branch `main`

## Setup Inicial

### Pré-requisitos
```bash
Node.js 18+
npm 9+
Git
```

### Instalação e Build

1. **Instalar dependências:**
```bash
cd ligth-frontend
npm install
```

2. **Fazer build:**
```bash
npm run build:prod
```

3. **Deploy manual no GitHub Pages:**
```bash
npm run deploy
```

## Configuração do Supabase

### Estrutura de Tabelas Esperadas

O Supabase deve conter as seguintes tabelas com RLS (Row Level Security) configurado:

```sql
-- Usuários (gerenciado pelo Supabase Auth)
-- Tabela: auth.users (automática)

-- Clientes
CREATE TABLE clientes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Produtos
CREATE TABLE produtos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_venda DECIMAL(10, 2),
  preco_custo DECIMAL(10, 2),
  quantidade BIGINT DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Pedidos
CREATE TABLE pedidos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cliente_id BIGINT REFERENCES clientes(id),
  status TEXT DEFAULT 'pendente',
  valor_total DECIMAL(10, 2),
  data TIMESTAMP DEFAULT NOW(),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id)
);

-- Movimentações de Estoque
CREATE TABLE movimentacoes_estoque (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  produto_id BIGINT REFERENCES produtos(id),
  tipo TEXT,
  quantidade BIGINT,
  preco_compra DECIMAL(10, 2),
  observacao TEXT,
  data TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);
```

## Fluxo de Autenticação

1. Usuário acessa `/login`
2. Submete email e senha
3. `AuthService.login()` chama `supabaseAuth.signInWithPassword()`
4. Supabase retorna sessão com tokens
5. Guard `authGuard` verifica se usuário está autenticado
6. Interceptor adiciona token JWT em requisições

## Hospedagem no GitHub Pages

### Configuração Automática
- O repositório já contém `.github/workflows/deploy.yml`
- A cada push na `main`, o build é feito e deployado automaticamente
- A URL será: `https://laaferreira.github.io/ligth/`

### Configuração Manual (se necessário)
1. Vá em **Settings > Pages**
2. Em "Build and deployment", selecione:
   - Source: `GitHub Actions`
3. O workflow já está configurado

## Variáveis de Ambiente

### Desenvolvimento
```bash
npm start
# Acessa em http://localhost:4200
```

### Produção
- Automaticamente deployado no GitHub Pages
- Acessar em: `https://laaferreira.github.io/ligth/`

## Troubleshooting

### Erro: "Cannot find module '@supabase/supabase-js'"
```bash
cd ligth-frontend
npm install
```

### Erro: CORS do Supabase
- Verifique que a URL do Supabase está correta em `environment.ts`
- Configure CORS no Supabase: Settings > API

### Deploy não funciona
- Verifique o token do GitHub Actions em Settings > Actions > General
- Confirme que a branch padrão é `main`

## Próximos Passos

1. **Criar tabelas no Supabase** com a estrutura SQL acima
2. **Configurar RLS (Row Level Security)** no Supabase
3. **Executar** `npm install` e `npm run build:prod`
4. **Fazer push** para `main` para ativar deploy automático
5. **Testar** em: `https://laaferreira.github.io/ligth/`

## Referências

- [Documentação Supabase](https://supabase.com/docs)
- [GitHub Pages com Angular](https://angular.io/guide/deployment#deploy-to-github-pages)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
