import React, { useState, useEffect } from 'react';
import {
    StickyNote, Trash2, Plus, Bell, BellOff, ChevronUp, ChevronDown,
    TriangleAlert, Star, Check, Calendar, Clock, X, Search, PenLine,
    Folder, Flame, Zap, FileText, LayoutGrid, List as ListIcon, Trash
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
    const [reminderDate, setReminderDate] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showRemindersPopup, setShowRemindersPopup] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date().toISOString().split('T')[0]);
    const [tempTime, setTempTime] = useState('12:00');
    const [showBlockedGuide, setShowBlockedGuide] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [filterStatus, setFilterStatus] = useState<'pending' | 'completed'>('pending');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

    const emojis = [
        '🎰', '💰', '🔥', '⚠️', '✅', '❌', '⭐', '🎯', '💎', '🚀', '📌', '💡',
        '🏆', '⚽', '🏀', '🎲', '🃏', '💸', '📊', '📈', '🔔', '🔒', '🎁', '🏅',
        '💳', '🏦', '📝', '⏰', '🧮', '💪', '👑', '🎉', '📱', '🔑', '🛡️', '⚡',
    ];

    const handleRequestPermission = async () => {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                setPermissionStatus(permission);

                if (permission === 'denied') {
                    setShowBlockedGuide(true);
                } else if (permission === 'granted') {
                    new Notification('Apostas Pro', {
                        body: 'Notificações ativadas com sucesso! 🎉',
                        icon: '/favicon.png'
                    });
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        }
    };

    // Check for reminders every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            notes.forEach(note => {
                if (note.reminderEnabled && note.reminderDate) {
                    const rDate = new Date(note.reminderDate);
                    // If reminder time is now (within this minute)
                    if (rDate.getTime() <= now.getTime() && rDate.getTime() > now.getTime() - 60000) {
                        showNotification(note);
                    }
                }
            });
        }, 60000);

        return () => clearInterval(interval);
    }, [notes]);

    const showNotification = (note: NotepadNote) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Lembrete: Bloco de Notas`, {
                body: `${note.emoji} ${note.content}`,
                icon: '/favicon.png'
            });
        } else {
            alert(`🔔 LEMBRETE: ${note.emoji} ${note.content}`);
        }
    };

    const handleAddNote = async () => {
        if (!currentUser) {
            alert('Erro: Usuário não autenticado.');
            return;
        }

        if (!content.trim()) {
            alert('Por favor, escreva o conteúdo da anotação.');
            return;
        }

        try {
            const newNote: NotepadNote = {
                id: `note_${Date.now()}`,
                content: content.trim(),
                emoji: selectedEmoji,
                priority,
                reminderDate: (tempDate && tempTime) ? `${tempDate}T${tempTime}` : null,
                reminderEnabled: !!(tempDate && tempTime),
                createdAt: new Date().toISOString(),
                completed: false
            };

            await FirestoreService.saveNote(currentUser.uid, newNote);
            setContent('');
            // Optional: reset tempDate e tempTime se desejar
        } catch (error) {
            console.error("[Notepad] Erro ao salvar nota:", error);
            alert('Erro ao salvar nota no servidor. Verifique sua conexão.');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!currentUser) return;
        if (confirm('Deseja excluir esta anotação?')) {
            await FirestoreService.deleteNote(currentUser.uid, noteId);
        }
    };

    const handleToggleReminder = async (note: NotepadNote) => {
        if (!currentUser) return;
        const updatedNote = { ...note, reminderEnabled: !note.reminderEnabled };
        await FirestoreService.saveNote(currentUser.uid, updatedNote);
    };

    const handleToggleComplete = async (note: NotepadNote) => {
        if (!currentUser) return;
        const updatedNote = { ...note, completed: !note.completed };
        await FirestoreService.saveNote(currentUser.uid, updatedNote);
    };

    const handleClearCompleted = async () => {
        if (!currentUser) return;
        const completedNotes = notes.filter(n => n.completed);
        if (completedNotes.length === 0) return;

        if (confirm(`Deseja excluir permanentemente as ${completedNotes.length} notas concluídas?`)) {
            for (const note of completedNotes) {
                await FirestoreService.deleteNote(currentUser.uid, note.id);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (!currentUser || selectedNoteIds.length === 0) return;
        if (confirm(`Excluir ${selectedNoteIds.length} nota(s) selecionada(s)?`)) {
            for (const id of selectedNoteIds) {
                await FirestoreService.deleteNote(currentUser.uid, id);
            }
            setSelectedNoteIds([]);
            setIsSelectionMode(false);
        }
    };

    const handleBulkComplete = async () => {
        if (!currentUser || selectedNoteIds.length === 0) return;
        for (const id of selectedNoteIds) {
            const note = notes.find(n => n.id === id);
            if (note) {
                await FirestoreService.saveNote(currentUser.uid, { ...note, completed: true });
            }
        }
        setSelectedNoteIds([]);
        setIsSelectionMode(false);
    };

    const handleBulkPriorityChange = async (newPriority: 'low' | 'medium' | 'high') => {
        if (!currentUser || selectedNoteIds.length === 0) return;
        for (const id of selectedNoteIds) {
            const note = notes.find(n => n.id === id);
            if (note) {
                await FirestoreService.saveNote(currentUser.uid, { ...note, priority: newPriority });
            }
        }
        setSelectedNoteIds([]);
        setIsSelectionMode(false);
    };

    const toggleNoteSelection = (id: string) => {
        setSelectedNoteIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (filteredNotes: NotepadNote[]) => {
        const allIds = filteredNotes.map(n => n.id);
        if (selectedNoteIds.length === allIds.length && allIds.length > 0) {
            setSelectedNoteIds([]);
        } else {
            setSelectedNoteIds(allIds);
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'bg-[#ff5500]/10 border-[#ff5500]/40 text-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.1)]';
            case 'medium': return 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
            default: return 'bg-white/10 border-blue-500/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]';
        }
    };

    const upcomingReminders = notes
        .filter(n => n.reminderEnabled && n.reminderDate && new Date(n.reminderDate) > new Date())
        .sort((a, b) => new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime());

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <style>
                {`
                @keyframes pulse-neon {
                    0%, 100% { opacity: 0.8; filter: brightness(1); }
                    50% { opacity: 1; filter: brightness(1.3); }
                }
                @keyframes shimmer {
                    from { transform: translateX(-100%) skewX(-20deg); }
                    to { transform: translateX(200%) skewX(-20deg); }
                }
                .animate-pulse-neon {
                    animation: pulse-neon 2s ease-in-out infinite;
                }
                .shimmer-effect::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        to right,
                        transparent,
                        rgba(255, 255, 255, 0.05),
                        transparent
                    );
                    transform: translateX(-100%) skewX(-20deg);
                    transition: none;
                }
                .group:hover .shimmer-effect::after {
                    animation: shimmer 1s ease-in-out forwards;
                }
                `}
            </style>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="shrink-0">
                        <Folder size={24} className="text-yellow-500 fill-yellow-500/20" />
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            Bloco de Notas
                        </h1>
                        <span className="px-2.5 py-1 rounded-full bg-yellow-500 text-[#090c19] text-[11px] font-black uppercase tracking-wider">
                            {notes.filter(n => !n.completed).length} pendente
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            if (isSelectionMode) setSelectedNoteIds([]);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isSelectionMode
                                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        {isSelectionMode ? <Check size={14} /> : <Check size={14} className="opacity-40" />}
                        {isSelectionMode ? 'Cancelar' : 'Selecionar'}
                    </button>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-gray-500 hover:text-white transition-all">
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {/* Input Card */}
            {!isCollapsed && (
                <Card className="bg-[#121625]/60 backdrop-blur-xl border-white/5 relative overflow-hidden transition-all duration-300 rounded-[32px] p-6 space-y-6">
                    <div className="space-y-4">
                        <textarea
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:ring-1 focus:ring-primary/50 focus:border-primary/30 outline-none transition-all min-h-[110px] resize-none placeholder:text-gray-600"
                            placeholder="Anotar procedimento... (ex: 🎰 Bet365 - Missão 50 giros)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        {/* Emoji List */}
                        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar-horizontal scroll-smooth">
                            {emojis.slice(0, 14).map(e => (
                                <button
                                    key={e}
                                    onClick={() => setSelectedEmoji(e)}
                                    className={`text-xl transition-all duration-300 hover:scale-125 ${selectedEmoji === e ? 'scale-125 brightness-150 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'opacity-60 grayscale-[0.3] hover:opacity-100 hover:grayscale-0'}`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 w-full">
                                <div className="relative flex-1 group">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-primary">
                                        <Calendar size={16} />
                                    </div>
                                    <input
                                        type="date"
                                        className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-xs text-white focus:outline-none focus:border-primary/30 transition-all color-scheme-dark"
                                        value={tempDate}
                                        onChange={(e) => setTempDate(e.target.value)}
                                    />
                                </div>
                                <div className="relative flex-1 group">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-primary">
                                        <Clock size={16} />
                                    </div>
                                    <input
                                        type="time"
                                        className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-xs text-white focus:outline-none focus:border-primary/30 transition-all color-scheme-dark"
                                        value={tempTime}
                                        onChange={(e) => setTempTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mr-2 flex items-center gap-1.5">
                                    <Zap size={14} /> Prioridade:
                                </span>
                                <div className="flex gap-2 flex-1">
                                    <button
                                        onClick={() => setPriority('high')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${priority === 'high' ? 'bg-[#ff5500]/10 border-[#ff5500]/40 text-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.1)]' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                                    >
                                        <Flame size={14} /> Urgente
                                    </button>
                                    <button
                                        onClick={() => setPriority('medium')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${priority === 'medium' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
                                    >
                                        <Zap size={14} /> Importante
                                    </button>
                                    <button
                                        onClick={() => setPriority('low')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${priority === 'low' ? 'bg-white/10 border-blue-500/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                                    >
                                        <FileText size={14} /> Normal
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold text-gray-500/60 uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <Flame size={12} className="text-[#ff5500]" /> Urgente = Queima de FreeBet
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap size={12} className="text-blue-400" /> Importante = Possível Duplo
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText size={12} className="text-gray-400" /> Normal = Sem duplo / Vale Giros
                                </div>
                            </div>

                            <button
                                onClick={handleAddNote}
                                className="bg-green-500 hover:bg-green-400 text-[#090c19] px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-green-500/10 flex items-center gap-2 group ml-auto md:ml-0"
                            >
                                <Plus size={18} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
                                Adicionar
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="px-4 bg-[#090c19] text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Suas Notas</span>
                </div>
            </div>


            {/* Toolbar: Filters & View Toggles */}
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest overflow-x-auto pb-1 w-full md:w-auto">
                            Filtrar:
                            <div className="flex items-center gap-2 ml-2">
                                {[
                                    { id: 'all', label: 'Todas', color: 'bg-blue-500' },
                                    { id: 'high', label: 'Urgente', icon: Flame, color: 'bg-[#ff5500]' },
                                    { id: 'medium', label: 'Importante', icon: Zap, color: 'bg-blue-400' },
                                    { id: 'low', label: 'Normal', icon: FileText, color: 'bg-gray-400' }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setFilterPriority(p.id as any)}
                                        className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filterPriority === p.id
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                            : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${p.color} ${filterPriority === p.id ? 'animate-pulse' : ''}`} />
                                        {p.icon && <p.icon size={12} className="opacity-60" />}
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-all">
                                <Search size={14} className="opacity-40" />
                                Data de entrega
                            </button>
                            <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400 shadow-inner' : 'text-gray-600 hover:text-white'}`}
                                >
                                    <ListIcon size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400 shadow-inner' : 'text-gray-600 hover:text-white'}`}
                                >
                                    <LayoutGrid size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {isSelectionMode && (
                        <div className="bg-[#1a1f35]/80 backdrop-blur-xl border border-blue-500/20 rounded-[20px] p-3 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <Check size={14} className="text-blue-400" />
                                    <span className="text-[11px] font-black text-white uppercase tracking-wider">{selectedNoteIds.length} selecionadas</span>
                                </div>
                                <button
                                    onClick={() => handleSelectAll(notes.filter(note => {
                                        const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
                                        const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
                                        const matchesStatus = filterStatus === 'all' || (filterStatus === 'pending' ? !note.completed : note.completed);
                                        return matchesSearch && matchesPriority && matchesStatus;
                                    }))}
                                    className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline"
                                >
                                    Selecionar todas ({notes.filter(note => !note.completed).length})
                                </button>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={handleBulkComplete}
                                    disabled={selectedNoteIds.length === 0}
                                    className="flex items-center gap-2 px-6 py-2 bg-green-500/80 hover:bg-green-400 text-[#090c19] rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                                >
                                    <Check size={14} strokeWidth={3} />
                                    Concluir
                                </button>
                                <div className="h-6 w-px bg-white/10 mx-1" />
                                <div className="flex gap-1.5">
                                    <button onClick={() => handleBulkPriorityChange('high')} disabled={selectedNoteIds.length === 0} className="p-2 bg-white/5 border border-white/5 rounded-xl text-[#ff5500] hover:bg-white/10 disabled:opacity-50"><Flame size={14} /></button>
                                    <button onClick={() => handleBulkPriorityChange('medium')} disabled={selectedNoteIds.length === 0} className="p-2 bg-white/5 border border-white/5 rounded-xl text-blue-400 hover:bg-white/10 disabled:opacity-50"><Zap size={14} /></button>
                                    <button onClick={() => handleBulkPriorityChange('low')} disabled={selectedNoteIds.length === 0} className="p-2 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:bg-white/10 disabled:opacity-50"><FileText size={14} /></button>
                                </div>
                                <div className="h-6 w-px bg-white/10 mx-1" />
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={selectedNoteIds.length === 0}
                                    className="flex items-center gap-2 px-6 py-2 bg-red-500/20 border border-red-500/20 text-red-500 hover:bg-red-500/30 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                                >
                                    <Trash size={14} />
                                    Excluir
                                </button>
                                <button onClick={() => setIsSelectionMode(false)} className="px-4 py-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">
                            {filterStatus === 'pending' ? 'Pendentes' : 'Concluídas'}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setFilterStatus('pending')} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${filterStatus === 'pending' ? 'bg-primary/20 text-primary' : 'text-gray-600 hover:text-gray-400'}`}>Pendentes</button>
                            <button onClick={() => setFilterStatus('completed')} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${filterStatus === 'completed' ? 'bg-primary/20 text-primary' : 'text-gray-600 hover:text-gray-400'}`}>Concluídas</button>
                        </div>
                    </div>

                    {/* Notes List */}
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
                        {notes
                            .filter(note => {
                                const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
                                const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
                                const matchesStatus = filterStatus === 'all' || (filterStatus === 'pending' ? !note.completed : note.completed);
                                return matchesSearch && matchesPriority && matchesStatus;
                            })
                            .map((note) => (
                                <Card key={note.id} className={`bg-[#1a1f35]/40 backdrop-blur-md border border-white/5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${selectedNoteIds.includes(note.id) ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(23,186,164,0.1)]' : 'hover:border-white/10'} ${viewMode === 'grid' ? 'p-5 flex flex-col h-full' : 'p-3 flex items-center gap-4'}`}>
                                    {isSelectionMode ? (
                                        <div
                                            className={`absolute top-4 left-4 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer z-20 ${selectedNoteIds.includes(note.id) ? 'bg-primary border-primary' : 'border-white/20 hover:border-primary/40'}`}
                                            onClick={(e) => { e.stopPropagation(); toggleNoteSelection(note.id); }}
                                        >
                                            {selectedNoteIds.includes(note.id) && <Check size={14} className="text-[#090c19]" strokeWidth={4} />}
                                        </div>
                                    ) : (
                                        <div
                                            className={`absolute top-4 left-4 w-4 h-4 rounded-md border border-white/10 flex items-center justify-center cursor-pointer z-20 hover:border-white/30 transition-all ${note.completed ? 'bg-green-500 border-green-500' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggleComplete(note); }}
                                        >
                                            {note.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                    )}

                                    <div className={`flex flex-col h-full w-full pl-8`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-2 ${getPriorityColor(note.priority)} shadow-sm`}>
                                                {note.priority === 'high' ? <Flame size={12} /> : note.priority === 'medium' ? <Zap size={12} /> : <FileText size={12} />}
                                                {note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Normal'}
                                            </span>
                                            {!isSelectionMode && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button className="p-1.5 text-gray-600 hover:text-white transition-all"><PenLine size={14} /></button>
                                                    <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-gray-600 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </div>

                                        <p className={`text-white text-sm font-medium leading-relaxed mb-4 flex-1 ${note.completed ? 'line-through opacity-30 italic' : ''}`}>
                                            {note.emoji} {note.content}
                                        </p>

                                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest border-t border-white/5 pt-4">
                                            <div className="flex items-center gap-3">
                                                <span>{new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {note.reminderDate && note.reminderEnabled && !note.completed && (
                                                <div className="flex items-center gap-1 text-primary animate-pulse">
                                                    <Bell size={10} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Subtle Glow based on priority */}
                                    <div className={`absolute bottom-0 right-0 w-32 h-32 blur-[60px] opacity-[0.03] pointer-events-none transition-all duration-500 group-hover:opacity-[0.07] ${note.priority === 'high' ? 'bg-[#ff5500]' : note.priority === 'medium' ? 'bg-blue-400' : 'bg-white'}`} />
                                </Card>
                            ))}

                        {notes.filter(note => {
                            const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
                            const matchesStatus = filterStatus === 'all' || (filterStatus === 'pending' ? !note.completed : note.completed);
                            return matchesSearch && matchesPriority && matchesStatus;
                        }).length === 0 && (
                                <div className="col-span-full py-32 text-center space-y-8 relative overflow-hidden rounded-[40px] border border-white/5 bg-[#1a1f35]/20 backdrop-blur-xl group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />
                                    <div className="relative z-10">
                                        <div className="w-28 h-28 bg-gradient-to-br from-primary/20 to-primary/5 rounded-[45px] flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-[0_0_50px_rgba(23,186,164,0.1)] group-hover:scale-110 transition-transform duration-700">
                                            <StickyNote size={56} className="text-primary opacity-40 animate-bounce" />
                                        </div>
                                        <h3 className="text-white text-2xl font-black uppercase tracking-widest">Nenhuma nota encontrada</h3>
                                        <div className="h-1 w-20 bg-primary/30 mx-auto my-4 rounded-full" />
                                        <p className="text-gray-500 text-sm max-w-[300px] mx-auto leading-relaxed font-medium">
                                            Sua lista está limpa. Comece a organizar seus procedimentos e alertas agora mesmo!
                                        </p>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {/* Notification Blocked Guide Modal */}
            {showBlockedGuide && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
                    <Card className="max-w-md w-full bg-[#1a1f35] border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-xl">
                                        <BellOff size={24} className="text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Notificações Bloqueadas</h3>
                                </div>
                                <button onClick={() => setShowBlockedGuide(false)} className="text-gray-500 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
                                <p>O seu navegador bloqueou as notificações para este site. Para receber alertas de lembretes, você precisa desbloquear manualmente:</p>

                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                                        <p>Clique no ícone de <span className="text-white font-bold inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded">🔒 Cadeado</span> ao lado da URL na barra de endereços.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                                        <p>Encontre a opção <span className="text-white font-bold">Notificações</span>.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">3</div>
                                        <p>Mude para <span className="text-primary font-bold">Permitir</span> e recarregue a página.</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => setShowBlockedGuide(false)}
                                className="w-full bg-primary hover:bg-primary-dark text-[#090c19] font-black h-12 rounded-xl"
                            >
                                Entendi, vou ajustar
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default BlocoNotas;
