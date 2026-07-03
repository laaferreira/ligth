CREATE TABLE IF NOT EXISTS public.vales_vendedores (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  vendedor_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  observacao TEXT,
  data_vale DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vales_vendedores_vendedor_data
  ON public.vales_vendedores (vendedor_id, data_vale DESC);

ALTER TABLE public.vales_vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vales_vendedores_select"
  ON public.vales_vendedores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
        AND (
          au.role IN ('administrador', 'gerente')
          OR au.id = vendedor_id
        )
    )
  );

CREATE POLICY "vales_vendedores_insert"
  ON public.vales_vendedores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('administrador', 'gerente')
        AND au.is_active = true
    )
  );

CREATE POLICY "vales_vendedores_update"
  ON public.vales_vendedores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('administrador', 'gerente')
        AND au.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('administrador', 'gerente')
        AND au.is_active = true
    )
  );

CREATE POLICY "vales_vendedores_delete"
  ON public.vales_vendedores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('administrador', 'gerente')
        AND au.is_active = true
    )
  );
