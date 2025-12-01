import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Modal, ImageAdjuster, CustomColorPicker, RenderIcon, ICON_MAP } from './ui/UIComponents';
import {
    Trash2, RefreshCcw, Plus, Star, Palette, Edit2, Check, X, Upload, Image as ImageIcon, AlertCircle,
    Gamepad2, Trophy, Zap, Gift, Coins, Briefcase, Ghost, Box, Banknote, CreditCard, Smartphone, Target,
    Layout, User, ToggleLeft, ToggleRight, Monitor, LayoutTemplate, Camera, AlertTriangle, Ban, Lock, Mail, Save,
    Cloud, Crop, Maximize, Minimize, Wand2, Search, Link, Loader2
} from 'lucide-react';
import { Bookmaker, AppSettings, StatusItem, PromotionItem, OriginItem, SettingsTab, User as UserType } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { compressImage } from '../utils/imageCompression';
import { auth, storage } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';

interface SettingsProps {
    bookmakers: Bookmaker[];
    setBookmakers: React.Dispatch<React.SetStateAction<Bookmaker[]>>;
    statuses: StatusItem[];
    setStatuses: React.Dispatch<React.SetStateAction<StatusItem[]>>;
    promotions: PromotionItem[];
    setPromotions: React.Dispatch<React.SetStateAction<PromotionItem[]>>;
    origins: OriginItem[];
    setOrigins: React.Dispatch<React.SetStateAction<OriginItem[]>>;
    appSettings: AppSettings;
    setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    initialTab: SettingsTab;
    onFactoryReset: () => void;
    currentUser: UserType | null;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b', '#000000', '#FFFFFF'];

const PRESET_AVATARS = [
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Casper',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Mimi',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Leo',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Luna',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Cleo',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Ollie',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Zoe',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Rocky',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Pepper'
];

const Settings: React.FC<SettingsProps> = ({
    bookmakers,
    setBookmakers,
    statuses,
    setStatuses,
    promotions,
    setPromotions,
    origins,
    setOrigins,
    appSettings,
    setAppSettings,
    initialTab,
    onFactoryReset,
    currentUser
}) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error', text: string }>({ type: 'success', text: '' });

    // Image Adjuster State
    const [adjusterOpen, setAdjusterOpen] = useState(false);
    const [imageToAdjust, setImageToAdjust] = useState<string | null>(null);
    const [adjusterAspect, setAdjusterAspect] = useState(1);
    const [adjusterCallback, setAdjusterCallback] = useState<(croppedImage: string) => void>(() => { });

