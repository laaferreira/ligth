ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS "codigo" TEXT,
  ADD COLUMN IF NOT EXISTS "categoria" TEXT,
  ADD COLUMN IF NOT EXISTS "precoCusto" NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fornecedorId" BIGINT REFERENCES fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "fornecedorNome" TEXT,
  ADD COLUMN IF NOT EXISTS "precoVenda" NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quantidadeEstoque" NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "estoqueMaximo" NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "estoqueMinimo" NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
      AND column_name = 'sku'
  ) THEN
    EXECUTE '
      UPDATE produtos
      SET "codigo" = COALESCE(NULLIF("codigo", ''''), sku)
      WHERE COALESCE("codigo", '''') = ''''
        AND sku IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
      AND column_name = 'preco_custo'
  ) THEN
    EXECUTE '
      UPDATE produtos
      SET "precoCusto" = COALESCE("precoCusto", preco_custo, 0)
      WHERE "precoCusto" IS NULL OR "precoCusto" = 0
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
      AND column_name = 'preco_venda'
  ) THEN
    EXECUTE '
      UPDATE produtos
      SET "precoVenda" = COALESCE("precoVenda", preco_venda, 0)
      WHERE "precoVenda" IS NULL OR "precoVenda" = 0
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
      AND column_name = 'quantidadeEstoque'
  ) THEN
    EXECUTE '
      UPDATE produtos
      SET "quantidadeEstoque" = COALESCE(NULLIF("quantidadeEstoque", 0), disponivel, 0)
      WHERE "quantidadeEstoque" IS NULL
         OR "quantidadeEstoque" = 0
    ';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
      AND column_name = 'quantidade'
  ) THEN
    EXECUTE '
      UPDATE produtos
      SET "quantidadeEstoque" = COALESCE(NULLIF("quantidadeEstoque", 0), quantidade, 0)
      WHERE "quantidadeEstoque" IS NULL
         OR "quantidadeEstoque" = 0
    ';
  ELSE
    UPDATE produtos
    SET "quantidadeEstoque" = COALESCE("quantidadeEstoque", 0)
    WHERE "quantidadeEstoque" IS NULL;
  END IF;

  UPDATE produtos
  SET "estoqueMinimo" = COALESCE("estoqueMinimo", 0),
      "estoqueMaximo" = COALESCE("estoqueMaximo", 0),
      "ativo" = COALESCE("ativo", true);
END $$;

CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor_id ON produtos("fornecedorId");