-- Adicionar coluna email na tabela public.brothers
ALTER TABLE public.brothers
  ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS idx_brothers_email ON public.brothers(email);
