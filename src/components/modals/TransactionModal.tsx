import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'receivable' | 'payable';
}

export default function TransactionModal({ isOpen, onClose, type }: TransactionModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isRecurrent, setIsRecurrent] = useState(false);
    const [isFixa, setIsFixa] = useState(false);

    // Form state
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [categoriaId, setCategoriaId] = useState('');
    const [valor, setValor] = useState('');
    const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
    const [totalParcelas, setTotalParcelas] = useState('1');

    if (!isOpen) return null;

    const title = type === 'receivable' ? 'Contas a Receber' : 'Contas a Pagar';

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button onClick={onClose} className="btn-close-modal">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <form className="flex flex-col gap-4">
                        <div className="form-group">
                            <label>Nome</label>
                            <input
                                type="text"
                                placeholder="Ex: Aluguel, Salário..."
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Descrição</label>
                            <input
                                type="text"
                                placeholder="Opcional"
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Categoria</label>
                            <select
                                value={categoriaId}
                                onChange={(e) => setCategoriaId(e.target.value)}
                                className="premium-select"
                                style={{ width: '100%' }}
                            >
                                <option value="">Selecione uma categoria</option>
                                <option value="Salário">Salário</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Aluguel">Aluguel</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Valor</label>
                                <input
                                    type="number"
                                    placeholder="0,00"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Data de Vencimento</label>
                                <input
                                    type="date"
                                    value={dataVencimento}
                                    onChange={(e) => setDataVencimento(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                            <label className="checkbox-group">
                                <input
                                    type="checkbox"
                                    checked={isFixa}
                                    onChange={(e) => setIsFixa(e.target.checked)}
                                />
                                <span>Fixa</span>
                            </label>

                            <label className="checkbox-group">
                                <input
                                    type="checkbox"
                                    checked={isRecurrent}
                                    onChange={(e) => setIsRecurrent(e.target.checked)}
                                />
                                <span>Recorrente</span>
                            </label>
                        </div>

                        {isRecurrent && (
                            <div className="form-group mt-2">
                                <label>Quantidade de parcelas</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Ex: 12"
                                    value={totalParcelas}
                                    onChange={(e) => setTotalParcelas(e.target.value)}
                                />
                            </div>
                        )}
                    </form>
                </div>

                <div className="modal-footer">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                        style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={async (e) => {
                            e.preventDefault();
                            if (!user) return;
                            setLoading(true);
                            try {
                                const { error } = await supabase.from('transactions').insert({
                                    user_id: user.id,
                                    nome,
                                    descricao,
                                    valor: parseFloat(valor),
                                    tipo: type === 'receivable' ? 'receita' : 'despesa',
                                    origem: type === 'receivable' ? 'conta_receber' : 'conta_pagar',
                                    status: 'pendente',
                                    data_vencimento: dataVencimento,
                                    recorrente: isRecurrent,
                                    fixa: isFixa,
                                    total_parcelas: parseInt(totalParcelas),
                                });
                                if (error) throw error;
                                onClose();
                            } catch (err) {
                                console.error('Error saving:', err);
                                alert('Erro ao salvar lançamento');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Salvar Lançamento'}
                    </button>
                </div>
            </div>
        </div>
    );
}
