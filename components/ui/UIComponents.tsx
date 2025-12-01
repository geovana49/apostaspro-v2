
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check, ZoomIn, RotateCcw, Move, Crop, Pipette, ChevronUp, Gamepad2, Trophy, Star, Zap, Gift, Coins, Briefcase, Ghost, Box, Banknote, CreditCard, Smartphone, Target, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div
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
);

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
}

export const Input: React.FC<InputProps> = ({ label, icon, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2">{label}</label>}
    <div className="relative group">
      {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110 group-focus-within:-rotate-6">{icon}</div>}
      <input
        className={`w-full bg-[#0d1121] border border-white/10 focus:border-primary/50 text-white rounded-lg py-2.5 ${icon ? 'pl-10' : 'px-4'} placeholder-gray-600 focus:outline-none transition-all duration-200 text-sm focus:ring-1 focus:ring-primary/50 hover:border-white/20 shadow-inner ${className}`}
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
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    bottom?: number;
    placement: 'top' | 'bottom';
    maxHeight: number;
  }>({ top: 0, left: 0, width: 0, placement: 'bottom', maxHeight: 300 });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update position with collision detection
  const updatePosition = () => {
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

  // Close on resize or scroll to keep position correct
  useEffect(() => {
    const handleScrollOrResize = (e: Event) => {
      // Fix: Do not close if scrolling inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
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
      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: coords.left,
            width: coords.width,
            zIndex: 999999,
            ...(coords.placement === 'bottom'
              ? { top: coords.top }
              : { bottom: coords.bottom }
            ),
            maxHeight: coords.maxHeight
          }}
          className={`
                    bg-[#151b2e] border border-white/10 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,1)] 
                    overflow-hidden flex flex-col
                    animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5
                    ${coords.placement === 'top' ? 'origin-bottom' : 'origin-top'}
                `}
        >
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
        </div>,
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
      <div className="absolute inset-0 bg-[#090c19]/80 backdrop-blur-md transition-opacity" onClick={onClose} />
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

  if (iconSource.startsWith('data:') || iconSource.startsWith('http') || iconSource.includes('/')) {
    return <img src={iconSource} alt="icon" className={`object-contain ${className}`} style={{ width: size, height: size }} />;
  }

  const IconComp = ICON_MAP[iconSource] || Star;
  return <IconComp size={size} className={className} />;
};

// --- Image Adjuster ---
interface ImageAdjusterProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (newImage: Blob | null) => void;
  aspect?: number; // Desired aspect ratio (width/height). Default 1 (square).
}

export const ImageAdjuster: React.FC<ImageAdjusterProps> = ({ isOpen, imageSrc, onClose, onSave, aspect = 1 }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setStartPos({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({ x: clientX - startPos.x, y: clientY - startPos.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize / aspect;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const uiViewportSize = 280;
    const ratio = outputSize / uiViewportSize;

    ctx.translate(position.x * ratio, position.y * ratio);

    const img = imgRef.current;
    const imgAspect = img.naturalWidth / img.naturalHeight;

    const drawWidth = canvas.width;
    const drawHeight = drawWidth / imgAspect;

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();

    canvas.toBlob((blob) => {
      onSave(blob);
    }, 'image/png', 0.9);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#151b2e] border border-white/10 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2"><Crop size={16} /> Ajustar Imagem</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
          {/* Viewport */}
          <div
            className="relative overflow-hidden bg-black/50 border-2 border-dashed border-white/20 cursor-move rounded-lg touch-none"
            style={{ width: '280px', height: `${280 / aspect}px` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onMouseLeave={handleMouseUp}
            ref={containerRef}
          >
            {/* Grid overlay for reference */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-30">
              <div className="w-full h-1/3 border-b border-white/50 absolute top-0" />
              <div className="w-full h-1/3 border-b border-white/50 absolute bottom-0" />
              <div className="h-full w-1/3 border-r border-white/50 absolute left-0" />
              <div className="h-full w-1/3 border-r border-white/50 absolute right-0" />
            </div>

            <img
              ref={imgRef}
              src={imageSrc}
              alt="To Crop"
              className="absolute max-w-[280px] select-none pointer-events-none"
              style={{
                top: '50%', left: '50%',
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: 'center'
              }}
            />
          </div>

          {/* Controls */}
          <div className="w-full space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                <span className="flex items-center gap-1"><ZoomIn size={12} /> Zoom</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                <span className="flex items-center gap-1"><RotateCcw size={12} /> Rotação</span>
                <span>{rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
              <Move size={10} /> Arraste a imagem para posicionar
            </div>
          </div>

          <div className="flex w-full gap-3 pt-2">
            <Button variant="neutral" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} className="flex-1">Salvar Ajuste</Button>
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

export const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, onClose, images, startIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  // Reset index when component opens or images change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
    }
  }, [isOpen, startIndex]);

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

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100002] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Header with Counter and Close Button */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 text-white z-20">
        <div className="font-mono text-lg bg-black/30 px-3 py-1 rounded-lg">
          {currentIndex + 1} / {images.length}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 bg-black/30 rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-black/30 rounded-full hover:bg-white/20 transition-colors z-20"
          >
            <ChevronLeft size={28} className="text-white" />
          </button>
        )}

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={images[currentIndex]}
            alt={`View ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 select-none"
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-black/30 rounded-full hover:bg-white/20 transition-colors z-20"
          >
            <ChevronRight size={28} className="text-white" />
          </button>
        )}
      </div>
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
