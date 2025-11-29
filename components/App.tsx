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
import { doc, onSnapshot, setDoc } from "firebase/firestore";

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
  const isRemoteUpdate = useRef(false);
  // Keep track of current state in ref for comparison in onSnapshot without dependency issues
  const stateRef = useRef({ bets, gains, bookmakers, statuses, promotions, origins, settings });

  useEffect(() => {
    stateRef.current = { bets, gains, bookmakers, statuses, promotions, origins, settings };
  }, [bets, gains, bookmakers, statuses, promotions, origins, settings]);

  // --- Auth Listener & Real-time Sync ---
  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in
            const userData: User = {
                uid: firebaseUser.uid,
                username: firebaseUser.displayName || 'Usuário',
                email: firebaseUser.email || ''
            };
            setCurrentUser(userData);
            setIsLoggedIn(true);

            // Setup Real-time Listener
            const userDocRef = doc(db, "users", firebaseUser.uid);
            unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                // Ignore local writes to prevent immediate loops (latency compensation)
                if (docSnap.metadata.hasPendingWrites) return;

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const newState = {
                        bets: data.bets || [],
                        gains: data.gains || [],
                        bookmakers: data.bookmakers || INITIAL_BOOKMAKERS,
                        statuses: data.statuses || INITIAL_STATUSES,
                        promotions: data.promotions || INITIAL_PROMOTIONS,
                        origins: data.origins || INITIAL_ORIGINS,
                        settings: data.settings ? { ...DEFAULT_SETTINGS, ...data.settings, email: firebaseUser.email, username: firebaseUser.displayName } : { ...DEFAULT_SETTINGS, email: firebaseUser.email, username: firebaseUser.displayName }
                    };
                    
                    const currentStateStr = safeStringify(stateRef.current);
                    const newStateStr = safeStringify(newState);

                    if (currentStateStr !== newStateStr) {
                        isRemoteUpdate.current = true;
                        
                        setBets(newState.bets);
                        setGains(newState.gains);
                        setBookmakers(newState.bookmakers);
                        setStatuses(newState.statuses);
                        setPromotions(newState.promotions);
                        setOrigins(newState.origins);
                        setSettings(newState.settings);
                        
                        setIsDataLoaded(true);
                    } else if (!isDataLoaded) {
                         setIsDataLoaded(true);
                    }
                } else {
                    // New User -> Initialize defaults
                    if (!isDataLoaded) {
                        setBookmakers(INITIAL_BOOKMAKERS);
                        setStatuses(INITIAL_STATUSES);
                        setPromotions(INITIAL_PROMOTIONS);
                        setOrigins(INITIAL_ORIGINS);
                        setSettings({ ...DEFAULT_SETTINGS, email: firebaseUser.email, username: firebaseUser.displayName });
                        setIsDataLoaded(true);
                    }
                }
            }, (error) => {
                console.error("Erro na sincronização:", error);
            });

        } else {
            // User is signed out
            setIsLoggedIn(false);
            setCurrentUser(null);
            setBets([]);
            setGains([]);
            setSettings(DEFAULT_SETTINGS);
            setIsDataLoaded(false);
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []); // Run once on mount

  // --- Auto-Save Logic ---
  const saveDataToFirestore = () => {
      if (!currentUser || !isDataLoaded) return;

      if (isRemoteUpdate.current) {
          isRemoteUpdate.current = false;
          return;
      }

      if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
          try {
              const userDocRef = doc(db, "users", currentUser.uid);

              // Helper to filter out base64 strings
              const isHttpUrl = (str: string | undefined) => str && str.startsWith('https');

              const dataToSave = {
                bets: bets.map(({ photos, ...bet }) => ({
                    ...bet,
                    photos: photos?.filter(isHttpUrl) || []
                })),
                gains: gains.map(({ photos, ...gain }) => ({
                    ...gain,
                    photos: photos?.filter(isHttpUrl) || []
                })),
                bookmakers: bookmakers.map(({ logo, ...bookmaker }) => ({
                    ...bookmaker,
                    logo: isHttpUrl(logo) ? logo : undefined
                })),
                statuses,
                promotions,
                origins: origins.map(({ icon, ...origin }) => ({
                    ...origin,
                    icon: isHttpUrl(icon) ? icon : icon
                })),
                settings: {
                    ...settings,
                    profileImage: isHttpUrl(settings.profileImage) ? settings.profileImage : undefined,
                    username: currentUser.username, 
                    email: currentUser.email
                },
                lastUpdated: new Date().toISOString()
              };

              // Final sanity check before saving
              if (safeStringify(dataToSave).includes('data:image')) {
                 console.error("FATAL: Tentativa de salvar dados de imagem base64 no Firestore após a filtragem!");
                 alert("Ocorreu um erro crítico ao tentar salvar. Alguns dados de imagem podem não ter sido processados corretamente.");
                 return; 
              }

              await setDoc(userDocRef, dataToSave, { merge: true });

          } catch (error: any) {
              console.error("Erro ao salvar no Firestore:", error);
              if (error.message.includes('exceeds the maximum allowed size')) {
                  alert("Erro Crítico: Seus dados excederam o limite de armazenamento. Isso pode ocorrer se imagens antigas não foram migradas. O salvamento automático foi pausado para evitar perda de dados. Contate o suporte.");
              }
          }
      }, 2000); // Debounce 2 seconds
  };

  // Trigger save on data change
  useEffect(() => { 
      if (isLoggedIn && isDataLoaded) saveDataToFirestore();
  }, [bets, gains, bookmakers, statuses, promotions, origins, settings, isLoggedIn, isDataLoaded]);


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