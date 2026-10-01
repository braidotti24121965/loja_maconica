# Cronograma Atualizado — Controle de Lojas Maçônicas

**Data-base:** 01/10/2026  
**Objetivo:** Registro definitivo das fases concluídas do SaaS de Gestão de Lojas Maçônicas.

---

## 📊 Visão Executiva de Progresso

- **Progresso Geral do MVP:** **100% Concluído e Auditado**.
- **Fase 14 (Parte 1 e Parte 2):** **Concluídas com Sucesso, Homologadas e Comitadas**.
- **Qualidade de Código (`npm run lint`):** **Aprovada (0 erros, 0 avisos)**.
- **Checagem de Tipos (`npx tsc --noEmit`):** **Aprovada (0 erros)**.
- **Build de Produção (`npm run build`):** **Aprovado com sucesso**.
- **Segurança & RLS (Supabase Cloud):** **RLS habilitado em 100% das tabelas, RPCs qualificadas com `SET search_path = ''` e testes SQL transacionais integrados**.
- **Repositório Git:** Sincronizado com o GitHub na branch `main`.

---

## 📅 Status Detalhado por Fase

| Fase | Entrega / Módulo | Status | Progresso | Detalhes Principais |
|---|---|:---:|:---:|---|
| **1–3** | Fundação Multi-Tenant, Autenticação e Perfis | Concluída | 100% | Organizations, Stores, Store Memberships, Brothers, Invites, RLS `private.is_store_member`. |
| **4–6** | Atas, Sessões e Galeria de Eventos | Concluída | 100% | Registro de sessões, upload de atas PDF em Storage, eventos da loja e galeria de fotos. |
| **7–10** | Check-in Presencial e Frequência Digital | Concluída | 100% | Attendance, QR Code/Código temporário de presença e geofencing. |
| **11–12** | Módulo Financeiro & Importação CSV | Concluída | 100% | Mensalidades, receitas/despesas, saldo por obreiro, extrato individual e importador CSV em lote. |
| **13** | Comunicação & Auditoria Server-Only | Concluída | 100% | Central de Mensagens WhatsApp, Middleware Proxy fail-closed e validação `require-store-role.ts`. |
| **14.1** | Efemérides & Datas Maçônicas | Concluída | 100% | Efemérides globais/locais, datas de Iniciação/Elevação/Exaltação, RPC `get_upcoming_ephemerides`. |
| **14.2** | Dependentes & Regras de Privacidade | Concluída | 100% | Tabela `dependents` com `store_id`, RLS restrito a admins/secretários, ocultação de sobrenomes/ano de nascimento para membros comuns e testes SQL com `ROLLBACK`. |

---

## 🔒 Arquivos Confidenciais

- O arquivo `lista_obreiros_salto_moutonnee.csv` contém dados reais de membros e é mantido estritamente fora do controle de versão Git (`untracked` no `.gitignore`).

---

## 📄 Documentação Técnica Oficial
Consulte [`DOCUMENTACAO_SISTEMA.md`](file:///Users/fernandoluizbraidotti/Documents/ChatGPT/Loja%20Maconica/DOCUMENTACAO_SISTEMA.md) para a especificação completa de schemas, tabelas, políticas RLS, Server Actions e mapa de rotas.
