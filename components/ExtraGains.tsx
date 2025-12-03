import React, { useState, useReducer, useRef, useEffect } from 'react';
import { Card, Button, Input, Dropdown, Modal, Badge, MoneyDisplay, ImageViewer, CustomColorPicker, RenderIcon, ICON_MAP, DateRangePickerModal, SingleDatePickerModal, DropdownOption } from './ui/UIComponents';
import {
    Plus, Trash2, Edit2, X, Check, Search, Filter, Download, Upload, Calendar, ChevronDown, ChevronLeft, ChevronRight,
    Copy, MoreVertical, AlertCircle, ImageIcon, StickyNote, Trophy, Coins, Gamepad2, Paperclip, SearchX, Settings2,
    Infinity, Eye, EyeOff, Maximize, Minimize, Palette, Box, Ban, Loader2
} from 'lucide-react';
import { ExtraGain, Bookmaker, StatusItem, OriginItem, AppSettings, User, PromotionItem } from '../types';
import BetFormModal from './BetFormModal';
import { FirestoreService } from '../services/firestoreService';
import { compressImage } from '../utils/imageCompression';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b', '#000000', '#FFFFFF'];

interface ExtraGainsProps {
    gains: ExtraGain[];
    setGains: React.Dispatch<React.SetStateAction<ExtraGain[]>>;
    origins: OriginItem[];
    setOrigins: React.Dispatch<React.SetStateAction<OriginItem[]>>;
    bookmakers: Bookmaker[];
    statuses: StatusItem[];
    setStatuses: React.Dispatch<React.SetStateAction<StatusItem[]>>;
    promotions: PromotionItem[];
    appSettings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    currentUser: User | null;
}

interface FormState {
    id?: string;
    amount: number;
    date: string;
    status: 'Pendente' | 'Confirmado' | 'Recebido' | 'Cancelado';
    origin: string;
    bookmakerId: string;
    game: string;
    notes: string;
}

type FormAction =
    | { type: 'SET_FORM'; payload: FormState }
    | { type: 'UPDATE_FIELD'; field: keyof FormState; value: any }
    | { type: 'RESET_FORM' };

const initialFormState: FormState = {
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'Recebido',
    origin: '',
    bookmakerId: '',
    game: '',
    notes: ''
};

const formReducer = (state: FormState, action: FormAction): FormState => {
    switch (action.type) {
        case 'SET_FORM': return action.payload;
        case 'UPDATE_FIELD': return { ...state, [action.field]: action.value };
        case 'RESET_FORM': return initialFormState;
        default: return state;
    }
};

