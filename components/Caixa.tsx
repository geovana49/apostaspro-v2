import React, { useState, useMemo } from 'react';
import {
    Wallet, Building2, TrendingUp, Plus, ArrowUpRight, ArrowDownLeft,
    Repeat, Trash2, Edit2, Search, Filter, History, Building, Landmark, CreditCard, Banknote
} from 'lucide-react';
import { CaixaAccount, CaixaMovement, Bookmaker, User, AppSettings } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { Card, Button, Input, Modal, Select, MoneyDisplay, Dropdown } from './ui/UIComponents';

interface CaixaProps {
    currentUser: User | null;
    accounts: CaixaAccount[];
    movements: CaixaMovement[];
    bookmakers: Bookmaker[];
    settings: AppSettings;
}

const Caixa: React.FC<CaixaProps> = ({ currentUser, accounts, movements, bookmakers, settings }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'bank' | 'bookmaker' | 'other'>('all');

    // Modals state
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<CaixaAccount | null>(null);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementType, setMovementType] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');

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

        // Create movement record
        const id = `mov_${Date.now()}`;
        const newMovement: CaixaMovement = {
            id,
            date: movement.date || new Date().toISOString(),
            amount: movement.amount || 0,
            type: movement.type || 'deposit',
            category: movement.category || '',
            fromAccountId: movement.fromAccountId,
            toAccountId: movement.toAccountId,
            notes: movement.notes
        };

        // Update account balances
        if (newMovement.type === 'deposit' && newMovement.toAccountId) {
            const acc = accounts.find(a => a.id === newMovement.toAccountId);
            if (acc) {
                await FirestoreService.saveCaixaAccount(currentUser.uid, { ...acc, balance: acc.balance + newMovement.amount });
            }
        } else if (newMovement.type === 'withdraw' && newMovement.fromAccountId) {
            const acc = accounts.find(a => a.id === newMovement.fromAccountId);
            if (acc) {
                await FirestoreService.saveCaixaAccount(currentUser.uid, { ...acc, balance: acc.balance - newMovement.amount });
            }
        } else if (newMovement.type === 'transfer' && newMovement.fromAccountId && newMovement.toAccountId) {
            const fromAcc = accounts.find(a => a.id === newMovement.fromAccountId);
            const toAcc = accounts.find(a => a.id === newMovement.toAccountId);
            if (fromAcc && toAcc) {
                await FirestoreService.saveCaixaAccount(currentUser.uid, { ...fromAcc, balance: fromAcc.balance - newMovement.amount });
                await FirestoreService.saveCaixaAccount(currentUser.uid, { ...toAcc, balance: toAcc.balance + newMovement.amount });
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
                        <TrendingUp size={18} /> Movimentar
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
                    <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: '100%' }} />
                    </div>
                </Card>

                <Card className="p-6 border-blue-500/20 bg-gradient-to-br from-[#0d1421] to-[#090c19]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Landmark size={20} /></div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Em Bancos</span>
                    </div>
                    <MoneyDisplay
                        value={summary.bank / 100}
                        privacyMode={settings.privacyMode}
                        className="text-3xl font-bold text-white tracking-tight"
                    />
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        {summary.total > 0 ? ((summary.bank / summary.total) * 100).toFixed(1) : 0}% do capital
                    </div>
                </Card>

                <Card className="p-6 border-emerald-500/20 bg-gradient-to-br from-[#0d1421] to-[#090c19]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Building2 size={20} /></div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Nas Casas</span>
                    </div>
                    <MoneyDisplay
                        value={summary.bookmaker / 100}
                        privacyMode={settings.privacyMode}
                        className="text-3xl font-bold text-white tracking-tight"
                    />
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        {summary.total > 0 ? ((summary.bookmaker / summary.total) * 100).toFixed(1) : 0}% do capital
                    </div>
                </Card>

                <Card className="p-6 border-purple-500/20 bg-gradient-to-br from-[#0d1421] to-[#090c19]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Banknote size={20} /></div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Outros</span>
                    </div>
                    <MoneyDisplay
                        value={summary.other / 100}
                        privacyMode={settings.privacyMode}
                        className="text-3xl font-bold text-white tracking-tight"
                    />
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        {summary.total > 0 ? ((summary.other / summary.total) * 100).toFixed(1) : 0}% do capital
                    </div>
                </Card>
            </div>

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
                onClose={() => setIsMovementModalOpen(false)}
                onSave={handleSaveMovement}
                type={movementType}
                setType={setMovementType}
                accounts={accounts}
            />

        </div>
    );
};

const AccountCard: React.FC<{ account: CaixaAccount, privacyMode?: boolean, onEdit: () => void, onDelete: () => void | Promise<void> }> = ({ account, privacyMode, onEdit, onDelete }) => (
    <Card className="p-4 group/card overflow-hidden">
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500" style={{ backgroundColor: `${account.color}20`, color: account.color }}>
                    {account.type === 'bank' ? <Landmark size={20} /> : account.type === 'bookmaker' ? <Building2 size={20} /> : <Banknote size={20} />}
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

                <Input
                    label="Saldo Inicial (Opcional)"
                    prefix="R$"
                    value={balance}
                    onChange={e => {
                        const val = e.target.value.replace(/[^\d,]/g, '');
                        setBalance(val);
                    }}
                />

                <div className="flex gap-2 pt-4">
                    <Button variant="neutral" className="flex-1" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar Conta</Button>
                </div>
            </form>
        </Modal>
    );
};

const MovementModal = ({ isOpen, onClose, onSave, type, setType, accounts }: any) => {
    const [amount, setAmount] = useState('0,00');
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [notes, setNotes] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setAmount('0,00');
            setFromAccountId('');
            setToAccountId('');
            setDate(new Date().toISOString().split('T')[0]);
            setCategory('');
            setNotes('');
        }
    }, [isOpen, type]);

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
                        <option value="deposit">💰 Aporte (Entrada de Capital)</option>
                        <option value="withdraw">💸 Retirada (Saída de Capital)</option>
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
                        <Select label="Origem (Banco/Casa) *" value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} required>
                            <option value="">Selecione...</option>
                            {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </Select>
                        <Select label="Destino (Banco/Casa) *" value={toAccountId} onChange={e => setToAccountId(e.target.value)} required>
                            <option value="">Selecione...</option>
                            {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </Select>
                    </div>
                ) : (
                    <Select
                        label={type === 'deposit' ? "Destino (Banco/Casa) *" : "Origem (Banco/Casa) *"}
                        value={type === 'deposit' ? toAccountId : fromAccountId}
                        onChange={e => type === 'deposit' ? setToAccountId(e.target.value) : setFromAccountId(e.target.value)}
                        required
                    >
                        <option value="">Selecione o banco ou casa...</option>
                        {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name} (Saldo: R$ {(a.balance / 100).toFixed(2)})</option>)}
                    </Select>
                )}

                <Input
                    label="Anotação (Opcional)"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Ex: Aporte inicial, Lucro, etc..."
                />

                <div className="w-full">
                    <label className="block text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2">Observação</label>
                    <textarea
                        className="w-full bg-[#0d1121] border border-white/10 focus:border-primary/50 text-white rounded-lg py-2.5 px-4 placeholder-gray-600 focus:outline-none transition-all duration-200 text-sm focus:ring-1 focus:ring-primary/50 hover:border-white/20 shadow-inner"
                        rows={3}
                        placeholder="Ex: Aporte inicial do mês, Retirada de lucro..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                    <Button variant="neutral" className="sm:w-32" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="sm:w-32">Registrar</Button>
                </div>
            </form>
        </Modal>
    );
};

export default Caixa;
