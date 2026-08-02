import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn, parseMax } from '@/lib/utils';
import { Resource, usePlayerStore } from '@/store/usePlayerStore';
import { useTheme } from '@/lib/useTheme';

interface ResourceBarProps {
  resource: Resource;
  onChange: (delta: number) => void;
}

const colorClasses: Record<string, string> = {
  red: 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]',
  blue: 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]',
  purple: 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.8)]',
  yellow: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]',
  green: 'bg-green-600 shadow-[0_0_10px_rgba(22,163,74,0.8)]'
};

const scifiColorClasses: Record<string, string> = {
  red: 'bg-gradient-to-r from-red-700 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(244,63,94,0.9)]',
  blue: 'bg-gradient-to-r from-cyan-700 via-sky-400 to-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.9)]',
  purple: 'bg-gradient-to-r from-purple-700 via-fuchsia-500 to-pink-400 shadow-[0_0_12px_rgba(217,70,239,0.9)]',
  yellow: 'bg-gradient-to-r from-amber-700 via-yellow-400 to-lime-300 shadow-[0_0_12px_rgba(245,158,11,0.9)]',
  green: 'bg-gradient-to-r from-emerald-700 via-green-400 to-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.9)]'
};

const nameSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
const valueSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];

export function ResourceBar({ resource, onChange, isFreeEdit }: ResourceBarProps & { isFreeEdit?: boolean }) {
  const { theme } = useTheme();
  const isSciFi = theme === 'scifi';
  const max = parseMax(resource.max) || 1; // avoid division by zero
  const percentage = Math.min(100, Math.max(0, (resource.current / max) * 100));
  const textSizeLevel = usePlayerStore(state => state.textSizeLevel);
  const barHeight = usePlayerStore(state => state.barHeight) ?? 10;

  return (
    <div className="flex flex-col mb-1.5">
      <div className="flex justify-between items-end mb-0.5 px-1">
        <span className={cn(
          "leading-none",
          isSciFi
            ? "text-cyan-300 font-bold uppercase tracking-wider text-xs border-l-2 border-cyan-400 pl-2 bg-cyan-950/30"
            : "font-macondo text-wow-gold drop-shadow-md",
          nameSizes[textSizeLevel] || 'text-sm'
        )}>
          {resource.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "font-mono font-bold text-right leading-none min-w-16 shrink-0",
            isSciFi ? "text-cyan-200 drop-shadow-[0_0_5px_rgba(6,182,212,0.7)]" : "text-white",
            valueSizes[textSizeLevel] || 'text-xs'
          )}>
            {String(resource.current).padStart(3, ' ')} / {String(resource.max).padStart(3, ' ')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isFreeEdit && (
          <button 
            onClick={() => onChange(-1)}
            className={cn(
              "w-5 h-5 flex items-center justify-center shrink-0 cursor-pointer transition-colors",
              isSciFi
                ? "bg-slate-950 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-900 hover:text-white shadow-[0_0_6px_rgba(6,182,212,0.4)]"
                : "wow-button rounded-full"
            )}
          >
            <Minus size={12} />
          </button>
        )}
        
        <div 
          className={cn(
            "flex-1 relative overflow-hidden",
            isSciFi
              ? "bg-slate-950 border border-cyan-500/50 shadow-[inset_0_0_8px_rgba(0,0,0,0.9),0_0_8px_rgba(6,182,212,0.15)]"
              : "bg-wow-dark border border-[#5a4b3c] rounded-sm"
          )}
          style={{ height: `${barHeight}px` }}
        >
          {/* Inner shadow / background texture */}
          {!isSciFi && <div className="absolute inset-0 opacity-50"></div>}
          
          {/* Progress fill */}
          <div 
            className={cn(
              "h-full transition-all duration-300 relative",
              isSciFi
                ? (scifiColorClasses[resource.color] || scifiColorClasses.blue)
                : (colorClasses[resource.color] || colorClasses.blue)
            )}
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/25 w-full h-1/3"></div>
          </div>
        </div>

        {isFreeEdit && (
          <button 
            onClick={() => onChange(1)}
            className={cn(
              "w-5 h-5 flex items-center justify-center shrink-0 cursor-pointer transition-colors",
              isSciFi
                ? "bg-slate-950 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-900 hover:text-white shadow-[0_0_6px_rgba(6,182,212,0.4)]"
                : "wow-button rounded-full"
            )}
          >
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

