
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

// --- Local Storage Persistence ---
const STORAGE_KEY = 'apostaspro_data';

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
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- Debounce Save & Sync Refs ---
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load data from LocalStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setBets(parsedData.bets || []);
        setGains(parsedData.gains || []);
        setBookmakers(parsedData.bookmakers || INITIAL_BOOKMAKERS);
        setStatuses(parsedData.statuses || INITIAL_STATUSES);
        setPromotions(parsedData.promotions || INITIAL_PROMOTIONS);
        setOrigins(parsedData.origins || INITIAL_ORIGINS);
        setSettings(parsedData.settings || DEFAULT_SETTINGS);

        // Mock User Login
        if (parsedData.user) {
          setCurrentUser(parsedData.user);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.error("Erro ao carregar dados locais:", e);
      }
    } else {
      // Initialize defaults if no data
      setBookmakers(INITIAL_BOOKMAKERS);
      setStatuses(INITIAL_STATUSES);
      setPromotions(INITIAL_PROMOTIONS);
      setOrigins(INITIAL_ORIGINS);
      setSettings(DEFAULT_SETTINGS);
    }
    setIsDataLoaded(true);
  }, []);

  // Save data to LocalStorage whenever state changes
  useEffect(() => {
    if (!isDataLoaded) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const dataToSave = {
        bets,
        gains,
        bookmakers,
        statuses,
        promotions,
        origins,
        settings,
        user: currentUser, // Persist user session
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log("Dados salvos localmente!");
    }, 1000); // Debounce 1s

  }, [bets, gains, bookmakers, statuses, promotions, origins, settings, currentUser, isDataLoaded]);


  const handleNavigate = (page: Page, tab?: SettingsTab) => {
    setActivePage(page);
    if (page === Page.SETTINGS && tab) {
      setInitialSettingsTab(tab);
    }
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    // Optional: Clear storage on logout if desired, or keep it.
    // localStorage.removeItem(STORAGE_KEY);
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

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  // Render
  if (!isLoggedIn) {
    return <LandingPage onLogin={handleLogin} />;
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
        />
      )}
    </Layout>
  );
};

export default App;
