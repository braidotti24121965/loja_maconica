-- Fase 3.5: Eventos e Galeria

-- 1. Criar tabela de Eventos
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time,
  location text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'archived')),
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX events_store_id_idx ON public.events(store_id);

-- 2. Criar tabela de Fotos dos Eventos
-- Nota: Adicionamos store_id por denormalização para simplificar políticas de RLS e Storage
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  is_cover boolean DEFAULT false,
  order_index integer DEFAULT 0,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX event_photos_event_id_idx ON public.event_photos(event_id);
CREATE INDEX event_photos_store_id_idx ON public.event_photos(store_id);

-- 3. Habilitar RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

-- 4. Criar gatilho de updated_at para events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Políticas de Acesso: EVENTS
CREATE POLICY events_select ON public.events 
  FOR SELECT TO authenticated 
  USING (private.is_store_member(store_id) AND deleted_at IS NULL);

CREATE POLICY events_insert ON public.events 
  FOR INSERT TO authenticated 
  WITH CHECK (private.is_store_admin(store_id));

CREATE POLICY events_update ON public.events 
  FOR UPDATE TO authenticated 
  USING (private.is_store_admin(store_id))
  WITH CHECK (private.is_store_admin(store_id));

CREATE POLICY events_delete ON public.events 
  FOR DELETE TO authenticated 
  USING (private.is_store_admin(store_id));

-- 6. Políticas de Acesso: EVENT_PHOTOS
CREATE POLICY photos_select ON public.event_photos 
  FOR SELECT TO authenticated 
  USING (private.is_store_member(store_id));

CREATE POLICY photos_insert ON public.event_photos 
  FOR INSERT TO authenticated 
  WITH CHECK (private.is_store_admin(store_id));

CREATE POLICY photos_update ON public.event_photos 
  FOR UPDATE TO authenticated 
  USING (private.is_store_admin(store_id))
  WITH CHECK (private.is_store_admin(store_id));

CREATE POLICY photos_delete ON public.event_photos 
  FOR DELETE TO authenticated 
  USING (private.is_store_admin(store_id));

-- 7. Configuração Segura do Storage (store_media)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store_media', 
  'store_media', 
  false, 
  5242880, -- 5MB limit 
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE 
SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- O nome do arquivo DEVE começar com o store_id (uuid)
-- path_tokens[1] será o store_id. Fazemos o cast para UUID com nullif para não quebrar.

CREATE POLICY storage_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'store_media' AND 
    private.is_store_member(NULLIF(path_tokens[1], '')::uuid)
  );

CREATE POLICY storage_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'store_media' AND 
    private.is_store_admin(NULLIF(path_tokens[1], '')::uuid)
  );

CREATE POLICY storage_media_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'store_media' AND 
    private.is_store_admin(NULLIF(path_tokens[1], '')::uuid)
  );

CREATE POLICY storage_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'store_media' AND 
    private.is_store_admin(NULLIF(path_tokens[1], '')::uuid)
  );
