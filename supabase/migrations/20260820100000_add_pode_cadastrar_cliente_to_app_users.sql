-- Adiciona coluna que controla se o usuário pode cadastrar novos clientes.
-- O valor padrão true garante que todos os usuários existentes continuem
-- podendo cadastrar clientes sem necessidade de ajuste manual.
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS pode_cadastrar_cliente boolean NOT NULL DEFAULT true;
