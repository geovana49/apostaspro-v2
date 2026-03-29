
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check, ZoomIn, ZoomOut, RotateCcw, RotateCw, Move, Crop, Pipette, ChevronUp, Gamepad2, Trophy, Star, Zap, Gift, Coins, Briefcase, Ghost, Box, Banknote, CreditCard, Smartphone, Target, Search, ChevronLeft, ChevronRight, Download, Sun, Contrast, Maximize, Minimize, FlipHorizontal, FlipVertical, Sparkles, Scissors, Scaling, RefreshCw } from 'lucide-react';

// --- Color Helpers ---
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: result[4] ? parseInt(result[4], 16) / 255 : 1
  } : { r: 0, g: 0, b: 0, a: 1 };
};

const rgbToHex = (r: number, g: number, b: number, a: number = 1) => {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  const alpha = a < 1 ? toHex(a * 255) : '';
  return "#" + toHex(r) + toHex(g) + toHex(b) + alpha;
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  let r, g, b;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255)
  };
};

// --- Custom Color Picker ---
interface CustomColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  color: string;
  onChange: (hex: string) => void;
  anchorEl?: HTMLElement | null; // For popover positioning
}

interface EyeDropper {
  open: () => Promise<{ sRGBHex: string }>;
}
declare global {
  interface Window {
    EyeDropper?: { new(): EyeDropper };
  }
}

