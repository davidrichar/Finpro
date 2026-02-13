import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeftRight,
    CheckCircle2,
    Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface BankAccount {
    id: string;
    name: string;
    balance: number;
    bank_name: string;
}

export default function Transfers() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [originId, setOriginId] = useState('');
    const [destinationId, setDestinationId] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [observation, setObservation] = useState('');

    const fetchAccounts = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('bank_accounts')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching accounts:', error);
            return;
        }
        setAccounts(data || []);
    }, [user]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const handleSwap = () => {
        const temp = originId;
        setOriginId(destinationId);
        setDestinationId(temp);
    };

    const formatCurrencyInput = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const amount = Number(digits) / 100;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(amount);
    };

    const parseAmount = (value: string) => {
        const digits = value.replace(/\D/g, '');
        return Number(digits) / 100;
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(formatCurrencyInput(e.target.value));
    };

    const originAccount = accounts.find(a => a.id === originId);
    const destinationAccount = accounts.find(a => a.id === destinationId);

    const isReady = originId && destinationId && amount && parseAmount(amount) > 0 && originId !== destinationId;

    const handleSubmit = async () => {
        if (!isReady || !user) return;

        const value = parseAmount(amount);

        if (originAccount && value > originAccount.balance) {
            showToast('Saldo insuficiente na conta de origem.', 'error');
            return;
        }

        setLoading(true);

        try {
            // 1. Create Exit Transaction (Origin)
            const { error: outError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    account_id: originId,
                    description: `Transferência enviada: ${observation || 'Sem observação'}`,
                    amount: value,
                    date,
                    type: 'expense',
                    status: 'paid'
                }])
                .select()
                .single();

            if (outError) throw outError;

            // 2. Create Entry Transaction (Destination)
            const { error: inError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    account_id: destinationId,
                    description: `Transferência recebida: ${observation || 'Sem observação'}`,
                    amount: value,
                    date,
                    type: 'income',
                    status: 'paid'
                }]);

            if (inError) throw inError;

            // 3. Update Origin Balance
            const { error: updOriginError } = await supabase
                .from('bank_accounts')
                .update({ balance: originAccount!.balance - value })
                .eq('id', originId);

            if (updOriginError) throw updOriginError;

            // 4. Update Destination Balance
            const { error: updDestError } = await supabase
                .from('bank_accounts')
                .update({ balance: destinationAccount!.balance + value })
                .eq('id', destinationId);

            if (updDestError) throw updDestError;

            showToast('Transferência realizada com sucesso!', 'success');

            // Reset form
            setAmount('');
            setObservation('');
            fetchAccounts();

        } catch (err: any) {
            console.error('Error during transfer:', err);
            showToast('Erro ao realizar transferência: ' + (err.message || 'Erro desconhecido'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="transfers-page-container">
            <header className="transfers-header">
                <h1>Transferência entre Contas</h1>
                <p className="subtitle">Mova saldo entre suas contas bancárias</p>
            </header>

            <div className="transfer-card-wrapper">
                <main className="transfer-card">
                    <div className="transfer-form-group">
                        <label className="transfer-label">Conta de Origem</label>
                        <div className="transfer-select-wrapper">
                            <select
                                className="transfer-select"
                                value={originId}
                                onChange={(e) => setOriginId(e.target.value)}
                            >
                                <option value="">Selecione a conta</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.bank_name})
                                    </option>
                                ))}
                            </select>
                            {originAccount && (
                                <span className="account-balance-hint">
                                    Saldo disponível: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originAccount.balance)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="transfer-swap-container">
                        <button className="btn-swap-accounts" onClick={handleSwap} title="Inverter contas">
                            <ArrowLeftRight size={20} />
                        </button>
                    </div>

                    <div className="transfer-form-group">
                        <label className="transfer-label">Conta de Destino</label>
                        <div className="transfer-select-wrapper">
                            <select
                                className="transfer-select"
                                value={destinationId}
                                onChange={(e) => setDestinationId(e.target.value)}
                            >
                                <option value="">Selecione a conta</option>
                                {accounts.filter(a => a.id !== originId).map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.bank_name})
                                    </option>
                                ))}
                            </select>
                            {destinationAccount && (
                                <span className="account-balance-hint">
                                    Saldo disponível: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(destinationAccount.balance)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="transfer-form-group">
                        <label className="transfer-label">Valor da Transferência</label>
                        <div className="transfer-amount-input-container">
                            <input
                                type="text"
                                className="transfer-amount-input"
                                placeholder="R$ 0,00"
                                value={amount}
                                onChange={handleAmountChange}
                            />
                        </div>
                    </div>

                    <div className="transfer-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="transfer-label">Data</label>
                            <input
                                type="date"
                                className="transfer-observation-input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="transfer-label">Observação (Opcional)</label>
                            <input
                                type="text"
                                className="transfer-observation-input"
                                placeholder="Ex: Reserva"
                                value={observation}
                                onChange={(e) => setObservation(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        className="btn-confirm-transfer"
                        disabled={!isReady || loading}
                        onClick={handleSubmit}
                    >
                        {loading ? 'Processando...' : (
                            <>
                                <CheckCircle2 size={20} />
                                Confirmar Transferência
                            </>
                        )}
                    </button>

                    <p className="transfer-notice">
                        <Info size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        Essa operação irá debitar o valor da conta de origem e creditar na conta de destino automaticamente.
                    </p>
                </main>
            </div>
        </div>
    );
}
