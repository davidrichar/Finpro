-- ============================================
-- SISTEMA FINANCEIRO - SCHEMA COMPLETO
-- ============================================
-- Este arquivo contém todo o schema do banco de dados
-- Cole este conteúdo no SQL Editor do Supabase
-- ============================================

-- Habilitar extensão UUID (caso não esteja habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: categories
-- Armazena as categorias de receitas e despesas
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================
-- TABELA: bank_accounts
-- Armazena as contas bancárias dos usuários
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0,
  type TEXT DEFAULT 'landmark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================
-- TABELA: transactions
-- Armazena todas as transações (receitas e despesas)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'paid',
  contabilizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE SEGURANÇA - CATEGORIES
-- ============================================
-- Todos podem ver as categorias (são compartilhadas)
DROP POLICY IF EXISTS "Usuários podem ver todas as categorias" ON categories;
CREATE POLICY "Usuários podem ver todas as categorias" ON categories
  FOR SELECT USING (true);

-- ============================================
-- POLÍTICAS DE SEGURANÇA - BANK_ACCOUNTS
-- ============================================
-- Usuários podem ver apenas suas próprias contas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias contas" ON bank_accounts;
CREATE POLICY "Usuários podem ver suas próprias contas" ON bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias contas
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias contas" ON bank_accounts;
CREATE POLICY "Usuários podem inserir suas próprias contas" ON bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias contas
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias contas" ON bank_accounts;
CREATE POLICY "Usuários podem atualizar suas próprias contas" ON bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias contas
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias contas" ON bank_accounts;
CREATE POLICY "Usuários podem deletar suas próprias contas" ON bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS DE SEGURANÇA - TRANSACTIONS
-- ============================================
-- Usuários podem ver apenas suas próprias transações
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios lançamentos" ON transactions;
CREATE POLICY "Usuários podem ver apenas seus próprios lançamentos" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias transações
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios lançamentos" ON transactions;
CREATE POLICY "Usuários podem inserir seus próprios lançamentos" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias transações
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios lançamentos" ON transactions;
CREATE POLICY "Usuários podem atualizar seus próprios lançamentos" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias transações
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios lançamentos" ON transactions;
CREATE POLICY "Usuários podem deletar seus próprios lançamentos" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS: Atualizar updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO: Atualizar saldo da conta automaticamente
-- ============================================
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
-- TRIGGER: Atualizar saldo automaticamente
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- ============================================
-- DADOS INICIAIS: Categorias Padrão
-- ============================================
-- Limpar categorias existentes (opcional)
-- DELETE FROM categories;

-- Inserir categorias padrão
INSERT INTO categories (name, icon, color, type) VALUES
  ('Salário', 'salary', '#10b981', 'income'),
  ('Investimentos', 'investment', '#34d399', 'income'),
  ('Vendas', 'sale', '#059669', 'income'),
  ('Freelance', 'freelance', '#6ee7b7', 'income'),
  ('Outros (Receita)', 'other', '#a7f3d0', 'income'),
  
  ('Aluguel', 'rent', '#ef4444', 'expense'),
  ('Alimentação', 'food', '#f87171', 'expense'),
  ('Transporte', 'transport', '#fca5a5', 'expense'),
  ('Saúde', 'health', '#fecaca', 'expense'),
  ('Lazer', 'leisure', '#f97316', 'expense'),
  ('Educação', 'education', '#fb923c', 'expense'),
  ('Contas', 'bills', '#fdba74', 'expense'),
  ('Compras', 'shopping', '#fed7aa', 'expense'),
  ('Outros (Despesa)', 'other', '#ffedd5', 'expense')
ON CONFLICT DO NOTHING;

-- ============================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);

-- ============================================
-- FIM DO SCHEMA
-- ============================================
-- Schema criado com sucesso!
-- Agora você pode começar a usar o sistema.
-- ============================================
