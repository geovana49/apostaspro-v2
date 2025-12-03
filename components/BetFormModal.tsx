import React, { useState, useReducer, useEffect } from 'react';
import { Button, Input, Dropdown, Modal, SingleDatePickerModal, ImageViewer } from './ui/UIComponents';
import {
    Plus, Trash2, X, Calendar, Paperclip, Minus, Loader2
} from 'lucide-react';
import { Bet, Bookmaker, StatusItem, PromotionItem, Coverage, User } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { compressImages, validateFirestoreSize } from '../utils/imageCompression';

interface BetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Bet | null;
    currentUser: User | null;
    bookmakers: Bookmaker[];
    statuses: StatusItem[];
    promotions: PromotionItem[];
    onSaveSuccess: (date: Date) => void;
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
    onSaveSuccess
}) => {
    const [formData, dispatch] = useReducer(formReducer, initialFormState);
    const [isUploading, setIsUploading] = useState(false);
    const [tempPhotos, setTempPhotos] = useState<{ url: string, file?: File }[]>([]);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerStartIndex, setViewerStartIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                dispatch({
                    type: 'SET_FORM',
                    payload: {
                        id: initialData.id,
                        date: initialData.date.split('T')[0],
                        mainBookmakerId: initialData.mainBookmakerId,
                        event: initialData.event,
                        promotionType: initialData.promotionType || 'Nenhuma',
                        status: initialData.status as any,
                        coverages: initialData.coverages,
                        notes: initialData.notes || ''
                    }
                });
                setTempPhotos(initialData.photos ? initialData.photos.map(url => ({ url })) : []);
            } else {
                dispatch({ type: 'RESET_FORM' });
                setTempPhotos([]);
            }
        }
    }, [isOpen, initialData]);

    const parseDate = (dateStr: string) => {
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const MAX_PHOTOS = 8;
            const files = Array.from(e.target.files) as File[];

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
        }
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

    const handleSave = async () => {
        if (!formData.event) return alert('Informe o evento');
        if (!currentUser) return alert('Você precisa estar logado para salvar.');

        setIsUploading(true);

        try {
            const photoBase64 = tempPhotos.map(photo => photo.url);
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

            const betToSave = JSON.parse(JSON.stringify(rawBet));
            await FirestoreService.saveBet(currentUser.uid, betToSave);

            const betDate = parseDate(formData.date);
            onSaveSuccess(betDate);
            onClose();
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
        const hasContent = formData.event || formData.notes || formData.coverages.length > 0 || tempPhotos.length > 0;
        if (hasContent && !isUploading && !initialData) {
            if (window.confirm('Você tem alterações não salvas. Deseja salvar como rascunho para terminar depois?')) {
                saveAsDraft();
            } else {
                onClose();
            }
        } else {
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
