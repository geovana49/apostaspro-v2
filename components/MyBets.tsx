
import React, { useState, useRef, useEffect, useReducer } from 'react';
import { Plus, Search, Calendar, ChevronLeft, ChevronRight, Trash2, Edit2, AlertCircle, X, Check, Copy, ChevronDown, Eye, EyeOff, Paperclip, ZoomIn, Image as ImageIcon, Crop, Filter, Loader2 } from 'lucide-react';
import { Card, Button, Input, Badge, Modal, Dropdown, DropdownOption, MoneyDisplay, ImageViewer } from './ui/UIComponents';
import { Bet, Bookmaker, Coverage, Status, StatusItem, PromotionItem, AppSettings, User } from '../types';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface MyBetsProps {
  bets: Bet[];
  setBets: React.Dispatch<React.SetStateAction<Bet[]>>;
  bookmakers: Bookmaker[];
  statuses: StatusItem[];
  promotions: PromotionItem[];
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  currentUser: User | null;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const SHORT_MONTHS = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

// --- Form State Management with useReducer ---
type FormState = Omit<Bet, 'photos'>;

type FormAction =
  | { type: 'RESET'; payload: FormState }
  | { type: 'UPDATE_FIELD'; field: keyof Omit<Bet, 'photos'>; value: any }
  | { type: 'ADD_COVERAGE'; payload: Coverage }
  | { type: 'REMOVE_COVERAGE'; id: string }
  | { type: 'UPDATE_COVERAGE'; id: string; field: keyof Coverage; value: any };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'RESET':
      return action.payload;
    case 'UPDATE_FIELD':
      if (action.field === 'status') {
        return {
          ...state,
          status: action.value,
          coverages: state.coverages.map(c => ({...c, status: action.value}))
        };
      }
      return { ...state, [action.field]: action.value };
    case 'ADD_COVERAGE':
      return { ...state, coverages: [...state.coverages, action.payload] };
    case 'REMOVE_COVERAGE':
      return { ...state, coverages: state.coverages.filter(c => c.id !== action.id) };
    case 'UPDATE_COVERAGE':
      return {
        ...state,
        coverages: state.coverages.map(c =>
          c.id === action.id ? { ...c, [action.field]: action.value } : c
        )
      };
    default:
      return state;
  }
};

