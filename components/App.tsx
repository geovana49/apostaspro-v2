import React, { useState, useEffect, useRef } from 'react';
import { Page, Bet, ExtraGain, AppSettings, Bookmaker, StatusItem, PromotionItem, OriginItem, SettingsTab, User } from './types';
import { INITIAL_BOOKMAKERS, INITIAL_STATUSES, INITIAL_PROMOTIONS, INITIAL_ORIGINS } from './constants';
import Layout from './components/Layout';
import Overview from './components/Overview';
import MyBets from './components/MyBets';
import ExtraGains from './components/ExtraGains';
import Coach from './components/Coach';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';

// Firebase Imports
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FirestoreService } from './services/firestoreService';

const DEFAULT_SETTINGS: AppSettings = {
  showProfileInHeader: true,
  showUsername: true,
  themeColor: '#020617',
  username: undefined,
  email: undefined,
  extraGainsFilterPosition: 'below_toolbar',
  privacyMode: false
};

// Helper to safely stringify objects with circular references
const safeStringify = (obj: any) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.add(value);
    }
    return value;
  });
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

  // Sync & Connection State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Current User
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- Connection Monitor ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleForceSync = async () => {
    if (confirm("Isso irá recarregar a página e limpar o cache local para forçar uma nova sincronização com a nuvem. Deseja continuar?")) {
      await FirestoreService.clearLocalCache();
    }
  };

  // --- Auth & Real-time Data Listeners ---
  useEffect(() => {
    let unsubStats: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          uid: firebaseUser.uid,
          username: firebaseUser.displayName || 'Usuário',
          email: firebaseUser.email || ''
        };
        setCurrentUser(userData);
        setIsLoggedIn(true);

        const syncStates = {
          bets: false,
          gains: false,
          settings: false,
          bookmakers: false,
          statuses: false,
          promotions: false,
          origins: false,
          manual: false
        };

        const updateSyncStatus = (source: keyof typeof syncStates, val: boolean) => {
          syncStates[source] = val;
          const isAnythingSyncing = Object.values(syncStates).some(v => v === true);
          setIsSyncing(isAnythingSyncing);
        };

        // --- Real-time Subscriptions ---
        // 1. Listen for Bets
        const unsubBets = FirestoreService.subscribeToBets(firebaseUser.uid, (data, syncing) => {
          setBets(data);
          updateSyncStatus('bets', syncing);
        });

        // 2. Listen for Extra Gains
        const unsubGains = FirestoreService.subscribeToGains(firebaseUser.uid, (data, syncing) => {
          setGains(data);
          updateSyncStatus('gains', syncing);
        });

        // 3. Listen for Settings
        const unsubSettings = FirestoreService.subscribeToSettings(firebaseUser.uid, (data, syncing) => {
          if (data) {
            setSettings(prev => ({
              ...DEFAULT_SETTINGS,
              ...data,
              email: firebaseUser.email || prev.email,
              username: firebaseUser.displayName || prev.username
            }));
          }
          updateSyncStatus('settings', syncing);
        });

        // 4. Listen for Basic Configurations
        const unsubBooks = FirestoreService.subscribeToCollection<Bookmaker>(firebaseUser.uid, "bookmakers", (data, syncing) => {
          setBookmakers(data);
          updateSyncStatus('bookmakers', syncing);
        });
        const unsubStatus = FirestoreService.subscribeToCollection<StatusItem>(firebaseUser.uid, "statuses", (data, syncing) => {
          setStatuses(data);
          updateSyncStatus('statuses', syncing);
        });
        const unsubPromos = FirestoreService.subscribeToCollection<PromotionItem>(firebaseUser.uid, "promotions", (data, syncing) => {
          setPromotions(data);
          updateSyncStatus('promotions', syncing);
        });
        const unsubOrigins = FirestoreService.subscribeToCollection<OriginItem>(firebaseUser.uid, "origins", (data, syncing) => {
          setOrigins(data);
          updateSyncStatus('origins', syncing);
        });

        unsubStats = [unsubBets, unsubGains, unsubSettings, unsubBooks, unsubStatus, unsubPromos, unsubOrigins];
        setIsDataLoaded(true);

        // Verify/Initialize defaults if needed
        FirestoreService.initializeUserData(firebaseUser.uid, {
          bookmakers: INITIAL_BOOKMAKERS,
          statuses: INITIAL_STATUSES,
          promotions: INITIAL_PROMOTIONS,
          origins: INITIAL_ORIGINS,
          settings: DEFAULT_SETTINGS
        });

      } else {
        // User is signed out - Cleanup
        setIsLoggedIn(false);
        setCurrentUser(null);
        setBets([]);
        setGains([]);
        setIsDataLoaded(false);
        unsubStats.forEach(unsub => unsub());
      }
    });

    return () => {
      unsubscribeAuth();
      unsubStats.forEach(unsub => unsub());
    };
  }, []); // Run once on mount


  const handleNavigate = (page: Page, tab?: SettingsTab) => {
    setActivePage(page);
    if (page === Page.SETTINGS && tab) {
      setInitialSettingsTab(tab);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleFactoryReset = () => {
    setBets([]);
    setGains([]);
    setBookmakers(INITIAL_BOOKMAKERS);
    setStatuses(INITIAL_STATUSES);
    setPromotions(INITIAL_PROMOTIONS);
    setOrigins(INITIAL_ORIGINS);
    setSettings(DEFAULT_SETTINGS);
  };

  if (!isLoggedIn) {
    return <LandingPage />;
  }

  return (
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
      {activePage === Page.OVERVIEW && <Overview bets={bets} gains={gains} settings={settings} setSettings={setSettings} />}

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
  );
};

export default App;