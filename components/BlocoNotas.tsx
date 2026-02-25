import React, { useState, useEffect } from 'react';
import {
    StickyNote, Trash2, Plus, Bell, BellOff, ChevronUp, ChevronDown,
    TriangleAlert, Star, Check, Calendar, Clock, X, Search, PenLine
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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [filterStatus, setFilterStatus] = useState<'pending' | 'completed'>('pending');

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
                reminderDate: reminderDate || null,
                reminderEnabled: !!reminderDate,
                createdAt: new Date().toISOString()
            };

            await FirestoreService.saveNote(currentUser.uid, newNote);
            setContent('');
            setReminderDate('');

            // Give feedback
            console.info("[Notepad] Nota salva com sucesso.");
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

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    const handleConfirmReminder = () => {
        setReminderDate(`${tempDate}T${tempTime}`);
        setShowDatePicker(false);
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
                    <div className="p-2.5 bg-primary/10 rounded-2xl shrink-0 border border-primary/10 shadow-lg shadow-primary/5">
                        <StickyNote size={28} className="text-primary sm:size-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                            Bloco de Notas
                            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{notes.length} Notas</span>
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium">Anote procedimentos e tarefas rápidas</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {/* Search Bar Integrated in Header */}
                    <div className="relative group min-w-[240px]">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="search"
                            placeholder="Buscar..."
                            className="w-full bg-[#1a1f35]/40 border border-white/10 rounded-xl pl-11 pr-4 h-11 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-[#1a1f35]/80 transition-all backdrop-blur-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Relocated Notification Button */}
                    <div className="shrink-0">
                        {permissionStatus === 'granted' ? (
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/5 whitespace-nowrap justify-center h-11">
                                <Bell size={14} />
                                <span>Notificações Ativas</span>
                            </div>
                        ) : (permissionStatus === 'default' || permissionStatus === 'denied') && (
                            <button
                                onClick={handleRequestPermission}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all border shadow-lg whitespace-nowrap w-full sm:w-auto justify-center h-11 ${permissionStatus === 'denied'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 animate-pulse'
                                    }`}
                            >
                                {permissionStatus === 'denied' ? <BellOff size={15} /> : <Bell size={15} className="animate-pulse" />}
                                <span>{permissionStatus === 'denied' ? 'Bloqueadas' : 'Ativar Alertas'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Input Card */}
            <Card className="bg-gradient-to-br from-[#1a1f35] to-[#0d1425] border-gray-800/50 relative overflow-hidden pb-4 transition-all duration-300">
                {/* Responsive Header Container */}
                {/* Compact Header for Input Card - Just the collapse toggle */}
                <div className="flex items-center justify-between px-4 sm:px-8 pt-8 pb-4 relative z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Plus size={16} className="text-primary" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Crie uma Anotação</span>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-2 rounded-xl transition-all flex items-center justify-center ${isCollapsed ? 'bg-primary/10 text-primary' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                    >
                        {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                </div>

                {
                    !isCollapsed && (
                        <div className="p-4 md:p-8 pt-0 space-y-6">
                            <div className="space-y-4">
                                <textarea
                                    className="w-full bg-[#090c19] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all min-h-[100px] resize-none"
                                    placeholder="Anotar procedimento... (ex: 🎰 Bet365 - Missão 50 giros)"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) handleAddNote();
                                    }}
                                />

                                {/* Emoji Carousel */}
                                <div className="relative group/carousel">
                                    <div className="flex gap-2.5 overflow-x-auto pb-4 pt-1 scroll-smooth px-1 custom-scrollbar-horizontal" style={{ scrollbarWidth: 'auto' }}>
                                        {emojis.map(e => (
                                            <button
                                                key={e}
                                                onClick={() => setSelectedEmoji(e)}
                                                className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-[20px] text-xl transition-all duration-500 ${selectedEmoji === e
                                                    ? 'bg-primary/30 text-white shadow-[0_0_25px_rgba(23,186,164,0.4)] scale-110 border-primary/60 ring-2 ring-primary/20'
                                                    : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:scale-110 hover:-translate-y-1'
                                                    } border backdrop-blur-md relative overflow-hidden group/emoji`}
                                            >
                                                {selectedEmoji === e && (
                                                    <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                                                )}
                                                <span className="relative z-10">{e}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {/* Fade edges */}
                                    <div className="absolute left-0 top-0 bottom-3 w-4 bg-gradient-to-r from-[#1a1f35] to-transparent pointer-events-none z-10" />
                                    <div className="absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-[#1a1f35] via-[#1a1f35]/80 to-transparent pointer-events-none z-10" />
                                </div>

                                <div className="flex flex-col xl:flex-row gap-4 xl:gap-8 items-stretch xl:items-center justify-between">
                                    <div className="grid grid-cols-3 gap-2 w-full">
                                        <button
                                            onClick={() => setPriority('high')}
                                            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'text-gray-500 border-white/5 hover:bg-white/5'}`}
                                        >
                                            <TriangleAlert size={12} className="sm:size-[14px]" /> Urgente
                                        </button>
                                        <button
                                            onClick={() => setPriority('medium')}
                                            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'text-gray-500 border-white/5 hover:bg-white/5'}`}
                                        >
                                            <Star size={12} className="sm:size-[14px]" /> Importante
                                        </button>
                                        <button
                                            onClick={() => setPriority('low')}
                                            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${priority === 'low' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'text-gray-500 border-white/5 hover:bg-white/5'}`}
                                        >
                                            <StickyNote size={12} className="sm:size-[14px]" /> Normal
                                        </button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full">
                                        <div className="flex flex-col gap-1 flex-1 relative">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">Agendar Lembrete</span>
                                            <div
                                                className="relative h-11 sm:h-10 cursor-pointer group/picker"
                                                onClick={() => setShowDatePicker(!showDatePicker)}
                                            >
                                                <div className="w-full h-full bg-[#090c19] border border-white/10 rounded-xl px-4 flex items-center justify-between text-xs text-white group-hover/picker:border-primary/50 transition-all shadow-lg overflow-hidden md:min-w-[180px]">
                                                    <span className={reminderDate ? 'text-white font-bold' : 'text-gray-500'}>
                                                        {reminderDate
                                                            ? new Date(reminderDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                            : 'Selecionar Data e Hora'
                                                        }
                                                    </span>
                                                    <div className="relative ml-3" onClick={(e) => { e.stopPropagation(); setShowRemindersPopup(!showRemindersPopup); }}>
                                                        <Bell size={14} className={`transition-colors ${upcomingReminders.length > 0 ? 'text-primary animate-bounce' : 'text-gray-500 group-hover/picker:text-primary'}`} />
                                                        {upcomingReminders.length > 0 && (
                                                            <span className="absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[#090c19] text-[8px] font-black shadow-[0_0_6px_#17baa4]">
                                                                {upcomingReminders.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Reminders Popup */}
                                                    {showRemindersPopup && (
                                                        <div className="absolute bottom-12 right-0 w-72 bg-[#1a1f35] border border-white/10 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                                                                    <Bell size={10} /> {upcomingReminders.length > 0 ? 'Lembretes Agendados' : 'Notificações'}
                                                                </span>
                                                                <button onClick={(e) => { e.stopPropagation(); setShowRemindersPopup(false); }} className="text-gray-500 hover:text-white transition-colors">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                                                {upcomingReminders.length > 0 ? (
                                                                    upcomingReminders.map(rem => (
                                                                        <div key={rem.id} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-primary/30 transition-all cursor-pointer group">
                                                                            <div className="flex items-start gap-2">
                                                                                <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{rem.emoji}</span>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs text-white font-bold truncate mb-0.5">{rem.content}</p>
                                                                                    <p className="text-[10px] text-primary/70 font-medium">
                                                                                        {new Date(rem.reminderDate!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="py-8 text-center space-y-2">
                                                                        <BellOff size={24} className="mx-auto text-gray-600 opacity-30" />
                                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nenhum lembrete agendado</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {showDatePicker && (
                                                    <div
                                                        className="absolute bottom-12 left-0 w-80 bg-[#1a1f35] border border-white/10 rounded-3xl shadow-2xl z-[150] p-5 animate-in slide-in-from-bottom-2 duration-300 backdrop-blur-xl"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                                            <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Configurar Alerta</span>
                                                            <button onClick={() => setShowDatePicker(false)} className="text-gray-500 hover:text-white p-1">
                                                                <X size={16} />
                                                            </button>
                                                        </div>

                                                        {/* Quick Presets */}
                                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                                            {[
                                                                { label: '+1 Hora', value: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
                                                                { label: '+3 Horas', value: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d; } },
                                                                { label: 'Amanhã', value: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
                                                                { label: 'Próx. Seg', value: () => { const d = new Date(); d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7)); d.setHours(9, 0, 0, 0); return d; } }
                                                            ].map((preset) => (
                                                                <button
                                                                    key={preset.label}
                                                                    onClick={() => {
                                                                        const date = preset.value();
                                                                        setTempDate(date.toISOString().split('T')[0]);
                                                                        setTempTime(date.toTimeString().split(' ')[0].substring(0, 5));
                                                                    }}
                                                                    className="px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all uppercase tracking-tighter"
                                                                >
                                                                    {preset.label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] text-gray-500 font-bold flex items-center gap-2">
                                                                    <Calendar size={12} className="text-primary" /> DATA
                                                                </label>
                                                                <div
                                                                    className="relative cursor-pointer group/date"
                                                                    onClick={(e) => {
                                                                        const input = e.currentTarget.querySelector('input');
                                                                        if (input && 'showPicker' in input) {
                                                                            try { (input as any).showPicker(); } catch (err) { }
                                                                        }
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="date"
                                                                        className="w-full bg-[#090c19] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary transition-all color-scheme-dark cursor-pointer group-hover/date:border-white/20"
                                                                        value={tempDate}
                                                                        onChange={(e) => setTempDate(e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-[10px] text-gray-500 font-bold flex items-center gap-2">
                                                                    <Clock size={12} className="text-primary" /> HORA
                                                                </label>
                                                                <div
                                                                    className="relative cursor-pointer group/time"
                                                                    onClick={(e) => {
                                                                        const input = e.currentTarget.querySelector('input');
                                                                        if (input && 'showPicker' in input) {
                                                                            try { (input as any).showPicker(); } catch (err) { }
                                                                        }
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="time"
                                                                        className="w-full bg-[#090c19] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary transition-all color-scheme-dark cursor-pointer group-hover/time:border-white/20"
                                                                        value={tempTime}
                                                                        onChange={(e) => setTempTime(e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-2 pt-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setReminderDate('');
                                                                        setShowDatePicker(false);
                                                                    }}
                                                                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-bold py-3 rounded-xl transition-all"
                                                                >
                                                                    LIMPAR
                                                                </button>
                                                                <button
                                                                    onClick={handleConfirmReminder}
                                                                    className="flex-1 bg-primary text-[#090c19] text-[10px] font-black py-3 rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                                                                >
                                                                    CONFIRMAR
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-end h-full pt-2 xl:pt-5">
                                            <Button
                                                onClick={handleAddNote}
                                                disabled={!content.trim()}
                                                className="w-full xl:w-auto bg-gradient-to-r from-primary to-[#10b981] text-[#05070e] font-black h-11 xl:h-10 px-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center whitespace-nowrap"
                                            >
                                                <Plus size={18} strokeWidth={3} className="mr-2" /> Salvar Anotação
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </Card>

            {/* Upcoming Reminders Section */}
            {
                upcomingReminders.length > 0 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500 relative z-30">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em]">
                                <Bell size={14} className="animate-bounce" /> Próximos Alertar
                            </div>
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{upcomingReminders.length} Pendentes</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {upcomingReminders.slice(0, 3).map(rem => (
                                <div key={rem.id} className="bg-[#1a1f35]/60 backdrop-blur-md border border-primary/20 rounded-2xl p-4 flex items-start gap-4 relative group overflow-hidden hover:bg-[#1a1f35]/80 transition-all hover:scale-[1.02] duration-300 shadow-lg shadow-black/20">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-primary/20 transition-all" />
                                    <div className="w-12 h-12 shrink-0 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        {rem.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] text-white font-bold truncate mb-1">{rem.content}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-[10px] text-primary/80 font-bold">
                                                <Clock size={10} />
                                                {new Date(rem.reminderDate!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-white/20" />
                                            <div className="text-[10px] text-gray-500 font-medium">
                                                {new Date(rem.reminderDate!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {upcomingReminders.length > 3 && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer backdrop-blur-sm">
                                    + {upcomingReminders.length - 3} outros alertas
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Search Bar & Notes List Area */}
            <div className="space-y-6">
                {/* Toolbar: Filters & View Toggles */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#1a1f35]/40 backdrop-blur-md border border-white/5 rounded-[24px] p-2 sm:p-3 shadow-xl">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar-horizontal">
                        {[
                            { id: 'all', label: 'Todas', icon: StickyNote },
                            { id: 'high', label: 'Urgente', icon: TriangleAlert, color: 'text-red-400' },
                            { id: 'medium', label: 'Importante', icon: Star, color: 'text-yellow-400' },
                            { id: 'low', label: 'Normal', icon: Check, color: 'text-blue-400' }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setFilterPriority(btn.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${filterPriority === btn.id
                                    ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(23,186,164,0.2)]'
                                    : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                <btn.icon size={12} className={btn.color || ''} />
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                        {/* Status Tabs */}
                        <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                            <button
                                onClick={() => setFilterStatus('pending')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filterStatus === 'pending'
                                    ? 'bg-primary text-[#090c19] shadow-lg'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                Pendentes
                            </button>
                            <button
                                onClick={() => setFilterStatus('completed')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filterStatus === 'completed'
                                    ? 'bg-primary text-[#090c19] shadow-lg'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                Concluídas
                            </button>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-primary shadow-inner' : 'text-gray-500 hover:text-white'}`}
                                title="Visualização em Grade"
                            >
                                <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                                    <div className="bg-current rounded-[1px]" />
                                    <div className="bg-current rounded-[1px]" />
                                    <div className="bg-current rounded-[1px]" />
                                    <div className="bg-current rounded-[1px]" />
                                </div>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-primary shadow-inner' : 'text-gray-500 hover:text-white'}`}
                                title="Visualização em Lista"
                            >
                                <div className="flex flex-col gap-0.5 w-4 h-4">
                                    <div className="w-full h-1 bg-current rounded-[1px]" />
                                    <div className="w-full h-1 bg-current rounded-[1px]" />
                                    <div className="w-full h-1 bg-current rounded-[1px]" />
                                </div>
                            </button>
                        </div>

                        {filterStatus === 'completed' && (
                            <button
                                onClick={handleClearCompleted}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all ml-auto md:ml-0"
                            >
                                <Trash2 size={12} />
                                <span className="hidden sm:inline">Limpar Tudo</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Notes List */}
                <div className={`pb-20 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-3'}`}>
                    {notes
                        .filter(note => {
                            const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
                            const matchesStatus = filterStatus === 'all' ||
                                (filterStatus === 'pending' ? !note.completed : note.completed);
                            return matchesSearch && matchesPriority && matchesStatus;
                        })
                        .map((note) => (
                            <Card key={note.id} className={`bg-[#121625]/80 backdrop-blur-sm border-white/5 transition-all duration-500 shadow-2xl relative overflow-hidden group ${viewMode === 'grid' ? 'p-4 md:p-6 hover:-translate-y-2 hover:translate-x-1 hover:scale-[1.01]' : 'p-3 flex items-center gap-4 hover:translate-x-1'
                                } ${note.completed ? 'opacity-60 grayscale-[0.3]' : ''} ${note.priority === 'high' ? 'hover:shadow-[0_20px_40px_rgba(239,68,68,0.1)] hover:border-red-500/30' :
                                    note.priority === 'medium' ? 'hover:shadow-[0_20px_40px_rgba(234,179,8,0.1)] hover:border-yellow-500/30' :
                                        'hover:shadow-[0_20px_40px_rgba(59,130,246,0.1)] hover:border-blue-500/30'
                                }`}>
                                {/* Priority Neon Active Border */}
                                <div className={`absolute top-0 left-0 w-1 h-full shimmer-effect ${note.priority === 'high' ? 'bg-gradient-to-b from-red-500 via-red-500/50 to-transparent shadow-[4px_0_15px_rgba(239,68,68,0.5)]' :
                                        note.priority === 'medium' ? 'bg-gradient-to-b from-yellow-500 via-yellow-500/50 to-transparent shadow-[4px_0_15px_rgba(234,179,8,0.5)]' :
                                            'bg-gradient-to-b from-blue-500 via-blue-500/50 to-transparent shadow-[4px_0_15px_rgba(59,130,246,0.5)]'
                                    } ${!note.completed ? 'animate-pulse-neon' : 'opacity-30'}`} />

                                <div className={`flex items-start relative w-full ${viewMode === 'grid' ? 'gap-4 md:gap-8 pb-2' : 'gap-4'}`}>
                                    <div className={`relative shrink-0 flex items-center justify-center ${viewMode === 'grid' ? 'ml-5 pt-2' : 'ml-2'}`}>
                                        <div className={`${viewMode === 'grid' ? 'text-3xl w-14 h-14 md:w-16 md:h-16 rounded-[22px]' : 'text-xl w-10 h-10 rounded-xl'} bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10 group-hover:scale-110 transition-all duration-500 shadow-2xl group-hover:border-primary/40 backdrop-blur-sm`}>
                                            {note.emoji}
                                        </div>
                                        {note.reminderEnabled && note.reminderDate && !note.completed && (
                                            <div className="absolute top-0 -right-1 w-6 h-6 rounded-lg bg-primary text-[#090c19] flex items-center justify-center shadow-[0_0_10px_#17baa4] animate-pulse ring-2 ring-[#121625]">
                                                <Bell size={12} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${getPriorityColor(note.priority)}`}>
                                                    {note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Normal'}
                                                </span>
                                                {note.reminderDate && (
                                                    <span className={`text-[10px] font-bold flex items-center gap-1 ${note.reminderEnabled && !note.completed ? 'text-primary' : 'text-gray-600'}`}>
                                                        <Calendar size={10} /> {new Date(note.reminderDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-300">
                                                <button
                                                    onClick={() => handleToggleComplete(note)}
                                                    className={`p-1.5 rounded-xl transition-all hover:scale-110 ${note.completed ? 'text-green-400 bg-green-500/10' : 'text-gray-500 bg-white/5 hover:text-green-400'}`}
                                                    title={note.completed ? "Desmarcar como concluída" : "Marcar como concluída"}
                                                >
                                                    <Check size={14} strokeWidth={3} />
                                                </button>

                                                {note.reminderDate && !note.completed && (
                                                    <button
                                                        onClick={() => handleToggleReminder(note)}
                                                        className={`p-1.5 rounded-xl transition-all hover:scale-110 ${note.reminderEnabled ? 'text-primary bg-primary/10' : 'text-gray-500 bg-white/5'}`}
                                                    >
                                                        {note.reminderEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="p-1.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all hover:scale-110"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <p className={`text-gray-200 leading-relaxed break-words transition-all duration-300 ${note.completed ? 'line-through text-gray-500 italic' : ''
                                            } ${viewMode === 'grid' ? 'text-sm md:text-base line-clamp-4 group-hover:line-clamp-none' : 'text-xs md:text-sm line-clamp-1'}`}>
                                            {note.content}
                                        </p>

                                        {viewMode === 'grid' && (
                                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={10} /> {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                                                </span>
                                                {note.reminderDate && note.reminderEnabled && !note.completed && (
                                                    <span className="text-primary/60 flex items-center gap-1">
                                                        Alerta {new Date(note.reminderDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
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
