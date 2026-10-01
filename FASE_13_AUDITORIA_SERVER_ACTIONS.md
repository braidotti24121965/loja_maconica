# Fase 13 — Matriz de auditoria das Server Actions

Data da revisão: 01/10/2026. Escopo: 43 funções exportadas em arquivos `actions.ts`.

Legenda: **OK** = possui verificação explícita ou delega a uma RPC/RLS compatível; **Corrigido** = ajuste feito nesta revisão; **Atenção** = não impede esta entrega, mas exige correção ou teste adicional antes de produção; **Crítico** = risco que deve ser corrigido antes de produção.

| Arquivo | Server Action | Acesso esperado | Proteção e isolamento observados | Status |
|---|---|---|---|---|
| `src/app/actions.ts` | `logout` | autenticado | encerra apenas a sessão corrente | OK |
| `login/actions.ts` | `login` | público | autenticação pelo Supabase; sem mutação multi-loja | OK |
| `onboarding/actions.ts` | `submitOnboarding` | autenticado | usa `getUser()` e altera apenas o perfil pelo `id` do usuário | OK |
| `perfil/actions.ts` | `updateProfile` | autenticado | usa `getUser()` e filtra o perfil pelo próprio `id` | OK |
| `setup/actions.ts` | `setupFirstTenant` | autenticado | chama `create_tenant`; a RPC usa `auth.uid()` | Atenção: RPC antiga usa `SECURITY DEFINER`; falta teste negativo dedicado |
| `lojas/nova/actions.ts` | `createStore` | administrador da plataforma | valida `is_platform_admin()` antes da criação | OK |
| `configuracoes/actions.ts` | `updateStore` | admin/secretário | `requireStoreAdmin()` e `stores.id = storeId` | OK |
| `configuracoes/importar/actions.ts` | `analyzeCSV` | admin/secretário ou admin/tesoureiro | autentica, consulta vínculo na loja e separa o papel por tipo | OK |
| `configuracoes/importar/actions.ts` | `confirmImport` | admin/secretário ou admin/tesoureiro | repete autorização; RPC valida `auth.uid()`, papel e loja, com `search_path = ''` | Corrigido |
| `convidar/actions.ts` | `generateInvite` | admin/secretário | autentica, valida vínculo, papel convidado e `store_id` | OK |
| `convidar/actions.ts` | `revokeInvite` | admin/secretário | autentica, valida vínculo e convite na mesma loja | OK |
| `eventos/actions.ts` | `saveEvent` | admin/secretário | helper administrativo e filtro `event.id + store_id` | OK |
| `eventos/actions.ts` | `deleteEvent` | admin/secretário | helper administrativo e filtro por loja | OK |
| `eventos/actions.ts` | `uploadPhoto` | admin/secretário | valida evento na loja, arquivo e bucket privado | OK |
| `eventos/actions.ts` | `deletePhoto` | admin/secretário | valida foto/evento/loja antes do Storage e banco | OK |
| `eventos/actions.ts` | `setCoverPhoto` | admin/secretário | valida evento/foto na mesma loja | OK |
| `financeiro/actions.ts` | `createAccount` | admin/tesoureiro | `requireStoreTreasurer()` e inserção com `store_id` | OK |
| `financeiro/actions.ts` | `createCategory` | admin/tesoureiro | `requireStoreTreasurer()` e inserção com `store_id` | OK |
| `financeiro/actions.ts` | `addTransaction` | admin/tesoureiro | guard + RPC atômica valida conta, categoria, tipo e irmão na mesma loja; saldo serializado por lock | Corrigido; teste transacional remoto aprovado |
| `financeiro/mensalidades/actions.ts` | `generateMonthlyDues` | admin/tesoureiro | `requireStoreTreasurer()`, irmãos filtrados pela loja | Corrigido |
| `financeiro/mensalidades/actions.ts` | `payMonthlyDue` | admin/tesoureiro | guard no servidor + nova RPC atômica com validação de mensalidade, conta, categoria, irmão e loja | Corrigido; depende de aplicar a migration |
| `financeiro/mensalidades/actions.ts` | `updateMonthlyDueStatus` | admin/tesoureiro | guard, filtro `id + store_id` e valida linha retornada por `.select()` | Corrigido |
| `membros/actions.ts` | `updateRole` | admin/secretário | guard, enumeração de papéis, filtro `store_id + user_id` e valida linha retornada | Corrigido |
| `membros/actions.ts` | `removeMember` | admin/secretário | guard, filtro `store_id + user_id`, impede remoção própria e limita secretário a papéis comuns | Corrigido |
| `membros/novo/actions.ts` | `createBrother` | admin/secretário | `requireStoreAdmin()` e `store_id` imposto no servidor | OK |
| `membros/[brotherId]/actions.ts` | `updateBrother` | admin/secretário | guard, filtro `id + store_id` e valida linha retornada | Corrigido |
| `membros/[brotherId]/actions.ts` | `deleteBrother` | admin/secretário | guard, filtro `id + store_id` e valida linha retornada | Corrigido |
| `membros/[brotherId]/actions.ts` | `addDependent` | admin/secretário | guard e valida explicitamente `brother_id + store_id` | Corrigido |
| `membros/[brotherId]/actions.ts` | `deleteDependent` | admin/secretário | guard, valida irmão/loja e filtra `id + brother_id` com retorno | Corrigido |
| `membros/[brotherId]/actions.ts` | `editDependent` | admin/secretário | guard, valida irmão/loja e filtra `id + brother_id` com retorno | Corrigido |
| `membros/[brotherId]/actions.ts` | `linkOwnUserToBrother` | membro autenticado | RPC atômica valida vínculo, unicidade por loja e ficha livre, sem depender da política administrativa de update | Corrigido; homologação funcional pendente |
| `meu-espaco/actions.ts` | `generateDigitalCard` | próprio membro | autentica e delega à RPC | Atenção: teste negativo da RPC ainda não executado nesta revisão |
| `meu-espaco/actions.ts` | `revokeDigitalCard` | próprio membro | autentica e delega à RPC | Atenção: teste negativo da RPC ainda não executado nesta revisão |
| `sessoes/nova/actions.ts` | `createSession` | admin/secretário | autentica, valida vínculo/papel e impõe `store_id` | OK |
| `sessoes/[sessionId]/ata/actions.ts` | `uploadAta` | admin/secretário | autentica, valida papel e sessão na mesma loja; leitura da página permanece liberada ao membro | OK |
| `sessoes/[sessionId]/frequencia/actions.ts` | `saveAttendance` | admin/secretário | guard e valida explicitamente sessão e todos os irmãos na mesma loja | Corrigido |
| `sessoes/[sessionId]/frequencia/actions.ts` | `getSessionAttendances` | autenticado com acesso à loja | autentica, valida vínculo e filtra `session_id + store_id` | Corrigido |
| `sessoes/[sessionId]/frequencia/actions.ts` | `openCheckinWindow` | admin/secretário | guard no servidor e RPC repete validação pela sessão | OK |
| `sessoes/[sessionId]/frequencia/actions.ts` | `closeCheckinWindow` | admin/secretário | guard no servidor e RPC repete validação pela sessão | OK |
| `checkin/code/[code]/actions.ts` | `confirmCodePresence` | irmão autenticado e vinculado | autentica; RPC valida janela, irmão vinculado, duplicidade e limite | OK |
| `checkin/qr/[token]/actions.ts` | `confirmQrPresence` | irmão autenticado e vinculado | autentica; RPC valida janela e vínculo | OK |
| `invite/[token]/actions.ts` | `setupPasswordAction` | convidado autenticado | usuário vem do Supabase; RPC valida token, e-mail, expiração e uso único | OK; teste transacional existente passou anteriormente |
| `invite/[token]/actions.ts` | `acceptInviteAction` | convidado autenticado | mesma RPC transacional e validações | OK; teste transacional existente passou anteriormente |

## Coerência de rotas e interface

- Membros podem abrir as páginas de leitura de Sessões, Eventos e Atas.
- `/sessoes/nova`, `/sessoes/{id}/frequencia`, `/eventos/novo` e `/eventos/{id}/editar` exigem admin/secretário no Proxy.
- A página de Ata permanece legível ao membro; o formulário só aparece para admin/secretário e `uploadAta` repete a proteção na Server Action.
- Tesoureiros não recebem mais controles administrativos de frequência que seriam recusados pela Server Action.
- O Proxy é uma barreira de navegação, não a única autorização: as mutações continuam protegidas no servidor e/ou por RPC/RLS.

## Pendências antes de produção

1. Executar a homologação visual com os quatro perfis de acesso.
