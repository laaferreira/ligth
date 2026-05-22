ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS comissao NUMERIC(5,2) NOT NULL DEFAULT 0;

UPDATE public.app_users
SET comissao = 0
WHERE comissao IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_users_comissao_range_chk'
  ) THEN
    ALTER TABLE public.app_users
      ADD CONSTRAINT app_users_comissao_range_chk
      CHECK (comissao >= 0 AND comissao <= 100);
  END IF;
END $$;