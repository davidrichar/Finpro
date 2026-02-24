import { useEffect, useState, useCallback } from 'react';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    CheckCircle,
    Clock,
    AlertCircle,
    Calendar as CalendarIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import TaskModal from '../components/modals/TaskModal';

interface Task {
    id: string;
    user_id: string;
    title: string;
    description: string;
    date: string;
    time: string | null;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
    created_at: string;
}

export default function Agenda() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPriority, setSelectedPriority] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');

    const fetchTasks = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            let query = supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .neq('status', 'completed'); // Only show non-completed tasks (completed = removed)

            if (searchQuery) {
                query = query.ilike('title', `%${searchQuery}%`);
            }

            if (selectedPriority !== 'all') {
                query = query.eq('priority', selectedPriority);
            }

            if (selectedDate) {
                query = query.eq('date', selectedDate);
            }

            const { data, error } = await query.order('date', { ascending: true }).order('time', { ascending: true });

            if (error) throw error;
            setTasks(data || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            showToast('Erro ao carregar tarefas.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, searchQuery, selectedPriority, selectedDate, showToast]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleDeleteTask = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('Tarefa excluída com sucesso!');
            fetchTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
            showToast('Erro ao excluir tarefa.', 'error');
        }
    };

    const handleCompleteTask = async (task: Task) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: 'completed' })
                .eq('id', task.id);

            if (error) throw error;
            showToast('Tarefa concluída com sucesso! ✅', 'success');

            // Remove from local state for immediate feedback/animation if desired
            // For now, re-fetching is reliable and non-completed filter will handle it
            fetchTasks();
        } catch (err) {
            console.error('Error completing task:', err);
            showToast('Erro ao concluir tarefa.', 'error');
        }
    };

    const openModal = (task: Task | null = null) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#EF4444';
            case 'medium': return '#F97316';
            case 'low': return '#22C55E';
            default: return 'var(--text-muted)';
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'high': return 'Alta';
            case 'medium': return 'Média';
            case 'low': return 'Baixa';
            default: return priority;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="dashboard-content">
            <header className="entries-header">
                <div>
                    <h1>Agenda</h1>
                    <p className="subtitle">Gerencie suas tarefas e compromissos</p>
                </div>
                <button className="btn-add-account" onClick={() => openModal()} style={{ width: 'auto', padding: '12px 24px' }}>
                    <Plus size={20} />
                    <span>Nova Tarefa</span>
                </button>
            </header>

            <div className="agenda-filters-container">
                <div className="agenda-search-bar">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar tarefas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="agenda-secondary-filters">
                    <div className="filter-item">
                        <CalendarIcon size={18} />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item">
                        <AlertCircle size={18} />
                        <select
                            value={selectedPriority}
                            onChange={(e) => setSelectedPriority(e.target.value)}
                        >
                            <option value="all">Todas Prioridades</option>
                            <option value="high">Alta Prioridade</option>
                            <option value="medium">Média Prioridade</option>
                            <option value="low">Baixa Prioridade</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="agenda-tabs">
                <div className="tab-item active">Todos</div>
            </div>

            <main className="agenda-list">
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <span>Carregando tarefas...</span>
                    </div>
                ) : tasks.length > 0 ? (
                    <div className="agenda-grid">
                        {tasks.map((task) => (
                            <div key={task.id} className="task-card">
                                <div className="task-card-header">
                                    <div className="task-date-time">
                                        <CalendarIcon size={14} />
                                        <span>{formatDate(task.date)}</span>
                                        {task.time && (
                                            <>
                                                <span className="separator">•</span>
                                                <Clock size={14} />
                                                <span>{task.time.substring(0, 5)}</span>
                                            </>
                                        )}
                                    </div>
                                    <span
                                        className="priority-badge"
                                        style={{ backgroundColor: `${getPriorityColor(task.priority)}15`, color: getPriorityColor(task.priority) }}
                                    >
                                        {getPriorityLabel(task.priority)}
                                    </span>
                                </div>

                                <div className="task-card-body">
                                    <h3>{task.title}</h3>
                                    {task.description && <p>{task.description}</p>}
                                </div>

                                <div className="task-card-footer">
                                    <div className="task-actions" style={{ marginLeft: 'auto' }}>
                                        <button
                                            className="action-btn edit"
                                            onClick={() => openModal(task)}
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="action-btn complete"
                                            onClick={() => handleCompleteTask(task)}
                                            title="Concluir"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDeleteTask(task.id)}
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <CalendarIcon size={48} />
                        <h3>Nenhuma tarefa pendente</h3>
                        <p>Tudo em dia por aqui!</p>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        fetchTasks();
                        setIsModalOpen(false);
                    }}
                    task={selectedTask}
                />
            )}

            <style>{`
                .agenda-filters-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .agenda-search-bar {
                    position: relative;
                    width: 100%;
                }

                .agenda-search-bar .search-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                }

                .agenda-search-bar input {
                    padding-left: 3rem;
                    height: 50px;
                    border-radius: 12px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                }

                .agenda-secondary-filters {
                    display: flex;
                    gap: 1rem;
                    overflow-x: auto;
                    padding-bottom: 4px;
                }

                .agenda-secondary-filters .filter-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: var(--bg-secondary);
                    padding: 0.5rem 1rem;
                    border-radius: 10px;
                    border: 1px solid var(--border-color);
                    color: var(--text-secondary);
                    flex-shrink: 0;
                    min-width: 180px;
                }

                .agenda-secondary-filters .filter-item input,
                .agenda-secondary-filters .filter-item select {
                    border: none;
                    background: transparent;
                    padding: 0;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                    width: 100%;
                }

                .agenda-tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 2rem;
                    background: var(--bg-tertiary);
                    padding: 0.5rem;
                    border-radius: 12px;
                }

                .tab-item {
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    background: transparent;
                    border: none;
                    white-space: nowrap;
                    width: auto;
                }

                .tab-item.active {
                    background: var(--bg-secondary);
                    color: var(--primary);
                    box-shadow: var(--shadow-sm);
                }

                .agenda-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                .task-card {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: default;
                }

                .task-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-md);
                    border-color: var(--primary);
                }

                .task-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .task-date-time {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                }

                .task-date-time .separator {
                    color: var(--border-color);
                }

                .priority-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .task-card-body h3 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--text-main);
                }

                .task-card-body p {
                    margin: 0;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .task-card-footer {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    margin-top: auto;
                    padding-top: 1.25rem;
                    border-top: 1px solid var(--border-color);
                }

                .task-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .action-btn {
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border-color);
                    background: var(--bg-tertiary);
                    color: var(--text-secondary);
                    transition: all 0.2s;
                    padding: 0;
                }

                .action-btn:hover {
                    color: var(--text-main);
                    background: var(--bg-secondary);
                    border-color: var(--text-muted);
                    transform: scale(1.05);
                }

                .action-btn.complete:hover {
                    color: #22C55E;
                    background: rgba(34, 197, 94, 0.1);
                    border-color: #22C55E;
                }

                .action-btn.delete:hover {
                    color: #EF4444;
                    background: rgba(239, 68, 68, 0.1);
                    border-color: #EF4444;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 5rem 2rem;
                    text-align: center;
                    color: var(--text-muted);
                }

                .empty-state h3 {
                    margin: 1.5rem 0 0.5rem 0;
                    color: var(--text-main);
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 5rem 0;
                    gap: 1rem;
                    color: var(--text-muted);
                }

                @media (max-width: 768px) {
                    .agenda-secondary-filters {
                        flex-direction: column;
                    }
                    
                    .agenda-secondary-filters .filter-item {
                        width: 100%;
                    }

                    .agenda-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
