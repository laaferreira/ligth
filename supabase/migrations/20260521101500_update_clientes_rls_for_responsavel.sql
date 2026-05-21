DROP POLICY IF EXISTS "Clientes SELECT" ON clientes;
DROP POLICY IF EXISTS "Clientes INSERT" ON clientes;
DROP POLICY IF EXISTS "Clientes UPDATE" ON clientes;
DROP POLICY IF EXISTS "Clientes DELETE" ON clientes;

CREATE POLICY "Clientes SELECT" ON clientes
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = responsavel_id
    OR EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
  );

CREATE POLICY "Clientes INSERT" ON clientes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      responsavel_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM app_users
        WHERE app_users.id = responsavel_id
      )
    )
  );

CREATE POLICY "Clientes UPDATE" ON clientes
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() = responsavel_id
    OR EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
  )
  WITH CHECK (
    (
      auth.uid() = user_id
      OR auth.uid() = responsavel_id
      OR EXISTS (
        SELECT 1
        FROM app_users
        WHERE app_users.id = auth.uid()
          AND app_users.role IN ('administrador', 'gerente')
          AND app_users.is_active = true
      )
    )
    AND (
      responsavel_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM app_users
        WHERE app_users.id = responsavel_id
      )
    )
  );

CREATE POLICY "Clientes DELETE" ON clientes
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
  );
