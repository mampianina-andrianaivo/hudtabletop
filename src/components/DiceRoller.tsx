import React, { useState } from 'react';
import { Dices, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { sendOnlineRoll } from '@/lib/useOnlineSync';

interface DiceRollerProps {
  disabled?: boolean;
}

export function DiceRoller({ disabled }: DiceRollerProps) {
  const [result, setResult] = useState<number | string | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleClick = () => {
    if (disabled || rolling) return;

    if (result !== null && result !== "...") {
      setResult(null);
      return;
    }

    setRolling(true);
    setResult("...");
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 12) + 1;
      setResult(roll);
      setRolling(false);

      const mp = useMultiplayerStore.getState();
      const isGM = mp.role === 'gm';
      const name = isGM ? 'GM' : (mp.pseudo || 'Player');
      const rollText = `${name} just rolled ${roll} on D12`;

      const rollObj = {
        text: rollText,
        type: 'info' as const,
        playerName: name,
        isGM: isGM,
        roll: roll
      };

      if (mp.isConnected) {
        sendOnlineRoll(rollObj);
      } else {
        const currentLogs = useMultiplayerStore.getState().rollLogs || [];
        useMultiplayerStore.setState({
          rollLogs: [...currentLogs.slice(-49), {
            id: `roll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            pseudo: name,
            timestamp: Date.now(),
            ...rollObj
          }]
        });
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <button
        onClick={handleClick}
        disabled={disabled || rolling}
        className={cn(
          "w-20 h-20 sm:w-24 sm:h-24 rounded flex items-center justify-center relative overflow-hidden transition-all select-none wow-button shadow-md",
          (disabled || rolling) && "opacity-60 cursor-not-allowed pointer-events-none"
        )}
      >
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {disabled ? (
            <Ban size={32} className="text-red-500 opacity-80" />
          ) : result !== null ? (
            <span className={cn("font-macondo text-wow-gold drop-shadow-[0_2px_4px_rgba(0,0,0,1)]", rolling ? "text-3xl" : "text-4xl")}>{result}</span>
          ) : (
            <Dices size={32} className="text-wow-gold opacity-100" />
          )}
        </div>
      </button>

      <div className="mt-1 font-cinzel font-bold text-wow-gold text-xs tracking-wider uppercase drop-shadow-md text-center h-5 flex items-center justify-center px-1 w-full">
        {disabled ? "ROLL DISABLED" : result !== null && result !== "..." ? "CLEAR D12" : "ROLL D12"}
      </div>
    </div>
  );
}
