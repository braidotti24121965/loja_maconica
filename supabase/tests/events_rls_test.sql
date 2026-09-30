BEGIN;
SELECT plan(6);

-- Setup: Create test users and stores
-- Criar 2 usuários fictícios
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'admin@loja1.com'),
('00000000-0000-0000-0000-000000000002', 'membro@loja2.com');

-- Criar 2 lojas (e tenant fake)
INSERT INTO public.tenants (id, name) VALUES ('00000000-0000-0000-0000-000000000000', 'Tenant Teste');

INSERT INTO public.stores (id, tenant_id, name) VALUES 
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Loja 1'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Loja 2');

-- Vínculos: User 1 é Admin na Loja 1, User 2 é Member na Loja 2
INSERT INTO public.store_memberships (store_id, user_id, role) VALUES 
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'member');

-- Evento na Loja 1
INSERT INTO public.events (id, store_id, title, event_date) VALUES 
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Evento Loja 1', '2026-01-01');


-- Testa como User 1 (Admin da Loja 1)
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

SELECT results_eq(
  'SELECT title FROM public.events',
  ARRAY['Evento Loja 1'],
  'Admin da Loja 1 deve ver eventos da Loja 1'
);

SELECT lives_ok(
  $$ INSERT INTO public.events (store_id, title, event_date) VALUES ('10000000-0000-0000-0000-000000000001', 'Novo Evento', '2026-01-02') $$,
  'Admin da Loja 1 pode inserir evento na Loja 1'
);

SELECT throws_ok(
  $$ INSERT INTO public.events (store_id, title, event_date) VALUES ('10000000-0000-0000-0000-000000000002', 'Hacker', '2026-01-02') $$,
  'new row violates row-level security policy for table "events"',
  'Admin da Loja 1 NÃO pode inserir evento na Loja 2'
);

-- Testa como User 2 (Member da Loja 2)
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

SELECT is_empty(
  'SELECT title FROM public.events',
  'Membro da Loja 2 não pode ver eventos da Loja 1'
);

SELECT throws_ok(
  $$ INSERT INTO public.events (store_id, title, event_date) VALUES ('10000000-0000-0000-0000-000000000002', 'Teste Membro', '2026-01-02') $$,
  'new row violates row-level security policy for table "events"',
  'Membro da Loja 2 não tem permissão para inserir eventos nem na própria Loja'
);

SELECT throws_ok(
  $$ UPDATE public.events SET title = 'Hack' WHERE id = '20000000-0000-0000-0000-000000000001' $$,
  'new row violates row-level security policy for table "events"',
  'Membro da Loja 2 NÃO pode atualizar eventos de outra loja'
);

SELECT * FROM finish();
ROLLBACK;
