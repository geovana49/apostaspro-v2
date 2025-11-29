import React, { useState, useRef, useEffect, useMemo, useReducer } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus, Calendar, ChevronDown, Trophy,
    Settings2, Coins, SearchX, Star,
    ChevronLeft, ChevronRight, Check, Gamepad2, Trash2,
    Palette, Gift, Zap, Briefcase, Ghost, Box, Upload,
    Banknote, CreditCard, Smartphone, Target, Ban, AlertCircle, StickyNote,
    Copy, Edit2, X, Eye, EyeOff, Image as ImageIcon, Paperclip, ZoomIn, Crop, Maximize, Minimize, Infinity, Search, Loader2
} from 'lucide-react';
import { Card, Button, Input, Dropdown, DropdownOption, Modal, Badge, MoneyDisplay, ImageAdjuster, CustomColorPicker, RenderIcon, ICON_MAP, ImageViewer } from './ui/UIComponents';
import { ExtraGain, OriginItem, Bookmaker, StatusItem, AppSettings, User } from '../types';

interface ExtraGainsProps {
    gains: ExtraGain[];
    setGains: React.Dispatch<React.SetStateAction<ExtraGain[]>>;
    origins: OriginItem[];
    setOrigins: React.Dispatch<React.SetStateAction<OriginItem[]>>;
    bookmakers: Bookmaker[];
    statuses: StatusItem[];
    setStatuses: React.Dispatch<React.SetStateAction<StatusItem[]>>;
    appSettings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    currentUser: User | null;
}

// --- Form State Management with useReducer ---
type FormState = Omit<ExtraGain, 'photos'>;

type FormAction =
    | { type: 'RESET'; payload: FormState }
    | { type: 'UPDATE_FIELD'; field: keyof Omit<ExtraGain, 'photos'>; value: any };

const formReducer = (state: FormState, action: FormAction): FormState => {
    switch (action.type) {
        case 'RESET':
            return action.payload;
        case 'UPDATE_FIELD':
            return { ...state, [action.field]: action.value };
        default:
            return state;
    }
};

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'];

const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const safeDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
    return new Date(safeDateStr);
};

const DateRangePickerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onApply: (start: Date, end: Date) => void;
    initialStart?: Date | null;
    initialEnd?: Date | null;
}> = ({ isOpen, onClose, onApply, initialStart, initialEnd }) => {
    const [viewDate, setViewDate] = useState(initialEnd || new Date());
    const [startDate, setStartDate] = useState<Date | null>(initialStart || null);
    const [endDate, setEndDate] = useState<Date | null>(initialEnd || null);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStartDate(initialStart || null);
            setEndDate(initialEnd || null);
            setViewDate(initialEnd || new Date());
        }
    }, [isOpen, initialStart, initialEnd]);

    const handleDayClick = (day: Date) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(day);
            setEndDate(null);
        } else {
            if (day < startDate) {
                setEndDate(startDate);
                setStartDate(day);
            } else {
                setEndDate(day);
            }
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.unshift(new Date(year, month, 0 - i));
        }
        return days;
    };

    const days = getDaysInMonth(viewDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Selecionar Período Personalizado" footer={
            <div className="flex justify-end gap-3">
                <Button variant="neutral" onClick={onClose}>Cancelar</Button>
                <Button onClick={() => startDate && endDate && onApply(startDate, endDate)} disabled={!startDate || !endDate}>Aplicar</Button>
            </div>
        }>
            <div className="bg-[#0d1121] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="neutral" size="sm" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}><ChevronLeft size={16} /></Button>
                    <span className="font-bold text-white text-lg capitalize">{viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    <Button variant="neutral" size="sm" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}><ChevronRight size={16} /></Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, idx) => {
                        const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                        const isSelectedStart = startDate && isSameDay(day, startDate);
                        const isSelectedEnd = endDate && isSameDay(day, endDate);
                        const isInRange = startDate && (endDate || hoverDate) && day > startDate && day < (endDate || hoverDate!);

                        return (
                            <button
                                key={idx}
                                onClick={() => handleDayClick(day)}
                                onMouseEnter={() => setHoverDate(day)}
                                onMouseLeave={() => setHoverDate(null)}
                                disabled={!isCurrentMonth}
                                className={`
                                    w-full aspect-square text-sm font-medium rounded-lg transition-all duration-100 relative
                                    ${!isCurrentMonth ? 'text-gray-700' : 'text-white hover:bg-white/10'}
                                    ${(isSelectedStart || isSelectedEnd) ? 'bg-primary text-[#090c19] font-bold' : ''}
                                    ${isInRange ? 'bg-primary/20 text-white' : ''}
                                    ${isSameDay(day, today) ? 'border border-primary/50' : ''}
                                `}
                            >
                                {isSameDay(day, today) && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>}
                                {day.getDate()}
                            </button>
                        )
                    })}
                </div>
            </div>
        </Modal>
    );
};

const SingleDatePickerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    initialDate?: Date;
}> = ({ isOpen, onClose, onSelect, initialDate }) => {
    const [viewDate, setViewDate] = useState(initialDate || new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());

    useEffect(() => {
        if (isOpen) {
            console.log('SingleDatePickerModal aberto!', { isOpen, initialDate });
            const initial = initialDate || new Date();
            setSelectedDate(initial);
            setViewDate(initial);
        }
    }, [isOpen, initialDate]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.unshift(new Date(year, month, 0 - i));
        }
        return days;
    };

    const days = getDaysInMonth(viewDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    const handleConfirm = () => {
        onSelect(selectedDate);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#090c19]/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#151b2e] border border-white/10 rounded-xl w-full max-w-[320px] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#1c2438]">
                    <h3 className="text-sm font-bold text-white">Selecionar Data</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-3">
                    <div className="bg-[#0d1121] p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-white/10 rounded transition-colors">
                                <ChevronLeft size={14} className="text-gray-400" />
                            </button>
                            <span className="font-bold text-white text-xs capitalize">{viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-white/10 rounded transition-colors">
                                <ChevronRight size={14} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-gray-500 mb-1.5">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i} className="font-bold">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {days.map((day, idx) => {
                                const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                                const isSelected = isSameDay(day, selectedDate);
                                const isToday = isSameDay(day, today);

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDayClick(day)}
                                        disabled={!isCurrentMonth}
                                        className={`
                                            w-full aspect-square text-[11px] font-medium rounded transition-all duration-100 relative
                                            ${!isCurrentMonth ? 'text-gray-700' : 'text-white hover:bg-white/10'}
                                            ${isSelected ? 'bg-primary text-[#090c19] font-bold' : ''}
                                            ${isToday ? 'border border-primary/50' : ''}
                                        `}
                                    >
                                        {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-primary rounded-full"></span>}
                                        {day.getDate()}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
                <div className="px-4 py-3 border-t border-white/5 bg-[#0f1422] flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-[#1e293b] hover:bg-[#334155] rounded transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleConfirm} className="px-3 py-1.5 text-xs font-bold text-[#090c19] bg-primary hover:bg-[#129683] rounded transition-colors">
                        Confirmar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const ExtraGains: React.FC<ExtraGainsProps> = ({
    gains, setGains,
    origins, setOrigins,
    bookmakers,
    statuses, setStatuses,
    appSettings,
    setSettings,
    currentUser
}) => {
    const [periodType, setPeriodType] = useState<'month' | 'year' | 'custom' | 'all'>('month');
    const [viewDate, setViewDate] = useState(new Date());
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
    const [originFilter, setOriginFilter] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configTab, setConfigTab] = useState<'categories' | 'status'>('categories');
    const [configError, setConfigError] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('Gift');
    const [newCategoryColor, setNewCategoryColor] = useState('#fbbf24');
    const [newCategoryBgColor, setNewCategoryBgColor] = useState<string>('');
    const [iconMode, setIconMode] = useState<'preset' | 'upload'>('preset');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newStatusName, setNewStatusName] = useState('');
    const [newStatusColor, setNewStatusColor] = useState('#6ee7b7');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [activeColorPicker, setActiveColorPicker] = useState<{ type: 'icon' | 'bg' | 'status', anchor: HTMLElement } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGains, setExpandedGains] = useState<Set<string>>(new Set());
    const notesRef = useRef<HTMLTextAreaElement>(null);

    // Photo Upload State
    const [tempPhotos, setTempPhotos] = useState<{ url: string, file?: File }[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Viewer State
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const [viewerStartIndex, setViewerStartIndex] = useState(0);

    // Form Date Picker State
    const [isFormDatePickerOpen, setIsFormDatePickerOpen] = useState(false);

    // Local Privacy Mode (independent from global settings)
    const [localPrivacyMode, setLocalPrivacyMode] = useState(false);

    const initialFormState: FormState = {
        id: '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        origin: '',
        bookmakerId: '',
        game: '',
        status: 'Recebido',
        notes: '',
    };
    const [formData, dispatch] = useReducer(formReducer, initialFormState);

    useEffect(() => {
        if (isModalOpen && notesRef.current) {
            notesRef.current.value = formData.notes || '';
        }
    }, [isModalOpen, formData.notes]);

    useEffect(() => {
        setConfigError(null);
    }, [configTab, isConfigModalOpen]);

    const toggleGainDetails = (id: string) => {
        setExpandedGains(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handlePeriodChange = (value: string) => {
        setPeriodType(value as any);
        if (value === 'custom') {
            setIsDateRangeModalOpen(true);
        }
    };

    const handleDateNav = (increment: number) => {
        const newDate = new Date(viewDate);
        if (periodType === 'month') newDate.setMonth(newDate.getMonth() + increment);
        if (periodType === 'year') newDate.setFullYear(newDate.getFullYear() + increment);
        setViewDate(newDate);
    };

    const getPeriodLabel = () => {
        switch (periodType) {
            case 'month': return `em ${viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
            case 'year': return `em ${viewDate.getFullYear().toString()}`;
            case 'custom':
                if (startDate && endDate) return `de ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;
                return 'em período personalizado';
            case 'all': return 'em todo o período';
        }
    };

    const getShortPeriodLabel = () => {
        switch (periodType) {
            case 'month': return viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            case 'year': return viewDate.getFullYear().toString();
            case 'custom':
                if (startDate && endDate) return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;
                return 'Selecione o intervalo';
            case 'all': return 'Todo o Período';
        }
    };

    const filteredGains = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return gains.filter(g => {
            const d = parseDate(g.date);
            let isDateMatch = false;
            switch (periodType) {
                case 'month': isDateMatch = d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear(); break;
                case 'year': isDateMatch = d.getFullYear() === viewDate.getFullYear(); break;
                case 'custom':
                    if (startDate && endDate) {
                        const startOfDay = new Date(startDate); startOfDay.setHours(0, 0, 0, 0);
                        const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999);
                        isDateMatch = d >= startOfDay && d <= endOfDay;
                    }
                    break;
                case 'all': isDateMatch = true; break;
            }

            if (!(originFilter === 'all' || g.origin === originFilter)) return false;

            if (term) {
                const matchesGame = g.game?.toLowerCase().includes(term);
                const matchesOrigin = g.origin.toLowerCase().includes(term);
                const matchesNotes = g.notes?.toLowerCase().includes(term);
                if (!matchesGame && !matchesOrigin && !matchesNotes) {
                    return false;
                }
            }
            return isDateMatch;
        });
    }, [gains, periodType, viewDate, startDate, endDate, originFilter, searchTerm]);

    const stats = useMemo(() => {
        const totalInPeriod = filteredGains.reduce((acc, curr) => acc + curr.amount, 0);
        const yearlyGains = gains.filter(g => parseDate(g.date).getFullYear() === viewDate.getFullYear());
        const totalYearly = yearlyGains.reduce((acc, curr) => acc + curr.amount, 0);
        return { totalInPeriod, totalYearly };
    }, [filteredGains, gains, viewDate]);

    const openImageViewer = (images: string[], startIndex: number) => {
        setViewerImages(images);
        setViewerStartIndex(startIndex);
        setIsViewerOpen(true);
    };

    const handleOpenNew = () => {
        setEditingId(null);
        setIsDeleting(false);
        setTempPhotos([]); // Reset photos
        dispatch({
            type: 'RESET',
            payload: {
                ...initialFormState,
                id: Date.now().toString(),
                origin: origins[0]?.name || '',
                bookmakerId: bookmakers[0]?.id || ''
            }
        });
        setIsModalOpen(true);
    };

    const handleEdit = (gain: ExtraGain) => {
        const { photos, ...gainData } = gain;
        setEditingId(gain.id);
        setIsDeleting(false);

        // Initialize temp photos with existing URLs
        setTempPhotos(photos ? photos.map(url => ({ url })) : []);

        dispatch({
            type: 'RESET',
            payload: {
                ...initialFormState,
                ...gainData,
                date: gain.date.includes('T') ? gain.date.split('T')[0] : gain.date,
            }
        });
        setIsModalOpen(true);
    };

    const handleDuplicate = (gain: ExtraGain) => { const newGain: ExtraGain = { ...gain, id: Date.now().toString(), game: gain.game ? `${gain.game} (Cópia)` : `${gain.origin} (Cópia)`, photos: gain.photos || [] }; setGains(prev => [newGain, ...prev]); };
    const handleDeleteModal = () => { if (editingId) { setGains(prev => prev.filter(g => g.id !== editingId)); setIsModalOpen(false); setEditingId(null); } };
    const confirmDeleteList = () => { if (deleteId) { setGains(prev => prev.filter(g => g.id !== deleteId)); setDeleteId(null); } };

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
        if (!formData.amount || formData.amount <= 0) return alert('Informe o valor');
        if (!formData.bookmakerId) return alert('Selecione a casa de aposta');

        setIsUploading(true);
        const finalNotes = notesRef.current?.value ?? '';

        try {
            // Process Photos - Convert to base64 instead of uploading to Firebase
            const uploadedPhotoUrls: string[] = await Promise.all(tempPhotos.map(async (photo) => {
                if (photo.file) {
                    // Convert file to base64
                    return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(photo.file!);
                    });
                } else {
                    return photo.url;
                }
            }));

            const gainData: ExtraGain = {
                ...formData,
                id: editingId || formData.id,
                notes: finalNotes,
                photos: uploadedPhotoUrls,
                date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
            };

            if (editingId) {
                setGains(prev => prev.map(g => g.id === editingId ? gainData : g));
            } else {
                setGains(prev => [gainData, ...prev]);
            }
            setIsModalOpen(false);
            setEditingId(null);
        } catch (error) {
            console.error("Error saving gain:", error);
            alert("Erro ao salvar. Tente novamente.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddCategory = () => { const name = newCategoryName.trim(); if (!name) { setConfigError('O nome é obrigatório'); return; } if (origins.some(o => o.name.toLowerCase() === name.toLowerCase())) { setConfigError('Esta categoria já existe'); return; } const newOrigin: OriginItem = { id: Date.now().toString(), name: name, color: newCategoryColor, backgroundColor: newCategoryBgColor || undefined, icon: newCategoryIcon }; setOrigins([...origins, newOrigin]); setNewCategoryName(''); setConfigError(null); };
    const handleRemoveCategory = (id: string) => { setOrigins(origins.filter(o => o.id !== id)); };
    const handleAddStatus = () => { const name = newStatusName.trim(); if (!name) { setConfigError('O nome é obrigatório'); return; } if (statuses.some(s => s.name.toLowerCase() === name.toLowerCase())) { setConfigError('Este status já existe'); return; } const newStatus: StatusItem = { id: Date.now().toString(), name: name, color: newStatusColor }; setStatuses([...statuses, newStatus]); setNewStatusName(''); setConfigError(null); };
    const handleRemoveStatus = (id: string) => { setStatuses(statuses.filter(s => s.id !== id)); };

    const performQuickCrop = (src: string, mode: 'cover' | 'contain', updateState: (s: string) => void) => { const img = new Image(); img.src = src; img.crossOrigin = "anonymous"; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return; const size = 400; canvas.width = size; canvas.height = size; ctx.clearRect(0, 0, size, size); const imgAspect = img.naturalWidth / img.naturalHeight; const canvasAspect = 1; let renderW, renderH, offsetX, offsetY; if (mode === 'cover') { if (imgAspect > canvasAspect) { renderH = size; renderW = size * imgAspect; offsetX = -(renderW - size) / 2; offsetY = 0; } else { renderW = size; renderH = size / imgAspect; offsetX = 0; offsetY = -(renderH - size) / 2; } } else { if (imgAspect > canvasAspect) { renderW = size; renderH = size / imgAspect; offsetX = 0; offsetY = (size - renderH) / 2; } else { renderH = size; renderW = size * imgAspect; offsetX = (size - renderW) / 2; offsetY = 0; } } ctx.drawImage(img, offsetX, offsetY, renderW, renderH); updateState(canvas.toDataURL('image/png')); }; };
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setNewCategoryIcon(reader.result as string); setIconMode('upload'); }; reader.readAsDataURL(file); } };

    const originOptions: DropdownOption[] = [{ label: 'Todas Origens', value: 'all', icon: <Coins size={16} className="text-gray-400" /> }, ...origins.map(o => ({ label: o.name, value: o.name, icon: <RenderIcon iconSource={o.icon} size={16} className="opacity-70" /> }))];
    const bookmakerOptions: DropdownOption[] = bookmakers.map(b => ({ label: b.name, value: b.id, icon: (<div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-[#090c19] overflow-hidden" style={{ backgroundColor: b.color || '#FFFFFF' }}> {b.logo ? <img src={b.logo} alt={b.name} className="w-full h-full object-contain p-[1px]" /> : b.name.substring(0, 2).toUpperCase()} </div>) }));
    const statusOptionsForForm: DropdownOption[] = statuses.map(s => ({ label: s.name, value: s.name, icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} /> }));
    const periodTypeOptions: DropdownOption[] = [
        { label: 'Mês', value: 'month', icon: <Calendar size={14} /> },
        { label: 'Ano', value: 'year', icon: <Calendar size={14} /> },
        { label: 'Personalizado', value: 'custom', icon: <Settings2 size={14} /> },
        { label: 'Todo o Período', value: 'all', icon: <Infinity size={14} /> }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">

            <DateRangePickerModal
                isOpen={isDateRangeModalOpen}
                onClose={() => setIsDateRangeModalOpen(false)}
                onApply={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                    setIsDateRangeModalOpen(false);
                }}
                initialStart={startDate}
                initialEnd={endDate}
            />

            <SingleDatePickerModal
                isOpen={isFormDatePickerOpen}
                onClose={() => setIsFormDatePickerOpen(false)}
                onSelect={(date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    dispatch({ type: 'UPDATE_FIELD', field: 'date', value: dateStr });
                    setIsFormDatePickerOpen(false);
                }}
                initialDate={formData.date ? parseDate(formData.date) : new Date()}
            />

            <CustomColorPicker isOpen={activeColorPicker !== null} onClose={() => setActiveColorPicker(null)} color={activeColorPicker?.type === 'icon' ? newCategoryColor : activeColorPicker?.type === 'bg' ? (newCategoryBgColor || '#000000') : activeColorPicker?.type === 'status' ? newStatusColor : '#000000'} onChange={(c) => { if (activeColorPicker?.type === 'icon') setNewCategoryColor(c); if (activeColorPicker?.type === 'bg') setNewCategoryBgColor(c); if (activeColorPicker?.type === 'status') setNewStatusColor(c); }} anchorEl={activeColorPicker?.anchor} />
            <ImageViewer isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} images={viewerImages} startIndex={viewerStartIndex} />

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20">
                        <Coins size={24} className="text-secondary" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Ganhos Extras</h2>
                </div>
                <p className="text-textMuted text-sm ml-[52px]">Registre recompensas fora das apostas (rodadas grátis, baús, etc).</p>
            </div>

            <div>
                <Input
                    icon={<Search size={18} />}
                    placeholder="Buscar ganhos por jogo, origem, notas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div>
                <Button onClick={handleOpenNew} className="shadow-lg shadow-primary/10 w-full sm:w-auto">
                    <Plus size={18} /> Novo Ganho
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-textMuted font-bold uppercase tracking-wider">Ganhos {getPeriodLabel()}</span>
                        <Calendar size={16} className="text-gray-600" />
                    </div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold text-white tracking-tight">
                            <MoneyDisplay value={stats.totalInPeriod} privacyMode={localPrivacyMode} />
                        </h3>
                        <button onClick={() => setLocalPrivacyMode(!localPrivacyMode)} className="text-gray-500 hover:text-white transition-colors">
                            {localPrivacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <p className="text-xs text-secondary mt-1 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {filteredGains.length} {filteredGains.length === 1 ? 'registro' : 'registros'}
                    </p>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-textMuted font-bold uppercase tracking-wider">Acumulado em {viewDate.getFullYear()}</span>
                        <Trophy size={16} className="text-yellow-500" />
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight mb-2">
                        <MoneyDisplay value={stats.totalYearly} privacyMode={localPrivacyMode} />
                    </h3>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-secondary to-yellow-400 h-full rounded-full" style={{ width: '60%' }} />
                    </div>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex flex-col md:flex-row flex-1 items-stretch md:items-center gap-2 bg-surface p-2 rounded-xl border border-white/5">
                        <div className="flex-1 md:flex-initial">
                            <Dropdown options={periodTypeOptions} value={periodType} onChange={handlePeriodChange} />
                        </div>
                        <div className="flex items-center justify-between gap-1 bg-[#0d1121] border border-white/10 rounded-lg px-1 py-1 flex-1">
                            <Button size="sm" variant="neutral" onClick={() => handleDateNav(-1)} disabled={periodType === 'all' || periodType === 'custom'}> <ChevronLeft size={16} /> </Button>
                            <span className="text-sm font-bold text-white text-center flex-grow min-w-0 whitespace-nowrap capitalize cursor-pointer truncate" onClick={() => periodType === 'custom' && setIsDateRangeModalOpen(true)}> {getShortPeriodLabel()} </span>
                            <Button size="sm" variant="neutral" onClick={() => handleDateNav(1)} disabled={periodType === 'all' || periodType === 'custom'}> <ChevronRight size={16} /> </Button>
                        </div>
                    </div>
                    <div className="flex-1">
                        <Dropdown options={originOptions} value={originFilter} onChange={setOriginFilter} />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {filteredGains.length > 0 ? filteredGains.map(gain => {
                    const bookie = bookmakers.find(b => b.id === gain.bookmakerId);
                    const originItem = origins.find(o => o.name === gain.origin);
                    const originColor = originItem?.color || '#94a3b8';
                    const originBg = originItem?.backgroundColor;
                    const isConfirmed = gain.status === 'Confirmado' || gain.status === 'Recebido';

                    const statusItem = statuses.find(s => s.name === gain.status);
                    const statusColor = statusItem ? statusItem.color : '#94a3b8';

                    const isExpanded = expandedGains.has(gain.id);

                    return (
                        <Card key={gain.id} className="group border-none bg-surface hover:bg-[#1a2133] transition-all relative p-0 overflow-hidden">
                            <div className="p-4" onClick={() => { if (!deleteId) handleEdit(gain); }}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner overflow-hidden" style={{ backgroundColor: originBg ? originBg : `${originColor}15`, color: originColor, borderColor: originBg ? 'transparent' : undefined }}>
                                            <RenderIcon iconSource={originItem?.icon} size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-none">{gain.game || gain.origin}</span>
                                                <Badge color={originColor} className="hidden sm:inline-flex py-0.5 px-1.5 text-[9px]">{gain.origin}</Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <div className="w-3 h-3 rounded-sm flex items-center justify-center text-[6px] font-bold text-[#090c19]" style={{ backgroundColor: bookie?.color || '#fff' }}>
                                                        {bookie?.name?.substring(0, 1)}
                                                    </div>
                                                    <span className="hidden sm:inline">{bookie?.name}</span>
                                                </span>
                                                <span className="hidden sm:inline">•</span>
                                                <span>{new Date(gain.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`font-bold text-sm ${isConfirmed ? 'text-[#6ee7b7]' : 'text-textMuted'}`}> <MoneyDisplay value={gain.amount} prefix="+ R$" /> </p>
                                        <span style={{ backgroundColor: `${statusColor}1A`, color: statusColor, borderColor: `${statusColor}33` }} className="text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 border">{gain.status}</span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-300">
                                        {gain.notes && (
                                            <div className="mb-4">
                                                <label className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-2 mb-2"><StickyNote size={12} /> Anotações</label>
                                                <p className="text-sm text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5">{gain.notes}</p>
                                            </div>
                                        )}
                                        {gain.photos && gain.photos.length > 0 && (
                                            <div>
                                                <label className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-2 mb-2"><ImageIcon size={12} /> Fotos</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {gain.photos.map((photo, idx) => (
                                                        <div key={idx} onClick={(e) => { e.stopPropagation(); openImageViewer(gain.photos || [], idx); }} className="w-16 h-16 rounded border border-white/10 overflow-hidden cursor-zoom-in hover:scale-110 transition-transform hover:border-primary bg-black/50">
                                                            <img src={photo} alt="thumb" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {(!gain.notes || gain.notes.trim() === '') && (!gain.photos || gain.photos.length === 0) && (
                                            <p className="text-sm text-gray-500 text-center py-4">Sem detalhes adicionais.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="px-4 pb-4">
                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleGainDetails(gain.id); }}
                                        className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all active:scale-95"
                                        title={isExpanded ? "Ocultar detalhes" : "Mostrar detalhes"}
                                    >
                                        <ChevronDown size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    <div className="flex items-center gap-2">
                                        {deleteId === gain.id ? (<div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200"> <span className="text-[10px] text-danger font-bold uppercase mr-1">Excluir este ganho?</span> <button onClick={(e) => { e.stopPropagation(); confirmDeleteList(); }} className="p-1.5 px-3 bg-danger text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold" title="Confirmar"> <Check size={14} /> Sim </button> <button onClick={(e) => { e.stopPropagation(); setDeleteId(null); }} className="p-1.5 px-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold" title="Cancelar"> <X size={14} /> Não </button> </div>) : (<> <button onClick={(e) => { e.stopPropagation(); handleDuplicate(gain); }} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 group/btn" title="Duplicar"> <Copy size={16} /> <span className="text-[10px] font-medium group-hover/btn:text-white hidden sm:inline">Duplicar</span> </button> <button onClick={(e) => { e.stopPropagation(); handleEdit(gain); }} className="p-2 text-gray-500 hover:text-primary hover:bg-white/5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 group/btn" title="Editar"> <Edit2 size={16} /> <span className="text-[10px] font-medium group-hover/btn:text-primary hidden sm:inline">Editar</span> </button> <button onClick={(e) => { e.stopPropagation(); setDeleteId(gain.id); }} className="p-2 text-gray-500 hover:text-danger hover:bg-white/5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 group/btn" title="Excluir"> <Trash2 size={16} /> <span className="text-[10px] font-medium group-hover/btn:text-danger hidden sm:inline">Excluir</span> </button> </>)}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                        <div className="p-4 bg-[#151b2e] rounded-full mb-3"> <SearchX size={32} className="text-gray-600" /> </div>
                        <h3 className="text-white font-bold">Nenhum ganho encontrado</h3>
                        <p className="text-sm text-textMuted mt-1">Registre novos ganhos para ver estatísticas.</p>
                    </div>
                )}
            </div>
            <Modal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} title="Configurações de Ganhos" footer={null}>
                <div className="flex flex-col h-[500px]">
                    <div className="flex gap-6 border-b border-white/10 mb-6">
                        <button onClick={() => setConfigTab('categories')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${configTab === 'categories' ? 'text-primary border-primary' : 'text-textMuted border-transparent hover:text-white'}`}> Categorias </button>
                        <button onClick={() => setConfigTab('status')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${configTab === 'status' ? 'text-primary border-primary' : 'text-textMuted border-transparent hover:text-white'}`}> Status </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {configTab === 'categories' ? (
                            <div className="space-y-6">
                                <div className="bg-[#0d1121] p-4 rounded-xl border border-white/5 space-y-4">
                                    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden" style={{ backgroundColor: newCategoryBgColor || `${newCategoryColor}20`, color: newCategoryColor }}> <RenderIcon iconSource={newCategoryIcon} size={24} /> </div>
                                        <div className="flex-1">
                                            <Input placeholder="Nome da Origem" value={newCategoryName} onChange={e => { setNewCategoryName(e.target.value); if (configError) setConfigError(null); }} className={`mb-0 border-transparent bg-transparent focus:bg-[#090c19] ${configError ? 'border-danger focus:border-danger' : ''}`} />
                                            {configError && (<div className="flex items-center gap-1.5 mt-1 animate-in slide-in-from-left-2 text-danger"> <AlertCircle size={10} /> <span className="text-[10px] font-bold">{configError}</span> </div>)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <button onClick={() => setIconMode('preset')} className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors ${iconMode === 'preset' ? 'bg-primary text-[#090c19]' : 'bg-white/5 text-gray-400'}`}> Biblioteca </button>
                                            <button onClick={() => setIconMode('upload')} className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors ${iconMode === 'upload' ? 'bg-primary text-[#090c19]' : 'bg-white/5 text-gray-400'}`}> Upload </button>
                                        </div>
                                        {iconMode === 'preset' ? (<div className="grid grid-cols-7 gap-2"> {Object.keys(ICON_MAP).map((iconKey) => (<button key={iconKey} onClick={() => setNewCategoryIcon(iconKey)} className={`aspect-square rounded-md flex items-center justify-center transition-all ${newCategoryIcon === iconKey ? 'bg-primary text-[#090c19] shadow-lg' : 'bg-[#151b2e] text-gray-500 hover:text-white'}`} title={iconKey}> <RenderIcon iconSource={iconKey} size={16} /> </button>))} </div>) : (<div className="w-full"> {iconMode === 'upload' && newCategoryIcon && newCategoryIcon.startsWith('data:') && (<div className="flex gap-2 w-full justify-center mb-2"> <button onClick={() => performQuickCrop(newCategoryIcon, 'cover', setNewCategoryIcon)} className="px-3 py-1.5 bg-[#151b2e] border border-white/10 rounded text-[10px] text-white hover:bg-white/5 flex items-center gap-1" title="Preencher todo o espaço (Cortar excessos)"> <Maximize size={12} /> Preencher </button> <button onClick={() => performQuickCrop(newCategoryIcon, 'contain', setNewCategoryIcon)} className="px-3 py-1.5 bg-[#151b2e] border border-white/10 rounded text-[10px] text-white hover:bg-white/5 flex items-center gap-1" title="Caber inteiro (Com bordas)"> <Minimize size={12} /> Ajustar </button> </div>)} <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" id="icon-upload-input" /> <label htmlFor="icon-upload-input" className="flex flex-col items-center justify-center gap-2 w-full h-24 bg-[#151b2e] border border-dashed border-white/20 rounded-lg cursor-pointer hover:border-primary hover:text-primary transition-all text-xs text-gray-400"> <Upload size={20} /> <span>Clique para enviar imagem</span> </label> </div>)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-textMuted uppercase flex items-center gap-1"> <Palette size={10} /> Cor do Ícone </label>
                                            <div className="grid grid-cols-5 gap-1.5"> {COLORS.slice(0, 4).map(c => (<button key={c} onClick={() => setNewCategoryColor(c)} className={`w-full aspect-square rounded transition-transform ${newCategoryColor === c ? 'ring-1 ring-white scale-110 z-10' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />))} <div className={`relative group w-full aspect-square rounded overflow-hidden cursor-pointer border border-white/10 ${!COLORS.slice(0, 4).includes(newCategoryColor) ? 'ring-2 ring-white z-10' : ''}`} onClick={(e) => setActiveColorPicker({ type: 'icon', anchor: e.currentTarget })}> <div className="w-full h-full flex items-center justify-center bg-[#151b2e]" style={{ background: 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #00FF00 120deg, #0000FF 240deg, #FF0000 360deg)' }}> <Plus size={14} className="text-white drop-shadow-md" strokeWidth={3} /> </div> </div> </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-textMuted uppercase flex items-center gap-1"> <Box size={10} /> Fundo (Opcional) </label>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                <button onClick={() => setNewCategoryBgColor('')} className={`w-full aspect-square rounded flex items-center justify-center border border-white/10 bg-[#151b2e] transition-transform ${!newCategoryBgColor ? 'ring-1 ring-white scale-110 z-10' : 'opacity-60 hover:opacity-100'}`} title="Sem Fundo"> <Ban size={12} className="text-gray-400" /> </button>
                                                {COLORS.slice(0, 3).map(c => (<button key={c} onClick={() => setNewCategoryBgColor(c)} className={`w-full aspect-square rounded transition-transform ${newCategoryBgColor === c ? 'ring-1 ring-white scale-110 z-10' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />))} <div className={`relative group w-full aspect-square rounded overflow-hidden cursor-pointer border border-white/10 ${newCategoryBgColor && !COLORS.slice(0, 3).includes(newCategoryBgColor) ? 'ring-2 ring-white z-10' : ''}`} onClick={(e) => setActiveColorPicker({ type: 'bg', anchor: e.currentTarget })}> <div className="w-full h-full flex items-center justify-center bg-[#151b2e]" style={{ background: 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #00FF00 120deg, #0000FF 240deg, #FF0000 360deg)' }}> <Plus size={14} className="text-white drop-shadow-md" strokeWidth={3} /> </div> </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button onClick={handleAddCategory} className="w-full"> <Plus size={16} /> Adicionar </Button>
                                </div>
                                <div>
                                    <h5 className="text-xs font-bold text-textMuted uppercase mb-3">Existentes</h5>
                                    <div className="space-y-2"> {origins.map(origin => (<div key={origin.id} className="flex items-center justify-between p-3 bg-[#0d1121] border border-white/5 rounded-lg group"> <div className="flex items-center gap-3"> <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border border-white/5 overflow-hidden" style={{ backgroundColor: origin.backgroundColor || `${origin.color}20`, color: origin.color }}> <RenderIcon iconSource={origin.icon} size={14} /> </div> <span className="font-medium text-white text-sm">{origin.name}</span> </div> <button onClick={() => handleRemoveCategory(origin.id)} className="p-2 text-gray-500 hover:text-danger hover:bg-danger/10 rounded-md transition-colors"> <Trash2 size={16} /> </button> </div>))} </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-[#0d1121] p-4 rounded-xl border border-white/5 space-y-4">
                                    <div>
                                        <Input placeholder="Nome do Status (ex: Processando)" value={newStatusName} onChange={e => { setNewStatusName(e.target.value); if (configError) setConfigError(null); }} className={configError ? 'border-danger focus:border-danger' : ''} />
                                        {configError && (<div className="flex items-center gap-1.5 mt-1 animate-in slide-in-from-left-2 text-danger"> <AlertCircle size={10} /> <span className="text-[10px] font-bold">{configError}</span> </div>)}
                                    </div>
                                    <div className="flex items-center gap-3 bg-[#151b2e] p-2 rounded-lg border border-white/5">
                                        <div className="w-10 h-10 rounded-md shrink-0 border border-white/10 shadow-sm" style={{ backgroundColor: newStatusColor }} />
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Cor do Status</label>
                                            <div className="flex gap-1.5 flex-wrap"> {COLORS.map(c => (<button key={c} onClick={() => setNewStatusColor(c)} className={`w-6 h-6 rounded transition-transform ${newStatusColor === c ? 'scale-110 ring-2 ring-white z-10' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />))} <div className={`relative group w-6 h-6 rounded overflow-hidden cursor-pointer border border-white/10 ${!COLORS.includes(newStatusColor) ? 'ring-2 ring-white z-10' : ''}`} onClick={(e) => setActiveColorPicker({ type: 'status', anchor: e.currentTarget })}> <div className="w-full h-full flex items-center justify-center" style={{ background: 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #00FF00 120deg, #0000FF 240deg, #FF0000 360deg)' }}> <Plus size={10} className="text-white drop-shadow-md" strokeWidth={3} /> </div> </div> </div>
                                        </div>
                                    </div>
                                    <Button onClick={handleAddStatus} className="w-full"> <Plus size={16} /> Adicionar Status </Button>
                                </div>
                                <div>
                                    <h5 className="text-xs font-bold text-textMuted uppercase mb-3">Existentes</h5>
                                    <div className="space-y-2"> {statuses.map(status => (<div key={status.id} className="flex items-center justify-between p-3 bg-[#0d1121] border border-white/5 rounded-lg group"> <div className="flex items-center gap-3"> <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} /> <span className="font-medium text-white text-sm">{status.name}</span> </div> <button onClick={() => handleRemoveStatus(status.id)} className="p-2 text-gray-500 hover:text-danger hover:bg-danger/10 rounded-md transition-colors"> <Trash2 size={16} /> </button> </div>))} </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Ganho" : "Novo Ganho Extra"} footer={<div className="flex justify-between gap-3 w-full"> {editingId && (<button onClick={() => setIsDeleting(true)} className="p-3 text-gray-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"> <Trash2 size={20} /> </button>)} <div className="flex gap-3 ml-auto"> <Button variant="neutral" onClick={() => setIsModalOpen(false)} disabled={isUploading}>Cancelar</Button> {isDeleting ? (<Button variant="danger" onClick={handleDeleteModal}>Confirmar Exclusão</Button>) : (<Button onClick={handleSave} disabled={isUploading}> {isUploading ? (<> <Loader2 size={16} className="animate-spin" /> <span>Salvando...</span> </>) : ("Salvar")} </Button>)} </div> </div>}>
                <div className="space-y-5">
                    <div className="bg-[#0d1121] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center mb-2">
                        <label className="text-[10px] text-textMuted uppercase font-bold mb-2">Valor do Ganho</label>
                        <div className="relative flex items-center">
                            <span className="text-xl font-bold text-gray-500">R$</span>
                            <input type="text" inputMode="decimal" className="bg-transparent text-center text-4xl font-bold text-white w-48 focus:outline-none placeholder-gray-700" placeholder="0,00" value={formData.amount || ''} onChange={e => { const value = e.target.value.replace(/[^0-9]/g, ''); dispatch({ type: 'UPDATE_FIELD', field: 'amount', value: value ? parseFloat(value) / 100 : 0 }); }} autoFocus />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-textMuted text-xs font-bold uppercase tracking-wider">Data</label>
                            <button
                                type="button"
                                onClick={() => {
                                    console.log('Botão de data clicado!');
                                    setIsFormDatePickerOpen(true);
                                    console.log('isFormDatePickerOpen definido como true');
                                }}
                                className="w-full bg-[#0d1121] border border-white/10 focus:border-primary text-white rounded-lg py-3 px-4 text-left hover:bg-[#151b2e] transition-colors flex items-center justify-between group"
                            >
                                <span className="text-sm">{formData.date ? new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Selecione a data'}</span>
                                <Calendar size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
                            </button>
                        </div>
                        <Dropdown label="Status" options={statusOptionsForForm} value={formData.status || 'Recebido'} onChange={v => dispatch({ type: 'UPDATE_FIELD', field: 'status', value: v as any })} />
                    </div>
                    <Dropdown label="Origem" options={origins.map(o => ({ label: o.name, value: o.name, icon: <RenderIcon iconSource={o.icon} size={16} /> }))} value={formData.origin || ''} onChange={v => dispatch({ type: 'UPDATE_FIELD', field: 'origin', value: v })} />
                    <Dropdown
                        label="Casa de Aposta"
                        options={bookmakerOptions}
                        value={formData.bookmakerId || ''}
                        onChange={v => dispatch({ type: 'UPDATE_FIELD', field: 'bookmakerId', value: v })}
                        placeholder="Selecione a Casa"
                        isSearchable={true}
                        searchPlaceholder="Buscar casa..."
                    />
                    <Input label="Jogo / Detalhe (Opcional)" placeholder="Ex: Gates of Olympus, Roda da Sorte..." value={formData.game || ''} onChange={e => dispatch({ type: 'UPDATE_FIELD', field: 'game', value: e.target.value })} icon={<Gamepad2 size={16} />} />

                    <div className="space-y-3">
                        <label className="block text-textMuted text-xs font-bold uppercase tracking-wider">Anotações & Mídia</label>

                        <textarea
                            ref={notesRef}
                            className="w-full bg-[#0d1121] border border-white/10 focus:border-primary text-white rounded-lg py-3 px-4 placeholder-gray-600 focus:outline-none transition-colors text-sm min-h-[100px] resize-none shadow-inner"
                            placeholder="Detalhes extras..."
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

export default ExtraGains;
