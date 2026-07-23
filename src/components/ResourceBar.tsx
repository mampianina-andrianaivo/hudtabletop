import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn, parseMax } from '@/lib/utils';
import { Resource, usePlayerStore } from '@/store/usePlayerStore';

interface ResourceBarProps {
  resource: Resource;
  onChange: (delta: number) => void;
}

const colorClasses: Record<string, string> = {
  red: 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]',
  blue: 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]',
  purple: 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.8)]',
  yellow: 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.8)]',
  green: 'bg-green-600 shadow-[0_0_10px_rgba(22,163,74,0.8)]'
};

const nameSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
const valueSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];

export function ResourceBar({ resource, onChange, isFreeEdit }: ResourceBarProps & { isFreeEdit?: boolean }) {
  const max = parseMax(resource.max) || 1; // avoid division by zero
  const percentage = Math.min(100, Math.max(0, (resource.current / max) * 100));
  const textSizeLevel = usePlayerStore(state => state.textSizeLevel);

  return (
    <div className="flex flex-col mb-1.5">
      <div className="flex justify-between items-end mb-0.5 px-1">
        <span className={cn("font-macondo text-wow-gold drop-shadow-md leading-none", nameSizes[textSizeLevel] || 'text-sm')}>{resource.name}</span>
        <span className={cn("font-mono font-bold text-white text-right leading-none min-w-16 shrink-0", valueSizes[textSizeLevel] || 'text-xs')}>
          {String(resource.current).padStart(3, ' ')} / {String(resource.max).padStart(3, ' ')}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {isFreeEdit && (
          <button 
            onClick={() => onChange(-1)}
            className="w-5 h-5 flex items-center justify-center wow-button rounded-full shrink-0"
          >
            <Minus size={12} />
          </button>
        )}
        
        <div className="flex-1 h-2.5 bg-wow-dark border border-[#5a4b3c] rounded-sm relative overflow-hidden">
          {/* Inner shadow / background texture */}
          <div className="absolute inset-0  opacity-50"></div>
          
          {/* Progress fill */}
          <div 
            className={cn("h-full transition-all duration-300 relative", colorClasses[resource.color])}
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-1/3"></div>
          </div>
        </div>

        {isFreeEdit && (
          <button 
            onClick={() => onChange(1)}
            className="w-5 h-5 flex items-center justify-center wow-button rounded-full shrink-0"
          >
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
