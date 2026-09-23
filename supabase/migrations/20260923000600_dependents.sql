-- Criação da tabela dependents (Familiares do Obreiro)
CREATE TABLE dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brother_id UUID NOT NULL REFERENCES brothers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  birthdate DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE dependents ENABLE ROW LEVEL SECURITY;

-- Políticas (Dependentes pertencem ao irmão, que pertence a uma loja)
-- Para ler, o usuário precisa ser membro da loja do irmão.
CREATE POLICY "Membros podem ver dependentes de sua loja"
  ON dependents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brothers b
      JOIN store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = auth.uid()
    )
  );

-- Para inserir/atualizar/deletar, o usuário também precisa ser membro da mesma loja.
CREATE POLICY "Membros podem gerenciar dependentes de sua loja"
  ON dependents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brothers b
      JOIN store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = auth.uid()
    )
  );

-- Criar função caso não exista
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar gatilho para updated_at
CREATE TRIGGER update_dependents_updated_at
  BEFORE UPDATE ON dependents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
