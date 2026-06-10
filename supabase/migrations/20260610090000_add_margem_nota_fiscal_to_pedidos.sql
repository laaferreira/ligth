-- Adiciona coluna de margem da nota fiscal na tabela de pedidos.
-- Quando nota_fiscal = true, este percentual é aplicado sobre o valor final
-- para calcular o total com NF emitida.

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS margem_nota_fiscal NUMERIC(8, 2) DEFAULT NULL;
