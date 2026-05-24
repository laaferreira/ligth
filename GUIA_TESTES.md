# 🧪 Guia de Testes - LIGHT

**Última atualização**: 20/05/2026

---

## 📋 Checklists de Teste

### 1️⃣ Setup Inicial

- [ ] `npm install` executado com sucesso
- [ ] Sem erros de TypeScript (`ng build` sem erros)
- [ ] Servidor local roda (`ng serve`)
- [ ] Acessível em `http://localhost:4200`

### 2️⃣ Autenticação

#### Login
- [ ] Página de login carrega corretamente
- [ ] Email obrigatório
- [ ] Senha obrigatória (mínimo 6 caracteres)
- [ ] Botão desativado com campos vazios
- [ ] Erro ao login com credenciais inválidas
- [ ] Sucesso ao login com credenciais válidas
- [ ] Redirecionado para dashboard após sucesso
- [ ] Token JWT armazenado no localStorage

#### Logout
- [ ] Botão logout visível no menu
- [ ] Logout limpa token
- [ ] Redirecionado para login
- [ ] Dados do usuário removidos

#### Reset de Senha
- [ ] Link "Esqueceu a senha?" visível
- [ ] Email obrigatório
- [ ] Email de reset enviado (verificar em Supabase)
- [ ] Link de reset funciona

### 3️⃣ Dashboard

- [ ] Dashboard carrega após login
- [ ] KPIs exibem números corretos
- [ ] Gráficos renderizam sem erro
- [ ] Dados atualizam em tempo real
- [ ] Menu lateral navegação funciona

### 4️⃣ Gestão de Clientes

#### Listagem
- [ ] Tabela carrega com dados
- [ ] Paginação funciona
- [ ] Ordenação por coluna funciona
- [ ] Busca filtra por nome/email

#### Criar
- [ ] Botão "Novo Cliente" visível
- [ ] Modal abre com formulário vazio
- [ ] Validação de campos obrigatórios
- [ ] Cliente criado com sucesso
- [ ] Tabela atualiza com novo cliente

#### Editar
- [ ] Botão editar abre modal com dados
- [ ] Campos carregam dados atuais
- [ ] Edição salva com sucesso
- [ ] Tabela atualiza

#### Deletar
- [ ] Botão delete disponível
- [ ] Confirmação solicita verificação
- [ ] Cliente deletado com sucesso
- [ ] Tabela atualiza

### 5️⃣ Gestão de Produtos

- [ ] Seguir mesmo checklist de Clientes
- [ ] Campos específicos (SKU, Preço, Estoque)
- [ ] Validações numéricas funcionam

### 6️⃣ Gestão de Pedidos

- [ ] Listagem carrega com status
- [ ] Workflow: Nova → Confirmado → Finalizado
- [ ] Cancelamento funciona
- [ ] Itens do pedido exibem corretamente
- [ ] Total do pedido calcula correto

### 7️⃣ Estoque

- [ ] Movimentações carregam
- [ ] Entrada/Saída registram
- [ ] Saldo atualiza
- [ ] Histórico rastreável

### 8️⃣ Consultas/Autocomplete

- [ ] Busca por cliente autocompleta
- [ ] Busca por produto autocompleta
- [ ] Requisições otimizadas (não faz request a cada letra)

### 9️⃣ 🆕 Gestão de Usuários (NOVO)

#### Acesso ao Módulo
- [ ] Administrador acessa módulo
- [ ] Gerente acessa módulo
- [ ] Vendedor **NÃO** acessa (redirecionado)
- [ ] Não autenticado redirecionado para login

#### Listagem de Usuários
- [ ] Tabela carrega com todos os usuários
- [ ] Colunas corretas: email, nome, perfil, status, ações
- [ ] Badges de perfil com cores certas:
  - Purple = Administrador
  - Blue = Gerente
  - Green = Vendedor
- [ ] Filtro por perfil funciona
- [ ] Filtro por status (ativo/inativo) funciona
- [ ] Combinação de filtros funciona

