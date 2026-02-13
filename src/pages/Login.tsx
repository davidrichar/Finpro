
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = isSignUp
            ? await signUp(email, password, name)
            : await signIn(email, password);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            if (isSignUp) {
                // For Supabase, usually you need to verify email, but for simple flow we might auto-log in if configured
                setError("Conta criada! Verifique seu email ou tente fazer login.");
                setLoading(false);
                setIsSignUp(false);
            } else {
                navigate('/');
            }
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="card">
                <h2 className="text-center">Finance App</h2>
                <p className="subtitle text-center">
                    {isSignUp ? 'Crie sua conta para começar' : 'Entre com suas credenciais para acessar sua conta'}
                </p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {isSignUp && (
                        <div className="form-group">
                            <label htmlFor="name">Nome completo</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Seu nome"
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="seu@email.com"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="mt-4">
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Carregando...
                            </>
                        ) : isSignUp ? 'Criar Conta' : 'Entrar'}
                    </button>
                </form>

                <div className="text-center mt-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{
                            background: 'none',
                            color: 'var(--primary)',
                            padding: '0 0.5rem',
                            width: 'auto',
                            display: 'inline',
                            fontWeight: 700
                        }}
                    >
                        {isSignUp ? 'Fazer Login' : 'Criar Agora'}
                    </button>
                </div>
            </div>
        </div>
    );
}
