import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button } from './ui/UIComponents';
import { MousePointer2, Tag, Check, X, Info } from 'lucide-react';

interface Word {
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TeachAIModalProps {
    isOpen: boolean;
    onClose: boolean | undefined;
    image: string | null;
    words: Word[] | undefined;
    onSaveMapping: (data: any) => void;
}

const TeachAIModal: React.FC<TeachAIModalProps> = ({ isOpen, onClose, image, words, onSaveMapping }) => {
    const [selectedWords, setSelectedWords] = useState<Record<string, string>>({}); // { wordIndex: fieldName }
    const [activeField, setActiveField] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

    const fields = [
        { id: 'stake', label: 'Valor / Stake', color: 'bg-green-500' },
        { id: 'odds', label: 'Odds / Cotação', color: 'bg-yellow-500' },
        { id: 'event', label: 'Evento / Partida', color: 'bg-blue-500' },
        { id: 'market', label: 'Mercado / Aposta', color: 'bg-purple-500' },
        { id: 'date', label: 'Data', color: 'bg-orange-500' },
    ];

    useEffect(() => {
        if (image) {
            const img = new Image();
            img.onload = () => {
                setImgSize({ width: img.width, height: img.height });
            };
            img.src = image;
        }
    }, [image]);

    const handleWordClick = (index: number) => {
        if (!activeField) {
            // If no field active, maybe show a menu? 
            // For now, let's assume user selects a field first.
            return;
        }

        setSelectedWords(prev => ({
            ...prev,
            [index]: activeField
        }));
    };

    const handleConfirm = () => {
        const result: Record<string, any> = {};

        Object.keys(selectedWords).forEach((idx) => {
            const field = selectedWords[idx] as string;
            const word = words![parseInt(idx)];
            if (!result[field]) result[field] = '';
            result[field] = (result[field] + ' ' + word.text).trim();
        });

        // Basic parsing for numbers
        if (result.stake) result.value = parseFloat(result.stake.replace(',', '.').replace(/[^0-9.]/g, ''));
        if (result.odds) result.odds = parseFloat(result.odds.replace(',', '.').replace(/[^0-9.]/g, ''));

        onSaveMapping(result);
        if (typeof onClose === 'function') (onClose as any)();
    };

    if (!image || !words) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose as any}
            title="Ensinar IA (Mapeamento Manual)"
            maxWidth="max-w-4xl"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <Info size={20} className="text-primary shrink-0" />
                    <p className="text-xs text-primary/90">
                        Selecione um campo abaixo e clique nas palavras correspondentes no print para mapear os dados corretamente.
                    </p>
                </div>

                {/* Field Selector */}
                <div className="flex flex-wrap gap-2">
                    {fields.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveField(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${activeField === f.id
                                ? `${f.color} text-white border-transparent shadow-lg scale-105`
                                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                                }`}
                        >
                            <Tag size={12} />
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Image Canvas Overlay */}
                <div
                    ref={containerRef}
                    className="relative border border-white/10 rounded-xl overflow-auto bg-black max-h-[60vh] custom-scrollbar"
                >
                    <div className="relative inline-block">
                        <img src={image} alt="Print" className="max-w-none h-auto block" />

                        {/* Word Boxes */}
                        {words.map((w, i) => {
                            const isSelected = selectedWords[i];
                            const fieldColor = fields.find(f => f.id === isSelected)?.color || 'bg-white/0';

                            return (
                                <div
                                    key={i}
                                    onClick={() => handleWordClick(i)}
                                    className={`absolute cursor-pointer border transition-all ${isSelected
                                        ? `${fieldColor} border-white/50 opacity-60 z-20`
                                        : 'border-transparent hover:border-primary/50 hover:bg-primary/10 z-10'
                                        }`}
                                    style={{
                                        left: `${w.bbox.x0}px`,
                                        top: `${w.bbox.y0}px`,
                                        width: `${w.bbox.x1 - w.bbox.x0}px`,
                                        height: `${w.bbox.y1 - w.bbox.y0}px`,
                                    }}
                                    title={w.text}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-2">
                        <Button variant="neutral" size="sm" onClick={() => setSelectedWords({})}>
                            <X size={14} /> Limpar
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose as any}>Cancelar</Button>
                        <Button size="sm" onClick={handleConfirm} disabled={Object.keys(selectedWords).length === 0}>
                            <Check size={14} /> Aplicar Mapeamento
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default TeachAIModal;
