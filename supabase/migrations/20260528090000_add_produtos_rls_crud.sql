-- Adiciona políticas de INSERT, UPDATE e DELETE para a tabela produtos.
-- SELECT já existe (criada em 20260522093000).
-- Regra: administrador e gerente podem criar, editar e excluir.
-- Vendedor pode apenas ler (SELECT já coberto).

-- INSERT: apenas administrador e gerente
DROP POLICY IF EXISTS "Produtos INSERT" ON produtos;
CREATE POLICY "Produtos INSERT" ON produtos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
  );

-- UPDATE: apenas administrador e gerente
DROP POLICY IF EXISTS "Produtos UPDATE" ON produtos;
CREATE POLICY "Produtos UPDATE" ON produtos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
  );

-- DELETE: apenas administrador
DROP POLICY IF EXISTS "Produtos DELETE" ON produtos;
CREATE POLICY "Produtos DELETE" ON produtos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role = 'administrador'
        AND app_users.is_active = true
    )
  );
