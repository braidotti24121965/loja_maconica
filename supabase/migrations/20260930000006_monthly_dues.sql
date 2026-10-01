-- Migration: Módulo de Inadimplência e Mensalidades (Fase 8)

CREATE TABLE public.monthly_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  brother_id uuid NOT NULL REFERENCES public.brothers(id) ON DELETE CASCADE,
  competence text NOT NULL, -- Ex: '2026-01'
  due_date date NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'exempt', 'canceled')),
  payment_date date,
  payment_method text,
  transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, brother_id, competence)
);

CREATE INDEX idx_monthly_dues_store_id ON public.monthly_dues(store_id);
CREATE INDEX idx_monthly_dues_brother_id ON public.monthly_dues(brother_id);

ALTER TABLE public.monthly_dues ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_monthly_dues_updated_at
  BEFORE UPDATE ON public.monthly_dues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Admin / Treasurer podem fazer TUDO
CREATE POLICY dues_admin_select ON public.monthly_dues FOR SELECT TO authenticated USING (private.is_store_treasurer(store_id));
CREATE POLICY dues_admin_insert ON public.monthly_dues FOR INSERT TO authenticated WITH CHECK (private.is_store_treasurer(store_id));
CREATE POLICY dues_admin_update ON public.monthly_dues FOR UPDATE TO authenticated USING (private.is_store_treasurer(store_id)) WITH CHECK (private.is_store_treasurer(store_id));
CREATE POLICY dues_admin_delete ON public.monthly_dues FOR DELETE TO authenticated USING (private.is_store_treasurer(store_id));

-- Irmão logado pode VER apenas as suas próprias mensalidades
CREATE POLICY dues_own_select ON public.monthly_dues FOR SELECT TO authenticated
  USING (
    brother_id IN (
      SELECT id FROM public.brothers WHERE user_id = auth.uid() AND store_id = public.monthly_dues.store_id
    )
  );
