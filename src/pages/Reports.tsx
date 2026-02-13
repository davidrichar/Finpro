import { useState, useEffect, useCallback } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Clock,
    FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ReportGroup {
    categoryName: string;
    total: number;
}

export default function Reports() {
    const { user } = useAuth();
    const [incomeGroups, setIncomeGroups] = useState<ReportGroup[]>([]);
    const [expenseGroups, setExpenseGroups] = useState<ReportGroup[]>([]);

    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = useCallback(async () => {
        if (!user) return;

        try {
            let query = supabase
                .from('transactions')
                .select(`
                    amount,
                    type,
                    date,
                    categories (
                        name
                    )
                `)
                .eq('status', 'paid');

            if (useCustomRange && startDate && endDate) {
                query = query.gte('date', startDate).lte('date', endDate);
            } else {
                const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString();
                const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString();
                query = query.gte('date', start).lte('date', end);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Group by category and type
            const incomes: Record<string, number> = {};
            const expenses: Record<string, number> = {};

            data?.forEach((t: any) => {
                const category = t.categories?.name || 'Geral';
                const amount = Number(t.amount);

                if (t.type === 'income') {
                    incomes[category] = (incomes[category] || 0) + amount;
                } else {
                    expenses[category] = (expenses[category] || 0) + amount;
                }
            });

            setIncomeGroups(Object.entries(incomes).map(([name, total]) => ({ categoryName: name, total })));
            setExpenseGroups(Object.entries(expenses).map(([name, total]) => ({ categoryName: name, total })));

        } catch (err) {
            console.error('Error fetching report data:', err);
        }
    }, [user, name, selectedMonth, useCustomRange, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const totalIncomes = incomeGroups.reduce((sum, g) => sum + g.total, 0);
    const totalExpenses = expenseGroups.reduce((sum, g) => sum + g.total, 0);
    const balance = totalIncomes - totalExpenses;

    const handleExport = () => {
        window.print();
    };

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    return (
        <div className="reports-page-container">
            <style>{`
                .reports-page-container {
                    padding: 2rem;
                    background: var(--bg-primary);
                }

                .reports-header-formal {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 4rem;
                }

                .title-nav-group {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                }

                .reports-title {
                    font-size: clamp(1.75rem, 5vw, 2.25rem);
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                    letter-spacing: -0.03em;
                }

                .title-highlight {
                    color: var(--color-success);
                }

                .month-nav-box {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: var(--bg-secondary);
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                }

                .nav-btn {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .nav-btn:hover {
                    background: var(--bg-tertiary);
                    color: var(--color-success);
                }

                .month-label {
                    font-weight: 700;
                    font-size: 1rem;
                    color: var(--text-primary);
                    min-width: 140px;
                    text-align: center;
                }

                .actions-horizontal-group {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .btn-action {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 18px;
                    border-radius: 10px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }

                .btn-action:hover {
                    background: var(--bg-tertiary);
                    border-color: var(--color-success);
                }

                .btn-type-filter.active {
                    background: rgba(34, 197, 94, 0.1);
                    color: var(--color-success);
                    border-color: var(--color-success);
                }

                .report-section {
                    margin-bottom: 5rem;
                }

                .section-num-title {
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                    letter-spacing: 0.05em;
                }

                .report-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .dot-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border-color);
                }

                .item-name {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .item-line {
                    flex-grow: 1;
                    margin: 0 0.75rem;
                }

                .item-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    white-space: nowrap;
                    text-align: right;
                }

                .section-total-container {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    margin-top: 2rem;
                    gap: 0.5rem;
                }

                .total-label {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    letter-spacing: 0.1em;
                }

                .total-amount {
                    font-size: 2rem;
                    font-weight: 800;
                }

                .total-amount.expense {
                    color: var(--color-danger);
                }

                .total-amount.income {
                    color: var(--color-success);
                }

                .reports-page-footer {
                    margin-top: 6rem;
                    padding-top: 3rem;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .balance-amount {
                    font-size: 3rem;
                    font-weight: 900;
                    color: var(--text-primary);
                }

                .report-timestamp {
                    color: var(--text-muted);
                    font-size: 0.85rem;
                }

                @media (max-width: 768px) {
                    .title-nav-group {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .actions-horizontal-group {
                        width: 100%;
                        flex-direction: column;
                    }
                    .btn-action {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>

            <header className="reports-header-formal">
                <div className="title-nav-group">
                    <h1 className="reports-title">
                        Relatórios <span className="title-highlight">Financeiros</span>
                    </h1>

                    <div className="month-nav-box">
                        <button className="nav-btn" onClick={() => {
                            setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                            setUseCustomRange(false);
                        }}>
                            <ChevronLeft size={18} />
                        </button>
                        <span className="month-label">
                            {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                        </span>
                        <button className="nav-btn" onClick={() => {
                            setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                            setUseCustomRange(false);
                        }}>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                <div className="actions-horizontal-group">
                    <button
                        className={`btn-action btn-type-filter ${useCustomRange ? 'active' : ''}`}
                        onClick={() => setUseCustomRange(!useCustomRange)}
                    >
                        <Calendar size={18} />
                        <span>Personalizado</span>
                    </button>

                    <button className="btn-action btn-formal-report" onClick={() => window.open('/print-report', '_blank')}>
                        <FileText size={18} />
                        <span>Relatório Formal</span>
                    </button>

                    <button className="btn-action btn-print-screen" onClick={handleExport}>
                        <Download size={18} />
                        <span>Imprimir Tela</span>
                    </button>
                </div>
            </header>

            {useCustomRange && (
                <div className="custom-range-picker" style={{ marginBottom: '4rem', maxWidth: '400px' }}>
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

            <section className="report-section">
                <h2 className="section-num-title">01. DESPESAS</h2>

                <div className="report-list">
                    {expenseGroups.length === 0 ? (
                        <p className="empty-state-text">Nenhuma despesa registrada.</p>
                    ) : (
                        expenseGroups.map((group, idx) => (
                            <div key={idx} className="dot-item">
                                <span className="item-name">{group.categoryName}</span>
                                <span className="item-line"></span>
                                <span className="item-value">{formatCurrency(group.total)}</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="section-total-container">
                    <span className="total-label">TOTAL GERAL DAS DESPESAS</span>
                    <span className="total-amount expense">- {formatCurrency(totalExpenses)}</span>
                </div>
            </section>

            <section className="report-section">
                <h2 className="section-num-title">02. RECEITAS</h2>

                <div className="report-list">
                    {incomeGroups.length === 0 ? (
                        <p className="empty-state-text">Nenhuma receita registrada.</p>
                    ) : (
                        incomeGroups.map((group, idx) => (
                            <div key={idx} className="dot-item">
                                <span className="item-name">{group.categoryName}</span>
                                <span className="item-line"></span>
                                <span className="item-value">{formatCurrency(group.total)}</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="section-total-container">
                    <span className="total-label">TOTAL GERAL DAS RECEITAS</span>
                    <span className="total-amount income">+ {formatCurrency(totalIncomes)}</span>
                </div>
            </section>

            <footer className="reports-page-footer">
                <span className="total-label">SALDO DO PERÍODO</span>
                <span className="balance-amount">{formatCurrency(balance)}</span>
                <div className="report-timestamp">
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Relatório consolidado • {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </footer>
        </div>
    );
}
