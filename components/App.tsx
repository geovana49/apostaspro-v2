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

  // Current User
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- Debounce Save & Sync Refs ---
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep track of current state in ref for comparison in onSnapshot without dependency issues
  const stateRef = useRef({ bets, gains, bookmakers, statuses, promotions, origins, settings });

  useEffect(() => {
    stateRef.current = { bets, gains, bookmakers, statuses, promotions, origins, settings };
  }, [bets, gains, bookmakers, statuses, promotions, origins, settings]);

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

        // --- Real-time Subscriptions ---
        // 1. Listen for Bets
        const unsubBets = FirestoreService.subscribeToBets(firebaseUser.uid, (data) => {
          setBets(data);
        });

        // 2. Listen for Extra Gains
        const unsubGains = FirestoreService.subscribeToGains(firebaseUser.uid, (data) => {
          setGains(data);
        });

        // 3. Listen for Settings
        const unsubSettings = FirestoreService.subscribeToSettings(firebaseUser.uid, (data) => {
          if (data) {
            setSettings(prev => ({
              ...DEFAULT_SETTINGS,
              ...data,
              email: firebaseUser.email || prev.email,
              username: firebaseUser.displayName || prev.username
            }));
          }
        });

        // 4. Listen for Basic Configurations
        const unsubBooks = FirestoreService.subscribeToCollection<Bookmaker>(firebaseUser.uid, "bookmakers", setBookmakers);
        const unsubStatus = FirestoreService.subscribeToCollection<StatusItem>(firebaseUser.uid, "statuses", setStatuses);
        const unsubPromos = FirestoreService.subscribeToCollection<PromotionItem>(firebaseUser.uid, "promotions", setPromotions);
        const unsubOrigins = FirestoreService.subscribeToCollection<OriginItem>(firebaseUser.uid, "origins", setOrigins);

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