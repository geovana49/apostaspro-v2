import React, { useState, useEffect } from 'react';
import {
    StickyNote, Trash2, Plus, Bell, BellOff, ChevronUp, ChevronDown,
    TriangleAlert, Star, Check
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

    const emojis = ['🎰', '💰', '🔥', '⚠️', '✅', '❌', '⭐', '🎯', '💎', '🚀', '📌', '💡'];

    useEffect(() => {
        // Request notification permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

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
        if (!currentUser || !content.trim()) return;

        const newNote: NotepadNote = {
            id: `note_${Date.now()}`,
            content: content.trim(),
            emoji: selectedEmoji,
            priority,
            reminderDate: reminderDate || undefined,
            reminderEnabled: !!reminderDate,
            createdAt: new Date().toISOString()
        };

        await FirestoreService.saveNote(currentUser.uid, newNote);
        setContent('');
        setReminderDate('');
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

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                    <StickyNote size={32} className="text-primary" />
                    Bloco de Notas
                </h1>
                <p className="text-gray-400">Anote procedimentos, lembretes e tarefas rápidas</p>
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
                                    <div className="relative flex-1 md:flex-none">
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-[#090c19] border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-gray-400 focus:ring-1 focus:ring-primary outline-none"
                                            value={reminderDate}
                                            onChange={(e) => setReminderDate(e.target.value)}
                                        />
                                        <Bell size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    </div>
                                    <Button
                                        onClick={handleAddNote}
                                        disabled={!content.trim()}
                                        className="bg-gradient-to-r from-primary to-[#00CC66] text-black font-bold h-9 px-4 rounded-xl shadow-lg shadow-primary/10 hover:scale-105 transition-all text-xs"
                                    >
                                        <Plus size={16} className="mr-1" /> Adicionar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Notes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((note) => (
                    <Card key={note.id} className="bg-[#121625] border-white/5 p-5 group relative overflow-hidden transition-all hover:border-primary/20">
                        {/* Priority Indicator */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${note.priority === 'high' ? 'bg-red-500' : note.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />

                        <div className="flex gap-4">
                            <div className="text-3xl shrink-0 bg-white/5 w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                {note.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${getPriorityColor(note.priority)}`}>
                                        {note.priority === 'high' ? 'Urgente' : note.priority === 'medium' ? 'Importante' : 'Lembrete'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {note.reminderDate && (
                                            <button
                                                onClick={() => handleToggleReminder(note)}
                                                className={`p-1.5 rounded-lg transition-colors ${note.reminderEnabled ? 'text-primary bg-primary/10' : 'text-gray-500 bg-white/5'}`}
                                                title={note.reminderEnabled ? 'Lembrete Ativo' : 'Lembrete Desativado'}
                                            >
                                                {note.reminderEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                                    <span>{new Date(note.createdAt).toLocaleDateString('pt-BR')}</span>
                                    {note.reminderDate && (
                                        <span className={`flex items-center gap-1 ${note.reminderEnabled ? 'text-primary/70' : ''}`}>
                                            <Bell size={10} /> {new Date(note.reminderDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {notes.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <StickyNote size={40} className="text-gray-600 opacity-20" />
                        </div>
                        <p className="text-gray-500 font-medium">Nenhuma anotação ainda</p>
                        <p className="text-[11px] text-gray-600">Use Ctrl+Enter para adicionar rápido</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlocoNotas;
