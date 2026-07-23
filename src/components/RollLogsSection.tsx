import React, { useEffect, useRef, useState } from 'react';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { Scroll, Dices, Swords, Sparkles, AlertCircle, RefreshCw, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { manualSync } from '@/lib/manualSync';

export function RollLogsSection() {
  const rollLogs = useMultiplayerStore(state => state.rollLogs) || [];
  const isConnected = useMultiplayerStore(state => state.isConnected);
  const roomName = useMultiplayerStore(state => state.roomName);
  const containerRef = useRef<HTMLDivElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Auto-scroll to top when new logs arrive since we display newest first
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [rollLogs.length]);

  const handleSyncClick = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncSuccess(false);
    try {
      if (!roomName) {
        // Simulate local synchronization for preview in scratch mode
        await new Promise(resolve => setTimeout(resolve, 600));
      } else {
        await manualSync();
      }
      setSyncSuccess(true);
      setTimeout(() => {
        setSyncSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Manual sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-visible bg-black/40 border border-[#5a4b3c]/50 rounded p-2 relative">
      {/* Centered hanging/plunging rescue sync button */}
      <button
        onClick={handleSyncClick}
        disabled={syncing}
        className={cn(
          "absolute top-0 z-30",
          "px-4 py-1 text-[10px] font-bold tracking-widest font-cinzel rounded-b-md border-x border-b shadow-[0_4px_12px_rgba(0,0,0,0.8)] flex items-center gap-1.5 transition-all outline-none",
          syncing 
            ? "bg-[#5c4a37] border-wow-gold text-white animate-pulse" 
            : syncSuccess 
              ? "bg-green-950 border-green-500 text-green-400 animate-none scale-105" 
              : "bg-[#1c120c] border-wow-gold text-wow-gold hover:bg-[#2b1f15] hover:text-white hover:border-wow-gold cursor-pointer"
        )}
        style={{ left: "50%", transform: "translate(-50%, -4px)" }}
        title="Force manual sync (Rescue buoy)"
      >
        {syncing ? (
          <RefreshCw size={10} className="animate-spin text-white" />
        ) : syncSuccess ? (
          <span className="text-[10px]">✓ SYNCED</span>
        ) : (
          <>
            <LifeBuoy size={11} className="text-wow-gold shrink-0" />
            <span>MANUAL SYNC</span>
          </>
        )}
      </button>

      {/* Mini gold header */}
      <div className="text-[11px] uppercase font-cinzel tracking-wider text-wow-gold/80 mb-2 border-b border-[#5a4b3c]/30 pb-1 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1.5 font-bold">
          <Dices size={12} className="text-wow-gold" />
          <span>ROLL LOGS</span>
        </span>
        <span className="text-[9px] font-mono text-white font-bold">{rollLogs.length} LOGS</span>
      </div>

      {/* Logs Scroll container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2"
      >
        {rollLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-white py-6">
            <Scroll size={20} className="text-[#5a4b3c]/50 mb-1" />
            <span className="font-cinzel text-[10px] tracking-wider uppercase">No roll recorded</span>
          </div>
        ) : (
          [...rollLogs].reverse().map((log, index) => {
            const isStructuredRoll = log.type === 'roll' && log.playerName;
            const isLast = index === 0;
            const isGM = Boolean(
              log.isGM ||
              log.playerName === 'GM' ||
              log.playerName === 'MJ' ||
              log.pseudo === 'GM' ||
              log.pseudo === 'MJ' ||
              log.playerName?.startsWith('GM') ||
              log.pseudo?.startsWith('GM') ||
              log.text?.startsWith('GM') ||
              log.text?.includes('GM ') ||
              log.text?.startsWith('⚔️ GM') ||
              log.text?.startsWith('📜 GM')
            );
            
            if (isStructuredRoll) {
              const reqVal = log.requiredValue ?? 0;
              const rolledVal = log.roll ?? 0;
              const isSuccess = log.isSuccess;
              const isCrit = log.isCrit;
              const isPerfect = reqVal > 0 && rolledVal === reqVal;
              
              return (
                <div 
                  key={log.id} 
                  className={cn(
                    "p-2 rounded flex flex-col gap-1 transition-all animate-in fade-in slide-in-from-top-2 duration-200 relative border",
                    isGM ? "bg-yellow-950/20 border-wow-gold/40 shadow-md" : "bg-black/45 border-[#5a4b3c]/25 shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] text-white gap-2 flex-wrap mb-0.5">
                    <div className="font-mono text-[9px] uppercase font-bold text-white flex items-center gap-1.5 flex-wrap">
                      {isLast && <span className="bg-wow-gold text-black px-1.5 py-0.5 rounded-sm font-bold text-[8px]">LAST</span>}
                      {/* Outcome Badge */}
                      {isCrit && rolledVal === 1 ? (
                        <span className="bg-green-950/80 text-green-400 border border-green-800/80 px-1.5 py-0.5 rounded font-cinzel text-[8px] font-bold tracking-wider uppercase">
                          CRITICAL SUCCESS
                        </span>
                      ) : isCrit && rolledVal === 12 ? (
                        <span className="bg-red-950/80 text-red-400 border border-red-800/80 px-1.5 py-0.5 rounded font-cinzel text-[8px] font-bold tracking-wider uppercase">
                          CRITICAL FAIL
                        </span>
                      ) : isSuccess ? (
                        <span className="bg-green-950/80 text-green-400 border border-green-800/80 px-1.5 py-0.5 rounded font-cinzel text-[8px] font-bold tracking-wider uppercase">
                          SUCCESS
                        </span>
                      ) : (
                        <span className="bg-red-950/80 text-red-400 border border-red-800/80 px-1.5 py-0.5 rounded font-cinzel text-[8px] font-bold tracking-wider uppercase">
                          FAIL
                        </span>
                      )}
                      {isPerfect && (
                        <span className="bg-teal-950/80 text-teal-300 border border-teal-700/80 px-1.5 py-0.5 rounded font-cinzel text-[8px] font-bold tracking-wider uppercase">
                          PERFECT
                        </span>
                      )}
                    </div>
                    <span className="text-right text-[9px] text-gray-400 shrink-0">
                      {new Date(log.timestamp || Date.now()).toLocaleDateString()} {new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-100 flex items-center gap-1">
                      <span className={cn("font-bold", isGM ? "text-wow-gold font-cinzel" : "text-white")}>{isGM ? 'GM' : log.playerName}</span>
                      <span className="text-white text-xs font-normal">tested</span>
                      <span className="text-wow-gold font-cinzel font-bold tracking-wide">{log.targetLabel}</span>
                    </span>
                  </div>
                  {/* Requirements details */}
                  <div className="text-xs text-white font-mono flex items-center gap-2 pl-1 border-l-2 border-[#5a4b3c]/40 mt-0.5">
                    <span>req ≤ <strong className="text-white">{reqVal}</strong></span>
                    <span className="text-[#5a4b3c]/60">|</span>
                    <span>rolled <strong className={cn("text-lg leading-none font-bold font-macondo", isSuccess ? "text-green-400" : "text-red-400")}>{rolledVal}</strong></span>
                  </div>
                </div>
              );
            }

            // Fallback render of unstructured/text roll logs
            let colorClass = "text-white";
            let bgClass = "bg-black/20 border-black/10";

            if (isGM || log.text?.toLowerCase().includes("publié") || log.text?.toLowerCase().includes("published") || log.text?.toLowerCase().includes("notes") || log.text?.toLowerCase().includes("encounter")) {
              colorClass = "text-wow-gold";
              bgClass = "bg-yellow-950/20 border-wow-gold/40 shadow-md";
            } else if (log.text?.toLowerCase().includes("réussite") || log.text?.toLowerCase().includes("succeeded") || log.text?.toLowerCase().includes("success") || log.text?.toLowerCase().includes("heal")) {
              colorClass = "text-green-300";
              bgClass = "bg-green-950/10 border-green-900/15";
            } else if (log.text?.toLowerCase().includes("échec") || log.text?.toLowerCase().includes("failed") || log.text?.toLowerCase().includes("fail") || log.text?.toLowerCase().includes("damage")) {
              colorClass = "text-red-300";
              bgClass = "bg-red-950/10 border-red-900/15";
            }

            return (
              <div 
                key={log.id} 
                className={cn(
                  "p-2 rounded text-xs border font-sans leading-relaxed shadow-inner flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150 relative", 
                  bgClass
                )}
              >
                <div className="flex items-center justify-between text-[10px] text-white mb-0.5">
                  <span className="font-mono text-[9px] uppercase font-bold text-white flex items-center gap-2">
                    {isLast && <span className="bg-wow-gold text-black px-1.5 py-0.5 rounded-sm font-bold text-[8px]">LAST</span>}
                    <span className={isGM ? "text-wow-gold font-cinzel font-bold" : ""}>{isGM ? 'GM' : (log.pseudo || 'Info')}</span>
                  </span>
                  <span className="text-right">
                    {new Date(log.timestamp || Date.now()).toLocaleDateString()} {new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
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
