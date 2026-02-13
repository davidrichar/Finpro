-- ============================================
-- MIGRATION: Regra de Contabilização por Status PAGO
-- ============================================

-- 1. Garantir que o status padrão seja 'pending' para novos registros
ALTER TABLE transactions ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Refatorar a função de atualização de saldo
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- REVERTER IMPACTO DO REGISTRO ANTIGO (se existia e estava pago)
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        IF OLD.status = 'paid' AND OLD.account_id IS NOT NULL THEN
            IF OLD.type = 'income' THEN
                UPDATE bank_accounts 
                SET balance = balance - OLD.amount 
                WHERE id = OLD.account_id;
            ELSE -- expense
                UPDATE bank_accounts 
                SET balance = balance + OLD.amount 
                WHERE id = OLD.account_id;
            END IF;
        END IF;
    END IF;

    -- APLICAR IMPACTO DO NOVO REGISTRO (se existe e está pago)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.status = 'paid' AND NEW.account_id IS NOT NULL THEN
            IF NEW.type = 'income' THEN
                UPDATE bank_accounts 
                SET balance = balance + NEW.amount 
                WHERE id = NEW.account_id;
            ELSE -- expense
                UPDATE bank_accounts 
                SET balance = balance - NEW.amount 
                WHERE id = NEW.account_id;
            END IF;
            
            -- Sincronizar flag contabilizado para compatibilidade legada do front
            NEW.contabilizado = true;
        ELSE
            -- Se não está pago, garantir que flag contabilizado seja falso
            NEW.contabilizado = false;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar o trigger (se necessário, embora a função já esteja vinculada)
-- DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
-- CREATE TRIGGER trigger_update_account_balance
--   AFTER INSERT OR UPDATE OR DELETE ON transactions
--   FOR EACH ROW
--   EXECUTE FUNCTION update_account_balance();

-- NOTA: O trigger deve ser BEFORE para podermos alterar NEW.contabilizado
-- Mas o schema original usava AFTER. 
-- Se usarmos AFTER, não podemos mudar NEW.contabilizado.
-- Vou mudar para BEFORE para garantir a sincronização da flag.

DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

CREATE TRIGGER trigger_update_account_balance_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();
