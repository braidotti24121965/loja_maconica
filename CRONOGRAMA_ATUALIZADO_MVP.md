# Cronograma atualizado — Controle de Lojas Maçônicas

**Data-base:** 30/09/2026  
**Objetivo:** concluir um MVP homologável, sem promoção para produção antes de aprovação explícita.

## Visão executiva

- Progresso funcional estimado do MVP: **85%**.
- Situação geral: **núcleo cadastral e convites seguros implantados; sessões e atas aguardam validação assistida pela interface**.
- Build de produção e TypeScript: **aprovados**.
- Qualidade de código (lint): **aprovada**, sem erros ou avisos.
- Repositório: **sincronizado com o GitHub após a publicação desta rodada**.
- Supabase de homologação: **ativo e saudável**, com histórico de migrations reconciliado e migration de segurança de sessões/atas aplicada.
- Eventos e galeria: **migration local não versionada e sem interface**.
- Produção: **não autorizada e não planejada neste cronograma**.

## Cronograma por fase

| Fase | Entrega | Status em 30/09 | Progresso | Janela atualizada | Critério de conclusão |
|---|---|---:|---:|---|---|
| 1 | Descoberta, escopo e documento do MVP | Concluída | 100% | Concluída | Escopo, arquitetura, ambientes e limites documentados |
| 2 | Design e arquitetura técnica | Concluída | 100% | Concluída | Next.js, Supabase, modelo multi-tenant e interface-base definidos |
| 3.1 | Fundação, autenticação, multi-tenant e RLS | Concluída | 100% | Concluída | Login, sessão SSR, tenants, lojas, perfis, vínculos e RLS |
| 3.2 | Onboarding, lojas, perfil e convites | Implantada em homologação | 95% | Validação assistida pendente | Testar convite, revogação, expiração e aceite com dois usuários reais de teste |
| 3.3 | Cadastro de membros e dependentes | Concluída e publicada | 100% | Concluída | CRUD completo, permissões verificadas e commit publicado |
| 3.4 | Sessões e atas/documentos | Migration aplicada; validação funcional parcial | 95% | Próxima rodada assistida | Enviar/consultar um PDF pela interface e validar isolamento após existir uma segunda loja de teste |
| 3.5 | Eventos e galeria de fotos | Iniciada | 20% | 05–08/10 | Migration segura, interface, upload e exclusão restritos à loja |
| 4 | Estabilização técnica e segurança | Em andamento | 75% | 01–09/10 | Testes RLS ampliados, advisors remotos e regressão ponta a ponta |
| 5 | Homologação assistida do MVP | Não iniciada | 0% | 09–13/10 | Roteiro ponta a ponta aprovado pelo responsável do projeto |
| 6 | Preparação para produção | Bloqueada por aprovação | 0% | Após homologação | Aprovação explícita, domínio, backup, monitoramento e plano de retorno |

## Plano de execução imediato

### 30/09–02/10 — fechar o núcleo cadastral

- Corrigir os 41 erros de lint e os 6 avisos.
- Revisar e publicar o commit local de edição de dependentes.
- Validar onboarding, criação/edição de loja, perfil, convites, membros e dependentes.
- Confirmar as migrations locais contra o Supabase de homologação antes de qualquer aplicação.

### 02/10–05/10 — validar sessões e atas

- Executar o fluxo completo de criação de sessão.
- Validar upload, consulta e permissão de atas/documentos.
- Testar isolamento entre lojas e papéis de usuário.
- Corrigir falhas encontradas e registrar evidências de homologação.

### 05/10–08/10 — concluir eventos e fotos

- Reescrever a migration de eventos com políticas por operação e validação de pertencimento à loja.
- Restringir upload e exclusão de arquivos ao contexto correto.
- Criar listagem, cadastro, edição, exclusão e galeria.
- Adicionar validações de formato, tamanho e tratamento de erros.

### 08/10–09/10 — congelamento do candidato a MVP

- Rodar lint, TypeScript, build e testes de RLS.
- Executar revisão de segurança do Supabase e Storage.
- Atualizar documentação e gerar uma versão candidata para homologação.

### 09/10–13/10 — homologação assistida

- Testar os perfis de administrador, secretário e membro.
- Homologar os fluxos principais em desktop e celular.
- Classificar correções em bloqueadoras e melhorias pós-MVP.
- Obter aceite formal ou abrir uma rodada curta de correções.

## Pendências que impedem declarar o MVP pronto

1. Executar pela interface o envio e a consulta de uma ata PDF de até 5 MB.
2. Criar uma segunda loja/usuário de teste, quando autorizado, para provar o isolamento ponta a ponta.
3. Avaliar os dois avisos restantes dos advisors: proteção de senhas vazadas desativada e função intencional `accept_invite` marcada por usar `SECURITY DEFINER`.
4. Testar pela interface a criação, revogação, expiração e aceitação de convites vinculados ao e-mail.
5. Manter a migration de eventos fora da aplicação: ela ainda não está versionada, não possui interface e tem políticas de Storage amplas demais.
6. Produção depende de autorização explícita e não faz parte da entrega atual.

## Definição de pronto do MVP

O MVP será considerado pronto para aceite quando todos os fluxos essenciais passarem em homologação, o lint estiver zerado, o build continuar aprovado, os testes de isolamento/RLS estiverem verdes, não houver pendência crítica de segurança e o responsável pelo projeto registrar o aceite.
