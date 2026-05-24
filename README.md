# LIGHT - Sistema de Gestão Integrada

<div align="center">

![Angular](https://img.shields.io/badge/Angular-17.3-red?style=flat-square&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)
![Material](https://img.shields.io/badge/Material-Design-purple?style=flat-square&logo=materialdesign)
![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-black?style=flat-square&logo=github)

**Uma aplicação web moderna para gerenciamento de clientes, produtos, pedidos e estoque com controle de acesso baseado em roles.**

[📚 Documentação](#documentação) • [🚀 Quick Start](#quick-start) • [🔐 Segurança](#segurança) • [📊 Features](#features)

</div>

---

## 📋 Versão 1.0 - Supabase + GitHub Pages

✨ **O que é novo em maio de 2026:**

- ✅ Backend Spring Boot removido → Supabase serverless
- ✅ Deploy automático → GitHub Pages + CI/CD
- ✅ Novo módulo de gestão de usuários com RBAC
- ✅ 3 perfis: Administrador, Gerente e Vendedor
- ✅ TypeScript strict mode + Angular standalone
- ✅ Material Design 17.3 completo

---

## 📊 Features

### 🔐 Autenticação
- ✅ Login com Email/Senha via Supabase Auth
- ✅ Recuperação de senha
- ✅ Sessão automática e Token refresh
- ✅ Role-based Access Control (RBAC)

### 👥 Gestão de Usuários (NOVO)
- ✅ 3 perfis customizáveis
- ✅ Apenas Admin pode criar outro Admin
- ✅ Gerente cria Gerente e Vendedor
- ✅ Soft delete (desativação sem perda de dados)
- ✅ Auditoria (quem criou, quando)

### 📊 Dashboard
- ✅ KPIs em tempo real
- ✅ Gráficos de vendas e estoque
- ✅ Filtros por período
- ✅ Indicadores de performance

### 👨‍💼 Gestão de Clientes
- ✅ CRUD completo
- ✅ Busca e filtros
- ✅ Histórico de pedidos
- ✅ Validações de dados

### 📦 Gestão de Produtos
- ✅ Cadastro com SKU, preço, estoque
- ✅ Categorias
- ✅ Busca por nome/SKU
- ✅ Imagens (preparado)

### 🛒 Gestão de Pedidos
- ✅ Workflow: Nova → Confirmada → Finalizada
- ✅ Múltiplos itens por pedido
- ✅ Cálculo automático de totais
- ✅ Cancelamento com justificativa

### 📦 Controle de Estoque
- ✅ Movimentações: Entrada/Saída
- ✅ Histórico rastreável
- ✅ Alertas de baixo estoque
- ✅ Ajustes manuais

---

## Tech Stack

```
Frontend:    Angular 17.3 + Material Design
Backend:     Supabase (PostgreSQL + Auth)
Deploy:      GitHub Pages + GitHub Actions
Database:    PostgreSQL com RLS
Styles:      SCSS + Material Theming
Types:       TypeScript 5.4 (strict mode)
```

---

## Quick Start

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Git

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/ligth.git
cd ligth

# 2. Instale as dependências
npm install

# 3. Configure o Supabase (veja SUPABASE_SETUP.md)

# 4. Inicie o servidor
npm start

# Acesse http://localhost:4200
```

### Deploy

```bash
# Build para produção
npm run build:prod

# Deploy automático
git add .
git commit -m "Deploy: novo recurso"
git push origin main

# GitHub Actions fará o deploy automaticamente
# Seu site: https://laaferreira.github.io/ligth/
```

---

## Documentação

### 📚 Guias Principais

| Documento | Propósito |
|-----------|-----------|
| **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** | Setup do banco, SQL de criação |
| **[SUPABASE_RLS.md](./SUPABASE_RLS.md)** | Segurança Row Level Security |
| **[GERENCIA_USUARIOS.md](./GERENCIA_USUARIOS.md)** | Módulo de gestão de usuários |
| **[GUIA_TESTES.md](./GUIA_TESTES.md)** | Checklist de testes |
| **[AVALIACAO_APLICACAO.md](./AVALIACAO_APLICACAO.md)** | Análise técnica (8.35/10) |
| **[RESUMO_MIGRACOES.md](./RESUMO_MIGRACOES.md)** | Mudanças v0.x → v1.0 |

---

## Estrutura do Projeto

```
ligth/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   ├── guards/
│   │   │   └── interceptors/
│   │   ├── pages/
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── clientes/
│   │   │   ├── produtos/
│   │   │   ├── pedidos/
│   │   │   ├── estoque/
│   │   │   ├── consulta/
│   │   │   └── gerencia-usuarios/ (NOVO)
│   │   └── app.routes.ts
│   └── environments/
├── .github/workflows/deploy.yml
├── angular.json
└── package.json
```

---

## 🔐 Segurança

### Controle de Acesso

```
Administrador
├── ✅ Todos os módulos
├── ✅ Criar qualquer usuário
└── ✅ Dashboard completo

Gerente
├── ✅ Clientes, Produtos, Pedidos, Estoque
├── ✅ Criar Gerente e Vendedor
└── ❌ Criar Administrador

Vendedor
├── ✅ Dashboard básico
├── ✅ Visualizar dados
└── ❌ Criar usuários
```

### Proteções
- JWT com auto-refresh
- Row Level Security no banco
- HTTPS obrigatório
- Tokens seguros em localStorage

---

## Scripts npm

```bash
npm start              # Servidor local (port 4200)
npm run build          # Build development
npm run build:prod     # Build otimizado
npm run deploy         # Build + deploy GitHub Pages
```

---

## Checklist Deploy

- [ ] SQL do Supabase executado
- [ ] RLS configurado
- [ ] Usuário admin criado
- [ ] `npm install` sucesso
- [ ] `npm run build:prod` sucesso
- [ ] Testes passam (GUIA_TESTES.md)
- [ ] `git push` para main
- [ ] GitHub Actions rodou
- [ ] App acessível em GitHub Pages

---

## Troubleshooting

### Erro: "Cannot read property 'url' of undefined"
Verifique `environment.ts` - credenciais do Supabase

### Erro: "404 on page refresh"
Verificar se `dist/404.html` existe

### Gestão de usuários não aparece
Você é Vendedor - use conta Admin/Gerente

---

## Performance

- Bundle size: ~150-200KB (gzipped)
- Lighthouse Score: 85-90
- First Paint: <1.5s
- Fully Loaded: <3s

---

## Licença

MIT License - veja [LICENSE](./LICENSE)

---

## Suporte

- 📚 [Documentação](#documentação)
- 🐛 [Abrir issue](https://github.com/seu-usuario/ligth/issues)

---

<div align="center">

**Feito com ❤️ usando Angular + Supabase**

Versão 1.0 | Maio 2026

</div>
- Interface responsiva (desktop + mobile)
- Documentacao Swagger/OpenAPI
