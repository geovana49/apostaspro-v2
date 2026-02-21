import React, { useState, useMemo } from 'react';
import {
    Wallet, Building2, TrendingUp, Plus, ArrowUpRight, ArrowDownLeft,
    Repeat, Trash2, Edit2, Search, Filter, History, Building, Landmark, CreditCard, Banknote
} from 'lucide-react';
import { CaixaAccount, CaixaMovement, Bookmaker, User, AppSettings, CaixaCategory } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { Card, Button, Input, Modal, Select, MoneyDisplay, Dropdown } from './ui/UIComponents';

interface CaixaProps {
    currentUser: User | null;
    accounts: CaixaAccount[];
    movements: CaixaMovement[];
    bookmakers: Bookmaker[];
    categories: CaixaCategory[];
    settings: AppSettings;
}

const Caixa: React.FC<CaixaProps> = ({ currentUser, accounts, movements, bookmakers, categories, settings }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'bank' | 'bookmaker' | 'other'>('all');

    // Modals state
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<CaixaAccount | null>(null);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementType, setMovementType] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
    const [initialAccountId, setInitialAccountId] = useState<string | null>(null);
    const [houseSearchTerm, setHouseSearchTerm] = useState('');
    const [expandedBmId, setExpandedBmId] = useState<string | null>(null);

    // Summary Calculations
    const summary = useMemo(() => {
        const safeAccounts = accounts || [];
        return safeAccounts.reduce((acc, account) => {
            acc.total += account.balance || 0;
            if (account.type === 'bank') acc.bank += account.balance || 0;
            else if (account.type === 'bookmaker') acc.bookmaker += account.balance || 0;
            else acc.other += account.balance || 0;
            return acc;
        }, { total: 0, bank: 0, bookmaker: 0, other: 0 });
    }, [accounts]);

    // Bookmaker balances summary
    const bookmakerBalances = useMemo(() => {
        const filtered = (bookmakers || []).filter(bm =>
            bm.name.toLowerCase().includes(houseSearchTerm.toLowerCase())
        );
        return filtered
            .map(bm => {
                const total = (accounts || [])
                    .filter(a => a.bookmakerId === bm.id)
                    .reduce((sum, a) => sum + (a.balance || 0), 0);
                return { ...bm, total };
            })
            .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    }, [bookmakers, accounts, houseSearchTerm]);

    const filteredAccounts = useMemo(() => {
        const safeAccounts = accounts || [];
        return safeAccounts.filter(acc => {
            const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filterType === 'all' || acc.type === filterType;
            return matchesSearch && matchesFilter;
        });
    }, [accounts, searchTerm, filterType]);

    const handleSaveAccount = async (account: Partial<CaixaAccount>) => {
        if (!currentUser) return;
        const id = editingAccount?.id || `acc_${Date.now()}`;
        const newAccount: CaixaAccount = {
            id,
            name: account.name || '',
            type: account.type || 'bank',
            balance: account.balance || 0,
            color: account.color || '#10b981',
            bookmakerId: account.bookmakerId,
            icon: account.icon
        };
        await FirestoreService.saveCaixaAccount(currentUser.uid, newAccount);
        setIsAccountModalOpen(false);
        setEditingAccount(null);
    };

    const handleDeleteAccount = async (id: string) => {
        if (!currentUser || !confirm('Tem certeza que deseja excluir esta conta?')) return;
        await FirestoreService.deleteCaixaAccount(currentUser.uid, id);
    };

    const handleDeleteMovement = async (id: string) => {
        if (!currentUser || !confirm('Tem certeza que deseja excluir esta movimentação?')) return;
        await FirestoreService.deleteCaixaMovement(currentUser.uid, id);
    };

    const handleSaveMovement = async (movement: Partial<CaixaMovement>) => {
        if (!currentUser) return;

        // Auto-create account if it's a new bookmaker
        const ensureAccount = async (id?: string) => {
            if (!id || !id.startsWith('new_bm_')) return id;
            const bmId = id.replace('new_bm_', '');
            const bm = bookmakers.find(b => b.id === bmId);
            if (!bm) return id;

            const newId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const newAcc: CaixaAccount = {
                id: newId,
                name: bm.name,
                type: 'bookmaker',
                balance: 0,
                color: bm.color || '#10b981',
                bookmakerId: bm.id
            };
            await FirestoreService.saveCaixaAccount(currentUser.uid, newAcc);

            // Add the new account to the local accounts array so the balance update below finds it
            accounts.push(newAcc);
            return newId;
        };

        const activeToId = await ensureAccount(movement.toAccountId);
        const activeFromId = await ensureAccount(movement.fromAccountId);

        // Create movement record
        const id = `mov_${Date.now()}`;
        const newMovement: CaixaMovement = {
            id,
            date: movement.date || new Date().toISOString(),
            amount: movement.amount || 0,
            type: movement.type || 'deposit',
            category: movement.category || '',
            fromAccountId: activeFromId,
            toAccountId: activeToId,
            notes: movement.notes
        };

        // Update account balances
        if (newMovement.type === 'deposit' && newMovement.toAccountId) {
            const acc = accounts.find(a => a.id === newMovement.toAccountId);
            if (acc) {
                await FirestoreService.saveCaixaAccount(currentUser.uid, { ...acc, balance: (acc.balance || 0) + newMovement.amount });
            }
        } else if (newMovement.type === 'withdraw' && newMovement.fromAccountId) {
            const acc = accounts.find(a => a.id === newMovement.fromAccountId);
            if (acc) {
                await FirestoreService.saveCaixaAccount(currentUser.uid, { ...acc, balance: (acc.balance || 0) - newMovement.amount });
            }
        } else if (newMovement.type === 'transfer' && newMovement.fromAccountId && newMovement.toAccountId) {
            const fromAcc = accounts.find(a => a.id === newMovement.fromAccountId);
            const toAcc = accounts.find(a => a.id === newMovement.toAccountId);
            if (fromAcc && toAcc) {
                await FirestoreService.saveCaixaAccount(currentUser.uid, { ...fromAcc, balance: (fromAcc.balance || 0) - newMovement.amount });
                await FirestoreService.saveCaixaAccount(currentUser.uid, { ...toAcc, balance: (toAcc.balance || 0) + newMovement.amount });
            }
        }

        await FirestoreService.saveCaixaMovement(currentUser.uid, newMovement);
        setIsMovementModalOpen(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="p-2 bg-primary/10 rounded-lg"><Wallet className="text-primary" /></span>
                        Controle de Caixa
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Gerencie seu capital em operação</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { setEditingAccount(null); setIsAccountModalOpen(true); }}>
                        <Plus size={18} /> Nova Conta
                    </Button>
                    <Button className="flex-1 sm:flex-none" onClick={() => { setMovementType('deposit'); setIsMovementModalOpen(true); }}>
                        <TrendingUp size={18} /> Nova Movimentação
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 border-primary/20 bg-gradient-to-br from-[#0d1421] to-[#090c19]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary"><Wallet size={20} /></div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Capital Total</span>
                    </div>
                    <MoneyDisplay
                        value={summary.total / 100}
                        privacyMode={settings.privacyMode}
                        className="text-3xl font-bold text-white tracking-tight"
                    />
                    <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
                    </div>
                </Card>

                <Card className="p-6 border-emerald-500/20 bg-gradient-to-br from-[#0d1421] to-[#090c19]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Landmark size={20} /></div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Bancos / Corretoras</span>
                    </div>
                    <MoneyDisplay
                        value={summary.bank / 100}
                        privacyMode={settings.privacyMode}
                        className="text-3xl font-bold text-white tracking-tight"
                    />
                    <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: summary.total > 0 ? `${(summary.bank / summary.total) * 100}%` : '0%' }}></div>
                    </div>
                </Card>

                <Card className="p-6 border-amber-500/20 bg-gradient-to-br from-[#0d1421] to-[#090c19]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Building2 size={20} /></div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Casas de Apostas</span>
                    </div>
                    <MoneyDisplay
                        value={summary.bookmaker / 100}
                        privacyMode={settings.privacyMode}
                        className="text-3xl font-bold text-white tracking-tight"
                    />
                    <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: summary.total > 0 ? `${(summary.bookmaker / summary.total) * 100}%` : '0%' }}></div>
                    </div>
                </Card>

                <Card className="p-6 border-blue-500/20 bg-gradient-to-br from-[#0d1421] to-[#090c19]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><CreditCard size={20} /></div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Outras Contas</span>
                    </div>
                    <MoneyDisplay
                        value={summary.other / 100}
                        privacyMode={settings.privacyMode}
                        className="text-3xl font-bold text-white tracking-tight"
                    />
                    <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: summary.total > 0 ? `${(summary.other / summary.total) * 100}%` : '0%' }}></div>
                    </div>
                </Card>
            </div>

            {/* Bookmaker Balances Horizontal Section - MOVED UP */}
            {bookmakerBalances.length > 0 && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Building2 size={20} /></div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Saldos por Casa</h2>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar casa..."
                                value={houseSearchTerm}
                                onChange={e => setHouseSearchTerm(e.target.value)}
                                className="w-full bg-[#0d1421] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="relative group/carousel">
                        {/* Navigation Buttons */}
                        <button
                            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-[#0d1421]/80 backdrop-blur-md border border-white/10 rounded-full text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hidden lg:flex"
                            onClick={() => {
                                const el = document.getElementById('bm-carousel');
                                if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                            }}
                        >
                            <ArrowDownLeft size={16} className="rotate-45" />
                        </button>
                        <button
                            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-[#0d1421]/80 backdrop-blur-md border border-white/10 rounded-full text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hidden lg:flex"
                            onClick={() => {
                                const el = document.getElementById('bm-carousel');
                                if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                            }}
                        >
                            <ArrowUpRight size={16} className="-rotate-45" />
                        </button>

                        <div
                            id="bm-carousel"
                            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-1 no-scrollbar scroll-smooth"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {bookmakerBalances.map(bm => {
                                const account = (accounts || []).find(a => a.bookmakerId === bm.id);
                                const targetId = account ? account.id : `new_bm_${bm.id}`;
                                const isExpanded = expandedBmId === bm.id;

                                // Get movements for this house
                                const houseAccountIds = (accounts || [])
                                    .filter(a => a.bookmakerId === bm.id)
                                    .map(a => a.id);
                                const houseMovements = (movements || [])
                                    .filter(m => houseAccountIds.includes(m.fromAccountId || '') || houseAccountIds.includes(m.toAccountId || ''))
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                const stats = houseMovements.reduce((acc, m) => {
                                    const amount = m.amount || 0;
                                    const isTo = houseAccountIds.includes(m.toAccountId || '');
                                    const isFrom = houseAccountIds.includes(m.fromAccountId || '');

                                    if (m.type === 'transfer') {
                                        if (isTo && !isFrom) acc.deposits += amount;
                                        if (isFrom && !isTo) acc.withdrawals += amount;
                                    } else if (m.type === 'deposit' && isTo) {
                                        acc.deposits += amount;
                                    } else if (m.type === 'withdraw' && isFrom) {
                                        acc.withdrawals += amount;
                                    }
                                    return acc;
                                }, { deposits: 0, withdrawals: 0 });

                                return (
                                    <div key={bm.id} className="snap-start shrink-0 w-[280px] sm:w-[320px] space-y-3">
                                        <Card
                                            className={`p-4 flex items-center justify-between bg-[#0d1421]/60 border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group ${isExpanded ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : ''}`}
                                            onClick={() => setExpandedBmId(isExpanded ? null : bm.id)}
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-gray-400 font-bold uppercase mb-0.5 truncate">{bm.name}</div>
                                                    <MoneyDisplay
                                                        value={bm.total / 100}
                                                        privacyMode={settings.privacyMode}
                                                        className="text-xl font-bold text-white tracking-tight"
                                                    />
                                                </div>
                                                {bm.logo ? (
                                                    <img src={bm.logo} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1.5" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                                        <Building2 size={20} className="text-gray-600" />
                                                    </div>
                                                )}
                                            </div>
                                        </Card>

                                        {isExpanded && (
                                            <div className="bg-[#090c19] border border-white/5 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                {/* Summary Stats */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                                        <div className="text-[10px] text-emerald-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                                                            <ArrowDownLeft size={10} /> Depósitos
                                                        </div>
                                                        <MoneyDisplay value={stats.deposits / 100} privacyMode={settings.privacyMode} className="text-sm font-bold text-white" />
                                                    </div>
                                                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                                                        <div className="text-[10px] text-red-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                                                            <ArrowUpRight size={10} /> Saques
                                                        </div>
                                                        <MoneyDisplay value={stats.withdrawals / 100} privacyMode={settings.privacyMode} className="text-sm font-bold text-white" />
                                                    </div>
                                                </div>

                                                {/* History Mini List */}
                                                <div className="space-y-2">
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase px-1">Últimas Transações</div>
                                                    {houseMovements.length === 0 ? (
                                                        <div className="text-[11px] text-gray-600 italic px-1">Nenhuma movimentação registrada.</div>
                                                    ) : (
                                                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {houseMovements.slice(0, 5).map(m => (
                                                                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-[11px]">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-gray-300 font-medium truncate">{m.category || 'Mover Capital'}</div>
                                                                        <div className="text-[9px] text-gray-600">{new Date(m.date).toLocaleDateString('pt-BR')}</div>
                                                                    </div>
                                                                    <div className={`font-bold ml-2 ${(m.type === 'deposit' || (m.type === 'transfer' && houseAccountIds.includes(m.toAccountId || '')))
                                                                        ? 'text-primary' : 'text-danger'
                                                                        }`}>
                                                                        {(m.type === 'deposit' || (m.type === 'transfer' && houseAccountIds.includes(m.toAccountId || ''))) ? '+' : '-'}
                                                                        R$ {(m.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Quick Action */}
                                                <Button
                                                    className="w-full text-xs h-9"
                                                    onClick={() => {
                                                        setMovementType('deposit');
                                                        setInitialAccountId(targetId);
                                                        setIsMovementModalOpen(true);
                                                    }}
                                                >
                                                    <TrendingUp size={14} className="mr-2" />
                                                    Novo Lançamento
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {bookmakerBalances.length === 0 && (
                            <div className="col-span-full py-8 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-3xl">
                                <Search className="mx-auto text-gray-600 mb-3" size={24} />
                                <p className="text-sm text-gray-500">Nenhuma casa encontrada com este nome.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Accounts Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        Minhas Contas
                        <span className="bg-white/5 text-gray-400 px-2 py-0.5 rounded text-xs font-mono">{filteredAccounts.length}</span>
                    </h2>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar conta..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-[#0d1121] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-primary/50 outline-none transition-all"
                            />
                        </div>
                        <div className="flex gap-1 bg-[#0d1121] p-1 rounded-lg border border-white/10">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`p-1.5 rounded-md transition-all ${filterType === 'all' ? 'bg-primary text-[#090c19] shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                                title="Todas"
                            >
                                <Filter size={16} />
                            </button>
                            <button
                                onClick={() => setFilterType('bank')}
                                className={`p-1.5 rounded-md transition-all ${filterType === 'bank' ? 'bg-primary text-[#090c19] shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                                title="Bancos"
                            >
                                <Landmark size={16} />
                            </button>
                            <button
                                onClick={() => setFilterType('bookmaker')}
                                className={`p-1.5 rounded-md transition-all ${filterType === 'bookmaker' ? 'bg-primary text-[#090c19] shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                                title="Casas"
                            >
                                <Building2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {filteredAccounts.length === 0 ? (
                    <div className="bg-[#0d1121]/50 border border-white/5 border-dashed rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="text-gray-600" size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">Nenhuma conta encontrada</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsAccountModalOpen(true)}>Adicionar Conta</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAccounts.map(account => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                bookmakers={bookmakers}
                                privacyMode={settings.privacyMode}
                                onEdit={() => { setEditingAccount(account); setIsAccountModalOpen(true); }}
                                onDelete={() => handleDeleteAccount(account.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Movements History Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Histórico de Movimentações
                    <span className="bg-white/5 text-gray-400 px-2 py-0.5 rounded text-xs font-mono">{(movements || []).length}</span>
                </h2>

                {(!movements || (movements || []).length === 0) ? (
                    <div className="bg-[#0d1121]/50 border border-white/5 border-dashed rounded-2xl p-8 text-center">
                        <p className="text-gray-500 text-sm">Nenhuma movimentação registrada.</p>
                    </div>
                ) : (
                    <Card className="overflow-hidden border-white/5 bg-[#0d1121]/40">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Data</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Tipo</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Anotação</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Detalhes</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Valor</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[...(movements || [])].sort((a, b) => {
                                        const timeA = new Date(a.date).getTime();
                                        const timeB = new Date(b.date).getTime();
                                        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                                    }).map(mov => {
                                        const safeAccounts = accounts || [];
                                        const fromAcc = safeAccounts.find(a => a.id === mov.fromAccountId);
                                        const toAcc = safeAccounts.find(a => a.id === mov.toAccountId);
                                        const date = new Date(mov.date);
                                        const isPositive = mov.type === 'deposit';
                                        const isNegative = mov.type === 'withdraw';

                                        return (
                                            <tr key={mov.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4 text-gray-400 font-mono text-xs whitespace-nowrap">
                                                    {date.toLocaleDateString('pt-BR')} <span className="opacity-40">{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${mov.type === 'deposit' ? 'bg-primary/10 text-primary' :
                                                        mov.type === 'withdraw' ? 'bg-danger/10 text-danger' :
                                                            'bg-secondary/10 text-secondary'
                                                        }`}>
                                                        {mov.type === 'deposit' ? <ArrowDownLeft size={12} /> :
                                                            mov.type === 'withdraw' ? <ArrowUpRight size={12} /> :
                                                                <Repeat size={12} />}
                                                        {mov.type === 'deposit' ? 'Aporte' :
                                                            mov.type === 'withdraw' ? 'Retirada' :
                                                                'Transf.'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-gray-300 font-medium text-xs">{mov.category || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-medium">
                                                            {mov.type === 'deposit' && `Para: ${toAcc?.name || 'Conta excluída'}`}
                                                            {mov.type === 'withdraw' && `De: ${fromAcc?.name || 'Conta excluída'}`}
                                                            {mov.type === 'transfer' && `${fromAcc?.name} → ${toAcc?.name}`}
                                                        </span>
                                                        {mov.notes && <span className="text-[11px] text-gray-500 italic mt-0.5">{mov.notes}</span>}
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold font-mono ${isPositive ? 'text-primary' : isNegative ? 'text-danger' : 'text-white'}`}>
                                                    {isPositive ? '+' : isNegative ? '-' : ''}
                                                    <MoneyDisplay value={mov.amount / 100} privacyMode={settings.privacyMode} className="text-sm" />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteMovement(mov.id)}
                                                        className="p-1.5 text-gray-600 hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Excluir movimentação"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Modals */}
            <AccountModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onSave={handleSaveAccount}
                editingAccount={editingAccount}
                bookmakers={bookmakers}
            />

            <MovementModal
                isOpen={isMovementModalOpen}
                onClose={() => {
                    setIsMovementModalOpen(false);
                    setInitialAccountId(null);
                }}
                onSave={handleSaveMovement}
                type={movementType}
                setType={setMovementType}
                accounts={accounts}
                bookmakers={bookmakers}
                categories={categories}
                currentUser={currentUser}
                initialAccountId={initialAccountId}
            />

        </div >
    );
};

const AccountCard: React.FC<{ account: CaixaAccount, bookmakers: Bookmaker[], privacyMode?: boolean, onEdit: () => void, onDelete: () => void | Promise<void> }> = ({ account, bookmakers, privacyMode, onEdit, onDelete }) => {
    const bookmaker = account.bookmakerId ? bookmakers.find(bm => bm.id === account.bookmakerId) : null;

    return (
        <Card className="p-4 group/card overflow-hidden">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500 overflow-hidden" style={{ backgroundColor: bookmaker?.color ? `${bookmaker.color}20` : `${account.color}20`, color: bookmaker?.color || account.color }}>
                        {bookmaker?.logo ? (
                            <img src={bookmaker.logo} alt={bookmaker.name} className="w-full h-full object-contain p-1" />
                        ) : (
                            account.type === 'bank' ? <Landmark size={20} /> : account.type === 'bookmaker' ? <Building2 size={20} /> : <Banknote size={20} />
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-white group-hover/card:text-primary transition-colors">{account.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{account.type === 'bank' ? 'Banco' : account.type === 'bookmaker' ? 'Casa de Aposta' : 'Outros'}</p>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-all"><Edit2 size={14} /></button>
                    <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-danger hover:bg-danger/5 rounded-md transition-all"><Trash2 size={14} /></button>
                </div>
            </div>
            <div className="mt-6 flex items-end justify-between">
                <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Saldo Disponível</p>
                    <MoneyDisplay
                        value={account.balance / 100}
                        privacyMode={privacyMode}
                        className="text-xl font-bold text-white"
                    />
                </div>
                <div className="p-1.5 bg-white/5 rounded-lg">
                    <TrendingUp size={14} className="text-gray-600" />
                </div>
            </div>
        </Card>
    );
};

const AccountModal = ({ isOpen, onClose, onSave, editingAccount, bookmakers }: any) => {
    const [name, setName] = useState(editingAccount?.name || '');
    const [type, setType] = useState(editingAccount?.type || 'bank');
    const [balance, setBalance] = useState(editingAccount ? (editingAccount.balance / 100).toFixed(2).replace('.', ',') : '0,00');
    const [color, setColor] = useState(editingAccount?.color || '#10b981');
    const [bookmakerId, setBookmakerId] = useState(editingAccount?.bookmakerId || '');

    React.useEffect(() => {
        if (editingAccount) {
            setName(editingAccount.name);
            setType(editingAccount.type);
            setBalance((editingAccount.balance / 100).toFixed(2).replace('.', ','));
            setColor(editingAccount.color);
            setBookmakerId(editingAccount.bookmakerId || '');
        } else {
            setName(''); setType('bank'); setBalance('0,00'); setColor('#10b981'); setBookmakerId('');
        }
    }, [editingAccount, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedBalance = parseFloat(balance.replace(',', '.'));
        const cleanBalance = isNaN(parsedBalance) ? 0 : Math.round(parsedBalance * 100);
        onSave({ name, type, balance: cleanBalance, color, bookmakerId: type === 'bookmaker' ? bookmakerId : undefined });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingAccount ? "Editar Conta" : "Nova Conta"}>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Select label="Tipo de Conta" value={type} onChange={e => setType(e.target.value as any)}>
                        <option value="bank">Banco / PIX</option>
                        <option value="bookmaker">Casa de Aposta</option>
                        <option value="other">Outros</option>
                    </Select>
                    <Input label="Cor" type="color" value={color} onChange={e => setColor(e.target.value)} className="h-[42px] p-1" />
                </div>

                {type === 'bookmaker' ? (
                    <Select label="Vincular Casa" value={bookmakerId} onChange={e => {
                        const id = e.target.value;
                        setBookmakerId(id);
                        const bm = bookmakers.find((b: any) => b.id === id);
                        if (bm && !name) setName(bm.name);
                    }}>
                        <option value="">Selecione uma casa...</option>
                        {(bookmakers || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                ) : null}

                <Input label="Nome da Conta" value={name} onChange={e => setName(e.target.value)} placeholder="ex: NuBank, Bet365..." required />

                <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Você já possui saldo nesta plataforma?</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setBalance('0,00')}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${balance === '0,00' ? 'bg-primary border-primary text-[#090c19]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                        >
                            Começar do zero (R$ 0,00)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (balance === '0,00') setBalance('');
                            }}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${balance !== '0,00' ? 'bg-primary border-primary text-[#090c19]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                        >
                            Informar Saldo Atual
                        </button>
                    </div>
                    {balance !== '0,00' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-2">
                            <Input
                                label="Saldo Atual na Plataforma"
                                prefix="R$"
                                value={balance}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^\d,]/g, '');
                                    setBalance(val);
                                }}
                                required
                            />
                            <p className="text-[10px] text-gray-500 mt-1 italic">Este valor será seu saldo inicial nesta conta.</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-4">
                    <Button variant="neutral" className="flex-1" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar Conta</Button>
                </div>
            </form>
        </Modal>
    );
};

const MovementModal = ({ isOpen, onClose, onSave, type, setType, accounts, bookmakers, categories, currentUser, initialAccountId }: any) => {
    const [amount, setAmount] = useState('0,00');
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [notes, setNotes] = useState('');

    const accountOptions = useMemo(() => {
        const options = (accounts || []).map(acc => {
            const bm = acc.bookmakerId ? bookmakers.find(b => b.id === acc.bookmakerId) : null;
            return {
                label: `${acc.name} (Saldo: R$ ${(acc.balance / 100).toFixed(2)})`,
                value: acc.id,
                icon: bm?.logo ? (
                    <img src={bm.logo} alt="" className="w-5 h-5 rounded object-contain" />
                ) : (
                    acc.type === 'bank' ? <Landmark size={14} /> : <Building2 size={14} />
                )
            };
        });

        // Add bookmakers from settings that don't have accounts yet
        const existingBmIds = new Set(accounts?.map(a => a.bookmakerId).filter(Boolean));
        const newBmOptions = (bookmakers || [])
            .filter(bm => !existingBmIds.has(bm.id))
            .map(bm => ({
                label: `${bm.name}`,
                value: `new_bm_${bm.id}`,
                icon: bm.logo ? (
                    <img src={bm.logo} alt="" className="w-5 h-5 rounded object-contain" />
                ) : <Building2 size={14} />
            }));

        return [...options, ...newBmOptions];
    }, [accounts, bookmakers]);

    const categoryOptions = useMemo(() => {
        const filtered = (categories || []).filter(c => c.type === type);
        return filtered.map(c => ({ label: c.name, value: c.name, id: c.id, isDefault: false }));
    }, [type, categories]);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [isManagingCategories, setIsManagingCategories] = useState(false);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !currentUser) return;
        const newCat: CaixaCategory = {
            id: `cat_${Date.now()}`,
            name: newCategoryName.trim(),
            type: type as 'deposit' | 'withdraw'
        };
        await FirestoreService.saveCaixaCategory(currentUser.uid, newCat);
        setNewCategoryName('');
        setCategory(newCat.name);
    };

    const handleDeleteCategory = async (catId: string) => {
        if (!currentUser || !confirm('Excluir esta categoria?')) return;
        await FirestoreService.deleteCaixaCategory(currentUser.uid, catId);
    };

    React.useEffect(() => {
        if (isOpen) {
            setAmount('0,00');
            setFromAccountId(type === 'withdraw' ? (initialAccountId || '') : '');
            setToAccountId(type === 'deposit' ? (initialAccountId || '') : '');
            setDate(new Date().toISOString().split('T')[0]);
            setCategory(initialAccountId ? 'Ajuste de Saldo' : '');
            setNotes('');
        }
    }, [isOpen, type, initialAccountId]);

    const handleShowPicker = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
        try {
            if ((e.target as any).showPicker) {
                (e.target as any).showPicker();
            }
        } catch (err) {
            console.error("Failed to show picker:", err);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanAmount = Math.round(parseFloat(amount.replace(',', '.')) * 100);
        onSave({ amount: cleanAmount, type, fromAccountId, toAccountId, date: new Date(date).toISOString(), category, notes });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nova Movimentação">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <Select label="Tipo *" value={type} onChange={e => setType(e.target.value as any)}>
                        <option value="deposit">💰 Depósito / Entrada</option>
                        <option value="withdraw">💸 Saque / Saída</option>
                        <option value="transfer">🔄 Transferência</option>
                    </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Valor (R$) *"
                        prefix="R$"
                        value={amount}
                        onChange={e => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
                        required
                    />
                    <Input
                        label="Data *"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        onFocus={handleShowPicker}
                        onClick={handleShowPicker}
                        required
                    />
                </div>

                {type === 'transfer' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Dropdown
                            label="Origem *"
                            value={fromAccountId}
                            onChange={setFromAccountId}
                            options={accountOptions}
                            isSearchable
                            placeholder="Selecione..."
                        />
                        <Dropdown
                            label="Destino *"
                            value={toAccountId}
                            onChange={setToAccountId}
                            options={accountOptions}
                            isSearchable
                            placeholder="Selecione..."
                        />
                    </div>
                ) : (
                    <Dropdown
                        label={type === 'deposit' ? "Destino *" : "Origem *"}
                        value={type === 'deposit' ? toAccountId : fromAccountId}
                        onChange={val => type === 'deposit' ? setToAccountId(val) : setFromAccountId(val)}
                        options={accountOptions}
                        isSearchable
                        placeholder="Selecione a conta..."
                    />
                )}

                {type !== 'transfer' && (
                    <div className="space-y-3">
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Dropdown
                                    label="Categoria"
                                    value={category}
                                    onChange={setCategory}
                                    options={categoryOptions}
                                    placeholder="Selecione uma categoria..."
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="px-3"
                                type="button"
                                onClick={() => setIsManagingCategories(!isManagingCategories)}
                                title="Gerenciar Categorias"
                            >
                                <Edit2 size={16} />
                            </Button>
                        </div>

                        {isManagingCategories && (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Adicionar Nova Categoria</p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Nome da categoria..."
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="primary"
                                        className="px-3"
                                        type="button"
                                        onClick={handleAddCategory}
                                        disabled={!newCategoryName.trim()}
                                    >
                                        <Plus size={16} />
                                    </Button>
                                </div>

                                {categoryOptions.filter(o => !o.isDefault).length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Suas Categorias</p>
                                        <div className="grid grid-cols-1 gap-1">
                                            {categoryOptions.filter(o => !o.isDefault).map((opt: any) => (
                                                <div key={opt.id} className="flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors group">
                                                    <span className="text-xs text-gray-300">{opt.label}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCategory(opt.id)}
                                                        className="p-1 text-gray-600 hover:text-danger hover:bg-danger/10 rounded transition-all"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <Input
                    label="Anotação / Observação (Opcional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ex: Aposta na Bet365, Depósito via PIX..."
                />

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                    <Button variant="neutral" className="sm:w-32" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="sm:w-32">Registrar</Button>
                </div>
            </form>
        </Modal>
    );
};

export default Caixa;
