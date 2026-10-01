# Controle de Lojas Maçônicas (A.R.L.S.) — SaaS Multi-Tenant

Sistema web SaaS completo e seguro para gestão administrativa, financeira, ritualística e comunitária de Lojas Maçônicas.

> 📄 **Documentação Técnica Completa:** Consulte [`DOCUMENTACAO_SISTEMA.md`](file:///Users/fernandoluizbraidotti/Documents/ChatGPT/Loja%20Maconica/DOCUMENTACAO_SISTEMA.md) para detalhes completos de arquitetura, banco de dados, RLS, matriz de permissões, RPCs e mapa de rotas.

---

## 🚀 Status do Projeto

- **Fases 1 a 14 (Partes 1 e 2):** 100% Concluídas, Auditadas, Testadas e Homologadas.
- **Ambientes:** Supabase Cloud (Postgres & Storage) e Vercel.
- **Build & Quality:** `npm run lint`, `npx tsc --noEmit` e `npm run build` aprovados com 0 erros.

---

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 16 (App Router com Turbopack, React 19).
- **Backend:** Supabase Postgres, Auth (SSR Cookies) e Row Level Security (RLS) Fail-Closed.
- **Estilização:** CSS Custom Properties (Design System responsivo).
- **Linguagem:** TypeScript (Strict).

---

## 💻 Desenvolvimento & Validação Local

1. Instale o Node.js (22+) e execute:
   ```bash
   npm install
   ```
2. Configure o arquivo `.env.local` com as credenciais do Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
   ```
3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Comandos de Validação e Testes:

```bash
npm run lint         # Checagem do ESLint
npx tsc --noEmit     # Checagem estática de tipos TypeScript
npm run build        # Build de produção do Next.js
npx supabase db push # Aplicação de migrações no banco remoto
```

---

## 🔒 Segurança e Privacidade

- **RLS Ativo:** 100% das tabelas possuem Row Level Security habilitado.
- **Fail-Closed:** Server Actions protegidas por `requireStoreAdmin` / `requireStoreMember`.
- **Privacidade de Menores & Familiares:** Sobrenomes e anos de nascimento de dependentes são ocultados para membros comuns na RPC `get_upcoming_ephemerides`.
- **Dados Confidenciais:** O arquivo `lista_obreiros_salto_moutonnee.csv` permanece fora do repositório (mantido no `.gitignore`).
