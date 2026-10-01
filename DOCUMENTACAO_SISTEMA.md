# Documentação Completa e Definitiva do Sistema
## SaaS de Gestão Multi-Tenant para Lojas Maçônicas (A.R.L.S.)

> **Data de Atualização:** 01/10/2026  
> **Status Geral do Projeto:** MVP 100% Concluído, Auditado, Testado e Homologado.  
> **Repositório:** `braidotti24121965/loja_maconica` (Branch `main`)

---

## 📖 1. Visão Geral do Sistema

O **Controle de Lojas Maçônicas** é um sistema web SaaS Multi-Tenant desenvolvido sob medida para a gestão administrativa, financeira, ritualística e comunitária de Lojas Maçônicas (A.R.L.S.).

### Principais Pilares do Sistema:
1. **Multi-Tenancy Rígido:** Isolamento completo de dados entre diferentes lojas e organizações. Um membro de uma loja jamais acessa dados de outra loja sem autorização explícita.
2. **Segurança Fail-Closed:** Middleware proxy e Server Actions com validação de permissão obrigatória antes da execução de qualquer operação no banco.
3. **Privacidade e Proteção de Dados de Menores:** Ocultação automática de sobrenomes e anos de nascimento de dependentes para membros comuns.
4. **Comunicação Agilizada via WhatsApp:** Geradores inteligentes de mensagens formatadas com emojis para aniversariantes, convocações e cobranças.
5. **Gestão Ritualística e Frequência Digital:** Registro de sessões, upload de atas validadas por QR Code e check-in presencial com geofencing.
6. **Autenticação & Recuperação de Acesso:** Fluxo de convites por e-mail, autovinculação à ficha de membro e redefinição de senha via e-mail (`/esqueci-senha` e `/redefinir-senha`).

---

## 🏗️ 2. Arquitetura Técnica & Stack Tecnológico

- **Framework Web:** Next.js 16 (App Router com Turbopack e React 19).
- **Linguagem:** TypeScript (Strict Mode).
- **Estilização:** CSS Custom Properties (Design Token System responsivo e padronizado).
- **Backend & Banco de Dados:** Supabase Postgres com Row Level Security (RLS) habilitado em 100% das tabelas.
- **Autenticação:** Supabase Auth com sessão SSR via Cookies seguros (`@supabase/ssr`).
- **Funções de Segurança:** Schemas isolados (`private` para funções de verificação de permissão e `public` para RPCs com `SET search_path = ''`).
- **Hospedagem & CI/CD:** Vercel (Frontend Next.js) e Supabase Cloud (Database & Storage).

---

## 🔐 3. Matriz de Perfis e Permissões (RBAC)

O sistema possui 5 papéis principais atribuídos na tabela `store_memberships`:

| Papel (`role`) | Descrição e Acessos |
|---|---|
| **Platform Admin (`platform_admins`)** | Administrador do SaaS Geral. Acessa o painel `/admin` para criar/editar efemérides globais e gerenciar instâncias. |
| **Store Admin (`admin`)** | Venerável Mestre ou Administrador da Loja. Controle total sobre membros, financeiro, atas, eventos, efemérides locais e configurações da loja. |
| **Secretary (`secretary`)** | Secretário da Loja. Permissões equivalentes ao Admin para gestão de membros, dependentes, atas, sessões e efemérides. |
| **Treasurer (`treasurer`)** | Tesoureiro da Loja. Acesso total ao módulo financeiro, lançamento de mensalidades, baixa de boletos/transações e relatórios de inadimplência. |
| **Member (`member`)** | Irmão Obreiro. Acesso de leitura aos membros da loja, "Meu Espaço", "Meu Extrato", consulta de efemérides e check-in de presença. |
| **Viewer (`viewer`)** | Visitante / Consulta. Permissão de leitura estritamente limitada na loja vinculada. |

---

## 📊 4. Módulos do Sistema e Histórico de Fases

### Fase 1 a 3 — Fundação Multi-Tenant, Autenticação e Perfis
- Cadastro de Organizações, Lojas e Vínculos de Usuários (`store_memberships`).
- Fluxo de convites por e-mail com tokens temporários (`invites`).
- Autovinculação segura de usuários cadastrados à sua ficha de irmão (`link_own_user_to_brother`).

### Fase 4 a 6 — Sessões, Atas e Galeria de Eventos
- Registro de sessões maçônicas (Grau, Data, Trabalho).
- Upload e armazenamento de Atas em PDF (`session-documents`).
- Sistema de Eventos da Loja com galeria de fotos (`event-photos`) e capa configurável.

