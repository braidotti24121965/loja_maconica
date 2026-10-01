-- Migração: Normalizar graus na tabela public.brothers
UPDATE public.brothers
SET degree = 'Mestre Maçom'
WHERE degree = 'Mestre';

UPDATE public.brothers
SET degree = 'Aprendiz Maçom'
WHERE degree = 'Aprendiz';

UPDATE public.brothers
SET degree = 'Companheiro Maçom'
WHERE degree = 'Companheiro';
