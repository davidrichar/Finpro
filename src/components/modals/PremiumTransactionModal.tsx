import { useState, useEffect } from 'react';
import {
    X,
    DollarSign,
    FileText,
    Calendar,
    Tag,
    Plus,
    Minus,
    Paperclip,
    StickyNote,
    Check,
    Landmark
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface PremiumTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    type: 'receivable' | 'payable';
    transaction?: Transaction | null;
}

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
}

interface BankAccount {
    id: string;
    name: string;
    bank_name: string;
    balance: number;
    type: string;
}

interface Category {
    id: string;
    name: string;
    type: string;
}

export default function PremiumTransactionModal({ isOpen, onClose, onSuccess, type, transaction }: PremiumTransactionModalProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [installments, setInstallments] = useState(1);
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Data state
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const isReceivable = type === 'receivable';
    const isEditMode = !!transaction;
    const title = isEditMode
        ? (isReceivable ? 'Editar Conta a Receber' : 'Editar Conta a Pagar')
        : (isReceivable ? 'Nova Conta a Receber' : 'Nova Conta a Pagar');
    const subtitle = isEditMode
        ? 'Atualize os dados do lançamento.'
        : (isReceivable
            ? 'Preencha os dados da nova receita para o seu controle financeiro.'
            : 'Preencha os dados da nova despesa para o seu controle financeiro.');
    const accountLabel = isReceivable ? 'CONTA DE DEPÓSITO' : 'CONTA DE DÉBITO';
    const actionButtonText = isReceivable ? 'Receber Agora' : 'Pagar Agora';
    const colorClass = isReceivable ? 'receivable' : 'payable';

    useEffect(() => {
        if (isOpen && user) {
            fetchBankAccounts();
            fetchCategories();

            // Load transaction data if in edit mode
            if (transaction) {
                setDescription(transaction.description);
                setAmount(String(transaction.amount));
                setDate(transaction.date);
                setCategoryId(transaction.category_id || '');
                setSelectedAccountId(transaction.account_id || '');
                setIsRecurring(false); // Disable recurring for edit mode
            }
        }
    }, [isOpen, user, transaction]);

    const fetchBankAccounts = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('bank_accounts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setBankAccounts(data || []);
            if (data && data.length > 0) {
                setSelectedAccountId(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('type', isReceivable ? 'income' : 'expense')
                .order('name', { ascending: true });

            if (error) throw error;
            setCategories(data || []);
            if (data && data.length > 0) {
                setCategoryId(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const parseAmount = (val: string) => {
        return parseCurrency(val);
    };

    const calculateInstallments = () => {
        if (!amount || !isRecurring) return [];

        const totalAmount = parseAmount(amount);
        if (totalAmount <= 0) return [];

        const installmentAmount = totalAmount / installments;
        const baseDate = new Date(date);

        return Array.from({ length: installments }, (_, index) => {
            const installmentDate = new Date(baseDate);
            installmentDate.setMonth(baseDate.getMonth() + index);

            return {
                number: index + 1,
                date: installmentDate.toISOString().split('T')[0],
                amount: installmentAmount
            };
        });
    };

    const handleSubmit = async () => {
        if (!user || !description || !amount || !selectedAccountId) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        setLoading(true);
        try {
            const totalAmount = parseAmount(amount);

            if (totalAmount <= 0 && !isEditMode) {
                showToast('Por favor, insira um valor válido maior que zero.', 'error');
                setLoading(false);
                return;
            }

            if (isEditMode && transaction) {
                // Update existing transaction
                const { error } = await supabase
                    .from('transactions')
                    .update({
                        description,
                        amount: totalAmount,
                        date,
                        category_id: categoryId || null,
                        account_id: selectedAccountId
                    })
                    .eq('id', transaction.id);

                if (error) throw error;
            } else if (isRecurring && installments > 1) {
                // Create multiple transactions for installments
                const installmentsList = calculateInstallments();
                const transactions = installmentsList.map((inst) => ({
                    user_id: user.id,
                    account_id: selectedAccountId || null,
                    description: `${description} (${inst.number}/${installments})`,
                    amount: inst.amount,
                    date: inst.date,
                    type: isReceivable ? 'income' : 'expense',
                    category_id: categoryId || null,
                    status: 'pending'
                }));

                const { error } = await supabase
                    .from('transactions')
                    .insert(transactions);

                if (error) throw error;
            } else {
                // Create single transaction
                const { error } = await supabase
                    .from('transactions')
                    .insert([{
                        user_id: user.id,
                        account_id: selectedAccountId || null,
                        description,
                        amount: totalAmount,
                        date,
                        type: isReceivable ? 'income' : 'expense',
                        category_id: categoryId || null,
                        status: 'pending'
                    }]);

                if (error) throw error;
            }

            showToast(isEditMode ? 'Lançamento atualizado com sucesso!' : 'Lançamento salvo com sucesso!');
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Error saving transaction:', err);
            showToast('Erro ao salvar transação: ' + (err.message || 'Verifique o console.'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReceivePayNow = async () => {
        if (!user || !description || !amount || !selectedAccountId) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        setLoading(true);
        try {
            const totalAmount = parseAmount(amount);

            const { error } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    account_id: selectedAccountId || null,
                    description,
                    amount: totalAmount,
                    date,
                    type: isReceivable ? 'income' : 'expense',
                    category_id: categoryId || null,
                    status: 'paid'
                }]);

            if (error) throw error;

            showToast(isReceivable ? 'Recebido com sucesso!' : 'Pago com sucesso!');
            onSuccess();
            handleClose();
        } catch (err: any) {
            showToast('Erro ao salvar transação: ' + (err.message || 'Verifique o console.'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDescription('');
        setNotes('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategoryId('');
        setIsRecurring(false);
        setInstallments(1);
        setSelectedAccountId('');
        onClose();
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    if (!isOpen) return null;

    const installmentsList = calculateInstallments();
    const totalAmount = parseCurrency(amount);

    return (
        <div className="premium-modal-overlay" onClick={handleClose}>
            <div className="premium-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="premium-modal-header">
                    <div>
                        <h2>{title}</h2>
                        <p className="premium-modal-subtitle">{subtitle}</p>
                    </div>
                    <button className="premium-modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Total Value Display */}
                <div className={`total-value-display ${colorClass}`}>
                    <span className="total-value-label">VALOR TOTAL</span>
                    <span className="total-value-amount">
                        {formatCurrency(totalAmount)}
                    </span>
                </div>

                {/* Form Fields */}
                <div className="premium-modal-body">
                    {/* Name */}
                    <div className="form-field-with-icon">
                        <DollarSign size={20} className="field-icon" />
                        <input
                            type="text"
                            placeholder={isReceivable ? "Nome da Receita" : "Nome da Despesa"}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="premium-input"
                        />
                    </div>

                    {/* Description */}
                    <div className="form-field-with-icon">
                        <FileText size={20} className="field-icon" />
                        <textarea
                            placeholder="Descrição (opcional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="premium-textarea"
                            rows={3}
                        />
                    </div>

                    {/* Date and Category Row */}
                    <div className="form-row-double">
                        <div className="form-field-with-icon">
                            <Calendar size={20} className="field-icon" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="premium-input"
                            />
                        </div>
                        <div className="form-field-with-icon">
                            <Tag size={20} className="field-icon" />
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="premium-select"
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="form-field-with-icon">
                        <DollarSign size={20} className="field-icon" />
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="premium-input"
                        />
                    </div>

                    {/* Recurring Toggle */}
                    {!isEditMode && (
                        <div className="recurring-toggle-section">
                            <label className="modern-toggle-label">
                                <input
                                    type="checkbox"
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                    className="modern-toggle-input"
                                />
                                <span className={`modern-toggle-slider ${colorClass}`}></span>
                                <span className="modern-toggle-text">
                                    {isReceivable ? 'Repetir receita?' : 'Repetir despesa?'}
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Installments Section */}
                    {isRecurring && (
                        <div className="installments-section">
                            <div className="installment-counter">
                                <span className="installment-label">Nº Parcelas</span>
                                <div className="counter-controls">
                                    <button
                                        type="button"
                                        onClick={() => setInstallments(Math.max(1, installments - 1))}
                                        className="counter-btn"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="counter-value">{installments}</span>
                                    <button
                                        type="button"
                                        onClick={() => setInstallments(Math.min(60, installments + 1))}
                                        className="counter-btn"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Installment Preview */}
                            {installmentsList.length > 0 && (
                                <div className="installment-preview">
                                    <h4 className="installment-preview-title">📅 PREVISÃO DAS PARCELAS</h4>
                                    <div className="installment-list">
                                        {installmentsList.map((inst) => (
                                            <div key={inst.number} className="installment-card">
                                                <span className="installment-date">{inst.date}</span>
                                                <span className="installment-amount">
                                                    {formatCurrency(inst.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Optional Actions */}
                    <div className="optional-actions">
                        <button type="button" className="optional-action-btn">
                            <Paperclip size={16} />
                            Anexar comprovante
                        </button>
                        <button type="button" className="optional-action-btn">
                            <StickyNote size={16} />
                            Adicionar notas
                        </button>
                    </div>

                    {/* Bank Account Selection */}
                    <div className="bank-account-section">
                        <h4 className="bank-account-title">{accountLabel}</h4>
                        <div className="bank-account-grid">
                            {bankAccounts.map((account) => (
                                <div
                                    key={account.id}
                                    className={`bank-account-card ${selectedAccountId === account.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedAccountId(account.id)}
                                >
                                    <div className="bank-account-header">
                                        <Landmark size={20} />
                                        {selectedAccountId === account.id && (
                                            <div className="bank-account-check">
                                                <Check size={16} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="bank-account-info">
                                        <span className="bank-account-name">{account.bank_name}</span>
                                        <span className="bank-account-balance">
                                            Saldo Atual: {formatCurrency(account.balance)}
                                        </span>
                                        <span className="bank-account-label">{account.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="premium-modal-actions">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-outline-primary"
                    >
                        {loading ? 'Salvando...' : (isEditMode ? 'Atualizar' : 'Salvar')}
                    </button>
                    {!isEditMode && (
                        <button
                            type="button"
                            onClick={handleReceivePayNow}
                            disabled={loading}
                            className={`btn-primary-action ${colorClass}`}
                        >
                            {loading ? 'Processando...' : actionButtonText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