### Fase 7 a 10 — Frequência Digital & Check-in Presencial
- Registro de presença (`attendance`).
- Check-in dinâmico por QR Code e Código temporário (`checkin_codes`, `checkin_windows`).
- Janela de validação com tolerância de horário e limite geográfico.

### Fase 11 a 12 — Módulo Financeiro & Importação em Lote
- Controle de mensalidades, receitas e despesas (`monthly_fees`, `transactions`).
- Saldo acumulado por obreiro (`brother_balances`).
- Relatórios de inadimplência e extrato financeiro pessoal do irmão (`/meu-extrato`).
- Importador em lote via planilha CSV com validação automática de CIM, Graus e Cargos.

### Fase 13 — Comunicação & Auditoria de Segurança Server-Only
- Central de Comunicação (`/lojas/[id]/comunicacao`) com modelos prontos para WhatsApp.
- Proteção Server-Only (`require-store-role.ts`) em todas as Server Actions.
- Refatoração do Middleware Proxy (`src/proxy.ts`) operando em modo *fail-closed*.

### Fase 14 (Parte 1) — Efemérides & Datas Maçônicas
- Tabela `ephemerides` para datas históricas do SaaS e locais da loja.
- Cadastro de datas pessoais do irmão (Iniciação, Elevação, Exaltação, Nascimento).
- RPC `get_upcoming_ephemerides` com busca consolidada de eventos nos próximos 30/60 dias.
- Gestão global no painel `/admin/efemerides`.

### Fase 14 (Parte 2) — Aniversariantes Dependentes, Privacidade e Fluxo de Autenticação
- Tabela `dependents` com coluna `store_id` e data de nascimento (`birthdate`).
- **Regra de Privacidade de Menores**:
  - Para **Membros Comuns**: RPC retorna apenas o **Primeiro Nome** do dependente (ex: *"Maria (Esposa do Ir. Luiz Marcelo)"*) e oculta o ano de nascimento (`year = NULL`).
  - Para **Administradores/Secretários**: Exibição completa de nome e data integral.
- **Associação de E-mail de Membro (`brothers.email`)**:
  - Adicionada coluna `email` em `brothers` com gatilho de sincronização automática (`trg_sync_brother_email_from_auth`) e preenchimento na RPC `link_own_user_to_brother`.
  - Formulário de Edição com atalho direto **"Enviar Convite"** apontando para o e-mail do irmão.
- **Fluxo de Recuperação de Senha**:
  - Páginas `/esqueci-senha` (solicitação por e-mail) e `/redefinir-senha` (redefinição de senha com validação de token OTP).
- **Ajustes Finais de Usabilidade, Navegação e Chanceler**:
  - Exibição do Nome Completo do Usuário e Perfil/Papel na barra superior (`topbar`) ao lado das iniciais.
  - Ocultação do menu "Loja" para membros comuns sem privilégios administrativos.
  - Auto-vinculação de Ficha de Obreiro via RPC `get_or_link_my_brother` para eliminar a mensagem de membro não vinculado.
  - Cadastro de Familiares/Dependentes diretamente no portal **"Meu Espaço"** de cada irmão.
  - **Prancha de Efemérides da Sessão (Ferramenta do Chanceler - `/lojas/[id]/efemerides/relatorio`)**:
    - Cálculo automático do período da sessão (da data da reunião até 1 dia antes da próxima sessão).
    - Pré-visualização do PDF na tela formatado como boletim oficial maçônico (cabeçalho da A.R.L.S., 4 seções organizadas e campo para assinatura do Ir. Chanceler).
    - Impressão / Salvar em PDF otimizado para A4 via CSS `@media print`.
    - Envio do relatório por e-mail via leitor padrão (`mailto`) ou para os irmãos cadastrados.

---

## 🗄️ 5. Referência do Banco de Dados (Schema & Tabelas)

### Principais Tabelas:

