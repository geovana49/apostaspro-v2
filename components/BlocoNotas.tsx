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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
        } else {
            alert(`🔔 LEMBRETE: ${note.emoji} ${note.content}`);
        }
    };

    const handleAddNote = async () => {
        if (!currentUser) return;
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
            case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Restoration */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2.5 bg-[#17baa4]/10 rounded-2xl shrink-0 border border-[#17baa4]/10 shadow-lg shadow-[#17baa4]/5">
                        <Folder size={28} className="text-[#17baa4] sm:size-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                            Bloco de Notas
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium">Anote procedimentos e tarefas rápidas</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleRequestPermission}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all border shadow-lg whitespace-nowrap w-full sm:w-auto justify-center h-11 ${permissionStatus === 'granted'
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border h-11 ${isSelectionMode
                                ? 'bg-[#17baa4]/20 border-[#17baa4]/40 text-[#17baa4]'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        <Check size={14} className={isSelectionMode ? '' : 'opacity-40'} />
                        {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar'}
                    </button>
                </div>
            </div>

            {/* Original Style Input Card */}
            <Card className="bg-[#121625]/80 backdrop-blur-xl border-white/5 relative overflow-hidden transition-all duration-300 rounded-[32px] p-0">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                        <PenLine size={14} className="text-[#17baa4]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Nova Anotação</span>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-2 rounded-xl transition-all ${isCollapsed ? 'text-[#17baa4] bg-[#17baa4]/10' : 'text-gray-500 hover:text-white'}`}
                    >
                        {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                </div>

                {!isCollapsed && (
                    <div className="p-8 space-y-6">
                        <textarea
                            className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-5 text-white text-sm focus:ring-1 focus:ring-[#17baa4]/50 focus:border-[#17baa4]/30 outline-none transition-all min-h-[140px] resize-none placeholder:text-gray-600"
                            placeholder="Anotar procedimento... (ex: 🎰 Bet365 - Missão 50 giros)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        {/* Emoji Grid Styled */}
                        <div className="flex flex-wrap gap-2.5">
                            {emojis.slice(0, 16).map(e => (
                                <button
                                    key={e}
                                    onClick={() => setSelectedEmoji(e)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${selectedEmoji === e ? 'bg-[#17baa4]/20 border-[#17baa4]/40 scale-110 shadow-lg shadow-[#17baa4]/10' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <span className={`text-xl ${selectedEmoji === e ? 'grayscale-0' : 'grayscale-[0.5]'}`}>{e}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex flex-wrap gap-2 flex-1">
                                <button
                                    onClick={() => setPriority('high')}
                                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${priority === 'high' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                >
                                    <TriangleAlert size={14} /> Urgente
                                </button>
                                <button
                                    onClick={() => setPriority('medium')}
                                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${priority === 'medium' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                >
                                    <Star size={14} /> Importante
                                </button>
                                <button
                                    onClick={() => setPriority('low')}
                                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${priority === 'low' ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-xl' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                >
                                    <Check size={14} strokeWidth={3} /> Normal
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch gap-3 lg:w-[40%]">
                                <div className="flex-1 flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Agendar Lembrete</span>
                                    <button
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs text-white hover:bg-white/10 transition-all font-medium"
                                    >
                                        <span className="opacity-50">Selecionar Data e Hora</span>
                                        <Bell size={14} className="text-gray-500" />
                                    </button>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleAddNote}
                                        className="w-full sm:w-auto bg-[#17baa4] hover:bg-[#129482] text-[#090c19] px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#17baa4]/20 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Plus size={18} strokeWidth={3} />
                                        Salvar Anotação
                                    </button>
                                </div>
                            </div>
                        </div>

                        {showDatePicker && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} /> Data</span>
                                    <input type="date" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none color-scheme-dark" value={tempDate} onChange={e => setTempDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12} /> Hora</span>
                                    <input type="time" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none color-scheme-dark" value={tempTime} onChange={e => setTempTime(e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Search at bottom of card */}
                <div className="p-6 border-t border-white/5 relative bg-white/[0.02]">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search size={16} className="text-gray-500 group-focus-within:text-[#17baa4] transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Pesquisar anotações..."
                            className="w-full bg-black/20 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:outline-none focus:border-[#17baa4]/50 focus:bg-black/40 transition-all font-medium placeholder:text-gray-600"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Separator and Global Toggle */}
            <div className="relative pt-8 pb-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="px-6 bg-[#090c19] text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] flex items-center gap-3">
                        <ListIcon size={12} /> Listagem de Notas
                    </span>
                </div>
            </div>

            {/* Selection/Bulk Actions Toolbar (only if selection mode is on) */}
            {isSelectionMode && (
                <div className="bg-[#1a1f35]/90 backdrop-blur-2xl border border-[#17baa4]/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-20 z-50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-[#17baa4]/10 rounded-xl border border-[#17baa4]/20">
                            <Check size={16} className="text-[#17baa4]" strokeWidth={3} />
                            <span className="text-xs font-black text-white uppercase tracking-wider">{selectedNoteIds.length} notas selecionadas</span>
                        </div>
                        <button
                            onClick={() => handleSelectAll(notes)}
                            className="text-xs font-black text-[#17baa4] hover:text-white transition-all uppercase tracking-widest"
                        >
                            {selectedNoteIds.length === notes.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBulkComplete}
                            disabled={selectedNoteIds.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#17baa4]/10 border border-[#17baa4]/20 text-[#17baa4] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#17baa4] hover:text-[#090c19] transition-all disabled:opacity-30 active:scale-95"
                        >
                            <Check size={14} strokeWidth={3} /> Concluir
                        </button>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <div className="flex gap-1.5 p-1.5 bg-white/5 rounded-xl">
                            <button onClick={() => handleBulkPriorityChange('high')} disabled={selectedNoteIds.length === 0} className="p-2 text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-30"><TriangleAlert size={16} /></button>
                            <button onClick={() => handleBulkPriorityChange('medium')} disabled={selectedNoteIds.length === 0} className="p-2 text-yellow-400 hover:text-white hover:bg-yellow-500/20 rounded-lg transition-all disabled:opacity-30"><Star size={16} /></button>
                            <button onClick={() => handleBulkPriorityChange('low')} disabled={selectedNoteIds.length === 0} className="p-2 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all disabled:opacity-30"><Check size={16} /></button>
                        </div>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <button
                            onClick={handleBulkDelete}
                            disabled={selectedNoteIds.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                        >
                            <Trash size={14} /> Excluir
                        </button>
                    </div>
                </div>
            )}

            {/* Filter Pills - Blended with original style */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/[0.02] p-4 rounded-3xl border border-white/5 shadow-xl">
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar-horizontal">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2 flex items-center gap-2 shrink-0">
                        <LayoutGrid size={14} /> Filtrar Por:
                    </span>
                    {[
                        { id: 'all', label: 'Todas', icon: StickyNote },
                        { id: 'high', label: 'Urgente', icon: TriangleAlert, color: 'text-red-400' },
                        { id: 'medium', label: 'Importante', icon: Star, color: 'text-yellow-400' },
                        { id: 'low', label: 'Normal', icon: Check, color: 'text-blue-400' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilterPriority(f.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${filterPriority === f.id
                                ? 'bg-white/10 border-white/20 text-white shadow-xl'
                                : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                        >
                            <f.icon size={12} className={f.color || ''} />
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                        <button onClick={() => setFilterStatus('pending')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'pending' ? 'bg-[#17baa4] text-[#090c19] shadow-lg' : 'text-gray-500 hover:text-white'}`}>Pendentes</button>
                        <button onClick={() => setFilterStatus('completed')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'completed' ? 'bg-[#17baa4] text-[#090c19] shadow-lg' : 'text-gray-500 hover:text-white'}`}>Concluídas</button>
                    </div>
                    <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}><LayoutGrid size={16} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-[#17baa4]' : 'text-gray-600 hover:text-white'}`}><ListIcon size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Note List Rendering */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-3"}>
                {notes
                    .filter(note => {
                        const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
                        const matchesStatus = filterStatus === 'pending' ? !note.completed : note.completed;
                        return matchesSearch && matchesPriority && matchesStatus;
                    })
                    .map(note => (
                        <Card key={note.id} className={`bg-[#121625]/80 backdrop-blur-sm border-white/5 transition-all duration-300 relative group overflow-hidden ${selectedNoteIds.includes(note.id) ? 'border-[#17baa4]/40 bg-[#17baa4]/5 ring-1 ring-[#17baa4]/20' : ''} ${viewMode === 'grid' ? 'p-6 flex flex-col h-full' : 'p-3 flex items-center gap-4'}`}>
                            {/* Selection Overlays */}
                            {isSelectionMode && (
                                <div
                                    className={`absolute top-4 left-4 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer z-20 ${selectedNoteIds.includes(note.id) ? 'bg-[#17baa4] border-[#17baa4]' : 'border-white/20 hover:border-[#17baa4]'}`}
                                    onClick={() => toggleNoteSelection(note.id)}
                                >
                                    {selectedNoteIds.includes(note.id) && <Check size={14} className="text-[#090c19]" strokeWidth={4} />}
                                </div>
                            )}

                            <div className={`flex flex-col h-full w-full ${isSelectionMode ? 'pl-8' : ''}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${getPriorityColor(note.priority)}`}>
                                            {note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Normal'}
                                        </span>
                                        {note.completed && <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 text-gray-500 px-2 py-1 rounded-lg">Finalizada</span>}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                        {!note.completed && (
                                            <button onClick={() => handleToggleComplete(note)} className="p-1.5 bg-white/5 hover:bg-[#17baa4]/20 hover:text-[#17baa4] text-gray-500 rounded-xl transition-all"><Check size={14} /></button>
                                        )}
                                        <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <p className={`text-white leading-relaxed flex-1 ${note.completed ? 'opacity-30 line-through grayscale italic' : ''} ${viewMode === 'grid' ? 'text-sm md:text-base font-medium' : 'text-xs md:text-sm line-clamp-1'}`}>
                                    {note.emoji} {note.content}
                                </p>

                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                    <span className="flex items-center gap-1.5"><Clock size={10} /> {new Date(note.createdAt).toLocaleDateString()}</span>
                                    {note.reminderDate && note.reminderEnabled && !note.completed && (
                                        <div className="flex items-center gap-1.5 text-[#17baa4]">
                                            <Bell size={10} className="animate-pulse" /> ALERTA ATIVO
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                }
            </div>

            {/* Notification Blocked Guide Modal */}
            {showBlockedGuide && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
                    <Card className="max-w-md w-full bg-[#1a1f35] border-white/10 shadow-2xl">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-xl"><BellOff size={24} className="text-red-500" /></div>
                                    <h3 className="text-lg font-bold text-white">Notificações Bloqueadas</h3>
                                </div>
                                <button onClick={() => setShowBlockedGuide(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="text-sm text-gray-400 leading-relaxed space-y-4">
                                <p>Para receber lembretes, você precisa desbloquear manualmente no navegador:</p>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-[#17baa4]/20 text-[#17baa4] flex items-center justify-center shrink-0 font-bold text-[10px]">1</div>
                                        <p>Clique no ícone de <span className="text-white font-bold">🔒 Cadeado</span> na barra de endereços.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-[#17baa4]/20 text-[#17baa4] flex items-center justify-center shrink-0 font-bold text-[10px]">2</div>
                                        <p>Ative as <span className="text-white font-bold">Notificações</span>.</p>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => setShowBlockedGuide(false)} className="w-full bg-[#17baa4] hover:bg-[#129482] text-[#090c19] font-black h-12 rounded-xl">Entendi, vou ajustar</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default BlocoNotas;