const MyBets: React.FC<MyBetsProps> = ({ bets, setBets, bookmakers, statuses, promotions, settings, setSettings, currentUser }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [longPressId, setLongPressId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Photo Upload State
  const [tempPhotos, setTempPhotos] = useState<{url: string, file?: File}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Viewer State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const initialFormState: FormState = {
    id: '',
    date: new Date().toISOString().split('T')[0],
    event: '',
    mainBookmakerId: bookmakers[0]?.id || '1',
    status: 'Pendente',
    promotionType: 'Nenhuma',
    coverages: [],
    notes: '',
  };
  const [formData, dispatch] = useReducer(formReducer, initialFormState);

  useEffect(() => {
    if (isModalOpen && notesRef.current) {
      notesRef.current.value = formData.notes || '';
    }
  }, [isModalOpen, formData.notes]);

  const statusOptions: DropdownOption[] = statuses.map(s => ({
    label: s.name,
    value: s.name,
    icon: <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]`} style={{ color: s.color, backgroundColor: s.color }} />
  }));

  const promotionOptions: DropdownOption[] = promotions.map(p => ({ 
    label: p.name, 
    value: p.name,
    icon: <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]`} style={{ color: p.color, backgroundColor: p.color }} />
  }));

  const bookmakerOptions: DropdownOption[] = bookmakers.map(b => ({
    label: b.name,
    value: b.id,
    icon: (
        <div 
            className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-[#090c19] overflow-hidden" 
            style={{ backgroundColor: b.color || '#FFFFFF' }}
        >
            {b.logo ? (
                <img src={b.logo} alt={b.name} className="w-full h-full object-contain p-[1px]" />
            ) : (
                b.name.substring(0,2).toUpperCase()
            )}
        </div>
    )
  }));

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const safeDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
    return new Date(safeDateStr);
  };

  const changeMonth = (increment: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + increment);
      setCurrentDate(newDate);
      setPickerYear(newDate.getFullYear());
  };

  const handleMonthSelect = (monthIndex: number) => {
      const newDate = new Date(pickerYear, monthIndex, 15);
      setCurrentDate(newDate);
      setIsMonthPickerOpen(false);
  };

  const requestDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
        setBets(prev => prev.filter(b => b.id !== deleteId));
        setDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteId(null);
  };

  const handleEdit = (bet: Bet) => {
    const { photos, ...betData } = bet;
    
    // Initialize temp photos with existing URLs
    setTempPhotos(photos ? photos.map(url => ({ url })) : []);

    dispatch({
        type: 'RESET',
        payload: {
            ...initialFormState,
            ...betData,
            date: bet.date.split('T')[0],
        }
    });
    setIsEditing(true);
    setIsModalOpen(true);
    setDeleteId(null);
  };

  const handleOpenNew = () => {
    setTempPhotos([]); // Reset photos for new entry
    dispatch({
        type: 'RESET',
        payload: {
            ...initialFormState,
            id: Date.now().toString(),
            mainBookmakerId: bookmakers[0]?.id || '1',
            coverages: [{ 
                id: Date.now().toString() + '_c', 
                bookmakerId: bookmakers[0]?.id || '1', 
                market: '', 
                odd: 0, 
                stake: 0, 
                status: 'Pendente' 
            }]
        }
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files);
        const newPhotos = newFiles.map(file => ({
            url: URL.createObjectURL(file as Blob),
            file: file as File
        }));
        setTempPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setTempPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.event) return alert('Informe o evento');
    if (!currentUser) return alert('Você precisa estar logado para salvar.');

    setIsUploading(true);
    const finalNotes = notesRef.current?.value ?? '';
    
    try {
        // Process Photos: Upload new ones, keep existing ones
        const uploadedPhotoUrls: string[] = await Promise.all(tempPhotos.map(async (photo, idx) => {
            if (photo.file) {
                // It's a new file, upload to Firebase Storage
                // Added idx to ensure uniqueness if multiple files uploaded at same millisecond
                const storageRef = ref(storage, `users/${currentUser.uid}/bets/${Date.now()}_${idx}_${photo.file.name}`);
                const snapshot = await uploadBytes(storageRef, photo.file);
                return await getDownloadURL(snapshot.ref);
            } else {
                // It's an existing URL
                return photo.url;
            }
        }));

        const betToSave: Bet = {
            ...formData,
            id: formData.id || Date.now().toString(),
            notes: finalNotes,
            photos: uploadedPhotoUrls,
            date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
        };

        if (isEditing) {
            setBets(prev => prev.map(b => b.id === betToSave.id ? betToSave : b));
        } else {
            setBets(prev => [betToSave, ...prev]);
        }
        setIsModalOpen(false);
    } catch (error) {
        console.error("Error saving bet:", error);
        alert("Erro ao salvar a aposta. Tente novamente.");
    } finally {
        setIsUploading(false);
    }
  };

  const openImageViewer = (images: string[], startIndex: number) => {
    setViewerImages(images);
    setViewerStartIndex(startIndex);
    setIsViewerOpen(true);
  };

  const handlePressStart = (id: string) => {
    timerRef.current = setTimeout(() => {
        setLongPressId(id);
        if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handlePressEnd = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
  };

  const handleDuplicate = (originalBet: Bet) => {
    const newBet: Bet = {
        ...originalBet,
        id: Date.now().toString(),
        event: `${originalBet.event} (Cópia)`,
        status: 'Rascunho',
        coverages: originalBet.coverages.map(c => ({
            ...c,
            status: 'Pendente',
            id: Date.now().toString() + Math.random().toString().slice(2, 6)
        })),
        photos: originalBet.photos || []
    };
    setBets(prev => [newBet, ...prev]);
    setLongPressId(null);
  };

  const addCoverage = () => {
    dispatch({
        type: 'ADD_COVERAGE',
        payload: {
            id: Date.now().toString(),
            bookmakerId: bookmakers[0].id,
            market: '',
            odd: 0,
            stake: 0,
            status: 'Pendente'
        }
    });
  };

  const removeCoverage = (id: string) => {
    dispatch({ type: 'REMOVE_COVERAGE', id });
  };

  const updateCoverage = (id: string, field: keyof Coverage, value: any) => {
    dispatch({ type: 'UPDATE_COVERAGE', id, field, value });
  };

  const getBookmaker = (id: string) => bookmakers.find(b => b.id === id);
  
  const renderBookmakerLogo = (id: string, size: 'sm' | 'md' = 'md') => {
    const bookie = getBookmaker(id);
    const initials = bookie?.name.substring(0, 2).toUpperCase() || '??';
    const color = bookie?.color || '#FFFFFF';
    const logo = bookie?.logo;
    
    const sizeClasses = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-9 h-9 text-[10px]';
    
    return (
        <div 
            className={`${sizeClasses} rounded-full flex items-center justify-center font-bold text-[#090c19] shrink-0 shadow-sm overflow-hidden`}
            style={{ backgroundColor: color }}
        >
            {logo ? (
                <img src={logo} alt={initials} className="w-full h-full object-contain p-[2px]" />
            ) : (
                initials
            )}
        </div>
    );
  };

  const filteredBets = bets.filter(bet => {
    const betDate = parseDate(bet.date);
    const inCurrentMonth = betDate.getMonth() === currentDate.getMonth() && 
                           betDate.getFullYear() === currentDate.getFullYear();
    
    if (!inCurrentMonth) return false;

    if (showOnlyPending && !['Pendente', 'Rascunho'].includes(bet.status)) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    const matchesEvent = bet.event.toLowerCase().includes(term);
    const bookmakerForFilter = getBookmaker(bet.mainBookmakerId);
    const matchesBookie = bookmakerForFilter ? bookmakerForFilter.name.toLowerCase().includes(term) : false;
    const formattedDate = new Date(bet.date).toLocaleDateString('pt-BR');
    const matchesDate = formattedDate.includes(searchTerm);
    return matchesEvent || matchesBookie || matchesDate;
  });

  const renderStatusBadge = (statusName: string) => {
      const statusItem = statuses.find(s => s.name === statusName);
      const color = statusItem ? statusItem.color : '#fbbf24';
      
      return (
        <span 
            style={{ 
                backgroundColor: `${color}26`,
                color: color, 
                borderColor: color 
            }}
            className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm min-w-[60px] text-center backdrop-blur-sm"
        >
            {statusName}
        </span>
      );
  };

  return (
    <div className="space-y-6">

      <ImageViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={viewerImages}
        startIndex={viewerStartIndex}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative w-full flex-1">
               <Input 
                 placeholder="Buscar por time, evento, casa ou data..." 
                 icon={<Search size={18} />}
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <Button
              variant={showOnlyPending ? 'primary' : 'outline'}
              onClick={() => setShowOnlyPending(!showOnlyPending)}
              className="w-full sm:w-auto shrink-0"
              title="Filtrar apostas pendentes ou em rascunho"
            >
              <Filter size={16} />
              <span>Apostas em Aberto</span>
            </Button>
        </div>
        
        <div>
            <Button 
                onClick={handleOpenNew} 
                className="w-full h-12 flex items-center justify-center gap-2 !rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] transition-all duration-300 bg-gradient-to-br from-[#17baa4] to-[#10b981] text-[#05070e] font-bold text-base"
                title="Nova Aposta"
            >
                <Plus size={20} strokeWidth={3} />
                Nova Aposta
            </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 py-4 relative">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors active:scale-95"
          >
            <ChevronLeft size={28} strokeWidth={2} />
          </button>
          
          <div className="relative z-20">
            <button 
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="flex items-center gap-2.5 font-bold text-white text-base uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-white/5 transition-all group"
            >
                <Calendar size={18} className="text-primary group-hover:scale-110 transition-transform" />
                <span>{SHORT_MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
            </button>

             {isMonthPickerOpen && (
                 <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsMonthPickerOpen(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] bg-[#151b2e] border border-white/10 rounded-xl shadow-2xl z-40 p-4 animate-in fade-in zoom-in-95 ring-1 ring-white/10">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                            <button onClick={() => setPickerYear(y => y - 1)} className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                            <span className="font-bold text-white text-lg">{pickerYear}</span>
                            <button onClick={() => setPickerYear(y => y + 1)} className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {MONTHS.map((m, idx) => (
                                <button
                                    key={m}
                                    onClick={() => handleMonthSelect(idx)}
                                    className={`
                                        text-[10px] font-bold uppercase py-2.5 rounded-lg transition-all
                                        ${idx === currentDate.getMonth() && pickerYear === currentDate.getFullYear()
                                            ? 'bg-primary text-[#090c19] shadow-lg shadow-primary/20 scale-105'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }
                                    `}
                                >
                                    {m.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                 </>
             )}
          </div>
          
          <button 
            onClick={() => changeMonth(1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors active:scale-95"
          >
            <ChevronRight size={28} strokeWidth={2} />
          </button>
      </div>

      <div className="space-y-3">
        {filteredBets.map(bet => {
            const isExpanded = expandedId === bet.id;
            const isDraft = bet.status === 'Rascunho';
            const totalStake = bet.coverages.reduce((sum, c) => sum + Number(c.stake), 0);
            let totalReturn = 0;
            bet.coverages.forEach(c => {
                if (c.status === 'Green') totalReturn += (c.stake * c.odd);
                else if (c.status === 'Anulada' || c.status === 'Cashout') totalReturn += c.stake;
                else if (c.status === 'Meio Green') totalReturn += (c.stake * c.odd)/2 + (c.stake/2);
                else if (c.status === 'Meio Red') totalReturn += (c.stake/2);
            });
            const profit = totalReturn - totalStake;

            return (
                <div 
                    key={bet.id} 
                    className="relative"
                    onMouseDown={() => handlePressStart(bet.id)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={() => handlePressStart(bet.id)}
                    onTouchEnd={handlePressEnd}
                >
                    <Card 
                        className={`
                            overflow-hidden border-none bg-surface transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg select-none
                            ${isDraft ? 'border-dashed border-2 border-gray-600/50 opacity-90' : ''}
                        `}
                    >
                        <div className="p-4">
                            <div 
                                className="flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors -mx-4 -mt-4 p-4 rounded-t-xl"
                                onClick={() => { if(!longPressId) setExpandedId(isExpanded ? null : bet.id); }}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    {renderBookmakerLogo(bet.mainBookmakerId, 'md')}
                                    
                                    <div>
                                        <h4 className="font-semibold text-white text-base group-hover:text-primary transition-colors flex items-center gap-2">
                                            {bet.event}
                                            {isDraft && <span className="text-[10px] bg-gray-600 text-white px-1.5 py-0.5 rounded">RASCUNHO</span>}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-textMuted">{new Date(bet.date).toLocaleDateString('pt-BR')}</span>
                                            {bet.promotionType && bet.promotionType !== 'Nenhuma' && (
                                                <Badge color={promotions.find(p => p.name === bet.promotionType)?.color || '#8B5CF6'}>
                                                    {bet.promotionType}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] text-textMuted uppercase font-bold">Apostado</p>
                                        <p className="font-bold text-sm text-white">
                                            <MoneyDisplay value={totalStake} privacyMode={settings.privacyMode} />
                                        </p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-textMuted uppercase font-bold">Lucro</p>
                                        <p className={`font-bold text-sm ${profit >= 0 && bet.status !== 'Pendente' && !isDraft ? 'text-[#6ee7b7]' : ((bet.status === 'Pendente' || isDraft) ? 'text-textMuted' : 'text-[#F87171]')}`}>
                                            {(bet.status === 'Pendente' || isDraft) ? '--' : <MoneyDisplay value={profit} privacyMode={settings.privacyMode} prefix={profit >= 0 ? '+ R$' : '- R$'} />}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        {renderStatusBadge(bet.status)}
                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={20} className="text-textMuted" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div 
                                className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-white/5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {deleteId === bet.id ? (
                                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                                        <span className="text-[10px] text-danger font-bold uppercase mr-1">Confirmar Exclusão?</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); confirmDelete(); }}
                                            className="p-1.5 px-3 bg-danger text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold"
                                            title="Confirmar"
                                        >
                                            <Check size={14} /> Sim
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); cancelDelete(); }}
                                            className="p-1.5 px-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold"
                                            title="Cancelar"
                                        >
                                            <X size={14} /> Não
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDuplicate(bet); }}
                                            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 group/btn"
                                            title="Duplicar"
                                        >
                                            <Copy size={16} />
                                            <span className="text-[10px] font-medium group-hover/btn:text-white hidden sm:inline">Duplicar</span>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEdit(bet); }}
                                            className="p-2 text-gray-500 hover:text-primary hover:bg-white/5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 group/btn"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                            <span className="text-[10px] font-medium group-hover/btn:text-primary hidden sm:inline">Editar</span>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); requestDelete(bet.id); }}
                                            className="p-2 text-gray-500 hover:text-danger hover:bg-white/5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 group/btn"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                            <span className="text-[10px] font-medium group-hover/btn:text-danger hidden sm:inline">Excluir</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="bg-black/20 p-4 border-t border-white/5 animate-in slide-in-from-top-2">
                                <h5 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3 ml-1">Coberturas & Entradas</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {bet.coverages.map(cov => {
                                        const statusItem = statuses.find(s => s.name === cov.status);
                                        const statusColor = statusItem ? statusItem.color : '#fbbf24';

                                        return (
                                            <div key={cov.id} className="bg-background rounded-lg p-3 border border-white/5 relative hover:border-white/20 transition-colors">
                                                <div 
                                                    className="absolute left-0 top-0 bottom-0 w-1"
                                                    style={{ backgroundColor: statusColor }}
                                                />

                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {renderBookmakerLogo(cov.bookmakerId, 'sm')}
                                                        <span className="text-xs font-bold text-white">{getBookmaker(cov.bookmakerId)?.name}</span>
                                                    </div>
                                                    {renderStatusBadge(cov.status)}
                                                </div>
                                                
                                                <p className="text-sm text-gray-400 truncate mb-3 pl-1">{cov.market}</p>
                                                
                                                <div className="flex justify-between items-end border-t border-white/5 pt-2">
                                                    <div>
                                                        <span className="text-[10px] text-textMuted uppercase font-bold block">ODD</span>
                                                        <span className="font-bold text-blue-400 text-lg">{cov.odd.toFixed(2)}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-textMuted uppercase font-bold block">Stake</span>
                                                        <span className="font-bold text-white">
                                                            <MoneyDisplay value={cov.stake} privacyMode={settings.privacyMode} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {bet.notes && (
                                    <div className="mt-4 p-3 bg-[#FFAB00]/5 border border-[#FFAB00]/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1 text-[#FFAB00] text-xs font-bold">
                                            <AlertCircle size={12} /> ANOTAÇÕES
                                        </div>
                                        <p className="text-sm text-textMuted">{bet.notes}</p>
                                    </div>
                                )}

                                {bet.photos && bet.photos.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex items-center gap-2 mb-2 text-primary text-xs font-bold">
                                            <ImageIcon size={12} /> FOTOS
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {bet.photos.map((photo, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openImageViewer(bet.photos || [], idx);
                                                    }}
                                                    className="w-16 h-16 rounded border border-white/10 overflow-hidden cursor-zoom-in hover:scale-110 transition-transform hover:border-primary bg-black/50"
                                                >
                                                    <img src={photo} alt="thumb" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            );
        })}

        {filteredBets.length === 0 && (
            <div className="text-center py-12 text-textMuted">
                <p>Nenhuma aposta encontrada em {MONTHS[currentDate.getMonth()].toLowerCase()}.</p>
                <button 
                    onClick={() => {
                        setIsEditing(false);
                        handleOpenNew();
                    }} 
                    className="text-primary hover:underline text-sm font-bold mt-2"
                >
                    Criar aposta neste mês
                </button>
            </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Editar Aposta" : "Nova Aposta"}
        footer={
            <div className="flex justify-end gap-3 w-full">
                <Button variant="neutral" onClick={() => setIsModalOpen(false)} disabled={isUploading}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isUploading}>
                    {isUploading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Salvando...</span>
                        </>
                    ) : (
                        isEditing ? "Salvar Alterações" : "Adicionar Aposta"
                    )}
                </Button>
            </div>
        }
      >
        <div className="space-y-5">
            <Input 
                type="date"
                label="Data"
                value={formData.date}
                onChange={e => dispatch({ type: 'UPDATE_FIELD', field: 'date', value: e.target.value })}
            />
            
            <Dropdown
                label="Casa Principal"
                placeholder="Ex: Bet365"
                options={bookmakerOptions}
                value={formData.mainBookmakerId}
                onChange={value => dispatch({ type: 'UPDATE_FIELD', field: 'mainBookmakerId', value })}
                isSearchable={true}
                searchPlaceholder="Buscar casa..."
            />

            <Input 
                label="Procedimento / Evento" 
                placeholder="Ex: Múltipla Brasileirão" 
                value={formData.event}
                onChange={e => dispatch({ type: 'UPDATE_FIELD', field: 'event', value: e.target.value })}
            />

            <Dropdown
                label="Promoção (Opcional)"
                placeholder="Nenhuma"
                options={promotionOptions}
                value={formData.promotionType || 'Nenhuma'}
                onChange={value => dispatch({ type: 'UPDATE_FIELD', field: 'promotionType', value })}
            />

            <Dropdown
                label="Status Geral"
                options={statusOptions}
                value={formData.status}
                onChange={value => dispatch({ type: 'UPDATE_FIELD', field: 'status', value })}
            />

            <div className="h-px bg-white/5 my-2" />

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Coberturas</h3>
                    <Button size="sm" variant="neutral" onClick={addCoverage} className="text-xs h-8 px-3">
                        <Plus size={14} /> Adicionar
                    </Button>
                </div>
                
                <div className="space-y-4">
                    {formData.coverages.map((cov, index) => {
                        const statusItem = statuses.find(s => s.name === cov.status);
                        const statusColor = statusItem ? statusItem.color : '#fbbf24';

                        return (
                            <div key={cov.id} className="relative bg-[#0d1121] rounded-lg p-4 border border-white/5 overflow-hidden shadow-sm">
                                <div 
                                    className="absolute left-0 top-0 bottom-0 w-1"
                                    style={{ backgroundColor: statusColor }}
                                />

                                <div className="flex justify-between items-start mb-4 pl-2">
                                    <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">COBERTURA {index + 1}</span>
                                    <button 
                                        onClick={() => removeCoverage(cov.id)}
                                        className="text-gray-600 hover:text-danger transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 pl-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-textMuted uppercase font-bold">Casa</label>
                                        <Dropdown 
                                            options={bookmakerOptions}
                                            value={cov.bookmakerId}
                                            onChange={value => updateCoverage(cov.id, 'bookmakerId', value)}
                                            placeholder="Casa"
                                            className="text-xs"
                                            isSearchable={true}
                                            searchPlaceholder="Buscar casa..."
                                        />
                                    </div>
                                    <Input 
                                        label="Mercado"
                                        className="text-xs py-1.5"
                                        placeholder="Mercado"
                                        value={cov.market}
                                        onChange={e => updateCoverage(cov.id, 'market', e.target.value)}
                                    />
                                    <Input 
                                        label="ODD"
                                        type="tel"
                                        inputMode="decimal"
                                        className="text-xs py-1.5"
                                        placeholder="0.00"
                                        value={cov.odd === 0 ? '' : cov.odd.toFixed(2)}
                                        onChange={e => {
                                            const digits = e.target.value.replace(/\D/g, '');
                                            if (digits === '') {
                                                updateCoverage(cov.id, 'odd', 0);
                                            } else {
                                                const val = parseInt(digits) / 100;
                                                updateCoverage(cov.id, 'odd', val);
                                            }
                                        }}
                                    />
                                    <Input 
                                        label="Stake"
                                        type="number"
                                        className="text-xs py-1.5"
                                        placeholder="R$ 0,00"
                                        value={cov.stake === 0 ? '' : cov.stake}
                                        onChange={e => updateCoverage(cov.id, 'stake', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                    />
                                    
                                    <div className="col-span-2">
                                        <label className="text-[10px] text-textMuted uppercase font-bold block mb-2">Retorno Estimado</label>
                                        <div className="w-full bg-[#151b2e] border border-white/5 rounded-lg py-2.5 px-4 text-sm text-gray-400 cursor-not-allowed shadow-inner">
                                            {cov.stake && cov.odd ? `R$ ${(cov.stake * cov.odd).toFixed(2)}` : 'Auto-calc...'}
                                        </div>
                                    </div>

                                    <div className="col-span-2 mt-1">
                                        <label className="text-[10px] text-textMuted uppercase font-bold block mb-2">Status Cobertura</label>
                                        <Dropdown
                                            options={statusOptions}
                                            value={cov.status}
                                            onChange={value => updateCoverage(cov.id, 'status', value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-3">
                <label className="block text-textMuted text-xs font-bold uppercase tracking-wider">Anotações & Mídia</label>
                
                <textarea
                  ref={notesRef}
                  className="w-full bg-[#0d1121] border border-white/10 focus:border-primary text-white rounded-lg py-3 px-4 placeholder-gray-600 focus:outline-none transition-colors text-sm min-h-[100px] resize-none shadow-inner"
                  placeholder="Detalhes adicionais..."
                  defaultValue={formData.notes || ''}
                />

                <div className="p-4 bg-[#0d1121] border border-dashed border-white/10 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                         <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors">
                             <div className="p-2 bg-white/5 rounded-full"><Paperclip size={14} /></div>
                             <span>Adicionar Fotos</span>
                             <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handlePhotoSelect} 
                             />
                         </label>
                         <span className="text-[10px] text-gray-600">Sem limite de tamanho</span>
                    </div>

                    {tempPhotos.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
                            {tempPhotos.map((photo, index) => (
                                <div 
                                    key={index} 
                                    onClick={() => openImageViewer(tempPhotos.map(p => p.url), index)}
                                    className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group bg-black/40 cursor-pointer"
                                >
                                    <img src={photo.url} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removePhoto(index);
                                        }}
                                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-danger transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyBets;