1. **`organizations`**: Organizações/Potências (ex: GLESP, GOB, COMAB).
2. **`stores`**: Lojas Maçônicas (ex: Salto Moutonnee, Paula Sousa). Contém `id`, `name`, `number`, `tenant_id`, `created_at`.
3. **`store_memberships`**: Vínculo entre `auth.users` e `stores`. Contém `user_id`, `store_id`, `role` (`admin`, `secretary`, `treasurer`, `member`, `viewer`).
4. **`brothers`**: Ficha cadastral do obreiro. Contém `id`, `store_id`, `user_id`, `full_name`, `email`, `cim`, `degree`, `office`, `phone`, `birthdate`, `initiation_date`, `elevation_date`, `exaltation_date`.
5. **`dependents`**: Familiares do obreiro. Contém `id`, `brother_id`, `store_id`, `name`, `relationship`, `birthdate`, `created_at`.
6. **`invites`**: Convites de acesso pendentes. Contém `id`, `store_id`, `email`, `role`, `token`, `expires_at`.
7. **`sessions` & `session_documents`**: Atas e sessões ritualísticas da loja.
8. **`events` & `event_photos`**: Eventos sociais/públicos e galeria de fotos.
9. **`attendance` & `checkin_codes`**: Registros de presença em sessões e eventos.
10. **`monthly_fees`, `transactions`, `brother_balances`**: Módulo financeiro e conta corrente do irmão.
11. **`ephemerides`**: Comemorações históricas e efemérides (locais ou globais do SaaS).
12. **`platform_admins`**: Tabela de administradores globais da plataforma SaaS.

---

## 🗺️ 6. Mapa de Rotas e Páginas da Aplicação

### Rotas Públicas & Autenticação:
- `/login` — Formulário de autenticação com atalho "Esqueci minha senha".
- `/esqueci-senha` — Solicitação de e-mail para redefinição de senha.
- `/redefinir-senha` — Formulário de redefinição de nova senha.
- `/invite/[token]` — Tela de aceite de convite.
- `/validar/[token]` — Validação pública de autenticidade de atas via QR Code.
- `/checkin` / `/checkin/code/[code]` / `/checkin/qr/[token]` — Check-in de presença.

### Rotas de Administração Geral (SaaS Admin):
- `/admin` — Painel do Dono do SaaS.
- `/admin/efemerides` — Cadastro e exclusão de Efemérides Globais da Plataforma.

### Rotas do Dashboard da Loja (`/lojas/[id]`):
- `/lojas` — Seleção de loja ativa.
- `/lojas/[id]` — Visão Geral / Dashboard principal da loja.
- `/lojas/[id]/meu-espaco` — Painel pessoal do Irmão.
- `/lojas/[id]/meu-extrato` — Extrato financeiro individual do Irmão.
- `/lojas/[id]/membros` — Lista de Obreiros e busca.
- `/lojas/[id]/membros/[brotherId]` — Ficha do Obreiro + E-mail + Familiares/Dependentes.
- `/lojas/[id]/membros/[brotherId]/extrato` — Extrato financeiro detalhado de um Obreiro.
- `/lojas/[id]/sessoes` — Calendário de Sessões e upload de Atas.
- `/lojas/[id]/financeiro` — Painel Financeiro, Lançamentos, Inadimplência e Relatórios.
- `/lojas/[id]/eventos` — Gestão de Eventos e Galeria de Fotos.
- `/lojas/[id]/efemerides` — Calendário de Efemérides, Aniversariantes e Mensagem para WhatsApp.
- `/lojas/[id]/comunicacao` — Central de Mensagens e Convocações.
- `/lojas/[id]/configuracoes/importar` — Importador de planilhas de obreiros em lote via CSV.
- `/lojas/[id]/convidar` — Envio de convites por e-mail para novos usuários (com suporte a preenchimento `?email=...`).

---

## 🧪 7. Guia de Testes & Procedimentos de Verificação

### Executar Testes Automatizados no Terminal:

1. **Linting de Código:**
   ```bash
   npm run lint
   ```
2. **Checagem de Tipos TypeScript:**
   ```bash
   npx tsc --noEmit
   ```
3. **Build de Produção (Next.js Turbopack):**
   ```bash
   npm run build
   ```
4. **Teste Transacional de Banco de Dados (Supabase Remote):**
   ```bash
   npx supabase db query --linked --file supabase/tests/dependents_ephemerides_test.sql
   ```

---

## 🚀 8. Instruções para Deploy e Manutenção

1. **Repositório Git:** Mantido na branch `main`. Todo commit deve passar previamente por `npm run lint`, `npx tsc --noEmit` e `npm run build`.
2. **Upload de Migrações Supabase:**
   ```bash
   npx supabase db push
   ```
3. **Deploy na Vercel:** O deploy é acionado automaticamente a cada push na branch `main`.
4. **Arquivo Confidencial:** O arquivo `lista_obreiros_salto_moutonnee.csv` contém dados reais e permanece 100% **fora do Git** (`untracked` no `.gitignore`).

---
*Documentação gerada e sincronizada no repositório oficial.*
