

import { Bookmaker, StatusItem, PromotionItem, OriginItem } from './types';

export const INITIAL_BOOKMAKERS: Bookmaker[] = [
  { id: '1', name: 'Bet365', color: '#107c10', logo: 'https://www.google.com/s2/favicons?sz=64&domain=bet365.com' },
  { id: '2', name: 'Betano', color: '#ea580c', logo: 'https://www.google.com/s2/favicons?sz=64&domain=betano.com' },
  { id: '3', name: 'Sportingbet', color: '#2563eb', logo: 'https://www.google.com/s2/favicons?sz=64&domain=sportingbet.com' },
  { id: '4', name: 'Pinnacle', color: '#f97316', logo: 'https://www.google.com/s2/favicons?sz=64&domain=pinnacle.com' },
  { id: '5', name: 'Betfair', color: '#ffeb3b', logo: 'https://www.google.com/s2/favicons?sz=64&domain=betfair.com' },
  { id: '6', name: 'KTO', color: '#ef4444', logo: 'https://www.google.com/s2/favicons?sz=64&domain=kto.com' },
  { id: '7', name: 'Stake', color: '#1a1a1a', logo: 'https://www.google.com/s2/favicons?sz=64&domain=stake.com' },
  { id: '8', name: 'Novibet', color: '#22d3ee', logo: 'https://www.google.com/s2/favicons?sz=64&domain=novibet.com' },
  { id: '9', name: 'Superbet', color: '#e11d48', logo: 'https://www.google.com/s2/favicons?sz=64&domain=superbet.com' },
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
  { id: '2', name: 'Conversão Freebet', color: '#4ade80' },
  { id: '3', name: 'Freebet', color: '#a855f7' },
  { id: '4', name: 'Super Odds', color: '#f97316' },
  { id: '5', name: 'Reembolso', color: '#3b82f6' },
  { id: '6', name: 'Missão', color: '#f43f5e' },
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