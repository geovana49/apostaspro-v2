

import { Bookmaker, StatusItem, PromotionItem, OriginItem, ThemePreset } from './types';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'midnight',
    name: 'Padrão (Midnight)',
    colors: {
      background: '#090c19',
      surface: '#151b2e',
      primary: '#17baa4',
      primaryDark: '#129683',
      secondary: '#FFAB00',
      danger: '#FF5252',
      promotion: '#8B5CF6',
      textMain: '#FFFFFF',
      textMuted: '#94a3b8'
    }
  },
  {
    id: 'light',
    name: 'Claro (Day)',
    colors: {
      background: '#f8fafc',
      surface: '#ffffff',
      primary: '#0f766e',
      primaryDark: '#0d9488',
      secondary: '#f59e0b',
      danger: '#ef4444',
      promotion: '#7c3aed',
      textMain: '#0f172a',
      textMuted: '#64748b'
    }
  },
  {
    id: 'ocean',
    name: 'Oceano',
    colors: {
      background: '#0f172a',
      surface: '#1e293b',
      primary: '#06b6d4',
      primaryDark: '#0891b2',
      secondary: '#facc15',
      danger: '#f43f5e',
      promotion: '#8b5cf6',
      textMain: '#f8fafc',
      textMuted: '#94a3b8'
    }
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol',
    colors: {
      background: '#18181b',
      surface: '#27272a',
      primary: '#f97316',
      primaryDark: '#ea580c',
      secondary: '#eab308',
      danger: '#ef4444',
      promotion: '#d946ef',
      textMain: '#fafafa',
      textMuted: '#a1a1aa'
    }
  },
  {
    id: 'forest',
    name: 'Floresta',
    colors: {
      background: '#052e16',
      surface: '#064e3b',
      primary: '#34d399',
      primaryDark: '#10b981',
      secondary: '#fbbf24',
      danger: '#f87171',
      promotion: '#a78bfa',
      textMain: '#ecfdf5',
      textMuted: '#6ee7b7'
    }
  },
  {
    id: 'nebula',
    name: 'Nebulosa',
    colors: {
      background: '#2e1065',
      surface: '#4c1d95',
      primary: '#f472b6',
      primaryDark: '#db2777',
      secondary: '#fde047',
      danger: '#fb7185',
      promotion: '#c084fc',
      textMain: '#fdf4ff',
      textMuted: '#e879f9'
    }
  }
];

export const INITIAL_BOOKMAKERS: Bookmaker[] = [
  { id: '1', name: 'Bet365', color: '#107c10' },
  { id: '2', name: 'Betano', color: '#ea580c' },
  { id: '3', name: 'Sportingbet', color: '#2563eb' },
  { id: '4', name: 'Pinnacle', color: '#f97316' },
  { id: '5', name: 'Betesporte', color: '#1e3a8a' },
];

export const INITIAL_STATUSES: StatusItem[] = [
  { id: '1', name: 'Pendente', color: '#fbbf24' },
  { id: '2', name: 'Green', color: '#6ee7b7' }, // Updated to lighter green
  { id: '3', name: 'Red', color: '#ef4444' },
  { id: '4', name: 'Anulada', color: '#94a3b8' },
  { id: '5', name: 'Cashout', color: '#3b82f6' },
  { id: '6', name: 'Meio Green', color: '#6ee7b7' },
  { id: '7', name: 'Meio Red', color: '#ef4444' },
  { id: '8', name: 'Rascunho', color: '#64748b' }, // Draft status
];

export const INITIAL_PROMOTIONS: PromotionItem[] = [
  { id: '1', name: 'Nenhuma', color: '#94a3b8' },
  { id: '2', name: 'Freebet', color: '#a855f7' },
  { id: '3', name: 'Odds Boost', color: '#f97316' },
  { id: '4', name: 'Reembolso', color: '#3b82f6' },
  { id: '5', name: 'Missão', color: '#f43f5e' },
];

export const INITIAL_ORIGINS: OriginItem[] = [
  { id: '1', name: 'Free Spins', color: '#fbbf24' },
  { id: '2', name: 'Missão Diária', color: '#f472b6' },
  { id: '3', name: 'Cashback', color: '#4ade80' },
  { id: '4', name: 'Bônus Slot', color: '#a78bfa' },
];

export const GAIN_ORIGINS = [
  'Free Spins',
  'Missão Diária',
  'Cashback',
  'Bônus Slot',
  'Baú / Recompensa',
  'Mini Jackpot'
];

export const PROMOTION_TYPES = [
  'Nenhuma',
  'Freebet',
  'Bônus de Depósito',
  'Odds Aumentadas',
  'Reembolso'
];

export const MOCK_BETS = [];

export const MOCK_GAINS = [];