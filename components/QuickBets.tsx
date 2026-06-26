import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap, UploadCloud, Trash2, Image as ImageIcon, Sparkles, Calculator,
  AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight, Eye, X, Calendar, Plus, Trash
} from 'lucide-react';
import { Bet, Bookmaker, StatusItem, PromotionItem, AppSettings, User, Coverage } from '../types';
import { Card, Button, Input, Dropdown, MoneyDisplay, Badge, Modal, BookmakerLogo } from './ui/UIComponents';
import { FireImage } from './ui/FireImage';
import { FirestoreService } from '../services/firestoreService';
import { calculateBetStats } from '../utils/betCalculations';

interface QuickBetsProps {
  bets: Bet[];
  setBets: React.Dispatch<React.SetStateAction<Bet[]>>;
  bookmakers: Bookmaker[];
  statuses: StatusItem[];
  promotions: PromotionItem[];
  settings: AppSettings;
  currentUser: User | null;
}

type QuickBetTab = 'matched' | 'freebet' | 'manual';

interface TempPhoto {
  id: string;
  base64: string;
  name: string;
}

export const QuickBets: React.FC<QuickBetsProps> = ({
  bets,
  setBets,
  bookmakers,
  statuses,
  promotions,
  settings,
  currentUser
}) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<QuickBetTab>('matched');

  // Common Form States
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mainBookmakerId, setMainBookmakerId] = useState('');
  const [promoType, setPromoType] = useState('Nenhuma');
  const [notes, setNotes] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  
  // Image Upload States
  const [tempPhotos, setTempPhotos] = useState<TempPhoto[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab 1: Matched Betting States
  const [mainOdd, setMainOdd] = useState('');
  const [mainStake, setMainStake] = useState('');
  const [coverBookmakerId, setCoverBookmakerId] = useState('');
  const [coverOdd, setCoverOdd] = useState('');
  const [coverStake, setCoverStake] = useState('');
  const [matchedWinner, setMatchedWinner] = useState<'main' | 'cover' | null>(null);

  // Tab 2: Freebet / Free Spins States
  const [freebetType, setFreebetType] = useState<'sports' | 'casino'>('sports');
  const [fbStake, setFbStake] = useState('');
  const [fbOdd, setFbOdd] = useState('');
  const [fbCoverStake, setFbCoverStake] = useState('');
  const [fbCoverOdd, setFbCoverOdd] = useState('');
  const [fbWinner, setFbWinner] = useState<'main' | 'cover' | null>(null);
  const [casinoReturn, setCasinoReturn] = useState('');
  const [casinoCost, setCasinoCost] = useState('');

  // Tab 3: Manual Profit/Loss States
  const [manualResultType, setManualResultType] = useState<'profit' | 'loss'>('profit');
  const [manualValue, setManualValue] = useState('');

  // History State
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);

  // Set default bookmakers on load
  useEffect(() => {
    if (bookmakers.length > 0) {
      setMainBookmakerId(bookmakers[0].id);
      if (bookmakers.length > 1) {
        setCoverBookmakerId(bookmakers[1].id);
      } else {
        setCoverBookmakerId(bookmakers[0].id);
      }
    }
  }, [bookmakers]);

  // Support pasting image from clipboard (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setTempPhotos(prev => [
              ...prev,
              {
                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                base64,
                name: `print_copiado_${prev.length + 1}.png`
              }
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Register global drop handler
  useLayoutEffect(() => {
    (window as any).onApostasProDrop = (files: FileList) => {
      if (files && files.length > 0) {
        Array.from(files).forEach((file: any) => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              setTempPhotos(prev => [
                ...prev,
                {
                  id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  base64,
                  name: file.name
                }
              ]);
            };
            reader.readAsDataURL(file);
          }
        });
      }
    };
    return () => {
      (window as any).onApostasProDrop = null;
    };
  }, []);

  // Handle Drag & Drop Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: any) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setTempPhotos(prev => [
              ...prev,
              {
                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                base64,
                name: file.name
              }
            ]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: any) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setTempPhotos(prev => [
            ...prev,
            {
              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              base64,
              name: file.name
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (id: string) => {
    setTempPhotos(prev => prev.filter(p => p.id !== id));
  };

  // --- Dynamic Live Math Calculations ---
  
  // Matched Betting Calculation
  const matchedStats = useMemo(() => {
    const sMain = parseFloat(mainStake) || 0;
    const oMain = parseFloat(mainOdd) || 0;
    const sCover = parseFloat(coverStake) || 0;
    const oCover = parseFloat(coverOdd) || 0;

    const returnMain = sMain * oMain;
    const returnCover = sCover * oCover;
    const totalCost = sMain + sCover;

    const profitIfMainWins = returnMain - totalCost;
    const profitIfCoverWins = returnCover - totalCost;

    return {
      profitIfMainWins,
      profitIfCoverWins,
      totalCost,
      isValid: sMain > 0 && oMain > 0 && sCover > 0 && oCover > 0
    };
  }, [mainStake, mainOdd, coverStake, coverOdd]);

  // Freebet Calculation
  const freebetStats = useMemo(() => {
    if (freebetType === 'sports') {
      const sFb = parseFloat(fbStake) || 0;
      const oFb = parseFloat(fbOdd) || 0;
      const sCover = parseFloat(fbCoverStake) || 0;
      const oCover = parseFloat(fbCoverOdd) || 0;

      // In sports freebet, the stake is not returned. Net return = Stake * (Odd - 1)
      const returnFb = sFb * (oFb - 1);
      const returnCover = sCover * oFb; // Wait, cover is normal bet, returns CoverStake * CoverOdd
      // Let's standardise cover bet return: Stake * Odd
      const actualCoverReturn = sCover * oCover;
      const totalCost = sCover; // The freebet cost is 0, so user only spends cover stake

      const profitIfMainWins = returnFb - totalCost;
      const profitIfCoverWins = actualCoverReturn - totalCost;

      return {
        profitIfMainWins,
        profitIfCoverWins,
        totalCost,
        isValid: sFb > 0 && oFb > 0 && sCover >= 0
      };
    } else {
      // Casino Free Spins
      const ret = parseFloat(casinoReturn) || 0;
      const cost = parseFloat(casinoCost) || 0;
      const profit = ret - cost;

      return {
        profit,
        totalCost: cost,
        isValid: ret >= 0
      };
    }
  }, [freebetType, fbStake, fbOdd, fbCoverStake, fbCoverOdd, casinoReturn, casinoCost]);

  // Manual Calculation
  const manualStats = useMemo(() => {
    const val = parseFloat(manualValue) || 0;
    const profit = manualResultType === 'profit' ? val : -val;
    return {
      profit,
      isValid: val > 0
    };
  }, [manualResultType, manualValue]);

  // Get active profit based on selected tab and outcome
  const currentProfit = useMemo(() => {
    if (activeTab === 'matched') {
      if (!matchedStats.isValid || matchedWinner === null) return 0;
      return matchedWinner === 'main' ? matchedStats.profitIfMainWins : matchedStats.profitIfCoverWins;
    } else if (activeTab === 'freebet') {
      if (freebetType === 'sports') {
        if (!freebetStats.isValid || fbWinner === null) return 0;
        return fbWinner === 'main' ? freebetStats.profitIfMainWins : freebetStats.profitIfCoverWins;
      } else {
        return freebetStats.profit;
      }
    } else {
      return manualStats.profit;
    }
  }, [activeTab, matchedWinner, matchedStats, freebetType, fbWinner, freebetStats, manualStats]);

  // Check if form is valid to save
  const isFormValid = useMemo(() => {
    if (!currentUser || !mainBookmakerId) return false;
    
    if (activeTab === 'matched') {
      return matchedStats.isValid && matchedWinner !== null;
    } else if (activeTab === 'freebet') {
      if (freebetType === 'sports') {
        return freebetStats.isValid && fbWinner !== null;
      } else {
        return freebetStats.isValid;
      }
    } else {
      return manualStats.isValid;
    }
  }, [activeTab, matchedStats, matchedWinner, freebetType, freebetStats, fbWinner, manualStats, currentUser, mainBookmakerId]);

  // Reset form inputs after save
  const resetForm = () => {
    setTempPhotos([]);
    setNotes('');
    setEventDescription('');
    setPromoType('Nenhuma');
    
    // Matched tab resets
    setMainOdd('');
    setMainStake('');
    setCoverOdd('');
    setCoverStake('');
    setMatchedWinner(null);
    
    // Freebet tab resets
    setFbStake('');
    setFbOdd('');
    setFbCoverStake('');
    setFbCoverOdd('');
    setFbWinner(null);
    setCasinoReturn('');
    setCasinoCost('');
    
    // Manual tab resets
    setManualValue('');
  };

  // --- SAVE OPERATION ---
  const handleSaveQuickBet = async () => {
    if (!isFormValid || !currentUser) return;
    
    setIsSaving(true);
    try {
      const betId = `quick_${Date.now()}_${Math.max(0, Math.floor(Math.random() * 1000000))}`;
      
      // 1. Upload photos first (Firestore storage block)
      const photoIds: string[] = [];
      for (const photo of tempPhotos) {
        const pId = await FirestoreService.uploadImage(currentUser.uid, betId, photo.base64, 'bets');
        photoIds.push(pId);
      }

      // 2. Prepare Coverages array based on Tab
      let coverages: Coverage[] = [];
      let finalStatus = 'Green';
      let finalEventName = eventDescription.trim();

      if (activeTab === 'matched') {
        finalStatus = currentProfit >= 0 ? 'Green' : 'Red';
        if (!finalEventName) {
          const mainBookieName = bookmakers.find(b => b.id === mainBookmakerId)?.name || 'Casa';
          const coverBookieName = bookmakers.find(b => b.id === coverBookmakerId)?.name || 'Cobertura';
          finalEventName = `Aposta Rápida: ${mainBookieName} x ${coverBookieName}`;
        }

        coverages = [
          {
            id: `cov_main_${Date.now()}`,
            bookmakerId: mainBookmakerId,
            market: 'Entrada Principal (Rápida)',
            odd: parseFloat(mainOdd),
            stake: parseFloat(mainStake),
            status: matchedWinner === 'main' ? 'Green' : 'Red'
          },
          {
            id: `cov_cover_${Date.now()}`,
            bookmakerId: coverBookmakerId,
            market: 'Cobertura (Rápida)',
            odd: parseFloat(coverOdd),
            stake: parseFloat(coverStake),
            status: matchedWinner === 'cover' ? 'Green' : 'Red'
          }
        ];
      } else if (activeTab === 'freebet' && freebetType === 'sports') {
        finalStatus = currentProfit >= 0 ? 'Green' : 'Red';
        if (!finalEventName) {
          const mainBookieName = bookmakers.find(b => b.id === mainBookmakerId)?.name || 'Casa';
          finalEventName = `Aposta Grátis Rápida: ${mainBookieName}`;
        }

        coverages = [
          {
            id: `cov_main_${Date.now()}`,
            bookmakerId: mainBookmakerId,
            market: 'Aposta Grátis (Principal)',
            odd: parseFloat(fbOdd),
            stake: parseFloat(fbStake),
            status: fbWinner === 'main' ? 'Green' : 'Red'
          }
        ];

        // Add cover coverage if stake was used
        const cStake = parseFloat(fbCoverStake) || 0;
        if (cStake > 0) {
          coverages.push({
            id: `cov_cover_${Date.now()}`,
            bookmakerId: coverBookmakerId || mainBookmakerId,
            market: 'Cobertura Freebet',
            odd: parseFloat(fbCoverOdd) || 1.0,
            stake: cStake,
            status: fbWinner === 'cover' ? 'Green' : 'Red'
          });
        }
      } else if (activeTab === 'freebet' && freebetType === 'casino') {
        finalStatus = 'Green';
        if (!finalEventName) {
          const mainBookieName = bookmakers.find(b => b.id === mainBookmakerId)?.name || 'Casa';
          finalEventName = `Rodadas Grátis: ${mainBookieName}`;
        }

        const cost = parseFloat(casinoCost) || 0;
        const ret = parseFloat(casinoReturn) || 0;

        // Fictional coverages to register the staked/returned amount in dashboards
        if (cost > 0) {
          coverages.push({
            id: `cov_cost_${Date.now()}`,
            bookmakerId: mainBookmakerId,
            market: 'Investimento Rodada',
            odd: 1.0,
            stake: cost,
            status: 'Red'
          });
        }

        coverages.push({
          id: `cov_return_${Date.now()}`,
          bookmakerId: mainBookmakerId,
          market: 'Retorno Obtido',
          odd: 1.0,
          stake: 0, // Stake is 0, won't increase cost
          status: 'Green',
          manualReturn: ret
        });
      } else {
        // MANUAL ENTRY TAB
        finalStatus = currentProfit >= 0 ? 'Green' : 'Red';
        if (!finalEventName) {
          const mainBookieName = bookmakers.find(b => b.id === mainBookmakerId)?.name || 'Casa';
          finalEventName = `Entrada Manual Rápida: ${mainBookieName}`;
        }

        // Just create a simple manual return coverage for stats consistency
        const valAbs = parseFloat(manualValue) || 0;
        if (manualResultType === 'profit') {
          coverages = [
            {
              id: `cov_manual_${Date.now()}`,
              bookmakerId: mainBookmakerId,
              market: 'Lucro Direto',
              odd: 1.0,
              stake: 0,
              status: 'Green',
              manualReturn: valAbs
            }
          ];
        } else {
          coverages = [
            {
              id: `cov_manual_${Date.now()}`,
              bookmakerId: mainBookmakerId,
              market: 'Custo/Perda Direta',
              odd: 1.0,
              stake: valAbs,
              status: 'Red'
            }
          ];
        }
      }

      // 3. Create Bet Object
      const newBet: Bet = {
        id: betId,
        date: new Date(date).toISOString(),
        event: finalEventName,
        mainBookmakerId,
        promotionType: activeTab === 'freebet' ? (fbStake ? 'Conversão Freebet' : 'Freebet') : promoType,
        status: finalStatus,
        coverages,
        photos: photoIds,
        notes: notes.trim(),
        isQuickBet: true,
        calcMode: activeTab === 'matched' ? 'surebet' : 'manual'
      };

      // 4. Save to Firestore
      await FirestoreService.saveBet(currentUser.uid, newBet);
      
      // 5. Update local state
      setBets(prev => [newBet, ...prev]);
      
      // 6. Show success animation
      setSaveSuccess(true);
      resetForm();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar aposta rápida:", error);
      alert("Erro ao salvar no banco de dados. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- HISTORY FILTERING ---
  const quickBetsHistory = useMemo(() => {
    return bets.filter(b => b.isQuickBet === true);
  }, [bets]);

  const handleDeleteBet = async (betId: string) => {
    if (!currentUser) return;
    if (confirm("Deseja realmente excluir esta entrada rápida?")) {
      try {
        await FirestoreService.deleteBet(currentUser.uid, betId);
        setBets(prev => prev.filter(b => b.id !== betId));
        if (selectedBetId === betId) {
          setSelectedBetId(null);
        }
      } catch (error) {
        console.error("Erro ao deletar aposta rápida:", error);
        alert("Erro ao deletar. Tente novamente.");
      }
    }
  };

  const selectedBetForModal = useMemo(() => {
    return bets.find(b => b.id === selectedBetId);
  }, [bets, selectedBetId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(23,186,164,0.15)] animate-pulse-slow">
            <Zap className="text-primary w-6 h-6 fill-primary/10" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Apostas Rápidas</h1>
            <p className="text-gray-500 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-0.5 max-w-[200px] sm:max-w-none leading-tight sm:leading-normal">Salve suas entradas e coberturas de forma ultra veloz</p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] px-4 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 size={16} />
            <span>Salvo com sucesso!</span>
          </div>
        )}
      </div>

      {/* Main Grid: Upload Area & Calculator Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Visual Proof / Drag & Drop & Clipboard */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pl-1 gap-2 flex-wrap">
            <h3 className="text-[11px] sm:text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
              <ImageIcon size={14} className="text-primary shrink-0" />
              Provas Visuais (Prints)
            </h3>
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold bg-[#151b2e] px-2 py-1 rounded-md border border-white/5 whitespace-nowrap">Ctrl+V ativo na tela</span>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative min-h-[220px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all duration-300 group
              ${isDragOver 
                ? 'border-primary bg-primary/5 shadow-[0_0_25px_rgba(23,186,164,0.1)]' 
                : 'border-white/10 bg-[#0d1421] hover:border-white/20'
              }
            `}
          >
            <input
              type="file"
              id="file-input"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 mb-4 shadow-inner">
              <UploadCloud size={28} />
            </div>
            
            <h4 className="text-white font-bold text-sm mb-1">Arraste seus prints ou clique para buscar</h4>
            <p className="text-gray-500 text-xs max-w-xs mb-3">Tire o print da sua aposta ou cobertura e apenas dê <strong>Ctrl+V</strong> para colar instantaneamente aqui.</p>
            
            <span className="text-[10px] text-primary/70 font-semibold bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Suporta múltiplos prints</span>
          </div>

          {/* Photo Previews */}
          {tempPhotos.length > 0 && (
            <div className="bg-[#0d1421] border border-white/5 rounded-3xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Anexados ({tempPhotos.length})</p>
              <div className="grid grid-cols-3 gap-3">
                {tempPhotos.map((photo, index) => (
                  <div key={photo.id} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group/img bg-[#05070e] shadow-md">
                    <img src={photo.base64} alt={photo.name} className="w-full h-full object-cover" />
                    
                    {/* Badge index number */}
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[9px] font-black flex items-center justify-center border border-white/10 select-none">
                      {index + 1}
                    </span>

                    {/* Trash hover trigger */}
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="p-1.5 rounded-full bg-danger/20 border border-danger/30 text-danger hover:bg-danger hover:text-white transition-colors"
                        title="Remover print"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Calculator Tabs & Form */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-[#0d1421] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header Tabs */}
            <div className="flex border-b border-white/5 bg-[#080d17]/50 p-1.5">
              {[
                { id: 'matched', label: 'Com Cobertura', icon: <Calculator size={14} /> },
                { id: 'freebet', label: 'Rodada Grátis / Freebet', icon: <Sparkles size={14} /> },
                { id: 'manual', label: 'Entrada Direta', icon: <Plus size={14} /> },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as QuickBetTab)}
                    className={`
                      flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-300 relative text-center leading-tight
                      ${isActive 
                        ? 'text-white bg-white/[0.03] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.01]'
                      }
                    `}
                  >
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 sm:left-4 sm:right-4 h-[2px] bg-primary rounded-t-full shadow-[0_0_8px_#17baa4]" />
                    )}
                    {tab.icon}
                    <span className="whitespace-nowrap sm:whitespace-normal">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Panels Container */}
            <div className="p-6 space-y-6">
              
              {/* TAB 1: MATCHED BETTING (COBERTURA) */}
              {activeTab === 'matched' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main Bet Column */}
                    <div className="space-y-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl relative">
                      <div className="absolute top-3 right-3 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Principal</div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Casa Principal</label>
                        <Dropdown
                          value={mainBookmakerId}
                          onChange={setMainBookmakerId}
                          options={bookmakers.map(b => ({
                            label: b.name,
                            value: b.id,
                            icon: <BookmakerLogo logo={b.logo} name={b.name} color={b.color} size="sm" />
                          }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Stake Principal</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                            <Input
                              type="number"
                              placeholder="0,00"
                              value={mainStake}
                              onChange={e => setMainStake(e.target.value)}
                              className="pl-9 bg-[#05070e] border-white/5 focus:border-primary/50 text-white font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Odd Principal</label>
                          <Input
                            type="number"
                            placeholder="1.80"
                            value={mainOdd}
                            onChange={e => setMainOdd(e.target.value)}
                            className="bg-[#05070e] border-white/5 focus:border-primary/50 text-white font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cover Bet Column */}
                    <div className="space-y-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl relative">
                      <div className="absolute top-3 right-3 text-[10px] font-black text-[#22d3ee] uppercase tracking-widest bg-[#22d3ee]/10 px-2 py-0.5 rounded border border-[#22d3ee]/20">Cobertura</div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Casa de Cobertura</label>
                        <Dropdown
                          value={coverBookmakerId}
                          onChange={setCoverBookmakerId}
                          options={bookmakers.map(b => ({
                            label: b.name,
                            value: b.id,
                            icon: <BookmakerLogo logo={b.logo} name={b.name} color={b.color} size="sm" />
                          }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Stake Cobertura</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                            <Input
                              type="number"
                              placeholder="0,00"
                              value={coverStake}
                              onChange={e => setCoverStake(e.target.value)}
                              className="pl-9 bg-[#05070e] border-white/5 focus:border-primary/50 text-white font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Odd Cobertura</label>
                          <Input
                            type="number"
                            placeholder="2.20"
                            value={coverOdd}
                            onChange={e => setCoverOdd(e.target.value)}
                            className="bg-[#05070e] border-white/5 focus:border-primary/50 text-white font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outcome Buttons & Live Result Display */}
                  {matchedStats.isValid ? (
                    <div className="space-y-4 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">QUEM VENCEU?</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setMatchedWinner('main')}
                          className={`
                            py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-2 active:scale-95
                            ${matchedWinner === 'main'
                              ? 'bg-primary text-[#090c19] border-primary shadow-[0_0_15px_rgba(23,186,164,0.3)]'
                              : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                            }
                          `}
                        >
                          <CheckCircle2 size={14} className={matchedWinner === 'main' ? 'fill-none' : 'opacity-30'} />
                          <span>Casa Principal</span>
                        </button>

                        <button
                          onClick={() => setMatchedWinner('cover')}
                          className={`
                            py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-2 active:scale-95
                            ${matchedWinner === 'cover'
                              ? 'bg-primary text-[#090c19] border-primary shadow-[0_0_15px_rgba(23,186,164,0.3)]'
                              : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                            }
                          `}
                        >
                          <CheckCircle2 size={14} className={matchedWinner === 'cover' ? 'fill-none' : 'opacity-30'} />
                          <span>Casa Cobertura</span>
                        </button>
                      </div>

                      {/* Display calculations box */}
                      {matchedWinner && (
                        <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5 flex items-center justify-between animate-in zoom-in-95">
                          <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Resultado Líquido Calculado</p>
                            <h4 className={`text-xl font-black ${currentProfit >= 0 ? 'text-[#10b981]' : 'text-danger'}`}>
                              <MoneyDisplay value={currentProfit} prefix={currentProfit >= 0 ? '+ R$ ' : '- R$ '} />
                            </h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block">Custo Total:</span>
                            <span className="text-xs font-bold text-gray-400"><MoneyDisplay value={matchedStats.totalCost} /></span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl text-gray-500 text-xs font-medium">
                      Insira os valores da Principal e Cobertura para habilitar o cálculo de lucros.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FREEBET / RODADA GRÁTIS */}
              {activeTab === 'freebet' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Selector of sub-types */}
                  <div className="flex border-b border-white/5 pb-3">
                    <button
                      onClick={() => setFreebetType('sports')}
                      className={`flex-1 py-1.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${freebetType === 'sports' ? 'text-primary bg-primary/10 border border-primary/20' : 'text-gray-500 hover:text-white'}`}
                    >
                      Aposta Grátis (Esporte)
                    </button>
                    <button
                      onClick={() => setFreebetType('casino')}
                      className={`flex-1 py-1.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${freebetType === 'casino' ? 'text-primary bg-primary/10 border border-primary/20' : 'text-gray-500 hover:text-white'}`}
                    >
                      Rodadas Grátis (Cassino/Spins)
                    </button>
                  </div>

                  {/* Sports Freebet Content */}
                  {freebetType === 'sports' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Freebet Inputs */}
                        <div className="space-y-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Aposta Grátis</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Valor da Freebet</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                                <Input
                                  type="number"
                                  placeholder="0,00"
                                  value={fbStake}
                                  onChange={e => setFbStake(e.target.value)}
                                  className="pl-9 bg-[#05070e] border-white/5 text-white font-bold"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Odd Freebet</label>
                              <Input
                                type="number"
                                placeholder="3.00"
                                value={fbOdd}
                                onChange={e => setFbOdd(e.target.value)}
                                className="bg-[#05070e] border-white/5 text-white font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Optional Coverage Inputs */}
                        <div className="space-y-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl">
                          <p className="text-[10px] font-black text-[#22d3ee] uppercase tracking-widest mb-1">Cobertura (Opcional)</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Stake Cobertura</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                                <Input
                                  type="number"
                                  placeholder="0,00"
                                  value={fbCoverStake}
                                  onChange={e => setFbCoverStake(e.target.value)}
                                  className="pl-9 bg-[#05070e] border-white/5 text-white font-bold"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Odd Cobertura</label>
                              <Input
                                type="number"
                                placeholder="1.50"
                                value={fbCoverOdd}
                                onChange={e => setFbCoverOdd(e.target.value)}
                                className="bg-[#05070e] border-white/5 text-white font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Winner trigger for sports freebet */}
                      {freebetStats.isValid ? (
                        <div className="space-y-4 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">RESULTADO DA APOSTA</p>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              onClick={() => setFbWinner('main')}
                              className={`
                                py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-2 active:scale-95
                                ${fbWinner === 'main'
                                  ? 'bg-primary text-[#090c19] border-primary shadow-[0_0_15px_rgba(23,186,164,0.3)]'
                                  : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                                }
                              `}
                            >
                              <CheckCircle2 size={14} className={fbWinner === 'main' ? 'fill-none' : 'opacity-30'} />
                              <span>Ganhou Freebet</span>
                            </button>

                            <button
                              onClick={() => setFbWinner('cover')}
                              className={`
                                py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-2 active:scale-95
                                ${fbWinner === 'cover'
                                  ? 'bg-primary text-[#090c19] border-primary shadow-[0_0_15px_rgba(23,186,164,0.3)]'
                                  : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                                }
                              `}
                            >
                              <CheckCircle2 size={14} className={fbWinner === 'cover' ? 'fill-none' : 'opacity-30'} />
                              <span>Ganhou Cobertura / Red</span>
                            </button>
                          </div>

                          {fbWinner && (
                            <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5 flex items-center justify-between animate-in zoom-in-95">
                              <div>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Lucro Real Estimado (Sem a Stake de Freebet)</p>
                                <h4 className={`text-xl font-black ${currentProfit >= 0 ? 'text-[#10b981]' : 'text-danger'}`}>
                                  <MoneyDisplay value={currentProfit} prefix={currentProfit >= 0 ? '+ R$ ' : '- R$ '} />
                                </h4>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block">Cobertura Custo:</span>
                                <span className="text-xs font-bold text-gray-400"><MoneyDisplay value={freebetStats.totalCost} /></span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center p-4 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl text-gray-500 text-xs font-medium">
                          Insira o Valor da Freebet e Odd para habilitar o cálculo de lucros.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Casino Free Spins Content */}
                  {freebetType === 'casino' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Retorno / Ganhos do Cassino</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                            <Input
                              type="number"
                              placeholder="15,00"
                              value={casinoReturn}
                              onChange={e => setCasinoReturn(e.target.value)}
                              className="pl-9 bg-[#05070e] border-white/5 text-white font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Custo / Rollover Investido (Opcional)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                            <Input
                              type="number"
                              placeholder="0,00"
                              value={casinoCost}
                              onChange={e => setCasinoCost(e.target.value)}
                              className="pl-9 bg-[#05070e] border-white/5 text-white font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {freebetStats.isValid && (
                        <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5 flex items-center justify-between animate-in zoom-in-95">
                          <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Lucro Líquido do Cassino</p>
                            <h4 className={`text-xl font-black ${freebetStats.profit >= 0 ? 'text-[#10b981]' : 'text-danger'}`}>
                              <MoneyDisplay value={freebetStats.profit} prefix={freebetStats.profit >= 0 ? '+ R$ ' : '- R$ '} />
                            </h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block">Investimento:</span>
                            <span className="text-xs font-bold text-gray-400"><MoneyDisplay value={freebetStats.totalCost} /></span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MANUAL INPUT (ENTRADA DIRETA) */}
              {activeTab === 'manual' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">TIPO DE ENTRADA</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setManualResultType('profit')}
                        className={`
                          py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-2 active:scale-95
                          ${manualResultType === 'profit'
                            ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <ArrowUpRight size={16} />
                        <span>Lucro (Green)</span>
                      </button>

                      <button
                        onClick={() => setManualResultType('loss')}
                        className={`
                          py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-2 active:scale-95
                          ${manualResultType === 'loss'
                            ? 'bg-danger/20 text-danger border-danger/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                            : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <ArrowDownRight size={16} />
                        <span>Prejuízo (Red)</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Valor do Resultado</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                        <Input
                          type="number"
                          placeholder="50,00"
                          value={manualValue}
                          onChange={e => setManualValue(e.target.value)}
                          className="pl-9 bg-[#05070e] border-white/5 text-white font-bold text-lg focus:border-primary/50"
                        />
                      </div>
                    </div>

                    {manualStats.isValid && (
                      <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5 flex items-center justify-between animate-in zoom-in-95">
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Valor do Lucro/Perda Final</p>
                          <h4 className={`text-xl font-black ${manualStats.profit >= 0 ? 'text-[#10b981]' : 'text-danger'}`}>
                            <MoneyDisplay value={Math.abs(manualStats.profit)} prefix={manualStats.profit >= 0 ? '+ R$ ' : '- R$ '} />
                          </h4>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COMMON EXTRA FIELDS */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ajustes & Metadados da Entrada</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bookmaker dropdown (needed for direct or freebet tabs, pre-filled in matched tab) */}
                  {activeTab !== 'matched' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Casa de Apostas</label>
                      <Dropdown
                        value={mainBookmakerId}
                        onChange={setMainBookmakerId}
                        options={bookmakers.map(b => ({
                          label: b.name,
                          value: b.id,
                          icon: <BookmakerLogo logo={b.logo} name={b.name} color={b.color} size="sm" />
                        }))}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Data da Entrada</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="bg-[#05070e] border-white/5 text-white"
                    />
                  </div>

                  {activeTab !== 'freebet' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Promoção</label>
                      <Dropdown
                        value={promoType}
                        onChange={setPromoType}
                        options={promotions.map(p => ({
                          label: p.name,
                          value: p.name,
                          icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        }))}
                      />
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome do Evento / Descrição (Opcional)</label>
                    <Input
                      placeholder="Ex: Flamengo vs Vasco ou Bônus Roleta"
                      value={eventDescription}
                      onChange={e => setEventDescription(e.target.value)}
                      className="bg-[#05070e] border-white/5 text-white focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Notas / Observações Adicionais</label>
                    <textarea
                      placeholder="Alguma nota sobre a cobertura, rollover ou detalhes desta entrada rápida..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full h-20 bg-[#05070e] border border-white/5 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleSaveQuickBet}
                  disabled={!isFormValid || isSaving}
                  className="w-full h-12 gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#090c19] border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="fill-[#090c19]" />
                      <span>Salvar Aposta Rápida</span>
                    </>
                  )}
                </Button>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* History Grid of Quick Bets */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pl-1">
          <Zap className="text-primary w-4.5 h-4.5" />
          Histórico de Entradas Rápidas ({quickBetsHistory.length})
        </h3>

        {quickBetsHistory.length === 0 ? (
          <div className="bg-[#0d1421]/30 border border-dashed border-white/5 rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
            <Zap className="text-white/10" size={36} />
            <p className="text-gray-500 text-xs font-medium">Nenhuma aposta rápida salva ainda. Use a calculadora acima para começar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickBetsHistory.map(bet => {
              const stats = calculateBetStats(bet);
              const isProfit = stats.profit >= 0;
              const bDate = new Date(bet.date);
              const bookie = bookmakers.find(bm => bm.id === bet.mainBookmakerId);

              return (
                <Card
                  key={bet.id}
                  onClick={() => setSelectedBetId(bet.id)}
                  className="group relative overflow-hidden bg-[#151b2e]/40 border-white/5 hover:border-primary/20 transition-all duration-300 cursor-pointer p-5 flex flex-col justify-between min-h-[140px]"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                    style={{ backgroundColor: isProfit ? '#6ee7b7' : '#ef4444' }}
                  />

                  <div className="space-y-4 pl-2">
                    {/* Top Row: Date + Trash */}
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{bDate.toLocaleDateString('pt-BR')}</span>
                      
                      <div className="flex items-center gap-2">
                        {bet.photos && bet.photos.length > 0 && (
                          <span className="text-[8px] font-black uppercase bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                            <ImageIcon size={9} />
                            {bet.photos.length}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBet(bet.id);
                          }}
                          className="p-1 rounded-md text-gray-600 hover:text-danger hover:bg-danger/10 transition-colors z-20"
                          title="Excluir entrada"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Title & Bookie */}
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-primary transition-colors pr-4">{bet.event}</h4>
                      <div className="flex items-center gap-2">
                        <BookmakerLogo logo={bookie?.logo} name={bookie?.name || ''} color={bookie?.color} size="xs" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{bookie?.name || 'Desconhecida'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: profit return */}
                  <div className="flex items-end justify-between mt-5 pt-3 border-t border-white/[0.04] pl-2">
                    <div>
                      <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block mb-0.5">Investimento</span>
                      <span className="text-xs font-bold text-gray-400">
                        <MoneyDisplay value={stats.totalStake} />
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block mb-0.5">Lucro Líquido</span>
                      <span className={`text-sm font-black whitespace-nowrap ${isProfit ? 'text-[#6ee7b7]' : 'text-danger'}`}>
                        <MoneyDisplay value={stats.profit} prefix={isProfit ? '+' : ''} />
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA VER DETALHES E FOTOS DA APOSTA RÁPIDA */}
      <Modal
        isOpen={!!selectedBetId}
        onClose={() => setSelectedBetId(null)}
        title="Detalhes da Aposta Rápida"
        size="lg"
      >
        {selectedBetForModal && (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <BookmakerLogo
                  logo={bookmakers.find(b => b.id === selectedBetForModal.mainBookmakerId)?.logo}
                  name={bookmakers.find(b => b.id === selectedBetForModal.mainBookmakerId)?.name || ''}
                  color={bookmakers.find(b => b.id === selectedBetForModal.mainBookmakerId)?.color}
                  size="lg"
                />
                <div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Casa e Data</p>
                  <p className="text-white text-sm font-bold">
                    {bookmakers.find(b => b.id === selectedBetForModal.mainBookmakerId)?.name} 
                    <span className="text-gray-600 mx-2">•</span> 
                    {new Date(selectedBetForModal.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-black uppercase tracking-wider"
                  style={{
                    color: selectedBetForModal.status === 'Green' ? '#6ee7b7' : '#ef4444',
                    borderColor: selectedBetForModal.status === 'Green' ? '#6ee7b730' : '#ef444430',
                    backgroundColor: selectedBetForModal.status === 'Green' ? '#6ee7b70a' : '#ef44440a'
                  }}
                >
                  {selectedBetForModal.status === 'Green' ? <CheckCircle2 size={12} /> : <X size={12} />}
                  <span>{selectedBetForModal.status}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 px-1">
              <h3 className="text-lg font-bold text-white leading-tight">{selectedBetForModal.event}</h3>
              {selectedBetForModal.promotionType && selectedBetForModal.promotionType !== 'Nenhuma' && (
                <Badge className="text-[10px] py-1 px-3 bg-white/5 font-black uppercase tracking-wider">{selectedBetForModal.promotionType}</Badge>
              )}
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Apostado (Custos)</p>
                <h4 className="text-lg font-bold text-white">
                  <MoneyDisplay value={calculateBetStats(selectedBetForModal).totalStake} />
                </h4>
              </div>

              <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Lucro / Prejuízo Líquido</p>
                <h4 className={`text-lg font-black ${calculateBetStats(selectedBetForModal).profit >= 0 ? 'text-[#10b981]' : 'text-danger'}`}>
                  <MoneyDisplay value={calculateBetStats(selectedBetForModal).profit} prefix={calculateBetStats(selectedBetForModal).profit >= 0 ? '+' : ''} />
                </h4>
              </div>
            </div>

            {/* Coverages / Legs detailed */}
            {selectedBetForModal.coverages && selectedBetForModal.coverages.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Divisão de Entradas</p>
                <div className="space-y-2">
                  {selectedBetForModal.coverages.map((cov, idx) => {
                    const isWinning = cov.status === 'Green';
                    const cBookie = bookmakers.find(b => b.id === cov.bookmakerId);

                    return (
                      <div key={idx} className="bg-[#0b0f1a] border border-white/[0.03] p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookmakerLogo logo={cBookie?.logo} name={cBookie?.name || ''} color={cBookie?.color} size="sm" />
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">{cBookie?.name || 'Desconhecida'}</span>
                            <span className="text-[9px] text-gray-600 uppercase font-medium">{cov.market}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[8px] text-gray-600 font-bold uppercase block">Odd</span>
                            <span className="text-xs font-bold text-gray-400">{cov.odd.toFixed(2)}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[8px] text-gray-600 font-bold uppercase block">Stake</span>
                            <span className="text-xs font-bold text-gray-400"><MoneyDisplay value={cov.stake} /></span>
                          </div>

                          <div className="text-right min-w-[70px]">
                            <span className="text-[8px] text-gray-600 font-bold uppercase block">Resultado</span>
                            <span className={`text-xs font-black ${isWinning ? 'text-[#10b981]' : 'text-gray-600'}`}>
                              {isWinning ? 'Venceu' : 'Perdeu'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes if any */}
            {selectedBetForModal.notes && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notas da Entrada</p>
                <p className="text-gray-400 text-sm whitespace-pre-line leading-relaxed italic">"{selectedBetForModal.notes}"</p>
              </div>
            )}

            {/* Rendered Uploaded Photos */}
            {selectedBetForModal.photos && selectedBetForModal.photos.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Prints da Entrada ({selectedBetForModal.photos.length})</p>
                <div className="grid grid-cols-2 gap-4">
                  {selectedBetForModal.photos.map((photoId, idx) => (
                    <div key={photoId} className="relative rounded-2xl overflow-hidden border border-white/5 aspect-video bg-[#05070e] shadow-xl group/zoom">
                      <FireImage
                        photoId={photoId}
                        parentId={selectedBetForModal.id}
                        type="bets"
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Full screen hover visual trigger */}
                      <a
                        href={photoId} // fallback or custom logic
                        onClick={(e) => {
                          e.preventDefault();
                          // Open image in a new tab for zoom
                          FirestoreService.getPhotoData(currentUser?.uid || '', selectedBetForModal.id, photoId, 'bets').then(url => {
                            if (url) {
                              const newWin = window.open();
                              if (newWin) newWin.document.write(`<img src="${url}" style="max-width:100%; height:auto; background:#090c19; margin:auto; display:block;" />`);
                            }
                          });
                        }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/zoom:opacity-100 transition-opacity duration-200"
                      >
                        <Eye size={18} className="text-white" />
                      </a>
                      
                      <span className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-black/70 border border-white/5 text-[9px] font-black text-white/90 rounded-md select-none">
                        Print {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close button */}
            <div className="pt-4 border-t border-white/5 flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleDeleteBet(selectedBetForModal.id)}
                className="bg-danger/5 hover:bg-danger/10 border-danger/20 text-danger hover:text-danger w-fit px-4 gap-2 text-xs font-bold uppercase tracking-wider shrink-0 transition-colors"
              >
                <Trash2 size={14} />
                Excluir
              </Button>
              <Button onClick={() => setSelectedBetId(null)} className="w-full">Fechar Detalhes</Button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};

export default QuickBets;
