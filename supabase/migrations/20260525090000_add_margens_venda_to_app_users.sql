ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS margem_venda_ouro NUMERIC(7,2) NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS margem_venda_prata NUMERIC(7,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS margem_venda_bronze NUMERIC(7,2) NOT NULL DEFAULT 100;

UPDATE public.app_users
SET margem_venda_ouro = COALESCE(margem_venda_ouro, 35),
    margem_venda_prata = COALESCE(margem_venda_prata, 50),
    margem_venda_bronze = COALESCE(margem_venda_bronze, 100)
WHERE margem_venda_ouro IS NULL
   OR margem_venda_prata IS NULL
   OR margem_venda_bronze IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_users_margem_venda_ouro_range_chk'
  ) THEN
    ALTER TABLE public.app_users
      ADD CONSTRAINT app_users_margem_venda_ouro_range_chk
      CHECK (margem_venda_ouro >= 0 AND margem_venda_ouro <= 1000);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_users_margem_venda_prata_range_chk'
  ) THEN
    ALTER TABLE public.app_users
      ADD CONSTRAINT app_users_margem_venda_prata_range_chk
      CHECK (margem_venda_prata >= 0 AND margem_venda_prata <= 1000);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_users_margem_venda_bronze_range_chk'
  ) THEN
    ALTER TABLE public.app_users
      ADD CONSTRAINT app_users_margem_venda_bronze_range_chk
      CHECK (margem_venda_bronze >= 0 AND margem_venda_bronze <= 1000);
  END IF;
END $$;