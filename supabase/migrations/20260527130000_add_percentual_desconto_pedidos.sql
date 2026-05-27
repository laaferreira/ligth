-- Adiciona coluna de percentual de desconto na tabela de pedidos.
-- O desconto só é aplicável quando forma de pagamento é 'À vista'
-- e o prazo é '7' ou '7/14/21'.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS percentual_desconto numeric(5,2) DEFAULT NULL;
