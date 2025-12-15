import React, { useState, useReducer, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Card, Button, Input, Dropdown, Modal, Badge, MoneyDisplay, ImageViewer, SingleDatePickerModal } from './ui/UIComponents';
import {
    Plus, Trash2, Edit2, X, Check, Search, Filter, Download, Upload, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Copy, MoreVertical, AlertCircle, ImageIcon, Ticket, ArrowUpRight, ArrowDownRight, Minus, DollarSign, Percent,
    Loader2, Paperclip, StickyNote
} from 'lucide-react';
import { Bet, Bookmaker, StatusItem, PromotionItem, AppSettings, Coverage, User } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { compressImages, validateFirestoreSize } from '../utils/imageCompression';
import { calculateBetStats } from '../utils/betCalculations';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SHORT_MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

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

interface FormState {
    id?: string;
    date: string;
    mainBookmakerId: string;
    event: string;
    promotionType: string;
    status: 'Pendente' | 'Green' | 'Red' | 'Anulada' | 'Meio Green' | 'Meio Red' | 'Cashout' | 'Rascunho';
    coverages: Coverage[];
    notes: string;
    extraGain?: number;
}

const initialFormState: FormState = {
    date: new Date().toISOString().split('T')[0],
    mainBookmakerId: '',
    event: '',
    promotionType: 'Nenhuma',
    status: 'Pendente',
    coverages: [],
    notes: ''
};

const formReducer = (state: FormState, action: any): FormState => {
    switch (action.type) {
        case 'SET_FORM': return action.payload;
        case 'UPDATE_FIELD': return { ...state, [action.field]: action.value };
        case 'ADD_COVERAGE': return { ...state, coverages: [...state.coverages, action.payload] };
        case 'REMOVE_COVERAGE': return { ...state, coverages: state.coverages.filter(c => c.id !== action.id) };
        case 'UPDATE_COVERAGE': return {
            ...state,
            coverages: state.coverages.map(c => c.id === action.id ? { ...c, [action.field]: action.value } : c)
        };
        case 'DUPLICATE_COVERAGE': {
            const index = state.coverages.findIndex(c => c.id === action.id);
            if (index === -1) return state;
            const coverage = state.coverages[index];
            const newCoverage = { ...coverage, id: Date.now().toString() };
            const newCoverages = [...state.coverages];
            newCoverages.splice(index + 1, 0, newCoverage);
            return { ...state, coverages: newCoverages };
        }
        case 'MOVE_COVERAGE': {
            const index = state.coverages.findIndex(c => c.id === action.id);
            if (index === -1) return state;
            const newCoverages = [...state.coverages];
            if (action.direction === 'up' && index > 0) {
                [newCoverages[index], newCoverages[index - 1]] = [newCoverages[index - 1], newCoverages[index]];
            } else if (action.direction === 'down' && index < newCoverages.length - 1) {
                [newCoverages[index], newCoverages[index + 1]] = [newCoverages[index + 1], newCoverages[index]];
            }
            return { ...state, coverages: newCoverages };
        }
        case 'RESET_FORM': return initialFormState;
        default: return state;
    }
};

