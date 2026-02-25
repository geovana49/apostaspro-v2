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
    const [reminderDate, setReminderDate] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
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
        '🎁', '🆕', '🎂'
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

    const handleBulkDelete = async () => {
        if (!currentUser || selectedNoteIds.length === 0) return;
        if (confirm(`Excluir ${selectedNoteIds.length} nota(s)?`)) {
            for (const id of selectedNoteIds) await FirestoreService.deleteNote(currentUser.uid, id);
            setSelectedNoteIds([]);
            setIsSelectionMode(false);
        }
    };

    const handleBulkComplete = async () => {
        if (!currentUser || selectedNoteIds.length === 0) return;
        for (const id of selectedNoteIds) {
            const note = notes.find(n => n.id === id);
            if (note) await FirestoreService.saveNote(currentUser.uid, { ...note, completed: true });
        }
        setSelectedNoteIds([]);
        setIsSelectionMode(false);
    };

    const toggleNoteSelection = (id: string) => {
        setSelectedNoteIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleSelectAll = (filteredNotes: NotepadNote[]) => {
        const allIds = filteredNotes.map(n => n.id);
        setSelectedNoteIds(selectedNoteIds.length === allIds.length && allIds.length > 0 ? [] : allIds);
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'bg-[#ff4444]/10 border-[#ff4444]/20 text-[#ff4444]';
            case 'medium': return 'bg-[#ffbb33]/10 border-[#ffbb33]/20 text-[#ffbb33]';
            default: return 'bg-[#33b5e5]/10 border-[#33b5e5]/20 text-[#33b5e5]';
        }
    };

    const pendingNotesCount = notes.filter(n => !n.completed).length;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header - Precise Matching Red Box 1 & 2 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2.5 bg-[#17baa4]/10 rounded-2xl shrink-0 border border-[#17baa4]/10 shadow-lg">
                        <Folder size={28} className="text-[#17baa4]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Bloco de Notas</h1>
                            {pendingNotesCount > 0 && (
                                <span className="px-3 py-1 rounded-lg bg-[#eab308] text-[#090c19] text-[10px] font-black uppercase tracking-wider">
                                    {pendingNotesCount} pendente
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium">Anote procedimentos e tarefas rápidas</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleRequestPermission}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all border shadow-lg justify-center h-11 ${permissionStatus === 'granted'
                            ? 'bg-[#eab308]/10 border-[#eab308]/20 text-[#eab308]'
                            : 'bg-[#eab308] border-[#eab308] text-[#090c19] hover:brightness-110 active:scale-95'
                            }`}
                    >
                        <Bell size={16} className={permissionStatus === 'granted' ? '' : 'animate-pulse'} />
                        <span>{permissionStatus === 'granted' ? 'Notificações Ativas' : 'Ativar Notificações'}</span>
                    </button>

                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            if (isSelectionMode) setSelectedNoteIds([]);
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all border h-11 ${isSelectionMode
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        <Check size={16} className={isSelectionMode ? 'text-blue-400' : 'opacity-40'} />
                        <span>Selecionar</span>
                    </button>
                </div>
            </div>

            {/* Nova Anotação Card - Precision Layout */}
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

                        <div className="flex flex-wrap gap-2">
                            {emojis.slice(0, 16).map(e => (
                                <button
                                    key={e}
                                    onClick={() => setSelectedEmoji(e)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${selectedEmoji === e ? 'bg-[#17baa4]/20 border-[#17baa4]/40 scale-110 shadow-lg' : 'bg-white/5 border-white/5'}`}
                                >
                                    <span className={`text-xl ${selectedEmoji === e ? '' : 'grayscale-[0.5]'}`}>{e}</span>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 space-y-1.5">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Calendar size={12} className="text-[#17baa4]" /> DD/MM/AAAA
                                    </span>
                                    <input type="date" className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none color-scheme-dark" value={tempDate} onChange={e => setTempDate(e.target.value)} />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Clock size={12} className="text-blue-400" /> --:--
                                    </span>
                                    <input type="time" className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none color-scheme-dark" value={tempTime} onChange={e => setTempTime(e.target.value)} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 lg:col-span-2">
                                <div className="flex items-center gap-1.5 mb-1 ml-1">
                                    <Zap size={12} className="text-[#17baa4]" />
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prioridade:</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-2 flex-grow">
                                        <button onClick={() => setPriority('high')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${priority === 'high' ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-white/5 border-white/5 text-gray-500'}`}><Flame size={12} /> Urgente</button>
                                        <button onClick={() => setPriority('medium')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${priority === 'medium' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-500' : 'bg-white/5 border-white/5 text-gray-500'}`}><Zap size={12} /> Importante</button>
                                        <button onClick={() => setPriority('low')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${priority === 'low' ? 'bg-blue-500/20 border-blue-500/60 text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-500'}`}><FileText size={12} /> Normal</button>
                                    </div>
                                    <button onClick={handleAddNote} className="bg-[#17baa4] hover:bg-[#129482] text-[#090c19] px-7 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 active:scale-95">
                                        <Plus size={18} strokeWidth={3} /> Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest opacity-60 pl-1">
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Urgente = Queima de FreeBet</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Importante = Possível Duplo</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Normal = Sem duplo / Vale Giros</div>
                        </div>
                    </div>
                )}

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

            {/* SUAS NOTAS Separator - Precise Red Box 3 */}
            <div className="flex items-center gap-6 pt-10 pb-6 overflow-hidden">
                <div className="h-[1px] flex-grow bg-white/5" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] whitespace-nowrap">Suas Notas</span>
                <div className="h-[1px] flex-grow bg-white/5" />
            </div>

            {/* Filter Toolbar - Precise Red Box 3 */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar-horizontal">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-2 shrink-0">Filtrar:</span>
                    {[
                        { id: 'all', label: 'Todas', color: 'bg-[#33b5e5]' },
                        { id: 'high', label: 'Urgente', color: 'bg-[#ff4444]' },
                        { id: 'medium', label: 'Importante', color: 'bg-[#ffbb33]' },
                        { id: 'low', label: 'Normal', color: 'bg-[#33b5e5]' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilterPriority(f.id as any)}
                            className={`flex items-center gap-2.5 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${filterPriority === f.id ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${f.color} ${filterPriority === f.id ? 'shadow-[0_0_8px_rgba(51,181,229,0.5)] scale-125' : ''}`} />
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all h-10">
                        <ArrowDownWideNarrow size={14} className="opacity-40" />
                        <span>Data de entrega</span>
                    </button>
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 h-10">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}><ListIcon size={16} /></button>
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}><LayoutGrid size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Selection Toolbar */}
            {isSelectionMode && (
                <div className="bg-[#1a1f35]/90 backdrop-blur-2xl border border-[#17baa4]/40 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Check size={14} className="text-blue-400" strokeWidth={3} />
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">{selectedNoteIds.length} selecionadas</span>
                        </div>
                        <button onClick={() => handleSelectAll(notes)} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline">Selecionar todas</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleBulkComplete} className="bg-[#17baa4] text-[#090c19] px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95" disabled={selectedNoteIds.length === 0}>Concluir</button>
                        <button onClick={handleBulkDelete} className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white active:scale-95" disabled={selectedNoteIds.length === 0}>Excluir</button>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {/* PENDENTES Section Header */}
                <div className="px-1 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Pendentes</h3>
                    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5 h-9">
                        <button onClick={() => setFilterStatus('pending')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'pending' ? 'bg-white/5 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}>Pendentes</button>
                        <div className="w-[1px] h-3 bg-white/5" />
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
                            <Card key={note.id} className={`bg-[#121625]/60 border-white/5 transition-all duration-300 relative group overflow-hidden hover:border-white/10 ${selectedNoteIds.includes(note.id) ? 'border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20' : ''} ${viewMode === 'grid' ? 'p-6' : 'p-3 flex items-center gap-4'}`}>
                                {/* Checkbox on far left - Red Box 3 */}
                                <div
                                    className={`shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer z-20 ${selectedNoteIds.includes(note.id) ? 'bg-blue-500 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-white/20 hover:border-blue-500/50'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleNoteSelection(note.id);
                                    }}
                                >
                                    {selectedNoteIds.includes(note.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                                </div>

                                <div className="flex flex-col h-full w-full">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {/* Priority Badge - Internal Top Left - Red Box 3 */}
                                            <span className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-white/5 ${getPriorityColor(note.priority)}`}>
                                                {note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Normal'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                                            <button onClick={() => handleToggleComplete(note)} className="p-1.5 text-gray-600 hover:text-white bg-white/5 rounded-lg"><Check size={14} /></button>
                                            <button className="p-1.5 text-gray-600 hover:text-white bg-white/5 rounded-lg"><Pencil size={14} /></button>
                                            <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-gray-600 hover:text-red-500 bg-white/5 rounded-lg"><Trash size={14} /></button>
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className={`text-white text-[13px] md:text-sm leading-relaxed mb-4 ${note.completed ? 'opacity-30 italic line-through' : 'font-medium'}`}>
                                        {note.content} {note.emoji}
                                    </div>

                                    {/* Date Footer - Red Box 3 style */}
                                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2 mt-auto">
                                        <span>{new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                        <span className="opacity-40">,</span>
                                        <span>{new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
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
        </div>
    );
};

export default BlocoNotas;