export const CustomColorPicker: React.FC<CustomColorPickerProps> = ({ isOpen, onClose, color, onChange, anchorEl }) => {
  // State for HSV/Alpha
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 0 });
  const [alpha, setAlpha] = useState(1);
  const [inputMode, setInputMode] = useState<'HEX' | 'RGB' | 'HSL'>('HEX');

  // Dragging states
  const [dragTarget, setDragTarget] = useState<'sat' | 'hue' | 'alpha' | null>(null);

  // Layout positioning
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const pickerRef = useRef<HTMLDivElement>(null);
  const satBoxRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const alphaSliderRef = useRef<HTMLDivElement>(null);

  // Initialize from props
  useEffect(() => {
    if (isOpen) {
      const rgb = hexToRgb(color || '#000000');
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      setAlpha(rgb.a);
    }
  }, [isOpen, color]); // Recalculate if color prop changes externally

  // Calculate Popover Position
  useLayoutEffect(() => {
    if (isOpen && anchorEl && pickerRef.current) {
      const rect = anchorEl.getBoundingClientRect();
      const pickerRect = pickerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = rect.bottom + 8;
      let left = rect.left;

      // Flip Up if no space
      if (top + pickerRect.height > viewportHeight) {
        top = rect.top - pickerRect.height - 8;
      }

      // Shift Left if no space
      if (left + pickerRect.width > viewportWidth) {
        left = viewportWidth - pickerRect.width - 10;
      }
      // Shift Right if off screen
      if (left < 0) left = 10;

      setPosition({ top: top + window.scrollY, left: left + window.scrollX });
    }
  }, [isOpen, anchorEl]);

  // Color Updates
  const emitChange = (newHsv: { h: number, s: number, v: number }, newAlpha: number) => {
    setHsv(newHsv);
    setAlpha(newAlpha);
    const rgb = hsvToRgb(newHsv.h, newHsv.s / 100, newHsv.v / 100);
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b, newAlpha));
  };

  // Interaction Handlers
  const handleSatBoxMove = (e: MouseEvent | TouchEvent) => {
    if (!satBoxRef.current) return;
    const rect = satBoxRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    let s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100;
    let v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height)) * 100;

    emitChange({ ...hsv, s, v }, alpha);
  };

  const handleHueMove = (e: MouseEvent | TouchEvent) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    let h = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 360;
    // Cap at 360, but if 0 keep 0
    if (h >= 360) h = 359.9;
    emitChange({ ...hsv, h }, alpha);
  };

  const handleAlphaMove = (e: MouseEvent | TouchEvent) => {
    if (!alphaSliderRef.current) return;
    const rect = alphaSliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    let a = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    emitChange(hsv, parseFloat(a.toFixed(2)));
  };

  // Global Drag Listeners
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragTarget) return;
      e.preventDefault();
      if (dragTarget === 'sat') handleSatBoxMove(e);
      if (dragTarget === 'hue') handleHueMove(e);
      if (dragTarget === 'alpha') handleAlphaMove(e);
    };

    const handleUp = () => setDragTarget(null);

    if (dragTarget) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragTarget, hsv, alpha]);

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node) && anchorEl && !anchorEl.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, anchorEl]);

  const handleEyedropper = async () => {
    if (!window.EyeDropper) {
      alert('Seu navegador não suporta a ferramenta de conta-gotas.');
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex;
      const rgb = hexToRgb(hex);
      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      emitChange(newHsv, 1);
    } catch (e) {
      console.log('Eyedropper cancelled');
    }
  };

  const toggleMode = () => {
    if (inputMode === 'HEX') setInputMode('RGB');
    else if (inputMode === 'RGB') setInputMode('HSL');
    else setInputMode('HEX');
  };

  if (!isOpen) return null;

  const currentRgb = hsvToRgb(hsv.h, hsv.s / 100, hsv.v / 100);
  const currentHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
  const displayColor = `rgba(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b}, ${alpha})`;

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-[100001] w-[280px] bg-[#1c2438] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: anchorEl ? position.top : '50%',
        left: anchorEl ? position.left : '50%',
        transform: anchorEl ? 'none' : 'translate(-50%, -50%)' // Fallback centering
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-[10] w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/70 hover:text-white transition-all backdrop-blur-sm border border-white/10"
        title="Fechar"
      >
        <X size={14} />
      </button>

      {/* Saturation Box */}
      <div
        ref={satBoxRef}
        className="w-full h-[150px] relative cursor-crosshair touch-none"
        style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
        onMouseDown={(e) => { setDragTarget('sat'); handleSatBoxMove(e.nativeEvent); }}
        onTouchStart={(e) => { setDragTarget('sat'); handleSatBoxMove(e.nativeEvent); }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none box-border"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: displayColor }}
        />
      </div>

      <div className="p-3 space-y-3">
        {/* Controls Row */}
        <div className="flex items-center gap-3">
          {/* Eyedropper */}
          <button
            onClick={handleEyedropper}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Conta-gotas"
          >
            <Pipette size={14} />
          </button>

          {/* Sliders Column */}
          <div className="flex-1 flex flex-col gap-2.5">
            {/* Hue */}
            <div
              ref={hueSliderRef}
              className="h-2.5 rounded-full relative cursor-pointer touch-none"
              style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
              onMouseDown={(e) => { setDragTarget('hue'); handleHueMove(e.nativeEvent); }}
              onTouchStart={(e) => { setDragTarget('hue'); handleHueMove(e.nativeEvent); }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md -translate-x-1/2 pointer-events-none"
                style={{ left: `${(hsv.h / 360) * 100}%` }}
              />
            </div>

            {/* Alpha */}
            <div
              ref={alphaSliderRef}
              className="h-2.5 rounded-full relative cursor-pointer touch-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] bg-[length:8px_8px]"
              onMouseDown={(e) => { setDragTarget('alpha'); handleAlphaMove(e.nativeEvent); }}
              onTouchStart={(e) => { setDragTarget('alpha'); handleAlphaMove(e.nativeEvent); }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `linear-gradient(to right, transparent, ${rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b)})` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md -translate-x-1/2 pointer-events-none"
                style={{ left: `${alpha * 100}%` }}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="w-8 h-8 rounded-full shadow-inner border border-white/10 relative overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] bg-[length:8px_8px]">
            <div className="absolute inset-0" style={{ backgroundColor: displayColor }} />
          </div>
        </div>

        {/* Inputs Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {inputMode === 'HEX' && (
              <div className="flex flex-col items-center">
                <input
                  className="w-full bg-[#0d1121] border border-white/10 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-primary/50"
                  value={rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b, alpha)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-F]{0,8}$/i.test(val)) {
                      const rgb = hexToRgb(val);
                      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                      setAlpha(rgb.a);
                      onChange(val); // Emit raw value while typing? Standard is usually valid hex
                      if (val.length >= 7) {
                        const vRgb = hexToRgb(val);
                        emitChange(rgbToHsv(vRgb.r, vRgb.g, vRgb.b), vRgb.a);
                      }
                    }
                  }}
                />
                <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase">HEX</span>
              </div>
            )}

            {inputMode === 'RGB' && (
              <div className="flex gap-1">
                {['r', 'g', 'b', 'a'].map((k) => (
                  <div key={k} className="flex flex-col items-center flex-1">
                    <input
                      className="w-full bg-[#0d1121] border border-white/10 rounded px-1 py-1 text-xs text-white text-center focus:outline-none focus:border-primary/50"
                      value={k === 'a' ? alpha : currentRgb[k as keyof typeof currentRgb]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const newRgb = { ...currentRgb, a: alpha, [k]: val };
                          if (k === 'a') {
                            emitChange(hsv, Math.min(1, Math.max(0, val)));
                          } else {
                            const h = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
                            emitChange(h, alpha);
                          }
                        }
                      }}
                    />
                    <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase">{k.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}

            {inputMode === 'HSL' && (
              <div className="flex gap-1">
                {['h', 's', 'l', 'a'].map((k) => (
                  <div key={k} className="flex flex-col items-center flex-1">
                    <input
                      className="w-full bg-[#0d1121] border border-white/10 rounded px-1 py-1 text-xs text-white text-center focus:outline-none focus:border-primary/50"
                      value={k === 'a' ? alpha : currentHsl[k as keyof typeof currentHsl]}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          if (k === 'a') {
                            emitChange(hsv, Math.min(1, Math.max(0, parseFloat(e.target.value))));
                          } else {
                            const newHsl = { ...currentHsl, [k]: val };
                            const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
                            emitChange(rgbToHsv(rgb.r, rgb.g, rgb.b), alpha);
                          }
                        }
                      }}
                    />
                    <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase">{k.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Mode Button */}
          <button
            onClick={toggleMode}
            className="flex flex-col items-center justify-center h-full px-1 hover:bg-white/5 rounded text-gray-400 hover:text-white"
          >
            <ChevronUp size={10} />
            <ChevronDown size={10} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// --- Money Display ---
export const MoneyDisplay: React.FC<{ value: number; privacyMode?: boolean; prefix?: string; className?: string }> = ({ value, privacyMode = false, prefix = 'R$', className = '' }) => {
  if (privacyMode) {
    return <span className={`font-mono ${className}`}>{prefix} ••••</span>;
  }

  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

  // If user requested standard display, format currency normally
  return <span className={className}>{prefix} {formatted}</span>;
};

// --- Card 3D ---
export const Card = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string; onClick?: () => void }>(({ children, className = '', onClick }, ref) => (
  <div
    ref={ref}
    onClick={onClick}
    className={`
      relative group 
      bg-[#151b2e] rounded-xl border border-white/5 
      shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] 
      transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) 
      hover:border-white/10 
      hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.4)]
      hover:-translate-y-2
      ${onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.98]' : ''} 
      ${className}
    `}
  >
    {/* Ambient Light / Shine Effect */}
    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

    {/* Content */}
    <div className="relative z-10">
      {children}
    </div>
  </div>
));
Card.displayName = 'Card';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', type = 'button', ...props }) => {
  const baseStyle = "relative overflow-hidden font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 tracking-wide group";

  const variants = {
    primary: "bg-primary text-[#090c19] font-bold hover:bg-[#129683] shadow-[0_4px_14px_0_rgba(23,186,164,0.39)] hover:shadow-[0_6px_20px_rgba(23,186,164,0.23)] hover:-translate-y-0.5",
    secondary: "bg-secondary text-[#090c19] font-bold hover:bg-[#e69900] shadow-[0_4px_14px_0_rgba(255,171,0,0.39)] hover:shadow-[0_6px_20px_rgba(255,171,0,0.23)] hover:-translate-y-0.5",
    danger: "bg-danger text-white hover:bg-red-600 shadow-[0_4px_14px_0_rgba(255,82,82,0.39)] hover:shadow-[0_6px_20px_rgba(255,82,82,0.23)] hover:-translate-y-0.5",
    neutral: "bg-[#1e293b] text-gray-200 hover:bg-[#334155] border border-white/5 hover:border-white/10 hover:-translate-y-0.5",
    outline: "border border-white/10 text-gray-300 hover:border-white/20 hover:text-white bg-transparent hover:bg-white/5 hover:-translate-y-0.5"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button type={type} className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      <span className="relative z-10 flex items-center gap-2 [&>svg]:transition-transform [&>svg]:duration-300 group-hover:[&>svg]:scale-110 group-hover:[&>svg]:rotate-6">{children}</span>
      {/* Button Shine */}
      <div className="absolute inset-0 h-full w-full scale-0 rounded-lg transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10" />
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  prefix?: string;
}

export const Input: React.FC<InputProps> = ({ label, icon, prefix, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2">{label}</label>}
    <div className="relative group">
      {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110 group-focus-within:-rotate-6">{icon}</div>}
      {prefix && <div className={`absolute ${icon ? 'left-10' : 'left-3.5'} top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none`}>{prefix}</div>}
      <input
        className={`w-full bg-[#0d1121] border border-white/10 focus:border-primary/50 text-white rounded-lg py-2.5 ${icon ? (prefix ? 'pl-16' : 'pl-10') : (prefix ? 'pl-10' : 'px-4')} placeholder-gray-600 focus:outline-none transition-all duration-200 text-sm focus:ring-1 focus:ring-primary/50 hover:border-white/20 shadow-inner ${className}`}
        {...props}
      />
    </div>
  </div>
);

// --- Select (Native) ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select: React.FC<SelectProps> = ({ label, children, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2">{label}</label>}
    <div className="relative group">
      <select
        className={`w-full bg-[#0d1121] border border-white/10 focus:border-primary/50 text-white rounded-lg py-2.5 px-4 pr-10 appearance-none focus:outline-none transition-colors text-sm hover:border-white/20 cursor-pointer shadow-inner ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-white transition-colors pointer-events-none">
        <ChevronDown size={14} />
      </div>
    </div>
  </div>
);

// --- Custom Dropdown ---
export interface DropdownOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  label?: string;
  isSearchable?: boolean;
  searchPlaceholder?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  className = '',
  placeholder = 'Selecione',
  label,
  isSearchable = false,
  searchPlaceholder = 'Buscar...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    bottom?: number;
    placement: 'top' | 'bottom';
    maxHeight: number;
  }>({ top: 0, left: 0, width: 0, placement: 'bottom', maxHeight: 300 });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update position with collision detection
  const updatePosition = () => {
    if (isMobile) return; // Skip positioning on mobile
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Decide placement: if space below is tight (< 220px) and space above is better, go up.
      // Otherwise prefer down.
      let placement: 'top' | 'bottom' = 'bottom';
      let maxHeight = 300; // Default max height target

      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        placement = 'top';
        // Constraint max height to fit above
        maxHeight = Math.min(300, spaceAbove - 20); // Leave 20px padding from top
      } else {
        placement = 'bottom';
        // Constraint max height to fit below
        maxHeight = Math.min(300, spaceBelow - 20); // Leave 20px padding from bottom
      }

      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        placement,
        maxHeight,
        // For top placement, we fix to bottom relative to screen to grow upwards properly
        bottom: viewportHeight - rect.top + 6
      });
    }
  };

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      setSearchTerm(''); // Clear search on open
    }
    setIsOpen(!isOpen);
  };

  // Close on resize (width only) or scroll to keep position correct
  useEffect(() => {
    let lastWidth = window.innerWidth;

    const handleScrollOrResize = (e: Event) => {
      if (isMobile) return; // Don't close on scroll/resize on mobile

      // Fix: Do not close if scrolling inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }

      // On mobile, opening keyboard triggers resize. Only close if WIDTH changes.
      if (e.type === 'resize') {
        const currentWidth = window.innerWidth;
        if (Math.abs(currentWidth - lastWidth) < 10) {
          return; // Ignore height changes (keyboard)
        }
        lastWidth = currentWidth;
      }

      if (isOpen) setIsOpen(false);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true); // Capture scroll on any element
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside BOTH the dropdown button AND the portal menu
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        menuRef.current && !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = isSearchable
    ? options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : options;

  return (
    <>
      <div className={`relative w-full ${className}`} ref={dropdownRef}>
        {label && <label className="block text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2">{label}</label>}
        <button
          type="button"
          onClick={toggleOpen}
          className={`w-full bg-[#0d1121] border ${isOpen ? 'border-primary/50 ring-1 ring-primary/50' : 'border-white/10'} hover:border-white/20 text-white rounded-lg py-2.5 px-4 flex items-center justify-between transition-all duration-200 group shadow-sm hover:shadow-md`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {selectedOption?.icon && <span className={`${isOpen ? 'text-primary' : 'text-gray-400'} group-hover:text-primary transition-all duration-300 group-hover:scale-110`}>{selectedOption.icon}</span>}
            <span className={`text-sm font-medium truncate ${selectedOption ? 'text-white' : 'text-gray-500'}`}>{selectedOption?.label || placeholder}</span>
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'group-hover:text-gray-300'}`}
          />
        </button>
      </div>

      {/* Portal for the Menu */}
      {/* Portal for the Menu */}
      {isOpen && createPortal(
        <>
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999998] animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
            />
          )}
          <div
            ref={menuRef}
            style={!isMobile ? {
              position: 'fixed',
              left: coords.left,
              width: coords.width,
              zIndex: 999999,
              ...(coords.placement === 'bottom'
                ? { top: coords.top }
                : { bottom: coords.bottom }
              ),
              maxHeight: coords.maxHeight
            } : {
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 999999,
              maxHeight: '80vh'
            }}
            className={!isMobile ? `
                        bg-[#151b2e] border border-white/10 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,1)] 
                        overflow-hidden flex flex-col
                        animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5
                        ${coords.placement === 'top' ? 'origin-bottom' : 'origin-top'}
                    ` : `
                        bg-[#151b2e] border-t border-white/10 rounded-t-2xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,1)]
                        overflow-hidden flex flex-col pb-safe
                        animate-in slide-in-from-bottom duration-300
                    `}
          >
            {isMobile && (
              <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsOpen(false)}>
                <div className="w-12 h-1.5 bg-white/10 rounded-full" />
              </div>
            )}
            {isSearchable && (
              <div className="p-2 border-b border-white/10 sticky top-0 bg-[#151b2e] z-10">
                <Input
                  autoFocus
                  icon={<Search size={14} />}
                  className="w-full text-xs py-1.5 bg-[#0d1121]"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onClick={e => e.stopPropagation()} // Prevent dropdown from closing
                />
              </div>
            )}
            <div
              className="p-1 space-y-0.5 overflow-y-auto custom-scrollbar"
              style={{ maxHeight: isSearchable ? coords.maxHeight - 50 : coords.maxHeight }}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 rounded-lg transition-all group/option ${option.value === value
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <div className={`${option.value === value ? 'text-primary' : 'text-gray-500'} group-hover/option:scale-110 transition-transform`}>
                      {option.icon}
                    </div>
                    <span className="flex-1">{option.label}</span>
                    {option.value === value && <Check size={14} strokeWidth={3} className="animate-in zoom-in duration-200" />}
                  </button>
                ))
              ) : (
                <div className="text-center text-xs text-gray-500 py-4 px-2">Nenhum resultado encontrado.</div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

// --- Badge/Tag ---
export const Badge: React.FC<{ children: React.ReactNode; color?: string; className?: string }> = ({ children, color = '#A0A0A0', className = '' }) => {
  return (
    <span
      style={{ backgroundColor: `${color}15`, color: color, borderColor: `${color}20` }}
      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${className}`}
    >
      {children}
    </span>
  );
};

// --- Modal ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, zIndex = 99999 }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex }}>
      <div className="absolute inset-0 bg-[#090c19]/80 backdrop-blur-md transition-opacity" />
      <div className="relative bg-[#151b2e] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#1c2438]">
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full hover:bg-white/10 group">
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="p-5 border-t border-white/5 bg-[#0f1422]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// --- Icon Rendering ---
export const ICON_MAP: Record<string, React.ElementType> = {
  'Gamepad2': Gamepad2,
  'Trophy': Trophy,
  'Star': Star,
  'Check': Check,
  'Zap': Zap,
  'Gift': Gift,
  'Coins': Coins,
  'Briefcase': Briefcase,
  'Ghost': Ghost,
  'Box': Box,
  'Banknote': Banknote,
  'CreditCard': CreditCard,
  'Smartphone': Smartphone,
  'Target': Target
};

export const RenderIcon: React.FC<{ iconSource?: string, size?: number, className?: string }> = ({ iconSource, size = 16, className = "" }) => {
  if (!iconSource) return <Star size={size} className={className} />;

  const IconComp = ICON_MAP[iconSource] || Star;
  return <IconComp size={size} className={className} />;
};

// --- Pro Image Editor ---
interface ImageAdjusterProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (newImage: Blob | null) => void;
  aspect?: number; 
}

export const ImageAdjuster: React.FC<ImageAdjusterProps> = ({ isOpen, imageSrc, onClose, onSave, aspect: initialAspect = 1 }) => {
  // Transformation State
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  
  // Filter State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  
  // Cropping State
  const [aspect, setAspect] = useState<number | undefined>(initialAspect);
  const [cropShape, setCropShape] = useState<'circle' | 'square' | 'rounded' | 'free'>('circle'); // Default to Circle for better first impression
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 }); // Percentages
  const [isDragging, setIsDragging] = useState<{ type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w', startX: number, startY: number, startCrop: any } | null>(null);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync internal container size with displayed image size
  const updateImageSize = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current.getBoundingClientRect();
      setImageSize({ width, height });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateImageSize);
    return () => window.removeEventListener('resize', updateImageSize);
  }, [updateImageSize]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setAspect(initialAspect);
      setCrop({ x: 10, y: 10, width: 80, height: 80 });
      // Reset image size state before new load
      setImageSize({ width: 0, height: 0 });
    }
  }, [isOpen, imageSrc, initialAspect]);

  // Resolution Calculation
  const resolution = useMemo(() => {
    if (!imgRef.current) return { w: 0, h: 0 };
    const w = Math.round((crop.width / 100) * imgRef.current.naturalWidth);
    const h = Math.round((crop.height / 100) * imgRef.current.naturalHeight);
    return { w, h };
  }, [crop, isOpen]);

  const handlePointerDown = (type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging({ type, startX: e.clientX, startY: e.clientY, startCrop: { ...crop } });
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - isDragging.startX) / rect.width) * 100;
    const dy = ((e.clientY - isDragging.startY) / rect.height) * 100;
    
    let newCrop = { ...isDragging.startCrop };

    if (isDragging.type === 'move') {
      newCrop.x = Math.max(0, Math.min(100 - newCrop.width, newCrop.x + dx));
      newCrop.y = Math.max(0, Math.min(100 - newCrop.height, newCrop.y + dy));
    } else {
      // Resizing logic
      if (isDragging.type.includes('w')) {
        const boundedDx = Math.max(-isDragging.startCrop.x, Math.min(isDragging.startCrop.width - 5, dx));
        newCrop.x = isDragging.startCrop.x + boundedDx;
        newCrop.width = isDragging.startCrop.width - boundedDx;
      }
      if (isDragging.type.includes('e')) {
        const boundedDx = Math.max(-(isDragging.startCrop.width - 5), Math.min(100 - isDragging.startCrop.x - isDragging.startCrop.width, dx));
        newCrop.width = isDragging.startCrop.width + boundedDx;
      }
      if (isDragging.type.includes('n')) {
        const boundedDy = Math.max(-isDragging.startCrop.y, Math.min(isDragging.startCrop.height - 5, dy));
        newCrop.y = isDragging.startCrop.y + boundedDy;
        newCrop.height = isDragging.startCrop.height - boundedDy;
      }
      if (isDragging.type.includes('s')) {
        const boundedDy = Math.max(-(isDragging.startCrop.height - 5), Math.min(100 - isDragging.startCrop.y - isDragging.startCrop.height, dy));
        newCrop.height = isDragging.startCrop.height + boundedDy;
      }

      // Maintain Aspect Ratio if locked (Pixel-Perfect logic)
      if (aspect && imgRef.current) {
        const naturalRatio = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
        
        if (isDragging.type === 'n' || isDragging.type === 's') {
          // Sync width to height based on pixel scale
          const targetWidth = newCrop.height / naturalRatio;
          const deltaWidth = targetWidth - isDragging.startCrop.width;
          newCrop.x = Math.max(0, Math.min(100 - targetWidth, isDragging.startCrop.x - deltaWidth / 2));
          newCrop.width = targetWidth;
        } else if (isDragging.type === 'e' || isDragging.type === 'w') {
          // Sync height to width based on pixel scale
          const targetHeight = newCrop.width * naturalRatio;
          const deltaHeight = targetHeight - isDragging.startCrop.height;
          newCrop.y = Math.max(0, Math.min(100 - targetHeight, isDragging.startCrop.y - deltaHeight / 2));
          newCrop.height = targetHeight;
        } else {
          // Corners: Sync height to width
          newCrop.height = newCrop.width * naturalRatio;
          if (isDragging.type.includes('n')) {
            newCrop.y = isDragging.startCrop.y + (isDragging.startCrop.height - newCrop.height);
          }
        }
        
        // Safety clamp: If it exceeds bounds, shrink BOTH to fit the limit
        if (newCrop.x < 0) { newCrop.width += newCrop.x; newCrop.x = 0; newCrop.height = newCrop.width * naturalRatio; }
        if (newCrop.y < 0) { newCrop.height += newCrop.y; newCrop.y = 0; newCrop.width = newCrop.height / naturalRatio; }
        if (newCrop.x + newCrop.width > 100) { newCrop.width = 100 - newCrop.x; newCrop.height = newCrop.width * naturalRatio; }
        if (newCrop.y + newCrop.height > 100) { newCrop.height = 100 - newCrop.y; newCrop.width = newCrop.height / naturalRatio; }
      }
    }
    setCrop(newCrop);
  }, [isDragging, aspect]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Handle Manual Scale (from sliders)
  const handleManualResize = (dim: 'w' | 'h', val: number) => {
    setCrop(prev => {
      const centerX = prev.x + prev.width / 2;
      const centerY = prev.y + prev.height / 2;
      let nw = prev.width;
      let nh = prev.height;
      
      const naturalRatio = imgRef.current?.naturalWidth ? (imgRef.current.naturalWidth / imgRef.current.naturalHeight) : 1;
      
      if (dim === 'w') {
        nw = val;
        if (aspect) {
          // Pixel-perfect Sync (using source image ratio)
          nh = nw * naturalRatio;
        }
      } else {
        nh = val;
        if (aspect) {
          // Pixel-perfect Sync (using source image ratio)
          nw = nh / naturalRatio;
        }
      }
      
      return {
        x: Math.max(0, Math.min(100 - nw, centerX - nw / 2)),
        y: Math.max(0, Math.min(100 - nh, centerY - nh / 2)),
        width: Math.min(100, nw),
        height: Math.min(100, nh)
      };
    });
  };

  const handleSave = () => {
    if (!imgRef.current || !containerRef.current) return;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Output size resolution (high quality)
    const outputWidth = Math.max(512, Math.min(2048, img.naturalWidth));
    const outputHeight = aspect ? outputWidth / aspect : (outputWidth * (crop.height / crop.width));
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.save();
    
    // 1. Apply Filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // 2. Calculate source rect in pixels
    const sourceX = (crop.x / 100) * img.naturalWidth;
    const sourceY = (crop.y / 100) * img.naturalHeight;
    const sourceW = (crop.width / 100) * img.naturalWidth;
    const sourceH = (crop.height / 100) * img.naturalHeight;

    // 3. Transformations
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.save();
      tCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tCtx.rotate((rotation * Math.PI) / 180);
      tCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      tCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      tCtx.restore();
      
      ctx.drawImage(tempCanvas, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
    }

    ctx.restore();

    // 4. Return as Data URL (Base64) for maximum compatibility with state and storage
    const base64 = canvas.toDataURL('image/png', 0.95);
    onSave(base64);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100005] flex flex-col bg-[#111111] animate-in fade-in duration-300 overflow-hidden select-none">
      
      {/* Top Professional Header */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            <Scissors size={20} />
          </div>
          <h3 className="font-bold text-white text-sm tracking-tight opacity-90 uppercase tracking-[0.1em]">Editor de Recorte</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2.5 bg-[#00f2ea] hover:bg-[#00d8d1] text-[#090c19] rounded-lg text-sm font-bold transition-all shadow-lg shadow-[#00f2ea]/10 active:scale-95"
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Workspace Canvas Area */}
        <div className="flex-1 bg-black flex items-center justify-center p-12 relative overflow-hidden">
          <div 
            ref={containerRef}
            className="relative shadow-2xl flex items-center justify-center overflow-hidden bg-transparent"
            style={{
              maxHeight: '60vh',
              maxWidth: '100%',
              aspectRatio: imgRef.current ? `${imgRef.current.naturalWidth} / ${imgRef.current.naturalHeight}` : 'auto',
              transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Editor"
              onLoad={updateImageSize}
              className="max-w-full max-h-[60vh] lg:max-h-[70vh] object-contain select-none"
              style={{
                display: 'block',
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`
              }}
            />
            {/* Professional Crop Overlay */}
            {imageSize.width > 0 && (
              <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                {/* Dark Mask Overlay (Precision SVG System - NO BLUR) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-85">
                  <defs>
                    <mask id="crop-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect 
                        x={`${crop.x}%`} 
                        y={`${crop.y}%`} 
                        width={`${crop.width}%`} 
                        height={`${crop.height}%`} 
                        fill="black" 
                        rx={cropShape === 'circle' ? "500" : cropShape === 'rounded' ? "25%" : "0"} 
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="#000000" mask="url(#crop-mask)" />
                </svg>
 
                {/* THE CROP BOX (Interactable) */}
                <div 
                  className="absolute pointer-events-auto cursor-move border-[2px] border-[#00f2ea]/40"
                  style={{ 
                    left: `${crop.x}%`, 
                    top: `${crop.y}%`, 
                    width: `${crop.width}%`, 
                    height: `${crop.height}%`,
                    borderRadius: cropShape === 'circle' ? '50%' : cropShape === 'rounded' ? '25%' : '0' 
                  }}
                  onPointerDown={(e) => handlePointerDown('move', e)}
                >
                  {/* Grid Lines 3x3 */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
 
                  {/* HIGH-FIDELITY L-HANDLES (Corners) */}
                  {/* Top-Left */}
                  <div className="absolute -top-[14px] -left-[14px] w-12 h-12 pointer-events-auto cursor-nw-resize flex items-center justify-center group" 
                    onPointerDown={(e) => handlePointerDown('nw', e)}
                  >
                    <div className="absolute top-3 left-3 w-8 h-[6px] bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] group-active:scale-125 transition-transform" />
                    <div className="absolute top-3 left-3 w-[6px] h-8 bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] group-active:scale-125 transition-transform" />
                  </div>
                  {/* Top-Right */}
                  <div className="absolute -top-[14px] -right-[14px] w-12 h-12 pointer-events-auto cursor-ne-resize flex items-center justify-center group" 
                    onPointerDown={(e) => handlePointerDown('ne', e)}
                  >
                    <div className="absolute top-3 right-3 w-8 h-[6px] bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] group-active:scale-125 transition-transform" />
                    <div className="absolute top-3 right-3 w-[6px] h-8 bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] group-active:scale-125 transition-transform" />
                  </div>
                  {/* Bottom-Left */}
                  <div className="absolute -bottom-[14px] -left-[14px] w-12 h-12 pointer-events-auto cursor-sw-resize flex items-center justify-center group" 
                    onPointerDown={(e) => handlePointerDown('sw', e)}
                  >
                    <div className="absolute bottom-3 left-3 w-8 h-[6px] bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] group-active:scale-125 transition-transform" />
                    <div className="absolute bottom-3 left-3 w-[6px] h-8 bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] group-active:scale-125 transition-transform" />
                  </div>
                  {/* Bottom-Right */}
                  <div className="absolute -bottom-[14px] -right-[14px] w-12 h-12 pointer-events-auto cursor-se-resize flex items-center justify-center group" 
                    onPointerDown={(e) => handlePointerDown('se', e)}
                  >
                    <div className="absolute bottom-3 right-3 w-8 h-[6px] bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] group-active:scale-125 transition-transform" />
                    <div className="absolute bottom-3 right-3 w-[6px] h-8 bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] group-active:scale-125 transition-transform" />
                  </div>
 
                  {/* BAR HANDLES (Edges) */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 w-12 h-8 cursor-n-resize pointer-events-auto flex items-start justify-center group" 
                    onPointerDown={(e) => handlePointerDown('n', e)}
                  >
                    <div className="w-8 h-[6px] bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] mt-3 group-active:scale-x-125 transition-transform" />
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -mb-4 w-12 h-8 cursor-s-resize pointer-events-auto flex items-end justify-center group" 
                    onPointerDown={(e) => handlePointerDown('s', e)}
                  >
                    <div className="w-8 h-[6px] bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] mb-3 group-active:scale-x-125 transition-transform" />
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 w-8 h-12 cursor-w-resize pointer-events-auto flex items-center justify-start group" 
                    onPointerDown={(e) => handlePointerDown('w', e)}
                  >
                    <div className="w-[6px] h-8 bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] ml-3 group-active:scale-y-125 transition-transform" />
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 w-8 h-12 cursor-e-resize pointer-events-auto flex items-center justify-end group" 
                    onPointerDown={(e) => handlePointerDown('e', e)}
                  >
                    <div className="w-[6px] h-8 bg-[#00f2ea] rounded-full shadow-[0_0_15px_rgba(0,242,234,0.6)] mr-3 group-active:scale-y-125 transition-transform" />
                  </div>
 
                  {/* Resolution Badge */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className="px-4 py-1.5 bg-black/90 backdrop-blur-3xl rounded-md border border-white/20 text-[11px] font-bold text-white tracking-widest whitespace-nowrap shadow-2xl">
                      {resolution.w} x {resolution.h}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM CONTROLS - Pro Double Controls */}
        <div className="h-64 bg-[#1a1a1a] border-t border-white/5 flex flex-col items-center justify-center space-y-4 px-12">
          
          <div className="w-full max-w-lg space-y-4">
            {/* Rotation Ruler */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rotação: {rotation}°</span>
              <div className="relative w-full h-8 overflow-hidden flex items-center group cursor-ew-resize">
                <input 
                  type="range" min="-45" max="45" value={rotation} 
                  onChange={e => setRotation(Number(e.target.value))}
                  className="absolute inset-0 z-20 opacity-0 cursor-ew-resize"
                />
                <div className="w-full flex justify-between items-end px-1 opacity-40 group-hover:opacity-100 transition-opacity">
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`bg-white rounded-full ${i === 15 ? 'h-6 w-[2px] bg-[#00f2ea]' : (i % 5 === 0 ? 'h-4 w-[1px]' : 'h-2 w-[1px] opacity-50')}`} 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Scale Sliders */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                  <span>Largura</span>
                  <span>{Math.round(crop.width)}%</span>
                </div>
                <input 
                  type="range" min="10" max="100" value={crop.width} 
                  onChange={(e) => handleManualResize('w', Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-full appearance-none accent-[#00f2ea]"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                  <span>Altura</span>
                  <span>{Math.round(crop.height)}%</span>
                </div>
                <input 
                  type="range" min="10" max="100" value={crop.height} 
                  onChange={(e) => handleManualResize('h', Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-full appearance-none accent-[#00f2ea]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-12 pt-2">
            <div className="flex bg-white/5 rounded-xl p-1 gap-1">
              <button 
                onClick={() => { 
                  setCropShape('circle'); 
                  setAspect(1);
                  // Force a centered square visually
                  if (imgRef.current) {
                    const rect = imgRef.current.getBoundingClientRect();
                    const size = 50; // default 50% height
                    const wPercent = (size * rect.height) / rect.width;
                    setCrop({ x: (100 - wPercent) / 2, y: (100 - size) / 2, width: wPercent, height: size });
                  }
                }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cropShape === 'circle' ? 'bg-[#00f2ea] text-[#090c19] shadow-lg shadow-[#00f2ea]/20' : 'text-gray-500 hover:text-white'}`}
                title="Corte Circular"
              >
                <div className={`w-3 h-3 rounded-full border-2 ${cropShape === 'circle' ? 'border-[#090c19]' : 'border-gray-500'}`} />
                Redondo
              </button>
              <button 
                onClick={() => { 
                  setCropShape('rounded'); 
                  setAspect(1);
                  if (imgRef.current) {
                    const rect = imgRef.current.getBoundingClientRect();
                    const size = 50; 
                    const wPercent = (size * rect.height) / rect.width;
                    setCrop({ x: (100 - wPercent) / 2, y: (100 - size) / 2, width: wPercent, height: size });
                  }
                }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cropShape === 'rounded' ? 'bg-[#00f2ea] text-[#090c19] shadow-lg shadow-[#00f2ea]/20' : 'text-gray-500 hover:text-white'}`}
                title="Corte Arredondado"
              >
                <div className={`w-3 h-3 rounded-[3px] border-2 ${cropShape === 'rounded' ? 'border-[#090c19]' : 'border-gray-500'}`} />
                Arredondado
              </button>
              <button 
                onClick={() => { 
                  setCropShape('square'); 
                  setAspect(1);
                  if (imgRef.current) {
                    const rect = imgRef.current.getBoundingClientRect();
                    const size = 50; 
                    const wPercent = (size * rect.height) / rect.width;
                    setCrop({ x: (100 - wPercent) / 2, y: (100 - size) / 2, width: wPercent, height: size });
                  }
                }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cropShape === 'square' ? 'bg-[#00f2ea] text-[#090c19] shadow-lg shadow-[#00f2ea]/20' : 'text-gray-500 hover:text-white'}`}
                title="Corte Quadrado"
              >
                <div className={`w-3 h-3 rounded-[1px] border-2 ${cropShape === 'square' ? 'border-[#090c19]' : 'border-gray-500'}`} />
                Quadrado
              </button>
              <button 
                onClick={() => { setCropShape('free'); setAspect(undefined); }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cropShape === 'free' ? 'bg-[#00f2ea] text-[#090c19] shadow-lg shadow-[#00f2ea]/20' : 'text-gray-500 hover:text-white'}`}
                title="Corte Livre"
              >
                <Scissors size={14} className={cropShape === 'free' ? 'text-[#090c19]' : 'text-gray-500'} />
                Livre
              </button>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setFlipH(!flipH)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                <FlipHorizontal size={18} />
              </button>
              <button onClick={() => setFlipV(!flipV)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                <FlipVertical size={18} />
              </button>
              <button onClick={() => {
                setRotation(0); setFlipH(false); setFlipV(false);
                setCrop({ x: 10, y: 10, width: 80, height: 80 });
              }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- Image Viewer (Carousel/Lightbox) ---
interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  startIndex?: number;
}

export const ImageViewer: React.FC<ImageViewerProps & { resolvePhoto?: (id: string) => Promise<string | null> }> = ({ isOpen, onClose, images, startIndex = 0, resolvePhoto }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);

  // Reset index when component opens or images change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
      setShowDownloadOptions(false);
    }
  }, [isOpen, startIndex]);

  // Resolve Photo URL
  useEffect(() => {
    if (!isOpen) return;

    const currentSrc = images[currentIndex];
    if (!currentSrc) return;

    if (currentSrc.startsWith('ph_') && resolvePhoto) {
      setIsLoading(true);
      resolvePhoto(currentSrc)
        .then(url => {
          setResolvedUrl(url);
        })
        .catch(err => {
          console.error("Error resolving photo:", err);
          setResolvedUrl(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setResolvedUrl(currentSrc);
      setIsLoading(false);
    }
  }, [currentIndex, images, isOpen, resolvePhoto]);

  const goToNext = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }
  }, [images.length]);

  const goToPrev = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    }
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, goToNext, goToPrev, onClose]);

  // Helper: Download Single Image
  const downloadImage = async (url: string, index: number) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `apostas-pro-proof-${Date.now()}-${index + 1}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback
      if (!url.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = url;
        link.target = "_blank";
        link.download = `download-${index}.webp`;
        link.click();
      }
    }
  };

  // Download Handler Wrapper
  const handleDownloadClick = () => {
    if (images.length > 1) {
      setShowDownloadOptions(!showDownloadOptions);
    } else {
      if (resolvedUrl) downloadImage(resolvedUrl, 0);
    }
  };

  const handleDownloadAll = async () => {
    setShowDownloadOptions(false);
    // Sequential download to avoid browser blocking
    // Note: This relies on resolving all images which might be tricky if not currently viewed.
    // For now, we only support downloading the current one reliably if it's a Firestore ID.
    // Ideally we would resolve all of them, but let's just loop and try.
    // If resolvePhoto is needed for others, we might fail. 
    // Simplified: Just try to download what we have in images array if simpler, or warn.

    // Better approach: Iterate and resolve if needed
    for (let i = 0; i < images.length; i++) {
      let url = images[i];
      if (url.startsWith('ph_') && resolvePhoto) {
        url = await resolvePhoto(url) || '';
      }
      if (url) {
        await downloadImage(url, i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleDownloadCurrent = () => {
    setShowDownloadOptions(false);
    if (resolvedUrl) downloadImage(resolvedUrl, currentIndex);
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchCurrent(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchCurrent(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart !== null && touchCurrent !== null) {
      const diff = touchStart - touchCurrent;
      const threshold = 50; // px

      if (diff > threshold) {
        goToNext();
      } else if (diff < -threshold) {
        goToPrev();
      }
    }
    setTouchStart(null);
    setTouchCurrent(null);
  };

  // Calculate dragging visual offset
  const translateX = (touchStart !== null && touchCurrent !== null) ? (touchCurrent - touchStart) : 0;

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100002] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Header with Counter, Download and Close Button */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 text-white z-50 pointer-events-none">
        <div className="font-mono text-sm sm:text-lg bg-black/40 backdrop-blur px-3 py-1 rounded-lg pointer-events-auto">
          {currentIndex + 1} / {images.length}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto relative">
          <button
            onClick={(e) => { e.stopPropagation(); handleDownloadClick(); }}
            className={`p-2 sm:p-2.5 backdrop-blur rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white ${showDownloadOptions ? 'bg-white/20 text-white' : 'bg-black/40'}`}
            title="Baixar Imagem"
          >
            <Download size={20} className="sm:w-6 sm:h-6" />
          </button>

          {/* Download Options Menu */}
          {showDownloadOptions && (
            <div className="absolute top-full right-12 mt-2 w-48 bg-[#151b2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100003]">
              <button
                onClick={(e) => { e.stopPropagation(); handleDownloadCurrent(); }}
                className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2"
              >
                <Download size={14} /> Baixar Atual
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownloadAll(); }}
                className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2 border-t border-white/5"
              >
                <Box size={14} /> Baixar Todas ({images.length})
              </button>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 sm:p-2.5 bg-black/40 backdrop-blur rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white"
          >
            <X size={24} className="sm:w-8 sm:h-8" />
          </button>
        </div>
      </div>

      {/* Main Content Area - Swipeable */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          if (showDownloadOptions) setShowDownloadOptions(false);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous Button (Always Visible now per user request) */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-black/30 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all z-40 flex group"
          >
            <ChevronLeft size={28} className="text-white/70 group-hover:text-white" />
          </button>
        )}

        {/* Image Container with Transform */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(${translateX}px)`,
            cursor: images.length > 1 ? 'grab' : 'default'
          }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-primary animate-pulse">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold uppercase tracking-wider">Carregando...</span>
            </div>
          ) : (
            <img
              src={resolvedUrl || ''}
              alt={`View ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain shadow-2xl select-none"
              style={{
                maxWidth: '100%',
                maxHeight: '100dvh' // Dynamic viewport height for mobile address bars
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Next Button (Always Visible now per user request) */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-black/30 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all z-40 flex group"
          >
            <ChevronRight size={28} className="text-white/70 group-hover:text-white" />
          </button>
        )}
      </div>

      {/* Mobile Swipe Indicator / Hint */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase font-bold tracking-widest sm:hidden pointer-events-none animate-pulse">
          Arraste ou use as setas
        </div>
      )}
    </div>,
    document.body
  );
};

export const DateRangePickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onSelect: (start: Date, end: Date) => void;
}> = ({ isOpen, onClose, startDate, endDate, onSelect }) => {
  const [start, setStart] = useState(startDate.toISOString().split('T')[0]);
  const [end, setEnd] = useState(endDate.toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      setStart(startDate.toISOString().split('T')[0]);
      setEnd(endDate.toISOString().split('T')[0]);
    }
  }, [isOpen, startDate, endDate]);

  const handleSave = () => {
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    onSelect(new Date(sy, sm - 1, sd), new Date(ey, em - 1, ed));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Selecionar Período" zIndex={100000}>
      <div className="space-y-4">
        <Input
          type="date"
          label="Data Inicial"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <Input
          type="date"
          label="Data Final"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="neutral" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Aplicar</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- Custom Calendar ---
const Calendar: React.FC<{
  selectedDate: Date;
  onChange: (date: Date) => void;
}> = ({ selectedDate, onChange }) => {
  const [viewDate, setViewDate] = useState(selectedDate);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day, 12, 0, 0);
    const isSelected = date.toDateString() === selectedDate.toDateString();
    const isToday = date.toDateString() === new Date().toDateString();

    days.push(
      <button
        key={day}
        onClick={() => onChange(date)}
        className={`
          h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all
          ${isSelected ? 'bg-primary text-[#090c19] font-bold shadow-lg shadow-primary/25' : 'text-gray-300 hover:bg-white/10 hover:text-white'}
          ${isToday && !isSelected ? 'border border-primary/50 text-primary' : ''}
        `}
      >
        {day}
      </button>
    );
  }

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="bg-[#0d1121] border border-white/5 rounded-xl p-4 select-none">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="font-bold text-white capitalize">{months[month]} {year}</span>
        <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-gray-500">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 place-items-center">
        {days}
      </div>
    </div>
  );
};

