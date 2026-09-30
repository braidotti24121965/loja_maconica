-- Fase 7: Módulo Financeiro e Controle de Frequência

-- 1. Nova Função de Segurança (Tesouraria)
CREATE FUNCTION private.is_store_treasurer(target_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ 
  SELECT EXISTS (
    SELECT 1 FROM public.store_memberships sm 
    WHERE sm.store_id = target_store_id 
    AND sm.user_id = (SELECT auth.uid()) 
    AND sm.role IN ('admin', 'treasurer')
  ) 
$$;

REVOKE EXECUTE ON FUNCTION private.is_store_treasurer(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_store_treasurer(uuid) TO authenticated;

-- ==========================================
-- MÓDULO DE FREQUÊNCIA (CHANCELARIA)
-- ==========================================

CREATE TABLE public.session_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  brother_id uuid NOT NULL REFERENCES public.brothers(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'justified')),
  justification text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, brother_id) -- Impede que um irmão tenha duas presenças na mesma sessão
);

CREATE INDEX idx_session_attendances_store_id ON public.session_attendances(store_id);
CREATE INDEX idx_session_attendances_session_id ON public.session_attendances(session_id);

ALTER TABLE public.session_attendances ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_session_attendances_updated_at
  BEFORE UPDATE ON public.session_attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY attendances_select ON public.session_attendances 
  FOR SELECT TO authenticated USING (private.is_store_member(store_id));

CREATE POLICY attendances_insert ON public.session_attendances 
  FOR INSERT TO authenticated WITH CHECK (private.is_store_admin(store_id));

CREATE POLICY attendances_update ON public.session_attendances 
  FOR UPDATE TO authenticated USING (private.is_store_admin(store_id)) WITH CHECK (private.is_store_admin(store_id));

CREATE POLICY attendances_delete ON public.session_attendances 
  FOR DELETE TO authenticated USING (private.is_store_admin(store_id));

-- ==========================================
-- MÓDULO FINANCEIRO (TESOURARIA)
-- ==========================================

CREATE TABLE public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
  brother_id uuid REFERENCES public.brothers(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_fin_accounts_store_id ON public.financial_accounts(store_id);
CREATE INDEX idx_fin_categories_store_id ON public.financial_categories(store_id);
CREATE INDEX idx_fin_transactions_store_id ON public.financial_transactions(store_id);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fin_accounts_updated_at BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fin_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS - Accounts
CREATE POLICY accounts_select ON public.financial_accounts FOR SELECT TO authenticated USING (private.is_store_treasurer(store_id));
CREATE POLICY accounts_insert ON public.financial_accounts FOR INSERT TO authenticated WITH CHECK (private.is_store_treasurer(store_id));
CREATE POLICY accounts_update ON public.financial_accounts FOR UPDATE TO authenticated USING (private.is_store_treasurer(store_id)) WITH CHECK (private.is_store_treasurer(store_id));
CREATE POLICY accounts_delete ON public.financial_accounts FOR DELETE TO authenticated USING (private.is_store_treasurer(store_id));

-- Políticas RLS - Categories
CREATE POLICY categories_select ON public.financial_categories FOR SELECT TO authenticated USING (private.is_store_treasurer(store_id));
CREATE POLICY categories_insert ON public.financial_categories FOR INSERT TO authenticated WITH CHECK (private.is_store_treasurer(store_id));
CREATE POLICY categories_update ON public.financial_categories FOR UPDATE TO authenticated USING (private.is_store_treasurer(store_id)) WITH CHECK (private.is_store_treasurer(store_id));
CREATE POLICY categories_delete ON public.financial_categories FOR DELETE TO authenticated USING (private.is_store_treasurer(store_id));

-- Políticas RLS - Transactions
CREATE POLICY transactions_select ON public.financial_transactions FOR SELECT TO authenticated USING (private.is_store_treasurer(store_id));
CREATE POLICY transactions_insert ON public.financial_transactions FOR INSERT TO authenticated WITH CHECK (private.is_store_treasurer(store_id));
CREATE POLICY transactions_update ON public.financial_transactions FOR UPDATE TO authenticated USING (private.is_store_treasurer(store_id)) WITH CHECK (private.is_store_treasurer(store_id));
CREATE POLICY transactions_delete ON public.financial_transactions FOR DELETE TO authenticated USING (private.is_store_treasurer(store_id));
