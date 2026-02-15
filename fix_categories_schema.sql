-- ============================================
-- SCRIPT DE CORREÇÃO DO BANCO DE DADOS
-- Rode este script no Editor SQL do Supabase
-- ============================================

-- 1. Cria a função auth.uid() se não existir (para garantir compatibilidade)
-- CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
--   select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
-- $$;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 2. Adicionar coluna user_id na tabela categories (se não existir)
-- Isso permite vincular categorias a usuários específicos
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Atualizar Políticas de Segurança (RLS)
-- Primeiro, removemos as políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Usuários podem ver todas as categorias" ON categories;
DROP POLICY IF EXISTS "Usuários podem inserir categorias" ON categories;
DROP POLICY IF EXISTS "Usuários podem atualizar categorias" ON categories;
DROP POLICY IF EXISTS "Usuários podem deletar categorias" ON categories;
DROP POLICY IF EXISTS "Enable read access for own categories" ON categories;
DROP POLICY IF EXISTS "Enable insert for own categories" ON categories;
DROP POLICY IF EXISTS "Enable update for own categories" ON categories;
DROP POLICY IF EXISTS "Enable delete for own categories" ON categories;
DROP POLICY IF EXISTS "Visualizar categorias" ON categories;
DROP POLICY IF EXISTS "Criar categorias" ON categories;
DROP POLICY IF EXISTS "Editar categorias" ON categories;
DROP POLICY IF EXISTS "Excluir categorias" ON categories;

-- POLÍTICA 1: VISUALIZAÇÃO (SELECT)
-- Usuários podem ver suas próprias categorias E categorias públicas (sem user_id)
-- IMPORTANTE: "user_id IS NULL" permite ver categorias padrão do sistema
CREATE POLICY "Visualizar categorias" ON categories
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- POLÍTICA 2: INSERÇÃO (INSERT)
-- Usuários podem criar categorias vinculadas ao seu ID
-- IMPORTANTE: O check garante que você só pode criar para você mesmo
CREATE POLICY "Criar categorias" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POLÍTICA 3: ATUALIZAÇÃO (UPDATE)
-- Usuários podem editar APENAS suas próprias categorias
CREATE POLICY "Editar categorias" ON categories
    FOR UPDATE USING (auth.uid() = user_id);

-- POLÍTICA 4: EXCLUSÃO (DELETE)
-- Usuários podem excluir APENAS suas próprias categorias
CREATE POLICY "Excluir categorias" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
