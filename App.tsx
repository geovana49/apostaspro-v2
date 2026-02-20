import React, { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { FirestoreService } from "./services/firestoreService";
import { Page, Bet, ExtraGain, AppSettings, Bookmaker, StatusItem, PromotionItem, OriginItem, SettingsTab, User, CaixaAccount, CaixaMovement, CaixaCategory } from './types';
import { INITIAL_BOOKMAKERS, INITIAL_STATUSES, INITIAL_PROMOTIONS, INITIAL_ORIGINS } from './constants';
import Layout from './components/Layout';
import { Loader2, AlertCircle } from 'lucide-react';

// Lazy load components for code splitting
const Overview = lazy(() => import('./components/Overview'));
const MyBets = lazy(() => import('./components/MyBets'));
const ExtraGains = lazy(() => import('./components/ExtraGains'));
const Coach = lazy(() => import('./components/Coach'));
const Settings = lazy(() => import('./components/Settings'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const Calculators = lazy(() => import('./components/Calculators'));
const Caixa = lazy(() => import('./components/Caixa'));

// A simplified loading component for page transitions
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center p-12">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
  </div>
);

const DEFAULT_SETTINGS: AppSettings = {
  showProfileInHeader: true,
  showUsername: true,
  themeColor: '#020617',
  username: undefined,
  email: undefined,
  extraGainsFilterPosition: 'below_toolbar',
  privacyMode: false
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState<Page>(Page.OVERVIEW);
  const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsTab>('general');

  // -- Data State --
  const [bets, setBets] = useState<Bet[]>([]);
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [origins, setOrigins] = useState<OriginItem[]>([]);
  const [gains, setGains] = useState<ExtraGain[]>([]);
  const [caixaAccounts, setCaixaAccounts] = useState<CaixaAccount[]>([]);
  const [caixaMovements, setCaixaMovements] = useState<CaixaMovement[]>([]);
  const [caixaCategories, setCaixaCategories] = useState<CaixaCategory[]>([]);

  // Current User
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -- Offline/Sync State --
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Global Online/Offline Listener
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setErrorMessage(`Error: ${event.message} at ${event.filename}:${event.lineno}`);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('error', handleError);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleForceSync = async () => {
    if (confirm("Isso irá recarregar a página e limpar o cache local para forçar uma nova sincronização com a nuvem. Deseja continuar?")) {
      await FirestoreService.clearLocalCache();
    }
  };

  // --- Auth & Data Synchronization ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const user: User = {
          uid: firebaseUser.uid,
          username: firebaseUser.displayName || 'Usuário',
          email: firebaseUser.email || '',
        };
        console.info("[Auth] Usuário logado:", user.uid, user.email);
        setCurrentUser(user);
        setIsLoggedIn(true);

        // Initialize Data asynchronously in the background
        FirestoreService.initializeUserData(user.uid, {
          bookmakers: INITIAL_BOOKMAKERS,
          statuses: INITIAL_STATUSES,
          promotions: INITIAL_PROMOTIONS,
          origins: INITIAL_ORIGINS,
          settings: {
            ...DEFAULT_SETTINGS,
            username: user.username,
            email: user.email
          }
        }).catch(err => console.error("Initialization error:", err));

        // Subscribe to Real-time Data
        let initialBetsLoaded = false;
        let initialGainsLoaded = false;
        let initialSettingsLoaded = false;

        const checkDataLoaded = (source: string) => {
          console.log(`Snapshot received from: ${source}`);
          if (initialBetsLoaded && initialGainsLoaded && initialSettingsLoaded) {
            console.log("All essential initial data loaded. Hiding loading screen.");
            setIsLoading(false);
          }
        };

        // Subscription Timeout (Safety Net)
        const loadingTimeout = setTimeout(() => {
          setIsLoading(prev => {
            if (prev) {
              console.warn("[Firestore] Loading timeout reached (8s). Forçando exibição.");
              return false;
            }
            return prev;
          });
        }, 8000); // 8 seconds timeout


        const syncStates = {
          bets: false,
          gains: false,
          settings: false,
          bookmakers: false,
          statuses: false,
          promotions: false,
          origins: false,
          caixaAccounts: false,
          caixaMovements: false,
          caixaCategories: false,
          manual: false
        };

        const updateSyncStatus = (source: keyof typeof syncStates, val: boolean) => {
          syncStates[source] = val;
          const isAnythingSyncing = Object.values(syncStates).some(v => v === true);
          setIsSyncing(isAnythingSyncing);
          if (val) console.debug(`[Sync] Ativado por: ${source}`);
        };

        // Expose manual sync trigger for components
        (window as any).setManualSyncing = (val: boolean) => updateSyncStatus('manual', val);

        console.log("[Firestore] Iniciando ouvintes (onSnapshot)...");

        const unsubBets = FirestoreService.subscribeToBets(user.uid, (data, syncing) => {
          console.log(`[Snapshot] Bets recebidas: ${data.length} itens.`);
          setBets(data);
          updateSyncStatus('bets', syncing);
          if (!initialBetsLoaded) {
            initialBetsLoaded = true;
            checkDataLoaded("Bets");
          }
        }, (err) => console.error("Error subscribing to bets:", err));

        const unsubGains = FirestoreService.subscribeToGains(user.uid, (data, syncing) => {
          console.log(`[Snapshot] Gains recebidas: ${data.length} itens.`);
          setGains(data);
          updateSyncStatus('gains', syncing);
          if (!initialGainsLoaded) {
            initialGainsLoaded = true;
            checkDataLoaded("Gains");
          }
        }, (err) => console.error("Error subscribing to gains:", err));

        const unsubSettings = FirestoreService.subscribeToSettings(user.uid, (newSettings, syncing) => {
          if (newSettings) {
            console.log(`[Snapshot] Settings recebidas.`);
            setSettings(newSettings);
          }
          updateSyncStatus('settings', syncing);
          if (!initialSettingsLoaded) {
            initialSettingsLoaded = true;
            checkDataLoaded("Settings");
          }
        }, (err) => console.error("Error subscribing to settings:", err));

        // Subscribe to Configurations (Non-blocking for isLoading)
        const unsubBookmakers = FirestoreService.subscribeToCollection<Bookmaker>(user.uid, "bookmakers", (data, syncing) => {
          console.log(`[Snapshot] Bookmakers: ${data.length}`);
          setBookmakers(data);
          updateSyncStatus('bookmakers', syncing);
        }, (err) => console.error("Error subscribing to bookmakers:", err));

        const unsubStatuses = FirestoreService.subscribeToCollection<StatusItem>(user.uid, "statuses", (data, syncing) => {
          console.log(`[Snapshot] Statuses: ${data.length}`);
          setStatuses(data);
          updateSyncStatus('statuses', syncing);
        }, (err) => console.error("Error subscribing to statuses:", err));

        const unsubPromotions = FirestoreService.subscribeToCollection<PromotionItem>(user.uid, "promotions", (data, syncing) => {
          console.log(`[Snapshot] Promotions: ${data.length}`);
          setPromotions(data);
          updateSyncStatus('promotions', syncing);
        }, (err) => console.error("Error subscribing to promotions:", err));

        const unsubOrigins = FirestoreService.subscribeToCollection<OriginItem>(user.uid, "origins", (data, syncing) => {
          console.log(`[Snapshot] Origins: ${data.length}`);
          setOrigins(data);
          updateSyncStatus('origins', syncing);
        }, (err) => console.error("Error subscribing to origins:", err));

        const unsubCaixaAccounts = FirestoreService.subscribeToCaixaAccounts(user.uid, (data, syncing) => {
          console.log(`[Snapshot] Caixa Accounts: ${data.length}`);
          setCaixaAccounts(data);
          updateSyncStatus('caixaAccounts', syncing);
        });

        const unsubCaixaMovements = FirestoreService.subscribeToCaixaMovements(user.uid, (data, syncing) => {
          console.log(`[Snapshot] Caixa Movements: ${data.length}`);
          setCaixaMovements(data);
          updateSyncStatus('caixaMovements', syncing);
        });

        const unsubCaixaCategories = FirestoreService.subscribeToCollection<CaixaCategory>(user.uid, "caixa_categories", (data, syncing) => {
          console.log(`[Snapshot] Caixa Categories: ${data.length}`);
          setCaixaCategories(data);
          updateSyncStatus('caixaCategories', syncing);
        });

        // Cleanup subscriptions on logout/unmount
        return () => {
          clearTimeout(loadingTimeout);
          unsubBets();
          unsubGains();
          unsubSettings();
          unsubBookmakers();
          unsubStatuses();
          unsubPromotions();
          unsubOrigins();
          unsubCaixaAccounts();
          unsubCaixaMovements();
          unsubCaixaCategories();
        };
      } else {
        // User is signed out
        setCurrentUser(null);
        setIsLoggedIn(false);
        setBets([]);
        setGains([]);
        setBookmakers(INITIAL_BOOKMAKERS);
        setStatuses(INITIAL_STATUSES);
        setPromotions(INITIAL_PROMOTIONS);
        setOrigins(INITIAL_ORIGINS);
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleNavigate = (page: Page, tab?: SettingsTab) => {
    setActivePage(page);
    if (page === Page.SETTINGS && tab) {
      setInitialSettingsTab(tab);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const handleFactoryReset = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      await FirestoreService.factoryReset(currentUser.uid);
      window.location.reload();
    } catch (error) {
      console.error("Error resetting data:", error);
      alert("Erro ao resetar dados. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleForceEmergencyReset = async () => {
    if (confirm("ATENÇÃO: Isso irá deslogar você, limpar todo o cache local e forçar o app a baixar tudo da nuvem novamente. Nenhum dado salvo na nuvem será perdido. Deseja continuar?")) {
      try {
        setIsResetting(true);
        console.warn("Iniciando Emergency Reset...");

        // Limpeza imediata de dados locais simples
        localStorage.clear();
        sessionStorage.clear();
        console.log("LocalStorage e SessionStorage limpos.");

        // Clear IndexedDB (Firestore) - Esta parte pode travar
        await FirestoreService.clearLocalCache();

        // Try to clear Service Workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }

        window.location.reload();
      } catch (err) {
        console.error("Erro no Emergency Reset:", err);
        alert("Erro ao limpar dados. O app será recarregado para tentar recuperar.");
        window.location.reload();
      }
    }
  };

  // Render
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white p-6 text-center">
        <AlertCircle size={48} className="text-danger mb-4" />
        <h1 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h1>
        <p className="text-gray-400 text-sm max-w-md">{errorMessage}</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-background rounded-lg font-bold"
          >
            Recarregar App
          </button>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-6 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            Ignorar e Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">Carregando...</div>}>
      <div className="min-h-screen bg-[#090c19]">
        {isLoading ? (
          <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">Carregando...</div>
        ) : !isLoggedIn ? (
          <LandingPage onLogin={(user) => { setCurrentUser(user); setIsLoggedIn(true); }} />
        ) : (
          <Layout
            activePage={activePage}
            onNavigate={handleNavigate}
            settings={settings}
            setSettings={setSettings}
            onLogout={handleLogout}
            isOnline={isOnline}
            isSyncing={isSyncing}
            onForceSync={handleForceSync}
          >
            <Suspense fallback={<PageLoader />}>
              {activePage === Page.OVERVIEW && <Overview bets={bets} gains={gains} settings={settings} setSettings={setSettings} bookmakers={bookmakers} />}

              {activePage === Page.BETS && (
                <MyBets
                  bets={bets}
                  setBets={setBets}
                  bookmakers={bookmakers}
                  statuses={statuses}
                  promotions={promotions}
                  settings={settings}
                  setSettings={setSettings}
                  currentUser={currentUser}
                />
              )}

              {activePage === Page.GAINS && (
                <ExtraGains
                  gains={gains}
                  setGains={setGains}
                  origins={origins}
                  setOrigins={setOrigins}
                  bookmakers={bookmakers}
                  statuses={statuses}
                  setStatuses={setStatuses}
                  promotions={promotions}
                  appSettings={settings}
                  setSettings={setSettings}
                  currentUser={currentUser}
                />
              )}

              {activePage === Page.COACH && (
                <Coach
                  bets={bets}
                  gains={gains}
                  bookmakers={bookmakers}
                  statuses={statuses}
                />
              )}

              {activePage === Page.SETTINGS && (
                <Settings
                  bookmakers={bookmakers}
                  setBookmakers={setBookmakers}
                  statuses={statuses}
                  setStatuses={setStatuses}
                  promotions={promotions}
                  setPromotions={setPromotions}
                  origins={origins}
                  setOrigins={setOrigins}
                  appSettings={settings}
                  setAppSettings={setSettings}
                  initialTab={initialSettingsTab}
                  onFactoryReset={handleFactoryReset}
                  currentUser={currentUser}
                />
              )}

              {activePage === Page.CALCULATORS && (
                <Calculators
                  currentUser={currentUser}
                  bookmakers={bookmakers}
                  statuses={statuses}
                  promotions={promotions}
                />
              )}

              {activePage === Page.CAIXA && (
                <Caixa
                  currentUser={currentUser}
                  accounts={caixaAccounts}
                  movements={caixaMovements}
                  bookmakers={bookmakers}
                  categories={caixaCategories}
                  settings={settings}
                />
              )}
            </Suspense>
          </Layout>
        )}
      </div>
    </Suspense>
  );
};

export default App;
