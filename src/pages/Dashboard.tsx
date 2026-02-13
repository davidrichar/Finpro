import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SummaryCard from '../components/dashboard/SummaryCard';
import ReceivableCard from '../components/dashboard/ReceivableCard';
import MovementItem from '../components/dashboard/MovementItem';
import { Bell } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from 'recharts';

interface BankAccount {
    id: string;
    name: string;
    bank_name: string;
    balance: number;
    type: string;
}

interface Transaction {
    id: string;
    nome: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    tipo: 'receita' | 'despesa';
    status: 'pendente' | 'pago' | 'recebido';
    category: {
        nome: string;
        color?: string;
    };
    pay_method?: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Set default range: beginning of current month to today
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState<string>(firstDay);
    const [endDate, setEndDate] = useState<string>(today);

    const [data, setData] = useState({
        income: 0,
        expense: 0,
        balance: 0,
        pending: 0,
        totalBalance: 0,
        recentTransactions: [] as Transaction[],
        upcomingReceivables: [] as Transaction[],
        comparativeData: [] as any[],
        categoryData: [] as any[],
    });

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;

        try {
            // Fetch Transactions
            const { data: transactions, error: transError } = await supabase
                .from('transactions')
                .select(`
                  *,
                  category:categories(nome, color)
                `)
                .eq('user_id', user.id)
                .order('data_vencimento', { ascending: false });

            if (transError) throw transError;

            // Fetch Bank Accounts for Total Balance
            const { data: accounts, error: accountsError } = await supabase
                .from('bank_accounts')
                .select('*')
                .eq('user_id', user.id);

            if (accountsError) throw accountsError;

            let income = 0;
            let expense = 0;
            let pending = 0;

            if (transactions) {
                transactions.forEach(t => {
                    const val = Number(t.valor);
                    // Regras: Receitas pagas e Despesas pagas
                    if (t.tipo === 'receita') {
                        if (t.status === 'pago' || t.status === 'recebido') {
                            income += val;
                        } else if (t.status === 'pendente') {
                            pending += val;
                        }
                    } else if (t.tipo === 'despesa') {
                        if (t.status === 'pago') {
                            expense += val;
                        }
                    }
                });
            }

            const totalBalance = accounts?.reduce((acc, curr) => acc + Number(curr.balance), 0) || 0;

            const recent = transactions || [];
            const upcoming = (transactions || []).filter(t => t.tipo === 'receita' && t.status === 'pendente').slice(0, 5);

            // Doughnut Data - Comparative
            const comparativeData = [
                { name: 'Receita', value: income, color: '#00E676', label: 'Rec.' },
                { name: 'Despesa', value: expense, color: '#FF5252', label: 'Desp.' }
            ];

            // Categories Breakdown (Expenses only)
            const expenseMap: Record<string, { value: number; color: string }> = {};
            (transactions || []).filter(t => t.tipo === 'despesa' && t.status === 'pago').forEach(t => {
                const name = t.category?.nome || 'Outros';
                if (!expenseMap[name]) expenseMap[name] = { value: 0, color: t.category?.color || '#cbd5e1' };
                expenseMap[name].value += Number(t.valor);
            });

            const categoryData = Object.entries(expenseMap)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.value - a.value);

            setData({
                income,
                expense,
                balance: totalBalance, // Using actual bank balance as per objective
                pending,
                totalBalance,
                recentTransactions: recent as Transaction[],
                upcomingReceivables: upcoming as Transaction[],
                comparativeData,
                categoryData,
            });

        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDashboardData();

        if (!user) return;

