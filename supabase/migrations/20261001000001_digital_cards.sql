-- Tabela para carteirinhas digitais seguras
CREATE TABLE public.digital_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  brother_id uuid NOT NULL REFERENCES public.brothers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX idx_digital_cards_store_id ON public.digital_cards(store_id);
CREATE INDEX idx_digital_cards_brother_id ON public.digital_cards(brother_id);
CREATE INDEX idx_digital_cards_token ON public.digital_cards(token);

ALTER TABLE public.digital_cards ENABLE ROW LEVEL SECURITY;

-- Admins e Secretários podem ver tudo de sua loja
CREATE POLICY digital_cards_admin_select ON public.digital_cards
  FOR SELECT TO authenticated
  USING (private.is_store_admin(store_id));

CREATE POLICY digital_cards_admin_insert ON public.digital_cards
  FOR INSERT TO authenticated
  WITH CHECK (private.is_store_admin(store_id));

CREATE POLICY digital_cards_admin_update ON public.digital_cards
  FOR UPDATE TO authenticated
  USING (private.is_store_admin(store_id))
  WITH CHECK (private.is_store_admin(store_id));

-- Irmão logado pode ver e atualizar seus próprios cartões
CREATE POLICY digital_cards_own_select ON public.digital_cards
  FOR SELECT TO authenticated
  USING (
    brother_id IN (
      SELECT id FROM public.brothers WHERE user_id = auth.uid() AND store_id = public.digital_cards.store_id
    )
  );

CREATE POLICY digital_cards_own_insert ON public.digital_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    brother_id IN (
      SELECT id FROM public.brothers WHERE user_id = auth.uid() AND store_id = public.digital_cards.store_id
    )
  );

CREATE POLICY digital_cards_own_update ON public.digital_cards
  FOR UPDATE TO authenticated
  USING (
    brother_id IN (
      SELECT id FROM public.brothers WHERE user_id = auth.uid() AND store_id = public.digital_cards.store_id
    )
  )
  WITH CHECK (
    brother_id IN (
      SELECT id FROM public.brothers WHERE user_id = auth.uid() AND store_id = public.digital_cards.store_id
    )
  );

