-- RASCUNHO NÃO APLICÁVEL — requer revisão de RLS e Storage antes de virar migration.

-- 1. Criação das Tabelas de Eventos
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros podem gerenciar eventos da sua loja"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM store_memberships sm
      WHERE sm.store_id = events.store_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem gerenciar fotos dos eventos da sua loja"
  ON event_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN store_memberships sm ON sm.store_id = e.store_id
      WHERE e.id = event_photos.event_id
      AND sm.user_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('lojas-media', 'lojas-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Fotos públicas podem ser lidas por todos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lojas-media');

CREATE POLICY "Usuários autenticados podem enviar fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lojas-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Usuários autenticados podem deletar fotos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lojas-media'
    AND auth.role() = 'authenticated'
  );
