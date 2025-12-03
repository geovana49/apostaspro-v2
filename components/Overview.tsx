import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Trophy, Wallet, Activity, Calendar, Infinity, Filter, DollarSign, Target, Eye, EyeOff, StickyNote } from 'lucide-react';
import { Card, Dropdown, Input, MoneyDisplay } from './ui/UIComponents';
import { Bet, ExtraGain, AppSettings } from '../types';

interface OverviewProps {
    bets: Bet[];
    gains: ExtraGain[];
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const Overview: React.FC<OverviewProps> = ({ bets, gains, settings, setSettings }) => {
    const [period, setPeriod] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Period Options with Icons
    const periodOptions = [
        { label: 'Hoje', value: 'today', icon: <Calendar size={16} /> },
        { label: 'Esta Semana', value: 'week', icon: <Calendar size={16} /> },
        { label: 'Este Mês', value: 'month', icon: <Calendar size={16} /> },
        { label: 'Personalizado', value: 'custom', icon: <Calendar size={16} /> },
        { label: 'Todo o Período', value: 'all', icon: <Infinity size={16} /> },
    ];

    // --- Filtering Logic ---
    const getFilteredBets = () => {
        const now = new Date();

        return bets.filter(bet => {
            const betDate = new Date(bet.date);
            const betDay = new Date(betDate.getFullYear(), betDate.getMonth(), betDate.getDate());
            const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            switch (period) {
                case 'today':
                    return betDay.getTime() === currentDay.getTime();
                case 'week':
                    const oneWeekAgo = new Date(currentDay);
                    oneWeekAgo.setDate(currentDay.getDate() - 7);
                    return betDay >= oneWeekAgo && betDay <= currentDay;
                case 'month':
                    return betDate.getMonth() === now.getMonth() && betDate.getFullYear() === now.getFullYear();
                case 'custom':
                    if (!startDate && !endDate) return true;
                    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
                    const startDay = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
                    const end = endDate ? new Date(endDate) : new Date('2100-01-01');
                    const endDay = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
                    return betDay >= startDay && betDay <= endDay;
                case 'all':
                default:
                    return true;
            }
        });
    };

    const getFilteredGains = () => {
        const now = new Date();

        return gains.filter(gain => {
            const gainDate = new Date(gain.date);
            const gainDay = new Date(gainDate.getFullYear(), gainDate.getMonth(), gainDate.getDate());
            const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            switch (period) {
                case 'today':
                    return gainDay.getTime() === currentDay.getTime();
                case 'week':
                    const oneWeekAgo = new Date(currentDay);
                    oneWeekAgo.setDate(currentDay.getDate() - 7);
                    return gainDay >= oneWeekAgo && gainDay <= currentDay;
                case 'month':
                    return gainDate.getMonth() === now.getMonth() && gainDate.getFullYear() === now.getFullYear();
                case 'custom':
                    if (!startDate && !endDate) return true;
                    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
                    const startDay = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
                    const end = endDate ? new Date(endDate) : new Date('2100-01-01');
                    const endDay = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
                    // FIX: Used betDay instead of gainDay
                    return gainDay >= startDay && gainDay <= endDay;
                case 'all':
                default:
                    return true;
            }
        });
    };

    const filteredBets = getFilteredBets();
    const filteredGains = getFilteredGains();

    // --- Calculations ---
    const calculateMetrics = () => {
        // Total staked in the period, including pending bets. For the "Total Apostado" card.
        const totalStakedInPeriod = filteredBets.reduce((acc, bet) => {
            const isFreebetConversion = bet.promotionType?.toLowerCase().includes('conversão freebet');
            return acc + bet.coverages.reduce((sum, c, index) => {
                if (isFreebetConversion && index === 0) return sum;
                return sum + c.stake;
            }, 0);
        }, 0);

        const resolvedBets = filteredBets
            .filter(b => !['Pendente', 'Rascunho'].includes(b.status))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let cumulativeProfit = 0;
        let resolvedStaked = 0;
        let resolvedReturned = 0;

        const chartData = resolvedBets.map(bet => {
            let betStake = 0;
            let betReturn = 0;
            const isFreebetConversion = bet.promotionType?.toLowerCase().includes('conversão freebet');

            bet.coverages.forEach((cov, index) => {
                // Stake logic
                if (!(isFreebetConversion && index === 0)) {
                    betStake += cov.stake;
                }

                // Return logic
                let covReturn = 0;
                if (cov.manualReturn !== undefined && cov.manualReturn !== null) {
                    covReturn = Number(cov.manualReturn);
                } else {
                    if (cov.status === 'Green') covReturn = (cov.stake * cov.odd);
                    else if (cov.status === 'Meio Green') covReturn = (cov.stake * cov.odd) / 2 + (cov.stake / 2);
                    else if (cov.status === 'Anulada' || cov.status === 'Cashout') covReturn = cov.stake;
                    else if (cov.status === 'Meio Red') covReturn = cov.stake / 2;
                    // For Red, return is 0

                    // For freebet conversions, subtract stake from first coverage return (only for auto-calc)
                    if (isFreebetConversion && index === 0 && covReturn > 0) {
                        covReturn -= cov.stake;
                    }
                }

                betReturn += covReturn;
            });

            resolvedStaked += betStake;
            resolvedReturned += betReturn;

            const betProfit = betReturn - betStake;
            cumulativeProfit += betProfit;

            return {
                date: new Date(bet.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                profit: cumulativeProfit,
                value: betProfit
            };
        });

        const totalProfit = resolvedReturned - resolvedStaked;
        const roi = resolvedStaked > 0 ? (totalProfit / resolvedStaked) * 100 : 0;

        const betNotesCount = filteredBets.filter(b => b.notes && b.notes.trim()).length;
        const totalNotesCount = betNotesCount;

        return { totalStaked: resolvedStaked, totalReturned: resolvedReturned, netProfit: totalProfit, roi, chartData, totalNotesCount };
    };


    const { totalStaked, totalReturned, netProfit, roi, chartData, totalNotesCount } = calculateMetrics();

    const isProfitPositive = netProfit >= 0;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 pb-2">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Resumo Financeiro</h2>
                    <p className="text-textMuted text-sm mt-1">Acompanhe o desempenho da sua banca.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full lg:w-auto">
                    {period === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 w-full sm:w-auto bg-[#151b2e] p-1.5 rounded-lg border border-white/10">
                            <div className="w-full sm:w-32">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="py-1.5 text-xs bg-transparent border-none"
                                />
                            </div>
                            <span className="text-gray-500">-</span>
                            <div className="w-full sm:w-32">
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="py-1.5 text-xs bg-transparent border-none"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button className="p-2.5 rounded-lg bg-[#0d1121] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors hidden sm:block shadow-sm hover:shadow-md hover:-translate-y-0.5 transform duration-200 group">
                            <Filter size={18} className="group-hover:text-primary transition-colors" />
                        </button>
                        <div className="w-full sm:w-48 z-20">
                            <Dropdown
                                options={periodOptions}
                                value={period}
                                onChange={setPeriod}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Hero Card - Net Profit - 3D Effect with Colored Shadow */}
                <div className={`
            col-span-1 md:col-span-3 rounded-2xl p-6 lg:p-8 text-[#090c19] 
            transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) relative overflow-hidden group
            hover:-translate-y-2 hover:scale-[1.01]
            ${netProfit >= 0
                        ? 'bg-gradient-to-br from-[#17baa4] to-[#129683] shadow-[0_10px_30px_-5px_rgba(23,186,164,0.4)] hover:shadow-[0_25px_60px_-10px_rgba(23,186,164,0.6)]'
                        : 'bg-gradient-to-br from-[#FF5252] to-[#E04040] shadow-[0_10px_30px_-5px_rgba(255,82,82,0.4)] hover:shadow-[0_25px_60px_-10px_rgba(255,82,82,0.6)]'
                    }
        `}>
                    {/* Sheen Effect - Light passing through */}
                    <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-15deg] animate-sheen pointer-events-none" />

                    {/* 3D Light Reflection */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none transition-transform duration-700 group-hover:translate-x-10 group-hover:translate-y-10" />

                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[180px]">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 opacity-80">
                                    <Wallet size={18} className="animate-pulse-scale" />
                                    <span className="font-bold text-xs uppercase tracking-wider text-[#090c19]">Lucro Líquido</span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter py-1 sm:py-2 text-[#090c19] drop-shadow-sm whitespace-nowrap">
                                        <MoneyDisplay
                                            value={Math.abs(netProfit)}
                                            privacyMode={settings.privacyMode}
                                            prefix="R$"
                                        />
                                    </h2>
                                    {/* Privacy Toggle - Moved near the number */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSettings(prev => ({ ...prev, privacyMode: !prev.privacyMode })); }}
                                        className="p-1.5 sm:p-2 rounded-full hover:bg-[#090c19]/10 text-[#090c19] transition-all cursor-pointer z-20 relative shrink-0"
                                        title={settings.privacyMode ? "Mostrar Valores" : "Ocultar Valores"}
                                    >
                                        {settings.privacyMode ? <EyeOff size={20} className="sm:w-6 sm:h-6" /> : <Eye size={20} className="sm:w-6 sm:h-6" />}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-[#090c19]/10 px-3 py-1 rounded-full backdrop-blur-sm border border-[#090c19]/5 shadow-sm hover:bg-[#090c19]/20 transition-colors whitespace-nowrap">
                                <p className="text-xs font-bold opacity-80 flex items-center gap-1">
                                    <Calendar size={10} />
                                    {periodOptions.find(o => o.value === period)?.label}
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#090c19]/20 rounded-xl p-4 backdrop-blur-md mt-4 border border-[#090c19]/5 shadow-inner transition-transform duration-300 group-hover:translate-y-[-2px]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold opacity-75 uppercase tracking-wide">Eficiência (ROI)</span>
                                <span className="font-bold font-mono text-lg">
                                    {settings.privacyMode ? '•••%' : `${roi.toFixed(2)}%`}
                                </span>
                            </div>
                            {/* Custom Progress Bar */}
                            <div className="h-1.5 w-full bg-[#090c19]/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full shadow-sm transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(Math.abs(roi) * 5, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Staked */}
                <Card className="p-6 flex flex-col justify-between min-h-[120px] group bg-[#151b2e]">
                    <div>
                        <p className="text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Total Apostado</p>
                        <div className="flex items-center justify-between">
                            <h4 className="text-2xl font-bold text-white tracking-tight">
                                <MoneyDisplay value={totalStaked} privacyMode={settings.privacyMode} />
                            </h4>
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-textMuted group-hover:text-primary transition-all duration-500 group-hover:bg-primary/10 group-hover:rotate-12 group-hover:scale-110 shadow-inner">
                                <DollarSign size={20} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Returned */}
                <Card className="p-6 flex flex-col justify-between min-h-[120px] group bg-[#151b2e]">
                    <div>
                        <p className="text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Total Retornado</p>
                        <div className="flex items-center justify-between">
                            <h4 className="text-2xl font-bold text-white tracking-tight">
                                <MoneyDisplay value={totalReturned} privacyMode={settings.privacyMode} />
                            </h4>
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-textMuted group-hover:text-primary transition-all duration-500 group-hover:bg-primary/10 group-hover:rotate-[-12deg] group-hover:scale-110 shadow-inner">
                                <Target size={20} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Notes */}
                <Card className="p-6 flex flex-col justify-between min-h-[120px] group bg-[#151b2e]">
                    <div>
                        <p className="text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Anotações de Apostas</p>
                        <div className="flex items-center justify-between">
                            <h4 className="text-2xl font-bold text-white tracking-tight">
                                {settings.privacyMode ? '••' : totalNotesCount}
                            </h4>
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-textMuted group-hover:text-secondary transition-all duration-500 group-hover:bg-secondary/10 group-hover:rotate-[-6deg] group-hover:scale-110 shadow-inner">
                                <StickyNote size={20} />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Best Months */}
                <Card className="p-6 bg-[#151b2e] group">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-1.5 rounded-md bg-secondary/10 text-secondary group-hover:bg-secondary/20 transition-colors">
                            <Trophy size={16} className="animate-pulse-slow" />
                        </div>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">Meses Mais Lucrativos</h3>
                    </div>

                    <div className="border border-dashed border-white/10 rounded-xl h-[200px] flex flex-col items-center justify-center bg-white/[0.02] gap-2 hover:bg-white/[0.04] transition-colors cursor-default group/empty">
                        <Trophy className="text-white/10 group-hover/empty:text-white/20 transition-colors animate-float" size={32} />
                        <span className="text-gray-500 text-xs font-medium">Sem histórico suficiente para análise</span>
                    </div>
                </Card>

                {/* Evolution Chart */}
                <Card className="p-6 bg-[#151b2e] group">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                            <TrendingUp size={16} className="animate-pulse-slow" />
                        </div>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">Evolução da Banca</h3>
                    </div>

                    <div className="w-full">
                        <div className="w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" aspect={2.5}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#17baa4" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#17baa4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={10}
                                            tickFormatter={(value) => settings.privacyMode ? '•••' : `R$${value}`}
                                            tickLine={false}
                                            axisLine={false}
                                            width={60}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#151b2e', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#17baa4', fontWeight: 'bold' }}
                                            formatter={(value: number) => [settings.privacyMode ? 'R$ ••••' : formatCurrency(value), 'Lucro']}
                                            cursor={{ stroke: '#334155', strokeWidth: 1 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="profit"
                                            stroke="#17baa4"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorProfit)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[200px] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center bg-white/[0.02] gap-2 hover:bg-white/[0.04] transition-colors group/empty">
                                    <Activity className="text-white/10 group-hover/empty:text-white/20 transition-colors animate-float" size={32} />
                                    <span className="text-gray-500 text-xs font-medium">Sem dados no período selecionado</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Overview;