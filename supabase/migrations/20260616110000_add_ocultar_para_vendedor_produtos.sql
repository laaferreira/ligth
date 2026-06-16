-- Adiciona coluna ocultar_para_vendedor na tabela produtos.
-- Quando marcado como TRUE, o produto não aparece para Vendedores na busca de itens de pedido.

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS ocultar_para_vendedor BOOLEAN NOT NULL DEFAULT FALSE;
