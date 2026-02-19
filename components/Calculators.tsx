import React, { useState } from 'react';
import {
    HelpCircle, ChevronDown, Check, Trash2, Share2, History, Users, ClipboardList,
    Target, Zap, Gift, ShieldAlert, TrendingUp, AlertTriangle, Divide
} from 'lucide-react';
import { Card, Button, Input, Select, Dropdown } from './ui/UIComponents';

const TABS = [
    { id: 'arb-pro', label: 'ARB PRO', icon: <Target className="w-4 h-4" />, color: 'bg-purple-500', activeColor: 'text-purple-400' },
    { id: 'free-pro', label: 'FREE PRO', icon: <Zap className="w-4 h-4" />, color: 'bg-cyan-500', activeColor: 'text-cyan-400' },
    { id: 'surebet', label: 'Surebet', icon: <Divide className="w-4 h-4" />, color: 'bg-orange-500', activeColor: 'text-orange-400' },
    { id: 'freebet-triplo', label: '2 Back & 1 Lay', icon: <Gift className="w-4 h-4" />, color: 'bg-blue-500', activeColor: 'text-blue-400' },
    { id: 'freebet-3back', label: '3 Back', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-emerald-500', activeColor: 'text-emerald-400' },
    { id: 'freebet-lay', label: 'Freebet Lay', icon: <Gift className="w-4 h-4" />, color: 'bg-purple-500', activeColor: 'text-purple-400' },
    { id: 'shark', label: 'Aposta Segura', icon: <ShieldAlert className="w-4 h-4" />, color: 'bg-green-500', activeColor: 'text-green-400' },
    { id: 'odd-aumento', label: 'Odd Aumento', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-yellow-500', activeColor: 'text-yellow-400' },
    { id: 'lay-sem', label: 'Lay s/ Freebet', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-500', activeColor: 'text-red-400' },
    { id: 'handicap', label: 'HA Tabela', icon: <ClipboardList className="w-4 h-4" />, color: 'bg-teal-500', activeColor: 'text-teal-400' },
    { id: 'multipla-lay', label: 'Múltipla + Lay', icon: <Users className="w-4 h-4" />, color: 'bg-pink-500', activeColor: 'text-pink-400' },
    { id: 'multipla-freebet-lay', label: 'Múltipla FB + Lay', icon: <Gift className="w-4 h-4" />, color: 'bg-yellow-500', activeColor: 'text-yellow-400' }
];

const Calculators: React.FC = () => {
    const [activeTab, setActiveTab] = useState('arb-pro');
    const [numHouses, setNumHouses] = useState(3);
    const [rounding, setRounding] = useState('0.01');
    const [mainStake, setMainStake] = useState('100');

    // Placeholder data for bookmakers based on user HTML
    const [houses, setHouses] = useState([
        { id: 1, name: 'Casa 1 (Promo)', odd: '2.00', finalOdd: '2.00', stake: '100,00', profit: '-R$ 86,15' },
        { id: 2, name: 'Casa 2', odd: '2.10', finalOdd: '2.10', stake: '95,24', profit: '-R$ 86,15' },
        { id: 3, name: 'Casa 3', odd: '2.20', finalOdd: '2.20', stake: '90,91', profit: '-R$ 86,15' },
    ]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section from HTML */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-xl sm:text-3xl shadow-lg shrink-0">
                        🧮
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Calculadoras</h1>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1 hidden sm:block">Cálculos em tempo real com precisão garantida</p>
                    </div>
                </div>
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow hover:bg-primary/90 h-9 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white gap-2 text-xs sm:text-sm">
                    <ClipboardList className="w-4 h-4" />
                    Tutorial
                </button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                    💡 <strong>Funcionalidades:</strong> Todos os cálculos atualizam em tempo real. Use <strong>Copiar</strong> para área de transferência, <strong>Aplicar em Operação</strong> para preencher formulário automaticamente, ou <strong>Exportar</strong> para CSV.
                </p>
            </div>

            {/* Main Container */}
            <div className="rounded-xl border text-card-foreground bg-gradient-to-br from-[#1a1f35] to-[#0d1425] border-gray-800/50 shadow-2xl overflow-hidden">
                <div className="p-3 sm:p-4 md:p-6">
                    {/* Scrollable Tabs */}
                    <div className="flex items-center rounded-lg text-muted-foreground bg-gray-900/50 p-2 sm:p-3 mb-6 overflow-x-auto space-x-2 no-scrollbar">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 
                  text-xs sm:text-sm font-medium px-2 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-2 ring-offset-background
                  ${activeTab === tab.id
                                        ? `${tab.color} text-white shadow-md transform scale-105`
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }
                `}
                            >
                                {tab.label}
                                {tab.icon && <span className={`${activeTab === tab.id ? 'opacity-100' : 'opacity-50'}`}>{tab.icon}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        {activeTab === 'arb-pro' ? (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                {/* Header ARB PRO */}
                                <div className="border-l-4 border-purple-500 pl-4 py-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h2 className="text-2xl font-bold text-purple-400">ARB PRO</h2>
                                        <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow bg-green-500/20 text-green-400 border-green-500/30">
                                            Auto-Equilibrar
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mt-1">Sistema avançado de arbitragem com cálculo automático e distribuição inteligente de stakes</p>
                                </div>

                                {/* Configurations */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
                                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block font-bold">Número de Casas</label>
                                        <div className="relative">
                                            <select
                                                value={numHouses}
                                                onChange={(e) => setNumHouses(Number(e.target.value))}
                                                className="flex h-10 w-full items-center justify-between rounded-md border border-[#1e3a5f] bg-[#0a0f1e] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 hover:border-cyan-500 transition-colors appearance-none cursor-pointer"
                                            >
                                                <option value={2}>2 Casas</option>
                                                <option value={3}>3 Casas</option>
                                                <option value={4}>4 Casas</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
                                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block font-bold">Arredondamento</label>
                                        <div className="relative">
                                            <select
                                                value={rounding}
                                                onChange={(e) => setRounding(e.target.value)}
                                                className="flex h-10 w-full items-center justify-between rounded-md border border-[#1e3a5f] bg-[#0a0f1e] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 hover:border-cyan-500 transition-colors appearance-none cursor-pointer"
                                            >
                                                <option value="0.01">R$ 0,01</option>
                                                <option value="1.00">R$ 1,00</option>
                                                <option value="5.00">R$ 5,00</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Houses Inputs */}
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <h3 className="text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-2">
                                            Casas de Apostas
                                        </h3>
                                        <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                            {numHouses}/{numHouses} preenchidas
                                        </span>
                                    </div>

                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                                        {/* Dynamic Inputs based on numHouses */}
                                        {Array.from({ length: numHouses }).map((_, index) => (
                                            <div key={index} className="bg-[#0d1421] border rounded-xl p-5 transition-all border-[#1e3a5f] hover:border-cyan-500/50 shadow-sm hover:shadow-cyan-500/10 hover:-translate-y-1 duration-300">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-white font-bold text-lg">Casa {index + 1} {index === 0 && '(Promo)'}</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Anotação (casa, parceiro, etc.)"
                                                    className="w-full bg-[#0a0f1e]/50 border border-[#1e3a5f]/50 rounded-lg px-3 py-1.5 text-xs text-orange-400 font-bold placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none mb-4 transition-colors"
                                                />
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">ODD</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-[#0a0f1e] border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-white text-lg font-medium focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all text-center"
                                                            placeholder="2,00"
                                                            defaultValue={(2.00 + (index * 0.10)).toFixed(2)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">ODD Final</label>
                                                        <div className="w-full bg-[#0a0f1e]/50 border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-gray-400 text-lg flex items-center justify-center font-mono">
                                                            {(2.00 + (index * 0.10)).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Stake</label>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">R$</span>
                                                            <input
                                                                type="text"
                                                                className="w-full bg-[#0a0f1e] border rounded-lg pl-9 pr-3 py-2.5 text-white text-lg font-medium focus:outline-none border-[#1e3a5f] focus:border-cyan-500 transition-colors"
                                                                placeholder="0,00"
                                                                defaultValue={index === 0 ? "100" : ""}
                                                            />
                                                        </div>
                                                        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow py-2 h-11 px-4 font-bold uppercase text-sm rounded-lg bg-cyan-400 hover:bg-cyan-500 text-black hover:scale-105 active:scale-95">
                                                            BACK
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Toggles */}
                                                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs font-bold text-gray-400">
                                                    {/* Simplified Toggles visual only */}
                                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                                                        <div className="w-3 h-3 border border-gray-500 rounded-sm"></div> ZERAR
                                                    </div>
                                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                                                        <div className="w-3 h-3 border border-gray-500 rounded-sm"></div> COMISSÃO
                                                    </div>
                                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                                                        <div className="w-3 h-3 border border-gray-500 rounded-sm"></div> FREEBET
                                                    </div>
                                                </div>

                                                <button className="w-full rounded-md text-xs transition-colors border bg-transparent shadow-sm h-8 font-bold uppercase border-[#1e3a5f] text-gray-400 hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10">
                                                    FIXAR STAKE
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Results Section */}
                                <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-xl p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none"></div>
                                    <h3 className="text-white font-semibold mb-6 text-lg border-b border-[#1e3a5f] pb-2">Resultados</h3>
                                    <div className="flex flex-wrap items-center justify-center gap-8 mb-8 py-6 border-b border-[#1e3a5f]/50">
                                        <div className="text-center p-4 rounded-xl bg-[#0a0f1e] border border-[#1e3a5f]">
                                            <p className="text-3xl font-bold text-white tracking-tight">R$ 286,15</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Total Investido</p>
                                        </div>
                                        <div className="text-center p-4 rounded-xl bg-[#0a0f1e] border border-red-500/20">
                                            <p className="text-3xl font-bold text-red-400 tracking-tight">-30.11%</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">ROI Médio</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-lg border border-[#1e3a5f]">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 text-left">
                                                    <th className="py-3 px-4 text-cyan-200 uppercase text-xs font-bold tracking-wider">Casa</th>
                                                    <th className="text-center py-3 px-4 text-cyan-200 uppercase text-xs font-bold tracking-wider">ODD</th>
                                                    <th className="text-center py-3 px-4 text-cyan-200 uppercase text-xs font-bold tracking-wider">Stake</th>
                                                    <th className="text-right py-3 px-4 text-cyan-200 uppercase text-xs font-bold tracking-wider">Lucro</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#1e3a5f]">
                                                {houses.map((house) => (
                                                    <tr key={house.id} className="hover:bg-[#1e3a5f]/30 transition-colors">
                                                        <td className="py-4 px-4 text-white font-medium">{house.name}</td>
                                                        <td className="py-4 px-4 text-center text-gray-300 font-mono">{house.odd}</td>
                                                        <td className="py-4 px-4 text-center text-white font-mono bg-white/5 mx-2 rounded">R$ {house.stake}</td>
                                                        <td className="py-4 px-4 text-right font-bold text-red-400 font-mono">{house.profit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="flex flex-wrap justify-center gap-4 pt-4">
                                    <button className="flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-all shadow hover:shadow-purple-500/25 h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-lg active:scale-95">
                                        <ClipboardList className="w-4 h-4" />
                                        PRÉ-REGISTRO
                                    </button>
                                    <button className="flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-all shadow hover:shadow-blue-500/25 h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold px-6 py-2.5 rounded-lg active:scale-95">
                                        <Users className="w-4 h-4" />
                                        MULTI
                                    </button>
                                    <button className="flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-all border shadow-sm hover:text-white h-10 border-[#1e3a5f] bg-[#0d1421] text-gray-300 hover:bg-[#1e3a5f] hover:border-red-500/50 hover:text-red-400 font-bold px-6 py-2.5 rounded-lg active:scale-95">
                                        <Trash2 className="w-4 h-4" />
                                        LIMPAR DADOS
                                    </button>
                                    <button className="flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-all border shadow-sm h-10 border-[#1e3a5f] bg-[#0d1421] text-cyan-400 hover:bg-[#1e3a5f] hover:text-cyan-300 hover:border-cyan-500/50 font-bold px-6 py-2.5 rounded-lg active:scale-95">
                                        <Share2 className="w-4 h-4" />
                                        COMPARTILHAR
                                    </button>
                                    <button className="flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-all border shadow-sm h-10 border-[#1e3a5f] bg-[#0d1421] text-gray-300 hover:bg-[#1e3a5f] hover:text-white font-bold px-6 py-2.5 rounded-lg active:scale-95">
                                        <History className="w-4 h-4" />
                                        HISTÓRICO (0)
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Placeholder for other tabs
                            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95">
                                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                                    <div className="text-gray-600">
                                        {TABS.find(t => t.id === activeTab)?.icon || <Zap />}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-300 mb-2">
                                    {TABS.find(t => t.id === activeTab)?.label}
                                </h3>
                                <p className="text-gray-500 max-w-md text-center">
                                    Esta calculadora estará disponível em breve. Estamos trabalhando para trazer as melhores ferramentas para você.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Hint */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                <Check className="text-green-400 w-5 h-5 shrink-0" />
                <p className="text-sm text-green-300">
                    <strong>Dica:</strong> Todas as calculadoras salvam automaticamente o histórico dos últimos 5 cálculos. Os valores ficam disponíveis mesmo após fechar o navegador.
                </p>
            </div>
        </div>
    );
};

export default Calculators;
