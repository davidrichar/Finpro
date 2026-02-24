-- ============================================
-- FIX: Sincronização de Saldo Bancário
-- ============================================

-- 1. Garantir que a coluna 'contabilizado' existe na tabela 'transactions'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_attribute 
                   WHERE  attrelid = 'public.transactions'::regclass 
                   AND    attname = 'contabilizado' 
                   AND    NOT attisdropped) THEN
        ALTER TABLE public.transactions ADD COLUMN contabilizado BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Refatorar a função de atualização de saldo para ser robusta
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- REVERTER IMPACTO DO REGISTRO ANTIGO (se existia e estava pago)
    -- Ocorre em UPDATE e DELETE
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        IF OLD.status = 'paid' AND OLD.account_id IS NOT NULL THEN
            IF OLD.type = 'income' THEN
                UPDATE public.bank_accounts 
                SET balance = balance - OLD.amount 
                WHERE id = OLD.account_id;
            ELSE -- expense
                UPDATE public.bank_accounts 
                SET balance = balance + OLD.amount 
                WHERE id = OLD.account_id;
            END IF;
        END IF;
    END IF;

    -- APLICAR IMPACTO DO NOVO REGISTRO (se existe e está pago)
    -- Ocorre em INSERT e UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.status = 'paid' AND NEW.account_id IS NOT NULL THEN
            IF NEW.type = 'income' THEN
                UPDATE public.bank_accounts 
                SET balance = balance + NEW.amount 
                WHERE id = NEW.account_id;
            ELSE -- expense
                UPDATE public.bank_accounts 
                SET balance = balance - NEW.amount 
                WHERE id = NEW.account_id;
            END IF;
            
            -- Sincronizar flag contabilizado para o frontend saber que afetou o saldo
            NEW.contabilizado = true;
        ELSE
            -- Se não está pago, o flag deve ser falso
            NEW.contabilizado = false;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar os triggers de forma limpa
-- Removemos triggers antigos que possam ter nomes variados
DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.transactions;
DROP TRIGGER IF EXISTS trigger_update_account_balance_delete ON public.transactions;

-- Trigger para INSERT e UPDATE (precisa ser BEFORE para alterar NEW.contabilizado)
CREATE TRIGGER trigger_update_account_balance_upsert
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_account_balance();

-- Trigger para DELETE (precisa ser AFTER ou BEFORE, mas AFTER é mais comum para delete logic)
CREATE TRIGGER trigger_update_account_balance_delete
AFTER DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_account_balance();

-- 4. (Opcional) Recalcular saldos atuais para garantir consistência
-- CUIDADO: Isso assume que o saldo inicial das contas estava correto ou era zero.
-- Se as contas já tinham um saldo inicial manual, rodar isso pode bagunçar.
-- Por enquanto, vamos apenas garantir que os novos lançamentos funcionem.
