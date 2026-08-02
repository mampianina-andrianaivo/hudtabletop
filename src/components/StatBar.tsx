import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Stat, usePlayerStore } from '@/store/usePlayerStore';
import { useTheme } from '@/lib/useTheme';

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
    isVerticalMode?: boolean;
  };
  statBoostModeProps?: {
    isSelectingForBoost: boolean;
    isSelectedForBoost: boolean;
    onSelectForBoost: () => void;
    onConfirmBoost: () => void;
    isVerticalMode?: boolean;
  };
}

const nameSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
const valueSizes = ['text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];

export function StatBar({ stat, onChange, isFreeEdit, targetModeProps, statBoostModeProps }: StatBarProps) {
  const { theme } = useTheme();
  const isSciFi = theme === 'scifi';
  const max = 12;
  const percentage = Math.min(100, Math.max(0, (stat.current / max) * 100));
  const textSizeLevel = usePlayerStore(state => state.textSizeLevel);
  const barHeight = usePlayerStore(state => state.barHeight) ?? 10;

  const isAtMax = stat.current >= max;

  return (
    <div className="flex flex-col mb-1.5">
      <div className="flex justify-between items-center mb-0.5 px-1 h-7">
        {statBoostModeProps?.isSelectingForBoost ? (
          <div className="flex items-center gap-1.5 h-full">
            {!isAtMax ? (
              <button
                onClick={statBoostModeProps.onSelectForBoost}
                className={cn(
                  "rounded px-1.5 py-0.5 border text-left transition-colors duration-200 cursor-pointer select-none inline-flex items-center h-6 box-border",
                  isSciFi ? "font-bold uppercase tracking-wider text-xs" : "font-macondo",
                  nameSizes[textSizeLevel] || 'text-xs',
                  statBoostModeProps.isSelectedForBoost
                    ? "bg-purple-700 text-white border-purple-300 font-bold shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                    : "bg-purple-950/90 text-purple-200 border-purple-500 hover:bg-purple-900 hover:text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                )}
              >
                {stat.name}
              </button>
            ) : (
              <span className={cn("text-gray-500 rounded px-1.5 py-0.5 border border-transparent select-none opacity-60 inline-flex items-center h-6 box-border", isSciFi ? "font-bold uppercase tracking-wider text-xs" : "font-macondo", nameSizes[textSizeLevel] || 'text-xs')}>
                {stat.name} (MAX)
              </span>
            )}

            <div className="w-6 h-6 shrink-0 flex items-center justify-center">
              {!isAtMax && statBoostModeProps.isSelectedForBoost && !statBoostModeProps.isVerticalMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    statBoostModeProps.onConfirmBoost();
                  }}
                  className="w-full h-full rounded bg-green-800 hover:bg-green-700 text-white border border-green-600 transition-colors flex items-center justify-center cursor-pointer shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  title="Confirmer l'augmentation de la stat (+1)"
                >
                  <Check size={14} className="stroke-[3]" />
                </button>
              )}
            </div>
          </div>
        ) : targetModeProps?.isSelectingTarget ? (
          <div className="flex items-center gap-1.5 h-full">
            <button
              onClick={targetModeProps.onSelectTarget}
              className={cn(
                "rounded px-1.5 py-0.5 border text-left transition-colors duration-200 cursor-pointer select-none inline-flex items-center h-6 box-border",
                isSciFi ? "font-bold uppercase tracking-wider text-xs" : "font-macondo",
                nameSizes[textSizeLevel] || 'text-xs',
                targetModeProps.isSelected
                  ? "bg-green-950/80 text-green-300 border-green-800 hover:bg-green-900 hover:text-white"
                  : "bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900 hover:text-white"
              )}
            >
              {stat.name}
            </button>
            <div className="w-6 h-6 shrink-0 flex items-center justify-center">
              {targetModeProps.isSelected && !targetModeProps.isVerticalMode && (
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
          <div className="flex items-center gap-1.5 h-full">
            <span className={cn(
              "px-1.5 py-0.5 select-none inline-flex items-center h-6 box-border border border-transparent",
              isSciFi
                ? "text-cyan-300 font-bold uppercase tracking-wider text-xs border-l-2 border-l-cyan-400 pl-2 bg-cyan-950/30"
                : "font-macondo text-white",
              nameSizes[textSizeLevel] || 'text-xs'
            )}>
              {stat.name}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {isFreeEdit && (
          <button 
            onClick={() => onChange(-1)}
            className={cn(
              "w-5 h-5 flex items-center justify-center shrink-0 transition-colors cursor-pointer",
              isSciFi
                ? "bg-slate-950 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-900 hover:text-white shadow-[0_0_6px_rgba(6,182,212,0.4)]"
                : "bg-iron border border-[#5a4b3c] text-white hover:text-white rounded-sm"
            )}
          >
            <Minus size={12} />
          </button>
        )}
        
        <div 
          className={cn(
            "flex-1 relative overflow-hidden flex",
            isSciFi
              ? "bg-slate-950 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
              : "bg-black/60 border border-[#3b2c19] rounded-sm"
          )}
          style={{ height: `${barHeight}px` }}
        >
          {/* Segments for stats since max is 12 */}
          {Array.from({ length: max }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "flex-1 transition-colors duration-200 relative",
                isSciFi
                  ? i < stat.current
                    ? "bg-gradient-to-t from-cyan-600 via-sky-400 to-cyan-300 border-r border-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                    : "bg-slate-900/80 border-r border-cyan-950/60"
                  : i < stat.current
                    ? "bg-wow-gold border-r border-black/50 last:border-r-0 shadow-[0_0_5px_rgba(255,209,0,0.5)]"
                    : "bg-transparent border-r border-black/50 last:border-r-0"
              )}
            >
              {isSciFi && i < stat.current && (
                <div className="absolute top-0 inset-x-0 h-1/2 bg-white/30 pointer-events-none"></div>
              )}
            </div>
          ))}
        </div>

        {/* Golden / Cyan stat value with reserved 2 digit space */}
        <span className={cn(
          "font-mono font-bold text-center w-8 shrink-0 select-none",
          isSciFi ? "text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" : "text-wow-gold",
          valueSizes[textSizeLevel] || 'text-base'
        )}>
          {stat.current}
        </span>

        {isFreeEdit && (
          <button 
            onClick={() => onChange(1)}
            className={cn(
              "w-5 h-5 flex items-center justify-center shrink-0 transition-colors cursor-pointer",
              isSciFi
                ? "bg-slate-950 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-900 hover:text-white shadow-[0_0_6px_rgba(6,182,212,0.4)]"
                : "bg-iron border border-[#5a4b3c] text-white hover:text-white rounded-sm"
            )}
          >
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

