# Documentação Completa e Definitiva do Sistema
## SaaS de Gestão Multi-Tenant para Lojas Maçônicas (A.R.L.S.)

> **Data de Atualização:** 01/10/2026 (Refinamentos da Fase 15 Concluídos)  
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
7. **Prancha de Efemérides da Sessão (Chanceler):** Relatório oficial impresso/PDF e e-mail com busca automática de aniversários natalícios, datas maçônicas e comemorações históricas da loja.

---

## 🏗️ 2. Arquitetura Técnica & Stack Tecnológico

- **Framework Web:** Next.js 16 (App Router com Turbopack e React 19).
- **Linguagem:** TypeScript (Strict Mode).
- **Estilização:** CSS Custom Properties (Design Token System responsivo e padronizado com `--brand: #0f766e`).
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
| **Member (`member`)** | Irmão Obreiro. Acesso de leitura aos membros da loja, "Meu Espaço", "Meu Extrato", consulta de efemérides e check-in de presença. Ocultação do menu "Loja" para perfis comuns. |
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

### Fase 14 — Efemérides, Dependentes & Privacidade
- Tabela `ephemerides` para datas históricas do SaaS e locais da loja.
- Tabela `dependents` com coluna `store_id` e RLS restrito a admins/secretários e ao próprio membro.
- **Regra de Privacidade de Menores**: RPC retorna apenas o **Primeiro Nome** do dependente e oculta ano de nascimento para membros comuns.
- **Associação de E-mail (`brothers.email`)**: Gatilho `trg_sync_brother_email_from_auth` e botão de convite rápido.
- **Recuperação de Senha**: Páginas `/esqueci-senha` e `/redefinir-senha`.

### Fase 15 — Refinamentos do Chanceler, Membros, Efemérides & Frequência (Fase Atual)
- **Edição & Exclusão de Efemérides Locais**:
  - Modal de edição de título, dia, mês, ano, categoria e descrição de efemérides da loja via Server Action `updateEphemeris`.
  - Botão **✏️ Editar** (verde claro com borda verde) e **🗑️ Excluir** com `ConfirmDialog`.
- **Estilização de Impressão e Design Tokens**:
  - Adicionadas variáveis de token CSS `--brand: #0f766e;` e `--subtle: #526173;` no `:root`.
  - Reset no `@media print` para forçar `.shell`, `.main` e `.content` com `display: block !important; width: 100% !important;`, garantindo geração perfeita de PDF A4 sem colapso de largura.
  - Botões **"Relatório PDF (Chanceler)"** e **"Imprimir / Baixar PDF"** estilizados em verde maçônico destacado (`#0f766e` com texto branco).
- **Desseleção de Frequência & Opção "Não Registrado"**:
  - Opção **`Não Registrado`** posicionada diretamente no combo select de frequência (`/sessoes/[sessionId]/frequencia`).
  - Server Action `saveAttendance` atualizada para remover registros da tabela `session_attendances` ao mudar para `Não Registrado`.
- **"Meu Espaço" & Dependentes pelo Próprio Membro**:
  - Link **"← Voltar para Visão Geral"** e seção **"Família e Dependentes"** no portal *Meu Espaço*.
  - RLS `20261001234500_allow_members_manage_own_dependents.sql` permitindo ao membro cadastrar, editar e remover seus próprios familiares.
- **Datas de Evolução Maçônica e Nascimento dos Membros**:
  - Adicionados os campos **Data de Nasc.** (alinhado a *Cargo* e *Celular*) e **Iniciação (Aprendiz)**, **Elevação (Companheiro)** e **Exaltação (Mestre)** na ficha de membros (`edit-form.tsx` e `novo/page.tsx`).
  - Integração total com a RPC `get_upcoming_ephemerides` para exibir aniversários natalícios e datas maçônicas de irmãos no relatório e no painel.
- **Escopo Dinâmico de Efemérides**:
  - O painel principal de efemérides (`/lojas/[id]/efemerides`) filtra automaticamente comemorações do **mês vigente**, estendendo a exibição até o dia da próxima sessão caso ela ocorra no mês subsequente.
- **Gestão Integrada de Sessões & Prancha de Efemérides (Chanceler)**:
  - **Ordenação Cronológica Crescente**: Listagem de sessões em `/lojas/[id]/sessoes` ordenada por data em sentido ascendente (`ascending: true`).
  - **Indicadores Visuais de Anexos**: Exibição de contadores em tempo real na linha da sessão (`Galeria de Fotos (N)` e status da ata `Ata Anexada ✓` / `Anexar Ata (Sem Ata)`).
  - **Alinhamento Fluido de Ações**: Layout compacto em linha única com `gap: 16px` e container de `1000px`.
  - **Cálculo Automático de Intervalo de Efemérides**: Ao acessar a Prancha de Efemérides a partir de uma sessão (`?sessionId=...&from=sessoes`), a página carrega a sessão vinculada, preenche a **Data da Sessão (Início)** e calcula automaticamente a data **Até 1 dia antes da Próxima Sessão** (data da próxima sessão menos 1 dia ou +13 dias). Permite alteração manual pelo administrador e retorno direto para Sessões e Atas ao fechar (`from=sessoes`).
- **Formatação de Badges de Efemérides e Jubileus**:
  - Exibição de comemorações natalícias, familiares e evoluções maçônicas (Iniciação, Elevação, Exaltação) com badges coloridos (dia, mês e anos celebrados), evitando qualquer sobreposição visual de texto.

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
