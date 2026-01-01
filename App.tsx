import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { FirestoreService } from "./services/firestoreService";
import { Page, Bet, ExtraGain, AppSettings, Bookmaker, StatusItem, PromotionItem, OriginItem, SettingsTab, User } from './types';
import { INITIAL_BOOKMAKERS, INITIAL_STATUSES, INITIAL_PROMOTIONS, INITIAL_ORIGINS } from './constants';
import Layout from './components/Layout';
import Overview from './components/Overview';
import MyBets from './components/MyBets';
import ExtraGains from './components/ExtraGains';
import Coach from './components/Coach';
import Settings from './components/Settings';
import AIAssistant from './components/AIAssistant';
import LandingPage from './components/LandingPage';

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

        // Initialize Data if needed (first login)
        await FirestoreService.initializeUserData(user.uid, {
          bookmakers: INITIAL_BOOKMAKERS,
          statuses: INITIAL_STATUSES,
          promotions: INITIAL_PROMOTIONS,
          origins: INITIAL_ORIGINS,
          settings: {
            ...DEFAULT_SETTINGS,
            username: user.username,
            email: user.email
          }
        });

        // Subscribe to Real-time Data
        let initialBetsLoaded = false;
        let initialGainsLoaded = false;
        let initialSettingsLoaded = false;

        const checkDataLoaded = () => {
          if (initialBetsLoaded && initialGainsLoaded && initialSettingsLoaded) {
            setIsLoading(false);
          }
        };

        const unsubBets = FirestoreService.subscribeToBets(user.uid, (data) => {
          setBets(data);
          if (!initialBetsLoaded) {
            initialBetsLoaded = true;
            checkDataLoaded();
          }
        });

        const unsubGains = FirestoreService.subscribeToGains(user.uid, (data) => {
          setGains(data);
          if (!initialGainsLoaded) {
            initialGainsLoaded = true;
            checkDataLoaded();
          }
        });

        const unsubSettings = FirestoreService.subscribeToSettings(user.uid, (newSettings) => {
          if (newSettings) setSettings(newSettings);
          if (!initialSettingsLoaded) {
            initialSettingsLoaded = true;
            checkDataLoaded();
          }
        });

        // Subscribe to Configurations
        const unsubBookmakers = FirestoreService.subscribeToCollection<Bookmaker>(user.uid, "bookmakers", setBookmakers);
        const unsubStatuses = FirestoreService.subscribeToCollection<StatusItem>(user.uid, "statuses", setStatuses);
        const unsubPromotions = FirestoreService.subscribeToCollection<PromotionItem>(user.uid, "promotions", setPromotions);
        const unsubOrigins = FirestoreService.subscribeToCollection<OriginItem>(user.uid, "origins", setOrigins);

        // Cleanup subscriptions on logout/unmount
        return () => {
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
  if (isLoading) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">Carregando...</div>;
  }

  if (!isLoggedIn) {
    return <LandingPage onLogin={() => { }} />; // LandingPage handles auth internally now via Firebase
  }

  return (
    <Layout
      activePage={activePage}
      onNavigate={handleNavigate}
      settings={settings}
      setSettings={setSettings} // This will need to be updated to save to Firestore
      onLogout={handleLogout}
    >
      {activePage === Page.OVERVIEW && <Overview bets={bets} gains={gains} settings={settings} setSettings={setSettings} bookmakers={bookmakers} />}

      {activePage === Page.BETS && (
        <MyBets
          bets={bets}
          setBets={setBets} // This will need to be updated to save to Firestore
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
          setGains={setGains} // This will need to be updated to save to Firestore
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
  );
};

export default App;
