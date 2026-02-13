-- Tabe de Categorias
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Lançamentos (Movimentações)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category_id UUID REFERENCES categories(id),
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'paid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Usuários podem ver todas as categorias" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem ver apenas seus próprios lançamentos" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios lançamentos" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios lançamentos" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios lançamentos" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Inserir categorias padrão
INSERT INTO categories (name, icon, color, type) VALUES
  ('Salário', 'salary', '#10b981', 'income'),
  ('Investimentos', 'investment', '#34d399', 'income'),
  ('Vendas', 'sale', '#059669', 'income'),
  ('Outros (Receita)', 'other', '#6ee7b7', 'income'),
  ('Aluguel', 'rent', '#ef4444', 'expense'),
  ('Alimentação', 'food', '#f87171', 'expense'),
  ('Transporte', 'transport', '#fca5a5', 'expense'),
  ('Saúde', 'health', '#fecaca', 'expense'),
  ('Lazer', 'leisure', '#f97316', 'expense'),
  ('Outros (Despesa)', 'other', '#fb923c', 'expense');
