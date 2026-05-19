# Política de Segurança - Row Level Security (RLS) no Supabase

Documento para configurar RLS (Row Level Security) nas tabelas do Supabase.

## 1. Habilitar RLS nas Tabelas

No Supabase Console, vá para SQL Editor e execute:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
```

## 2. Criar Políticas de Acesso

### Tabela: clientes
```sql
-- Usuários podem ver seus próprios clientes
CREATE POLICY "Clientes SELECT" ON clientes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir clientes
CREATE POLICY "Clientes INSERT" ON clientes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus clientes
CREATE POLICY "Clientes UPDATE" ON clientes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus clientes
CREATE POLICY "Clientes DELETE" ON clientes
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Tabela: produtos
```sql
-- Usuários podem ver seus próprios produtos
CREATE POLICY "Produtos SELECT" ON produtos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir produtos
CREATE POLICY "Produtos INSERT" ON produtos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus produtos
CREATE POLICY "Produtos UPDATE" ON produtos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus produtos
CREATE POLICY "Produtos DELETE" ON produtos
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Tabela: pedidos
```sql
-- Usuários podem ver seus próprios pedidos
CREATE POLICY "Pedidos SELECT" ON pedidos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir pedidos
CREATE POLICY "Pedidos INSERT" ON pedidos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus pedidos
CREATE POLICY "Pedidos UPDATE" ON pedidos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus pedidos
CREATE POLICY "Pedidos DELETE" ON pedidos
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Tabela: movimentacoes_estoque
```sql
-- Usuários podem ver suas movimentações
CREATE POLICY "Movimentações SELECT" ON movimentacoes_estoque
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir movimentações
CREATE POLICY "Movimentações INSERT" ON movimentacoes_estoque
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas movimentações
CREATE POLICY "Movimentações UPDATE" ON movimentacoes_estoque
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar suas movimentações
CREATE POLICY "Movimentações DELETE" ON movimentacoes_estoque
  FOR DELETE
  USING (auth.uid() = user_id);
```

## 3. Verificar Políticas Criadas

Para visualizar as políticas:

```sql
SELECT * FROM pg_policies;
```

## 4. Desabilitar RLS (se necessário)

Se for desabilitar RLS temporariamente para testes:

```sql
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque DISABLE ROW LEVEL SECURITY;
```

⚠️ **AVISO**: Não desabilite RLS em produção! Isso expõe todos os dados.

## 5. Testar Políticas

No Supabase Console, em Authentication:
1. Crie um novo usuário de teste
2. Use a função "Impersonate user" para testar acesso
3. Verifique se dados de outros usuários não são visíveis

## Checklist

- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas de SELECT criadas
- [ ] Políticas de INSERT criadas
- [ ] Políticas de UPDATE criadas
- [ ] Políticas de DELETE criadas
- [ ] Testado acesso com múltiplos usuários
- [ ] Confirmado que usuários só veem seus dados
