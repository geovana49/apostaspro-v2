import React, { useState, useReducer, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Dropdown, Modal, SingleDatePickerModal, ImageViewer, MoneyDisplay } from './ui/UIComponents';
import {
    Plus, Trash2, X, Calendar, Paperclip, Minus, Loader2, Copy, ChevronUp, ChevronDown, UploadCloud
} from 'lucide-react';
import { Bet, Bookmaker, StatusItem, PromotionItem, Coverage, User } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { compressImages, validateFirestoreSize } from '../utils/imageCompression';
import { calculateBetStats } from '../utils/betCalculations';

interface BetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Bet | null;
    currentUser: User | null;
    bookmakers: Bookmaker[];
    statuses: StatusItem[];
    promotions: PromotionItem[];
    onSaveSuccess: (date: Date) => void;
    saveAsGain?: boolean; // If true, save to Extra Gains instead of My Bets
}

interface FormState {
    id?: string;
    date: string;
    mainBookmakerId: string;
    event: string;
    promotionType: string;
    status: 'Pendente' | 'Green' | 'Red' | 'Anulada' | 'Meio Green' | 'Meio Red' | 'Cashout' | 'Rascunho';
    generalStatus?: 'Pendente' | 'Concluído' | 'Cancelado';
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
        case 'RESET_FORM': return initialFormState;
        default: return state;
    }
};

