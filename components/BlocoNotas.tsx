import React, { useState, useEffect } from 'react';
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
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

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
        const interval = setInterval(() => {
            const now = new Date();
            notes.forEach(note => {
                if (note.reminderEnabled && note.reminderDate) {
                    const rDate = new Date(note.reminderDate);
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
        }
    };

    const handleAddNote = async () => {
        if (!currentUser) return;
        if (!content.trim()) return;
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

    const toggleNoteSelection = (id: string) => {
        setSelectedNoteIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
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
            {/* Header - Classic Design */}
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

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleRequestPermission}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all border shadow-lg justify-center h-10 ${permissionStatus === 'granted'
                                ? 'bg-[#eab308]/10 border-[#eab308]/20 text-[#eab308]'
                                : 'bg-[#eab308] border-[#eab308] text-[#090c19] hover:brightness-110 active:scale-95'
                            }`}
                    >
                        <Bell size={15} className={permissionStatus === 'granted' ? '' : 'animate-pulse'} />
                        <span>{permissionStatus === 'granted' ? 'Notificações Ativas' : 'Ativar Notificações'}</span>
                    </button>

                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            if (isSelectionMode) setSelectedNoteIds([]);
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all border h-10 ${isSelectionMode
                                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        <Check size={16} className={isSelectionMode ? 'text-blue-400' : 'opacity-40'} />
                        <span>Selecionar</span>
                    </button>
                </div>
            </div>

            {/* Nova Anotação Card - Precision Layout from Screenshot */}
            <Card className="bg-[#121625]/80 backdrop-blur-xl border-white/5 relative overflow-hidden rounded-[32px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                        <PenLine size={14} className="text-[#17baa4]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Nova Anotação</span>
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

                        {/* Emoji Picker Row */}
                        <div className="flex flex-wrap gap-2">
                            {emojis.slice(0, 15).map(e => (
                                <button
                                    key={e}
                                    onClick={() => setSelectedEmoji(e)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${selectedEmoji === e ? 'bg-[#17baa4]/20 border-[#17baa4]/40 scale-110 shadow-lg' : 'bg-white/5 border-white/5'}`}
                                >
                                    <span className={`text-xl ${selectedEmoji === e ? '' : 'grayscale-[0.5]'}`}>{e}</span>
                                </button>
                            ))}
                        </div>

                        {/* Bottom Row - Precise Screenshot Layout */}
                        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
                            <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
                                {/* Date/Time Block */}
                                <div className="space-y-1.5 min-w-[140px]">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Calendar size={12} className="text-[#17baa4]" /> DD/MM/AAAA
                                    </span>
                                    <div className="flex items-center bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-xs text-white">
                                        <input type="date" className="bg-transparent border-none outline-none w-full color-scheme-dark" value={tempDate} onChange={e => setTempDate(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1.5 min-w-[100px]">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Clock size={12} className="text-blue-400" /> --:--
                                    </span>
                                    <div className="flex items-center bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-xs text-white">
                                        <input type="time" className="bg-transparent border-none outline-none w-full color-scheme-dark" value={tempTime} onChange={e => setTempTime(e.target.value)} />
                                    </div>
                                </div>

                                {/* Priority Block */}
                                <div className="space-y-1.5 flex-1 min-w-[280px]">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Zap size={12} className="text-[#17baa4]" /> PRIORIDADE:
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setPriority('high')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${priority === 'high' ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-white/5 border-white/5 text-gray-500'}`}><Flame size={12} /> Urgente</button>
                                        <button onClick={() => setPriority('medium')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${priority === 'medium' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-500' : 'bg-white/5 border-white/5 text-gray-500'}`}><Zap size={12} /> Importante</button>
                                        <button onClick={() => setPriority('low')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${priority === 'low' ? 'bg-blue-500/20 border-blue-500/60 text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-500'}`}><FileText size={12} /> Normal</button>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleAddNote} className="bg-[#17baa4] hover:bg-[#129482] text-[#090c19] px-10 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 w-full lg:w-auto justify-center active:scale-95">
                                <Plus size={18} strokeWidth={3} /> Salvar Anotação
                            </button>
                        </div>

                        {/* Legends */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest opacity-60 pl-1 pt-2">
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

            {/* List Header */}
            <div className="flex items-center justify-between pt-4">
                <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Suas Notas</h3>
                <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
                    <button onClick={() => setFilterStatus('pending')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'pending' ? 'bg-white/5 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}>Pendentes</button>
                    <button onClick={() => setFilterStatus('completed')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'completed' ? 'bg-white/5 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}>Concluídas</button>
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
                        <Card key={note.id} className={`bg-[#121625]/60 border-white/5 transition-all duration-300 relative group overflow-hidden ${selectedNoteIds.includes(note.id) ? 'border-blue-500/40 bg-blue-500/5' : ''} ${viewMode === 'grid' ? 'p-6' : 'p-4 flex items-center gap-4'}`}>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border border-white/5 ${getPriorityColor(note.priority)}`}>
                                        {note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Normal'}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => handleToggleComplete(note)} className="p-1 text-gray-500 hover:text-white"><Check size={14} /></button>
                                        <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-500 hover:text-red-500"><Trash size={14} /></button>
                                    </div>
                                </div>
                                <p className={`text-white text-sm ${note.completed ? 'opacity-30 italic line-through' : ''}`}>
                                    {note.content} {note.emoji}
                                </p>
                                <div className="mt-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                    {new Date(note.createdAt).toLocaleDateString('pt-BR')} {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </Card>
                    ))
                }
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
        </div>
    );
};

export default BlocoNotas;
