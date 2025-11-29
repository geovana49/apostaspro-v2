
import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowRight, Mail, KeyRound, Loader2, ArrowLeft, User, X, CheckCircle, Check, Upload, Zap, Wallet, Bot, Cloud } from 'lucide-react';
import { Button, Input } from './ui/UIComponents';
import { User as UserType } from '../types';

interface LandingPageProps {
  onLogin: (user: UserType) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'forgotPassword'>('landing');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('apostasPro_rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }
  }, []);

  const switchView = (newView: typeof view) => {
    setView(newView);
    setError('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setIsLoading(true);

    // Mock Login Delay
    setTimeout(() => {
      setIsLoading(false);
      // Simulate successful login
      const mockUser: UserType = {
        uid: 'local-user-' + Date.now(),
        username: 'Usuário Local',
        email: email
      };

      if (rememberMe) {
        localStorage.setItem('apostasPro_rememberedEmail', email);
      } else {
        localStorage.removeItem('apostasPro_rememberedEmail');
      }

      onLogin(mockUser);
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    // Mock Register Delay
    setTimeout(() => {
      setIsLoading(false);
      const mockUser: UserType = {
        uid: 'local-user-' + Date.now(),
        username: trimmedUsername,
        email: trimmedEmail
      };
      onLogin(mockUser);
    }, 1000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Digite seu email para recuperar a senha.');
      return;
    }
    setIsLoading(true);
    // Mock Reset
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('Email de redefinição enviado! (Simulação)');
    }, 1000);
  };

  const renderAuthCard = (content: React.ReactNode) => (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#17baa4] to-emerald-600 rounded-2xl opacity-30 group-hover:opacity-60 blur transition duration-500"></div>
        <div className="relative bg-[#0d111c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col gap-4">
          {content}
        </div>
      </div>
    </div>
  );

  const renderLoginForm = () => renderAuthCard(
    <form onSubmit={handleLogin} className="flex flex-col gap-4 relative">
      <div className="text-center mb-2"><h3 className="text-white font-bold text-xl">Acessar Plataforma</h3><p className="text-sm text-gray-500">Bem-vindo(a) de volta!</p></div>
      <Input icon={<Mail size={16} />} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
      <Input icon={<KeyRound size={16} />} type="password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors select-none">
          <div className={`w-4 h-4 rounded border border-white/20 flex items-center justify-center transition-all ${rememberMe ? 'bg-[#17baa4] border-[#17baa4]' : 'bg-transparent'}`}>{rememberMe && <Check size={10} className="text-[#090c19]" strokeWidth={4} />}</div>
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="hidden" />Lembrar de mim
        </label>
        <button type="button" onClick={() => switchView('forgotPassword')} className="text-xs font-medium text-[#17baa4] hover:underline">Esqueceu a senha?</button>
      </div>
      {error && <p className="text-xs text-danger text-center animate-in fade-in mt-2">{error}</p>}
      <Button variant="primary" size="lg" className="w-full h-12 text-base mt-2 bg-[#17baa4] hover:bg-[#129683] text-[#090c19] border-none" type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}</Button>
      <p className="text-xs text-gray-500 text-center mt-2">Não tem uma conta?{' '}<button type="button" onClick={() => switchView('register')} className="font-bold text-[#17baa4] hover:underline">Cadastre-se</button></p>
    </form>
  );

  const renderRegisterForm = () => renderAuthCard(
    <form onSubmit={handleRegister} className="flex flex-col gap-4 relative">
      <div className="text-center mb-2"><h3 className="text-white font-bold text-xl">Criar Conta Grátis</h3><p className="text-sm text-gray-500">Comece a gerenciar seus lucros.</p></div>
      <Input icon={<User size={16} />} type="text" placeholder="Nome de usuário" value={username} onChange={e => setUsername(e.target.value)} disabled={isLoading} />
      <Input icon={<Mail size={16} />} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
      <Input icon={<KeyRound size={16} />} type="password" placeholder="Crie uma senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
      <Input icon={<KeyRound size={16} />} type="password" placeholder="Confirme sua senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} />
      {error && <p className="text-xs text-danger text-center animate-in fade-in">{error}</p>}
      <Button variant="primary" size="lg" className="w-full h-12 text-base mt-2 bg-[#17baa4] hover:bg-[#129683] text-[#090c19] border-none" type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Cadastrar'}</Button>
      <p className="text-xs text-gray-500 text-center mt-2">Já tem uma conta?{' '}<button type="button" onClick={() => switchView('login')} className="font-bold text-[#17baa4] hover:underline">Faça Login</button></p>
    </form>
  );

  const renderForgotPasswordForm = () => renderAuthCard(
    <form onSubmit={handleResetPassword} className="flex flex-col gap-4 relative">
      <button type="button" onClick={() => switchView('login')} className="absolute -top-2 -right-2 text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5" title="Voltar"><ArrowLeft size={20} /></button>
      <div className="text-center mb-2"><h3 className="text-white font-bold text-xl">Redefinir Senha</h3><p className="text-sm text-gray-500">Insira seu email para receber o link.</p></div>
      {!successMessage ? (
        <>
          <Input icon={<Mail size={16} />} type="email" placeholder="Seu email cadastrado" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
          {error && <p className="text-xs text-danger text-center animate-in fade-in">{error}</p>}
          <Button variant="primary" size="lg" className="w-full h-12 text-base mt-2 bg-[#17baa4] hover:bg-[#129683] text-[#090c19] border-none" type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Enviar Email'}</Button>
        </>
      ) : (
        <div className="text-center py-6 animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-[#17baa4]/20 text-[#17baa4] rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
          <h4 className="text-lg font-bold text-white mb-2">Email Enviado!</h4>
          <p className="text-sm text-gray-400">Verifique sua caixa de entrada (e spam) para redefinir sua senha.</p>
          <Button variant="neutral" className="mt-4 w-full" onClick={() => switchView('login')}>Voltar ao Login</Button>
        </div>
      )}
    </form>
  );

  // Elegant Home Screen with balance status
  const renderElegantHome = () => {
    const [balanceStatus, setBalanceStatus] = useState<'pending' | 'won' | 'lost'>('pending');
    const balanceAmount = 12450; // example amount

    return (
      <div className="w-full bg-[#151b2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl hero-card-transform">
        <h2 className="text-lg font-medium text-gray-400 mb-2">Saldo</h2>
        {balanceStatus === 'pending' ? (
          <p className="text-xl text-gray-500">Em aberto</p>
        ) : balanceStatus === 'won' ? (
          <p className="text-xl text-emerald-400">+{balanceAmount.toLocaleString('pt-BR')}</p>
        ) : (
          <p className="text-xl text-red-500">-{balanceAmount.toLocaleString('pt-BR')}</p>
        )}
        <button
          type="button"
          className="mt-4 w-full h-10 text-sm font-medium bg-[#17baa4] hover:bg-[#129683] text-[#090c19] rounded"
          onClick={() =>
            setBalanceStatus(prev =>
              prev === 'pending' ? 'won' : prev === 'won' ? 'lost' : 'pending'
            )
          }
        >
          Trocar status
        </button>

        <div className="w-full h-px bg-white/10 my-6"></div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5 text-white h-10"
            onClick={() => switchView('login')}
          >
            Entrar
          </Button>
          <Button
            variant="primary"
            className="bg-[#17baa4] hover:bg-[#129683] text-[#090c19] border-none h-10"
            onClick={() => switchView('register')}
          >
            Criar Conta
          </Button>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen w-full bg-[#090c19] relative overflow-hidden font-sans selection:bg-[#17baa4] selection:text-[#090c19] flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0f172a] via-[#090c19] to-[#090c19] opacity-80"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#17baa4]/10 blur-[120px] animate-pulse duration-3000"></div>
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[100px] animate-pulse duration-5000 delay-1000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center gap-8">
        {/* Branding Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Apostas<span className="text-[#17baa4]">Pro</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide uppercase">
            Professional Sports Analytics
          </p>
        </div>

        {/* Main Content Container */}
        <div className="w-full animate-in fade-in zoom-in-95 duration-700 delay-100">
          {view === 'landing' && renderLoginForm()}
          {view === 'login' && renderLoginForm()}
          {view === 'register' && renderRegisterForm()}
          {view === 'forgotPassword' && renderForgotPasswordForm()}
        </div>

        {/* Security Badges */}
        <div className="flex items-center justify-center gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-[#17baa4]">
              <KeyRound size={10} />
            </div>
            <span>Ambiente Seguro</span>
          </div>
          <div className="w-px h-4 bg-white/10"></div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-[#17baa4]">
              <CheckCircle size={10} />
            </div>
            <span>Dados Criptografados</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
