ALTER TABLE IF EXISTS produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pedidos ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS pedidos
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON pedidos(user_id);

DROP POLICY IF EXISTS "Clientes SELECT Shared" ON clientes;
CREATE POLICY "Clientes SELECT Shared" ON clientes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.is_active = true
    )
  );

DROP POLICY IF EXISTS "Fornecedores SELECT Shared" ON fornecedores;
CREATE POLICY "Fornecedores SELECT Shared" ON fornecedores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.is_active = true
    )
  );

DROP POLICY IF EXISTS "Produtos SELECT Shared" ON produtos;
CREATE POLICY "Produtos SELECT Shared" ON produtos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.is_active = true
    )
  );

DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'pedidos'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON pedidos', policy_name);
  END LOOP;
END $$;

CREATE POLICY "Pedidos SELECT by role" ON pedidos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
    OR (
      EXISTS (
        SELECT 1
        FROM app_users
        WHERE app_users.id = auth.uid()
          AND app_users.role = 'vendedor'
          AND app_users.is_active = true
      )
      AND auth.uid() = user_id
    )
  );

CREATE POLICY "Pedidos INSERT by role" ON pedidos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.is_active = true
    )
  );

CREATE POLICY "Pedidos UPDATE by role" ON pedidos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
    OR auth.uid() = user_id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Pedidos DELETE by role" ON pedidos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
    OR auth.uid() = user_id
  );