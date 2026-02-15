import { useState, useEffect } from 'react';
import {
    User,
    Landmark,
    Tag,
    Bell,
    Shield,
    Palette,
    Settings as SettingsIcon,
    Edit2,
    Trash2,
    Plus,
    Lock,
    Globe,
    X,
    Menu
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';

type Section = 'Perfil' | 'Contas Bancárias' | 'Categorias' | 'Notificações' | 'Segurança' | 'Aparência' | 'Preferências do Sistema';

export default function Settings() {
    const { user, signOut } = useAuth();
    const { showToast } = useToast();
    const { theme, setTheme } = useTheme();
    const [activeSection, setActiveSection] = useState<Section>('Perfil');
    const [loading, setLoading] = useState(false);

    // Profile State
    const [profile, setProfile] = useState({
        name: user?.user_metadata?.name || '',
        email: user?.email || '',
        phone: '',
        currency: 'BRL'
    });

    // Bank Accounts & Categories State
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Category CRUD State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        color: '#10b981',
        type: 'expense' as 'income' | 'expense',
        icon: 'tag'
    });

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Validation State
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        if (activeSection === 'Contas Bancárias') fetchAccounts();
        if (activeSection === 'Categorias') fetchCategories();
    }, [activeSection]);

    const fetchAccounts = async () => {
        const { data } = await supabase.from('bank_accounts').select('*').order('name');
        setAccounts(data || []);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        setCategories(data || []);
    };

    const handleSaveCategory = async () => {
        // Clear previous validation errors
        setValidationError('');

        if (!user) {
            setValidationError('Usuário não autenticado');
            return;
        }

        // Validate required fields
        if (!categoryForm.name.trim()) {
            setValidationError('O nome da categoria é obrigatório');
            return;
        }

        if (!categoryForm.type) {
            setValidationError('O tipo da categoria é obrigatório');
            return;
        }

        if (!categoryForm.color) {
            setValidationError('A cor da categoria é obrigatória');
            return;
        }

        setLoading(true);
        try {
            // Check for duplicate category name (case-insensitive)
            // Filter by user_id if column exists, otherwise global? 
            // Assuming categories are per-user based on request
            const query = supabase
                .from('categories')
                .select('id, name')
                .ilike('name', categoryForm.name.trim());

            // If we assume user_id exists, we should filter by it too?
            // But let's stick to name check for now, Supabase RLS handles visibility

            const { data: existingCategories, error: duplicateError } = await query;

            if (duplicateError) throw duplicateError;

            // If editing, exclude the current category from duplicate check
            const duplicates = editingCategory
                ? existingCategories?.filter(cat => cat.id !== editingCategory.id)
                : existingCategories;

            if (duplicates && duplicates.length > 0) {
                setValidationError('Já existe uma categoria com esse nome');
                setLoading(false);
                return;
            }

            const categoryData = {
                name: categoryForm.name.trim(),
                color: categoryForm.color,
                type: categoryForm.type,
                icon: categoryForm.icon || 'tag', // Ensure icon has a value
                user_id: user.id // Now we assume the schema will be fixed
            };

            let res;
            if (editingCategory) {
                // Remove user_id from update payload just in case (usually immutable)
                const { user_id, ...updateData } = categoryData;
                res = await supabase
                    .from('categories')
                    .update(updateData)
                    .eq('id', editingCategory.id);
            } else {
                res = await supabase
                    .from('categories')
                    .insert([categoryData]);
            }

            if (res.error) {
                console.error('Supabase Error details:', res.error);
                throw res.error;
            }

            showToast(`Categoria ${editingCategory ? 'atualizada' : 'criada'} com sucesso!`);
            fetchCategories();
            setIsCategoryModalOpen(false);

            // Reset form after successful save
            setCategoryForm({
                name: '',
                color: '#10b981',
                type: 'expense',
                icon: 'tag'
            });
            setEditingCategory(null);
        } catch (err: any) {
            console.error('Error saving category:', err);
            // Show more specific error if available
            setValidationError(err.message || 'Erro ao salvar categoria');
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (category: any) => {
        setCategoryToDelete(category);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;

        setIsDeleting(true);
        try {
            // First, check if there are any transactions linked to this category
            const { count, error: countError } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', categoryToDelete.id);

            if (countError) throw countError;

            // If there are linked transactions, prevent deletion
            if (count && count > 0) {
                showToast(
                    `Não é possível excluir esta categoria. Existem ${count} transação(ões) vinculada(s). Reatribua ou exclua essas transações primeiro.`,
                    'error'
                );
                setIsDeleteModalOpen(false);
                setIsDeleting(false);
                return;
            }

            // No linked transactions, proceed with deletion
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', categoryToDelete.id);

            if (error) throw error;

            showToast('Categoria excluída com sucesso!');
            fetchCategories();
            setIsDeleteModalOpen(false);
        } catch (err) {
            console.error('Error deleting category:', err);
            showToast('Erro ao excluir categoria.', 'error');
        } finally {
            setIsDeleting(false);
            setCategoryToDelete(null);
        }
    };

    const openCategoryModal = (cat?: any) => {
        setValidationError(''); // Clear any previous errors
        if (cat) {
            setEditingCategory(cat);
            setCategoryForm({
                name: cat.name,
                color: cat.color || '#10b981',
                type: cat.type || 'expense',
                icon: cat.icon || 'tag'
            });
        } else {
            setEditingCategory(null);
            setCategoryForm({
                name: '',
                color: '#10b981',
                type: 'expense',
                icon: 'tag'
            });
        }
        setIsCategoryModalOpen(true);
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        // In a real app, update metadata or profile table
        setTimeout(() => {
            showToast('Perfil atualizado com sucesso!');
            setLoading(false);
        }, 800);
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'Perfil':
                return (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Informações do Perfil</h2>
                        <div className="settings-form-grid">
                            <div className="settings-field">
                                <label>Nome Completo</label>
                                <input
                                    type="text"
                                    className="settings-input"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                />
                            </div>
                            <div className="settings-field">
                                <label>Email</label>
                                <input type="email" className="settings-input" value={profile.email} disabled />
                            </div>
                            <div className="settings-field">
                                <label>Telefone</label>
                                <input
                                    type="text"
                                    className="settings-input"
                                    placeholder="(00) 00000-0000"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                />
                            </div>
                            <div className="settings-field">
                                <label>Moeda Padrão</label>
                                <select
                                    className="settings-select"
                                    value={profile.currency}
                                    onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                                >
                                    <option value="BRL">BRL - Real Brasileiro</option>
                                    <option value="USD">USD - Dólar Americano</option>
                                    <option value="EUR">EUR - Euro</option>
                                </select>
                            </div>
                        </div>
                        <button className="btn-settings-save" onClick={handleSaveProfile} disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                );

            case 'Contas Bancárias':
                return (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Contas Bancárias</h2>
                        <div className="settings-list">
                            {accounts.map(acc => (
                                <div key={acc.id} className="settings-list-item">
                                    <div className="item-main-info">
                                        <span className="item-name">{acc.name}</span>
                                        <span className="item-sub">{acc.bank_name} • Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance)}</span>
                                    </div>
                                    <div className="item-actions-minimal">
                                        <button className="btn-action-minimal"><Edit2 size={16} /></button>
                                        <button className="btn-action-minimal danger"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            <button className="btn-add-minimal">
                                <Plus size={18} /> Adicionar Nova Conta
                            </button>
                        </div>
                    </div>
                );

            case 'Categorias':
                const incomeCats = categories.filter(c => c.type === 'income');
                const expenseCats = categories.filter(c => c.type === 'expense');
                return (
                    <div className="settings-section">
                        <div className="categories-header flex justify-between items-center mb-6">
                            <h2 className="settings-section-title" style={{ margin: 0 }}>Gestão de Categorias</h2>
                            <button className="btn-add-minimal" onClick={() => openCategoryModal()}>
                                <Plus size={18} /> Nova Categoria
                            </button>
                        </div>

                        <h4 className="transfer-label" style={{ marginTop: '1.5rem', color: '#10b981' }}>Receitas</h4>
                        <div className="settings-list" style={{ marginBottom: '2.5rem' }}>
                            {incomeCats.length === 0 ? (
                                <p className="text-sm text-gray-500 italic p-4 text-center">Nenhuma categoria de receita.</p>
                            ) : (
                                incomeCats.map(cat => (
                                    <div key={cat.id} className="settings-list-item">
                                        <div className="item-main-info flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                            <span className="item-name">{cat.name}</span>
                                        </div>
                                        <div className="item-actions-minimal">
                                            <button className="btn-action-minimal" onClick={() => openCategoryModal(cat)}><Edit2 size={16} /></button>
                                            <button className="btn-action-minimal danger" onClick={() => openDeleteModal(cat)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <h4 className="transfer-label" style={{ color: '#ef4444' }}>Despesas</h4>
                        <div className="settings-list">
                            {expenseCats.length === 0 ? (
                                <p className="text-sm text-gray-500 italic p-4 text-center">Nenhuma categoria de despesa.</p>
                            ) : (
                                expenseCats.map(cat => (
                                    <div key={cat.id} className="settings-list-item">
                                        <div className="item-main-info flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                            <span className="item-name">{cat.name}</span>
                                        </div>
                                        <div className="item-actions-minimal">
                                            <button className="btn-action-minimal" onClick={() => openCategoryModal(cat)}><Edit2 size={16} /></button>
                                            <button className="btn-action-minimal danger" onClick={() => openDeleteModal(cat)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Category Modal */}
                        {isCategoryModalOpen && (
                            <div
                                className="modal-overlay category-modal-overlay"
                                onClick={() => setIsCategoryModalOpen(false)}
                            >
                                <div
                                    className="modal-content category-modal-content"
                                    onClick={e => e.stopPropagation()}
                                    style={{ maxWidth: '420px', width: '95%' }}
                                >
                                    <div className="modal-header">
                                        <h3>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                                        <button
                                            className="btn-close"
                                            onClick={() => setIsCategoryModalOpen(false)}
                                            disabled={loading}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="category-modal-body">
                                        {/* Validation Error Message */}
                                        {validationError && (
                                            <div className="validation-error-message">
                                                {validationError}
                                            </div>
                                        )}

                                        <div className="category-form-field">
                                            <label className="category-label">NOME</label>
                                            <input
                                                type="text"
                                                className="category-input"
                                                placeholder="Ex: Alimentação"
                                                value={categoryForm.name}
                                                onChange={e => {
                                                    setCategoryForm({ ...categoryForm, name: e.target.value });
                                                    setValidationError(''); // Clear error on input
                                                }}
                                                disabled={loading}
                                                autoFocus
                                            />
                                        </div>

                                        <div className="category-form-field">
                                            <label className="category-label">TIPO</label>
                                            <select
                                                className="category-select"
                                                value={categoryForm.type}
                                                onChange={e => {
                                                    setCategoryForm({ ...categoryForm, type: e.target.value as any });
                                                    setValidationError('');
                                                }}
                                                disabled={loading}
                                            >
                                                <option value="expense">Despesa</option>
                                                <option value="income">Receita</option>
                                            </select>
                                        </div>

                                        <div className="category-form-field">
                                            <label className="category-label">COR</label>
                                            <div className="category-color-picker">
                                                <input
                                                    type="color"
                                                    value={categoryForm.color}
                                                    onChange={e => {
                                                        setCategoryForm({ ...categoryForm, color: e.target.value });
                                                        setValidationError('');
                                                    }}
                                                    className="category-color-input"
                                                    disabled={loading}
                                                />
                                                <input
                                                    type="text"
                                                    className="category-input category-color-text"
                                                    value={categoryForm.color}
                                                    onChange={e => {
                                                        setCategoryForm({ ...categoryForm, color: e.target.value });
                                                        setValidationError('');
                                                    }}
                                                    disabled={loading}
                                                    placeholder="#10b981"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            className="btn-save-category"
                                            onClick={handleSaveCategory}
                                            disabled={loading}
                                        >
                                            {loading ? 'Salvando...' : 'Salvar Categoria'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Delete Confirmation Modal */}
                        {isDeleteModalOpen && categoryToDelete && (
                            <div className="modal-overlay" onClick={() => !isDeleting && setIsDeleteModalOpen(false)}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                                    <div className="modal-header">
                                        <h3>Confirmar Exclusão</h3>
                                        <button
                                            className="btn-close"
                                            onClick={() => setIsDeleteModalOpen(false)}
                                            disabled={isDeleting}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <div className="mb-6">
                                            <p className="text-base mb-3" style={{ color: 'var(--text-main)' }}>
                                                Tem certeza que deseja excluir a categoria:
                                            </p>
                                            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: categoryToDelete.color }}
                                                />
                                                <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                                    {categoryToDelete.name}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
                                                Esta ação não poderá ser desfeita. A categoria será excluída permanentemente.
                                            </p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                className="btn-settings-save"
                                                onClick={() => setIsDeleteModalOpen(false)}
                                                disabled={isDeleting}
                                                style={{
                                                    flex: 1,
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--text-main)'
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                className="btn-settings-save"
                                                onClick={handleDeleteCategory}
                                                disabled={isDeleting}
                                                style={{
                                                    flex: 1,
                                                    background: '#ef4444',
                                                    color: 'white'
                                                }}
                                            >
                                                {isDeleting ? 'Excluindo...' : 'Excluir'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'Notificações':
                return (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Preferências de Notificação</h2>
                        <div className="settings-control-row">
                            <div className="control-info">
                                <h4>Alertas de Despesas</h4>
                                <p>Receba uma notificação ao registrar novas despesas.</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" defaultChecked />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="settings-control-row">
                            <div className="control-info">
                                <h4>Saldo Baixo</h4>
                                <p>Notificar quando o saldo de uma conta for inferior a R$ 500,00.</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" defaultChecked />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="settings-control-row">
                            <div className="control-info">
                                <h4>Resumo Semanal</h4>
                                <p>Receba um relatório de performance financeira por email toda segunda-feira.</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>
                );

            case 'Segurança':
                return (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Segurança da Conta</h2>
                        <div className="settings-list">
                            <div className="settings-list-item">
                                <div className="item-main-info">
                                    <span className="item-name">Alterar Senha</span>
                                    <span className="item-sub">Atualize sua senha de acesso ao sistema.</span>
                                </div>
                                <button className="btn-action-minimal"><Lock size={18} /></button>
                            </div>
                            <div className="settings-list-item">
                                <div className="item-main-info">
                                    <span className="item-name">Autenticação em Duas Etapas</span>
                                    <span className="item-sub">Adicione uma camada extra de segurança.</span>
                                </div>
                                <button className="btn-action-minimal"><Globe size={18} /></button>
                            </div>
                        </div>
                        <button className="btn-settings-save" style={{ background: '#FF5252', marginTop: '3rem' }}>
                            Encerrar Todas as Sessões
                        </button>
                    </div>
                );

            case 'Aparência':
                const themes: { id: 'light' | 'dark' | 'system'; name: string; class: string }[] = [
                    { id: 'light', name: 'Claro', class: 'light-preview' },
                    { id: 'dark', name: 'Escuro', class: 'dark-preview' },
                    { id: 'system', name: 'Automático', class: 'system-preview' },
                ];

                return (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Customização Visual</h2>
                        <div className="transfer-label" style={{ marginBottom: '1rem' }}>Tema do Sistema</div>
                        <div className="appearance-grid">
                            {themes.map((t) => (
                                <div
                                    key={t.id}
                                    className={`appearance-card ${theme === t.id ? 'active' : ''}`}
                                    onClick={() => setTheme(t.id)}
                                >
                                    <div className={`visual-preview ${t.class}`}>
                                        <div className="preview-header"></div>
                                        <div className="preview-body">
                                            <div className="preview-line"></div>
                                            <div className="preview-line short"></div>
                                        </div>
                                    </div>
                                    <span>{t.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="transfer-label" style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>Formato de Data</div>
                        <select className="settings-select" style={{ width: '100%', maxWidth: '300px' }}>
                            <option>DD/MM/YYYY (Brasil)</option>
                            <option>MM/DD/YYYY (EUA)</option>
                        </select>
                    </div>
                );

            case 'Preferências do Sistema':
                return (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Lógica e Automação</h2>
                        <div className="settings-control-row">
                            <div className="control-info">
                                <h4>Consolidar Apenas Pagos</h4>
                                <p>Considerar no saldo apenas transações marcadas como "Paga".</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" defaultChecked />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="settings-control-row">
                            <div className="control-info">
                                <h4>Atualização Dinâmica</h4>
                                <p>Atualizar dados do dashboard via Realtime (Supabase).</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" defaultChecked />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const menuItems = [
        { id: 'Perfil' as Section, label: 'Perfil', icon: <User size={18} /> },
        { id: 'Contas Bancárias' as Section, label: 'Contas Bancárias', icon: <Landmark size={18} /> },
        { id: 'Categorias' as Section, label: 'Categorias', icon: <Tag size={18} /> },
        { id: 'Notificações' as Section, label: 'Notificações', icon: <Bell size={18} /> },
        { id: 'Segurança' as Section, label: 'Segurança', icon: <Shield size={18} /> },
        { id: 'Aparência' as Section, label: 'Aparência', icon: <Palette size={18} /> },
        { id: 'Preferências do Sistema' as Section, label: 'Preferências do Sistema', icon: <SettingsIcon size={18} /> },
    ];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu when a section is selected
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [activeSection]);

    const renderSidebar = () => (
        <>
            {/* Mobile Overlay */}
            <div
                className={`settings-sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <aside className={`settings-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header-mobile">
                    <h3>Menu</h3>
                    <button className="btn-close-sidebar" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={20} />
                    </button>
                </div>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`settings-nav-item ${activeSection === item.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(item.id)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </aside>
        </>
    );

    return (
        <div className="settings-page-container">
            {renderSidebar()}
            <main className="settings-main">
                <header className="settings-header" style={{ marginBottom: '2rem' }}>
                    <div className="flex items-center gap-3">
                        <button
                            className="btn-mobile-menu-toggle md:hidden"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl">Configurações</h1>
                            <p className="text-sm md:text-base">Gerencie preferências, contas e personalizações do sistema.</p>
                        </div>
                    </div>
                </header>
                {renderContent()}
            </main>
        </div>
    );
}
