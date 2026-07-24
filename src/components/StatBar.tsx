import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Stat, usePlayerStore } from '@/store/usePlayerStore';

interface StatBarProps {
  stat: Stat;
  onChange: (delta: number) => void;
  isFreeEdit?: boolean;
  targetModeProps?: {
    isSelectingTarget: boolean;
    isSelected: boolean;
    isOtherSelected: boolean;
    onSelectTarget: () => void;
    onLaunchRoll?: () => void;
  };
}

const nameSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
const valueSizes = ['text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];

export function StatBar({ stat, onChange, isFreeEdit, targetModeProps }: StatBarProps) {
  const max = 12;
  const percentage = Math.min(100, Math.max(0, (stat.current / max) * 100));
  const textSizeLevel = usePlayerStore(state => state.textSizeLevel);
  const barHeight = usePlayerStore(state => state.barHeight) ?? 10;

  return (
    <div className="flex flex-col mb-1.5">
      <div className="flex justify-between items-center mb-0.5 px-1">
        {targetModeProps?.isSelectingTarget ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={targetModeProps.onSelectTarget}
              className={cn(
                "font-macondo rounded px-1.5 py-0.5 border text-left transition-colors duration-200 cursor-pointer select-none",
                nameSizes[textSizeLevel] || 'text-xs',
                targetModeProps.isSelected
                  ? "bg-green-950/80 text-green-300 border-green-800 hover:bg-green-900 hover:text-white"
                  : "bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900 hover:text-white"
              )}
            >
              {stat.name}
            </button>
            <div className="w-6 h-6 shrink-0 flex items-center justify-center">
              {targetModeProps.isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    targetModeProps.onLaunchRoll?.();
                  }}
                  className="w-full h-full rounded bg-green-800 hover:bg-green-700 text-white border border-green-600 transition-colors flex items-center justify-center cursor-pointer"
                  title="Roll D12 now!"
                >
                  <Check size={14} className="stroke-[3]" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <span className={cn("font-macondo text-white rounded px-1.5 py-0.5 border border-transparent", nameSizes[textSizeLevel] || 'text-xs')}>
            {stat.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {isFreeEdit && (
          <button 
            onClick={() => onChange(-1)}
            className="w-5 h-5 flex items-center justify-center bg-iron border border-[#5a4b3c] text-white hover:text-white rounded-sm shrink-0 transition-colors"
          >
            <Minus size={12} />
          </button>
        )}
        
        <div 
          className="flex-1 bg-black/60 border border-[#3b2c19] rounded-sm relative overflow-hidden flex"
          style={{ height: `${barHeight}px` }}
        >
          {/* Segments for stats since max is 12 */}
          {Array.from({ length: max }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "flex-1 border-r border-black/50 last:border-r-0 transition-colors duration-200",
                i < stat.current ? "bg-wow-gold shadow-[0_0_5px_rgba(255,209,0,0.5)]" : "bg-transparent"
              )}
            ></div>
          ))}
        </div>

        {/* Golden stat value with reserved 2 digit space */}
        <span className={cn("font-mono font-bold text-wow-gold text-center w-8 shrink-0 select-none", valueSizes[textSizeLevel] || 'text-base')}>
          {stat.current}
        </span>

        {isFreeEdit && (
          <button 
            onClick={() => onChange(1)}
            className="w-5 h-5 flex items-center justify-center bg-iron border border-[#5a4b3c] text-white hover:text-white rounded-sm shrink-0 transition-colors"
          >
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
