import { useState, useEffect, useCallback } from 'react';
import {
    PlusCircle,
    Landmark,
    Wallet,
    PiggyBank,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Eye,
    Trash2,
    X,
    Clock
} from 'lucide-react';

interface BankAccount {
    id: string;
    name: string;
    bank_name: string;
    balance: number;
    type: string;
    created_at?: string;
}
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AddAccountModal from '../components/modals/AddAccountModal';

const iconMap: Record<string, any> = {
    landmark: Landmark,
    wallet: Wallet,
    piggy: PiggyBank,
    card: CreditCard
};

export default function Accounts() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filtering state
    const [filterMode, setFilterMode] = useState<'today' | 'week' | 'month' | 'custom'>('month');
    const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Modals state
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const fetchAccounts = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('bank_accounts')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setBankAccounts(data || []);

            // Default select the first account if none selected
            if (data && data.length > 0 && !selectedAccountId) {
                setSelectedAccountId(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching accounts:', err);
        } finally {
            setLoading(false);
        }
    }, [user, selectedAccountId]);

    const updateDateRange = useCallback((mode: string) => {
        const now = new Date();
        let start = '';
        let end = now.toISOString().split('T')[0];

        if (mode === 'today') {
            start = end;
        } else if (mode === 'week') {
            const d = new Date(now);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
            const monday = new Date(d.setDate(diff));
            start = monday.toISOString().split('T')[0];
        } else if (mode === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        }

        if (mode !== 'custom') {
            setStartDate(start);
            setEndDate(end);
        }
    }, []);

    useEffect(() => {
        updateDateRange(filterMode);
    }, [filterMode, updateDateRange]);

    const fetchTransactions = useCallback(async () => {
        if (!user || !selectedAccountId) return;
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    categories (
                        name,
                        icon,
                        color
                    ),
                    bank_accounts (
                        name,
                        bank_name
                    )
                `)
                .eq('account_id', selectedAccountId)
                .eq('status', 'paid')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        }
    }, [user, selectedAccountId, startDate, endDate]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Calculate sum of income/expense for the current month
    const currentMonthStats = transactions.reduce((acc, t) => {
        const amount = Number(t.amount);
        if (t.type === 'income') acc.income += amount;
        else acc.expense += amount;
        return acc;
    }, { income: 0, expense: 0 });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const formatDateShort = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    // Group transactions by day
    const groupedTransactions = transactions.reduce((groups: any[], t) => {
        const date = formatDateShort(t.date);
        let group = groups.find(g => g.day === date);
        if (!group) {
            group = { day: date, items: [] };
            groups.push(group);
        }
        group.items.push(t);
        return groups;
    }, []);

    const handleDeleteTransaction = async (transaction: any) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        try {
            // O saldo agora é atualizado automaticamente via trigger no banco de dados (trigger_update_account_balance_delete)
            const { error: delError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transaction.id);

            if (delError) throw delError;

            fetchTransactions();
            fetchAccounts();
            showToast('Transação excluída com sucesso!');
        } catch (err) {
            console.error('Error deleting transaction:', err);
            showToast('Erro ao excluir transação.', 'error');
        }
    };

    const handleOpenDetails = (t: any) => {
        setSelectedTransaction(t);
        setIsDetailsModalOpen(true);
    };

    return (
        <div className="accounts-page-container dashboard-content mobile-compact">
            <div className="accounts-grid mobile-stack">
                {/* Sidebar Column */}
                <aside className="accounts-sidebar mobile-full-width">
                    <button className="btn-add-account w-full mb-4" onClick={() => setIsModalOpen(true)}>
                        <PlusCircle size={24} />
                        Adicionar conta
                    </button>

                    <div className="sidebar-card accounts-scroll-mobile">
                        <span className="sidebar-title hide-mobile">Minhas Contas</span>
                        <div className="accounts-list-horizontal">
                            {loading ? (
                                <div className="flex justify-center p-4"><span className="spinner w-6 h-6 border-2"></span></div>
                            ) : bankAccounts.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-[10px] italic">Nenhuma conta cadastrada.</div>
                            ) : (
                                bankAccounts.map((acc: BankAccount) => {
                                    const IconComp = iconMap[acc.type] || Landmark;
                                    return (
                                        <div
                                            key={acc.id}
                                            className={`bank-card mini-mobile-card ${selectedAccountId === acc.id ? 'active' : ''}`}
                                            onClick={() => setSelectedAccountId(acc.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="bank-info">
                                                <div className="bank-icon-box">
                                                    <IconComp size={20} />
                                                </div>
                                                <div className="bank-details">
                                                    <span className="name">{acc.name}</span>
                                                    <span className="type hide-mobile text-[10px]">{acc.bank_name}</span>
                                                </div>
                                            </div>
                                            <span className="bank-balance">{formatCurrency(acc.balance)}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main Content Column */}
                <main className="accounts-main">
                    <div className="mini-summary-row">
                        <div className="mini-card">
                            <div className="mini-icon income">
                                <TrendingUp size={24} />
                            </div>
                            <div className="mini-data">
                                <span className="label">Entradas</span>
                                <span className="value income">{formatCurrency(currentMonthStats.income)}</span>
                            </div>
                            <div className="mini-decorative-circle"></div>
                        </div>

                        <div className="mini-card">
                            <div className="mini-icon expense">
                                <TrendingDown size={24} />
                            </div>
                            <div className="mini-data">
                                <span className="label">Saídas</span>
                                <span className="value">{formatCurrency(currentMonthStats.expense)}</span>
                            </div>
                            <div className="mini-decorative-circle"></div>
                        </div>
                    </div>

                    <div className="statement-card">
                        <div className="statement-header">
                            <div>
                                <h3>Extrato Dinâmico</h3>
                                <p className="text-xs text-gray-400 mt-1">Veja sua movimentação filtrada</p>
                            </div>
                            <div className="statement-controls">
                                <div className="modern-filter-group">
                                    <button
                                        className={`filter-chip ${filterMode === 'today' ? 'active' : ''}`}
                                        onClick={() => setFilterMode('today')}
                                    >Hoje</button>
                                    <button
                                        className={`filter-chip ${filterMode === 'week' ? 'active' : ''}`}
                                        onClick={() => setFilterMode('week')}
                                    >Semana</button>
                                    <button
                                        className={`filter-chip ${filterMode === 'month' ? 'active' : ''}`}
                                        onClick={() => setFilterMode('month')}
                                    >Mês</button>
                                    <button
                                        className={`filter-chip ${filterMode === 'custom' ? 'active' : ''}`}
                                        onClick={() => setFilterMode('custom')}
                                    >Personalizado</button>
                                </div>
                            </div>
                        </div>

                        {filterMode === 'custom' && (
                            <div className="custom-range-picker">
                                <div className="range-field">
                                    <label>De:</label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="range-field">
                                    <label>Até:</label>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div className="statement-scroll-area">
                            {groupedTransactions.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="italic">Nenhuma movimentação registrada no período.</p>
                                </div>
                            ) : (
                                groupedTransactions.map((group: any, idx: number) => (
                                    <div key={idx} className="day-group">
                                        <span className="day-label">{group.day}</span>
                                        {group.items.map((item: any) => (
                                            <div key={item.id} className="st-item modern">
                                                <div className="st-item-left">
                                                    <div
                                                        className="st-icon rounded-full"
                                                        style={{
                                                            backgroundColor: item.categories?.color || '#f1f5f9',
                                                        }}
                                                    >
                                                        {item.type === 'income' ? <TrendingUp size={20} className="text-white" /> : <TrendingDown size={20} className="text-white" />}
                                                    </div>
                                                    <div className="st-details">
                                                        <span className="title">{item.description}</span>
                                                        <span className="info">
                                                            {item.categories?.name || 'Sem categoria'} • {item.status === 'paid' ? 'Pago' : 'Pendente'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="st-item-right">
                                                    <span className={`st-amount ${item.type === 'income' ? 'positive' : 'negative'}`}>
                                                        {item.type === 'income' ? '+' : '-'} {formatCurrency(Number(item.amount))}
                                                    </span>
                                                    <div className="item-actions">
                                                        <button className="icon-action-btn" onClick={() => handleOpenDetails(item)}>
                                                            <Eye size={16} />
                                                        </button>
                                                        <button className="icon-action-btn delete" onClick={() => handleDeleteTransaction(item)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <AddAccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAccounts}
            />

            {/* Details Modal */}
            {isDetailsModalOpen && selectedTransaction && (
                <div className="modal-overlay" onClick={() => setIsDetailsModalOpen(false)}>
                    <div className="premium-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="premium-modal-header">
                            <div>
                                <h2>Detalhes da Transação</h2>
                                <p className="premium-modal-subtitle">Informações completas do lançamento.</p>
                            </div>
                            <button className="premium-modal-close" onClick={() => setIsDetailsModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="premium-modal-body">
                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>TÍTULO</label>
                                    <span>{selectedTransaction.description}</span>
                                </div>
                                <div className="detail-item">
                                    <label>VALOR</label>
                                    <span className={selectedTransaction.type === 'income' ? 'text-success' : 'text-error'}>
                                        {formatCurrency(selectedTransaction.amount)}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>DATA</label>
                                    <span>{new Date(selectedTransaction.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="detail-item">
                                    <label>BANCO</label>
                                    <span>{selectedTransaction.bank_accounts?.name || 'Não informado'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>CATEGORIA</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTransaction.categories?.color }}></div>
                                        <span>{selectedTransaction.categories?.name || 'Geral'}</span>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label>STATUS</label>
                                    <span className={`status-badge-modern ${selectedTransaction.status}`}>
                                        {selectedTransaction.status === 'paid' ? 'Pago' : 'Pendente'}
                                    </span>
                                </div>
                            </div>

                            <div className="metadata-info">
                                <Clock size={14} />
                                <span>Contabilizado em: {new Date(selectedTransaction.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                        </div>

                        <div className="premium-modal-actions">
                            <button className="btn-outline-primary" onClick={() => setIsDetailsModalOpen(false)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
