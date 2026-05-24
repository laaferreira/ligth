ALTER TABLE public.itens_pedidos
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(12,2);

UPDATE public.itens_pedidos AS item
SET custo_unitario = COALESCE(produto.preco_custo, produto."precoCusto", 0)
FROM public.produtos AS produto
WHERE produto.id = item.produto_id
  AND item.custo_unitario IS NULL;

UPDATE public.itens_pedidos
SET custo_unitario = 0
WHERE custo_unitario IS NULL;

ALTER TABLE public.itens_pedidos
  ALTER COLUMN custo_unitario SET DEFAULT 0;

ALTER TABLE public.itens_pedidos
  ALTER COLUMN custo_unitario SET NOT NULL;