import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Stat, usePlayerStore } from '@/store/usePlayerStore';

interface StatBarProps {
  stat: Stat;
  onChange: (delta: number) => void;
}

const nameSizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];
const valueSizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];

export function StatBar({ stat, onChange }: StatBarProps) {
  const max = 12;
  const percentage = Math.min(100, Math.max(0, (stat.current / max) * 100));
  const textSizeLevel = usePlayerStore(state => state.textSizeLevel);

  return (
    <div className="flex flex-col mb-1.5">
      <div className="flex justify-between items-end mb-0.5 px-1">
        <span className={cn("font-macondo text-gray-200", nameSizes[textSizeLevel] || 'text-xs')}>{stat.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={() => onChange(-1)}
          className="w-5 h-5 flex items-center justify-center bg-iron border border-[#5a4b3c] text-gray-400 hover:text-white rounded-sm shrink-0 transition-colors"
        >
          <Minus size={12} />
        </button>
        
        <div className="flex-1 h-2.5 bg-black/60 border border-[#3b2c19] rounded-sm relative overflow-hidden flex">
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
        <span className={cn("font-mono font-bold text-wow-gold text-center w-6 shrink-0 select-none", valueSizes[textSizeLevel] || 'text-xs')}>
          {stat.current}
        </span>

        <button 
          onClick={() => onChange(1)}
          className="w-5 h-5 flex items-center justify-center bg-iron border border-[#5a4b3c] text-gray-400 hover:text-white rounded-sm shrink-0 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
