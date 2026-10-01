-- Migration: Automatically create default financial accounts and categories for new stores

CREATE OR REPLACE FUNCTION public.handle_new_store_finance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create default account
  INSERT INTO public.financial_accounts (store_id, name, balance)
  VALUES (NEW.id, 'Caixa Principal', 0);

  -- Create default income categories
  INSERT INTO public.financial_categories (store_id, name, type)
  VALUES 
    (NEW.id, 'Mensalidade', 'income'),
    (NEW.id, 'Jóia / Iniciação', 'income'),
    (NEW.id, 'Tronco de Beneficência', 'income'),
    (NEW.id, 'Doações Avulsas', 'income');

  -- Create default expense categories
  INSERT INTO public.financial_categories (store_id, name, type)
  VALUES 
    (NEW.id, 'Água / Luz / Internet', 'expense'),
    (NEW.id, 'Aluguel / Condomínio', 'expense'),
    (NEW.id, 'Ágape / Alimentação', 'expense'),
    (NEW.id, 'Materiais de Limpeza e Escritório', 'expense'),
    (NEW.id, 'Taxas da Potência', 'expense');

  RETURN NEW;
END;
$$;

-- Create the trigger on the stores table
DROP TRIGGER IF EXISTS on_store_created_finance ON public.stores;
CREATE TRIGGER on_store_created_finance
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_store_finance();
