import React, { useEffect, useRef } from 'react';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { Scroll, Dices, Swords, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RollLogsSection() {
  const rollLogs = useMultiplayerStore(state => state.rollLogs) || [];
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [rollLogs.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black/40 border border-[#5a4b3c]/50 rounded p-2 relative">
      {/* Mini gold header */}
      <div className="text-[11px] uppercase font-cinzel tracking-wider text-wow-gold/80 mb-2 border-b border-[#5a4b3c]/30 pb-1 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1.5 font-bold">
          <Dices size={12} className="text-wow-gold" />
          <span>JOURNAL DES ROLLS / ROLL LOGS</span>
        </span>
        <span className="text-[9px] font-mono text-gray-500 font-bold">{rollLogs.length} LOGS</span>
      </div>

      {/* Logs Scroll container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2"
      >
        {rollLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 py-6">
            <Scroll size={20} className="text-[#5a4b3c]/50 mb-1" />
            <span className="font-cinzel text-[10px] tracking-wider uppercase">Aucun jet enregistré</span>
          </div>
        ) : (
          rollLogs.map((log) => {
            const isStructuredRoll = log.type === 'roll' && log.playerName;

            if (isStructuredRoll) {
              const reqVal = log.requiredValue ?? 0;
              const rolledVal = log.roll ?? 0;
              const isSuccess = log.isSuccess;
              const isCrit = log.isCrit;

              return (
                <div 
                  key={log.id} 
                  className="bg-black/45 border border-[#5a4b3c]/25 p-2 rounded flex flex-col gap-1 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-sm font-semibold text-gray-100 flex items-center gap-1">
                      <span className="text-gray-300 font-bold">{log.playerName}</span>
                      <span className="text-gray-400 text-xs font-normal">a testé</span>
                      <span className="text-wow-gold font-cinzel font-bold tracking-wide">{log.targetLabel}</span>
                    </span>
                    
                    {/* Outcome Badge */}
                    <div className="flex items-center gap-1">
                      {isCrit ? (
                        <span className="bg-purple-950/80 text-purple-400 border border-purple-800/80 px-2 py-0.5 rounded font-cinzel text-[9px] font-bold tracking-widest uppercase shadow-md animate-pulse">
                          CRITIQUE
                        </span>
                      ) : isSuccess ? (
                        <span className="bg-green-950/80 text-green-400 border border-green-800/80 px-2 py-0.5 rounded font-cinzel text-[9px] font-bold tracking-widest uppercase shadow-md">
                          RÉUSSITE
                        </span>
                      ) : (
                        <span className="bg-red-950/80 text-red-400 border border-red-800/80 px-2 py-0.5 rounded font-cinzel text-[9px] font-bold tracking-widest uppercase shadow-md">
                          ÉCHEC
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Requirements details */}
                  <div className="text-xs text-gray-400 font-mono flex items-center gap-2 pl-1 border-l-2 border-[#5a4b3c]/40 mt-0.5">
                    <span>requis ≤ <strong className="text-white">{reqVal}</strong></span>
                    <span className="text-[#5a4b3c]/60">|</span>
                    <span>obtenu <strong className={cn("text-lg leading-none font-bold font-macondo", isSuccess ? "text-green-400" : "text-red-400")}>{rolledVal}</strong></span>
                  </div>
                </div>
              );
            }

            // Fallback render of unstructured/text roll logs
            let colorClass = "text-gray-300";
            let bgClass = "bg-black/20 border-black/10";
            if (log.text?.includes("réussite") || log.text?.includes("succeeded") || log.text?.includes("Heal")) {
              colorClass = "text-green-300";
              bgClass = "bg-green-950/10 border-green-900/15";
            } else if (log.text?.includes("échec") || log.text?.includes("failed") || log.text?.includes("Damage")) {
              colorClass = "text-red-300";
              bgClass = "bg-red-950/10 border-red-900/15";
            } else if (log.text?.includes("publié") || log.text?.includes("notes")) {
              colorClass = "text-wow-gold";
              bgClass = "bg-yellow-950/15 border-wow-gold/20";
            }

            return (
              <div 
                key={log.id} 
                className={cn(
                  "p-2 rounded text-xs border font-sans leading-relaxed shadow-inner flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-1 duration-150", 
                  bgClass
                )}
              >
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                  <span className="font-mono text-[9px] uppercase font-bold text-gray-400">{log.pseudo || 'Info'}</span>
                  <span>{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <p className={cn("font-medium text-sm", colorClass)}>{log.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
