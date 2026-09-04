import React, { useState } from 'react';
import { Bug, Lock, Mail, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthScreen() {
  const { login } = useAuth();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(loginIdentifier, loginPassword);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Erro ao realizar login.');
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-center-card">
        {/* Marca BioCount */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">
            <Bug size={32} className="text-emerald" />
          </div>
          <h2>BioCount</h2>
          <p className="auth-brand-tagline">
            Plataforma de Catalogação, Contagem e Auditoria de Coleções Biológicas
          </p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário Estrito de Login */}
        <form onSubmit={handleLoginSubmit} className="auth-form">
          <div className="form-group">
            <label>E-mail ou Nome de Usuário</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                type="text"
                required
                placeholder="Ex: professor@biocount.lab ou seu e-mail"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Senha de Acesso</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                required
                placeholder="Digite sua senha"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-auth-submit">
            <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Aviso de Acesso Restrito */}
        <div className="auth-restricted-callout">
          <ShieldAlert size={16} className="text-dim" />
          <span>
            Acesso restrito ao laboratório. Contas de estudantes e pesquisadores são criadas exclusivamente pelo Professor.
          </span>
        </div>
      </div>
    </div>
  );
}
