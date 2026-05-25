ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS prazo_pagamento_id BIGINT
    REFERENCES public.prazos_pagamento(id) ON DELETE SET NULL;
