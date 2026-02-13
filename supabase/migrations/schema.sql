
-- ################################################
-- FINAL DATABASE SCHEMA: FinanceApp
-- Includes: Profiles, Categories, Advanced Transactions, RLS
-- ################################################

-- 1. PROFILES TABLE (Linked to Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. CATEGORIES TABLE
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    color TEXT DEFAULT '#10b981',
    tipo TEXT CHECK (tipo IN ('receita', 'despesa')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 3. TRANSACTIONS (LANÇAMENTOS) TABLE
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    categoria_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor DECIMAL(12,2) NOT NULL DEFAULT 0,
    tipo TEXT CHECK (tipo IN ('receita', 'despesa')) NOT NULL,
    origem TEXT CHECK (origem IN ('conta_pagar', 'conta_receber', 'movimentacao')) NOT NULL,
    status TEXT CHECK (status IN ('pendente', 'pago', 'recebido')) DEFAULT 'pendente',
    data_vencimento DATE NOT NULL DEFAULT CURRENT_DATE,
    recorrente BOOLEAN DEFAULT false,
    fixa BOOLEAN DEFAULT false,
    total_parcelas INTEGER DEFAULT 1,
    parcela_atual INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories Policies
CREATE POLICY "Users can view their own categories" ON categories FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- 5. AUTOMATIC PROFILE TRIGGER
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'name',
        new.email,
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. DEFAULT CATEGORIES SEED (OPTIONAL)
INSERT INTO categories (nome, tipo, user_id) VALUES
('Salário', 'receita', NULL),
('Investimentos', 'receita', NULL),
('Vendas', 'receita', NULL),
('Aluguel', 'despesa', NULL),
('Alimentação', 'despesa', NULL),
('Transporte', 'despesa', NULL),
('Lazer', 'despesa', NULL),
('Saúde', 'despesa', NULL);
