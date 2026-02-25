import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    StickyNote, Trash2, Plus, Bell, BellOff, ChevronUp, ChevronDown,
    TriangleAlert, Star, Check, Calendar, Clock, X, Search, PenLine,
    Folder, Flame, Zap, FileText, LayoutGrid, List as ListIcon, Trash, ArrowDownWideNarrow, Pencil
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
    const [tempTime, setTempTime] = useState('12:00');
    const [showBlockedGuide, setShowBlockedGuide] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [filterStatus, setFilterStatus] = useState<'pending' | 'completed'>('pending');
    const [customEmoji, setCustomEmoji] = useState('');
    const [isCustomEmojiActive, setIsCustomEmojiActive] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('Não Feito');
    const [statusEmoji, setStatusEmoji] = useState('⌛');
    const [isCustomStatusActive, setIsCustomStatusActive] = useState(false);
    const [customStatus, setCustomStatus] = useState('');
    const [showScheduler, setShowScheduler] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const schedulerRef = useRef<HTMLButtonElement>(null);

    const defaultStatuses = [
        { name: 'Não Feito', emoji: '⌛' },
        { name: 'Fazendo', emoji: '▶️' },
        { name: 'Feito', emoji: '✅' },
        { name: 'Perdido', emoji: '❌' }
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
            setTempTime('12:00');
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
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all bg-[#FFCC00]/10 border border-[#FFCC00]/30 text-[#FFCC00] hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(255,204,0,0.2)] h-11 ${permissionStatus === 'default' ? 'animate-pulse' : ''}`}
                    >
                        <Bell size={16} />
                        <span>Ativar Notificações</span>
                    </button>
                ) : (
                    <button
                        onClick={() => setShowNotificationsModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 shadow-sm"
                    >
                        <div className="relative">
                            <Bell size={18} className="text-[#17baa4]" />
                            {notes.filter(n => n.reminderEnabled).length > 0 && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-[#1a1f35] animate-pulse" />
                            )}
                        </div>
                        <span>Lembretes</span>
                    </button>
                )}
            </div>

            {/* Nova Anotação Card */}
            <Card className="bg-[#121625]/80 backdrop-blur-xl border-white/5 relative overflow-hidden rounded-[32px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Pencil size={14} className="text-[#17baa4]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Criar Nova Anotação</span>
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 text-gray-500 hover:text-white transition-all">
                        {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                </div>

                {!isCollapsed && (
                    <div className="p-8 space-y-6">
                        <textarea
                            className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-5 text-white text-sm focus:ring-1 focus:ring-[#17baa4]/50 outline-none transition-all min-h-[120px] resize-none placeholder:text-gray-600"
                            placeholder="Anotar procedimento... (ex: 🎰 Bet365 - Missão 50 giros)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        {/* Emoji Picker - Horizontal Carousel */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar-horizontal flex-nowrap scroll-smooth px-1 ml-1">
                            {/* Custom Emoji Input */}
                            <div className={`flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border transition-all shrink-0 ${isCustomEmojiActive ? 'border-[#17baa4] shadow-[0_0_10px_rgba(23,186,164,0.3)]' : 'border-white/5'}`}>
                                <Plus size={14} className="text-[#17baa4]" />
                                <input
                                    type="text"
                                    placeholder="Add Emoji"
                                    className="bg-transparent border-none outline-none w-16 text-[10px] text-white placeholder:text-gray-600 font-bold"
                                    value={customEmoji}
                                    onChange={(e) => {
                                        setCustomEmoji(e.target.value);
                                        setIsCustomEmojiActive(true);
                                    }}
                                    onFocus={() => setIsCustomEmojiActive(true)}
                                />
                            </div>

                            {emojis.map(e => (
                                <button
                                    key={e}
                                    onClick={() => {
                                        setSelectedEmoji(e);
                                        setIsCustomEmojiActive(false);
                                    }}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0 ${(!isCustomEmojiActive && selectedEmoji === e) ? 'bg-[#17baa4]/20 border-[#17baa4] scale-105 shadow-[0_0_15px_rgba(23,186,164,0.3)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <span className={`text-2xl transition-all ${(!isCustomEmojiActive && selectedEmoji === e) ? 'scale-110' : ''}`}>{e}</span>
                                </button>
                            ))}
                        </div>

                        {/* Status Selector */}
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2 px-2">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Status</span>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-nowrap px-1">
                                {defaultStatuses.map((s) => (
                                    <button
                                        key={s.name}
                                        onClick={() => {
                                            setSelectedStatus(s.name);
                                            setStatusEmoji(s.emoji);
                                            setIsCustomStatusActive(false);
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all border shrink-0 ${(!isCustomStatusActive && selectedStatus === s.name) ? 'bg-[#FFCC00]/20 border-[#FFCC00]/50 text-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        <span>{s.emoji}</span>
                                        <span>{s.name}</span>
                                    </button>
                                ))}

                                {/* Custom Status Input */}
                                <div className={`flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border transition-all shrink-0 ${isCustomStatusActive ? 'border-[#17baa4] shadow-[0_0_10px_rgba(23,186,164,0.3)]' : 'border-white/5'}`}>
                                    <span className="text-[10px]">📌</span>
                                    <input
                                        type="text"
                                        placeholder="Personalizar..."
                                        className="bg-transparent border-none outline-none w-24 text-[10px] text-white placeholder:text-gray-600 font-bold"
                                        value={customStatus}
                                        onChange={(e) => {
                                            setCustomStatus(e.target.value);
                                            setIsCustomStatusActive(true);
                                        }}
                                        onFocus={() => setIsCustomStatusActive(true)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row - Single Line Action Row */}
                        <div className="flex items-end gap-4 w-full py-2 overflow-x-auto scrollbar-hide flex-nowrap pr-20">
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => setPriority('high')} className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-widest border transition-all ${priority === 'high' ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-300'}`}>
                                    <TriangleAlert size={13} /> Urgente
                                </button>
                                <button onClick={() => setPriority('medium')} className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-widest border transition-all ${priority === 'medium' ? 'bg-[#FFCC00]/10 border-[#FFCC00]/40 text-[#FFCC00]' : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-300'}`}>
                                    <Star size={13} /> Importante
                                </button>
                                <button onClick={() => setPriority('low')} className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-widest border transition-all ${priority === 'low' ? 'bg-[#33b5e5]/10 border-[#33b5e5]/40 text-[#33b5e5]' : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-300'}`}>
                                    <FileText size={13} /> Normal
                                </button>
                            </div>

                            <div className="h-6 w-px bg-white/5 shrink-0 mx-1" />

                            <div className="flex flex-col gap-1 shrink-0 ml-1 relative">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 leading-none">Agendar</span>
                                <button
                                    ref={schedulerRef}
                                    onClick={() => setShowScheduler(!showScheduler)}
                                    className={`flex items-center justify-between gap-6 px-4 py-2.5 bg-black/30 border rounded-xl text-[11.5px] font-bold transition-all min-w-[180px] group ${showScheduler || (tempDate && tempTime) ? 'border-[#17baa4]/50 text-white' : 'border-white/5 text-gray-300 hover:border-[#17baa4]/40'}`}
                                >
                                    <span>{showScheduler ? 'Selecionando...' : (tempDate && tempTime ? `${new Date(tempDate).toLocaleDateString('pt-BR')} ${tempTime}` : 'Data e Hora')}</span>
                                    <Clock size={15} className={`transition-all ${showScheduler || (tempDate && tempTime) ? 'text-[#17baa4] opacity-100' : 'opacity-40 group-hover:opacity-100'}`} />
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

                            <button onClick={handleAddNote} className="bg-[#17baa4] hover:bg-[#129482] text-[#090c19] px-7 py-2.5 rounded-xl font-black text-[11.5px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(23,186,164,0.4)] flex items-center gap-2 shrink-0 active:scale-95 translate-y-[-1px]">
                                <Plus size={16} strokeWidth={3} /> SALVAR ANOTAÇÃO
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

                {/* Search Bar at bottom of creator card */}
                <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                    <div className="relative">
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Pesquisar anotações..."
                            className="w-full bg-black/20 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:outline-none focus:border-[#17baa4]/40 transition-all placeholder:text-gray-600"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Notes List with filter */}
            <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Suas Notas</h3>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                        <button onClick={() => setFilterStatus('pending')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'pending' ? 'bg-white/10 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}>Pendentes</button>
                        <button onClick={() => setFilterStatus('completed')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'completed' ? 'bg-white/10 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}>Concluídas</button>
                    </div>
                </div>

                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-3"}>
                    {notes
                        .filter(note => {
                            const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
                            const matchesStatus = filterStatus === 'pending' ? !note.completed : note.completed;
                            return matchesSearch && matchesPriority && matchesStatus;
                        })
                        .map(note => (
                            <Card key={note.id} className={`bg-[#121625]/60 border-white/5 transition-all duration-300 relative group overflow-hidden p-6`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5 ${getPriorityColor(note.priority)}`}>
                                            {note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Normal'}
                                        </div>
                                        {note.status && (
                                            <div className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-gray-400 flex items-center gap-2">
                                                <span>{note.statusEmoji || '📌'}</span>
                                                <span>{note.status}</span>
                                            </div>
                                        )}
                                        {note.reminderEnabled && note.reminderDate && (
                                            <div className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[#17baa4]/20 bg-[#17baa4]/5 text-[#17baa4] flex items-center gap-2">
                                                <Clock size={12} />
                                                <span>{new Date(note.reminderDate) > new Date() ? 'Agendado' : 'Notificado'}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-gray-500 hover:text-red-500 bg-white/5 rounded-lg"><Trash size={14} /></button>
                                    </div>
                                </div>
                                <p className={`text-white text-[13px] md:text-sm leading-relaxed mb-4 ${note.completed ? 'opacity-30 italic line-through' : 'font-medium'}`}>
                                    {note.content} {note.emoji}
                                </p>
                                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                    {new Date(note.createdAt).toLocaleDateString('pt-BR')} {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </Card>
                        ))
                    }
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
                            <button onClick={() => setShowBlockedGuide(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <Button onClick={() => setShowBlockedGuide(false)} className="w-full bg-[#17baa4] hover:brightness-110 text-[#090c19] font-black h-12 rounded-xl">Entendi</Button>
                    </Card>
                </div>
            )}

            {/* Notifications Modal - Portalized for visibility */}
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
