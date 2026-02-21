import React, { useState, useEffect } from 'react';
import {
    StickyNote, Trash2, Plus, Bell, BellOff, ChevronUp, ChevronDown,
    TriangleAlert, Star, Check, Calendar, Clock, X
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
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );

    const emojis = ['🎰', '💰', '🔥', '⚠️', '✅', '❌', '⭐', '🎯', '💎', '🚀', '📌', '💡'];

    const handleRequestPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                        <StickyNote size={32} className="text-primary" />
                        Bloco de Notas
                        <div className="relative">
                            <button
                                onClick={() => setShowRemindersPopup(!showRemindersPopup)}
                                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all relative ${upcomingReminders.length > 0 ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(23,186,164,0.2)]' : 'bg-white/5 text-gray-400'}`}
                            >
                                <Bell size={20} className={upcomingReminders.length > 0 ? 'animate-bounce' : ''} />
                                {upcomingReminders.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[#090c19] text-[10px] font-black shadow-[0_0_8px_#17baa4]">
                                        {upcomingReminders.length}
                                    </span>
                                )}
                            </button>

                            {showRemindersPopup && (
                                <div className="absolute top-12 left-0 w-72 bg-[#1a1f35] border border-white/10 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                                            <Bell size={10} /> {upcomingReminders.length > 0 ? 'Lembretes Agendados' : 'Notificações'}
                                        </span>
                                        <button onClick={() => setShowRemindersPopup(false)} className="text-gray-500 hover:text-white transition-colors">
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
                    </h1>
                    <p className="text-gray-400">Anote procedimentos, lembretes e tarefas rápidas</p>
                </div>

                {(permissionStatus === 'default' || permissionStatus === 'denied') && (
                    <button
                        onClick={handleRequestPermission}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${permissionStatus === 'denied' ? 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 animate-bounce'}`}
                        title={permissionStatus === 'denied' ? 'As notificações foram bloqueadas no seu navegador. Clique para tentar ativar ou ver instruções.' : 'Ativar notificações para receber alertas'}
                    >
                        {permissionStatus === 'denied' ? <BellOff size={14} /> : <Bell size={14} />}
                        {permissionStatus === 'denied' ? 'Notificações Bloqueadas' : 'Ativar Notificações'}
                    </button>
                )}
            </div>

            {/* Input Card */}
            <Card className="bg-gradient-to-br from-[#1a1f35] to-[#0d1425] border-gray-800/50">
                <div className="flex flex-col space-y-1.5 p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold tracking-tight text-white flex items-center gap-2 text-lg">
                            <StickyNote size={20} className="text-yellow-400" />
                            📝 Bloco de Notas
                        </div>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="p-6 pt-0 space-y-4">
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

                            <div className="flex flex-wrap gap-2">
                                {emojis.map(e => (
                                    <button
                                        key={e}
                                        onClick={() => setSelectedEmoji(e)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all ${selectedEmoji === e ? 'bg-primary/20 border-primary ring-1 ring-primary' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setPriority('high')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'text-gray-500 border-white/5 hover:bg-white/5'}`}
                                    >
                                        <TriangleAlert size={14} /> Urgente
                                    </button>
                                    <button
                                        onClick={() => setPriority('medium')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'text-gray-500 border-white/5 hover:bg-white/5'}`}
                                    >
                                        <Star size={14} /> Importante
                                    </button>
                                    <button
                                        onClick={() => setPriority('low')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${priority === 'low' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'text-gray-500 border-white/5 hover:bg-white/5'}`}
                                    >
                                        <StickyNote size={14} /> Normal
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="flex flex-col gap-1 flex-1 md:flex-none relative">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">Agendar Lembrete</span>
                                        <div
                                            className="relative h-10 cursor-pointer group/picker"
                                            onClick={() => setShowDatePicker(!showDatePicker)}
                                        >
                                            <div className="w-full h-full bg-[#090c19] border border-white/10 rounded-xl px-4 flex items-center justify-between text-xs text-white group-hover/picker:border-primary/50 transition-all shadow-lg overflow-hidden min-w-[180px]">
                                                <span className={reminderDate ? 'text-white font-bold' : 'text-gray-500'}>
                                                    {reminderDate
                                                        ? new Date(reminderDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                        : 'Selecionar Data e Hora'
                                                    }
                                                </span>
                                                <Calendar size={14} className="text-gray-500 group-hover/picker:text-primary transition-colors" />
                                            </div>

                                            {showDatePicker && (
                                                <div
                                                    className="absolute bottom-12 left-0 w-72 bg-[#1a1f35] border border-white/10 rounded-2xl shadow-2xl z-[150] p-5 animate-in slide-in-from-bottom-2 duration-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Configurar Alerta</span>
                                                        <button onClick={() => setShowDatePicker(false)} className="text-gray-500 hover:text-white">
                                                            <X size={14} />
                                                        </button>
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
                                                                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-bold py-2.5 rounded-xl transition-all"
                                                            >
                                                                LIMPAR
                                                            </button>
                                                            <button
                                                                onClick={handleConfirmReminder}
                                                                className="flex-1 bg-primary text-[#090c19] text-[10px] font-black py-2.5 rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                                                            >
                                                                DEFINIR
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-end h-full pt-5">
                                        <Button
                                            onClick={handleAddNote}
                                            disabled={!content.trim()}
                                            className="bg-gradient-to-r from-primary to-[#10b981] text-[#05070e] font-black h-10 px-6 rounded-xl shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-wider"
                                        >
                                            <Plus size={18} className="mr-1.5" /> Salvar Anotação
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Upcoming Reminders Section */}
            {upcomingReminders.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest px-1">
                        <Bell size={14} className="animate-bounce" /> Próximos Lembretes
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {upcomingReminders.slice(0, 3).map(rem => (
                            <div key={rem.id} className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-3 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-primary/20 transition-all" />
                                <span className="text-xl shrink-0">{rem.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-white font-bold truncate">{rem.content}</p>
                                    <p className="text-[10px] text-primary/70 font-medium">
                                        {new Date(rem.reminderDate!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {upcomingReminders.length > 3 && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                + {upcomingReminders.length - 3} outros agendados
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Notes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {notes.map((note) => (
                    <Card key={note.id} className="bg-[#121625]/80 backdrop-blur-sm border-white/5 p-4 md:p-6 group relative overflow-hidden transition-all hover:bg-[#121625] hover:border-primary/20 hover:translate-y-[-2px] duration-300">
                        {/* Priority Neon Active Border */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${note.priority === 'high' ? 'bg-gradient-to-b from-red-500 to-red-900 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                note.priority === 'medium' ? 'bg-gradient-to-b from-yellow-500 to-yellow-900 shadow-[0_0_10px_rgba(234,179,8,0.5)]' :
                                    'bg-gradient-to-b from-blue-500 to-blue-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                            }`} />

                        <div className="flex gap-4 md:gap-6 items-start">
                            <div className="relative shrink-0">
                                <div className="text-3xl bg-white/5 w-14 h-14 md:w-16 md:h-16 rounded-[22px] flex items-center justify-center border border-white/5 group-hover:scale-105 transition-transform duration-500 shadow-inner">
                                    {note.emoji}
                                </div>
                                {note.reminderEnabled && note.reminderDate && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-primary text-[#090c19] flex items-center justify-center shadow-lg animate-pulse ring-2 ring-[#121625]">
                                        <Bell size={12} strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${getPriorityColor(note.priority)}`}>
                                            {note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Normal'}
                                        </span>
                                        {note.reminderDate && (
                                            <span className={`text-[10px] font-bold flex items-center gap-1 ${note.reminderEnabled ? 'text-primary' : 'text-gray-600'}`}>
                                                <Calendar size={10} /> {new Date(note.reminderDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                                        {note.reminderDate && (
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

                                <p className="text-gray-200 text-sm md:text-base leading-relaxed break-words line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                                    {note.content}
                                </p>

                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={10} /> {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                    {note.reminderDate && note.reminderEnabled && (
                                        <span className="text-primary/60 flex items-center gap-1">
                                            Alerta {new Date(note.reminderDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {notes.length === 0 && (
                    <div className="col-span-full py-24 text-center space-y-4">
                        <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
                            <StickyNote size={48} className="text-gray-700 opacity-20" />
                        </div>
                        <h3 className="text-white text-lg font-bold">Nenhuma anotação ainda</h3>
                        <p className="text-gray-500 text-sm max-w-[240px] mx-auto">Sua lista está vazia. Comece anotando seus procedimentos e lembretes acima.</p>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black pt-4">Dica: Use Ctrl+Enter para salvar rápido</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlocoNotas;
