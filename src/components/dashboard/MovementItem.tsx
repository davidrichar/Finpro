import { ShoppingCart, Briefcase, Home, Zap, DollarSign } from 'lucide-react';

interface MovementItemProps {
    name: string;
    category: string;
    date: string;
    amount: number;
    type: 'receita' | 'despesa';
}

export default function MovementItem({ name, category, date, amount, type }: MovementItemProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const getIcon = () => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('mercado') || cat.includes('alimentação')) return <ShoppingCart size={18} />;
        if (cat.includes('salário') || cat.includes('freelance')) return <Briefcase size={18} />;
        if (cat.includes('aluguel') || cat.includes('casa')) return <Home size={18} />;
        if (cat.includes('luz') || cat.includes('conta') || cat.includes('energia')) return <Zap size={18} />;
        return <DollarSign size={18} />;
    };

    return (
        <div className="list-item">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
                    {getIcon()}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{name}</span>
                    <span className="text-xs text-gray-500 uppercase font-semibold">
                        {category} • {date}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className={`font-bold ${type === 'receita' ? 'text-success' : 'text-error'}`}>
                    {type === 'receita' ? '+' : '-'} {formatCurrency(amount)}
                </span>
                <button className="btn-details">Detalhes</button>
            </div>
        </div>
    );
}
