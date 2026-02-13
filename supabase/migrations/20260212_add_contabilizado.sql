-- ============================================
-- MIGRATION: Add contabilizado field
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Adicionar campo contabilizado à tabela transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS contabilizado BOOLEAN DEFAULT false;

-- Atualizar transações existentes que já estão pagas para contabilizado = true
UPDATE transactions 
SET contabilizado = true 
WHERE status = 'paid';

-- Recriar a função de atualização de saldo com validação de contabilizado
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for uma nova transação
  IF (TG_OP = 'INSERT') THEN
    -- Só atualiza saldo se status = 'paid' E não foi contabilizado ainda
    IF NEW.account_id IS NOT NULL AND NEW.status = 'paid' AND NEW.contabilizado = false THEN
      IF NEW.type = 'income' THEN
        UPDATE bank_accounts 
        SET balance = balance + NEW.amount 
        WHERE id = NEW.account_id;
        -- Marcar como contabilizado
        NEW.contabilizado = true;
      ELSIF NEW.type = 'expense' THEN
        UPDATE bank_accounts 
        SET balance = balance - NEW.amount 
        WHERE id = NEW.account_id;
        -- Marcar como contabilizado
        NEW.contabilizado = true;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Se for uma atualização
  IF (TG_OP = 'UPDATE') THEN
    -- Reverter o valor antigo se estava pago E contabilizado
    IF OLD.account_id IS NOT NULL AND OLD.status = 'paid' AND OLD.contabilizado = true THEN
      IF OLD.type = 'income' THEN
        UPDATE bank_accounts 
        SET balance = balance - OLD.amount 
        WHERE id = OLD.account_id;
      ELSIF OLD.type = 'expense' THEN
        UPDATE bank_accounts 
        SET balance = balance + OLD.amount 
        WHERE id = OLD.account_id;
      END IF;
    END IF;

    -- Aplicar o novo valor se está pago E não foi contabilizado ainda
    IF NEW.account_id IS NOT NULL AND NEW.status = 'paid' AND NEW.contabilizado = false THEN
      IF NEW.type = 'income' THEN
        UPDATE bank_accounts 
        SET balance = balance + NEW.amount 
        WHERE id = NEW.account_id;
        -- Marcar como contabilizado
        NEW.contabilizado = true;
      ELSIF NEW.type = 'expense' THEN
        UPDATE bank_accounts 
        SET balance = balance - NEW.amount 
        WHERE id = NEW.account_id;
        -- Marcar como contabilizado
        NEW.contabilizado = true;
      END IF;
    -- Se já estava pago e contabilizado, apenas manter o flag
    ELSIF NEW.account_id IS NOT NULL AND NEW.status = 'paid' AND OLD.contabilizado = true THEN
      NEW.contabilizado = true;
    END IF;
    RETURN NEW;
  END IF;

  -- Se for uma exclusão
  IF (TG_OP = 'DELETE') THEN
    -- Só reverte se estava pago E contabilizado
    IF OLD.account_id IS NOT NULL AND OLD.status = 'paid' AND OLD.contabilizado = true THEN
      IF OLD.type = 'income' THEN
        UPDATE bank_accounts 
        SET balance = balance - OLD.amount 
        WHERE id = OLD.account_id;
      ELSIF OLD.type = 'expense' THEN
        UPDATE bank_accounts 
        SET balance = balance + OLD.amount 
        WHERE id = OLD.account_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FIM DA MIGRATION
-- ============================================
