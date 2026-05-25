ALTER TABLE public.movimentacoes_estoque
  ADD COLUMN IF NOT EXISTS estoque_anterior NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS estoque_atual    NUMERIC(12, 4);
