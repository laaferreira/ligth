-- Adiciona o perfil auxiliar_cliente como valor permitido na coluna role de app_users.
-- Remove a constraint CHECK existente (se houver) e recria com o novo valor.

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT constraint_name
    INTO v_constraint_name
    FROM information_schema.table_constraints
   WHERE table_schema = 'public'
     AND table_name   = 'app_users'
     AND constraint_type = 'CHECK'
     AND constraint_name ILIKE '%role%'
   LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.app_users DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  ALTER TABLE public.app_users
    ADD CONSTRAINT app_users_role_check
    CHECK (role IN ('administrador', 'gerente', 'vendedor', 'auxiliar_cliente'));
END $$;
