import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowRight, Mail, KeyRound, Loader2, ArrowLeft, User, X, CheckCircle, Check, Upload, Zap, Wallet, Bot, Cloud, ChevronsDown } from 'lucide-react';
import { Button, Input } from './ui/UIComponents';
import { User as UserType } from '../types';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

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

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const user: UserType = {
        uid: firebaseUser.uid,
        username: firebaseUser.displayName || 'Usuário',
        email: firebaseUser.email || email
      };

      if (rememberMe) {
        localStorage.setItem('apostasPro_rememberedEmail', email);
      } else {
        localStorage.removeItem('apostasPro_rememberedEmail');
      }

      onLogin(user);
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Usuário não encontrado. Verifique o email.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Senha incorreta. Tente novamente.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
      setIsLoading(false);
    }
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

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const firebaseUser = userCredential.user;

      const user: UserType = {
        uid: firebaseUser.uid,
        username: trimmedUsername,
        email: firebaseUser.email || trimmedEmail
      };

      onLogin(user);
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Este email já está cadastrado. Faça login.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else if (error.code === 'auth/weak-password') {
        setError('Senha muito fraca. Use pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!email) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Instruções de recuperação enviadas para seu e-mail!');
      setIsLoading(false);
      setTimeout(() => {
        switchView('login');
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao enviar email de recuperação:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Email não encontrado. Verifique o endereço.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError('Erro ao enviar email. Tente novamente.');
      }
      setIsLoading(false);
    }
  };
  const renderAuthCard = (content: React.ReactNode) => (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#17baa4] to-emerald-600 rounded-2xl opacity-30 group-hover:opacity-60 blur transition duration-500"></div>
        <div className="relative bg-[#0d111c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col gap-4">
          <button
            onClick={() => switchView('landing')}
            className="absolute top-4 right-4 bg-gradient-to-br from-[#17baa4] to-emerald-600 text-[#090c19] p-1.5 rounded-lg shadow-lg shadow-[#17baa4]/20 hover:shadow-[#17baa4]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 z-10"
            title="Fechar"
          >
            <X size={20} strokeWidth={3} />
          </button>
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
    <div className="min-h-screen w-full bg-[#090c19] relative overflow-hidden font-sans selection:bg-[#17baa4] selection:text-[#090c19]">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0f172a] via-[#090c19] to-[#090c19] opacity-80"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#17baa4]/10 blur-[120px] animate-pulse duration-3000"></div>
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[100px] animate-pulse duration-5000 delay-1000"></div>
      </div>

      {/* Header / Navbar */}
      <header className="relative z-20 border-b border-white/10 bg-[#090c19]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#17baa4] to-emerald-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="text-[#090c19] w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white leading-none">
                Apostas<span className="text-[#17baa4]">Pro</span>
              </h1>
              <p className="text-[7px] sm:text-[8px] text-gray-400 uppercase tracking-wider leading-tight">Professional Analytics</p>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 hover:bg-white/5 text-white text-sm px-4 py-2"
              onClick={() => switchView('login')}
            >
              Entrar
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-[#17baa4] hover:bg-[#129683] text-[#090c19] border-none text-sm px-4 py-2 font-semibold"
              onClick={() => switchView('register')}
            >
              Cadastrar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-73px)]">
        <div className="w-full max-w-6xl px-4 flex flex-col items-center gap-12 pt-28 pb-4 sm:py-12">
          {view === 'landing' ? (
            // Welcome Screen
            <>
              {/* Hero Section */}
              <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-8 duration-1000 text-center max-w-3xl px-4">
                <div className="space-y-6">
                  <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                    Gerencie Suas Apostas com <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#17baa4] to-emerald-400">Inteligência</span>
                  </h2>
                  <p className="text-gray-300 text-xs sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                    Plataforma completa para organizar, acompanhar e analisar suas apostas esportivas com ferramentas profissionais
                  </p>
                </div>

                {/* Mobile/Desktop Hero Buttons */}
                <div className="flex flex-row items-center justify-center gap-6 w-full mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-1 sm:flex-none sm:w-auto px-4 sm:px-8 py-4 text-sm sm:text-base bg-[#17baa4] hover:bg-[#129683] text-[#090c19] border-none font-bold shadow-[0_0_20px_rgba(23,186,164,0.3)] animate-pulse whitespace-nowrap"
                    onClick={() => switchView('register')}
                  >
                    Criar Conta
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 sm:flex-none sm:w-auto px-4 sm:px-8 py-4 text-sm sm:text-base border-white/20 hover:bg-white/5 text-white transition-all hover:scale-105 active:scale-95"
                    onClick={() => switchView('login')}
                  >
                    Entrar
                  </Button>
                </div>

                {/* Scroll Indicator */}
                <div className="mt-8 sm:mt-12 animate-bounce text-[#17baa4]/50">
                  <ChevronsDown size={24} className="sm:w-8 sm:h-8" />
                </div>
              </div>

              {/* Features Grid - Minimalist */}
              <div className="mt-12 sm:mt-24 grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-5xl animate-in fade-in duration-1000 delay-100">
                <div className="group relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-[#17baa4] to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition duration-500"></div>
                  <div className="relative bg-[#0a0f1e] border border-white/10 rounded-xl p-3 sm:p-8 hover:border-[#17baa4]/50 transition-all duration-300 text-center space-y-2 sm:space-y-4 h-full flex flex-col justify-center">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto rounded-lg sm:rounded-xl bg-gradient-to-br from-[#17baa4] to-emerald-600 flex items-center justify-center">
                      <TrendingUp className="text-[#090c19] w-4 h-4 sm:w-8 sm:h-8" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xs sm:text-lg font-bold text-white">Dashboard</h3>
                    <p className="text-gray-400 text-[10px] sm:text-sm leading-relaxed">
                      Gráficos e estatísticas completas
                    </p>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-[#17baa4] to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition duration-500"></div>
                  <div className="relative bg-[#0a0f1e] border border-white/10 rounded-xl p-3 sm:p-8 hover:border-[#17baa4]/50 transition-all duration-300 text-center space-y-2 sm:space-y-4 h-full flex flex-col justify-center">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto rounded-lg sm:rounded-xl bg-gradient-to-br from-[#17baa4] to-emerald-600 flex items-center justify-center">
                      <Wallet className="text-[#090c19] w-4 h-4 sm:w-8 sm:h-8" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xs sm:text-lg font-bold text-white">Banca</h3>
                    <p className="text-gray-400 text-[10px] sm:text-sm leading-relaxed">
                      Controle total do bankroll
                    </p>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-[#17baa4] to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition duration-500"></div>
                  <div className="relative bg-[#0a0f1e] border border-white/10 rounded-xl p-3 sm:p-8 hover:border-[#17baa4]/50 transition-all duration-300 text-center space-y-2 sm:space-y-4 h-full flex flex-col justify-center">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto rounded-lg sm:rounded-xl bg-gradient-to-br from-[#17baa4] to-emerald-600 flex items-center justify-center">
                      <Upload className="text-[#090c19] w-4 h-4 sm:w-8 sm:h-8" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xs sm:text-lg font-bold text-white">Histórico</h3>
                    <p className="text-gray-400 text-[10px] sm:text-sm leading-relaxed">
                      Todas as apostas registradas
                    </p>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-[#17baa4] to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition duration-500"></div>
                  <div className="relative bg-[#0a0f1e] border border-white/10 rounded-xl p-3 sm:p-8 hover:border-[#17baa4]/50 transition-all duration-300 text-center space-y-2 sm:space-y-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto rounded-lg sm:rounded-xl bg-gradient-to-br from-[#17baa4] to-emerald-600 flex items-center justify-center">
                      <Bot className="text-[#090c19] w-4 h-4 sm:w-8 sm:h-8" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xs sm:text-lg font-bold text-white">Extras</h3>
                    <p className="text-gray-400 text-[10px] sm:text-sm leading-relaxed">
                      Bônus e cashback
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits List */}
              <div className="w-full max-w-3xl space-y-3 animate-in fade-in duration-1000 delay-200">
                <div className="flex items-center gap-3 text-gray-300 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <CheckCircle className="text-[#17baa4] flex-shrink-0" size={20} />
                  <span className="text-sm">Visualize seu desempenho com gráficos interativos e métricas de ROI</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <CheckCircle className="text-[#17baa4] flex-shrink-0" size={20} />
                  <span className="text-sm">Registre entradas, saídas e acompanhe seu saldo atualizado</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <CheckCircle className="text-[#17baa4] flex-shrink-0" size={20} />
                  <span className="text-sm">Seus dados ficam armazenados localmente com total privacidade</span>
                </div>
              </div>

              {/* CTA Section */}
              <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">


                {/* Trust Badges */}
                <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-[#17baa4]" />
                    <span>100% Gratuito</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-[#17baa4]" />
                    <span>Sem Cartão de Crédito</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-[#17baa4]" />
                    <span>Acesso Imediato</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Login/Register Forms
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
              {view === 'login' && renderLoginForm()}
              {view === 'register' && renderRegisterForm()}
              {view === 'forgotPassword' && renderForgotPasswordForm()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