#### Criar Usuário (Admin)
- [ ] Dialog abre ao clicar "Novo Usuário"
- [ ] Email obrigatório e validado
- [ ] Nome obrigatório
- [ ] Rol obrigatório
- [ ] Senha obrigatório (mín 6 caracteres)
- [ ] Admin consegue criar: Vendedor ✅ Gerente ✅ Administrador ✅
- [ ] Feedback de sucesso exibido
- [ ] Tabela atualiza

#### Criar Usuário (Gerente)
- [ ] Gerente consegue criar: Vendedor ✅ Gerente ✅
- [ ] Gerente **NÃO** consegue criar: Administrador ❌
- [ ] Dropdown role mostra apenas opções permitidas
- [ ] Feedback de erro se tentar criar Admin

#### Editar Usuário
- [ ] Dialog abre com dados atuais
- [ ] Email **desabilitado** (não pode mudar)
- [ ] Nome editável
- [ ] Rol editável (com validações)
- [ ] Mudanças salvas corretamente

#### Desativar/Reativar Usuário
- [ ] Botão "Desativar" visível para usuários ativos
- [ ] Confirmação solicitada
- [ ] Usuário desativado sem ser deletado
- [ ] Status muda em tempo real
- [ ] Botão "Reativar" aparece para inativos
- [ ] Reativação funciona

#### Permissões Cruzadas
- [ ] Administrador consegue criar outro Administrador ✅
- [ ] Gerente **não consegue** criar Administrador ❌
- [ ] Mensagem clara sobre permissão negada
- [ ] Vendedor vê mensagem "sem acesso"

---

## 🚀 Testes de Performance

### Build
```bash
npm run build:prod
```
- [ ] Build completa sem erros
- [ ] Sem warnings críticos
- [ ] dist/ pasta criada
- [ ] Arquivos minificados

### Bundle Size
- [ ] `main.*.js` < 150KB
- [ ] Total < 300KB (gzipped)

### Tempo de Carregamento
- [ ] First Paint < 1.5s
- [ ] Fully Loaded < 3s

---

## 🔐 Testes de Segurança

### Autenticação
- [ ] Sem token não acessa rotas protegidas
- [ ] Token expirado redirecionado para login
- [ ] Refresh token automático funciona
- [ ] Logout limpa tudo (localStorage, sessionStorage)

### CORS
- [ ] Requisições para Supabase funcionam
- [ ] Sem erro de CORS no console

### XSS
- [ ] Dados injetados de usuários são escapados
- [ ] HTML não executado em campos

### Permissões (RBAC)
- [ ] Vendedor não acessa gestão de usuários
- [ ] Gerente não consegue criar Admin
- [ ] Mudança de role não concede acesso imediato
- [ ] Logout remove todas as permissões

---

## 🌐 Testes de Responsividade

### Desktop (1920x1080)
- [ ] Layout correto
- [ ] Tabelas legíveis
- [ ] Ícones proporcionais

### Tablet (768x1024)
- [ ] Sidebar colapsível
- [ ] Tabelas com scroll horizontal
- [ ] Dialogs adaptados

### Mobile (375x667)
- [ ] Menu hambúrguer funciona
- [ ] Botões clicáveis
- [ ] Formulários usáveis
- [ ] Sem horizontal scroll

### Testes em Browsers
- [ ] Chrome / Edge (Chromium)
- [ ] Firefox
- [ ] Safari (se possível)

---

## 🗄️ Testes de Banco de Dados

### Conexão
- [ ] URL do Supabase está correta
- [ ] Chave pública está válida
- [ ] Sem erros de conexão no console

### Operações CRUD
- [ ] Create: Novo registro inserido
- [ ] Read: Dados carregam corretamente
- [ ] Update: Alterações persistem
- [ ] Delete: Registros removidos (ou soft-deleted)

### Relacionamentos
- [ ] Cliente → Pedidos funciona
- [ ] Pedido → Itens funciona
- [ ] Produto → Estoque funciona
- [ ] User → Created_by rastreável

### RLS
- [ ] Usuário só vê seus dados
- [ ] Supabase reject queries não autorizadas
- [ ] Logs do Supabase sem errors de RLS

---

## 📊 Testes de Fluxos Completos

### Fluxo de Novo Usuário (Admin)

