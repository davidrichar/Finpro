import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface SummaryCardProps {
    label: string;
    value: number;
    type: 'income' | 'expense' | 'balance' | 'pending';
    percentage?: number;
    trend?: 'up' | 'down';
}

export default function SummaryCard({ label, value, type, percentage, trend }: SummaryCardProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const getIcon = () => {
        switch (type) {
            case 'income': return <CheckIcon />;
            case 'expense': return <ArrowUpRightIcon />;
            case 'balance': return <div className="p-2 bg-emerald-500 rounded-lg text-white"><Activity size={18} /></div>;
            case 'pending': return <ClockIcon />;
        }
    };

    if (type === 'balance') {
        return (
            <div className="summary-card balance-variant">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-white/20">
                        <DollarSign size={20} className="text-white" />
                    </div>
                    <span className="label text-white/80 font-medium">{label}</span>
                </div>
                <div className="value text-white text-2xl font-bold mb-2">
                    {formatCurrency(value)}
                </div>
                <div className="flex items-center gap-1 text-white/90 text-xs">
                    <TrendingUp size={14} />
                    <span>Tendência Positiva</span>
                </div>
            </div>
        );
    }

    const accentColor = type === 'income' ? 'var(--success)' : type === 'expense' ? 'var(--error)' : 'var(--blue)';

    return (
        <div className="summary-card" style={{ borderBottom: `3px solid ${accentColor}` }}>
            <div className="flex justify-between items-start mb-4">
                <div className="icon-wrapper">
                    {getIcon()}
                </div>
                {percentage !== undefined && (
                    <div className={`percentage-tag ${trend === 'up' ? 'positive' : 'negative'}`}>
                        {trend === 'up' ? '+' : '-'}{percentage}%
                    </div>
                )}
            </div>
            <span className="label block mb-1">{label}</span>
            <span className="value text-xl font-bold">
                {formatCurrency(value)}
            </span>
        </div>
    );
}

function CheckIcon() {
    return (
        <div className="p-1 px-2 rounded-md bg-emerald-50 text-emerald-500">
            <TrendingUp size={16} />
        </div>
    );
}

function ArrowUpRightIcon() {
    return (
        <div className="p-1 px-2 rounded-md bg-red-50 text-red-500">
            <TrendingDown size={16} />
        </div>
    );
}

function ClockIcon() {
    return (
        <div className="p-1 px-2 rounded-md bg-blue-50 text-blue-500">
            <Activity size={16} />
        </div>
    );
}
