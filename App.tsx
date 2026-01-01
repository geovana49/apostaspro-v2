import React, { useState, useEffect, Suspense } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { FirestoreService } from "./services/firestoreService";
import { Page, Bet, ExtraGain, AppSettings, Bookmaker, StatusItem, PromotionItem, OriginItem, SettingsTab, User } from './types';
import { INITIAL_BOOKMAKERS, INITIAL_STATUSES, INITIAL_PROMOTIONS, INITIAL_ORIGINS } from './constants';
import Layout from './components/Layout';
import { Loader2, AlertCircle } from 'lucide-react';

// Standard imports for stability (removing lazy for now)
import Overview from './components/Overview';
import MyBets from './components/MyBets';
import ExtraGains from './components/ExtraGains';
import Coach from './components/Coach';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';

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

  // Current User
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Global Error Listener
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setErrorMessage(`Error: ${event.message} at ${event.filename}:${event.lineno}`);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

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
              console.warn("Loading timeout reached. Forcing app to show.");
              return false;
            }
            return prev;
          });
        }, 8000); // 8 seconds timeout

        const unsubBets = FirestoreService.subscribeToBets(user.uid, (data) => {
          setBets(data);
          if (!initialBetsLoaded) {
            initialBetsLoaded = true;
            checkDataLoaded("Bets");
          }
        }, (err) => console.error("Error subscribing to bets:", err));

        const unsubGains = FirestoreService.subscribeToGains(user.uid, (data) => {
          setGains(data);
          if (!initialGainsLoaded) {
            initialGainsLoaded = true;
            checkDataLoaded("Gains");
          }
        }, (err) => console.error("Error subscribing to gains:", err));

        const unsubSettings = FirestoreService.subscribeToSettings(user.uid, (newSettings) => {
          if (newSettings) setSettings(newSettings);
          if (!initialSettingsLoaded) {
            initialSettingsLoaded = true;
            checkDataLoaded("Settings");
          }
        }, (err) => console.error("Error subscribing to settings:", err));

        // Subscribe to Configurations (Non-blocking for isLoading)
        const unsubBookmakers = FirestoreService.subscribeToCollection<Bookmaker>(user.uid, "bookmakers", setBookmakers, (err) => console.error("Error subscribing to bookmakers:", err));
        const unsubStatuses = FirestoreService.subscribeToCollection<StatusItem>(user.uid, "statuses", setStatuses, (err) => console.error("Error subscribing to statuses:", err));
        const unsubPromotions = FirestoreService.subscribeToCollection<PromotionItem>(user.uid, "promotions", setPromotions, (err) => console.error("Error subscribing to promotions:", err));
        const unsubOrigins = FirestoreService.subscribeToCollection<OriginItem>(user.uid, "origins", setOrigins, (err) => console.error("Error subscribing to origins:", err));

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

  // Render
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white p-6 text-center">
        <AlertCircle size={48} className="text-danger mb-4" />
        <h1 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h1>
        <p className="text-gray-400 text-sm max-w-md">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-primary text-background rounded-lg font-bold"
        >
          Recarregar App
        </button>
      </div>
    );
  }

  return (
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
        >

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
        </Layout>
      )}
    </div>
  );
};

export default App;
