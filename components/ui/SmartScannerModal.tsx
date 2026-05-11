import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, Zap, DollarSign, Briefcase, Check, Loader2, Sparkles, Image as ImageIcon, TrendingUp } from 'lucide-react';
import { ocrService } from '../../services/ocrService';

interface SmartScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onExtract: (type: 'odd' | 'stake' | 'market' | 'bookmaker' | 'return', value: any) => void;
}

export const SmartScannerModal: React.FC<SmartScannerModalProps> = ({
    isOpen,
    onClose,
    imageUrl,
    onExtract
}) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ type: string, value: string } | null>(null);
    const [crop, setCrop] = useState({ x: 25, y: 25, width: 50, height: 10 });
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragInfo = useRef<{ type: string, startX: number, startY: number, startCrop: any } | null>(null);

    // Prevent scrolling
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handlePointerDown = (type: string, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        dragInfo.current = {
            type,
            startX: e.clientX,
            startY: e.clientY,
            startCrop: { ...crop }
        };

        const handlePointerMove = (moveEv: PointerEvent) => {
            if (!dragInfo.current || !containerRef.current) return;
            const { type, startX, startY, startCrop } = dragInfo.current;
            const containerRect = containerRef.current.getBoundingClientRect();
            
            // Calculate delta in percentage
            const dx = ((moveEv.clientX - startX) / containerRect.width) * 100;
            const dy = ((moveEv.clientY - startY) / containerRect.height) * 100;

            let newCrop = { ...startCrop };

            if (type === 'move') {
                newCrop.x = Math.max(0, Math.min(100 - newCrop.width, startCrop.x + dx));
                newCrop.y = Math.max(0, Math.min(100 - newCrop.height, startCrop.y + dy));
            } else {
                if (type.includes('w')) {
                    const maxW = startCrop.x + startCrop.width;
                    newCrop.x = Math.max(0, Math.min(maxW - 5, startCrop.x + dx));
                    newCrop.width = maxW - newCrop.x;
                }
                if (type.includes('e')) {
                    newCrop.width = Math.max(5, Math.min(100 - startCrop.x, startCrop.width + dx));
                }
                if (type.includes('n')) {
                    const maxH = startCrop.y + startCrop.height;
                    newCrop.y = Math.max(0, Math.min(maxH - 5, startCrop.y + dy));
                    newCrop.height = maxH - newCrop.y;
                }
                if (type.includes('s')) {
                    newCrop.height = Math.max(5, Math.min(100 - startCrop.y, startCrop.height + dy));
                }
            }

            setCrop(newCrop);
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            dragInfo.current = null;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const extractCroppedImage = async (): Promise<{ base64: string, color: string }> => {
        return new Promise((resolve, reject) => {
            if (!imgRef.current || !containerRef.current) return reject('No image');
            
            const img = imgRef.current;
            const container = containerRef.current;
            
            // Get actual dimensions and position of the image on screen
            const imgRect = img.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Calculate crop area in pixels relative to the image itself
            const scaleX = img.naturalWidth / imgRect.width;
            const scaleY = img.naturalHeight / imgRect.height;

            const cropLeftPx = (crop.x / 100) * containerRect.width;
            const cropTopPx = (crop.y / 100) * containerRect.height;
            const cropWidthPx = (crop.width / 100) * containerRect.width;
            const cropHeightPx = (crop.height / 100) * containerRect.height;

            // Adjust for the image's offset within the container (letterboxing)
            const offsetX = imgRect.left - containerRect.left;
            const offsetY = imgRect.top - containerRect.top;

            const sourceX = Math.max(0, (cropLeftPx - offsetX) * scaleX);
            const sourceY = Math.max(0, (cropTopPx - offsetY) * scaleY);
            const sourceW = Math.min(img.naturalWidth - sourceX, cropWidthPx * scaleX);
            const sourceH = Math.min(img.naturalHeight - sourceY, cropHeightPx * scaleY);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No context');

            canvas.width = sourceW;
            canvas.height = sourceH;

            ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
            
            // Analyze dominant color
            const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0;
            const total = pixelData.length / 4;
            for (let i = 0; i < pixelData.length; i += 4) {
                r += pixelData[i];
                g += pixelData[i+1];
                b += pixelData[i+2];
            }
            r = Math.floor(r / total);
            g = Math.floor(g / total);
            b = Math.floor(b / total);

            let color = 'unknown';
            if (r > 180 && g > 60 && g < 160 && b < 80) color = 'orange'; // Betano
            else if (g > 80 && r < 100 && b < 120) color = 'green'; // Bet365
            else if (b > 100 && r < 80 && g < 150) color = 'blue'; // Sportingbet
            else if (r > 150 && g < 70 && b < 70) color = 'red'; // KTO / Superbet
            else if (r > 180 && g > 150 && b < 100) color = 'yellow'; // Estrela
            else if (r < 50 && g < 50 && b < 50) color = 'black';

            // To improve OCR, scale up the cropped area if it's small
            const scaledCanvas = document.createElement('canvas');
            const scale = 2;
            scaledCanvas.width = canvas.width * scale;
            scaledCanvas.height = canvas.height * scale;
            const sCtx = scaledCanvas.getContext('2d');
            if (sCtx) {
                sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                resolve({ base64: scaledCanvas.toDataURL('image/png', 1.0), color });
            } else {
                resolve({ base64: canvas.toDataURL('image/png', 1.0), color });
            }
        });
    };

    const handleExtract = async (type: 'odd' | 'stake' | 'market' | 'bookmaker' | 'return') => {
        setIsScanning(true);
        setScanResult(null);
        try {
            const { base64, color } = await extractCroppedImage();
            const ocrResult = await ocrService.runOCR(base64);
            const text = ocrResult.text.trim();
            console.log(`[Smart Scanner] Raw text for ${type}:`, text, 'Dominant color:', color);

            let value: any = text;

            // Simple replacements to fix common OCR errors in numbers
            if (type === 'odd' || type === 'stake' || type === 'return') {
                value = text.replace(/,/g, '.').replace(/[^\d.-]/g, '');
                if (value) value = parseFloat(value);
            } else if (type === 'bookmaker') {
                const houses = [
                    { id: 'Betano', keywords: ['betano', 'b'], color: 'orange' },
                    { id: 'Bet365', keywords: ['bet365', '365'], color: 'green' },
                    { id: 'BR4', keywords: ['br4'], color: 'unknown' },
                    { id: 'Nacional', keywords: ['nacional', 'betnacional'], color: 'unknown' },
                    { id: 'Sportingbet', keywords: ['sportingbet', 'sporting'], color: 'blue' },
                    { id: 'KTO', keywords: ['kto'], color: 'red' },
                    { id: 'Novibet', keywords: ['novibet', 'novi'], color: 'black' },
                    { id: 'Pixbet', keywords: ['pixbet', 'pix'], color: 'unknown' },
                    { id: 'Estrela', keywords: ['estrela', 'estrelabet'], color: 'yellow' },
                    { id: 'Superbet', keywords: ['superbet', 'super'], color: 'red' },
                    { id: 'Parimatch', keywords: ['parimatch', 'pari'], color: 'yellow' },
                    { id: 'Betway', keywords: ['betway'], color: 'unknown' },
                    { id: 'Dafabet', keywords: ['dafabet'], color: 'red' },
                    { id: '1xbet', keywords: ['1xbet', '1x'], color: 'blue' },
                    { id: 'Betfair', keywords: ['betfair'], color: 'orange' },
                    { id: 'Rivalo', keywords: ['rivalo'], color: 'orange' },
                    { id: 'Playpix', keywords: ['playpix'], color: 'unknown' },
                    { id: 'R7.BET', keywords: ['r7', 'r7.bet'], color: 'unknown' }
                ];
                
                const textLower = text.toLowerCase().trim();
                let found = houses.find(h => h.keywords.some(k => textLower.includes(k) || (textLower === k)));
                
                // Color fallback if OCR text is very short or ambiguous
                if ((!found || textLower.length <= 1) && color !== 'unknown') {
                    const colorMatches = houses.filter(h => h.color === color);
                    if (colorMatches.length > 0) {
                        // If we have a specific color match and OCR was inconclusive
                        found = colorMatches[0];
                    }
                }

                if (found) {
                    value = found.id;
                }
            }

            if (value && String(value).trim() !== '') {
                onExtract(type, value);
                setScanResult({ type, value: String(value) });
                setTimeout(() => setScanResult(null), 3000);
            } else {
                alert('Não foi possível reconhecer o texto na área selecionada. Tente ajustar o quadrado.');
            }

        } catch (err) {
            console.error('Scan failed:', err);
            alert('Falha ao escanear a imagem.');
        } finally {
            setIsScanning(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100005] flex flex-col bg-[#05070e] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0d18]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Scanner Guiado</h3>
                        <p className="text-[10px] text-gray-400">Arraste a caixa verde sobre a informação e clique no que ela é</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 relative flex flex-col overflow-hidden bg-black/50">

                {/* Scan Overlay Success */}
                {scanResult && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                        <Check size={18} /> {scanResult.type.toUpperCase()}: {scanResult.value} salvo!
                    </div>
                )}

                {/* Loading State */}
                {isScanning && (
                    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 size={48} className="text-primary animate-spin mb-4" />
                        <h3 className="text-white font-bold text-xl tracking-wider">Lendo Imagem...</h3>
                        <p className="text-primary text-sm font-medium animate-pulse">OCR de Alta Precisão</p>
                    </div>
                )}

                {/* Image & Crop Area */}
                <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
                    <div ref={containerRef} className="relative max-h-full max-w-full flex items-center justify-center shadow-2xl touch-none">
                        <img 
                            ref={imgRef} 
                            src={imageUrl} 
                            alt="Scanner Source" 
                            className="max-h-[75vh] lg:max-h-[80vh] max-w-full object-contain block pointer-events-none"
                            draggable={false}
                            crossOrigin="anonymous"
                        />

                        {/* Crop Box */}
                        <div className="absolute inset-0 z-10 pointer-events-none">
                            {/* Darken Outside */}
                            <svg className="absolute inset-0 w-full h-full opacity-60">
                                <defs>
                                    <mask id="scanner-mask">
                                        <rect width="100%" height="100%" fill="white" />
                                        <rect x={`${crop.x}%`} y={`${crop.y}%`} width={`${crop.width}%`} height={`${crop.height}%`} fill="black" />
                                    </mask>
                                </defs>
                                <rect width="100%" height="100%" fill="black" mask="url(#scanner-mask)" />
                            </svg>

                            {/* Scanner Box */}
                            <div 
                                className="absolute pointer-events-auto cursor-move shadow-[0_0_30px_rgba(23,186,164,0.1)] transition-colors"
                                style={{ 
                                    left: `${crop.x}%`, 
                                    top: `${crop.y}%`, 
                                    width: `${crop.width}%`, 
                                    height: `${crop.height}%`,
                                }}
                                onPointerDown={(e) => handlePointerDown('move', e)}
                            >
                                <style>
                                {`
                                    @keyframes scan-laser {
                                        0% { top: 0%; opacity: 0; }
                                        5% { opacity: 1; }
                                        95% { opacity: 1; }
                                        100% { top: calc(100% - 2px); opacity: 0; }
                                    }
                                    .animate-scan-laser {
                                        animation: scan-laser 2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
                                    }
                                `}
                                </style>

                                {/* Corner Brackets (QR style) */}
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg pointer-events-none" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg pointer-events-none" />
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg pointer-events-none" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-[3px] border-r-[3px] border-primary rounded-br-lg pointer-events-none" />

                                {/* Sweeping Laser Line Effect */}
                                <div className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_15px_3px_rgba(23,186,164,0.8)] animate-scan-laser pointer-events-none" />

                                {/* Resize Handles */}
                                <div className="absolute -top-4 -left-4 w-10 h-10 cursor-nw-resize pointer-events-auto" onPointerDown={(e) => handlePointerDown('nw', e)} />
                                <div className="absolute -top-4 -right-4 w-10 h-10 cursor-ne-resize pointer-events-auto" onPointerDown={(e) => handlePointerDown('ne', e)} />
                                <div className="absolute -bottom-4 -left-4 w-10 h-10 cursor-sw-resize pointer-events-auto" onPointerDown={(e) => handlePointerDown('sw', e)} />
                                <div className="absolute -bottom-4 -right-4 w-10 h-10 cursor-se-resize pointer-events-auto" onPointerDown={(e) => handlePointerDown('se', e)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Unified Bottom Controls */}
                <div className="bg-[#0a0d18] border-t border-white/5 p-4 z-50 shrink-0 mb-safe">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-5xl mx-auto">
                        <button 
                            onClick={() => handleExtract('odd')}
                            disabled={isScanning}
                            className="py-3.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-primary/20 shadow-lg active:scale-95"
                        >
                            <Target size={14} /> Odd
                        </button>
                        <button 
                            onClick={() => handleExtract('stake')}
                            disabled={isScanning}
                            className="py-3.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-secondary/20 shadow-lg active:scale-95"
                        >
                            <DollarSign size={14} /> Stake
                        </button>
                        <button 
                            onClick={() => handleExtract('return')}
                            disabled={isScanning}
                            className="py-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 shadow-lg active:scale-95"
                        >
                            <TrendingUp size={14} /> Retorno
                        </button>
                        <button 
                            onClick={() => handleExtract('market')}
                            disabled={isScanning}
                            className="py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-emerald-500/20 shadow-lg active:scale-95"
                        >
                            <Zap size={14} /> Mercado
                        </button>
                        <button 
                            onClick={() => handleExtract('bookmaker')}
                            disabled={isScanning}
                            className="py-3.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-blue-500/20 shadow-lg active:scale-95 col-span-2 sm:col-span-1"
                        >
                            <Briefcase size={14} /> Casa
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

