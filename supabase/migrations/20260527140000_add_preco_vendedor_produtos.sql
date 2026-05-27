-- Adiciona colunas de preço custo e venda específicas para vendedor.
-- Inicializa com os valores atuais de preco_custo e preco_venda.

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS preco_custo_vendedor numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preco_venda_vendedor numeric(10,2) DEFAULT NULL;

-- Copia os valores existentes para os novos campos
UPDATE produtos
  SET preco_custo_vendedor = COALESCE("precoCusto", preco_custo, 0),
      preco_venda_vendedor = COALESCE("precoVenda", preco_venda, 0)
  WHERE preco_custo_vendedor IS NULL OR preco_venda_vendedor IS NULL;
