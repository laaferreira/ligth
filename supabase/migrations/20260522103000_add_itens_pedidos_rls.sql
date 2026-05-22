ALTER TABLE IF EXISTS itens_pedidos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_itens_pedidos_user_id ON itens_pedidos(user_id);

DROP POLICY IF EXISTS "ItensPedidos SELECT by role" ON itens_pedidos;
DROP POLICY IF EXISTS "ItensPedidos INSERT by role" ON itens_pedidos;
DROP POLICY IF EXISTS "ItensPedidos UPDATE by role" ON itens_pedidos;
DROP POLICY IF EXISTS "ItensPedidos DELETE by role" ON itens_pedidos;

CREATE POLICY "ItensPedidos SELECT by role" ON itens_pedidos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pedidos
      JOIN app_users ON app_users.id = auth.uid()
      WHERE pedidos.id = itens_pedidos.pedido_id
        AND app_users.is_active = true
        AND (
          app_users.role IN ('administrador', 'gerente')
          OR pedidos.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "ItensPedidos INSERT by role" ON itens_pedidos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM pedidos
      JOIN app_users ON app_users.id = auth.uid()
      WHERE pedidos.id = itens_pedidos.pedido_id
        AND app_users.is_active = true
        AND (
          app_users.role IN ('administrador', 'gerente')
          OR pedidos.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "ItensPedidos UPDATE by role" ON itens_pedidos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM pedidos
      JOIN app_users ON app_users.id = auth.uid()
      WHERE pedidos.id = itens_pedidos.pedido_id
        AND app_users.is_active = true
        AND (
          app_users.role IN ('administrador', 'gerente')
          OR pedidos.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM pedidos
      JOIN app_users ON app_users.id = auth.uid()
      WHERE pedidos.id = itens_pedidos.pedido_id
        AND app_users.is_active = true
        AND (
          app_users.role IN ('administrador', 'gerente')
          OR pedidos.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "ItensPedidos DELETE by role" ON itens_pedidos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM pedidos
      JOIN app_users ON app_users.id = auth.uid()
      WHERE pedidos.id = itens_pedidos.pedido_id
        AND app_users.is_active = true
        AND (
          app_users.role IN ('administrador', 'gerente')
          OR pedidos.user_id = auth.uid()
        )
    )
  );