const ExtraGains: React.FC<ExtraGainsProps> = ({
    gains, setGains,
    origins, setOrigins,
    bookmakers,
    statuses, setStatuses,
    promotions,
    appSettings,
    setSettings,
    currentUser
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [formData, dispatch] = useReducer(formReducer, initialFormState);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBetModalOpen, setIsBetModalOpen] = useState(false);
    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [tempPhotos, setTempPhotos] = useState<{ url: string, file?: File }[]>([]);

    // Config State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [configError, setConfigError] = useState<string | null>(null);
    const [newCategoryColor, setNewCategoryColor] = useState(COLORS[6]);
    const [newCategoryBgColor, setNewCategoryBgColor] = useState<string>('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('Star');
    const [newStatusName, setNewStatusName] = useState('');
    const [newStatusColor, setNewStatusColor] = useState(COLORS[6]);
    const [iconMode, setIconMode] = useState<'preset' | 'upload'>('preset');
    const [activeColorPicker, setActiveColorPicker] = useState<{ type: 'icon' | 'bg' | 'status', anchor: HTMLElement } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Viewer State
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const [viewerStartIndex, setViewerStartIndex] = useState(0);
    const [showFloatingButton, setShowFloatingButton] = useState(false);

    // Scroll listener for floating button - appears when near bottom of viewport but hides when scroll-to-top appears
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const scrollContainer = e.target as HTMLElement;
            if (!scrollContainer) return;

            const scrollTop = scrollContainer.scrollTop;
            const windowHeight = scrollContainer.clientHeight;
            const documentHeight = scrollContainer.scrollHeight;

            // Show button when user has scrolled past 60% of the page BUT hide when scroll-to-top button appears (scrollTop > 300)
            const scrollPercentage = (scrollTop + windowHeight) / documentHeight;
            setShowFloatingButton(scrollPercentage > 0.6 && scrollTop <= 300);
        };

        // Find the main scroll container
        const scrollContainer = document.querySelector('.flex-1.overflow-y-auto.p-4');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll as EventListener);
            // Check initial state
            const scrollTop = scrollContainer.scrollTop;
            const windowHeight = scrollContainer.clientHeight;
            const documentHeight = scrollContainer.scrollHeight;
            const scrollPercentage = (scrollTop + windowHeight) / documentHeight;
            setShowFloatingButton(scrollPercentage > 0.6 && scrollTop <= 300);
        }

        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll as EventListener);
            }
        };
    }, []);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [periodType, setPeriodType] = useState<'month' | 'year' | 'custom' | 'all'>('month');
    const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
    const [isFormDatePickerOpen, setIsFormDatePickerOpen] = useState(false);
    const [localPrivacyMode, setLocalPrivacyMode] = useState(appSettings.privacyMode);
    const [originFilter, setOriginFilter] = useState('all');
    const [expandedGains, setExpandedGains] = useState<Set<string>>(new Set());

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configTab, setConfigTab] = useState<'categories' | 'status'>('categories');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEdit = (gain: ExtraGain) => {
        setEditingId(gain.id);
        dispatch({
            type: 'SET_FORM',
            payload: {
                id: gain.id,
                amount: gain.amount,
                date: gain.date.split('T')[0],
                status: gain.status as any,
                origin: gain.origin,
                bookmakerId: gain.bookmakerId || '',
                game: gain.game || '',
                notes: gain.notes || ''
            }
        });
        setTempPhotos(gain.photos ? gain.photos.map(url => ({ url })) : []);
        setIsModalOpen(true);
        setIsDeleting(false);
    };

    const handleOpenNew = () => {
        setIsChoiceModalOpen(true);
    };

    const handleChoice = (type: 'gain' | 'bet') => {
        setIsChoiceModalOpen(false);
        if (type === 'gain') {
            setEditingId(null);
            dispatch({ type: 'RESET_FORM' });
            setTempPhotos([]);
            setIsModalOpen(true);
            setIsDeleting(false);
        } else {
            setIsBetModalOpen(true);
        }
    };

    const toggleGainDetails = (id: string) => {
        const newExpanded = new Set(expandedGains);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedGains(newExpanded);
    };

    const openImageViewer = (images: string[], index: number) => {
        setViewerImages(images);
        setViewerStartIndex(index);
        setIsViewerOpen(true);
    };

    const handlePeriodChange = (value: string) => {
        setPeriodType(value as any);
        const now = new Date();
        if (value === 'month') {
            setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
            setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        } else if (value === 'year') {
            setStartDate(new Date(now.getFullYear(), 0, 1));
            setEndDate(new Date(now.getFullYear(), 11, 31));
        }
    };

    const handleDateNav = (direction: number) => {
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);
        if (periodType === 'month') {
            newStart.setMonth(newStart.getMonth() + direction);
            newEnd.setMonth(newEnd.getMonth() + direction + 1, 0);
        } else if (periodType === 'year') {
            newStart.setFullYear(newStart.getFullYear() + direction);
            newEnd.setFullYear(newEnd.getFullYear() + direction);
        }
        setStartDate(newStart);
        setEndDate(newEnd);
    };

    const getPeriodLabel = () => {
        if (periodType === 'all') return 'Total';
        if (periodType === 'custom') return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;
        if (periodType === 'year') return startDate.getFullYear().toString();
        return startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    const getShortPeriodLabel = () => {
        if (periodType === 'all') return 'Total';
        if (periodType === 'custom') return 'Período';
        if (periodType === 'year') return startDate.getFullYear().toString();
        return startDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    };

    const parseDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newPhotos = Array.from(e.target.files).map((file: File) => ({
                url: URL.createObjectURL(file),
                file
            }));
            setTempPhotos(prev => [...prev, ...newPhotos]);
        }
    };

    const removePhoto = (index: number) => {
        setTempPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // Filter Logic
    const viewDate = startDate;
    const filteredGains = gains.filter(gain => {
        const gainDate = new Date(gain.date);
        const matchesSearch = searchTerm === '' ||
            gain.game?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            gain.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
            gain.notes?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesOrigin = originFilter === 'all' || gain.origin === originFilter;

        let matchesPeriod = true;
        if (periodType !== 'all') {
            matchesPeriod = gainDate >= startDate && gainDate <= endDate;
        }

        return matchesSearch && matchesOrigin && matchesPeriod;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stats = {
        totalInPeriod: filteredGains.reduce((acc, gain) => {
            if (gain.status === 'Confirmado' || gain.status === 'Recebido' || gain.status === 'Green') return acc + gain.amount;
            if (gain.status === 'Red') return acc - gain.amount; // Red counts as loss
            return acc;
        }, 0),
        totalYearly: gains.filter(g => {
            const d = new Date(g.date);
            return d.getFullYear() === viewDate.getFullYear();
        }).reduce((acc, g) => {
            if (g.status === 'Confirmado' || g.status === 'Recebido' || g.status === 'Green') return acc + g.amount;
            if (g.status === 'Red') return acc - g.amount; // Red counts as loss
            return acc;
        }, 0)
    };

    const handleDuplicate = async (gain: ExtraGain) => {
        if (!currentUser) return;
        const newGain: ExtraGain = {
            ...gain,
            id: Date.now().toString(),
            game: gain.game ? `${gain.game} (Cópia)` : `${gain.origin} (Cópia)`,
            photos: gain.photos || []
        };
        try {
            await FirestoreService.saveGain(currentUser.uid, newGain);
        } catch (error) {
            console.error("Error duplicating gain:", error);
            alert("Erro ao duplicar ganho.");
        }
    };

    const handleDeleteModal = () => {
        if (editingId && currentUser) {
            FirestoreService.deleteGain(currentUser.uid, editingId).catch(err => {
                console.error("Error deleting gain:", err);
                alert("Erro ao excluir ganho.");
            });
            setIsModalOpen(false);
            setEditingId(null);
        }
    };

    const confirmDeleteList = () => {
        if (deleteId && currentUser) {
            FirestoreService.deleteGain(currentUser.uid, deleteId).catch(err => {
                console.error("Error deleting gain:", err);
                alert("Erro ao excluir ganho.");
            });
            setDeleteId(null);
        }
    };

    // ... (handlePhotoSelect, removePhoto remain the same)

    const handleSave = async () => {
        if (!formData.amount || formData.amount <= 0) return alert('Informe o valor');
        if (!formData.bookmakerId) return alert('Selecione a casa de aposta');
        if (!currentUser) return alert('Você precisa estar logado para salvar.');

        setIsUploading(true);

        try {
            // Process Photos - Convert to base64 instead of uploading to Firebase (as per original code, but maybe should use storage?)
            // The original code used base64 for gains photos. Let's keep it consistent with original for now, 
            // or upgrade to Storage if we want. The prompt didn't explicitly say to change this, but Storage is better.
            // However, MyBets uses Storage. Let's stick to base64 for now to minimize changes, or switch to Storage if easy.
            // Actually, storing large base64 strings in Firestore documents is bad practice (1MB limit).
            // But for this task, I'll stick to the existing logic to avoid breaking changes, 
            // unless I want to refactor to Storage like MyBets.
            // Let's stick to base64 for now as per the existing code structure in this file.

            const uploadedPhotoUrls: string[] = await Promise.all(tempPhotos.map(async (photo) => {
                if (photo.file) {
                    try {
                        console.log('🗜️ Compressing image:', photo.file.name, photo.file.size);
                        // Compress image before converting to base64
                        const compressedBase64 = await compressImage(photo.file, {
                            maxWidth: 800, // Reasonable size for viewing
                            maxHeight: 800,
                            quality: 0.7,
                            maxSizeMB: 0.2 // Max 200KB per image
                        });
                        console.log('✅ Image compressed, new size:', compressedBase64.length);
                        return compressedBase64;
                    } catch (err) {
                        console.error('Error compressing image:', err);
                        // Fallback to original if compression fails (though likely to fail save if too big)
                        return new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(photo.file!);
                        });
                    }
                } else {
                    return photo.url;
                }
            }));

            const rawGainData: ExtraGain = {
                ...formData,
                id: editingId || formData.id || Date.now().toString(),
                notes: formData.notes,
                photos: uploadedPhotoUrls,
                date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
            };

            // Remove undefined values
            const gainData = JSON.parse(JSON.stringify(rawGainData));

            await FirestoreService.saveGain(currentUser.uid, gainData);

            setIsModalOpen(false);
            setEditingId(null);
        } catch (error: any) {
            console.error("Error saving gain:", error);
            alert(`Erro ao salvar: ${error.message || error}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) { setConfigError('O nome é obrigatório'); return; }
        if (origins.some(o => o.name.toLowerCase() === name.toLowerCase())) { setConfigError('Esta categoria já existe'); return; }
        if (!currentUser) return;

        const newOrigin: OriginItem = { id: Date.now().toString(), name: name, color: newCategoryColor, backgroundColor: newCategoryBgColor || undefined, icon: newCategoryIcon };

        try {
            await FirestoreService.saveItem(currentUser.uid, 'origins', newOrigin);
            setNewCategoryName('');
            setConfigError(null);
        } catch (err) {
            console.error("Error saving origin:", err);
            setConfigError("Erro ao salvar categoria.");
        }
    };

    const handleRemoveCategory = async (id: string) => {
        if (!currentUser) return;
        try {
            await FirestoreService.deleteItem(currentUser.uid, 'origins', id);
        } catch (err) {
            console.error("Error deleting origin:", err);
        }
    };

    const handleAddStatus = async () => {
        const name = newStatusName.trim();
        if (!name) { setConfigError('O nome é obrigatório'); return; }
        if (statuses.some(s => s.name.toLowerCase() === name.toLowerCase())) { setConfigError('Este status já existe'); return; }
        if (!currentUser) return;

        const newStatus: StatusItem = { id: Date.now().toString(), name: name, color: newStatusColor };

        try {
            await FirestoreService.saveItem(currentUser.uid, 'statuses', newStatus);
            setNewStatusName('');
            setConfigError(null);
        } catch (err) {
            console.error("Error saving status:", err);
            setConfigError("Erro ao salvar status.");
        }
    };

    const handleRemoveStatus = async (id: string) => {
        if (!currentUser) return;
        try {
            await FirestoreService.deleteItem(currentUser.uid, 'statuses', id);
        } catch (err) {
            console.error("Error deleting status:", err);
        }
    };

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
                startDate={startDate}
                endDate={endDate}
            />

            <Modal
                isOpen={isChoiceModalOpen}
                onClose={() => setIsChoiceModalOpen(false)}
                title="Novo Registro"
                footer={null}
            >
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleChoice('gain')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-[#0d1121] border border-white/5 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-all group"
                    >
                        <div className="p-4 bg-secondary/10 rounded-full group-hover:scale-110 transition-transform">
                            <Coins size={32} className="text-secondary" />
                        </div>
                        <span className="font-bold text-white text-sm uppercase">Ganho Extra</span>
                    </button>

                    <button
                        onClick={() => handleChoice('bet')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-[#0d1121] border border-white/5 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-all group"
                    >
                        <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                            <Gamepad2 size={32} className="text-primary" />
                        </div>
                        <span className="font-bold text-white text-sm uppercase">Aposta Esportiva</span>
                    </button>
                </div>
            </Modal>

            <BetFormModal
                isOpen={isBetModalOpen}
                onClose={() => setIsBetModalOpen(false)}
                initialData={null}
                currentUser={currentUser}
                bookmakers={bookmakers}
                statuses={statuses}
                promotions={promotions}
                onSaveSuccess={() => { }}
            />

            <SingleDatePickerModal
                isOpen={isFormDatePickerOpen}
                onClose={() => setIsFormDatePickerOpen(false)}
                onSelect={(date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    dispatch({ type: 'UPDATE_FIELD', field: 'date', value: dateStr });
                    setIsFormDatePickerOpen(false);
                }}
                date={formData.date ? parseDate(formData.date) : new Date()}
            />

            <CustomColorPicker isOpen={activeColorPicker !== null} onClose={() => setActiveColorPicker(null)} color={activeColorPicker?.type === 'icon' ? newCategoryColor : activeColorPicker?.type === 'bg' ? (newCategoryBgColor || '#000000') : activeColorPicker?.type === 'status' ? newStatusColor : '#000000'} onChange={(c) => { if (activeColorPicker?.type === 'icon') setNewCategoryColor(c); if (activeColorPicker?.type === 'bg') setNewCategoryBgColor(c); if (activeColorPicker?.type === 'status') setNewStatusColor(c); }} anchorEl={activeColorPicker?.anchor} />
            <ImageViewer isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} images={viewerImages} startIndex={viewerStartIndex} />

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20">
                        <Coins size={24} className="text-secondary" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Ganhos Extras</h2>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-textMuted font-bold uppercase tracking-wider">Ganhos {getPeriodLabel()}</span>
                        <Calendar size={16} className="text-gray-600" />
                    </div>
                    <div className="flex items-center gap-3">
                        <h3 className={`text-3xl font-bold tracking-tight ${stats.totalInPeriod < 0 ? 'text-red-500' : 'text-white'}`}>
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
                    <h3 className={`text-3xl font-bold tracking-tight mb-2 ${stats.totalYearly < 0 ? 'text-red-500' : 'text-white'}`}>
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

            <div className="space-y-3 relative min-h-[300px]">
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
                        <Card key={gain.id} className="group border-none bg-surface hover:bg-[#1a2133] transition-all relative p-0 overflow-hidden cursor-pointer" onClick={() => { if (!deleteId) toggleGainDetails(gain.id); }}>
                            <div className="p-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 hover:bg-white/5 transition-colors -mx-4 -mt-4 p-4 rounded-t-xl">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex flex-col items-center gap-1 shrink-0">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 shadow-inner overflow-hidden shrink-0" style={{ backgroundColor: originBg ? originBg : `${originColor}15`, color: originColor, borderColor: originBg ? 'transparent' : undefined }}>
                                                <RenderIcon iconSource={originItem?.icon} size={20} />
                                            </div>
                                            <span className="text-[8px] font-bold uppercase tracking-wide text-center max-w-[60px] truncate" style={{ color: originColor }}>{gain.origin}</span>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-white text-base flex items-center gap-2">
                                                {gain.game || gain.origin}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="flex items-center gap-1 text-xs text-textMuted">
                                                    <div className="w-3 h-3 rounded-sm flex items-center justify-center text-[6px] font-bold text-[#090c19] overflow-hidden" style={{ backgroundColor: bookie?.color || '#fff' }}>
                                                        {bookie?.logo ? (
                                                            <img src={bookie.logo} alt={bookie.name} className="w-full h-full object-contain p-[1px]" />
                                                        ) : (
                                                            bookie?.name?.substring(0, 1)
                                                        )}
                                                    </div>
                                                    <span>{bookie?.name}</span>
                                                </span>
                                                <span className="text-xs text-textMuted">•</span>
                                                <span className="text-xs text-textMuted">{new Date(gain.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0">
                                        <div className="text-left w-full">
                                            <p className="text-[10px] text-textMuted uppercase font-bold">Valor</p>
                                            <div className="flex items-center justify-between gap-3 w-full">
                                                <p className={`font-bold text-base ${isConfirmed ? 'text-[#6ee7b7]' : 'text-textMuted'}`}>
                                                    <MoneyDisplay value={gain.amount} />
                                                </p>
                                                <span style={{ backgroundColor: `${statusColor}1A`, color: statusColor, borderColor: `${statusColor}33` }} className="text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-full inline-block border">{gain.status}</span>
                                            </div>
                                        </div>
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
                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown size={20} className="text-textMuted" />
                                    </div>
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
                            <input type="text" inputMode="numeric" className="bg-transparent text-center text-4xl font-bold text-white w-48 focus:outline-none placeholder-gray-700" placeholder="0,00" value={formData.amount ? formData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''} onChange={e => { const value = e.target.value.replace(/[^0-9]/g, ''); dispatch({ type: 'UPDATE_FIELD', field: 'amount', value: value ? parseInt(value, 10) / 100 : 0 }); }} autoFocus />
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
                        <Dropdown label="Status" options={statusOptionsForForm} value={formData.status || 'Recebido'} onChange={async (v) => {
                            dispatch({ type: 'UPDATE_FIELD', field: 'status', value: v as any });

                            // Auto-save if editing existing gain
                            if (editingId && currentUser) {
                                try {
                                    const gainData: ExtraGain = {
                                        ...formData,
                                        id: editingId,
                                        status: v as any,
                                        notes: formData.notes,
                                        photos: tempPhotos.map(p => p.url),
                                        date: formData.date.includes('T') ? formData.date : `${formData.date}T12:00:00.000Z`,
                                    };
                                    await FirestoreService.saveGain(currentUser.uid, gainData);
                                    console.log('✅ Status auto-saved!');

                                    // Close modal to refresh data and update balance
                                    setIsModalOpen(false);
                                    setEditingId(null);
                                } catch (error) {
                                    console.error('Error auto-saving status:', error);
                                }
                            }
                        }} />
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
                            className="w-full bg-[#0d1121] border border-white/10 focus:border-primary text-white rounded-lg py-3 px-4 placeholder-gray-600 focus:outline-none transition-colors text-sm min-h-[100px] resize-none shadow-inner"
                            placeholder="Detalhes extras..."
                            value={formData.notes}
                            onChange={e => dispatch({ type: 'UPDATE_FIELD', field: 'notes', value: e.target.value })}
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

            {/* Floating Novo Ganho Button */}
            {showFloatingButton && (
                <button
                    onClick={handleOpenNew}
                    className="fixed bottom-24 right-6 z-30 p-4 bg-gradient-to-br from-[#17baa4] to-[#10b981] text-[#05070e] rounded-full hover:scale-110 hover:shadow-2xl hover:shadow-primary/40 transition-all active:scale-95 shadow-lg"
                    title="Novo Ganho"
                >
                    <Plus size={28} strokeWidth={3} />
                </button>
            )}
        </div>
    );
};

export default ExtraGains;
