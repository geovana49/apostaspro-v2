
import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, LayoutDashboard, Ticket, DollarSign, Bot, Settings, TrendingUp, User, LogOut, ChevronRight, X,
  ArrowUp, ArrowDown, Cloud, CloudOff, RefreshCw
} from 'lucide-react';
import { Page, AppSettings, SettingsTab } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: Page;
  onNavigate: (page: Page, tab?: SettingsTab) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; // Add setSettings prop
  onLogout: () => void;
  isOnline: boolean;
  isSyncing: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, settings, setSettings, onLogout, isOnline, isSyncing }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Refs for profile menu
  const profileButtonRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Scroll Logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showBottomBtn, setShowBottomBtn] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle inactivity to hide FABs
  useEffect(() => {
    const handleActivity = () => {
      setIsFabVisible(true);

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        setIsFabVisible(false);
      }, 6000); // 6 seconds
    };

    // Events to detect activity
    const events = ['scroll', 'wheel', 'touchmove', 'mousemove', 'mousedown', 'keydown', 'click'];

    // Attach listeners
    events.forEach(event => {
      // Use capture for scroll to detect scrolling in nested elements
      const options = event === 'scroll' ? { capture: true } : undefined;
      window.addEventListener(event, handleActivity, options);
    });

    // Initial timer
    handleActivity();

    return () => {
      events.forEach(event => {
        const options = event === 'scroll' ? { capture: true } : undefined;
        window.removeEventListener(event, handleActivity, options);
      });

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // Click outside for profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isProfileMenuOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);


  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    // Show Top button if scrolled down more than 300px
    setShowTopBtn(scrollTop > 300);

    // Show Bottom button if there is more than 100px of content below
    setShowBottomBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  // Check scroll state on mount/resize/content change
  useEffect(() => {
    const checkScroll = () => handleScroll();
    // Short delay to ensure content is rendered
    const t = setTimeout(checkScroll, 500);
    window.addEventListener('resize', checkScroll);
    return () => {
      window.removeEventListener('resize', checkScroll);
      clearTimeout(t);
    };
  }, [children, activePage]);

  const navItems = [
    { id: Page.OVERVIEW, label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: Page.BETS, label: 'Minhas Apostas', icon: <Ticket size={20} /> },
    { id: Page.GAINS, label: 'Ganhos Extras', icon: <DollarSign size={20} /> },
    { id: Page.SETTINGS, label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  const getPageTitle = (page: Page) => {
    switch (page) {
      case Page.OVERVIEW: return 'Visão Geral';
      case Page.BETS: return 'Minhas Apostas';
      case Page.GAINS: return 'Ganhos Extras';
      case Page.COACH: return 'Coach';
      case Page.SETTINGS: return 'Ajustes';
      default: return 'ApostasPro';
    }
  }

  return (
    <div className="min-h-screen bg-[#090c19] text-textMain flex overflow-hidden selection:bg-primary/20 font-sans">

      {/* Background Subtle Gradient - Deep Blue Theme */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#151b2e]/40 via-[#090c19] to-[#090c19] pointer-events-none" />

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Professional Dark Style */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-[#05070e] border-r border-white/5 flex flex-col transform transition-transform duration-300 ease-out shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button for mobile */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-1.5 rounded-full bg-white/5 hover:bg-white/10 lg:hidden z-10"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>

        {/* Header / Logo */}
        <div className="p-8 pb-10">
          <div className="flex items-center gap-4">
            {/* Logo Icon - Green Square with Arrow */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17baa4] to-[#10b981] flex items-center justify-center shadow-[0_0_15px_rgba(23,186,164,0.4)] shrink-0 group cursor-pointer hover:scale-105 transition-transform duration-300">
              <TrendingUp className="text-[#05070e] group-hover:rotate-12 transition-transform duration-500" size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">Apostas<span className="text-primary">Pro</span></h1>
              <p className="text-[10px] text-gray-500 font-bold tracking-[0.15em] uppercase mt-1">Gestão Profissional</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden
                  ${isActive
                    ? 'text-white bg-white/[0.03]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {/* Active Indicator - Neon Bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-r-full shadow-[0_0_12px_#17baa4]" />
                )}

                <span className={`
                  relative z-10 transition-all duration-300
                  ${isActive ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(23,186,164,0.5)]' : 'group-hover:text-white group-hover:scale-105'}
                `}>
                  {item.icon}
                </span>

                <span className="relative z-10 tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile Card - New Design */}
        <div className="p-4 mt-auto pb-6">
          <div className="bg-[#0d1017] border border-white/5 rounded-[32px] p-6 shadow-xl relative overflow-hidden">
            {/* Profile Row */}
            <div
              className="flex items-center gap-4 mb-8 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(Page.SETTINGS, 'general');
                setIsSidebarOpen(false);
              }}
            >
              {/* Avatar with Teal Outline */}
              <div className="w-12 h-12 rounded-full border-[1.5px] border-[#17baa4] flex items-center justify-center shrink-0 bg-transparent shadow-[0_0_10px_rgba(23,186,164,0.2)] overflow-hidden">
                {settings.profileImage ? (
                  <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="text-gray-400 group-hover:text-white transition-colors" size={22} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white leading-none mb-1 group-hover:text-primary transition-colors truncate">{settings.username || 'Usuário'}</p>
                <p className="text-xs text-gray-500 font-medium truncate">Bem-vindo(a)!</p>
              </div>

              <ChevronRight className="text-[#17baa4]" size={18} />
            </div>

            {/* Logout Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group/logout"
            >
              <LogOut size={16} className="group-hover/logout:-translate-x-1 transition-transform" />
              <span>SAIR</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">

        {/* Top Header - Optimized for Mobile */}
        <header className="h-16 flex items-center justify-between gap-2 px-3 sm:px-5 sticky top-0 z-30 bg-[#090c19] border-b border-white/5 lg:border-none shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-white hover:text-primary transition-colors p-1 -ml-1 lg:hidden shrink-0"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{getPageTitle(activePage)}</h2>

            {/* Sync / Offline Status Indicator - Labels hidden on small mobile */}
            <div
              className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-white/5 border border-white/5 animate-in fade-in transition-all cursor-pointer hover:bg-white/10 active:scale-95 shrink-0"
              onClick={() => {
                if (confirm("Deseja recarregar a página para forçar uma sincronização?")) {
                  window.location.reload();
                }
              }}
              title="Clique para recarregar e forçar sincronização"
            >
              {!isOnline ? (
                <>
                  <CloudOff size={14} className="text-danger" />
                  <span className="text-[10px] font-bold text-danger uppercase tracking-wider hidden sm:inline">Offline</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw size={14} className="text-primary animate-spin" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider hidden sm:inline">Sincronizando...</span>
                </>
              ) : (
                <>
                  <Cloud size={14} className="text-primary/60" />
                  <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider hidden sm:inline">Sincronizado</span>
                </>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Profile Badge (Top Right) */}
            {settings.showProfileInHeader && (
              <div className="relative">
                <div
                  ref={profileButtonRef}
                  className="flex items-center gap-3 bg-[#151b2e] border border-white/10 rounded-full p-1.5 pr-4 shadow-sm hover:border-white/20 transition-colors cursor-pointer group"
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                >
                  <div className="w-8 h-8 rounded-full bg-[#0d1121] flex items-center justify-center border border-white/5 overflow-hidden">
                    {settings.profileImage ? (
                      <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={14} className="text-gray-400 group-hover:text-white" />
                    )}
                  </div>
                  {settings.showUsername && (
                    <span className="text-sm font-bold text-white">{settings.username || 'Usuário'}</span>
                  )}
                </div>

                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div
                    ref={profileMenuRef}
                    className="absolute top-full right-0 mt-3 w-56 bg-[#1c2438] border border-white/10 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-3 p-2 border-b border-white/5 mb-2">
                      <div className="w-9 h-9 rounded-full bg-[#0d1121] flex items-center justify-center border border-white/5 overflow-hidden">
                        {settings.profileImage ? (
                          <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{settings.username || 'Usuário'}</p>
                        <p className="text-xs text-gray-500 truncate">{settings.email || ''}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate(Page.SETTINGS, 'general');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-md transition-colors"
                    >
                      <Settings size={16} />
                      <span>Meu Perfil</span>
                    </button>

                    <div className="h-px bg-white/5 my-1" />

                    <button
                      onClick={() => {
                        onLogout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-danger/10 hover:text-danger rounded-md transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth relative"
        >
          <div className="max-w-6xl mx-auto pb-20 space-y-8">
            {children}
          </div>

          {/* Floating Scroll Buttons */}
          <div className={`fixed bottom-6 right-6 z-50 flex flex-col gap-3 transition-all duration-500 ${isFabVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
            {/* Scroll Top Button */}
            {showTopBtn && (
              <button
                onClick={scrollToTop}
                className="pointer-events-auto p-3 rounded-full bg-primary text-[#090c19] shadow-lg shadow-primary/20 hover:scale-110 hover:shadow-primary/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                title="Voltar ao topo"
              >
                <ArrowUp size={20} strokeWidth={3} />
              </button>
            )}

            {showBottomBtn && (
              <button
                onClick={scrollToBottom}
                className="pointer-events-auto p-3 rounded-full bg-[#151b2e] border border-white/10 text-white shadow-lg hover:scale-110 hover:bg-white/5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                title="Ir para o final"
              >
                <ArrowDown size={20} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
