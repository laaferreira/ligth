-- Habilita RLS na tabela de movimentações de estoque e define políticas de acesso.

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário autenticado e ativo pode visualizar o histórico
DROP POLICY IF EXISTS "Movimentacoes SELECT" ON public.movimentacoes_estoque;
CREATE POLICY "Movimentacoes SELECT" ON public.movimentacoes_estoque
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.is_active = true
    )
  );

-- INSERT: qualquer usuário autenticado e ativo pode registrar movimentações
DROP POLICY IF EXISTS "Movimentacoes INSERT" ON public.movimentacoes_estoque;
CREATE POLICY "Movimentacoes INSERT" ON public.movimentacoes_estoque
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.is_active = true
    )
  );

-- UPDATE/DELETE: apenas administrador e gerente
DROP POLICY IF EXISTS "Movimentacoes UPDATE" ON public.movimentacoes_estoque;
CREATE POLICY "Movimentacoes UPDATE" ON public.movimentacoes_estoque
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
  );

DROP POLICY IF EXISTS "Movimentacoes DELETE" ON public.movimentacoes_estoque;
CREATE POLICY "Movimentacoes DELETE" ON public.movimentacoes_estoque
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('administrador', 'gerente')
        AND app_users.is_active = true
    )
  );
