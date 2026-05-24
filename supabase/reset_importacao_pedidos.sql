begin;

truncate table public.itens_pedidos, public.pedidos restart identity;

commit;