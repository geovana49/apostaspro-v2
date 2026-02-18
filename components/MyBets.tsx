import React, { useState, useReducer, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Card, Button, Input, Dropdown, Modal, Badge, MoneyDisplay, ImageViewer, SingleDatePickerModal } from './ui/UIComponents';
import {
    Plus, Trash2, Edit2, X, Check, Search, Filter, Download, Upload, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Copy, MoreVertical, AlertCircle, ImageIcon, Ticket, ArrowUpRight, ArrowDownRight, Minus, DollarSign, Percent,
    Maximize, Minimize, Palette, Box, Ban, Loader2, Sparkles, Wand2, Paperclip, StickyNote, Trophy, Coins, Gamepad2, SearchX, Settings2, Infinity, Eye, EyeOff
} from 'lucide-react';
import { Bet, Bookmaker, StatusItem, PromotionItem, AppSettings, Coverage, User } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { analyzeImage } from '../services/aiService';
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
    isDoubleGreen?: boolean;
}

const initialFormState: FormState = {
    date: new Date().toISOString().split('T')[0],
    mainBookmakerId: '',
    event: '',
    promotionType: 'Nenhuma',
    status: 'Pendente',
    coverages: [],
    notes: '',
    isDoubleGreen: false
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
        case 'RESET_FORM': {
            const defaults = action.payload || {};
            const initialCoverages: Coverage[] = [];

            if (defaults.stake || defaults.bookmakerId) {
                initialCoverages.push({
                    id: Date.now().toString(),
                    bookmakerId: defaults.bookmakerId || '',
                    market: '',
                    odd: 0,
                    stake: defaults.stake || 0,
                    status: 'Pendente'
                });
            }

            return {
                ...initialFormState,
                mainBookmakerId: defaults.bookmakerId || '',
                date: new Date().toISOString().split('T')[0],
                coverages: initialCoverages,
                event: '',
                notes: '',
                extraGain: undefined
            };
        }
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
    const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const smartImportInputRef = useRef<HTMLInputElement>(null);
    const coverageImportInputRef = useRef<HTMLInputElement>(null);

    // LIVE PERSISTENCE: Save to localStorage while editing to protect against reloads
    useEffect(() => {
        if (isModalOpen) {
            const draftData = { formData, tempPhotos };
            localStorage.setItem('apostaspro_live_draft', JSON.stringify(draftData));
        }
    }, [formData, tempPhotos, isModalOpen]);

    const handleSmartImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length === 0) return;

        setIsAnalyzing(true);
        try {
            // Compress all images
            console.log('[DEBUG] Files selected:', files.length);
            const compressedBase64s = await compressImages(files);
            console.log('[DEBUG] Images compressed:', compressedBase64s.length);

            if (compressedBase64s.length === 0) {
                alert('Erro ao processar imagens. Verifique se os arquivos são válidos.');
                setIsAnalyzing(false);
                return;
            }

            // Analyze images sequentially to avoid 429 rate limits
            const results = [];
            let hadQuotaError = false;

            for (const base64 of compressedBase64s) {
                try {
                    // --- CONTEXTUAL AI: Base analysis on existing data ---
                    const recentBetsContext = bets.slice(0, 5).map(b => ({
                        bookmaker: bookmakers.find(bm => bm.id === b.mainBookmakerId)?.name,
                        event: b.event,
                        market: b.market,
                        stake: b.stake,
                        odds: b.odds
                    }));

                    const context = {
                        recent_bets: recentBetsContext,
                        available_bookmakers: bookmakers.map(bm => bm.name)
                    };

                    const result = await analyzeImage(base64, context);
                    console.log('[DEBUG] Analysis Result:', result);
                    results.push(result);

                    // Optimized delay to avoid 429 errors (2.5 seconds between images)
                    if (compressedBase64s.length > 1) await new Promise(r => setTimeout(r, 2500));
                } catch (err: any) {
                    console.warn('[Smart Import] Failed to process one image:', err);
                    if (err.message.includes('429') || err.message.includes('Limite')) {
                        hadQuotaError = true;
                    }
                    // Continue to next image if some succeeded
                }
            }

            // Even if results is empty (shouldn't happen now), don't block
            if (results.length === 0) {
                const scaffold: FormState = {
                    ...initialFormState,
                    notes: 'Nenhum dado extraído. Tente um print mais nítido ou preencha manualmente.',
                };
                alert('Não conseguimos ler os dados do print. Abrindo formulário vazio.');
                dispatch({ type: 'SET_FORM', payload: scaffold });
                setIsModalOpen(true);
                return;
            }

            // Use the first valid result for common fields (Event, Date, Main Bookmaker)
            const mainData = results[0].data;

            // Map Main Bookmaker
            const findBookmaker = (name: string) => {
                return bookmakers.find(b =>
                    b.name.toLowerCase().includes(name?.toLowerCase() || '') ||
                    (name && b.name.toLowerCase().includes(name.toLowerCase()))
                );
            };

            const mainBookmaker = findBookmaker(mainData.bookmaker);
            const mainBookmakerId = mainBookmaker?.id || settings.defaultBookmakerId || bookmakers[0]?.id || '';

            // Generate Coverages from ALL results
            const newCoverages: Coverage[] = results.map((result, index) => {
                const data = result.data;
                const bk = findBookmaker(data.bookmaker);
                const bkId = bk?.id || (index === 0 ? mainBookmakerId : '');

                // Map Status
                let mappedStatus: any = 'Pendente';
                if (data.status) {
                    const s = data.status.toLowerCase();
                    if (s.includes('green') || s.includes('ganhou') || s.includes('venceu')) mappedStatus = 'Green';
                    else if (s.includes('red') || s.includes('perdeu')) mappedStatus = 'Red';
                    else if (s.includes('anulad') || s.includes('devolv')) mappedStatus = 'Anulada';
                    else if (s.includes('cash')) mappedStatus = 'Cashout';
                }

                return {
                    id: Date.now().toString() + index,
                    bookmakerId: bkId,
                    market: data.market || data.description || 'Mercado Detectado',
                    odd: Number(data.odds) || 0,
                    stake: Number(data.value) || (index === 0 ? settings.defaultStake || 0 : 0),
                    status: mappedStatus
                };
            });

            // Determine Overall Status
            const overallStatus = 'Pendente';

            const newForm: FormState = {
                id: undefined,
                date: mainData.date ? new Date(mainData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                mainBookmakerId: mainBookmakerId,
                event: mainData.match || mainData.event || mainData.description || 'Evento Detectado',
                promotionType: mainData.promotionType || 'Nenhuma',
                status: overallStatus,
                coverages: newCoverages,
                notes: `[DEBUG] IA: ${results[0].source || 'Local'}\n[RAW]: ${results[0].rawText?.substring(0, 200)}...`,
                isDoubleGreen: false
            };

            setIsEditing(false);
            dispatch({ type: 'SET_FORM', payload: newForm });

            // Add photos to viewer immediately
            const photoObjects = compressedBase64s.map(url => ({ url }));
            setTempPhotos(photoObjects);

            setIsModalOpen(true);

        } catch (error: any) {
            console.error('Smart Import Error:', error);
            const isQuotaError = error.message.includes('429') || error.message.includes('Limite');

            if (isQuotaError) {
                if (window.confirm(`${error.message}\n\nDeseja carregar a versão mais recente e tentar reparar a conexão?`)) {
                    localStorage.clear();
                    window.location.reload();
                }
            } else {
                alert(`Erro na importação: ${error.message}`);
            }
        } finally {
            setIsAnalyzing(false);
            if (smartImportInputRef.current) smartImportInputRef.current.value = '';
        }
    };

    const handleCoverageImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length === 0) return;

        setIsAnalyzing(true);
        try {
            const compressedBase64s = await compressImages(files);
            const results = [];

            const findBookmaker = (name: string) => {
                return bookmakers.find(b =>
                    b.name.toLowerCase().includes(name?.toLowerCase() || '') ||
                    (name && b.name.toLowerCase().includes(name.toLowerCase()))
                );
            };

            for (const base64 of compressedBase64s) {
                try {
                    const result = await analyzeImage(base64);
                    results.push(result);
                    if (compressedBase64s.length > 1) await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    console.warn('[Coverage Import] Failed image:', err);
                }
            }

            results.forEach((result, idx) => {
                const data = result.data;
                const bk = findBookmaker(data.bookmaker);

                dispatch({
                    type: 'ADD_COVERAGE',
                    payload: {
                        id: Date.now().toString() + idx + Math.random().toString(),
                        bookmakerId: bk?.id || formData.mainBookmakerId || bookmakers[0].id,
                        market: data.market || data.description || 'Cobertura Detectada',
                        odd: Number(data.odds) || 0,
                        stake: Number(data.value) || 0,
                        status: 'Pendente'
                    }
                });
            });

            // Also add photos
            const photoObjects = compressedBase64s.map(url => ({ url }));
            setTempPhotos(prev => [...prev, ...photoObjects]);

        } catch (error: any) {
            console.error('Coverage Import Error:', error);
            alert(`Erro na importação: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
            if (coverageImportInputRef.current) coverageImportInputRef.current.value = '';
        }
    };

    // Process files for drag & drop
    const processFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;
        const MAX_PHOTOS = 30;

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
            (window as any).onApostasProDrop = (files: FileList) => {
                processFilesRef.current(Array.from(files));
            };
        }
        return () => {
            if (isModalOpen) {
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

        // 1. Initial State
        let formPayload = {
            id: bet.id,
            date: bet.date.split('T')[0],
            mainBookmakerId: bet.mainBookmakerId,
            event: bet.event,
            promotionType: bet.promotionType || 'Nenhuma',
            status: bet.status as any,
            coverages: bet.coverages,
            notes: bet.notes || '',
            isDoubleGreen: bet.isDoubleGreen || false
        };
        let photosPayload = bet.photos ? bet.photos.map(url => ({ url })) : [];

        // 2. Check for EDIT draft
        const editDraft = localStorage.getItem(`apostaspro_draft_edit_${bet.id}`);
        if (editDraft) {
            try {
                const { formData: savedForm, tempPhotos: savedPhotos } = JSON.parse(editDraft);
                console.log('Restoring EDIT draft for MyBets:', bet.id);
                // Force ID to match bet.id to be safe
                formPayload = { ...savedForm, id: bet.id };

                // CRITICAL FIX: If draft exists but photos are empty, keep the original database photos
                if (savedPhotos && savedPhotos.length > 0) {
                    photosPayload = savedPhotos;
                } else {
                    console.log('Draft has no photos, keeping original photos from database.');
                    // photosPayload remains initialized with bet.photos from step 1
                }
            } catch (e) {
                console.error('Error parsing edit draft:', e);
            }
        }

        dispatch({ type: 'SET_FORM', payload: formPayload });
        setTempPhotos(photosPayload);
        setIsModalOpen(true);
        setDeleteId(null);
    };

    const handleOpenNew = () => {
        setIsEditing(false);
        // Priority 1: Live persistence from reload
        const liveDraft = localStorage.getItem('apostaspro_live_draft');
        // Priority 2: Generic saved draft
        const savedDraft = localStorage.getItem('apostaspro_draft_mybets');

        const draftToUse = liveDraft || savedDraft;

        if (draftToUse) {
            try {
                const { formData: savedForm, tempPhotos: savedPhotos } = JSON.parse(draftToUse);
                console.log('Restoring draft for MyBets');
                dispatch({ type: 'SET_FORM', payload: savedForm });
                setTempPhotos(savedPhotos || []);
            } catch (e) {
                console.error('Error parsing draft:', e);
                const defaults = {
                    bookmakerId: settings.defaultBookmakerId,
                    stake: settings.defaultStake ? settings.defaultStake / 100 : 0
                };
                dispatch({ type: 'RESET_FORM', payload: defaults });
                setTempPhotos([]);
            }
        } else {
            const defaults = {
                bookmakerId: settings.defaultBookmakerId,
                stake: settings.defaultStake ? settings.defaultStake / 100 : 0
            };
            dispatch({ type: 'RESET_FORM', payload: defaults });
            setTempPhotos([]);
        }
        setIsModalOpen(true);
        setDeleteId(null);
    };


    // Auto-Save Draft (Debounced)
    useEffect(() => {
        if (!isModalOpen) return;

        const timeout = setTimeout(() => {
            try {
                const draft = {
                    formData,
                    tempPhotos,
                    timestamp: Date.now()
                };

                const key = isEditing && formData.id
                    ? `apostaspro_draft_edit_${formData.id}`
                    : 'apostaspro_draft_mybets';

                try {
                    localStorage.setItem(key, JSON.stringify(draft));
                } catch (quotaError) {
                    console.warn('LocalStorage full, attempting light draft (no photos):', quotaError);
                    // Fallback: Save text data only to ensure critical info isn't lost
                    const lightDraft = { ...draft, tempPhotos: [] };
                    localStorage.setItem(key, JSON.stringify(lightDraft));
                }
            } catch (error) {
                console.error('Critical failure saving draft:', error);
            }
        }, 1500);

        return () => clearTimeout(timeout);
    }, [formData, tempPhotos, isModalOpen, isEditing]);


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
        if (!dateStr || typeof dateStr !== 'string') return new Date(); // Fallback to now
        // Extract just the date part (YYYY-MM-DD) if it's an ISO datetime string
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const MAX_PHOTOS = 30;
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

    const movePhoto = (index: number, direction: 'left' | 'right') => {
        setTempPhotos(prev => {
            const next = [...prev];
            const targetIndex = direction === 'left' ? index - 1 : index + 1;

            if (targetIndex >= 0 && targetIndex < next.length) {
                const [movedPhoto] = next.splice(index, 1);
                next.splice(targetIndex, 0, movedPhoto);
            }
            return next;
        });
    };

    const handleDragStart = (index: number) => {
        setDraggedIdx(index);
    };

    const handleDrop = (targetIndex: number) => {
        if (draggedIdx === null || draggedIdx === targetIndex) return;

        setTempPhotos(prev => {
            const next = [...prev];
            const [movedPhoto] = next.splice(draggedIdx, 1);
            next.splice(targetIndex, 0, movedPhoto);
            return next;
        });
        setDraggedIdx(null);
    };

    const handlePhotoClick = (index: number) => {
        if (selectedIdx === index) {
            // Se já estiver selecionado, abre o visualizador
            openImageViewer(tempPhotos.map(p => p.url), index);
            setSelectedIdx(null);
        } else if (selectedIdx === null) {
            setSelectedIdx(index);
        } else {
            // Swap
            setTempPhotos(prev => {
                const next = [...prev];
                const temp = next[selectedIdx!];
                next[selectedIdx!] = next[index];
                next[index] = temp;
                return next;
            });
            setSelectedIdx(null);
        }
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

    const handleSave = async () => {
        if (!formData.event) return alert('Informe o evento');
        if (!currentUser) return alert('Você precisa estar logado para salvar.');

        setIsUploading(true);

        // Safety timeout: 60 seconds - MUST be first to guarantee unlocking UI
        const safetyTimeout = setTimeout(() => {
            console.warn("[MyBets] Save operation force-unlocked by safety limit (60s).");
            setIsUploading(false);
        }, 60000);

        console.info("[MyBets] Iniciando handleSave...");

        try {
            // Optimistic UI: Close modal immediately and run save in background
            (async () => {
                const betId = formData.id || Date.now().toString();
                try {
                    // 1. Process images (Async upload to Storage)
                    const photoUrls = await Promise.all(
                        tempPhotos.map(async (photo) => {
                            try {
                                if (photo.url.startsWith('data:')) {
                                    // Compress before upload
                                    const compressedBase64 = await import('../utils/imageCompression').then(mod =>
                                        mod.compressBase64(photo.url, { maxSizeMB: 0.5, maxWidth: 1024, quality: 0.75 })
                                    );
                                    return await FirestoreService.uploadImage(currentUser.uid, betId, compressedBase64);
                                }
                                return photo.url;
                            } catch (err) {
                                console.error("[Storage] Upload failed for a photo:", err);
                                throw err;
                            }
                        })
                    );

                    const rawBet: Bet = {
                        ...formData, id: betId, notes: formData.notes, photos: photoUrls,
                        date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
                        isDoubleGreen: (formData as any).isDoubleGreen || false
                    };

                    const cleanData = JSON.parse(JSON.stringify(rawBet, (k, v) => v === undefined ? null : v));
                    await FirestoreService.saveBet(currentUser.uid, cleanData);
                    console.info("[MyBets] Background Save Concluído.");

                    // 1.1 DEFERRED DRAFT CLEANUP: Only clear if save was successful
                    if (isEditing && formData.id) {
                        localStorage.removeItem(`apostaspro_draft_edit_${formData.id}`);
                    } else {
                        localStorage.removeItem('apostaspro_draft_mybets');
                    }
                    localStorage.removeItem('apostaspro_live_draft');
                } catch (bgError: any) {
                    console.error("[MyBets] Background Save Erro:", bgError);
                    const errorMessage = bgError.message || "Erro desconhecido";

                    if (errorMessage.includes("Timeout")) {
                        const shouldClear = confirm(`CONEXÃO TRAVADA!\n\nO envio está travado há mais de 5 minutos. Isso acontece quando uploads anteriores (fotos grandes) entopem a fila.\n\nDeseja LIMPAR a fila de uploads para destravar o app?\n(Isso cancelará envios pendentes, mas o app voltará a funcionar).`);
                        if (shouldClear) {
                            await FirestoreService.clearLocalCache();
                        } else {
                            window.location.reload();
                        }
                    } else {
                        alert(`FALHA NO SALVAMENTO!\n\nOcorreu um erro ao salvar seus dados na nuvem: ${errorMessage}.\n\nPara garantir que você não perca dados, a página será recarregada para mostrar o estado real.`);
                        window.location.reload();
                    }
                } finally {
                    clearTimeout(safetyTimeout);
                }
            })();

            // 2. Immediate UI Update
            const betDate = parseDate(formData.date);

            // Optimistic State Update: Update the local bets list immediately
            const betId = formData.id || Date.now().toString();
            const optimisticBet: Bet = {
                ...formData,
                id: betId,
                notes: formData.notes,
                photos: tempPhotos.map(p => p.url),
                date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
                isDoubleGreen: (formData as any).isDoubleGreen || false
            };

            setBets(prev => {
                const index = prev.findIndex(b => b.id === betId);
                if (index !== -1) {
                    const next = [...prev];
                    next[index] = optimisticBet;
                    return next;
                }
                return [optimisticBet, ...prev];
            });

            setCurrentDate(betDate);
            setPickerYear(betDate.getFullYear());
            setIsUploading(false); // Reset state so next open is fresh
            setIsModalOpen(false);

            // 3. Clear drafts - REMOVED from here, now deferred to background success
        } catch (error: any) {
            console.error("Error initiating save:", error);
            alert(`Erro ao iniciar salvamento: ${error.message || error}`);
            setIsUploading(false);
            clearTimeout(safetyTimeout);
        }
    };

    const saveAsDraft = async () => {
        if (!currentUser) return;

        setIsUploading(true);

        // Safety timeout for draft: 60s
        const safetyTimeout = setTimeout(() => {
            console.warn("[MyBets] Draft save operation force-unlocked (60s).");
            setIsUploading(false);
        }, 60000);

        try {
            // NEW: Background Task Logic for Drafts
            (async () => {
                const betId = formData.id || Date.now().toString();
                try {
                    // 1. Process images (Async upload to Storage)
                    const photoUrls = await Promise.all(
                        tempPhotos.map(async (photo) => {
                            try {
                                if (photo.url.startsWith('data:')) {
                                    // Compress before upload
                                    const compressedBase64 = await import('../utils/imageCompression').then(mod =>
                                        mod.compressBase64(photo.url, { maxSizeMB: 0.5, maxWidth: 1024, quality: 0.75 })
                                    );
                                    return await FirestoreService.uploadImage(currentUser.uid, betId, compressedBase64);
                                }
                                return photo.url;
                            } catch (err) {
                                console.error("[Storage] Draft upload failed:", err);
                                throw err;
                            }
                        })
                    );

                    const draftBet: Bet = {
                        ...formData,
                        id: betId,
                        status: 'Rascunho',
                        event: formData.event || `Rascunho - ${new Date().toLocaleDateString('pt-BR')}`,
                        photos: photoUrls,
                        date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`
                    };

                    const betToSave = JSON.parse(JSON.stringify(draftBet));
                    await FirestoreService.saveBet(currentUser.uid, betToSave);
                    console.info("[MyBets] Background Draft Save Concluído.");

                    // 1.1 DEFERRED DRAFT CLEANUP
                    localStorage.removeItem('apostaspro_draft_mybets');
                    localStorage.removeItem('apostaspro_live_draft');
                    if (formData.id) {
                        localStorage.removeItem(`apostaspro_draft_edit_${formData.id}`);
                    }
                } catch (bgError: any) {
                    console.error("[MyBets] Background Draft Save Erro:", bgError);
                    const errorMessage = bgError.message || "Erro desconhecido";

                    if (errorMessage.includes("Timeout")) {
                        alert(`CONEXÃO LENTA (RASCUNHO)!\n\nO salvamento demorou muito. Verifique sua internet.\n\nA página será recarregada.`);
                    } else {
                        alert(`FALHA NO RASCUNHO!\n\nOcorreu um erro ao salvar o rascunho na nuvem: ${errorMessage}.\n\nA página será recarregada.`);
                    }
                    window.location.reload();
                } finally {
                    clearTimeout(safetyTimeout);
                }
            })();

            // 2. Immediate UI Closure
            const betDate = parseDate(formData.date);
            setCurrentDate(betDate);
            setPickerYear(betDate.getFullYear());

            setIsUploading(false);
            setIsModalOpen(false);

            // 3. Clear local drafts - REMOVED from here, now deferred to background success

        } catch (error) {
            console.error("Error initiating draft save:", error);
            alert("Erro ao iniciar salvamento do rascunho.");
            setIsUploading(false);
            clearTimeout(safetyTimeout);
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
        const hasContent = formData.event || formData.notes || formData.coverages.length > 0 || tempPhotos.length > 0;

        if (hasContent && !isUploading) {
            if (window.confirm('Você tem alterações não salvas. Deseja salvar como rascunho para terminar depois?')) {
                saveAsDraft();
            } else {
                // User rejected saving: Clear EVERYTHING
                localStorage.removeItem('apostaspro_draft_mybets');
                localStorage.removeItem('apostaspro_live_draft');
                if (formData.id) {
                    localStorage.removeItem(`apostaspro_draft_edit_${formData.id}`);
                }
                dispatch({ type: 'SET_FORM', payload: initialFormState });
                setTempPhotos([]);
                setIsModalOpen(false);
            }
        } else {
            // Already empty or safe to close
            localStorage.removeItem('apostaspro_draft_mybets');
            localStorage.removeItem('apostaspro_live_draft');
            if (formData.id) {
                localStorage.removeItem(`apostaspro_draft_edit_${formData.id}`);
            }
            dispatch({ type: 'SET_FORM', payload: initialFormState });
            setTempPhotos([]);
            setIsModalOpen(false);
        }
    };

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

    const filteredBets = bets.filter(bet => {
        if (!bet) return false;

        // Safety checks for required fields
        if (!bet.date) {
            console.error("Bet missing date:", bet);
            return false;
        }

        const betDate = parseDate(bet.date);
        const inCurrentMonth = betDate.getMonth() === currentDate.getMonth() &&
            betDate.getFullYear() === currentDate.getFullYear();

        if (!inCurrentMonth) {
            return false;
        }

        if (showOnlyPending && !['Pendente', 'Rascunho'].includes(bet.status)) {
            return false;
        }

        if (promotionFilter !== 'all') {
            // Normalize: treat undefined, empty string, or 'Nenhuma' as equivalent
            const betPromo = bet.promotionType || 'Nenhuma';
            const betLower = betPromo.toLowerCase();
            const filterLower = promotionFilter.toLowerCase();

            if (betLower !== filterLower) {
                const filterWords = filterLower.split(/\s+/).filter(w => w.length > 2);
                const betWords = betLower.split(/\s+/).filter(w => w.length > 2);

                if (filterWords.length !== betWords.length) {
                    return false;
                }

                const allWordsMatch = filterWords.every(filterWord =>
                    betWords.some(betWord =>
                        betWord === filterWord ||
                        betWord.includes(filterWord) ||
                        filterWord.includes(betWord)
                    )
                );

                if (!allWordsMatch) {
                    return false;
                }
            }
        }

        const term = searchTerm.toLowerCase() || '';
        const betEvent = (bet.event || '').toLowerCase();
        const matchesEvent = betEvent.includes(term);
        const bookmakerForFilter = getBookmaker(bet.mainBookmakerId);
        const matchesBookie = bookmakerForFilter ? bookmakerForFilter.name.toLowerCase().includes(term) : false;

        let matchesDate = false;
        if (bet.date) {
            const formattedDate = new Date(bet.date).toLocaleDateString('pt-BR');
            matchesDate = formattedDate.includes(term);
        }

        const matchesSearch = matchesEvent || matchesBookie || matchesDate;

        if (!matchesSearch) {
            return false;
        }

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
                    <input
                        type="file"
                        ref={smartImportInputRef}
                        onChange={handleSmartImport}
                        accept="image/*"
                        multiple
                        className="hidden"
                    />
                    <div className="flex gap-2">
                        <Button
                            onClick={() => smartImportInputRef.current?.click()}
                            className="flex-1 h-12 flex items-center justify-center gap-2 !rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.01] transition-all duration-300 bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-base"
                            title="Importar Print via IA"
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} strokeWidth={2} />}
                            <span className="hidden sm:inline">Importar Print</span>
                            <span className="sm:hidden">IA</span>
                        </Button>
                        <Button
                            onClick={handleOpenNew}
                            className="flex-[2] h-12 flex items-center justify-center gap-2 !rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] transition-all duration-300 bg-gradient-to-br from-[#17baa4] to-[#10b981] text-[#05070e] font-bold text-base"
                            title="Nova Aposta"
                        >
                            <Plus size={20} strokeWidth={3} />
                            Nova Aposta
                        </Button>
                    </div>
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
                {filteredBets.map(bet => {

                    // Safety check for coverages
                    if (!bet.coverages || !Array.isArray(bet.coverages)) {
                        console.error("❌ Bet has no coverages array:", bet);
                        return null;
                    }

                    const isExpanded = expandedId === bet.id;
                    const isDraft = bet.status === 'Rascunho';
                    const { totalStake, totalReturn, profit, isDoubleGreen } = calculateBetStats(bet);

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
                                                    {isDoubleGreen && <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded ml-2 font-bold tracking-wider flex items-center gap-1"><Copy size={8} /> 2X</span>}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-textMuted">{new Date(bet.date).toLocaleDateString('pt-BR')}</span>
                                                    {bet.promotionType && bet.promotionType !== 'Nenhuma' && (() => {
                                                        // Try exact match first
                                                        let promo = promotions.find(p => p.name === bet.promotionType);
                                                        // If not found, try case-insensitive match
                                                        if (!promo) {
                                                            promo = promotions.find(p =>
                                                                p.name.toLowerCase() === bet.promotionType.toLowerCase()
                                                            );
                                                        }
                                                        // If still not found, try partial match (handles "Super Odd" vs "Super Odds")
                                                        if (!promo) {
                                                            promo = promotions.find(p =>
                                                                p.name.toLowerCase().includes(bet.promotionType.toLowerCase()) ||
                                                                bet.promotionType.toLowerCase().includes(p.name.toLowerCase())
                                                            );
                                                        }
                                                        const color = promo?.color || '#8B5CF6';
                                                        return (
                                                            <Badge color={color}>
                                                                {bet.promotionType}
                                                            </Badge>
                                                        );
                                                    })()}
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

                                        {isAnalyzing && (
                                            <div className="fixed inset-0 bg-[#090c19]/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
                                                <div className="bg-[#151b2e] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-sm animate-in zoom-in-95 duration-300 shadow-2xl">
                                                    <div className="relative">
                                                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                                        <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-secondary animate-pulse" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h3 className="text-xl font-bold text-white">Importação Inteligente</h3>
                                                        <p className="text-sm text-gray-400">
                                                            Extraindo dados dos seus prints... <br />
                                                            <span className="text-primary/70 text-[10px] font-bold uppercase tracking-widest mt-1 block">Processando Localmente & Cloud</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {bet.photos && bet.photos.length > 0 && (
                                            <div className="mt-4">
                                                <div className="flex items-center gap-2 mb-2 text-primary text-xs font-bold">
                                                    <ImageIcon size={12} /> FOTOS
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {bet.photos.filter(p => !!p).map((photo, idx) => (
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
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={coverageImportInputRef}
                                    onChange={handleCoverageImport}
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => coverageImportInputRef.current?.click()}
                                    className="text-[10px] h-8 px-3 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                                    disabled={isAnalyzing}
                                >
                                    {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    Importar Print
                                </Button>
                                <Button size="sm" variant="neutral" onClick={addCoverage} className="text-[10px] h-8 px-3">
                                    <Plus size={14} /> Adicionar
                                </Button>
                            </div>
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
                                                    label={cov.status === 'Cashout' ? "Valor do Cashout" : "Retorno Total (Stake + Lucro)"}
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
                            </div>

                            {tempPhotos.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-2">
                                    {tempPhotos.map((photo, index) => (
                                        <div
                                            key={index}
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => handleDrop(index)}
                                            onClick={() => handlePhotoClick(index)}
                                            className={`relative aspect-square rounded-lg overflow-hidden border transition-all duration-300 group bg-black/40 cursor-move 
                                                ${draggedIdx === index ? 'opacity-40 scale-95 border-primary shadow-2xl' :
                                                    selectedIdx === index ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-[#0d1121] scale-[1.05] z-20' :
                                                        'border-white/10 hover:border-primary/50'}`}
                                        >
                                            <img src={photo.url} alt="Preview" className="w-full h-full object-cover" />

                                            {/* Viewer Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openImageViewer(tempPhotos.map(p => p.url), index);
                                                }}
                                                className="absolute top-1.5 left-1.5 p-1.5 bg-black/70 text-white rounded-full hover:bg-primary transition-all shadow-lg active:scale-90 z-20 sm:p-2"
                                                title="Ver foto"
                                            >
                                                <Maximize size={14} className="sm:w-4 sm:h-4" />
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removePhoto(index);
                                                }}
                                                className="absolute top-1.5 right-1.5 p-1.5 bg-black/70 text-white rounded-full hover:bg-danger transition-all shadow-lg active:scale-90 z-20 sm:p-2"
                                                title="Remover foto"
                                            >
                                                <X size={14} className="sm:w-4 sm:h-4" />
                                            </button>

                                            {/* Reorder Buttons - Always visible */}
                                            <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        movePhoto(index, 'left');
                                                    }}
                                                    disabled={index === 0}
                                                    className={`p-1.5 bg-black/40 text-white rounded hover:bg-primary transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    title="Mover para esquerda"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        movePhoto(index, 'right');
                                                    }}
                                                    disabled={index === tempPhotos.length - 1}
                                                    className={`p-1.5 bg-black/40 text-white rounded hover:bg-primary transition-colors ${index === tempPhotos.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    title="Mover para direita"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
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