const BetFormModal: React.FC<BetFormModalProps> = ({
    isOpen,
    onClose,
    initialData,
    currentUser,
    bookmakers,
    statuses,
    promotions,
    onSaveSuccess,
    saveAsGain = false
}) => {
    const [formData, dispatch] = useReducer(formReducer, initialFormState);
    const [isUploading, setIsUploading] = useState(false);
    const [tempPhotos, setTempPhotos] = useState<{ url: string, file?: File }[]>([]);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerStartIndex, setViewerStartIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const tempPhotosRef = useRef(tempPhotos);

    // Keep ref synced with state
    useEffect(() => {
        tempPhotosRef.current = tempPhotos;
    }, [tempPhotos]);

    // Initial Data Loading
    useEffect(() => {
        console.log('BetFormModal isOpen changed:', isOpen, 'saveAsGain:', saveAsGain);
        if (isOpen) {
            if (initialData) {
                // 1. Load standard initial data first
                let formPayload = {
                    id: initialData.id,
                    date: initialData.date.split('T')[0],
                    mainBookmakerId: initialData.mainBookmakerId,
                    event: initialData.event,
                    promotionType: initialData.promotionType || 'Nenhuma',
                    status: initialData.status as any,
                    generalStatus: (initialData as any).generalStatus || 'Concluído',
                    coverages: initialData.coverages,
                    notes: initialData.notes || '',
                    extraGain: (initialData as any).extraGain,
                    isDoubleGreen: (initialData as any).isDoubleGreen || false
                };
                let photosPayload = initialData.photos ? initialData.photos.map(url => ({ url })) : [];

                // 2. Check for specific edit draft
                const editDraft = localStorage.getItem(`apostaspro_draft_edit_${initialData.id}`);
                if (editDraft) {
                    try {
                        const { formData: savedForm, tempPhotos: savedPhotos } = JSON.parse(editDraft);
                        console.log('Restoring EDIT draft for', initialData.id);
                        // Merge saved form data with ID from initialData to be safe
                        formPayload = { ...savedForm, id: initialData.id };
                        photosPayload = savedPhotos || [];
                    } catch (e) {
                        console.error('Error parsing edit draft:', e);
                    }
                }

                dispatch({ type: 'SET_FORM', payload: formPayload });
                setTempPhotos(photosPayload);
            } else {
                // Check for generic draft
                const savedDraft = localStorage.getItem('apostaspro_draft_modal');
                if (savedDraft) {
                    try {
                        const { formData: savedForm, tempPhotos: savedPhotos } = JSON.parse(savedDraft);
                        console.log('Restoring draft for BetFormModal');
                        dispatch({ type: 'SET_FORM', payload: savedForm });
                        setTempPhotos(savedPhotos || []);
                    } catch (e) {
                        console.error('Error parsing draft:', e);
                        dispatch({ type: 'RESET_FORM' });
                        setTempPhotos([]);
                    }
                } else {
                    dispatch({ type: 'RESET_FORM' });
                    setTempPhotos([]);
                }
            }
        }
    }, [isOpen, initialData]);

    // Auto-Save Draft
    useEffect(() => {
        if (isOpen) {
            const draft = {
                formData,
                tempPhotos,
                timestamp: Date.now()
            };

            if (initialData && initialData.id) {
                localStorage.setItem(`apostaspro_draft_edit_${initialData.id}`, JSON.stringify(draft));
            } else {
                localStorage.setItem('apostaspro_draft_modal', JSON.stringify(draft));
            }
        }
    }, [formData, tempPhotos, isOpen, initialData]);

    const parseDate = (dateStr: string): Date => {
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const processFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;
        const MAX_PHOTOS = 8;

        // Sort files by date (oldest to newest)
        files.sort((a, b) => a.lastModified - b.lastModified);

        // Check using Ref to avoid dependency loop
        if (tempPhotosRef.current.length + files.length > MAX_PHOTOS) {
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
    }, []); // No dependencies needed now

    // Stable reference to processFiles to avoid re-registering the pipeline
    const processFilesRef = useRef(processFiles);
    useEffect(() => {
        processFilesRef.current = processFiles;
    }, [processFiles]);

    // CRITICAL: Register handler SYNCHRONOUSLY using useLayoutEffect
    // This runs before the browser paints, ensuring handler is ready immediately
    useLayoutEffect(() => {
        if (isOpen) {
            (window as any).onApostasProDrop = (files: FileList) => {
                processFilesRef.current(Array.from(files));
                const overlay = document.getElementById('global-drop-overlay');
                if (overlay) overlay.remove();
            };
        }
        return () => {
            if (isOpen) {
                (window as any).onApostasProDrop = null;
            }
        };
    }, [isOpen]);

    // Global Safety Net & Drop Zone: Handle drops anywhere on the modal
    // Global Safety Net & Drop Zone: Handle drops anywhere on the modal
    useEffect(() => {
        const overlayId = 'global-drop-overlay';

        // ALWAYS register handler when component renders with modal open
        if (isOpen) {

            const createOverlay = () => {
                const el = document.createElement('div');
                el.id = overlayId;
                el.style.position = 'fixed';
                el.style.top = '0';
                el.style.left = '0';
                el.style.width = '100vw';
                el.style.height = '100vh';
                el.style.zIndex = '9999999'; // Super high z-index
                el.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                el.style.backdropFilter = 'blur(6px)';
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.border = '4px dashed #17baa4';
                el.style.animation = 'fadeIn 0.2s ease-out';
                // Using exact style from previous overlay
                el.innerHTML = `
                    <div style="background: #151b2e; padding: 2rem; border-radius: 9999px; margin-bottom: 1.5rem; pointer-events: none; box-shadow: 0 0 50px rgba(23,186,164,0.3);">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#17baa4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 14.899l6-6"></path>
                            <path d="M15 14.899l6-6"></path>
                            <path d="M12 11.9V2"></path>
                            <path d="M12 22a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"></path>
                            <path d="M9 22v-3"></path>
                            <path d="M15 22v-3"></path>
                        </svg>
                    </div>
                    <h3 style="color: white; font-size: 1.875rem; font-weight: 700; margin-bottom: 0.5rem; pointer-events: none; font-family: sans-serif;">Solte a imagem agora!</h3>
                    <p style="color: #9ca3af; font-size: 1.125rem; pointer-events: none; font-family: sans-serif;">Adicionar à aposta automaticamente</p>
                `;
                return el;
            };

            const preventDefault = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
            };

            const onDragEnterGlobal = (e: DragEvent) => {
                e.preventDefault();
                e.stopPropagation();

                if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                    const existing = document.getElementById(overlayId);
                    if (!existing) {
                        const overlay = createOverlay();

                        // Add events to the overlay itself
                        overlay.addEventListener('dragover', (ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
                        });

                        overlay.addEventListener('dragleave', (ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            // Only remove if actually leaving the overlay (not entering a child)
                            if (ev.relatedTarget === null || (ev.target === overlay && !overlay.contains(ev.relatedTarget as Node))) {
                                overlay.remove();
                            }
                        });

                        overlay.addEventListener('drop', (ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            overlay.remove(); // Close overlay
                            if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
                                processFilesRef.current(Array.from(ev.dataTransfer.files));
                            }
                        });

                        document.body.appendChild(overlay);
                    }
                }
            };

            // Clean up any stray overlays on mount just in case
            const ex = document.getElementById(overlayId);
            if (ex) ex.remove();

            // AGGRESSIVE SHIELD: Capture on Window level
            window.addEventListener('dragenter', onDragEnterGlobal, { capture: true, passive: false });
            window.addEventListener('dragover', preventDefault, { capture: true, passive: false });
            window.addEventListener('drop', preventDefault, { capture: true, passive: false });

            return () => {
                window.removeEventListener('dragenter', onDragEnterGlobal, { capture: true } as any);
                window.removeEventListener('dragover', preventDefault, { capture: true } as any);
                window.removeEventListener('drop', preventDefault, { capture: true } as any);
                const ex = document.getElementById(overlayId);
                if (ex) ex.remove();
                // Handler cleanup is now in useLayoutEffect
            };
        }
        // Handler cleanup is now in useLayoutEffect
    }, [isOpen]); // Run when isOpen changes



    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
        let files: File[] = [];

        if (e.type === 'drop') {
            e.preventDefault();
            e.stopPropagation();
            files = Array.from((e as React.DragEvent<HTMLDivElement>).dataTransfer.files);
            setIsDragging(false);
        } else {
            files = Array.from((e as React.ChangeEvent<HTMLInputElement>).target.files || []);
            if ((e as React.ChangeEvent<HTMLInputElement>).target) {
                (e as React.ChangeEvent<HTMLInputElement>).target.value = ''; // Reset input
            }
        }
        processFiles(files);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Prevent flickering when dragging over child elements
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;

        setIsDragging(false);
    };

    const removePhoto = (index: number) => {
        setTempPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const addCoverage = () => {
        dispatch({
            type: 'ADD_COVERAGE',
            payload: {
                id: Date.now().toString(),
                bookmakerId: bookmakers[0]?.id || '',
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

    const duplicateCoverage = (id: string) => {
        dispatch({ type: 'DUPLICATE_COVERAGE', id });
    };

    const moveCoverage = (id: string, direction: 'up' | 'down') => {
        dispatch({ type: 'MOVE_COVERAGE', id, direction });
    };

    const handleSave = async () => {
        if (!formData.event) return alert('Informe o evento');
        if (!currentUser) return alert('Você precisa estar logado para salvar.');

        setIsUploading(true);

        // Safety timeout: 20 seconds
        const safetyTimeout = setTimeout(() => {
            console.warn("[BetFormModal] Save operation force-unlocked by safety limit.");
            setIsUploading(false);
        }, 20000);

        console.info("[BetFormModal] Iniciando handleSave...");

        try {
            const betId = formData.id || Date.now().toString();

            // Process images (Async upload to Storage)
            const photoUrls = await Promise.all(
                tempPhotos.map(async (photo) => {
                    if (photo.url.startsWith('data:')) {
                        return await FirestoreService.uploadImage(currentUser.uid, betId, photo.url);
                    }
                    return photo.url;
                })
            );

            if (saveAsGain) {
                // Save as Extra Gain instead of Bet
                // Use the same calculation logic as My Bets (handles FreeBet, Conversion, all statuses)
                const tempBet: Bet = {
                    ...formData,
                    id: betId,
                    date: formData.date,
                    notes: formData.notes || '',
                    photos: []
                };
                const { profit } = calculateBetStats(tempBet);

                // Map generalStatus to gain status
                let gainStatus = formData.generalStatus || 'Confirmado';

                const gainData = {
                    id: betId,
                    amount: profit,
                    date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
                    status: gainStatus,
                    origin: formData.promotionType || 'Aposta Esportiva',
                    bookmakerId: formData.mainBookmakerId,
                    game: formData.event,
                    notes: formData.notes || '',
                    photos: photoUrls,
                    coverages: formData.coverages // Include coverages
                };

                console.info('[BetFormModal] Salvando como GANHO EXTRA...');
                const cleanGain = JSON.parse(JSON.stringify(gainData, (key, value) => {
                    if (value === undefined) return null;
                    return value;
                }));
                await FirestoreService.saveGain(currentUser.uid, cleanGain);
            } else {
                // Save as Bet (original behavior)
                const rawBet: Bet = {
                    ...formData,
                    id: betId,
                    notes: formData.notes,
                    photos: photoUrls,
                    date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
                    isDoubleGreen: formData.isDoubleGreen
                };

                console.info('[BetFormModal] Salvando como APOSTA...');
                const cleanBet = JSON.parse(JSON.stringify(rawBet, (key, value) => {
                    if (value === undefined) return null;
                    return value;
                }));
                await FirestoreService.saveBet(currentUser.uid, cleanBet);
            }

            const betDate = parseDate(formData.date);
            onSaveSuccess(betDate);

            // Clear specific draft
            if (initialData && initialData.id) {
                localStorage.removeItem(`apostaspro_draft_edit_${initialData.id}`);
            } else {
                localStorage.removeItem('apostaspro_draft_modal');
            }

            onClose();
        } catch (error: any) {
            console.error("Error saving:", error);
            alert(`Erro ao salvar: ${error.message || error}`);
        } finally {
            clearTimeout(safetyTimeout);
            setIsUploading(false);
        }
    };

    const saveAsDraft = async () => {
        if (!currentUser) return;

        setIsUploading(true);
        try {
            const betId = formData.id || Date.now().toString();

            // Process images (Async upload to Storage)
            const photoUrls = await Promise.all(
                tempPhotos.map(async (photo) => {
                    if (photo.url.startsWith('data:')) {
                        return await FirestoreService.uploadImage(currentUser.uid, betId, photo.url);
                    }
                    return photo.url;
                })
            );

            const draftBet: Bet = {
                ...formData,
                id: betId,
                status: 'Rascunho',
                event: formData.event || `Rascunho - ${new Date().toLocaleDateString('pt-BR')}`,
                photos: photoUrls,
                date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
            };

            const betToSave = JSON.parse(JSON.stringify(draftBet));
            await FirestoreService.saveBet(currentUser.uid, betToSave);

            const betDate = parseDate(formData.date);
            onSaveSuccess(betDate);
            onClose();
        } catch (error) {
            console.error("Error saving draft:", error);
            alert("Erro ao salvar rascunho.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        // Compare current formData with initial state to see if there are actual changes
        // This is a simplified check - helps avoid annoying prompts when just viewing
        const hasContent = formData.event || formData.notes || formData.coverages.length > 0 || tempPhotos.length > 0;

        if (hasContent && !isUploading && !initialData) {
            // New Bet Mode: Ask to save draft
            if (window.confirm('Você tem alterações não salvas. Deseja salvar como rascunho para terminar depois?')) {
                saveAsDraft();
            } else {
                // User rejected draft save. Clear generic draft.
                localStorage.removeItem('apostaspro_draft_modal');
                onClose();
            }
        } else if (initialData) {
            // Edit Mode: Check if we should warn? 
            // Currently users expect "Cancel" to just discard edits.
            // We should definitely clear the specific edit draft so it doesn't persist.
            if (initialData.id) {
                localStorage.removeItem(`apostaspro_draft_edit_${initialData.id}`);
            }
            onClose();
        } else {
            // Empty new bet
            localStorage.removeItem('apostaspro_draft_modal');
            onClose();
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

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title={initialData ? "Editar Aposta" : "Nova Aposta"}
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="neutral" onClick={handleClose} disabled={isUploading}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isUploading}>
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                initialData ? "Salvar Alterações" : "Adicionar Aposta"
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

                    <div className="flex items-center gap-3 bg-[#0d1121] p-3 rounded-lg border border-primary/20 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => dispatch({ type: 'UPDATE_FIELD', field: 'isDoubleGreen', value: !formData.isDoubleGreen })}>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors relative ${formData.isDoubleGreen ? 'bg-primary' : 'bg-gray-700'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.isDoubleGreen ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                Duplo Green (2x)
                                {formData.isDoubleGreen && <Copy size={14} className="text-primary" />}
                            </span>
                            <span className="text-[10px] text-textMuted">Marque se essa aposta teve duplo pagamento</span>
                        </div>
                    </div>

                    <Dropdown
                        label="Status Geral"
                        options={statusOptions}
                        value={formData.generalStatus || 'Concluído'}
                        onChange={value => dispatch({ type: 'UPDATE_FIELD', field: 'generalStatus', value })}
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
                                                    // Reset manual return when odd changes to ensure auto-calc is used
                                                    updateCoverage(cov.id, 'manualReturn', undefined);
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
                                                    // Reset manual return when stake changes to ensure auto-calc is used
                                                    updateCoverage(cov.id, 'manualReturn', undefined);
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
                                <label className="text-[10px] text-textMuted uppercase font-bold block mb-2">Fotos</label>
                                <div
                                    onDragOver={handleDragOver}
                                    onDragEnter={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handlePhotoSelect}
                                    className={`
                                        border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all
                                        ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-white/10 bg-black/20 hover:border-white/20'}
                                    `}
                                >
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors"
                                    >
                                        <div className="p-2 bg-white/5 rounded-full"><Paperclip size={14} /></div>
                                        <span>{isDragging ? 'Solte as fotos aqui' : 'Adicionar Fotos (ou arraste aqui)'}</span>
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
                            </div>

                            {tempPhotos.length > 0 && (
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
                                    {tempPhotos.map((photo, index) => (
                                        <div
                                            key={index}
                                            onClick={() => {
                                                setViewerStartIndex(index);
                                                setIsViewerOpen(true);
                                            }}
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


            <ImageViewer
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                images={tempPhotos.map(p => p.url)}
                startIndex={viewerStartIndex}
            />
        </>
    );
};

export default BetFormModal;
