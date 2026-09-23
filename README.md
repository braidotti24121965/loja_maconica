# Controle de Lojas Maçônicas

Fundação independente para gestão multi-tenant de organizações e lojas maçônicas. O projeto usa Next.js, TypeScript, Supabase Auth/Postgres/RLS e está preparado para homologação na Vercel.

## Arquitetura da Fase 3.1

- **Tenant → Loja → Usuário** por tabelas de organização, loja e vínculos com papéis.
- Sessões Supabase SSR armazenadas em cookies e renovadas por `proxy.ts`.
- RLS ativa em todas as tabelas públicas, acesso anônimo revogado e políticas por operação.
- Funções internas de autorização no schema `private`, fora do Data API.
- Cadastro público desabilitado. Usuários serão convidados por fluxo administrativo na Fase 3.2.
- Interface responsiva baseada apenas na linguagem visual do Gabi Nails; nenhuma informação, tabela ou regra daquele sistema foi copiada.

## Desenvolvimento

1. Instale Node.js 22 ou superior e execute `npm install`.
2. Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável do projeto Supabase de desenvolvimento/homologação.
3. Execute `npm run dev`.

Sem as variáveis do Supabase, a interface abre em modo de demonstração local para revisão visual. Nunca coloque a chave secreta ou `service_role` em variável `NEXT_PUBLIC_*`.

## Banco de dados

A migration inicial está em `supabase/migrations`. Antes de aplicar remotamente:

1. Vincule explicitamente o projeto de homologação.
2. Revise o diff e aplique a migration.
3. Execute os testes de banco e os advisors de segurança e desempenho.
4. Cadastre o primeiro usuário e seus vínculos somente por fluxo administrativo seguro.

## Ambientes

- **Local:** desenvolvimento e revisão visual.
- **Homologação:** Supabase e Vercel dedicados, sem dados reais.
- **Produção:** não criada nem promovida sem aprovação explícita.
