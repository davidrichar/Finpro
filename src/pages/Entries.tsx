import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Calendar, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PremiumTransactionModal from '../components/modals/PremiumTransactionModal';
import { useToast } from '../contexts/ToastContext';

interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: 'income' | 'expense';
    status: 'paid' | 'pending';
    category_id: string;
    account_id: string;
    contabilizado: boolean;
    categories?: {
        name: string;
        icon: string;
        color: string;
    };
}

type FilterType = 'all' | 'income' | 'expense';
type PeriodType = 'day' | 'month' | 'year';
type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue';

export default function Entries() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [periodType, setPeriodType] = useState<PeriodType>('month');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'receivable' | 'payable'>('receivable');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [filterType] = useState<FilterType>('all');

    // Advanced Filter State
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    });

    // Data for filters
    const [categories, setCategories] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);

    const fetchFilterData = useCallback(async () => {
        try {
            const [catRes, accRes] = await Promise.all([
                supabase.from('categories').select('*').order('name'),
                supabase.from('bank_accounts').select('*').order('name')
            ]);
            setCategories(catRes.data || []);
            setBankAccounts(accRes.data || []);
        } catch (err) {
            console.error('Error fetching filter data:', err);
        }
    }, []);

    useEffect(() => {
        fetchFilterData();
    }, [fetchFilterData]);


    const fetchTransactions = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            let query = supabase
                .from('transactions')
                .select(`
                    *,
                    categories (
                        name,
                        icon,
                        color
                    )
                `)
                .eq('user_id', user.id);

            // Apply type filter
            if (filterType !== 'all') {
                query = query.eq('type', filterType);
            }

            // Improved status filter logic
            if (selectedStatus === 'pending') {
                query = query.eq('status', 'pending');
            } else if (selectedStatus === 'paid') {
                query = query.eq('status', 'paid');
            } else if (selectedStatus === 'overdue') {
                query = query.eq('status', 'pending').lt('date', new Date().toISOString().split('T')[0]);
            }
            // If selectedStatus is 'all', we don't add any filter (shows BOTH paid and pending)

            // Advanced Filters
            if (searchQuery) {
                query = query.ilike('description', `%${searchQuery}%`);
            }
            if (selectedCategoryId) {
                query = query.eq('category_id', selectedCategoryId);
            }
            if (selectedAccountId) {
                query = query.eq('account_id', selectedAccountId);
            }

            // Apply date filter based on period
            const date = new Date(selectedDate);
            if (showAdvancedFilters) {
                // In advanced mode, we always use the custom date range
                query = query.gte('date', dateRange.start).lte('date', dateRange.end);
            } else {
                // In normal mode, use the quick period filters
                if (periodType === 'day') {
                    query = query.eq('date', selectedDate);
                } else if (periodType === 'month') {
                    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
                    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
                    query = query.gte('date', startOfMonth).lte('date', endOfMonth);
                } else if (periodType === 'year') {
                    const startOfYear = new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
                    const endOfYear = new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
                    query = query.gte('date', startOfYear).lte('date', endOfYear);
                }
            }

            const { data, error } = await query.order('date', { ascending: false });

            if (error) throw error;

            // Map data to ensure categories is a single object (if returned as array)
            const mappedData = (data || []).map((t: any) => ({
                ...t,
                categories: Array.isArray(t.categories) ? t.categories[0] : t.categories
            })) as Transaction[];

            setTransactions(mappedData);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    }, [user, filterType, periodType, selectedDate, searchQuery, selectedCategoryId, selectedAccountId, selectedStatus, dateRange, showAdvancedFilters]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Sync dateRange with period filters when advanced filters are NOT shown
    useEffect(() => {
        if (!showAdvancedFilters) {
            const date = new Date(selectedDate);
            let start = selectedDate;
            let end = selectedDate;

            if (periodType === 'month') {
                start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
                end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
            } else if (periodType === 'year') {
                start = new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
                end = new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
            }

            setDateRange({ start, end });
        }
    }, [periodType, selectedDate, showAdvancedFilters]);

    // Calculate totals of current filtered transactions (Excludes paid items as per current query)
    const totalReceivable = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalPayable = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalReceivable - totalPayable;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getStatusBadge = (status: string, date: string) => {
        if (status === 'paid') {
            return <span className="status-badge paid">Pago</span>;
        }

        const transactionDate = new Date(date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (transactionDate < today) {
            return <span className="status-badge overdue">Atrasado</span>;
        }

        return <span className="status-badge pending">Pendente</span>;
    };

    const handleEdit = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setModalType(transaction.type === 'income' ? 'receivable' : 'payable');
        setIsModalOpen(true);
    };

    const handleDelete = async (transaction: Transaction) => {
        if (!confirm(`Tem certeza que deseja excluir "${transaction.description}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transaction.id);

            if (error) throw error;
            fetchTransactions();
            showToast('Lançamento excluído com sucesso!');
        } catch (err) {
            console.error('Error deleting transaction:', err);
            showToast('Erro ao excluir lançamento.', 'error');
        }
    };

    const handlePayReceive = async (transaction: Transaction) => {
        if (transaction.status === 'paid') {
            showToast('Este lançamento já foi pago/recebido.', 'info');
            return;
        }

        const actionText = transaction.type === 'income' ? 'recebimento' : 'pagamento';
        if (!confirm(`Confirmar ${actionText} de ${formatCurrency(Number(transaction.amount))}?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('transactions')
                .update({
                    status: 'paid'
                })
                .eq('id', transaction.id);

            if (error) throw error;

            showToast(transaction.type === 'income' ? 'Recebido com sucesso!' : 'Pago com sucesso!');
            fetchTransactions();
        } catch (err: any) {
            console.error('Error updating transaction:', err);
            showToast('Erro ao atualizar lançamento: ' + (err.message || 'Erro desconhecido'), 'error');
        }
    };

    return (
        <div className="dashboard-content mobile-compact">
            {/* Header */}
            <div className="entries-header flex-mobile-column">
                <div className="mb-4 md:mb-0">
                    <h1 className="text-xl md:text-2xl">Lançamentos</h1>
                    <p className="subtitle">Gerencie suas contas a receber e a pagar</p>
                </div>
            </div>

            {/* Filter Buttons - Contas a Receber / Contas a Pagar */}
            <div className="filter-buttons-row mobile-stack">
                <button
                    className={`btn-filter-type receivable ${filterType === 'income' ? 'active' : ''}`}
                    onClick={() => {
                        setModalType('receivable');
                        setIsModalOpen(true);
                    }}
                >
                    <ArrowUpCircle size={24} />
                    <div className="btn-filter-content">
                        <span className="btn-filter-label">Contas a Receber</span>
                    </div>
                </button>
                <button
                    className={`btn-filter-type payable ${filterType === 'expense' ? 'active' : ''}`}
                    onClick={() => {
                        setModalType('payable');
                        setIsModalOpen(true);
                    }}
                >
                    <ArrowDownCircle size={24} />
                    <div className="btn-filter-content">
                        <span className="btn-filter-label">Contas a Pagar</span>
                    </div>
                </button>
            </div>

            {/* Quick Summary Row */}
            <div className="entries-summary-row mobile-grid">
                <div className="entries-summary-card receivable">
                    <span className="summary-label">A Receber</span>
                    <span className="summary-amount text-sm md:text-base">{formatCurrency(totalReceivable)}</span>
                </div>
                <div className="entries-summary-card payable">
                    <span className="summary-label">A Pagar</span>
                    <span className="summary-amount text-sm md:text-base">{formatCurrency(totalPayable)}</span>
                </div>
                <div className={`entries-summary-card balance ${balance >= 0 ? 'positive' : 'negative'} hide-mobile-sm`}>
                    <span className="summary-label">Previsão</span>
                    <span className="summary-amount text-sm md:text-base">{formatCurrency(balance)}</span>
                </div>
            </div>

            {/* Period Filters and Date Picker */}
            <div className="period-filters-container">
                <div className="period-filters">
                    <button
                        className={`btn-period ${periodType === 'day' ? 'active' : ''}`}
                        onClick={() => setPeriodType('day')}
                    >
                        Dia
                    </button>
                    <button
                        className={`btn-period ${periodType === 'month' ? 'active' : ''}`}
                        onClick={() => setPeriodType('month')}
                    >
                        Mês
                    </button>
                    <button
                        className={`btn-period ${periodType === 'year' ? 'active' : ''}`}
                        onClick={() => setPeriodType('year')}
                    >
                        Ano
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className={`btn-advanced-filters ${showAdvancedFilters ? 'active' : ''}`}
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    >
                        Filtros Avançados
                    </button>
                    {!showAdvancedFilters && (
                        <div className="date-picker-wrapper">
                            <Calendar size={18} />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="date-picker-input"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
                <div className="advanced-filters-panel">
                    <div className="filters-grid">
                        <div className="filter-group">
                            <label>Buscar</label>
                            <input
                                type="text"
                                placeholder="Descrição..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="filter-input"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Categoria</label>
                            <select
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Todas</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Conta</label>
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Todas</option>
                                {bankAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Status</label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
                                className="filter-select"
                            >
                                <option value="all">Todos (Pagos e Pendentes)</option>
                                <option value="pending">Apenas Pendentes</option>
                                <option value="paid">Apenas Pagos</option>
                                <option value="overdue">Apenas Atrasados</option>
                            </select>
                        </div>
                    </div>

                    <div className="custom-date-range">
                        <div className="filter-group">
                            <label>Início</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="filter-input"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Fim</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="filter-input"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            className="btn-clear-filters"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategoryId('');
                                setSelectedAccountId('');
                                setSelectedStatus('all');
                                setPeriodType('month');
                            }}
                        >
                            Limpar Filtros
                        </button>
                    </div>
                </div>
            )}

            {/* Transactions List */}
            <div className="transactions-list-card">
                {loading ? (
                    <div className="flex justify-center items-center" style={{ padding: '3rem' }}>
                        <span className="spinner w-8 h-8 border-3"></span>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            {filterType === 'income' ? <TrendingUp size={48} /> :
                                filterType === 'expense' ? <TrendingDown size={48} /> :
                                    <Calendar size={48} />}
                        </div>
                        <h3>Nenhum lançamento encontrado</h3>
                        <p>
                            {filterType === 'income' && 'Não há contas a receber no período selecionado.'}
                            {filterType === 'expense' && 'Não há contas a pagar no período selecionado.'}
                            {filterType === 'all' && 'Não há lançamentos no período selecionado.'}
                        </p>
                    </div>
                ) : (
                    <div className="transactions-list">
                        {transactions.map((transaction) => (
                            <div key={transaction.id} className="transaction-item">
                                <div className="transaction-left">
                                    <div
                                        className={`transaction-icon ${transaction.type}`}
                                        style={{
                                            backgroundColor: transaction.categories?.color || 'var(--border)',
                                        }}
                                    >
                                        {transaction.type === 'income' ?
                                            <TrendingUp size={20} /> :
                                            <TrendingDown size={20} />
                                        }
                                    </div>
                                    <div className="transaction-details">
                                        <span className="transaction-name">{transaction.description}</span>
                                        <span className="transaction-info">
                                            {transaction.categories?.name || 'Sem categoria'} • {formatDate(transaction.date)}
                                        </span>
                                    </div>
                                </div>
                                <div className="transaction-right">
                                    <span className={`transaction-amount ${transaction.type}`}>
                                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(Number(transaction.amount))}
                                    </span>
                                    {getStatusBadge(transaction.status, transaction.date)}
                                    <div className="transaction-actions">
                                        <button
                                            className="action-btn action-btn-edit"
                                            onClick={() => handleEdit(transaction)}
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="action-btn action-btn-delete"
                                            onClick={() => handleDelete(transaction)}
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        {transaction.status === 'pending' && (
                                            <button
                                                className={`action-btn action-btn-pay ${transaction.type}`}
                                                onClick={() => handlePayReceive(transaction)}
                                                title={transaction.type === 'income' ? 'Receber' : 'Pagar'}
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary Footer Removed */}

            {/* Premium Transaction Modal */}
            <PremiumTransactionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTransaction(null);
                }}
                onSuccess={() => {
                    fetchTransactions();
                    setIsModalOpen(false);
                    setSelectedTransaction(null);
                }}
                type={modalType}
                transaction={selectedTransaction}
            />
        </div>
    );
}
