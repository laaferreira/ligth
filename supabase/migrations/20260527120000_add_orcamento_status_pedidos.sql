-- Adiciona 'orcamento' como valor permitido no check constraint de status dos pedidos.
-- Antes de recriar o constraint, normaliza todos os valores existentes para minúsculas
-- e converte valores legados (PENDENTE → em_aberto).

ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;

-- Normaliza valores legados / maiúsculos para os valores canônicos em minúsculas
UPDATE pedidos SET status = 'em_aberto'  WHERE LOWER(status) IN ('em_aberto', 'pendente', 'aberto');
UPDATE pedidos SET status = 'confirmado' WHERE LOWER(status) = 'confirmado';
UPDATE pedidos SET status = 'cancelado'  WHERE LOWER(status) = 'cancelado';
UPDATE pedidos SET status = 'finalizado' WHERE LOWER(status) = 'finalizado';
UPDATE pedidos SET status = 'orcamento'  WHERE LOWER(status) = 'orcamento';

-- Qualquer outro valor desconhecido vira em_aberto para não bloquear o constraint
UPDATE pedidos SET status = 'em_aberto'
  WHERE status NOT IN ('orcamento', 'em_aberto', 'confirmado', 'cancelado', 'finalizado');

ALTER TABLE pedidos
  ADD CONSTRAINT pedidos_status_check
  CHECK (status IN ('orcamento', 'em_aberto', 'confirmado', 'cancelado', 'finalizado'));
