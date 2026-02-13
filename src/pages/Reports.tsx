import { useState, useEffect, useCallback } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Clock
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
                `);

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
            <header className="reports-header senior-polish">
                <div className="reports-title-container">
                    <h1 className="reports-title">
                        Relatórios
                        <span className="highlight">Financeiros</span>
                    </h1>
                </div>

                <div className="reports-actions-row">
                    <div className="reports-month-selector">
                        <button className="icon-action-btn" onClick={() => {
                            setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                            setUseCustomRange(false);
                        }}>
                            <ChevronLeft size={18} />
                        </button>
                        <span className="selected-period-label">
                            {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                        </span>
                        <button className="icon-action-btn" onClick={() => {
                            setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                            setUseCustomRange(false);
                        }}>
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="reports-button-group">
                        <button className="reports-control-btn" onClick={() => setUseCustomRange(!useCustomRange)}>
                            <Calendar size={18} />
                            <span>Personalizado</span>
                        </button>

                        <button className="reports-btn-export" onClick={handleExport}>
                            <Download size={18} />
                            <span>Exportar</span>
                        </button>
                    </div>
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

                <div className="report-list elegant-cards">
                    {expenseGroups.length === 0 ? (
                        <p className="empty-state-text">Nenhuma despesa registrada.</p>
                    ) : (
                        expenseGroups.map((group, idx) => (
                            <div key={idx} className="report-card-item expense">
                                <span className="item-label">{group.categoryName}</span>
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

                <div className="report-list elegant-cards">
                    {incomeGroups.length === 0 ? (
                        <p className="empty-state-text">Nenhuma receita registrada.</p>
                    ) : (
                        incomeGroups.map((group, idx) => (
                            <div key={idx} className="report-card-item income">
                                <span className="item-label">{group.categoryName}</span>
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
