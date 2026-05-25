-- Tabela de prazos para pagamento
CREATE TABLE public.prazos_pagamento (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descricao   TEXT NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.prazos_pagamento ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode consultar
CREATE POLICY "prazos_pagamento_select"
  ON public.prazos_pagamento FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Somente administrador ou gerente pode inserir
CREATE POLICY "prazos_pagamento_insert"
  ON public.prazos_pagamento FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = auth.uid()
        AND role IN ('administrador', 'gerente')
        AND is_active = true
    )
  );

-- Somente administrador ou gerente pode atualizar (exclusão lógica)
CREATE POLICY "prazos_pagamento_update"
  ON public.prazos_pagamento FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = auth.uid()
        AND role IN ('administrador', 'gerente')
        AND is_active = true
    )
  );