const MyBets: React.FC<MyBetsProps> = ({ bets, setBets, bookmakers, statuses, promotions, settings, setSettings, currentUser }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [longPressId, setLongPressId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, dispatch] = useReducer(formReducer, initialFormState);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [tempPhotos, setTempPhotos] = useState<{ url: string, file?: File }[]>([]);

    // Filter State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [promotionFilter, setPromotionFilter] = useState('all');
    const [showOnlyPending, setShowOnlyPending] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Viewer State
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const [viewerStartIndex, setViewerStartIndex] = useState(0);
    const [showFloatingButton, setShowFloatingButton] = useState(false);
    const [isFabVisible, setIsFabVisible] = useState(true);
    const betsListRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null); // Format: `${betId}-${coverageId}-${field}`
    const [editingValue, setEditingValue] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Process files for drag & drop
    const processFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;
        const MAX_PHOTOS = 8;

        console.log('[MyBets processFiles] Called with', files.length, 'files');

        files.sort((a, b) => a.lastModified - b.lastModified);

        if (tempPhotos.length + files.length > MAX_PHOTOS) {
            alert(`Máximo de ${MAX_PHOTOS} fotos por aposta.`);
            return;
        }

        setIsUploading(true);
        try {
            const compressedBase64 = await compressImages(files);
            const newPhotos = compressedBase64.map((base64) => ({
                url: base64,
                file: undefined
            }));
            setTempPhotos(prev => [...prev, ...newPhotos]);
        } catch (error) {
            console.error('Erro ao comprimir imagens:', error);
            alert('Erro ao processar imagens. Tente novamente.');
        } finally {
            setIsUploading(false);
        }
    }, [tempPhotos.length]);

    // Stable reference to processFiles
    const processFilesRef = useRef(processFiles);
    useEffect(() => {
        processFilesRef.current = processFiles;
    }, [processFiles]);

    // Register global drop handler when modal is open
    useLayoutEffect(() => {
        if (isModalOpen) {
            console.log('[MyBets] useLayoutEffect - Registering handler NOW');
            (window as any).onApostasProDrop = (files: FileList) => {
                console.log('[MyBets] Handler called with', files.length, 'files');
                processFilesRef.current(Array.from(files));
            };
        }
        return () => {
            if (isModalOpen) {
                console.log('[MyBets] useLayoutEffect cleanup');
                (window as any).onApostasProDrop = null;
            }
        };
    }, [isModalOpen]);

    // IntersectionObserver for floating button
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowFloatingButton(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        if (betsListRef.current) {
            observer.observe(betsListRef.current);
        }

        return () => {
            if (betsListRef.current) {
                observer.unobserve(betsListRef.current);
            }
        };
    }, []);

    // Handle scroll inactivity to hide FABs
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleActivity = () => {
            setIsFabVisible(true);

            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }

            inactivityTimerRef.current = setTimeout(() => {
                setIsFabVisible(false);
            }, 6000); // 6 seconds
        };

        // Events to detect activity
        const events = ['scroll', 'wheel', 'touchmove', 'mousemove', 'mousedown', 'keydown', 'click'];

        // Attach listeners
        events.forEach(event => {
            // Use capture for scroll to detect scrolling in nested elements
            const options = event === 'scroll' ? { capture: true } : undefined;
            window.addEventListener(event, handleActivity, options);
        });

        // Initial timer
        handleActivity();

        return () => {
            events.forEach(event => {
                const options = event === 'scroll' ? { capture: true } : undefined;
                window.removeEventListener(event, handleActivity, options);
            });

            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, []);

    const handleEdit = (bet: Bet) => {
        setIsEditing(true);
        dispatch({
            type: 'SET_FORM',
            payload: {
                id: bet.id,
                date: bet.date.split('T')[0],
                mainBookmakerId: bet.mainBookmakerId,
                event: bet.event,
                promotionType: bet.promotionType || 'Nenhuma',
                status: bet.status as any,
                coverages: bet.coverages,
                notes: bet.notes || ''
            }
        });
        setTempPhotos(bet.photos ? bet.photos.map(url => ({ url })) : []);
        setIsModalOpen(true);
        setDeleteId(null);
    };

    const handleOpenNew = () => {
        setIsEditing(false);
        dispatch({ type: 'RESET_FORM' });
        setTempPhotos([]);
        setIsModalOpen(true);
        setDeleteId(null);
    };

    const requestDelete = (id: string) => setDeleteId(id);
    const cancelDelete = () => setDeleteId(null);

    const openImageViewer = (images: string[], index: number) => {
        setViewerImages(images);
        setViewerStartIndex(index);
        setIsViewerOpen(true);
    };

    const handlePressStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        touchStartPos.current = { x: clientX, y: clientY };

        longPressTimer.current = setTimeout(() => {
            setLongPressId(id);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    };

    const handlePressMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!touchStartPos.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const deltaX = Math.abs(clientX - touchStartPos.current.x);
        const deltaY = Math.abs(clientY - touchStartPos.current.y);

        // If moved more than 10px, cancel long press
        if (deltaX > 10 || deltaY > 10) {
            handlePressEnd();
        }
    };

    const handlePressEnd = () => {
        touchStartPos.current = null;
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const changeMonth = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
        setPickerYear(newDate.getFullYear());
    };

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(pickerYear, monthIndex, 1);
        setCurrentDate(newDate);
        setIsMonthPickerOpen(false);
    };

    const parseDate = (dateStr: string) => {
        // Extract just the date part (YYYY-MM-DD) if it's an ISO datetime string
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const MAX_PHOTOS = 8;
            const files = Array.from(e.target.files) as File[];

            // Sort files by date (oldest to newest)
            files.sort((a, b) => a.lastModified - b.lastModified);

            if (tempPhotos.length + files.length > MAX_PHOTOS) {
                alert(`Máximo de ${MAX_PHOTOS} fotos por aposta.`);
                e.target.value = ''; // Reset input
                return;
            }

            setIsUploading(true);
            try {
                // Comprimir imagens
                const compressedBase64 = await compressImages(files);

                // Criar objetos com preview
                const newPhotos = compressedBase64.map((base64) => ({
                    url: base64,
                    file: undefined // Já está em base64
                }));

                setTempPhotos(prev => [...prev, ...newPhotos]);
            } catch (error) {
                console.error('Erro ao comprimir imagens:', error);
                alert('Erro ao processar imagens. Tente novamente.');
            } finally {
                setIsUploading(false);
                e.target.value = ''; // Reset input to allow selecting same files again
            }
        }
    };

    const removePhoto = (index: number) => {
        setTempPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const bookmakerOptions = bookmakers.map(b => ({
        label: b.name,
        value: b.id,
        icon: (
            <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-[#090c19] overflow-hidden" style={{ backgroundColor: b.color || '#FFFFFF' }}>
                {b.logo ? <img src={b.logo} alt={b.name} className="w-full h-full object-contain p-[1px]" /> : b.name.substring(0, 2).toUpperCase()}
            </div>
        )
    }));

    const statusOptions = statuses.map(s => ({
        label: s.name,
        value: s.name,
        icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
    }));

    const promotionOptions = [
        { label: 'Nenhuma', value: 'Nenhuma', icon: <Minus size={14} /> },
        ...promotions.map(p => ({
            label: p.name,
            value: p.name,
            icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
        }))
    ];

    const confirmDelete = async () => {
        if (deleteId && currentUser) {
            try {
                await FirestoreService.deleteBet(currentUser.uid, deleteId);
                setDeleteId(null);
            } catch (error) {
                console.error("Error deleting bet:", error);
                alert("Erro ao excluir a aposta.");
            }
        }
    };

    // ... (cancelDelete, handleEdit, handleOpenNew remain the same)

    const handleSave = async () => {
        if (!formData.event) return alert('Informe o evento');
        if (!currentUser) return alert('Você precisa estar logado para salvar.');

        setIsUploading(true);
        setIsUploading(true);

        try {
            // Fotos já estão em base64 comprimido
            const photoBase64 = tempPhotos.map(photo => photo.url);

            // Validar tamanho total
            const validation = validateFirestoreSize(photoBase64);
            if (!validation.valid) {
                alert(`As fotos ultrapassam o limite permitido (${validation.totalMB.toFixed(2)}MB de ${validation.limitMB}MB). Remova algumas fotos.`);
                setIsUploading(false);
                return;
            }

            const rawBet: Bet = {
                ...formData,
                id: formData.id || Date.now().toString(),
                notes: formData.notes,
                photos: photoBase64,
                date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
            };

            // Remove undefined values to prevent Firestore errors
            const betToSave = JSON.parse(JSON.stringify(rawBet));

            await FirestoreService.saveBet(currentUser.uid, betToSave);
            console.log("Bet saved, date:", formData.date);

            // Navigate to the month of the saved bet
            const betDate = parseDate(formData.date);
            console.log("Parsed bet date:", betDate, "Month:", betDate.getMonth(), "Year:", betDate.getFullYear());

            // Wait a moment for Firestore to sync
            await new Promise(resolve => setTimeout(resolve, 300));

            setCurrentDate(betDate);
            setPickerYear(betDate.getFullYear());
            console.log("Navigated to date:", betDate);

            setIsModalOpen(false);
        } catch (error: any) {
            console.error("Error saving bet:", error);
            alert(`Erro ao salvar a aposta: ${error.message || error}`);
        } finally {
            setIsUploading(false);
        }
    };

    const saveAsDraft = async () => {
        if (!currentUser) return;

        setIsUploading(true);
        try {
            const draftBet: Bet = {
                ...formData,
                id: formData.id || Date.now().toString(),
                status: 'Rascunho',
                event: formData.event || `Rascunho - ${new Date().toLocaleDateString('pt-BR')}`,
                photos: tempPhotos.map(p => p.url),
                date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
            };

            const betToSave = JSON.parse(JSON.stringify(draftBet));
            await FirestoreService.saveBet(currentUser.uid, betToSave);

            // Navigate to the month of the saved bet
            const betDate = parseDate(formData.date);
            setCurrentDate(betDate);
            setPickerYear(betDate.getFullYear());

            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving draft:", error);
            alert("Erro ao salvar rascunho.");
        } finally {
            setIsUploading(false);
        }
    };

    const saveEdit = async (betId: string, coverageId: string, field: keyof Coverage, newValue: any) => {
        if (!currentUser) return;

        const bet = bets.find(b => b.id === betId);
        if (!bet) return;

        const updatedBet = {
            ...bet,
            coverages: bet.coverages.map(c =>
                c.id === coverageId ? { ...c, [field]: newValue } : c
            )
        };

        try {
            await FirestoreService.saveBet(currentUser.uid, updatedBet);
            setEditingId(null);
            setEditingValue(null);
        } catch (error) {
            console.error("Error saving edit:", error);
            alert("Erro ao salvar edição.");
        }
    };

    const handleCloseModal = () => {
        // Check if there are unsaved changes
        const hasContent = formData.event || formData.notes || formData.coverages.length > 0 || tempPhotos.length > 0;

        if (hasContent && !isUploading) {
            if (window.confirm('Você tem alterações não salvas. Deseja salvar como rascunho para terminar depois?')) {
                saveAsDraft();
            } else {
                setIsModalOpen(false);
            }
        } else {
            setIsModalOpen(false);
        }
    };

    // ... (openImageViewer, handlePressStart, handlePressEnd remain the same)

    const handleDuplicate = async (originalBet: Bet) => {
        if (!currentUser) return;

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

        try {
            await FirestoreService.saveBet(currentUser.uid, newBet);
            setLongPressId(null);
        } catch (error) {
            console.error("Error duplicating bet:", error);
            alert("Erro ao duplicar a aposta.");
        }
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

    const duplicateCoverage = (id: string) => {
        dispatch({ type: 'DUPLICATE_COVERAGE', id });
    };

    const moveCoverage = (id: string, direction: 'up' | 'down') => {
        dispatch({ type: 'MOVE_COVERAGE', id, direction });
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

    console.log("=== FILTER DEBUG ===");
    console.log("showOnlyPending:", showOnlyPending);
    console.log("searchTerm:", searchTerm);
    console.log("currentDate:", currentDate);

    const filteredBets = bets.filter(bet => {
        const betDate = parseDate(bet.date);
        const inCurrentMonth = betDate.getMonth() === currentDate.getMonth() &&
            betDate.getFullYear() === currentDate.getFullYear();

        console.log("Bet:", bet.event, "Date:", bet.date, "Parsed:", betDate, "InCurrentMonth:", inCurrentMonth);

        if (!inCurrentMonth) {
            console.log("  ❌ Rejected: Not in current month");
            return false;
        }

        if (showOnlyPending && !['Pendente', 'Rascunho'].includes(bet.status)) {
            console.log("  ❌ Rejected: Not pending (status:", bet.status, ")");
            return false;
        }

        if (promotionFilter !== 'all' && bet.promotionType !== promotionFilter) {
            return false;
        }

        const term = searchTerm.toLowerCase();
        const matchesEvent = bet.event.toLowerCase().includes(term);
        const bookmakerForFilter = getBookmaker(bet.mainBookmakerId);
        const matchesBookie = bookmakerForFilter ? bookmakerForFilter.name.toLowerCase().includes(term) : false;
        const formattedDate = new Date(bet.date).toLocaleDateString('pt-BR');
        const matchesDate = formattedDate.includes(searchTerm);
        const matchesSearch = matchesEvent || matchesBookie || matchesDate;

        console.log("  Search - Event:", matchesEvent, "Bookie:", matchesBookie, "Date:", matchesDate, "Final:", matchesSearch);

        if (!matchesSearch) {
            console.log("  ❌ Rejected: Doesn't match search");
            return false;
        }

        console.log("  ✅ PASSED ALL FILTERS");
        return true;
    });

    console.log("Total bets:", bets.length, "Filtered bets:", filteredBets.length, "Current month:", currentDate.getMonth(), "Current year:", currentDate.getFullYear());

    const renderStatusBadge = (statusName: string) => {
        if (statusName === 'Rascunho') {
            return (
                <span className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-dashed border-gray-500 text-gray-400 bg-gray-500/10 shadow-sm min-w-[60px] text-center backdrop-blur-sm">
                    Rascunho
                </span>
            );
        }

        const statusItem = statuses.find(s => s.name === statusName);
        const color = statusItem ? statusItem.color : '#fbbf24';

        return (
            <span
                style={{
                    backgroundColor: `${color} 26`,
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

            <div className="flex flex-col gap-1 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                        <Ticket size={24} className="text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Minhas Apostas</h2>
                </div>
                <p className="text-textMuted text-sm ml-[52px]">Acompanhe e gerencie todas as suas apostas em um só lugar.</p>
            </div>

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
                    <div className="w-full sm:w-auto min-w-[180px]">
                        <Dropdown
                            options={[
                                { label: 'Todas Promoções', value: 'all', icon: <Ticket size={16} /> },
                                ...promotions.map(p => ({
                                    label: p.name,
                                    value: p.name,
                                    icon: <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                }))
                            ]}
                            value={promotionFilter}
                            onChange={setPromotionFilter}
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
                        <span className="text-sm">{SHORT_MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                        <ChevronDown size={14} className={`text - gray - 500 transition - transform duration - 300 ${isMonthPickerOpen ? 'rotate-180' : ''} `} />
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
text - [10px] font - bold uppercase py - 2.5 rounded - lg transition - all
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

            <div ref={betsListRef} className="space-y-3">
                {console.log("🎨 RENDERING filteredBets.length:", filteredBets.length)}
                {filteredBets.map(bet => {
                    console.log("Rendering bet:", bet.event, "coverages:", bet.coverages);

                    // Safety check for coverages
                    if (!bet.coverages || !Array.isArray(bet.coverages)) {
                        console.error("❌ Bet has no coverages array:", bet);
                        return null;
                    }

                    const isExpanded = expandedId === bet.id;
                    const isDraft = bet.status === 'Rascunho';
                    const { totalStake, totalReturn, profit } = calculateBetStats(bet);

                    console.log("✅ About to render card for:", bet.event);

                    return (
                        <div
                            key={bet.id}
                            className="relative"
                        >
                            <Card
                                className={`
overflow-hidden border-none bg-surface transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg select-none cursor-pointer
                            ${isDraft ? 'border-dashed border-2 border-gray-600/50 opacity-90' : ''}
`}
                                onClick={() => { if (!longPressId) setExpandedId(isExpanded ? null : bet.id); }}
                                onMouseDown={(e) => handlePressStart(bet.id, e)}
                                onMouseMove={handlePressMove}
                                onMouseUp={handlePressEnd}
                                onMouseLeave={handlePressEnd}
                                onTouchStart={(e) => handlePressStart(bet.id, e)}
                                onTouchMove={handlePressMove}
                                onTouchEnd={handlePressEnd}
                            >
                                <div className="p-4">
                                    <div
                                        className="flex flex-col md:flex-row md:items-center gap-4 hover:bg-white/5 transition-colors -mx-4 -mt-4 p-4 rounded-t-xl"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            {renderBookmakerLogo(bet.mainBookmakerId, 'md')}

                                            <div>
                                                <h4 className="font-semibold text-white text-base flex items-center gap-2">
                                                    {bet.event}
                                                    {isDraft && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5 rounded ml-2 font-bold tracking-wider">RASCUNHO</span>}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-textMuted">{new Date(bet.date).toLocaleDateString('pt-BR')}</span>
                                                    {bet.promotionType && bet.promotionType !== 'Nenhuma' && (
                                                        <Badge color={promotions.find(p => p.name === bet.promotionType)?.color || '#8B5CF6'}>
                                                            {bet.promotionType}
                                                        </Badge>
                                                    )}
                                                    {bet.notes && (
                                                        <div className="flex items-center gap-1 text-xs text-textMuted" title="Tem anotações">
                                                            <StickyNote size={12} />
                                                        </div>
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
                                                <p className="text-[10px] text-textMuted uppercase font-bold">Lucro/Prejuízo</p>
                                                <p className={`font-bold text-sm ${profit >= 0 && bet.status !== 'Pendente' && !isDraft ? 'text-[#6ee7b7]' : ((bet.status === 'Pendente' || isDraft) ? 'text-textMuted' : 'text-[#ff0100]')}`}>
                                                    {(bet.status === 'Pendente' || isDraft) ? '--' : <MoneyDisplay value={Math.abs(profit)} privacyMode={settings.privacyMode} />}
                                                </p>
                                                {bet.extraGain !== undefined && bet.extraGain !== 0 && (
                                                    <p className={`text-[10px] font-medium mt-0.5 ${bet.extraGain > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {bet.extraGain > 0 ? '+' : ''}<MoneyDisplay value={bet.extraGain} privacyMode={settings.privacyMode} /> (Extra)
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {renderStatusBadge(bet.status)}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="flex items-center justify-between gap-2 pt-3 mt-1 border-t border-white/5"
                                    >
                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={20} className="text-textMuted" />
                                        </div>
                                        <div className="flex items-center gap-2">
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
                                </div>

                                {isExpanded && (
                                    <div className="bg-black/20 p-4 border-t border-white/5 animate-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
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
                                                            {editingId === `${bet.id}-${cov.id}-status` ? (
                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                    <Dropdown
                                                                        options={statusOptions}
                                                                        value={editingValue}
                                                                        onChange={(value) => saveEdit(bet.id, cov.id, 'status', value)}
                                                                        className="min-w-[120px]"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingId(`${bet.id}-${cov.id}-status`);
                                                                        setEditingValue(cov.status);
                                                                    }}
                                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                                    title="Clique para alterar status"
                                                                >
                                                                    {renderStatusBadge(cov.status)}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {editingId === `${bet.id}-${cov.id}-market` ? (
                                                            <textarea
                                                                className="w-full bg-[#0d1121] border border-primary text-white rounded-lg py-2 px-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
                                                                value={editingValue}
                                                                onChange={(e) => setEditingValue(e.target.value)}
                                                                onBlur={() => saveEdit(bet.id, cov.id, 'market', editingValue)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Escape') {
                                                                        setEditingId(null);
                                                                    }
                                                                }}
                                                                autoFocus
                                                                rows={3}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <p
                                                                className="text-sm text-gray-400 mb-3 pl-1 break-words whitespace-pre-wrap cursor-pointer hover:text-gray-300 transition-colors"
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingId(`${bet.id}-${cov.id}-market`);
                                                                    setEditingValue(cov.market);
                                                                }}
                                                                title="Duplo clique para editar"
                                                            >
                                                                {cov.market}
                                                            </p>
                                                        )}

                                                        <div className="flex justify-between items-end border-t border-white/5 pt-2">
                                                            <div>
                                                                <span className="text-[10px] text-textMuted uppercase font-bold block">ODD</span>
                                                                {editingId === `${bet.id}-${cov.id}-odd` ? (
                                                                    <input
                                                                        type="tel"
                                                                        className="bg-[#0d1121] border border-primary text-white rounded px-2 py-1 text-lg font-bold w-20 focus:outline-none"
                                                                        value={editingValue}
                                                                        onChange={(e) => setEditingValue(e.target.value)}
                                                                        onBlur={() => {
                                                                            const val = parseFloat(editingValue);
                                                                            saveEdit(bet.id, cov.id, 'odd', isNaN(val) ? 0 : val);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                const val = parseFloat(editingValue);
                                                                                saveEdit(bet.id, cov.id, 'odd', isNaN(val) ? 0 : val);
                                                                            } else if (e.key === 'Escape') {
                                                                                setEditingId(null);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="font-bold text-blue-400 text-lg cursor-pointer hover:text-blue-300 transition-colors"
                                                                        onDoubleClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingId(`${bet.id}-${cov.id}-odd`);
                                                                            setEditingValue(cov.odd);
                                                                        }}
                                                                        title="Duplo clique para editar"
                                                                    >
                                                                        {cov.odd.toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] text-textMuted uppercase font-bold block">Stake</span>
                                                                {editingId === `${bet.id}-${cov.id}-stake` ? (
                                                                    <input
                                                                        type="tel"
                                                                        className="bg-[#0d1121] border border-primary text-white rounded px-2 py-1 text-lg font-bold w-24 text-right focus:outline-none"
                                                                        value={editingValue}
                                                                        onChange={(e) => setEditingValue(e.target.value)}
                                                                        onBlur={() => {
                                                                            const val = parseFloat(editingValue);
                                                                            saveEdit(bet.id, cov.id, 'stake', isNaN(val) ? 0 : val);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                const val = parseFloat(editingValue);
                                                                                saveEdit(bet.id, cov.id, 'stake', isNaN(val) ? 0 : val);
                                                                            } else if (e.key === 'Escape') {
                                                                                setEditingId(null);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="font-bold text-white cursor-pointer hover:text-gray-300 transition-colors"
                                                                        onDoubleClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingId(`${bet.id}-${cov.id}-stake`);
                                                                            setEditingValue(cov.stake);
                                                                        }}
                                                                        title="Duplo clique para editar"
                                                                    >
                                                                        <MoneyDisplay value={cov.stake} privacyMode={settings.privacyMode} />
                                                                    </span>
                                                                )}
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
                onClose={handleCloseModal}
                title={isEditing ? "Editar Aposta" : "Nova Aposta"}
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="neutral" onClick={handleCloseModal} disabled={isUploading}>Cancelar</Button>
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
                    <div onClick={() => setIsDatePickerOpen(true)}>
                        <Input
                            label="Data"
                            value={new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            readOnly
                            className="cursor-pointer"
                            icon={<Calendar size={18} />}
                        />
                    </div>
                    <SingleDatePickerModal
                        isOpen={isDatePickerOpen}
                        onClose={() => setIsDatePickerOpen(false)}
                        date={formData.date ? parseDate(formData.date) : new Date()}
                        onSelect={(date) => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const dateStr = `${year}-${month}-${day}`;
                            dispatch({ type: 'UPDATE_FIELD', field: 'date', value: dateStr });
                            setIsDatePickerOpen(false);
                        }}
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
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => moveCoverage(cov.id, 'up')}
                                                    disabled={index === 0}
                                                    className="text-gray-600 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1"
                                                    title="Mover para cima"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => moveCoverage(cov.id, 'down')}
                                                    disabled={index === formData.coverages.length - 1}
                                                    className="text-gray-600 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1"
                                                    title="Mover para baixo"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                                <div className="w-px h-3 bg-white/10 mx-1" />
                                                <button
                                                    onClick={() => duplicateCoverage(cov.id)}
                                                    className="text-gray-600 hover:text-white transition-colors p-1"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => removeCoverage(cov.id)}
                                                    className="text-gray-600 hover:text-danger transition-colors p-1"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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
                                                type="tel"
                                                inputMode="numeric"
                                                className="text-xs py-1.5"
                                                placeholder="R$ 0,00"
                                                value={cov.stake.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                onChange={e => {
                                                    const value = e.target.value.replace(/\D/g, '');
                                                    const numberValue = parseInt(value, 10) / 100;
                                                    updateCoverage(cov.id, 'stake', isNaN(numberValue) ? 0 : numberValue);
                                                }}
                                            />

                                            <div className="col-span-2">
                                                <Input
                                                    label="Retorno Estimado"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    className={`text-xs py-1.5 ${(cov.manualReturn !== undefined && cov.manualReturn > 0) ? 'text-white font-bold' : 'text-gray-400'}`}
                                                    placeholder="Auto-calc..."
                                                    value={
                                                        (cov.manualReturn !== undefined && cov.manualReturn > 0)
                                                            ? cov.manualReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                                            : (cov.stake && cov.odd ? (() => {
                                                                const isFirstCoverage = index === 0;
                                                                const isFreebetConversion = formData.promotionType?.toLowerCase().includes('conversão freebet');
                                                                let calculatedReturn = cov.stake * cov.odd;

                                                                if (isFreebetConversion && isFirstCoverage) {
                                                                    calculatedReturn -= cov.stake;
                                                                }

                                                                return calculatedReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                            })() : '')
                                                    }
                                                    onChange={e => {
                                                        const rawValue = e.target.value;
                                                        const value = rawValue.replace(/\D/g, '');

                                                        // If field is completely empty, reset to auto-calc
                                                        if (rawValue === '' || value === '' || value === '0') {
                                                            updateCoverage(cov.id, 'manualReturn', undefined);
                                                        } else {
                                                            const numberValue = parseInt(value, 10) / 100;
                                                            updateCoverage(cov.id, 'manualReturn', numberValue);
                                                        }
                                                    }}
                                                />
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

                    <div className="h-px bg-white/5 my-2" />

                    <div className="space-y-3">
                        <label className="block text-textMuted text-xs font-bold uppercase tracking-wider">Ganho Extra (Opcional)</label>
                        <Input
                            type="tel"
                            inputMode="decimal"
                            prefix="R$"
                            placeholder="0,00"
                            value={formData.extraGain !== undefined && formData.extraGain !== 0 ? (formData.extraGain >= 0 ? formData.extraGain.toFixed(2) : formData.extraGain.toFixed(2)) : ''}
                            onChange={e => {
                                const value = e.target.value.replace(/[^\d-]/g, '');
                                if (value === '' || value === '-') {
                                    dispatch({ type: 'UPDATE_FIELD', field: 'extraGain', value: undefined });
                                } else {
                                    const numberValue = parseInt(value, 10) / 100;
                                    dispatch({ type: 'UPDATE_FIELD', field: 'extraGain', value: numberValue });
                                }
                            }}
                        />
                        <p className="text-[10px] text-gray-500">Adicione um valor extra ao lucro/prejuízo (ex: bônus, cashback). Use valores negativos para descontos.</p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-textMuted text-xs font-bold uppercase tracking-wider">Anotações & Mídia</label>

                        <textarea
                            className="w-full bg-[#0d1121] border border-white/10 focus:border-primary text-white rounded-lg py-3 px-4 placeholder-gray-600 focus:outline-none transition-colors text-sm min-h-[100px] resize-none shadow-inner"
                            placeholder="Detalhes adicionais..."
                            value={formData.notes}
                            onChange={e => dispatch({ type: 'UPDATE_FIELD', field: 'notes', value: e.target.value })}
                        />

                        <div className="p-4 bg-[#0d1121] border border-dashed border-white/10 rounded-xl">
                            <div className="flex justify-between items-center mb-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors"
                                >
                                    <div className="p-2 bg-white/5 rounded-full"><Paperclip size={14} /></div>
                                    <span>Adicionar Fotos</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handlePhotoSelect}
                                />
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

            {/* Floating Nova Aposta Button */}
            {showFloatingButton && (
                <button
                    onClick={handleOpenNew}
                    className={`fixed bottom-36 right-6 z-40 p-3 bg-gradient-to-br from-[#17baa4] to-[#10b981] text-[#05070e] rounded-full hover:scale-110 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-500 active:scale-95 shadow-lg ${isFabVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
                    title="Nova Aposta"
                >
                    <Plus size={24} strokeWidth={3} />
                </button>
            )}
        </div>
    );
};

export default MyBets;
