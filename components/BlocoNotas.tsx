import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    StickyNote, Trash2, Plus, Bell, BellOff, ChevronUp, ChevronDown,
    TriangleAlert, Star, Check, Calendar, Clock, X, Search, PenLine,
    Folder, Flame, Zap, FileText, LayoutGrid, List as ListIcon, Trash, ArrowDownUp, Pencil, CheckCircle2
} from 'lucide-react';
import { User, NotepadNote } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { Card, Button } from './ui/UIComponents';

interface BlocoNotasProps {
    currentUser: User | null;
    notes: NotepadNote[];
}

const BlocoNotas: React.FC<BlocoNotasProps> = ({ currentUser, notes }) => {
    const [content, setContent] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('📌');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [tempDate, setTempDate] = useState(new Date().toISOString().split('T')[0]);
    const [tempTime, setTempTime] = useState(new Date().toTimeString().slice(0, 5));
    const [showBlockedGuide, setShowBlockedGuide] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [customEmoji, setCustomEmoji] = useState('');
    const [isCustomEmojiActive, setIsCustomEmojiActive] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('Não Feito');
    const [statusEmoji, setStatusEmoji] = useState('⌛');
    const [isCustomStatusActive, setIsCustomStatusActive] = useState(false);
    const [customStatus, setCustomStatus] = useState('');
    const [showScheduler, setShowScheduler] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'newest' | 'oldest' | 'alpha'>('date');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const schedulerRef = useRef<HTMLButtonElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);
    const [savedCustomStatuses, setSavedCustomStatuses] = useState<{ id: string, name: string, emoji: string }[]>([]);
    const [savedCustomEmojis, setSavedCustomEmojis] = useState<{ id: string, emoji: string }[]>([]);

    const defaultStatuses = [
        { name: 'Não Feito', emoji: '⌛', color: 'text-white', dot: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]', active: 'bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' },
        { name: 'Fazendo', emoji: '▶️', color: 'text-[#FFE600]', dot: 'bg-[#FFE600] shadow-[0_0_8px_rgba(255,230,0,0.5)]', active: 'bg-[#FFE600]/20 border-[#FFE600]/50 text-[#FFE600] shadow-[0_0_15px_rgba(255,230,0,0.2)]' },
        { name: 'Feito', emoji: '✅', color: 'text-[#00FFD1]', dot: 'bg-[#00FFD1] shadow-[0_0_8px_rgba(0,255,209,0.5)]', active: 'bg-[#00FFD1]/20 border-[#00FFD1]/50 text-[#00FFD1] shadow-[0_0_15px_rgba(0,255,209,0.2)]' },
        { name: 'Perdido', emoji: '❌', color: 'text-[#FF3D3D]', dot: 'bg-[#FF3D3D] shadow-[0_0_8px_rgba(255,61,61,0.5)]', active: 'bg-[#FF3D3D]/20 border-[#FF3D3D]/50 text-[#FF3D3D] shadow-[0_0_15px_rgba(255,61,61,0.2)]' }
    ];

    const emojis = [
        '🎰', '💰', '🔥', '⚠️', '✅', '❌', '⭐', '🎯', '💎', '🚀', '📌', '💡',
        '🏆', '⚽', '🏀', '🎲', '🃏', '💸', '📊', '📈', '🔔', '🔒', '🎁', '🏅',
        '💳', '🏦', '📝', '⏰', '🧮', '💪', '👑', '🎉', '📱', '🔑', '🛡️', '⚡'
    ];

    const handleRequestPermission = async () => {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                setPermissionStatus(permission);
                if (permission === 'denied') setShowBlockedGuide(true);
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        }
    };

    useEffect(() => {
        const checkNotifications = async () => {
            if (permissionStatus !== 'granted') return;

            const now = new Date();
            const dueNotes = notes.filter(n =>
                n.reminderEnabled &&
                !n.notified &&
                n.reminderDate &&
                new Date(n.reminderDate) <= now
            );

            for (const note of dueNotes) {
                try {
                    new Notification(`Lembrete: Bloco de Notas`, {
                        body: note.content,
                        icon: '/favicon.ico'
                    });

                    if (currentUser) {
                        await FirestoreService.saveNote(currentUser.uid, { ...note, notified: true });
                    }
                } catch (error) {
                    console.error("Erro ao disparar notificação:", error);
                }
            }
        };

        const interval = setInterval(checkNotifications, 30000);
        return () => clearInterval(interval);
    }, [notes, permissionStatus, currentUser]);

    // Close sort dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setShowSortDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Subscribe to saved custom statuses and emojis
    useEffect(() => {
        if (!currentUser?.uid) return;
        const unsubStatuses = FirestoreService.subscribeToCollection<{ id: string, name: string, emoji: string }>(
            currentUser.uid, 'notepad_statuses', (items) => setSavedCustomStatuses(items)
        );
        const unsubEmojis = FirestoreService.subscribeToCollection<{ id: string, emoji: string }>(
            currentUser.uid, 'notepad_emojis', (items) => setSavedCustomEmojis(items)
        );
        return () => { unsubStatuses(); unsubEmojis(); };
    }, [currentUser?.uid]);

    const handleSaveCustomStatus = async () => {
        if (!currentUser?.uid || !customStatus.trim()) return;
        const item = { id: `cs_${Date.now()}`, name: customStatus.trim(), emoji: '📌' };
        await FirestoreService.saveItem(currentUser.uid, 'notepad_statuses', item);
        setCustomStatus('');
        setIsCustomStatusActive(false);
    };

    const handleDeleteCustomStatus = async (id: string) => {
        if (!currentUser?.uid) return;
        await FirestoreService.deleteItem(currentUser.uid, 'notepad_statuses', id);
    };

    const handleSaveCustomEmoji = async () => {
        if (!currentUser?.uid || !customEmoji.trim()) return;
        const item = { id: `ce_${Date.now()}`, emoji: customEmoji.trim() };
        await FirestoreService.saveItem(currentUser.uid, 'notepad_emojis', item);
        setSelectedEmoji(customEmoji.trim());
        setCustomEmoji('');
        setIsCustomEmojiActive(false);
    };

    const handleDeleteCustomEmoji = async (id: string) => {
        if (!currentUser?.uid) return;
        await FirestoreService.deleteItem(currentUser.uid, 'notepad_emojis', id);
    };

    const handleAddNote = async () => {
        if (!currentUser) return;
        if (!content.trim()) return;
        try {
            const newNote: NotepadNote = {
                id: `note_${Date.now()}`,
                content: content.trim(),
                emoji: isCustomEmojiActive && customEmoji ? customEmoji : selectedEmoji,
                priority,
                status: isCustomStatusActive && customStatus ? customStatus : selectedStatus,
                statusEmoji: isCustomStatusActive ? '📌' : statusEmoji,
                reminderDate: (tempDate && tempTime) ? `${tempDate}T${tempTime}` : null,
                reminderEnabled: !!(tempDate && tempTime),
                createdAt: new Date().toISOString(),
                completed: selectedStatus === 'Feito'
            };
            await FirestoreService.saveNote(currentUser.uid, newNote);
            setContent('');
            setCustomEmoji('');
            setIsCustomEmojiActive(false);
            setCustomStatus('');
            setIsCustomStatusActive(false);
            setStatusEmoji('⌛');
            setShowScheduler(false);
            setTempDate(new Date().toISOString().split('T')[0]);
            setTempTime(new Date().toTimeString().slice(0, 5));
        } catch (error) {
            console.error("[Notepad] Erro ao salvar nota:", error);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!currentUser) return;
        if (confirm('Deseja excluir esta anotação?')) {
            await FirestoreService.deleteNote(currentUser.uid, noteId);
        }
    };

    const handleToggleComplete = async (note: NotepadNote) => {
        if (!currentUser) return;
        const updatedNote = { ...note, completed: !note.completed };
        await FirestoreService.saveNote(currentUser.uid, updatedNote);
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'bg-[#ff4444]/10 border-[#ff4444]/20 text-[#ff4444]';
            case 'medium': return 'bg-[#ffbb33]/10 border-[#ffbb33]/20 text-[#ffbb33]';
            default: return 'bg-[#33b5e5]/10 border-[#33b5e5]/20 text-[#33b5e5]';
        }
    };

    const filteredNotes = useMemo(() => {
        let result = notes.filter(note => {
            const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
            const matchesStatus = filterStatus === 'all' || note.status === filterStatus;
            return matchesSearch && matchesPriority && matchesStatus;
        });

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'alpha') {
                return a.content.localeCompare(b.content, 'pt-BR');
            }
            if (sortBy === 'date') {
                const dateA = a.reminderDate ? new Date(a.reminderDate).getTime() : Infinity;
                const dateB = b.reminderDate ? new Date(b.reminderDate).getTime() : Infinity;
                return dateA - dateB;
            }
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [notes, searchTerm, filterPriority, filterStatus, sortBy]);

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header - Exact Screenshot Match */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2.5 bg-[#17baa4]/10 rounded-2xl shrink-0 border border-[#17baa4]/10">
                        <Folder size={28} className="text-[#17baa4]" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Bloco de Notas</h1>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium">Anote procedimentos e tarefas rápidas</p>
                    </div>
                </div>

                {permissionStatus !== 'granted' ? (
                    <button
                        onClick={handleRequestPermission}
                        title="Clique para ativar notificações de lembrete"
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all bg-[#FFCC00]/10 border border-[#FFCC00]/30 text-[#FFCC00] hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(255,204,0,0.2)] h-11 ${permissionStatus === 'default' ? 'animate-pulse' : ''}`}
                    >
                        <Bell size={16} />
                        <span>Ativar Notificações</span>
                    </button>
                ) : (
                    <div className="opacity-0 pointer-events-none">
                        <Bell size={16} />
                    </div>
                )}
            </div>

            {/* Nova Anotação Card */}
            <Card className="bg-[#121625]/80 backdrop-blur-xl border-white/5 relative overflow-hidden rounded-[32px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Pencil size={16} className="text-[#17baa4]" />
                        <span className="text-[14px] font-semibold text-white tracking-wide">Criar Nova Anotação</span>
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? 'Expandir formulário de criação' : 'Recolher formulário de criação'} className="p-2 text-gray-500 hover:text-white transition-all">
                        {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                </div>

                {!isCollapsed && (
                    <div className="p-8 space-y-6">
                        <textarea
                            className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-5 text-white text-sm focus:ring-1 focus:ring-[#17baa4]/50 outline-none transition-all min-h-[120px] resize-none placeholder:text-gray-600"
                            placeholder="Anotar procedimento... (ex: 🎰 Bet365 - Missão 50 giros)"
                            title="Escreva o conteúdo da sua anotação aqui"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        {/* Emoji Picker - Horizontal Carousel */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar-horizontal flex-nowrap scroll-smooth px-1 ml-1">
                            {/* Custom Emoji Input */}
                            <div title="Digite um emoji personalizado e clique ✓ para salvar" className={`flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border transition-all shrink-0 ${isCustomEmojiActive ? 'border-[#3B82F6] shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-white/10'}`}>
                                <Plus size={14} className="text-[#3B82F6]" />
                                <input
                                    type="text"
                                    placeholder="Add Emoji"
                                    className="bg-transparent border-none outline-none w-16 text-[10px] text-white placeholder:text-gray-500 font-bold"
                                    value={customEmoji}
                                    onChange={(e) => {
                                        setCustomEmoji(e.target.value);
                                        setIsCustomEmojiActive(true);
                                    }}
                                    onFocus={() => setIsCustomEmojiActive(true)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomEmoji(); }}
                                />
                                {customEmoji.trim() && (
                                    <button onClick={handleSaveCustomEmoji} className="text-[#3B82F6] hover:text-white transition-all" title="Salvar emoji">
                                        <Check size={14} strokeWidth={3} />
                                    </button>
                                )}
                            </div>

                            {/* Saved Custom Emojis */}
                            {savedCustomEmojis.map(ce => (
                                <div key={ce.id} className="relative group/emoji shrink-0">
                                    <button
                                        onClick={() => {
                                            setSelectedEmoji(ce.emoji);
                                            setIsCustomEmojiActive(false);
                                        }}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0 ${(!isCustomEmojiActive && selectedEmoji === ce.emoji) ? 'bg-[#3B82F6]/20 border-[#3B82F6] scale-105 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <span className={`text-2xl transition-all ${(!isCustomEmojiActive && selectedEmoji === ce.emoji) ? 'scale-110' : ''}`}>{ce.emoji}</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCustomEmoji(ce.id)}
                                        title="Remover este emoji personalizado"
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/emoji:opacity-100 transition-opacity"
                                    >
                                        <X size={8} className="text-white" />
                                    </button>
                                </div>
                            ))}


                            {emojis.map(e => (
                                <button
                                    key={e}
                                    onClick={() => {
                                        setSelectedEmoji(e);
                                        setIsCustomEmojiActive(false);
                                    }}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0 ${(!isCustomEmojiActive && selectedEmoji === e) ? 'bg-[#3B82F6]/20 border-[#3B82F6] scale-105 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <span className={`text-2xl transition-all ${(!isCustomEmojiActive && selectedEmoji === e) ? 'scale-110' : ''}`}>{e}</span>
                                </button>
                            ))}
                        </div>

                        {/* Status Selector */}
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2 px-2">
                                <span className="text-[10px] font-medium text-white/40 tracking-wide">Status</span>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-nowrap px-1">
                                {defaultStatuses.map((s) => (
                                    <button
                                        key={s.name}
                                        title={`Definir status como "${s.name}"`}
                                        onClick={() => {
                                            setSelectedStatus(s.name);
                                            setStatusEmoji(s.emoji);
                                            setIsCustomStatusActive(false);
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-medium transition-all border shrink-0 ${(!isCustomStatusActive && selectedStatus === s.name) ? s.active : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        <span>{s.emoji}</span>
                                        <span>{s.name}</span>
                                    </button>
                                ))}

                                {/* Custom Status Input */}
                                <div title="Digite um status personalizado e clique ✓ para salvar" className={`flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border transition-all shrink-0 ${isCustomStatusActive ? 'bg-white/10 border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'border-white/10'}`}>
                                    <span className="text-[10px]">📌</span>
                                    <input
                                        type="text"
                                        placeholder="Personalizar..."
                                        className="bg-transparent border-none outline-none w-24 text-[10px] text-white placeholder:text-gray-500 font-bold"
                                        value={customStatus}
                                        onChange={(e) => {
                                            setCustomStatus(e.target.value);
                                            setIsCustomStatusActive(true);
                                        }}
                                        onFocus={() => setIsCustomStatusActive(true)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomStatus(); }}
                                    />
                                    {customStatus.trim() && (
                                        <button onClick={handleSaveCustomStatus} className="text-[#17baa4] hover:text-white transition-all" title="Salvar status">
                                            <Check size={14} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>

                                {/* Saved Custom Statuses */}
                                {savedCustomStatuses.map(cs => (
                                    <div key={cs.id} className="relative group/status shrink-0">
                                        <button
                                            onClick={() => {
                                                setSelectedStatus(cs.name);
                                                setStatusEmoji(cs.emoji);
                                                setIsCustomStatusActive(false);
                                            }}
                                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-medium transition-all border shrink-0 ${(!isCustomStatusActive && selectedStatus === cs.name) ? 'bg-[#17baa4]/20 border-[#17baa4]/50 text-[#17baa4]' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <span>{cs.emoji}</span>
                                            <span>{cs.name}</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCustomStatus(cs.id)}
                                            title="Remover este status personalizado"
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/status:opacity-100 transition-opacity"
                                        >
                                            <X size={8} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Row - Single Line Action Row */}
                        <div className="flex items-end gap-4 w-full py-2 overflow-x-auto scrollbar-hide flex-nowrap pr-20">
                            <div className="flex flex-col gap-2 shrink-0">
                                <span className="text-[10px] font-medium text-white/40 tracking-wide ml-1">Prioridade</span>
                                <div className="flex gap-2">
                                    <button title="Prioridade urgente — Queima de FreeBet" onClick={() => setPriority('high')} className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-medium border transition-all ${priority === 'high' ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}>
                                        <TriangleAlert size={14} /> Urgente
                                    </button>
                                    <button title="Prioridade importante — Possível Duplo" onClick={() => setPriority('medium')} className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-medium border transition-all ${priority === 'medium' ? 'bg-[#FFE600]/10 border-[#FFE600]/40 text-[#FFE600]' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}>
                                        <Star size={14} /> Importante
                                    </button>
                                    <button title="Prioridade normal — Sem duplo / Vale Giros" onClick={() => setPriority('low')} className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-medium border transition-all ${priority === 'low' ? 'bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#3B82F6]' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}>
                                        <FileText size={14} /> Normal
                                    </button>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-white/5 shrink-0 mx-1" />

                            <div className="flex flex-col gap-2 shrink-0 ml-1 relative">
                                <span className="text-[10px] font-medium text-white/40 tracking-wide ml-1">Agendar</span>
                                <button
                                    ref={schedulerRef}
                                    title="Agendar data e hora para lembrete desta nota"
                                    className={`flex items-center justify-between gap-6 px-4 py-2.5 bg-black/30 border rounded-xl text-[11.5px] font-bold transition-all min-w-[180px] group ${showScheduler || (tempDate && tempTime) ? 'border-[#17baa4]/50 text-white' : 'border-white/5 text-gray-300 hover:border-[#17baa4]/40'}`}
                                >
                                    <div className="flex-1 text-left" onClick={() => setShowScheduler(!showScheduler)}>
                                        {showScheduler ? 'Selecionando...' : (tempDate && tempTime ? `${new Date(tempDate).toLocaleDateString('pt-BR')} ${tempTime}` : 'Data e Hora')}
                                    </div>
                                    <div
                                        className="relative p-1 -mr-1 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (tempDate && tempTime || notes.some(n => n.reminderEnabled)) {
                                                setShowNotificationsModal(true);
                                            } else {
                                                setShowScheduler(!showScheduler);
                                            }
                                        }}
                                    >
                                        <Bell size={15} className={`transition-all ${showScheduler || (tempDate && tempTime) ? 'text-[#17baa4] opacity-100' : 'opacity-40 group-hover:opacity-100'}`} title="Ver notificações agendadas" />
                                        {notes.filter(n => n.reminderEnabled).length > 0 && (
                                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#1a1f35]" />
                                        )}
                                    </div>
                                </button>

                                {showScheduler && createPortal(
                                    <div
                                        style={{
                                            position: 'fixed',
                                            top: schedulerRef.current
                                                ? (schedulerRef.current.getBoundingClientRect().top > 300
                                                    ? schedulerRef.current.getBoundingClientRect().top - 230
                                                    : schedulerRef.current.getBoundingClientRect().bottom + 10)
                                                : '50%',
                                            left: schedulerRef.current
                                                ? Math.max(10, Math.min(window.innerWidth - 220, schedulerRef.current.getBoundingClientRect().left))
                                                : '50%',
                                        }}
                                        className="z-[999] p-4 bg-[#1a1f35] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[200px] animate-in slide-in-from-bottom-2 duration-300"
                                    >
                                        <div className="flex flex-col gap-1.5 cursor-pointer group/label" onClick={(e) => {
                                            const input = (e.currentTarget.querySelector('input') as HTMLInputElement);
                                            input?.showPicker?.();
                                        }}>
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover/label:text-[#17baa4] transition-colors">Data</label>
                                            <input
                                                type="date"
                                                value={tempDate}
                                                onChange={(e) => setTempDate(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onFocus={(e) => e.currentTarget.showPicker?.()}
                                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#17baa4]/50 cursor-pointer w-full"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5 cursor-pointer group/label" onClick={(e) => {
                                            const input = (e.currentTarget.querySelector('input') as HTMLInputElement);
                                            input?.showPicker?.();
                                        }}>
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover/label:text-[#17baa4] transition-colors">Hora</label>
                                            <input
                                                type="time"
                                                value={tempTime}
                                                onChange={(e) => setTempTime(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onFocus={(e) => e.currentTarget.showPicker?.()}
                                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#17baa4]/50 cursor-pointer w-full"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowScheduler(false)}
                                            className="w-full bg-[#17baa4] text-[#090c19] py-2 rounded-lg text-[10px] font-black uppercase tracking-widest mt-1"
                                        >
                                            Confirmar
                                        </button>
                                    </div>,
                                    document.body
                                )}
                            </div>

                            <button title="Salvar esta anotação no bloco de notas" onClick={handleAddNote} className="bg-[#17baa4] hover:bg-[#129482] text-[#090c19] px-7 py-2.5 rounded-xl font-black text-[13px] transition-all shadow-[0_0_20px_rgba(23,186,164,0.4)] flex items-center gap-2 shrink-0 active:scale-95 translate-y-[-1px]">
                                <Plus size={18} strokeWidth={2.5} /> Salvar anotação
                            </button>

                            {/* Spacer to prevent clipping on the right */}
                            <div className="min-w-[40px] h-4 shrink-0" />
                        </div>

                        {/* Legend Row */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[9px] font-black text-gray-600 uppercase tracking-widest pt-2">
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Urgente = Queima de FreeBet</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Importante = Possível Duplo</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Normal = Sem duplo / Vale Giros</div>
                        </div>
                    </div>
                )}

                {/* Spacer to remove search bar from here as it moved to Suas Notas section */}
                <div className="h-4" />
            </Card>

            {/* Notes List with filter */}
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-center relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                        <span className="relative px-6 bg-[#090c19] text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Suas Notas</span>
                    </div>

                    {/* Search Bar - Top of Section */}
                    <div className="relative">
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:outline-none focus:border-[#17baa4]/40 transition-all placeholder:text-gray-600 shadow-inner"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Bar with Sort and View Toggle */}
                    <div className="flex flex-col gap-5 px-1">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[12px] font-medium text-gray-500">Prioridade:</span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button title="Mostrar todas as prioridades" onClick={() => setFilterPriority('all')} className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all border ${filterPriority === 'all' ? 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/10' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>Todas</button>
                                    <button title="Filtrar por prioridade urgente" onClick={() => setFilterPriority('high')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${filterPriority === 'high' ? 'border-[#EF4444] text-[#EF4444] bg-[#EF4444]/10' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}>
                                        <div className="w-2 h-2 rounded-full bg-[#EF4444]" /> 🔥 Urgente
                                    </button>
                                    <button title="Filtrar por prioridade importante" onClick={() => setFilterPriority('medium')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${filterPriority === 'medium' ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}>
                                        <div className="w-2 h-2 rounded-full bg-[#F59E0B]" /> ⚡ Importante
                                    </button>
                                    <button title="Filtrar por prioridade normal" onClick={() => setFilterPriority('low')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${filterPriority === 'low' ? 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/10' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}>
                                        <div className="w-2 h-2 rounded-full bg-[#3B82F6]" /> 📄 Normal
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative" ref={sortRef}>
                                    <button
                                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                                        title="Clique para escolher a ordenação"
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 border bg-white/5 border-white/10 ${showSortDropdown ? 'text-[#3B82F6] border-[#3B82F6]/30' : 'text-white'}`}
                                    >
                                        <ArrowDownUp size={14} />
                                        {sortBy === 'date' ? 'Data de entrega' : sortBy === 'newest' ? 'Mais recente' : sortBy === 'oldest' ? 'Mais antigo' : 'Alfabética'}
                                    </button>
                                    {showSortDropdown && (
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-[#0d1120]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                            <div className="px-4 py-2.5 border-b border-white/5">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ordenar Lista</span>
                                            </div>
                                            <div className="py-1">
                                                {[
                                                    { key: 'date' as const, label: 'Data de entrega', icon: <Calendar size={14} /> },
                                                    { key: 'newest' as const, label: 'Mais recente primeiro', icon: <ChevronDown size={14} /> },
                                                    { key: 'oldest' as const, label: 'Mais antigo primeiro', icon: <ChevronUp size={14} /> },
                                                    { key: 'alpha' as const, label: 'Ordem alfabética', icon: <FileText size={14} /> },
                                                ].map(opt => (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                                                        title={opt.label}
                                                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-[12px] font-medium transition-all hover:bg-white/5 ${sortBy === opt.key ? 'text-[#17baa4]' : 'text-gray-400 hover:text-gray-200'}`}
                                                    >
                                                        {opt.icon}
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                                    <button title="Visualizar em lista" onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#17baa4]/20 text-[#17baa4] shadow-sm' : 'text-gray-500 hover:text-white'}`}><ListIcon size={14} /></button>
                                    <button title="Visualizar em grade" onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#17baa4]/20 text-[#17baa4] shadow-sm' : 'text-gray-500 hover:text-white'}`}><LayoutGrid size={14} /></button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-medium text-gray-500 shrink-0">Status:</span>
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-nowrap pb-1">
                                <button title="Mostrar todos os status" onClick={() => setFilterStatus('all')} className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all border shrink-0 ${filterStatus === 'all' ? 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/10' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>Todos</button>
                                {defaultStatuses.map(s => {
                                    const colorMap: Record<string, string> = {
                                        'Não Feito': 'border-white/40 text-white bg-white/10',
                                        'Fazendo': 'border-[#FFE600]/50 text-[#FFE600] bg-[#FFE600]/10',
                                        'Feito': 'border-[#00FFD1]/50 text-[#00FFD1] bg-[#00FFD1]/10',
                                        'Perdido': 'border-[#FF3D3D]/50 text-[#FF3D3D] bg-[#FF3D3D]/10'
                                    };
                                    return (
                                        <button
                                            key={s.name}
                                            title={`Filtrar por status "${s.name}"`}
                                            onClick={() => setFilterStatus(s.name)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border shrink-0 ${filterStatus === s.name ? (colorMap[s.name] || 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/10') : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.emoji} {s.name}
                                        </button>
                                    );
                                })}
                                {savedCustomStatuses.map(cs => (
                                    <button
                                        key={cs.id}
                                        title={`Filtrar por status personalizado "${cs.name}"`}
                                        onClick={() => setFilterStatus(cs.name)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border shrink-0 ${filterStatus === cs.name ? 'border-[#17baa4]/50 text-[#17baa4] bg-[#17baa4]/10' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-[#17baa4]" /> {cs.emoji} {cs.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-2 pt-2 -mt-10 mb-8 w-full order-first">
                        <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                            {filteredNotes.length} {filteredNotes.length === 1 ? 'NOTA' : 'NOTAS'}
                        </span>
                    </div>
                    {viewMode === 'grid' ? (
                        /* Kanban Board View - Grouped by Priority */
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { key: 'high' as const, label: '🔥 Urgente', sub: 'Queima de FreeBet', color: '#ff4444', dot: 'bg-[#ff4444]', border: 'border-[#ff4444]/20', bg: 'bg-[#ff4444]/5', badge: 'bg-[#ff4444]' },
                                { key: 'medium' as const, label: '⚡ Importante', sub: 'Possível Duplo', color: '#F59E0B', dot: 'bg-[#F59E0B]', border: 'border-[#F59E0B]/20', bg: 'bg-[#F59E0B]/5', badge: 'bg-[#F59E0B]' },
                                { key: 'low' as const, label: '📄 Normal', sub: 'Sem duplo / Vale Giros', color: '#3B82F6', dot: 'bg-[#3B82F6]', border: 'border-[#3B82F6]/20', bg: 'bg-[#3B82F6]/5', badge: 'bg-[#3B82F6]' },
                            ].map(col => {
                                const colNotes = filteredNotes.filter(n => n.priority === col.key);
                                return (
                                    <div key={col.key} className={`rounded-2xl border ${col.border} ${col.bg} overflow-hidden flex flex-col`}>
                                        {/* Column Header */}
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                                                    <span className="text-[13px] font-bold text-white">{col.label}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-500 ml-4">{col.sub}</span>
                                            </div>
                                            <span className={`${col.badge} text-[10px] font-black text-white w-5 h-5 rounded-md flex items-center justify-center`}>{colNotes.length}</span>
                                        </div>
                                        {/* Column Notes */}
                                        <div className="flex flex-col gap-2 px-3 pb-3 min-h-[80px]">
                                            {colNotes.length === 0 ? (
                                                <div className="text-center text-gray-600 text-[11px] py-6 font-medium">Nenhuma nota</div>
                                            ) : (
                                                colNotes.map(note => (
                                                    <div key={note.id} className="bg-[#1a2236]/80 border border-white/5 rounded-xl p-3 hover:border-[#3B82F6]/30 transition-all group flex flex-col gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-lg shrink-0">{note.emoji}</span>
                                                                <button
                                                                    title={note.completed ? 'Desmarcar como concluída' : 'Marcar como concluída'}
                                                                    onClick={() => handleToggleComplete(note)}
                                                                    className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center shrink-0 ${note.completed ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-white/5 border-white/20 hover:border-[#3B82F6]'}`}
                                                                >
                                                                    {note.completed && <Check size={10} strokeWidth={4} />}
                                                                </button>
                                                                {note.status && (
                                                                    <div className="px-2 py-1 rounded-lg text-[9px] font-bold border border-white/10 text-gray-400 bg-white/5 flex items-center gap-1 uppercase shrink-0">
                                                                        {note.statusEmoji} {note.status}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 shrink-0">
                                                                <button title="Editar nota" className="hover:text-white transition-all"><PenLine size={12} /></button>
                                                                <button title="Mover para pasta" className="hover:text-white transition-all"><Folder size={12} /></button>
                                                                <button title="Excluir nota" onClick={() => handleDeleteNote(note.id)} className="hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                        <p className={`text-white text-[12px] leading-relaxed pl-[26px] ${note.completed ? 'opacity-30 italic line-through' : 'font-medium'}`}>
                                                            {note.content}
                                                        </p>
                                                        <div className="text-[10px] font-medium text-gray-600">
                                                            {new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* List View */
                        <div className="flex flex-col gap-3">
                            {filteredNotes.map(note => (
                                <Card key={note.id} className="bg-[#1a2236]/80 border-white/5 transition-all duration-300 relative group overflow-hidden p-5 hover:border-[#3B82F6]/30 flex flex-col gap-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="shrink-0 flex items-center">
                                                <button
                                                    title={note.completed ? 'Desmarcar como concluída' : 'Marcar como concluída'}
                                                    onClick={() => handleToggleComplete(note)}
                                                    className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${note.completed ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-white/5 border-white/20 hover:border-[#3B82F6]'}`}
                                                >
                                                    {note.completed && <Check size={10} strokeWidth={4} />}
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Priority Badge */}
                                                <div title={`Prioridade: ${note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Normal'}`} className="px-3 py-1.5 rounded-xl text-[11px] font-medium border flex items-center gap-1.5 border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/5">
                                                    <span className="flex items-center gap-1">
                                                        {note.priority === 'high' ? '🔥 Urgente' : note.priority === 'medium' ? '⚡ Importante' : '📄 Normal'}
                                                        <ChevronDown size={10} />
                                                    </span>
                                                </div>

                                                {/* Status Badge */}
                                                {note.status && (
                                                    <div title={`Status: ${note.status}`} className="px-3 py-1.5 rounded-xl text-[11px] font-medium border flex items-center gap-1.5 border-white/10 text-gray-400 bg-white/5">
                                                        <span className="flex items-center gap-1">
                                                            {note.statusEmoji} {note.status}
                                                            <ChevronDown size={10} />
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-gray-500">
                                            <button title="Editar nota" className="hover:text-white transition-all"><PenLine size={16} /></button>
                                            <button title="Mover para pasta" className="hover:text-white transition-all"><Folder size={16} /></button>
                                            <button title="Excluir nota" onClick={() => handleDeleteNote(note.id)} className="hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    <div className="pl-7 space-y-2">
                                        <p className={`text-white text-sm leading-relaxed ${note.completed ? 'opacity-30 italic line-through' : 'font-medium'}`}>
                                            {note.content} {note.emoji}
                                        </p>
                                        <div className="text-[11px] font-medium text-gray-500 flex items-center gap-2">
                                            {new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showBlockedGuide && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
                    <Card className="max-w-md w-full bg-[#1a1f35] border-white/10 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-xl"><BellOff size={24} className="text-red-500" /></div>
                                <h3 className="text-lg font-bold text-white">Notificações Bloqueadas</h3>
                            </div>
                            <button onClick={() => setShowBlockedGuide(false)} className="text-gray-500 hover:text-white transition-all"><X size={20} /></button>
                        </div>
                        <Button onClick={() => setShowBlockedGuide(false)} className="w-full bg-[#17baa4] hover:brightness-110 text-[#090c19] font-black h-12 rounded-xl">Entendi</Button>
                    </Card>
                </div>
            )}

            {showNotificationsModal && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
                    <Card className="max-w-md w-full bg-[#1a1f35] border-white/10 shadow-2xl p-6 space-y-4 relative">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#17baa4]/10 rounded-xl"><Bell size={24} className="text-[#17baa4]" /></div>
                                <h3 className="text-lg font-bold text-white">Próximos Lembretes</h3>
                            </div>
                            <button onClick={() => setShowNotificationsModal(false)} className="text-gray-500 hover:text-white transition-all"><X size={20} /></button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {notes.filter(n => n.reminderEnabled).length > 0 ? (
                                notes
                                    .filter(n => n.reminderEnabled)
                                    .sort((a, b) => new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime())
                                    .map(note => (
                                        <div key={note.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#17baa4]/30 transition-all group">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-xl">{note.emoji}</span>
                                                <p className="text-sm font-medium text-white line-clamp-2 leading-relaxed flex-1">{note.content}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-[#17baa4] uppercase tracking-widest bg-[#17baa4]/10 px-2 py-1 rounded-lg">
                                                    <Clock size={12} />
                                                    {new Date(note.reminderDate!).toLocaleDateString('pt-BR')} {new Date(note.reminderDate!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (currentUser) {
                                                            await FirestoreService.saveNote(currentUser.uid, { ...note, reminderEnabled: false });
                                                        }
                                                    }}
                                                    className="text-[9px] font-black text-gray-500 hover:text-red-500 uppercase tracking-widest transition-all"
                                                >
                                                    Remover Alerta
                                                </button>
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                    <BellOff size={40} className="mb-4 text-gray-400" />
                                    <p className="text-sm font-medium text-gray-400">Nenhum lembrete futuro agendado.</p>
                                </div>
                            )}
                        </div>

                        <Button onClick={() => setShowNotificationsModal(false)} className="w-full bg-[#17baa4] hover:brightness-110 text-[#090c19] font-black h-12 rounded-xl mt-2 shadow-[0_4px_15px_rgba(23,186,164,0.3)]">Fechar</Button>
                    </Card>
                </div>,
                document.body
            )}
        </div>
    );
};

export default BlocoNotas;
