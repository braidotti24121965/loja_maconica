# Roteiro Final de Homologação dos 4 Perfis - Fase 13

*Nota: O script de teste transacional (`accept_invite_test.sql`) foi validado e aprovado com sucesso no banco de dados Supabase em 01/10/2026, garantindo o isolamento das operações de invite.*

## ⚠️ Preparação Obrigatória
1. Certifique-se de não remover a conta `lojamestre@lojas.com` até finalizar toda a bateria abaixo.
2. Utilize SEMPRE **janelas anônimas diferentes** para cada perfil testado.

---

## Homologação Visual

### Perfil 1: Dono do SaaS (Platform Admin)
- **Credencial:** Convide `admin@maconaria360.com.br` no painel Auth do Supabase e defina a senha.
- **SQL de Ativação:**
  ```sql
  -- 1. Diagnóstico:
  SELECT id, email FROM auth.users WHERE lower(email) = 'admin@maconaria360.com.br';
  
  -- 2. Promoção (Execute apenas se retornar 1 linha exata acima):
  INSERT INTO public.platform_admins (user_id) 
  VALUES ((SELECT id FROM auth.users WHERE lower(email) = 'admin@maconaria360.com.br'));
  ```
- **URL de Entrada:** `maconaria360.com.br` e `maconaria360.com.br/admin`
- **Menus Visíveis:** Visão Geral Global (Estatísticas do SaaS). 
- **Acessos Bloqueados:** Sem acesso ao menu interno das Lojas, sem aba "/admin/auditoria" (removida temporariamente).
- **Operações:** O botão `+ Nova Loja` está disponível em `/admin` apontando para `/lojas/nova`. Este provisiona a loja sem criar um vínculo direto e automático de `owner` para o dono do SaaS. 

### Perfil 2: Administrador da Loja Salto Moutonnee
- **Credencial:** Como `lojamestre`, gere o convite na loja Salto para `lsm@maconaria360.com.br` (cargo Administrador). Abra o link recebido e crie a senha.
- **SQL de Elevação para Admin do Tenant:**
  *Observação: A `tenant_memberships` exige papel `admin` (e não `owner`) para poder editar configurações da loja (como nome e número).*
  ```sql
  -- 1. Diagnóstico (deve retornar 1 linha):
  SELECT user_id, role, tenant_id FROM public.tenant_memberships 
  WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = 'lsm@maconaria360.com.br')
    AND tenant_id = 'ea88ae27-674a-46e1-bbcc-c73fcf6b2a30';

  -- 2. Elevação (Execute apenas se retornar 1 linha exata):
  UPDATE public.tenant_memberships 
  SET role = 'admin' 
  WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = 'lsm@maconaria360.com.br')
    AND tenant_id = 'ea88ae27-674a-46e1-bbcc-c73fcf6b2a30';
  ```
- **URL de Entrada:** Acesso direto ao dashboard de `/lojas/[ID-DA-SALTO]`.
- **Menus Visíveis:** Membros, Financeiro, Sessões, Eventos, Configurações, Comunicação, Meu Espaço, Meu Extrato.
- **Acessos Bloqueados:** Visão Global do SaaS e botão `+ Nova Loja`. NENHUM acesso à loja Paula Sousa e Mello (bloqueio 404/Redirecionamento ao tentar burlar URL).

### Perfil 3: Administrador da Loja Paula Sousa e Mello
- **Credencial:** Na loja Paula Sousa, gere o convite para `lpsm@maconaria360.com.br` (Administrador). Abra o link e crie a senha.
- **SQL de Elevação:**
  ```sql
  -- 1. Diagnóstico (deve retornar 1 linha):
  SELECT user_id, role, tenant_id FROM public.tenant_memberships 
  WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = 'lpsm@maconaria360.com.br')
    AND tenant_id = '179c4833-ad24-46e3-a576-84c16257e58a';

  -- 2. Elevação (Execute apenas se retornar 1 linha exata):
  UPDATE public.tenant_memberships 
  SET role = 'admin' 
  WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = 'lpsm@maconaria360.com.br')
    AND tenant_id = '179c4833-ad24-46e3-a576-84c16257e58a';
  ```
- **Visibilidade:** Idêntico ao Perfil 2, porém isolado em sua respectiva loja.

### Perfil 4: Irmão (Luiz Marcelo)
- **Credencial:** Logado como Administrador da Loja Salto, gere um convite para o e-mail real do Luiz usando `Membro (Padrão)`. Acesse e defina a senha.
- **SQL de Vinculação à Ficha:**
  ```sql
  -- 1. Diagnóstico (deve retornar 1 linha):
  SELECT id, full_name FROM public.brothers 
  WHERE id = '6777cd4d-4b6c-4ef2-ab9c-a041d65ca87f'
    AND store_id = '1e257586-80f6-49a0-aa6e-234acfdbbdda';

  -- 2. Vinculação (Execute apenas se retornar 1 linha exata):
  UPDATE public.brothers 
  SET user_id = (SELECT id FROM auth.users WHERE lower(email) = 'EMAIL-REAL-DO-LUIZ') 
  WHERE id = '6777cd4d-4b6c-4ef2-ab9c-a041d65ca87f'
    AND store_id = '1e257586-80f6-49a0-aa6e-234acfdbbdda';
  ```
- **Menus Visíveis:** `Meu Espaço`, `Meu Extrato`.
- **Acessos Bloqueados Visuais e Server-side:** 
  - Não aparecem atalhos para Configurações, Membros, Financeiro, Sessões e Eventos. 
  - Se ele tentar forçar rotas como `/financeiro`, `/sessoes/nova`, `/membros`, `/comunicacao`, etc., um _Middleware_ global (implementado no servidor) impedirá o acesso e o redirecionará imediatamente de volta ao `/meu-espaco`.
- **Operações permitidas:** Check-in, visualização do extrato financeiro pessoal.
