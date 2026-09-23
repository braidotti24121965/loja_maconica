begin;
select plan(5);
select has_table('public', 'tenants', 'tenants existe');
select has_table('public', 'stores', 'stores existe');
select has_table('public', 'profiles', 'profiles existe');
select ok((select relrowsecurity from pg_class where oid = 'public.tenants'::regclass), 'RLS ativo em tenants');
select ok((select relrowsecurity from pg_class where oid = 'public.stores'::regclass), 'RLS ativo em stores');
select * from finish();
rollback;
