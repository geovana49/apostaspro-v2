import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, DollarSign, Target, Activity, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, MoneyDisplay } from './ui/UIComponents';
import { Bet, ExtraGain, AppSettings } from '../types';
import { calculateBetStats } from '../utils/betCalculations';

interface MonthlyHistoryProps {
    bets: Bet[];
    gains: ExtraGain[];
    settings: AppSettings;
}

const MonthlyHistory: React.FC<MonthlyHistoryProps> = ({ bets, gains, settings }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
            roi: number
        }> = {};

        // Initialize months
        for (let i = 0; i < 12; i++) {
            monthlyData[i] = { ops: 0, staked: 0, grossGain: 0, netProfit: 0, roi: 0 };
        }

        // Filter and aggregate bets
        bets.forEach(bet => {
            // Robust parsing to avoid timezone shifts
            const dateStr = bet.date.includes('T') ? bet.date.split('T')[0] : bet.date;
            const [y, m, d] = dateStr.split('-').map(Number);
            const betDate = new Date(y, m - 1, d);

            if (betDate.getFullYear() === selectedYear) {
                // Ignore Pending and Drafts for financial history
                if (['Pendente', 'Rascunho'].includes(bet.status)) return;

                const month = betDate.getMonth();
                const stats = calculateBetStats(bet);

                monthlyData[month].ops += 1;
                monthlyData[month].staked += stats.totalStake;
                monthlyData[month].grossGain += stats.totalReturn;
                monthlyData[month].netProfit += stats.profit;
            }
        });

        // Add Gains (ExtraGains)
        gains.forEach(gain => {
            const dateStr = gain.date.includes('T') ? gain.date.split('T')[0] : gain.date;
            const [y, m, d] = dateStr.split('-').map(Number);
            const gainDate = new Date(y, m - 1, d);

            if (gainDate.getFullYear() === selectedYear) {
                // Ignore Pending or Cancelled gains
                if (['Pendente', 'Cancelado'].includes(gain.status)) return;

                const month = gainDate.getMonth();
                monthlyData[month].ops += 1;
                monthlyData[month].grossGain += gain.amount;
                monthlyData[month].netProfit += gain.amount;
            }
        });

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
    }, [bets, gains, selectedYear]);

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

            {/* Year Summary Card - Premium Design */}
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

            {/* Monthly Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {monthNames.map((name, index) => {
                    const data = monthlyData[index];
                    const isProfit = data.netProfit >= 0;
                    const hasData = data.ops > 0;
                    const isCurrentMonth = new Date().getMonth() === index && new Date().getFullYear() === selectedYear;

                    return (
                        <Card
                            key={index}
                            className={`p-5 transition-all duration-300 hover:scale-[1.02] bg-[#151b2e] border-white/5 group
                                ${isCurrentMonth ? 'ring-2 ring-primary/30 border-primary/20' : ''}
                                ${!hasData ? 'opacity-50 hover:opacity-100' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className={`font-bold text-lg leading-none ${isCurrentMonth ? 'text-primary' : 'text-white'}`}>
                                        {name}
                                    </h3>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{selectedYear}</span>
                                </div>
                                <div className={`p-2 rounded-lg ${isProfit ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                                    <TrendingUp size={16} className={hasData ? '' : 'opacity-20'} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Lucro Líquido</p>
                                        <p className={`text-lg font-bold ${isProfit ? 'text-primary' : 'text-red-500'}`}>
                                            <MoneyDisplay value={data.netProfit} privacyMode={settings.privacyMode} />
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ROI</p>
                                        <p className={`text-sm font-black ${isProfit ? 'text-primary/60' : 'text-red-500/60'}`}>
                                            {data.roi.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                {/* Mini Indicator Bar */}
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    {hasData && (
                                        <div
                                            className={`h-full transition-all duration-1000 ${isProfit ? 'bg-primary' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(Math.abs(data.roi || 0) * 3, 100)}%` }}
                                        />
                                    )}
                                </div>

                                <div className="pt-2 flex justify-between items-center border-t border-white/5">
                                    <div className="flex items-center gap-1.5">
                                        <Activity size={12} className="text-gray-500" />
                                        <span className="text-[11px] font-bold text-gray-400">{data.ops} Ops</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <DollarSign size={12} className="text-gray-500" />
                                        <span className="text-[11px] font-bold text-gray-400">
                                            <MoneyDisplay value={data.staked} privacyMode={settings.privacyMode} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthlyHistory;
