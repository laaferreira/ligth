DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
      AND column_name = 'disponivel'
  ) THEN
    EXECUTE '
      UPDATE produtos
      SET "quantidadeEstoque" = COALESCE(NULLIF("quantidadeEstoque", 0), disponivel, quantidade, 0)
      WHERE disponivel IS NOT NULL
    ';

    EXECUTE 'ALTER TABLE produtos DROP COLUMN IF EXISTS disponivel';
  END IF;
END $$;