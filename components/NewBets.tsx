import React, { useState, useMemo } from 'react';
import {
    Search, Filter, Calendar, ChevronLeft, ChevronRight,
    ChevronDown, LayoutGrid, List, SlidersHorizontal, ArrowUpRight,
    ArrowDownRight, Minus, Plus, SearchX, BookOpen, Clock, CheckCircle2,
    XCircle, AlertCircle, Ban, Wallet, Activity, Building, RefreshCw, Layers as Infinity,
    Target, Trophy, StickyNote
} from 'lucide-react';
import { Bet, Bookmaker, StatusItem, AppSettings, User, PromotionItem } from '../types';
import { Card, Button, Input, Dropdown, MoneyDisplay, Badge, Modal } from './ui/UIComponents';
import { calculateBetStats } from '../utils/betCalculations';

interface NewBetsProps {
    bets: Bet[];
    bookmakers: Bookmaker[];
    statuses: StatusItem[];
    promotions: PromotionItem[];
    settings: AppSettings;
    currentUser: User | null;
}

const NewBets: React.FC<NewBetsProps> = ({ bets, bookmakers, statuses, promotions, settings, currentUser }) => {
    // Basic Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedBookmaker, setSelectedBookmaker] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('month'); // month, week, today, all, custom_date
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [profitFilter, setProfitFilter] = useState('all'); // all, profit, loss
    const [minStake, setMinStake] = useState('');
    const [marketFilter, setMarketFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all'); // all, back, lay
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- Dynamic Data Extraction ---
    const allMarkets = useMemo(() => {
        const markets = new Set<string>();
        bets.forEach(bet => {
            bet.coverages?.forEach(c => {
                if (c.market) markets.add(c.market.trim());
            });
        });
        return Array.from(markets).sort();
    }, [bets]);

    // Navigation for period (currently month-based for consistency, but can be expanded)
    const changeMonth = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // --- Advanced Filtering Logic ---
    const isExcluded = (promotion?: string) => {
        if (!promotion) return false;
        const normalized = promotion.toLowerCase();
        return normalized.includes('parceiro') || normalized.includes('cpf');
    };

    const filteredBets = useMemo(() => {
        return bets.filter(bet => {
            const stats = calculateBetStats(bet);
            if (isExcluded(bet.promotionType)) return false;
            const matchesSearch = bet.event?.toLowerCase().includes(searchTerm.toLowerCase()) || bet.notes?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (selectedStatus !== 'all' && bet.status !== selectedStatus) return false;
            if (selectedBookmaker !== 'all' && bet.mainBookmakerId !== selectedBookmaker) return false;
            if (profitFilter === 'profit' && stats.profit <= 0) return false;
            if (profitFilter === 'loss' && stats.profit >= 0) return false;
            if (minStake && stats.totalStake < parseFloat(minStake)) return false;
            if (marketFilter !== 'all') {
                const hasMarket = bet.coverages?.some(c => c.market?.trim() === marketFilter);
                if (!hasMarket) return false;
            }
            if (typeFilter !== 'all') {
                const targetType = typeFilter.toLowerCase();
                const hasType = bet.coverages?.some(c => c.market?.toLowerCase().includes(targetType));
                if (!hasType) return false;
            }
            const betDate = new Date(bet.date);
            if (selectedPeriod === 'month') {
                const sameMonth = betDate.getMonth() === currentDate.getMonth() && betDate.getFullYear() === currentDate.getFullYear();
                if (!sameMonth) return false;
            } else if (selectedPeriod === 'today') {
                const today = new Date();
                const isToday = betDate.getDate() === today.getDate() && betDate.getMonth() === today.getMonth() && betDate.getFullYear() === today.getFullYear();
                if (!isToday) return false;
            } else if (selectedPeriod === 'week') {
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (betDate < oneWeekAgo) return false;
            } else if (selectedPeriod === 'custom_date') {
                const targetStr = new Date(selectedDate).toISOString().split('T')[0];
                const betStr = betDate.toISOString().split('T')[0];
                if (targetStr !== betStr) return false;
            }
            return true;
        });
    }, [bets, searchTerm, selectedStatus, selectedBookmaker, selectedPeriod, selectedDate, profitFilter, minStake, marketFilter, typeFilter, currentDate]);

    const getBookmaker = (id: string) => bookmakers.find(b => b.id === id);

    const renderStatusIcon = (status: string) => {
        switch (status) {
            case 'Green': return <CheckCircle2 size={14} className="text-primary" />;
            case 'Red': return <XCircle size={14} className="text-danger" />;
            case 'Pendente': return <Clock size={14} className="text-amber-500" />;
            case 'Anulada': return <Ban size={14} className="text-gray-500" />;
            default: return <AlertCircle size={14} className="text-blue-500" />;
        }
    };

    const selectedBetForModal = useMemo(() =>
        bets.find(b => b.id === selectedBetId),
        [bets, selectedBetId]);

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            {/* Header, Filters Bar, Date Navigation (Same as before) */}
            {/* ... (rest of the component structure remains same up to results) */}

            {/* Results Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        Resultados encontrados
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-md text-xs font-mono">{filteredBets.length}</span>
                    </div>
                </div>

                {filteredBets.length === 0 ? (
                    <div className="bg-[#0d1421]/50 border-2 border-dashed border-white/5 rounded-3xl p-20 text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-700">
                            <SearchX size={48} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-white">Nenhuma aposta encontrada</p>
                            <p className="text-gray-500">Tente ajustar seus filtros para encontrar o que procura.</p>
                        </div>
                        <Button variant="outline" className="mt-2" onClick={() => {
                            setSearchTerm('');
                            setSelectedStatus('all');
                            setSelectedBookmaker('all');
                            setSelectedPeriod('month');
                        }}>Limpar Filtros</Button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                        {filteredBets.map(bet => {
                            const stats = calculateBetStats(bet);
                            const roi = stats.totalStake > 0 ? (stats.profit / stats.totalStake) * 100 : 0;
                            const bookie = getBookmaker(bet.mainBookmakerId);
                            const date = new Date(bet.date);

                            const promo = promotions.find(p => p.name === bet.promotionType);
                            const barColor = (promo && promo.name !== 'Nenhuma')
                                ? promo.color
                                : (statuses.find(s => s.name === bet.status)?.color || '#555');

                            return (
                                <Card
                                    key={bet.id}
                                    onClick={() => setSelectedBetId(bet.id)}
                                    className={`
                                        group relative overflow-hidden bg-[#151b2e]/40 border-white/5 hover:border-primary/30 transition-all duration-300 cursor-pointer active:scale-[0.99]
                                        ${viewMode === 'grid' ? 'p-5 flex flex-col' : 'p-4 flex flex-row items-center gap-8'}
                                    `}
                                >
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                                        style={{ backgroundColor: barColor }}
                                    />

                                    {/* Event Info */}
                                    <div className={`flex items-center gap-4 ${viewMode === 'grid' ? 'mb-4' : 'flex-none w-[20%]'}`}>
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0"
                                            style={{ backgroundColor: `${bookie?.color || '#333'}20`, border: `1px solid ${bookie?.color || '#333'}40` }}
                                        >
                                            {bookie?.logo ? (
                                                <img src={bookie.logo} alt="" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <BookOpen size={20} style={{ color: bookie?.color }} />
                                            )}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <h4 className="font-bold text-white group-hover:text-primary transition-colors truncate">{bet.event}</h4>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                                <span>{date.toLocaleDateString('pt-BR')}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                <span className="truncate">{bookie?.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financials - Well Separated */}
                                    <div className={`
                                        grid grid-cols-2 gap-4 
                                        ${viewMode === 'grid' ? 'mb-4 bg-white/5 p-3 rounded-xl' : 'flex-1 border-x border-white/5 px-8'}
                                    `}>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Investimento</p>
                                            <MoneyDisplay value={stats.totalStake} className="text-sm font-bold text-white" />
                                        </div>
                                        <div className="space-y-0.5 text-right">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Lucro Líquido</p>
                                            <MoneyDisplay
                                                value={stats.profit}
                                                className={`text-sm font-bold ${stats.profit >= 0 ? 'text-primary' : 'text-danger'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Status & ROI */}
                                    <div className={`flex items-center justify-between gap-6 ${viewMode === 'list' ? 'flex-none w-[220px]' : ''}`}>
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                                                {renderStatusIcon(bet.status)}
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-300">{bet.status}</span>
                                            </div>
                                            {bet.promotionType && bet.promotionType !== 'Nenhuma' && (
                                                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary py-0 px-2 self-start bg-primary/5">
                                                    {bet.promotionType}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className={`flex flex-col items-end px-3 py-1 rounded-xl bg-white/5 border border-white/5 ${roi >= 0 ? 'text-primary' : 'text-danger'}`}>
                                            <span className="text-[9px] font-bold uppercase opacity-60 tracking-widest">ROI %</span>
                                            <span className="text-base font-black leading-none">{roi.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bet Details Modal */}
            <Modal
                isOpen={!!selectedBetId}
                onClose={() => setSelectedBetId(null)}
                title="Detalhes da Aposta"
                size="lg"
            >
                {selectedBetForModal && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                    <Trophy size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">{selectedBetForModal.event}</h3>
                                    <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">{new Date(selectedBetForModal.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedBetForModal.status === 'Green' ? 'bg-primary/20 text-primary' :
                                    selectedBetForModal.status === 'Red' ? 'bg-danger/20 text-danger' :
                                        'bg-amber-500/20 text-amber-500'
                                    }`}>
                                    {selectedBetForModal.status}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Casa de Aposta</p>
                                <p className="text-white font-bold">{getBookmaker(selectedBetForModal.mainBookmakerId)?.name || 'N/A'}</p>
                            </div>
                            <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Promoção</p>
                                <p className="text-primary font-bold uppercase text-xs">{selectedBetForModal.promotionType}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Coberturas</p>
                            <div className="space-y-2">
                                {selectedBetForModal.coverages?.map((cov, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 group hover:bg-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[#05070e] rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">
                                                {cov.market?.substring(0, 1)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{cov.market}</p>
                                                <p className="text-[10px] text-gray-500">Odd: {cov.odd.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <MoneyDisplay value={cov.stake} className="text-sm font-bold text-white" />
                                            <p className={`text-[9px] font-bold uppercase ${cov.status === 'Green' ? 'text-primary' : 'text-danger'}`}>{cov.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedBetForModal.notes && (
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <StickyNote size={12} /> Notas da Aposta
                                </p>
                                <p className="text-gray-400 text-sm whitespace-pre-line leading-relaxed italic">"{selectedBetForModal.notes}"</p>
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/5">
                            <Button onClick={() => setSelectedBetId(null)} className="w-full">Fechar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default NewBets;
