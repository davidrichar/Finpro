
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ReportGroup {
    categoryName: string;
    total: number;
}

export default function PrintReport() {
    const { user } = useAuth();
    const [incomeGroups, setIncomeGroups] = useState<ReportGroup[]>([]);
    const [expenseGroups, setExpenseGroups] = useState<ReportGroup[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;

        try {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    amount,
                    type,
                    date,
                    categories (
                        name
                    )
                `)
                .gte('date', start)
                .lte('date', end);

            if (error) throw error;

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
            setLoading(false);

        } catch (err) {
            console.error('Error fetching print report data:', err);
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
        // Trigger print dialog after content loads
        const timer = setTimeout(() => {
            if (!loading) {
                // window.print(); // Optional: uncomment if you want auto-print
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [fetchData, loading]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const totalIncomes = incomeGroups.reduce((sum, g) => sum + g.total, 0);
    const totalExpenses = expenseGroups.reduce((sum, g) => sum + g.total, 0);
    const balance = totalIncomes - totalExpenses;

    const today = new Date();
    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    if (loading) {
        return <div className="print-loading">Gerando relatório...</div>;
    }

    return (
        <div className="print-page">
            <header className="page-header-formal">
                <div className="company-info">
                    <h1 className="company-name">FinanceApp</h1>
                    <p className="document-type">RELATÓRIO FINANCEIRO MENSAL</p>
                </div>
                <div className="report-meta">
                    <div className="meta-item">
                        <span className="meta-label">Período:</span>
                        <span className="meta-value">{monthNames[today.getMonth()]} de {today.getFullYear()}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Data de emissão:</span>
                        <span className="meta-value">
                            {today.toLocaleDateString('pt-BR')} - {today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
                <hr className="header-divider" />
            </header>

            <main className="document-body">
                <section className="formal-section">
                    <h2 className="section-title">01. DESPESAS</h2>
                    <div className="dot-list">
                        {expenseGroups.map((group, idx) => (
                            <div key={idx} className="dot-item">
                                <span className="item-name">{group.categoryName.toUpperCase()}</span>
                                <span className="item-dots"></span>
                                <span className="item-value">{formatCurrency(group.total)}</span>
                            </div>
                        ))}
                    </div>
                    <hr className="section-divider" />
                    <div className="section-total">
                        <span className="total-label">TOTAL GERAL DAS DESPESAS</span>
                        <span className="total-value highlight-amount">{formatCurrency(totalExpenses)}</span>
                    </div>
                </section>

                <section className="formal-section">
                    <h2 className="section-title">02. RECEITAS</h2>
                    <div className="dot-list">
                        {incomeGroups.map((group, idx) => (
                            <div key={idx} className="dot-item">
                                <span className="item-name">{group.categoryName.toUpperCase()}</span>
                                <span className="item-dots"></span>
                                <span className="item-value">{formatCurrency(group.total)}</span>
                            </div>
                        ))}
                    </div>
                    <hr className="section-divider" />
                    <div className="section-total">
                        <span className="total-label">TOTAL GERAL DAS RECEITAS</span>
                        <span className="total-value highlight-amount">{formatCurrency(totalIncomes)}</span>
                    </div>
                </section>

                <section className="final-summary">
                    <hr className="summary-border-top" />
                    <div className="summary-content">
                        <p className="summary-label">SALDO FINAL DO PERÍODO</p>
                        <h1 className="final-balance">{formatCurrency(balance)}</h1>
                    </div>
                </section>
            </main>

            <footer className="page-footer-formal">
                <p>Documento gerado automaticamente pelo sistema em {today.toLocaleDateString('pt-BR')} às {today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                <p>Confidencial – Uso interno</p>
            </footer>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;600&display=swap');

                :root {
                    --print-bg: #ffffff;
                    --print-text: #1a1a1a;
                    --print-muted: #666666;
                    --print-border: #e0e0e0;
                    --print-accent: #000000;
                }

                @media screen {
                    body {
                        background-color: var(--bg-primary);
                        padding: 2rem 0;
                    }
                    .print-page {
                        background: var(--bg-secondary);
                        color: var(--text-primary);
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        padding: 25mm 20mm;
                        box-shadow: var(--shadow-md);
                        box-sizing: border-box;
                        border: 1px solid var(--border-color);
                    }
                    .print-loading {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        font-family: 'Inter', sans-serif;
                        color: var(--text-primary);
                    }
                    .meta-label {
                        color: var(--text-secondary) !important;
                    }
                    .header-divider {
                        border-top: 2px solid var(--text-primary) !important;
                    }
                    .section-divider {
                        border-top: 1px solid var(--border-color) !important;
                    }
                    .item-dots {
                        border-bottom: 1px dotted var(--border-color) !important;
                    }
                    .summary-border-top {
                        border-top: 3px solid var(--text-primary) !important;
                    }
                    .page-footer-formal {
                        border-top: 1px solid var(--border-color) !important;
                        color: var(--text-secondary) !important;
                    }
                }

                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        margin: 0;
                        padding: 0;
                    }
                    .print-page {
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        box-shadow: none;
                        background: white !important;
                        color: black !important;
                        border: none !important;
                    }
                    .header-divider, .summary-border-top {
                        border-color: black !important;
                    }
                    .meta-label, .page-footer-formal {
                        color: #666 !important;
                    }
                }

                .print-page {
                    font-family: 'Crimson Pro', serif;
                    line-height: 1.5;
                }

                .company-name {
                    font-family: 'Inter', sans-serif;
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0;
                    letter-spacing: -0.02em;
                }

                .document-type {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin: 0.25rem 0 1.5rem 0;
                    letter-spacing: 0.05em;
                }

                .report-meta {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    margin-bottom: 1rem;
                }

                .meta-item {
                    display: flex;
                    gap: 0.5rem;
                    font-size: 0.95rem;
                }

                .meta-label {
                    font-weight: 600;
                    color: var(--print-muted);
                }

                .header-divider {
                    border: none;
                    border-top: 2px solid var(--print-accent);
                    margin: 1.5rem 0 3rem 0;
                }

                .formal-section {
                    margin-bottom: 4rem;
                }

                .section-title {
                    font-family: 'Inter', sans-serif;
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-bottom: 2rem;
                    letter-spacing: 0.05em;
                }

                .dot-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .dot-item {
                    display: flex;
                    align-items: baseline;
                    font-size: 1.1rem;
                }

                .item-name {
                    white-space: nowrap;
                }

                .item-dots {
                    flex-grow: 1;
                    border-bottom: 1px dotted #888;
                    margin: 0 0.5rem;
                    position: relative;
                    top: -4px;
                }

                .item-value {
                    font-weight: 600;
                    white-space: nowrap;
                }

                .section-divider {
                    border: none;
                    border-top: 1px solid var(--print-border);
                    margin: 1.5rem 0;
                }

                .section-total {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.5rem;
                }

                .total-label {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--print-muted);
                    letter-spacing: 0.05em;
                }

                .highlight-amount {
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                .final-summary {
                    margin-top: 6rem;
                    text-align: center;
                }

                .summary-border-top {
                    border: none;
                    border-top: 3px solid var(--print-accent);
                    width: 100%;
                    margin-bottom: 2rem;
                }

                .summary-label {
                    font-size: 1.1rem;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    margin-bottom: 1rem;
                }

                .final-balance {
                    font-size: 3.5rem;
                    font-weight: 700;
                    margin: 0;
                }

                .page-footer-formal {
                    margin-top: 8rem;
                    padding-top: 2rem;
                    border-top: 1px solid var(--print-border);
                    text-align: center;
                    font-size: 0.8rem;
                    color: var(--print-muted);
                }

                .page-footer-formal p {
                    margin: 0.25rem 0;
                }
            `}</style>
        </div>
    );
}
