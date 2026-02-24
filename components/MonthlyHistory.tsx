import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, DollarSign, Target, Activity, Trophy, ChevronLeft, ChevronRight, ArrowUpRight, Ticket, Coins } from 'lucide-react';
import { Card, MoneyDisplay, Modal } from './ui/UIComponents';
import { Bet, ExtraGain, AppSettings } from '../types';
import { calculateBetStats } from '../utils/betCalculations';

interface MonthlyHistoryProps {
    bets: Bet[];
    gains: ExtraGain[];
    settings: AppSettings;
}

const MonthlyHistory: React.FC<MonthlyHistoryProps> = ({ bets, gains, settings }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [detailMonth, setDetailMonth] = useState<number | null>(null);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // --- Calculations ---
    const yearlyStats = useMemo(() => {
        const monthlyData: Record<number, {
            ops: number,
            staked: number,
            grossGain: number,
            netProfit: number,
            roi: number,
            items: (Bet | ExtraGain)[]
        }> = {};

        // Initialize months
        for (let i = 0; i < 12; i++) {
            monthlyData[i] = { ops: 0, staked: 0, grossGain: 0, netProfit: 0, roi: 0, items: [] };
        }

        // Filter and aggregate bets
        bets.forEach(bet => {
            const dateStr = bet.date.includes('T') ? bet.date.split('T')[0] : bet.date;
            const [y, m, d] = dateStr.split('-').map(Number);
            const betDate = new Date(y, m - 1, d);

            if (betDate.getFullYear() === selectedYear) {
                if (['Pendente', 'Rascunho'].includes(bet.status)) return;

                const month = betDate.getMonth();
                const stats = calculateBetStats(bet);

                monthlyData[month].ops += 1;
                monthlyData[month].staked += stats.totalStake;
                monthlyData[month].grossGain += stats.totalReturn;
                monthlyData[month].netProfit += stats.profit;
                monthlyData[month].items.push(bet);
            }
        });

        // Add Gains (ExtraGains) - Standalone gains are still tracked in components state
        // but Overview logic previously excluded them from global ROI to focus on "Betting Strategy".
        // Here we keep them excluded to match Overview, but they are in the 'gains' prop.

        // Calculate Year Totals
        const yearSummary = Object.values(monthlyData).reduce((acc, curr) => ({
            ops: acc.ops + curr.ops,
            staked: acc.staked + curr.staked,
            grossGain: acc.grossGain + curr.grossGain,
            netProfit: acc.netProfit + curr.netProfit,
        }), { ops: 0, staked: 0, grossGain: 0, netProfit: 0 });

        const yearRoi = yearSummary.staked > 0 ? (yearSummary.netProfit / yearSummary.staked) * 100 : 0;

        // Finalize monthly ROIs
        Object.keys(monthlyData).forEach(m => {
            const month = Number(m);
            if (monthlyData[month].staked > 0) {
                monthlyData[month].roi = (monthlyData[month].netProfit / monthlyData[month].staked) * 100;
            }
        });

        return { monthlyData, yearSummary: { ...yearSummary, roi: yearRoi } };
    }, [bets, selectedYear]);

    const { monthlyData, yearSummary } = yearlyStats;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Year Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Histórico Mensal</h2>
                    <p className="text-textMuted text-sm mt-1">Sua evolução financeira detalhada por mês.</p>
                </div>

                <div className="flex items-center gap-2 bg-[#151b2e] p-1 rounded-xl border border-white/10 shadow-lg">
                    <button
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-4 py-1.5 bg-primary/10 rounded-lg border border-primary/20 text-primary font-bold text-sm">
                        {selectedYear}
                    </div>
                    <button
                        onClick={() => setSelectedYear(prev => prev + 1)}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Year Summary Card */}
            <div className="relative group">
                <div className={`
                    absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500
                    ${yearSummary.netProfit >= 0 ? 'bg-primary' : 'bg-red-500'}
                `}></div>
                <Card className="relative p-6 sm:p-8 bg-[#0d1121] border-white/5 overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Trophy size={160} />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Operações</p>
                            <p className="text-2xl font-bold text-white">{yearSummary.ops}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Investimento</p>
                            <p className="text-2xl font-bold text-white">
                                <MoneyDisplay value={yearSummary.staked} privacyMode={settings.privacyMode} />
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Retorno Bruto</p>
                            <p className="text-2xl font-bold text-white">
                                <MoneyDisplay value={yearSummary.grossGain} privacyMode={settings.privacyMode} />
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Lucro Líquido</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-2xl font-bold ${yearSummary.netProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                    <MoneyDisplay value={yearSummary.netProfit} privacyMode={settings.privacyMode} />
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold bg-white/5 ${yearSummary.roi >= 0 ? 'text-primary/70' : 'text-red-500/70'}`}>
                                    {yearSummary.roi.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Monthly Grid - Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {monthNames.map((name, index) => {
                    const data = monthlyData[index];
                    const isProfit = data.netProfit >= 0;
                    const hasData = data.ops > 0;
                    const isCurrentMonth = new Date().getMonth() === index && new Date().getFullYear() === selectedYear;

                    return (
                        <Card
                            key={index}
                            onClick={() => hasData && setDetailMonth(index)}
                            className={`p-6 transition-all duration-300 bg-[#151b2e] border-white/5 group relative
                                ${isCurrentMonth
                                    ? 'ring-2 ring-primary border-primary/40 shadow-[0_0_25px_rgba(23,186,164,0.25)]'
                                    : hasData
                                        ? 'ring-2 ring-primary/30 border-primary/20 shadow-[0_0_15px_rgba(23,186,164,0.15)]'
                                        : 'opacity-70 border-white/5 cursor-default'
                                }
                                ${hasData ? 'hover:scale-[1.01] cursor-pointer hover:shadow-[0_0_30px_rgba(23,186,164,0.25)] hover:ring-primary/50' : ''}
                            `}
                        >
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold text-xl leading-none ${isCurrentMonth ? 'text-primary' : 'text-white'}`}>
                                                {name}
                                            </h3>
                                            {isCurrentMonth && (
                                                <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Mês Atual</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{selectedYear}</span>
                                    </div>
                                    <div className="bg-[#0d1121] border border-white/5 px-2 py-1 rounded text-[11px] font-bold text-gray-400">
                                        {data.ops} OPS
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center text-sm">
                                            <p className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                <span className="text-[#00f7ff]">$</span> Total Apostado
                                            </p>
                                            <p className="font-bold text-[#00f7ff] whitespace-nowrap">
                                                <MoneyDisplay value={data.staked} privacyMode={settings.privacyMode} />
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <p className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                <span className="text-[#ff00e6]">◎</span> Total Ganho
                                            </p>
                                            <p className="font-bold text-[#ff00e6] whitespace-nowrap">
                                                <MoneyDisplay value={data.grossGain} privacyMode={settings.privacyMode} />
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/5 w-full my-2" />

                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                <Coins size={10} /> Lucro Líquido
                                            </p>
                                            <p className={`text-xl font-bold ${isProfit ? 'text-primary' : 'text-red-500'} whitespace-nowrap`}>
                                                <MoneyDisplay value={data.netProfit} privacyMode={settings.privacyMode} />
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mb-1">ROI</p>
                                            <p className={`text-lg font-black ${isProfit ? 'text-white' : 'text-red-400'} whitespace-nowrap`}>
                                                {data.roi.toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>

                                    {hasData && (
                                        <div className="pt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center group-hover:text-primary transition-colors">
                                            Clique para ver detalhes
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Details Modal */}
            <Modal
                isOpen={detailMonth !== null}
                onClose={() => setDetailMonth(null)}
                title={`Operações de ${detailMonth !== null ? monthNames[detailMonth] : ''} ${selectedYear}`}
                maxW="max-w-3xl"
            >
                <div className="space-y-3">
                    {detailMonth !== null && monthlyData[detailMonth].items.length > 0 ? (
                        monthlyData[detailMonth].items.map((item, i) => {
                            const isBet = 'coverages' in item;
                            const stats = isBet ? calculateBetStats(item as Bet) : null;
                            const profit = isBet ? stats?.profit : (item as ExtraGain).amount;
                            const roi = isBet ? ((stats?.profit || 0) / (stats?.totalStake || 1)) * 100 : 100;
                            const isPositive = (profit || 0) >= 0;

                            return (
                                <div key={i} className="bg-[#0d1121] border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-lg ${isPositive ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                                            {isBet ? <Ticket size={20} /> : <Coins size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                                {isBet ? (item as Bet).event : (item as ExtraGain).origin}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                    {isBet
                                                        ? ((item as Bet).coverages?.[0]?.market || 'Aposta')
                                                        : 'Ganho Extra'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right whitespace-nowrap">
                                        <p className={`text-base font-bold ${isPositive ? 'text-primary' : 'text-red-500'}`}>
                                            <MoneyDisplay value={profit || 0} privacyMode={settings.privacyMode} />
                                        </p>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <p className="text-[10px] font-bold text-gray-400">
                                                {isBet ? `${roi.toFixed(1)}% ROI` : '+100%'}
                                            </p>
                                            <p className="text-[9px] font-medium text-gray-600 uppercase tracking-tighter">
                                                {isBet ? (item as Bet).mainBookmakerId : (item as ExtraGain).status}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center">
                            <Activity size={48} className="mx-auto text-gray-800 mb-4" />
                            <p className="text-gray-500 font-medium">Nenhuma operação encontrada neste mês.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div >
    );
};

export default MonthlyHistory;