        // Supabase Realtime Subscription
        const channel = supabase
            .channel('dashboard-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'transactions'
                },
                () => {
                    console.log('Realtime update: transactions changed');
                    fetchDashboardData();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bank_accounts'
                },
                () => {
                    console.log('Realtime update: bank_accounts changed');
                    fetchDashboardData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchDashboardData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <span className="spinner" style={{ borderTopColor: 'var(--primary)' }}></span>
            </div>
        );
    }

    const formatPercent = (val: number, total: number) => {
        if (total === 0) return '0%';
        return Math.round((val / total) * 100) + '%';
    };

    const filteredTransactions = data.recentTransactions.filter(t => {
        const date = t.data_vencimento;
        if (startDate && endDate) {
            return date >= startDate && date <= endDate;
        }
        if (startDate) return date >= startDate;
        if (endDate) return date <= endDate;
        return true;
    });

    return (
        <div className="dashboard-content">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <span className="text-[10px] font-bold text-success uppercase tracking-widest">Dashboard</span>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Finanças Pessoais
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                    </h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400">
                    <Bell size={20} />
                </div>
            </header>

            <section className="mb-8">
                <h2 className="text-lg font-bold mb-4 text-gray-400">Resumo Financeiro</h2>
                <div className="dashboard-grid">
                    <SummaryCard label="Receitas" value={data.income} type="income" percentage={0} />
                    <SummaryCard label="Despesas" value={data.expense} type="expense" percentage={0} />
                    <SummaryCard label="Saldo Atual" value={data.totalBalance} type="balance" />
                    <SummaryCard label="A Receber" value={data.pending} type="pending" />
                </div>
            </section>

            <section className="charts-row">
                <div className="chart-card">
                    <h3>Comparativo</h3>
                    <div style={{ width: '100%', height: 120 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data.comparativeData}
                                    innerRadius={35}
                                    outerRadius={50}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={450}
                                >
                                    {data.comparativeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="chart-legend-list">
                        {data.comparativeData.map((item, idx) => (
                            <div key={idx} className="legend-item">
                                <div className="legend-info">
                                    <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                                    <span className="legend-label">{item.label || item.name}</span>
                                </div>
                                <span className="legend-value">{formatPercent(item.value, data.income + data.expense)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Categorias</h3>
                    <div style={{ width: '100%', height: 120 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data.categoryData.length > 0 ? data.categoryData : [{ name: 'Nenhuma', value: 1, color: '#F1F5F9' }]}
                                    innerRadius={35}
                                    outerRadius={50}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={450}
                                >
                                    {data.categoryData.length > 0 ? (
                                        data.categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))
                                    ) : (
                                        <Cell fill="#F1F5F9" />
                                    )}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="chart-legend-list">
                        {data.categoryData.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="legend-item">
                                <div className="legend-info">
                                    <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                                    <span className="legend-label">{item.name}</span>
                                </div>
                                <span className="legend-value">{formatPercent(item.value, data.expense)}</span>
                            </div>
                        ))}
                        {data.categoryData.length === 0 && (
                            <div className="legend-item">
                                <span className="legend-label">Sem gastos</span>
                                <span className="legend-value">0%</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <div className="centered-header">
                    <h2 className="text-xl font-bold mb-2">Contas a Receber (7 dias)</h2>
                </div>
                <div className="receivables-scroll">
                    {data.upcomingReceivables.length > 0 ? (
                        data.upcomingReceivables.map(t => (
                            <ReceivableCard
                                key={t.id}
                                date={new Date(t.data_vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                name={t.nome}
                                amount={t.valor}
                                status={t.status === 'pendente' ? 'pendente' : 'confirmado'}
                            />
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-400 text-sm italic w-full">Nenhum recebimento agendado.</div>
                    )}
                </div>
            </section>

            <section className="mb-8">
                <div className="centered-header mb-6">
                    <h2 className="text-xl font-bold">Movimentações Recentes</h2>
                </div>

                <div className="filter-range-row">
                    <div className="date-filter-group">
                        <label>Início</label>
                        <input
                            type="date"
                            className="date-filter-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-separator">a</div>
                    <div className="date-filter-group">
                        <label>Fim</label>
                        <input
                            type="date"
                            className="date-filter-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {filteredTransactions.length > 0 ? (
                        filteredTransactions.map(t => (
                            <MovementItem
                                key={t.id}
                                name={t.nome}
                                category={t.category?.nome || 'Geral'}
                                date={new Date(t.data_vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                amount={t.valor}
                                type={t.tipo}
                            />
                        ))
                    ) : (
                        <div className="card text-center p-8">
                            <p className="text-muted text-sm">Nenhuma movimentação para este período.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