    // Item Management State
    const [newItemName, setNewItemName] = useState('');
    const [newItemUrl, setNewItemUrl] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [selectedLogo, setSelectedLogo] = useState<string | undefined>(undefined);
    const [selectedIcon, setSelectedIcon] = useState('Star');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const [bookmakerSearchTerm, setBookmakerSearchTerm] = useState('');
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);

    const topOfPageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (lastSavedId) {
            setTimeout(() => {
                const element = document.getElementById(`bookmaker-${lastSavedId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setLastSavedId(null);
                }
            }, 300); // Small delay to ensure DOM update
        }
    }, [lastSavedId]);

    const handleCroppedImage = async (base64: string) => {
        try {
            const res = await fetch(base64);
            const blob = await res.blob();
            handleProfileImageUpload(blob);
        } catch (e) {
            console.error("Error converting cropped image:", e);
        }
    };

    const handleOpenAdjuster = (imageSrc: string, aspect: number, callback: (cropped: string) => void) => {
        setImageToAdjust(imageSrc);
        setAdjusterAspect(aspect);
        setAdjusterCallback(() => callback);
        setAdjusterOpen(true);
    };

    const uploadFileToStorage = async (blob: Blob, folder: string): Promise<string> => {
        if (!currentUser) throw new Error("User not authenticated");
        const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
        const storageRef = ref(storage, `users/${currentUser.uid}/${folder}/${filename}`);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    };

    const uploadImage = (event: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleOpenAdjuster(reader.result as string, 1, callback);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAutoFillFromUrl = async () => {
        if (!newItemUrl) return;
        try {
            const url = newItemUrl.startsWith('http') ? newItemUrl : `https://${newItemUrl}`;
            const domain = new URL(url).hostname;

            // Extract name from domain (remove www. and .com, .br, etc)
            const name = domain.replace('www.', '').split('.')[0];
            const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

            if (!newItemName.trim()) {
                setNewItemName(capitalizedName);
            }

            const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            setSelectedLogo(logoUrl);
        } catch (e) {
            console.error("Invalid URL");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, folder?: string, setter?: (url: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            console.log('📷 Image selected:', file.name, file.size, 'bytes');
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                console.log('✅ Image converted to base64, length:', base64.length);
                if (setter) {
                    setter(base64);
                    console.log('📝 Image set via setter');
                } else {
                    setSelectedLogo(base64);
                    console.log('📝 Image set to selectedLogo');
                }
            };
            reader.readAsDataURL(file);
        } else {
            console.log('❌ No file selected');
        }
    };

    const handleFactoryReset = () => {
        onFactoryReset();
    };

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            setSecurityMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }
        if (newPassword.length < 6) {
            setSecurityMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
            return;
        }

        const user = auth.currentUser;
        if (user) {
            try {
                await updatePassword(user, newPassword);
                setSecurityMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setIsSecurityModalOpen(false), 2000);
            } catch (error) {
                console.error("Error updating password:", error);
                setSecurityMessage({ type: 'error', text: 'Erro ao atualizar senha. Faça login novamente.' });
            }
        } else {
            setSecurityMessage({ type: 'error', text: 'Usuário não autenticado.' });
        }
    };

    const handleProfileImageUpload = async (blob: Blob | null) => {
        if (blob && currentUser) {
            setIsUploading(true);
            try {
                // Convert blob to File
                const file = new File([blob], 'avatar.png', { type: 'image/png' });

                // Comprimir para base64
                const base64 = await compressImage(file, {
                    maxWidth: 400,
                    maxHeight: 400,
                    quality: 0.9,
                    maxSizeMB: 0.05 // 50KB para avatar
                });

                const newSettings = { ...appSettings, profileImage: base64 };
                await FirestoreService.saveSettings(currentUser.uid, newSettings);
            } catch (e) {
                setError("Falha ao salvar avatar.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSaveItem = async (type: 'status' | 'origin' | 'bookmaker') => {
        if (!currentUser) {
            console.log('❌ No current user');
            return;
        }
        setError(null);
        if (!newItemName.trim()) {
            setError('O nome é obrigatório.');
            return;
        }
        const trimmedName = newItemName.trim();
        let currentList: { id: string, name: string }[] = [];
        if (type === 'status') currentList = statuses;
        else if (type === 'origin') currentList = origins;
        else if (type === 'bookmaker') currentList = bookmakers;

        const exists = currentList.some(item =>
            item.name.toLowerCase() === trimmedName.toLowerCase() &&
            item.id !== editingId
        );
        if (exists) {
            setError(`${trimmedName} já cadastrado`);
            return;
        }

        try {
            const id = editingId || Date.now().toString();
            console.log(`💾 Salvando ${type}:`, trimmedName, 'ID:', id);

            if (type === 'status') {
                const item: StatusItem = { id, name: trimmedName, color: selectedColor };
                await FirestoreService.saveItem(currentUser.uid, 'statuses', item);
            } else if (type === 'origin') {
                const item: OriginItem = { id, name: trimmedName, color: selectedColor, icon: selectedIcon };
                await FirestoreService.saveItem(currentUser.uid, 'origins', item);
            } else if (type === 'bookmaker') {
                console.log('🔍 DEBUG: selectedLogo at save time:', selectedLogo);
                console.log('🔍 Type:', typeof selectedLogo);
                let logoUrl = selectedLogo;

                // Convert Blob to base64 if needed (from image adjuster)
                let fromAdjuster = false;
                if (selectedLogo && typeof selectedLogo !== 'string') {
                    console.log('🔄 Converting Blob to base64...');
                    fromAdjuster = true;
                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve) => {
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(selectedLogo as any);
                    });
                    logoUrl = await base64Promise;
                    console.log('✅ Blob converted to base64');
                }

                // If logo is base64, compress and save directly to Firestore
                // Skip compression if image came from adjuster (already cropped/processed)
                if (logoUrl && typeof logoUrl === 'string' && logoUrl.startsWith('data:') && !fromAdjuster) {
                    try {
                        setIsUploading(true);
                        console.log('🗜️ Compressing logo for Firestore storage...');

                        // Convert base64 to blob
                        const res = await fetch(logoUrl);
                        const blob = await res.blob();
                        const file = new File([blob], 'logo.png', { type: 'image/png' });

                        // Compress to max 100KB for faster loading
                        const compressedBase64 = await compressImage(file, {
                            maxWidth: 200,
                            maxHeight: 200,
                            quality: 0.8,
                            maxSizeMB: 0.1 // 100KB
                        });

                        logoUrl = compressedBase64;
                        console.log('✅ Logo compressed, new size:', compressedBase64.length, 'bytes');
                    } catch (uploadErr) {
                        console.error('❌ Error compressing logo:', uploadErr);
                        setError('Erro ao processar logo.');
                        setIsUploading(false);
                        return;
                    } finally {
                        setIsUploading(false);
                    }
                } else if (fromAdjuster) {
                    console.log('⏭️ Skipping compression - image already processed by adjuster');
                }

                const item: Bookmaker = { id, name: trimmedName, color: selectedColor, logo: logoUrl, siteUrl: newItemUrl };
                console.log(editingId ? '✏️ EDITANDO bookmaker:' : '➕ CRIANDO novo bookmaker:', item);
                console.log('📷 Logo final sendo salvo:', logoUrl ? (logoUrl.startsWith('data:') ? 'Base64 (' + logoUrl.length + ' bytes)' : logoUrl) : 'Sem logo');
                await FirestoreService.saveItem(currentUser.uid, 'bookmakers', item);
                console.log('✅ Bookmaker saved successfully');
            }

            setNewItemName('');
            setNewItemUrl('');
            setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
            setSelectedLogo(undefined);
            setSelectedIcon('Star');
            setEditingId(null);
            setError(null);

            // Scroll to newly created item if it's a bookmaker and not editing
            if (type === 'bookmaker' && !editingId) {
                setLastSavedId(id);
            }
        } catch (err) {
            console.error(`❌ Error saving ${type}:`, err);
            setError(`Erro ao salvar ${type}.`);
        }
    };

    const handleEditItem = (item: { id: string, name: string, color?: string, logo?: string, icon?: string, siteUrl?: string }) => {
        setItemToDeleteId(null);
        setEditingId(item.id);
        setNewItemName(item.name);
        setNewItemUrl(item.siteUrl || '');
        setSelectedColor(item.color || '#000000');
        setSelectedLogo(item.logo);
        if (item.icon) setSelectedIcon(item.icon);
        setError(null);
        topOfPageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewItemName('');
        setNewItemUrl('');
        setSelectedColor(COLORS[6]);
        setSelectedLogo(undefined);
        setSelectedIcon('Star');
        setError(null);
    };

    const requestDelete = (id: string) => {
        setItemToDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!itemToDeleteId || !currentUser) return;

        // Logic to delete images from storage before removing item
        let itemToDelete;
        if (activeTab === 'bookmakers') itemToDelete = bookmakers.find(i => i.id === itemToDeleteId);
        if (activeTab === 'origins') itemToDelete = origins.find(i => i.id === itemToDeleteId);

        const imageUrl = (itemToDelete as any)?.logo || (itemToDelete as any)?.icon;
        if (imageUrl && imageUrl.startsWith('https')) {
            try {
                const imageRef = ref(storage, imageUrl);
                await deleteObject(imageRef);
            } catch (error: any) {
                if (error.code !== 'storage/object-not-found') {
                    console.error("Failed to delete image from storage:", error);
                }
            }
        }

        try {
            if (activeTab === 'status') await FirestoreService.deleteItem(currentUser.uid, 'statuses', itemToDeleteId);
            if (activeTab === 'origins') await FirestoreService.deleteItem(currentUser.uid, 'origins', itemToDeleteId);
            if (activeTab === 'bookmakers') await FirestoreService.deleteItem(currentUser.uid, 'bookmakers', itemToDeleteId);
        } catch (err) {
            console.error("Error deleting item:", err);
            // Optionally show error to user
        }

        if (editingId === itemToDeleteId) handleCancelEdit();
        setItemToDeleteId(null);
    };

    const cancelDelete = () => {
        setItemToDeleteId(null);
    };



    const handleUpdateEmail = async () => {
        if (!emailInput || !emailInput.includes('@')) {
            alert("Por favor, insira um email válido.");
            return;
        }
        if (currentUser) {
            const newSettings = { ...appSettings, email: emailInput };
            try {
                await FirestoreService.saveSettings(currentUser.uid, newSettings);
                alert("Email atualizado!");
            } catch (err) {
                console.error("Error updating email:", err);
                alert("Erro ao atualizar email.");
            }
        }
    };



    const renderGeneralSettings = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="bg-[#0d1121] rounded-xl border border-primary/20 p-6 flex flex-col md:flex-row items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary/20" />
                <div className="p-3 bg-primary/10 rounded-xl">
                    <LayoutTemplate size={28} className="text-primary" />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-white">Personalização da Interface</h4>
                    <p className="text-sm text-textMuted">Ajuste elementos visuais e comportamentais.</p>
                </div>
            </div>

            <Card className="p-6 bg-[#0d1121] border-white/5">
                <h5 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-6">PERFIL DO USUÁRIO</h5>
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="relative group shrink-0">
                        <div className="w-24 h-24 rounded-full border-2 border-white/10 overflow-hidden bg-[#151b2e] flex items-center justify-center shadow-lg">
                            {appSettings.profileImage ? (
                                <img src={appSettings.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-gray-500" />
                            )}
                            {appSettings.profileImage && (
                                <button
                                    onClick={() => handleOpenAdjuster(appSettings.profileImage!, 1, handleCroppedImage)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Crop size={20} className="text-white drop-shadow-md" />
                                </button>
                            )}
                        </div>

                        <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-[#090c19] p-2 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg border-2 border-[#0d1121] z-10">
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        </label>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    handleOpenAdjuster(URL.createObjectURL(file), 1, handleCroppedImage);
                                }
                            }}
                        />
                    </div>
                    <div className="flex-1 w-full space-y-5">
                        <div>
                            <Input
                                label="Nome de Exibição"
                                value={appSettings.username || ''}
                                onChange={(e) => setAppSettings({ ...appSettings, username: e.target.value })}
                                onBlur={() => {
                                    if (currentUser) {
                                        FirestoreService.saveSettings(currentUser.uid, appSettings);
                                    }
                                }}
                                placeholder="Seu nome"
                            />
                        </div>
                        <div className="pt-4 mt-4 border-t border-white/5">
                            <label className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3 block">Sugestões de Avatar</label>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                {PRESET_AVATARS.map((avatar, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setAppSettings({ ...appSettings, profileImage: avatar })}
                                        className={`w-12 h-12 rounded-full border-2 overflow-hidden shrink-0 transition-all ${appSettings.profileImage === avatar ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-white/10 hover:border-white/30 hover:scale-105'}`}
                                    >
                                        <img src={avatar} alt={`Avatar ${index}`} className="w-full h-full object-cover bg-[#151b2e]" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

        </Card>

            {/* --- SYNC SECTION (SIMPLIFIED) --- */ }
    <Card className="p-6 bg-[#0d1121] border-white/5">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Cloud size={20} />
            </div>
            <h5 className="text-xs font-bold text-textMuted uppercase tracking-wider">Sincronização de Dados</h5>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex gap-3 items-start">
            <Check className="text-green-500 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-green-200/80 leading-relaxed">
                <strong className="text-green-500 block mb-1">Sincronização em Tempo Real Ativa.</strong>
                Seus dados estão seguros na nuvem e são atualizados instantaneamente em todos os seus dispositivos.
            </div>
        </div>

        {/* Debug Info for User Verification */}
        <div className="mt-4 p-3 bg-black/20 rounded border border-white/5 text-[10px] font-mono text-gray-500 select-all">
            <div className="flex justify-between mb-1">
                <span className="font-bold text-gray-400">ID DA CONTA:</span>
                <span className="opacity-50">v2.1</span>
            </div>
            <div className="break-all mb-1">{currentUser?.uid}</div>
            <div className="truncate text-gray-600">{currentUser?.email}</div>
            <div className="mt-2 text-[9px] text-gray-700 italic">
                * Verifique se este ID é igual em todos os seus dispositivos.
            </div>
        </div>
    </Card>

    {/* --- SECURITY SECTION --- */ }
    <Card className="p-6 bg-[#0d1121] border-white/5">
        <h5 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-6">SEGURANÇA</h5>
        <div className="flex items-center justify-between">
            <div>
                <span className="text-sm font-bold text-white block">Senha de Acesso</span>
                <span className="text-xs text-gray-500 block mt-1">Protege sua conta.</span>
            </div>
            <Button variant="neutral" onClick={() => setIsSecurityModalOpen(true)}>
                <Lock size={16} /> Alterar Senha
            </Button>
        </div>
    </Card>
        </div >
    );

