import { useState } from 'react';
import { X, Landmark, Wallet, PiggyBank, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const icons = [
    { id: 'landmark', icon: Landmark, label: 'Banco' },
    { id: 'wallet', icon: Wallet, label: 'Carteira' },
    { id: 'piggy', icon: PiggyBank, label: 'Poupança' },
    { id: 'card', icon: CreditCard, label: 'Cartão' },
];

export default function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        bank_name: '',
        balance: '',
        type: 'landmark'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('bank_accounts')
                .insert([{
                    user_id: user.id,
                    name: formData.name,
                    bank_name: formData.bank_name,
                    balance: parseFloat(formData.balance.replace(',', '.')) || 0,
                    type: formData.type
                }]);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error adding account:', err);
            alert('Erro ao adicionar conta. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h2>Nova Conta Bancária</h2>
                    <button onClick={onClose} className="btn-close-modal">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
                    <div className="input-group">
                        <label>Nome da Conta (ex: Minha Conta)</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Conta Principal"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label>Instituição Financeira</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Nubank, Itaú..."
                            value={formData.bank_name}
                            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label>Saldo Inicial (R$)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            required
                            placeholder="0,00"
                            value={formData.balance}
                            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label>Escolha um Ícone</label>
                        <div className="flex gap-3 mt-2">
                            {icons.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: item.id })}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.type === item.id
                                        ? 'bg-success text-white shadow-lg'
                                        : 'bg-secondary-theme text-muted-theme hover:bg-border-theme'
                                        }`}
                                >
                                    <item.icon size={20} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary mt-4 py-4 rounded-xl flex items-center justify-center gap-2"
                    >
                        {loading ? <span className="spinner w-5 h-5 border-2"></span> : 'Salvar Conta'}
                    </button>
                </form>
            </div>
        </div>
    );
}
