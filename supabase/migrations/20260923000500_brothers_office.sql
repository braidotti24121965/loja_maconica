-- Adicionando a coluna "Cargo em Loja" na Ficha do Irmão

alter table public.brothers 
add column office text;

-- Atualizar políticas, caso o schema mude, mas não é necessário pois a política abrange a tabela.
