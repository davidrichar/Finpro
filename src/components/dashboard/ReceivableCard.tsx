import { Circle } from 'lucide-react';

interface ReceivableCardProps {
    date: string;
    name: string;
    amount: number;
    status: 'confirmado' | 'pendente' | 'agendado';
}

export default function ReceivableCard({ date, name, amount, status }: ReceivableCardProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const getStatusInfo = () => {
        switch (status) {
            case 'confirmado': return { color: '#00E676', label: 'CONFIRMADO' };
            case 'pendente': return { color: '#FFAB40', label: 'PENDENTE' };
            case 'agendado': return { color: '#94A3B8', label: 'AGENDADO' };
        }
    };

    const info = getStatusInfo();

    return (
        <div className="receivable-card">
            <span className="date">{date}</span>
            <span className="name">{name}</span>
            <span className="amount">{formatCurrency(amount)}</span>
            <span className="status" style={{ color: info.color }}>
                <Circle size={6} fill={info.color} />
                {info.label}
            </span>
        </div>
    );
}