const renderColorSelection = () => (
    <div className="mt-4 p-4 bg-[#151b2e] rounded-xl border border-white/5">
        <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">Cor Identificadora</span>
            <span className="text-[10px] text-gray-500">{selectedColor}</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
            {COLORS.map(c => (
                <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform ${selectedColor === c ? 'scale-110 ring-2 ring-white z-10' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                />
            ))}
            <div
                className={`relative group w-8 h-8 rounded-full overflow-hidden cursor-pointer border border-white/10 ${!COLORS.includes(selectedColor) ? 'ring-2 ring-white z-10' : ''}`}
                onClick={(e) => setColorPickerAnchor(e.currentTarget)}
            >
                <div className="w-full h-full flex items-center justify-center bg-[#151b2e]"
                    style={{ background: 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #00FF00 120deg, #0000FF 240deg, #FF0000 360deg)' }}
                >
                    <Plus size={10} className="text-white drop-shadow-md" strokeWidth={3} />
                </div>
            </div>
        </div>
        <CustomColorPicker
            isOpen={Boolean(colorPickerAnchor)}
            onClose={() => setColorPickerAnchor(null)}
            color={selectedColor}
            onChange={(c) => setSelectedColor(c)}
            anchorEl={colorPickerAnchor}
        />
    </div>
);

const renderBookmakersSettings = () => {
    const filteredBookmakers = bookmakers.filter(b => b.name.toLowerCase().includes(bookmakerSearchTerm.toLowerCase()));
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Form */}
            <div className="bg-[#0d1121] rounded-xl border border-primary/20 p-6 shadow-lg relative overflow-hidden">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    {editingId ? <Edit2 size={18} className="text-primary" /> : <Plus size={18} className="text-primary" />}
                    {editingId ? 'Editar Casa' : 'Criar Nova Casa'}
                </h3>
                <div className="space-y-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Input label="Site (Opcional)" placeholder="ex: bet365.com" value={newItemUrl} onChange={(e) => setNewItemUrl(e.target.value)} icon={<Link size={16} />} />
                        </div>
                        <button onClick={handleAutoFillFromUrl} disabled={isUploading} className="h-[42px] px-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg text-white hover:opacity-90 transition-all flex items-center justify-center shadow-lg disabled:opacity-50">
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                        </button>
                    </div>
                    <Input placeholder="Nome" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className={error ? 'border-danger' : ''} />
                    <div className="p-4 border border-dashed border-white/10 rounded-xl bg-white/[0.02] space-y-3">
                        <label className="text-xs font-bold text-textMuted uppercase tracking-wider block">Logo</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-[#151b2e] flex items-center justify-center border border-white/10 overflow-hidden shadow-inner">
                                {selectedLogo ? <img src={selectedLogo} alt="Logo" className="w-full h-full object-cover" /> : <div className="text-xs text-gray-600 font-bold">{newItemName.substring(0, 2).toUpperCase() || 'LOGO'}</div>}
                            </div>
                            <div className="flex-1 space-y-2">
                                <input type="file" className="hidden" id="logo-upload" accept="image/*" onChange={(e) => handleImageUpload(e, 'logos', setSelectedLogo)} />
                                <label
                                    htmlFor="logo-upload"
                                    className={`relative overflow-hidden font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} active:scale-95 tracking-wide group w-full text-xs px-5 py-2.5 text-sm bg-[#151b2e] text-white border border-white/10 hover:bg-white/5 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5`}
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        {selectedLogo ? 'Alterar Imagem' : 'Carregar Imagem'}
                                    </span>
                                    <div className="absolute inset-0 h-full w-full scale-0 rounded-lg transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10" />
                                </label>
                                {selectedLogo && <Button variant="neutral" className="w-full text-xs" onClick={() => handleOpenAdjuster(selectedLogo, 1, (croppedBase64) => {
                                    console.log('✂️ Image cropped, setting to state...');
                                    setSelectedLogo(croppedBase64);
                                    console.log('✅ Cropped image set, will be compressed on save');
                                })} disabled={isUploading}><Crop size={14} /> Ajustar</Button>}
                            </div>
                        </div>
                    </div>
                    {renderColorSelection()}
                    {error && <div className="text-danger text-xs font-bold">{error}</div>}
                    <div className="flex gap-2 pt-2">
                        {editingId && <Button variant="neutral" onClick={handleCancelEdit} className="flex-1">Cancelar</Button>}
                        <Button onClick={() => handleSaveItem('bookmaker')} className="flex-1">{editingId ? 'Salvar' : 'Adicionar'}</Button>
                    </div>
                </div>
            </div>
            {/* List */}
            <div className="space-y-4">
                {/* Counter */}
                <div className="flex items-center justify-between bg-[#0d1121] border border-white/5 rounded-xl px-4 py-3">
                    <span className="text-sm text-gray-400">Total de Casas</span>
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold text-lg">
                            {bookmakers.length}
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <input type="text" placeholder="Pesquisar..." value={bookmakerSearchTerm} onChange={(e) => setBookmakerSearchTerm(e.target.value)} className="w-full bg-[#0d1121] border border-white/10 rounded-xl py-3 pl-10 text-sm text-white" />
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
                {filteredBookmakers.map(bookie => (
                    <div key={bookie.id} id={`bookmaker-${bookie.id}`} className="group bg-[#0d1121] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-white/10 transition-all gap-3">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[#090c19] text-xs shadow-sm overflow-hidden border border-white/5 shrink-0" style={{ backgroundColor: bookie.color || '#fff' }}>
                                {bookie.logo ? <img src={bookie.logo} alt={bookie.name} className="w-full h-full object-cover" /> : bookie.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="font-bold text-white block truncate">{bookie.name}</span>
                                {bookie.siteUrl && <span className="text-[10px] text-gray-500 block truncate">{bookie.siteUrl}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {itemToDeleteId === bookie.id ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                                    <span className="text-[10px] text-danger font-bold uppercase">Excluir?</span>
                                    <button onClick={confirmDelete} className="p-1 text-primary"><Check size={16} /></button>
                                    <button onClick={cancelDelete} className="p-1 text-gray-500"><X size={16} /></button>
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => handleEditItem(bookie)} className="p-2 text-gray-500 hover:text-primary hover:bg-white/5 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={() => requestDelete(bookie.id)} className="p-2 text-gray-500 hover:text-danger hover:bg-white/5 rounded-lg"><Trash2 size={16} /></button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const renderStatusSettings = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-[#0d1121] rounded-xl border border-primary/20 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4">{editingId ? 'Editar Status' : 'Criar Novo Status'}</h3>
            <div className="space-y-4">
                <Input placeholder="Nome" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                {renderColorSelection()}
                <div className="flex gap-2 pt-2">
                    {editingId && <Button variant="neutral" onClick={handleCancelEdit} className="flex-1">Cancelar</Button>}
                    <Button onClick={() => handleSaveItem('status')} className="flex-1">{editingId ? 'Salvar' : 'Adicionar'}</Button>
                </div>
            </div>
        </div>
        <div className="space-y-3">
            {statuses.map(status => (
                <div key={status.id} className="group bg-[#0d1121] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: status.color, color: status.color }} />
                        <span className="font-bold text-white">{status.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {itemToDeleteId === status.id ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                                <span className="text-[10px] text-danger font-bold uppercase">Excluir?</span>
                                <button onClick={confirmDelete} className="p-1 text-primary"><Check size={16} /></button>
                                <button onClick={cancelDelete} className="p-1 text-gray-500"><X size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => handleEditItem(status)} className="p-2 text-gray-500 hover:text-primary"><Edit2 size={16} /></button>
                                <button onClick={() => requestDelete(status.id)} className="p-2 text-gray-500 hover:text-danger"><Trash2 size={16} /></button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const renderOriginsSettings = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-[#0d1121] rounded-xl border border-primary/20 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4">{editingId ? 'Editar Origem' : 'Criar Nova Origem'}</h3>
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden" style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}>
                        <RenderIcon iconSource={selectedIcon} size={24} />
                    </div>
                    <div className="flex-1">
                        <Input placeholder="Nome da Origem" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                    </div>
                </div>

                <div className="p-4 bg-[#151b2e] rounded-xl border border-white/5">
                    <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-3 block">Ícone</label>
                    <div className="grid grid-cols-7 gap-2">
                        {/* FIX: Assign dynamic component to a capitalized variable before rendering. */}
                        {Object.keys(ICON_MAP).map((iconKey) => {
                            const IconComponent = ICON_MAP[iconKey as keyof typeof ICON_MAP];
                            return (
                                <button type="button" key={iconKey} onClick={() => setSelectedIcon(iconKey)} className={`aspect-square rounded-lg flex items-center justify-center transition-all ${selectedIcon === iconKey ? 'bg-primary text-[#090c19]' : 'bg-[#0d1121] text-gray-500 hover:bg-white/5'}`}>
                                    <IconComponent size={18} />
                                </button>
                            );
                        })}
                        <input type="file" className="hidden" id="origin-icon-upload" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleOpenAdjuster(URL.createObjectURL(file), async (blob) => { if (blob) { setIsUploading(true); try { const url = await uploadImage(blob, 'origins'); setSelectedIcon(url); } finally { setIsUploading(false); } } }, 1);
                        }} />
                        <label htmlFor="origin-icon-upload" title="Carregar Ícone" className="aspect-square rounded-lg flex items-center justify-center transition-all bg-[#0d1121] text-gray-500 hover:bg-white/5 cursor-pointer border-2 border-dashed border-white/10 hover:border-primary">
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        </label>
                    </div>
                </div>

                {renderColorSelection()}
                <div className="flex gap-2 pt-2">
                    {editingId && <Button variant="neutral" onClick={handleCancelEdit} className="flex-1">Cancelar</Button>}
                    <Button onClick={() => handleSaveItem('origin')} className="flex-1">{editingId ? 'Salvar' : 'Adicionar'}</Button>
                </div>
            </div>
        </div>
        <div className="space-y-3">
            {origins.map(origin => {
                return (
                    <div key={origin.id} className="group bg-[#0d1121] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm border border-white/5" style={{ backgroundColor: `${origin.color}20`, color: origin.color }}>
                                <RenderIcon iconSource={origin.icon} size={20} />
                            </div>
                            <span className="font-bold text-white">{origin.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {itemToDeleteId === origin.id ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                                    <span className="text-[10px] text-danger font-bold uppercase">Excluir?</span>
                                    <button onClick={confirmDelete} className="p-1 text-primary"><Check size={16} /></button>
                                    <button onClick={cancelDelete} className="p-1 text-gray-500"><X size={16} /></button>
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => handleEditItem({ ...origin, logo: undefined })} className="p-2 text-gray-500 hover:text-primary"><Edit2 size={16} /></button>
                                    <button onClick={() => requestDelete(origin.id)} className="p-2 text-gray-500 hover:text-danger"><Trash2 size={16} /></button>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

return (
    <div className="space-y-6 pb-20" ref={topOfPageRef}>
        <ImageAdjuster
            isOpen={adjusterOpen}
            onClose={() => setAdjusterOpen(false)}
            imageSrc={imageToAdjust}
            onSave={adjusterCallback}
            aspect={adjusterAspect}
        />
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Ajustes</h2>
                <p className="text-textMuted text-sm">Configurações gerais e gerenciamento de dados.</p>
            </div>
            <button onClick={() => setIsResetModalOpen(true)} className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all text-xs font-bold uppercase flex items-center gap-2 border border-danger/20">
                <AlertTriangle size={16} /> Resetar Fábrica
            </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-[#0d1121] p-1 rounded-xl overflow-x-auto custom-scrollbar border border-white/5">
            {[
                { id: 'general', label: 'Geral', icon: <Layout size={16} /> },
                { id: 'bookmakers', label: 'Casas', icon: <Smartphone size={16} /> },
                { id: 'status', label: 'Status', icon: <Target size={16} /> },
                { id: 'origins', label: 'Origens', icon: <Coins size={16} /> },
            ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as SettingsTab)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center ${isActive ? 'bg-primary text-[#090c19] shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        {tab.icon} {tab.label}
                    </button>
                );
            })}
        </div>
        <div className="min-h-[400px]">
            {activeTab === 'general' && renderGeneralSettings()}
            {activeTab === 'bookmakers' && renderBookmakersSettings()}
            {activeTab === 'origins' && renderOriginsSettings()}
            {activeTab === 'status' && renderStatusSettings()}
        </div>

        {/* Factory Reset Modal */}
        <Modal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
            title="Resetar para Configurações de Fábrica"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <Button variant="neutral" onClick={() => setIsResetModalOpen(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={() => { handleFactoryReset(); setIsResetModalOpen(false); }}>Confirmar Reset</Button>
                </div>
            }
        >
            <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center text-danger mb-4 animate-pulse"><AlertTriangle size={32} /></div>
                <h3 className="text-lg font-bold text-white mb-2">Tem certeza absoluta?</h3>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">Esta ação apagará <strong>TODAS</strong> as suas apostas, ganhos, configurações e casas personalizadas deste dispositivo.<br /><br /><span className="text-danger font-bold">Esta ação não pode ser desfeita.</span></p>
            </div>
        </Modal>

        {/* Security / Password Modal */}
        <Modal
            isOpen={isSecurityModalOpen}
            onClose={() => setIsSecurityModalOpen(false)}
            title="Alterar Senha de Acesso"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <Button variant="neutral" onClick={() => setIsSecurityModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleUpdatePassword}>Atualizar Senha</Button>
                </div>
            }
        >
            <div className="space-y-4 p-2">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 flex items-start gap-2">
                    <Lock size={14} className="shrink-0 mt-0.5" />
                    <p>Esta senha é usada para proteger sua conta.</p>
                </div>
                <div className="space-y-3">
                    <Input type="password" label="Nova Senha" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={<Lock size={16} />} />
                    <Input type="password" label="Confirmar Senha" placeholder="Repita a nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={<Check size={16} />} />
                </div>
                {securityMessage.text && (
                    <div className={`text-xs font-bold p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 ${securityMessage.type === 'error' ? 'bg-danger/10 text-danger' : 'bg-green-500/10 text-green-500'}`}>
                        {securityMessage.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />} {securityMessage.text}
                    </div>
                )}
            </div>
        </Modal>
    </div>
);
};

export default Settings;