1. [ ] Admin login
2. [ ] Acessa "Gestão de Usuários"
3. [ ] Clica "Novo Usuário"
4. [ ] Preenche: email, nome, rol = Gerente, senha
5. [ ] Clica "Salvar"
6. [ ] Sucesso exibido
7. [ ] Novo gerente aparece na tabela
8. [ ] Novo gerente consegue fazer login
9. [ ] Novo gerente vê seu nome no dashboard

### Fluxo de Vendedor (Restrito)

1. [ ] Vendedor login
2. [ ] Tenta acessar /gerencia-usuarios
3. [ ] Redirecionado para /dashboard
4. [ ] Menu não mostra "Gestão de Usuários"
5. [ ] Vendedor só acessa módulos permitidos

### Fluxo de Pedido

1. [ ] Gerente login
2. [ ] Cria novo cliente
3. [ ] Cria novo pedido (cliente + produtos)
4. [ ] Confirma pedido
5. [ ] Finaliza pedido
6. [ ] Estoque atualiza
7. [ ] Dashboard reflete KPIs

---

## 🐛 Testes de Erro

### Campos Obrigatórios
- [ ] Erro ao deixar campo vazio
- [ ] Mensagem clara de erro
- [ ] Botão save desativado

### Validação
- [ ] Email inválido rejeitado
- [ ] Números em campos de texto flagged
- [ ] Senhas < 6 caracteres rejeitadas

### Network
- [ ] Sem internet: erro exibido
- [ ] Timeout: retry automático ou erro
- [ ] 401 Unauthorized: logout automático
- [ ] 403 Forbidden: mensagem de acesso negado
- [ ] 500 Server Error: mensagem genérica

### Edge Cases
- [ ] Criar usuário com email duplicado: erro
- [ ] Editar usuário que foi deletado: erro
- [ ] Logout enquanto fazendo requisição: funciona
- [ ] Abrir 2 tabs e fazer login: ambas sincronizam

---

## ✅ Checklist de Deploy

- [ ] Testes acima passam 100%
- [ ] Sem erros em console (F12)
- [ ] Build `npm run build:prod` sucesso
- [ ] Arquivo dist/index.html existe
- [ ] Arquivo dist/404.html existe
- [ ] Git commit com mensagem clara
- [ ] Git push para main
- [ ] GitHub Actions workflow rodar
- [ ] Deploy em GitHub Pages sucesso
- [ ] Site acessível em `https://laaferreira.github.io/ligth/`
- [ ] Tabela app_users criada no Supabase
- [ ] RLS ativado e testado
- [ ] Usuário admin criado
- [ ] Login em produção funciona
- [ ] Gestão de usuários em produção funciona

---

## 📝 Resultado dos Testes

### Data: ___/___/___
### Testador: ________________
### Ambiente: [ ] Local [ ] Staging [ ] Produção

| Categoria | Resultado | Notas |
|-----------|-----------|-------|
| Setup | ☐ Pass ☐ Fail | |
| Auth | ☐ Pass ☐ Fail | |
| Dashboard | ☐ Pass ☐ Fail | |
| Clientes | ☐ Pass ☐ Fail | |
| Produtos | ☐ Pass ☐ Fail | |
| Pedidos | ☐ Pass ☐ Fail | |
| Estoque | ☐ Pass ☐ Fail | |
| Usuários | ☐ Pass ☐ Fail | |
| Performance | ☐ Pass ☐ Fail | |
| Segurança | ☐ Pass ☐ Fail | |
| Responsividade | ☐ Pass ☐ Fail | |
| Banco de Dados | ☐ Pass ☐ Fail | |

**Resultado Geral**: ☐ PASS ☐ FAIL ☐ PASS COM WARNINGS

**Bugs Encontrados**:
1. _________________________________
2. _________________________________
3. _________________________________

**Observações**:
_________________________________________
_________________________________________

---

## 📞 Precisa de Ajuda?

Consulte os documentos:
- `README.md` - Overview do projeto
- `SUPABASE_SETUP.md` - Setup do banco
- `GERENCIA_USUARIOS.md` - Módulo de usuários
- `AVALIACAO_APLICACAO.md` - Análise técnica
- `RESUMO_MIGRACOES.md` - O que mudou

**Boa sorte com os testes! 🚀**
