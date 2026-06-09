ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS margem_venda_elite NUMERIC(8, 2) DEFAULT 20;

UPDATE app_users
SET margem_venda_elite = 20
WHERE margem_venda_elite IS NULL;
