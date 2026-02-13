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
    Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

type Section = 'Perfil' | 'Contas Bancárias' | 'Categorias' | 'Notificações' | 'Segurança' | 'Aparência' | 'Preferências do Sistema';

export default function Settings() {
    const { user } = useAuth();
    const { showToast } = useToast();
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

    const handleSaveProfile = async () => {
        setLoading(true);
        // In a real app, update metadata or profile table
        setTimeout(() => {
            showToast('Perfil atualizado com sucesso!');
            setLoading(false);
        }, 800);
    };

    const renderSidebar = () => {
        const items: { name: Section; icon: any }[] = [
            { name: 'Perfil', icon: User },
            { name: 'Contas Bancárias', icon: Landmark },
            { name: 'Categorias', icon: Tag },
            { name: 'Notificações', icon: Bell },
            { name: 'Segurança', icon: Shield },
            { name: 'Aparência', icon: Palette },
            { name: 'Preferências do Sistema', icon: SettingsIcon },
        ];

        return (
            <aside className="settings-sidebar">
                {items.map((item) => (
                    <button
                        key={item.name}
                        className={`settings-nav-item ${activeSection === item.name ? 'active' : ''}`}
                        onClick={() => setActiveSection(item.name)}
                    >
                        <item.icon size={18} />
                        {item.name}
                    </button>
                ))}
            </aside>
        );
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
                        <h2 className="settings-section-title">Gestão de Categorias</h2>

                        <h4 className="transfer-label" style={{ marginTop: '1.5rem', color: '#10b981' }}>Receitas</h4>
                        <div className="settings-list" style={{ marginBottom: '2.5rem' }}>
                            {incomeCats.map(cat => (
                                <div key={cat.id} className="settings-list-item">
                                    <div className="item-main-info">
                                        <span className="item-name">{cat.name}</span>
                                    </div>
                                    <div className="item-actions-minimal">
                                        <button className="btn-action-minimal"><Edit2 size={16} /></button>
                                        <button className="btn-action-minimal danger"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h4 className="transfer-label" style={{ color: '#ef4444' }}>Despesas</h4>
                        <div className="settings-list">
                            {expenseCats.map(cat => (
                                <div key={cat.id} className="settings-list-item">
                                    <div className="item-main-info">
                                        <span className="item-name">{cat.name}</span>
                                    </div>
                                    <div className="item-actions-minimal">
                                        <button className="btn-action-minimal"><Edit2 size={16} /></button>
                                        <button className="btn-action-minimal danger"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="btn-add-minimal" style={{ marginTop: '1rem' }}>
                            <Plus size={18} /> Nova Categoria
                        </button>
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
                return (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Customização Visual</h2>
                        <div className="transfer-label" style={{ marginBottom: '1rem' }}>Tema do Sistema</div>
                        <div className="appearance-grid">
                            <div className="appearance-card active">
                                <div className="visual-preview light"></div>
                                <span>Claro</span>
                            </div>
                            <div className="appearance-card">
                                <div className="visual-preview dark"></div>
                                <span>Escuro</span>
                            </div>
                            <div className="appearance-card">
                                <div className="visual-preview auto"></div>
                                <span>Automático</span>
                            </div>
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

    return (
        <div className="settings-page-container">
            {renderSidebar()}
            <main className="settings-main">
                <header className="settings-header">
                    <h1>Configurações</h1>
                    <p>Gerencie preferências, contas e personalizações do sistema.</p>
                </header>
                {renderContent()}
            </main>
        </div>
    );
}
