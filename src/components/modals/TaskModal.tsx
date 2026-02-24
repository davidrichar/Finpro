import { useState, useEffect } from 'react';
import {
    X,
    Calendar,
    AlertCircle,
    Clock,
    Type,
    AlignLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface Task {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string | null;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
}

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    task?: Task | null;
}

export default function TaskModal({ isOpen, onClose, onSuccess, task }: TaskModalProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

    const isEditMode = !!task;

    useEffect(() => {
        if (isOpen && task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setDate(task.date);
            setTime(task.time || '');
            setPriority(task.priority);
        } else if (isOpen) {
            // Reset form for new task
            setTitle('');
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
            setTime('');
            setPriority('medium');
        }
    }, [isOpen, task]);

    const handleSubmit = async () => {
        if (!user || !title || !date) {
            showToast('Por favor, preencha o título e a data.', 'error');
            return;
        }

        setLoading(true);
        try {
            const taskData = {
                user_id: user.id,
                title,
                description,
                date,
                time: time || null,
                priority,
                // New tasks are always pending. Edits maintain status unless updated elsewhere.
                status: task?.status || 'pending'
            };

            if (isEditMode && task) {
                const { error } = await supabase
                    .from('tasks')
                    .update(taskData)
                    .eq('id', task.id);

                if (error) throw error;
                showToast('Tarefa atualizada com sucesso!');
            } else {
                const { error } = await supabase
                    .from('tasks')
                    .insert([taskData]);

                if (error) throw error;
                showToast('Tarefa criada com sucesso!');
            }

            onSuccess();
        } catch (err: any) {
            console.error('Error saving task:', err);
            showToast('Erro ao salvar tarefa: ' + (err.message || 'Verifique o console.'), 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="premium-modal-overlay" onClick={onClose}>
            <div className="premium-modal-content" onClick={e => e.stopPropagation()}>
                <div className="premium-modal-header">
                    <div className="premium-modal-header-info">
                        <div className="header-icon-box" style={{ background: 'rgba(0, 230, 118, 0.1)', color: 'var(--primary)' }}>
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h3 className="premium-modal-title">
                                {isEditMode ? 'Editar Tarefa' : 'Nova Tarefa'}
                            </h3>
                            <p className="premium-modal-subtitle">
                                {isEditMode ? 'Atualize os detalhes da sua tarefa.' : 'Agende um novo compromisso ou tarefa.'}
                            </p>
                        </div>
                    </div>
                    <button className="premium-modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="premium-modal-body">
                    {/* Title */}
                    <div className="form-field-with-icon">
                        <Type size={20} className="field-icon" />
                        <input
                            type="text"
                            placeholder="Título da tarefa"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="premium-input"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="form-field-with-icon" style={{ alignItems: 'flex-start' }}>
                        <AlignLeft size={20} className="field-icon" style={{ marginTop: '12px' }} />
                        <textarea
                            placeholder="Descrição opcional"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="premium-input"
                            rows={3}
                            style={{ resize: 'none' }}
                        />
                    </div>

                    {/* Date and Time Row */}
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
                            <Clock size={20} className="field-icon" />
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="premium-input"
                            />
                        </div>
                    </div>

                    {/* Priority Only */}
                    <div className="form-field-with-icon">
                        <AlertCircle size={20} className="field-icon" />
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as any)}
                            className="premium-select"
                        >
                            <option value="low">Prioridade Baixa</option>
                            <option value="medium">Prioridade Média</option>
                            <option value="high">Prioridade Alta</option>
                        </select>
                    </div>
                </div>

                <div className="premium-modal-actions">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary-action receivable"
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Salvando...' : (isEditMode ? 'Atualizar Tarefa' : 'Criar Tarefa')}
                    </button>
                </div>
            </div>

            <style>{`
                .premium-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.8);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 1rem;
                    animation: fadeIn 0.2s ease-out;
                }

                .premium-modal-content {
                    background: var(--bg-secondary);
                    width: 100%;
                    max-width: 500px;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    border: 1px solid var(--border-color);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                }

                .premium-modal-header {
                    padding: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border-color);
                }

                .premium-modal-header-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .header-icon-box {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .premium-modal-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--text-main);
                    margin: 0;
                }

                .premium-modal-subtitle {
                    font-size: 0.875rem;
                    color: var(--text-muted);
                    margin: 4px 0 0 0;
                }

                .premium-modal-close {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .premium-modal-close:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-main);
                }

                .premium-modal-body {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .form-field-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .field-icon {
                    position: absolute;
                    left: 1rem;
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .premium-input, .premium-select {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 3rem;
                    border: 1.5px solid var(--border-color);
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 500;
                    background: var(--bg-tertiary);
                    color: var(--text-main);
                    transition: all 0.2s;
                    appearance: none;
                }

                .premium-input:focus, .premium-select:focus {
                    outline: none;
                    border-color: var(--primary);
                    background: var(--bg-secondary);
                    box-shadow: 0 0 0 4px rgba(0, 230, 118, 0.1);
                }

                .form-row-double {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem;
                }

                .premium-modal-actions {
                    padding: 1.5rem;
                    border-top: 1px solid var(--border-color);
                    background: var(--bg-tertiary);
                }

                .btn-primary-action {
                    padding: 0.875rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 1rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-primary-action.receivable {
                    background: var(--primary);
                    color: white;
                }

                .btn-primary-action:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }

                @media (max-width: 480px) {
                    .premium-modal-content {
                        max-width: 100%;
                        border-radius: 20px 20px 0 0;
                        position: fixed;
                        bottom: 0;
                    }
                    .form-row-double {
                        grid-template-columns: 1fr;
                    }
                    .premium-modal-overlay {
                        padding: 0;
                        align-items: flex-end;
                    }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
