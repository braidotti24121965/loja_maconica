# Roteiro Final de Homologação dos 4 Perfis - Fase 13

*Nota: O script de teste transacional (`accept_invite_test.sql`) foi validado e aprovado com sucesso no banco de dados Supabase em 01/10/2026, retornando `Success. No rows returned` (garantindo que as restrições e relacionamentos estão perfeitos e o ROLLBACK foi concluído). Porém, os acessos visuais da UI ainda precisam ser homologados manualmente seguindo este roteiro.*

---

## ⚠️ Preparação Obrigatória
1. Certifique-se de não remover a conta `lojamestre@lojas.com` até finalizar toda a bateria abaixo.
2. Utilize SEMPRE **janelas anônimas diferentes** (ou perfis de navegador separados) para cada perfil testado, para evitar colisão de sessão.

---

## Homologação Visual

### Perfil 1: Dono do SaaS (Platform Admin)
- **Credencial/Procedimento:** Via painel oficial do Supabase, convide `admin@maconaria360.com.br` e defina sua senha. No SQL Editor, promova-o: `INSERT INTO public.platform_admins (user_id) VALUES ((SELECT id FROM auth.users WHERE email = 'admin@maconaria360.com.br'));`
- **URL de Entrada:** `maconaria360.com.br` e `maconaria360.com.br/admin`
- **Menus que DEVEM aparecer:** Visão Geral Global, listagem sumarizada das Lojas, Estatísticas do SaaS. 
- **Menus que NÃO DEVEM aparecer:** Contexto interno da Loja (Membros, Financeiro, Sessões). O dropdown de loja inferior deve estar vazio ou não listá-las se ele não possuir cargo nelas.
- **Dados:** Somente dados agregados (total de membros, total de lojas, status de RLS). Zero acesso a dados PII de membros e caixas financeiros.
- **Operações:** Botão `+ Nova Loja` habilitado. Nenhuma operação intra-loja.

### Perfil 2: Administrador da Loja Salto Moutonnee
- **Credencial/Procedimento:** Logado como `lojamestre@lojas.com` na loja Salto, vá em Convidar e envie para `lsm@maconaria360.com.br` com cargo `Administrador`. Abra a URL de convite recebida, cadastre a senha. Depois, via SQL Editor, eleve seu cargo de viewer para owner no Tenant: `UPDATE public.tenant_memberships SET role = 'owner' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'lsm@maconaria360.com.br');`
- **URL de Entrada:** Ao logar em `maconaria360.com.br`, ele será auto-redirecionado para `maconaria360.com.br/lojas/[ID-DA-SALTO]`.
- **Menus que DEVEM aparecer:** Dashboard da Loja, Membros, Financeiro, Sessões, Eventos, Configurações, Comunicação.
- **Menus que NÃO DEVEM aparecer:** Visão Geral Global da Plataforma, Botão `+ Nova Loja`.
- **Dados:** Total controle sobre os membros, caixas e sessões estritamente da loja Salto Moutonnee.
- **Operações:** Pode editar a loja, gerenciar membros, gerar convites, criar sessões, lançar receitas/despesas. NENHUM acesso à loja Paula Sousa e Mello (digitar a URL manualmente da outra loja deve gerar bloqueio 404/Acesso Negado).

### Perfil 3: Administrador da Loja Paula Sousa e Mello
- **Credencial/Procedimento:** Logado como `lojamestre@lojas.com` na loja Paula Sousa, envie um convite para `lpsm@maconaria360.com.br` com cargo `Administrador`. Abra a URL recebida, crie a senha. Eleve seu cargo de viewer para owner no respectivo Tenant via SQL Editor: `UPDATE public.tenant_memberships SET role = 'owner' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'lpsm@maconaria360.com.br');`
- **URL de Entrada:** Ao logar, será auto-redirecionado para `maconaria360.com.br/lojas/[ID-DA-PAULA-SOUSA]`.
- **Menus que DEVEM aparecer:** Exatamente os mesmos do Perfil 2.
- **Menus que NÃO DEVEM aparecer:** Visão Geral Global, Botão `+ Nova Loja`.
- **Dados:** Total controle, porém estritamente circunscrito à loja Paula Sousa e Mello.
- **Operações:** Gerenciamento total de sua Loja. NENHUM acesso à loja Salto Moutonnee.

### Perfil 4: Irmão (Luiz Marcelo)
- **Credencial/Procedimento:** Logado como Administrador da Loja Salto, vá em Convidar, envie para o e-mail real do Luiz Marcelo usando a role `Membro (Padrão)`. Acesse o link, crie a senha. Vincule o Auth à ficha: `UPDATE public.brothers SET user_id = (SELECT id FROM auth.users WHERE email = 'EMAIL-DO-LUIZ') WHERE name ILIKE '%Luiz Marcelo%';`
- **URL de Entrada:** Ao logar, cairá na raiz da loja Salto.
- **Menus que DEVEM aparecer:** `Meu Espaço`, `Meu Extrato`.
- **Menus que NÃO DEVEM aparecer:** Membros, Financeiro, Sessões (gestão), Configurações, Comunicação, Convites, Gerenciar Loja. 
- **Dados:** Somente a visualização de seus próprios dados financeiros (seus boletos e faturas geradas pela loja) e a pauta da sua loja. Não vê informações pessoais de outros Irmãos nem finanças gerais da Loja.
- **Operações:** Solicita check-in, visualiza boletos, visualiza pauta. Forçar URLs administrativas (ex: `/lojas/[id]/financeiro`) deve forçar um redirecionamento automático de volta para o `Meu Espaço`.
