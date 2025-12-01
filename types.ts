
export type Status = string;

export interface StatusItem {
  id: string;
  name: string;
  color: string;
}

export interface PromotionItem {
  id: string;
  name: string;
  color: string;
}

export interface OriginItem {
  id: string;
  name: string;
  color: string;           // Main Icon/Text color
  backgroundColor?: string; // Optional specific background color
  icon?: string;           // Lucide icon name OR Data URL
}

export interface Bookmaker {
  id: string;
  name: string;
  color?: string;
  logo?: string; // URL or placeholder text
  siteUrl?: string; // Website URL
}

export interface Coverage {
  id: string;
  bookmakerId: string;
  market: string;
  odd: number;
  stake: number;
  status: Status;
  manualReturn?: number;
}

export interface Bet {
  id: string;
  date: string; // ISO date string
  event: string;
  mainBookmakerId: string;
  promotionType?: string; // 'Freebet', 'Promoção', etc.
  status: Status;
  coverages: Coverage[];
  notes?: string;
  photos?: string[]; // Array of base64 image strings
}

export interface ExtraGain {
  id: string;
  date: string;
  amount: number;
  origin: string; // 'Free Spins', 'Cashback', etc.
  bookmakerId: string;
  game?: string;
  status: 'Recebido' | 'Pendente' | 'Confirmado' | 'Cancelado';
  notes?: string;
  photos?: string[]; // Array of base64 image strings
}

export interface AppSettings {
  showProfileInHeader: boolean;
  showUsername: boolean;
  themeColor: string;
  profileImage?: string;
  username?: string;
  email?: string;
  extraGainsFilterPosition: 'below_toolbar' | 'within_toolbar'; // New setting for filter position
  privacyMode: boolean; // New setting for hiding balances
}

// Updated User interface for Firebase
export interface User {
  uid: string;
  username: string;
  email: string;
  // password removed as it's handled by Firebase Auth
}

export type SettingsTab = 'general' | 'status' | 'origins' | 'bookmakers';

export interface AIAnalysisHistory {
  id: string;
  timestamp: Date;
  imageUrl: string;
  type: 'bet' | 'gain' | 'bookmaker' | 'unknown';
  status: 'confirmed' | 'edited' | 'cancelled';
  confidence: number;
}

export enum Page {
  OVERVIEW = 'overview',
  BETS = 'bets',
  GAINS = 'gains',
  COACH = 'coach',
  SETTINGS = 'settings',
  AI_ASSISTANT = 'aiAssistant',
}
