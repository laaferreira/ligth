ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS data_finalizacao DATE;

CREATE INDEX IF NOT EXISTS idx_pedidos_data_finalizacao ON public.pedidos(data_finalizacao);