export const SingleDatePickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  onSelect: (date: Date) => void;
}> = ({ isOpen, onClose, date, onSelect }) => {
  const [selectedDate, setSelectedDate] = useState(date);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(date);
    }
  }, [isOpen, date]);

  const handleSave = () => {
    onSelect(selectedDate);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Selecionar Data" zIndex={100000}>
      <div className="space-y-4">
        <Calendar selectedDate={selectedDate} onChange={setSelectedDate} />
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/5">
          <Button variant="neutral" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Confirmar Data</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- Bookmaker Logo (Premium Squircle Design) ---
export const BookmakerLogo: React.FC<{
  logo?: string;
  name?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ logo, name, color = '#334155', size = 'md', className = '' }) => {
  const initials = name?.substring(0, 2).toUpperCase() || '??';
  
  const sizes = {
    xs: 'w-5 h-5 rounded-[4px] text-[8px]',
    sm: 'w-6 h-6 rounded-[6px] text-[9px]',
    md: 'w-10 h-10 rounded-[10px] text-[13px]',
    lg: 'w-14 h-14 rounded-[14px] text-[16px]'
  };

  return (
    <div
      className={`${sizes[size]} flex items-center justify-center font-black text-white shrink-0 relative group/bookie ring-1 ring-white/10 overflow-hidden shadow-sm ${className}`}
      style={{ 
        backgroundColor: color,
        boxShadow: `0 4px 12px ${color}40, inset 0 1px 2px rgba(255,255,255,0.15)` 
      }}
    >
      {/* 3D Glass / Glossy Overlay */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30 pointer-events-none z-30" />
      
      {logo ? (
        <>
          {/* Mirror Reflection Background (High Fidelity) */}
          <img 
            src={logo} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover blur-xl opacity-100 scale-150 saturate-150 brightness-110 pointer-events-none z-10" 
          />
          {/* Main Logo Layer (No Zoom/Crop) */}
          <img 
            src={logo} 
            alt={initials} 
            className="relative z-20 w-full h-full object-contain p-[12%] drop-shadow-2xl transition-all duration-500 group-hover/bookie:scale-110" 
          />
        </>
      ) : (
        <span className="relative z-20 drop-shadow-md uppercase text-center w-full px-0.5 truncate">{initials}</span>
      )}

      {/* Subtle Inner Glow Border */}
      <div className="absolute inset-0 border border-white/10 rounded-inherit pointer-events-none z-30" />
    </div>
  );
};
