import React, { useState, useEffect } from 'react';
import { Home, Download, Upload, Settings, Wifi, WifiOff, ZoomIn, ZoomOut, User, Users, Swords, Sword, FileText, Lock, Sparkles, Dices } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useGMStore } from '@/store/useGMStore';
import { useOnlineSync, sendOnlineRoll } from '@/lib/useOnlineSync';
import { ResourceBar } from '@/components/ResourceBar';
import { StatBar } from '@/components/StatBar';
import { SpellBook } from '@/components/SpellBook';
import { PlayerConfigModal } from '@/components/PlayerConfigModal';
import { NoteTextarea } from '@/components/NoteTextarea';
import { cn, parseMax, parseMpCost } from '@/lib/utils';

interface PlayerViewProps {
  onGoHome: () => void;
  onSwitchToGM: () => void;
}

export function PlayerView({ onGoHome, onSwitchToGM }: PlayerViewProps) {
  const store = usePlayerStore();
  const mpStore = useMultiplayerStore();
  
  // Start custom real-time syncing via polling
  const { registerOnDisconnect } = useOnlineSync();
  useEffect(() => {
    registerOnDisconnect(() => {
      onGoHome();
    });
  }, [registerOnDisconnect]);

  const [showConfig, setShowConfig] = useState(false);

  // Target Rolling State for Player
  const [isSelectingTarget, setIsSelectingTarget] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{
    type: 'stat' | 'spell';
    id?: string;
    name: string;
    value: number;
    spell?: any;
  } | null>(null);

  const [rollResult, setRollResult] = useState<{
    roll: number;
    isSuccess: boolean;
    isCrit: boolean;
    targetName: string;
  } | null>(null);

  const [rolling, setRolling] = useState(false);

  // Determine if we are viewing another player's sheet (View Mode)
  const isViewMode = mpStore.isConnected && mpStore.activePlayerView && mpStore.activePlayerView !== 'me';
  const viewedPlayer = isViewMode ? mpStore.roomPlayers[mpStore.activePlayerView || ''] : null;
  const activeCharState = isViewMode ? viewedPlayer?.characterState : null;

  // Resolve active sheet fields
  const activeName = isViewMode ? (activeCharState?.name || viewedPlayer?.pseudo || 'Awaiting Sync...') : store.name;
  const activePhoto = isViewMode ? activeCharState?.photo : store.photo;
  const activeStats = isViewMode ? (activeCharState?.stats || []) : store.stats;
  
  const visibleStats = activeStats.filter((s: any) => s.isVisible);
  let mpMax = 0;
  if (visibleStats.length === 1) {
    mpMax = visibleStats[0].current * 2;
  } else if (visibleStats.length >= 2) {
    const sortedStats = [...visibleStats].sort((a, b) => a.current - b.current);
    mpMax = sortedStats[0].current + sortedStats[1].current;
  }

  const isScratch = !mpStore.isConnected;

  const resetScratchState = () => {
    // 1. Reset HP to 3, MP to 0, EXP to 0
    store.updateResource(0, { current: 3 });
    store.updateResource(1, { current: 0 });
    store.updateResource(2, { current: 0 });

    // 2. Reset stats to 0
    store.stats.forEach((_, idx) => {
      store.updateStat(idx, { current: 0 });
    });

    // 3. Reset spell uses to max
    store.spells.forEach((spell) => {
      const cleanMax = (spell.maxUses || '').trim();
      const isNumeric = /^\d+$/.test(cleanMax);
      if (isNumeric) {
        const maxVal = parseInt(cleanMax, 10);
        const delta = maxVal - spell.uses;
        if (delta !== 0) {
          store.updateSpellUses(spell.id, delta);
        }
      }
    });
  };

  useEffect(() => {
    if (isScratch) {
      resetScratchState();
    }
  }, [isScratch]);

  const rawResources = isViewMode ? (activeCharState?.resources || store.resources) : store.resources;
  const activeResources = [
    { ...rawResources[0], name: 'HP', color: 'red', isVisible: true, max: '3' },
    { ...rawResources[1], name: 'MP', color: 'blue', isVisible: true, max: isScratch ? '0' : String(mpMax), current: isScratch ? 0 : rawResources[1].current },
    { ...rawResources[2], name: 'EXP', color: 'purple', isVisible: true, max: '3', current: isScratch ? 0 : rawResources[2].current }
  ];

  const activeSpells = isViewMode ? (activeCharState?.spells || []) : store.spells;
  
  const visibleResources = activeResources;
  const gmStore = useGMStore();
  const isFreeEdit = mpStore.isConnected ? mpStore.isFreeEdit : true;

  const handlePlayerRoll = () => {
    if (rollResult !== null) {
      // Clear result & reset target
      setRollResult(null);
      setSelectedTarget(null);
      setIsSelectingTarget(false);
      if (isScratch) {
        resetScratchState();
      }
      return;
    }

    if (!selectedTarget) {
      // Toggle target selection mode
      setIsSelectingTarget(!isSelectingTarget);
      return;
    }

    // Perform roll on selected target
    setRolling(true);
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 12) + 1;
      const isSuccess = roll <= selectedTarget.value;
      const isCrit = roll === 1 || roll === 12;

      // Critical bonus (+1 EXP)
      if (isCrit && !isScratch) {
        const expIdx = activeResources.findIndex(r => r.name === 'EXP');
        if (expIdx !== -1) {
          const currentExp = activeResources[expIdx].current;
          store.updateResource(expIdx, { current: Math.min(3, currentExp + 1) });
        }
      }

      // MP / HP deduction
      const mpIdx = activeResources.findIndex(r => r.name === 'MP');
      const hpIdx = activeResources.findIndex(r => r.name === 'HP');
      if (selectedTarget.type === 'spell') {
        const mpCost = parseMpCost(selectedTarget.spell?.r2 ?? selectedTarget.spell?.r1);
        if (mpCost > 0) {
          const currentMp = mpIdx !== -1 ? activeResources[mpIdx].current : 0;
          if (currentMp >= mpCost) {
            if (mpIdx !== -1) {
              store.updateResource(mpIdx, { current: currentMp - mpCost });
            }
          } else {
            // Player lacks required MP -> cost is 1 HP
            if (hpIdx !== -1) {
              const currentHp = activeResources[hpIdx].current;
              store.updateResource(hpIdx, { current: Math.max(0, currentHp - 1) });
            }
          }
        }
      }

      // Spell use deduction if success
      if (selectedTarget.type === 'spell' && selectedTarget.id && isSuccess) {
        store.updateSpellUses(selectedTarget.id, -1);
      }

      // Log text format
      const targetLabel = selectedTarget.name;
      const critText = isCrit ? ' (critical)' : '';
      const statusText = isSuccess ? 'succeeded' : 'failed';
      const rollText = `Player ${activeName} ${statusText} to roll ${targetLabel} (${roll})${critText}`;

      if (mpStore.isConnected) {
        sendOnlineRoll(rollText);
      }

      setRollResult({
        roll,
        isSuccess,
        isCrit,
        targetName: targetLabel
      });
      setRolling(false);
      setIsSelectingTarget(false);
    }, 1500);
  };

  // Latest public roll log
  const latestRoll = mpStore.rollLogs[mpStore.rollLogs.length - 1];

  const handleExportJSON = () => {
    if (isScratch) {
      // Export full campaign campaignData
      const gmState = useGMStore.getState();
      if (!gmState.roomName || !gmState.roomName.trim()) {
        alert("Le nom de la Room ne peut pas être vide pour l'export.");
        return;
      }

      const pStore = usePlayerStore.getState();
      const currentCharacterState = {
        name: pStore.name || 'Scratch Base',
        photo: pStore.photo || '',
        stats: pStore.stats || [],
        resources: pStore.resources || [],
        spells: pStore.spells || [],
        notes: pStore.notes || '',
      };

      const finalScratchPlayers: Record<string, any> = {};
      gmState.scratchLinks.forEach((link, idx) => {
        const existing = gmState.scratchPlayers[link] || { pseudo: '' };
        const pseudo = (existing.pseudo || '').trim() || `Player ${idx + 1}`;
        finalScratchPlayers[link] = {
          ...existing,
          pseudo,
          characterState: {
            ...currentCharacterState,
            name: pseudo,
          }
        };
      });

      const campaignData = {
        roomName: gmState.roomName,
        shopSpells: gmState.shopSpells,
        encounters: gmState.encounters,
        notes: gmState.notes,
        publicNotes: mpStore.publicNotes,
        scratchLinks: gmState.scratchLinks,
        scratchPlayers: finalScratchPlayers,
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(campaignData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${gmState.roomName || 'scratch'}_campaign.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } else {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "character_sheet.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (isScratch) {
          const gmState = useGMStore.getState();
          if (json.roomName) gmState.updateRoomName(json.roomName);
          if (json.shopSpells) gmState.loadShopSpells(json.shopSpells);
          if (json.encounters) {
            useGMStore.setState({ encounters: json.encounters });
          }
          if (json.scratchLinks) {
            useGMStore.setState({ scratchLinks: json.scratchLinks });
          }
          if (json.scratchPlayers) {
            useGMStore.setState({ scratchPlayers: json.scratchPlayers });
          }
          if (json.publicNotes) {
            useMultiplayerStore.setState({ publicNotes: json.publicNotes, localPublicNotes: json.publicNotes });
          }
          if (json.notes) {
            useGMStore.setState({ notes: json.notes });
          }
          alert("Fichier JSON de campagne chargé avec succès !");
        } else {
          store.loadState(json);
          alert("Fichier personnage chargé avec succès !");
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-iron text-white flex flex-col p-2 md:p-3 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] select-none">
      
      {/* TOP BANNER SPLIT IN 3 SECTIONS ALIGNED WITH MAIN COLUMNS Below */}
      <div className="mb-3 grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0">
        
        {/* Section 1: Home / Status Button (lg:col-span-5) */}
        <div className="lg:col-span-5 wow-panel flex items-center gap-3 py-2 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px]">
          <button onClick={onGoHome} className="wow-button px-3 py-1.5 flex items-center gap-2 text-sm shrink-0">
            <Home size={15} /> <span className="hidden sm:inline">Home</span>
          </button>
          
          <div className="flex items-center gap-1.5 font-mono text-[11px]" title="Sync Status">
            {mpStore.isConnected ? (
              <div className="flex items-center gap-1 text-green-400 bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded shadow-inner">
                <Wifi size={12} />
                <span className="font-cinzel tracking-wider truncate max-w-[120px]">ONLINE: {mpStore.roomName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-gray-400 bg-black/40 border border-[#5a4b3c]/30 px-2 py-0.5 rounded shadow-inner">
                  <WifiOff size={12} />
                  <span className="font-cinzel tracking-wider">OFFLINE</span>
                </div>
                <button 
                  onClick={onSwitchToGM}
                  className="wow-button px-2 py-0.5 text-[10px] bg-wow-gold/20 text-wow-gold border-wow-gold/50 flex items-center gap-1"
                >
                  <Users size={10} /> SCRATCH GM
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Real-time Public Roll Logs (lg:col-span-4) */}
        <div className="lg:col-span-4 wow-panel flex items-center justify-center py-2 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px]">
          <div className="bg-black/60 border border-[#5a4b3c]/40 px-4 py-1 rounded max-w-full text-center text-xs shadow-inner h-7 flex items-center justify-center font-macondo text-wow-gold w-full">
            {latestRoll ? (
              <span className="truncate">{latestRoll.text}</span>
            ) : (
              <span className="text-gray-500 font-cinzel text-[10px] tracking-wider uppercase">Awaiting rolls...</span>
            )}
          </div>
        </div>
        
        {/* Section 3: Load / Export buttons (lg:col-span-3) */}
        <div className="lg:col-span-3 wow-panel flex items-center justify-end gap-2 py-2 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px]">
          {!mpStore.isConnected ? (
            <>
              <label className="wow-button px-3 py-1.5 cursor-pointer flex items-center gap-1.5 text-xs">
                <Upload size={14} /> <span>LOAD JSON</span>
                <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </label>
              <button onClick={handleExportJSON} className="wow-button px-3 py-1.5 flex items-center gap-1.5 text-xs">
                <Download size={14} /> <span>EXPORT JSON</span>
              </button>
            </>
          ) : (
            <div className="text-[10px] text-gray-400 font-mono tracking-widest bg-black/30 border border-[#5a4b3c]/10 px-3 py-1 rounded">
              P-CODE: <span className="text-wow-gold font-bold">{mpStore.joinCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden h-full">
        
        {/* COLUMN 1: SPELLS grimoire (col-span-5) */}
        <div className="lg:col-span-5 wow-panel flex flex-col overflow-hidden shadow-xl bg-leather relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-wow-gold opacity-30 m-1"></div>
          
          <SpellBook 
            spells={activeSpells} 
            readOnly={isViewMode} 
            targetModeProps={{
              isSelectingTarget,
              selectedTargetId: selectedTarget?.type === 'spell' ? (selectedTarget.id || null) : null,
              onSelectTarget: (spell) => {
                if (selectedTarget?.type === 'spell' && selectedTarget?.id === spell.id) {
                  setSelectedTarget(null);
                } else {
                  const mpCost = parseMpCost(spell.r2 ?? spell.r1);
                  const playerMp = activeResources.find(r => r.name === 'MP')?.current || 0;
                  const playerHp = activeResources.find(r => r.name === 'HP')?.current || 0;
                  if (!isScratch && mpCost > 0 && playerMp < mpCost && playerHp <= 0) {
                    return;
                  }
                  const match = (spell.dice || '').match(/\d+/);
                  const diceVal = match ? parseInt(match[0], 10) : 12;
                  setSelectedTarget({
                    type: 'spell',
                    id: spell.id,
                    name: spell.name,
                    value: diceVal,
                    spell
                  });
                }
              },
              playerMp: activeResources.find(r => r.name === 'MP')?.current || 0,
              playerHp: activeResources.find(r => r.name === 'HP')?.current || 0,
              isConnected: mpStore.isConnected
            }}
          />
        </div>

        {/* COLUMN 2: CHARACTER stats, resource trackers, and toggleable Encounter board (col-span-4) */}
        <div className="lg:col-span-4 wow-panel flex flex-col shadow-xl bg-leather p-3 relative overflow-hidden h-full">
          
          {/* Controls row (ASK FOR STAT + Zoom & Gear) - centered above 3 squares */}
          {!isViewMode && (
            <div className="flex items-center justify-center gap-2 w-full border-b border-[#5a4b3c]/20 pb-1.5 mb-1.5 shrink-0">
              <button 
                onClick={() => store.decreaseTextSize()}
                className="wow-button p-1 text-wow-gold hover:text-white"
                title="Réduire le texte"
              >
                <ZoomOut size={14} />
              </button>

              <button 
                disabled={!isFreeEdit && (!activeResources.find(r => r.name === 'EXP') || activeResources.find(r => r.name === 'EXP')!.current < 3)}
                onClick={async () => {
                   if (!mpStore.isConnected) {
                     if (!isFreeEdit) {
                       const expIdx = store.resources.findIndex(r => r.name === 'EXP');
                       if (expIdx !== -1) {
                         store.updateResource(expIdx, { current: Math.max(0, store.resources[expIdx].current - 3) });
                       }
                     }
                   } else {
                     const { db } = await import('@/lib/firebase');
                     const { updateDoc, arrayUnion, doc } = await import('firebase/firestore');
                     if (db && mpStore.roomName) {
                        await updateDoc(doc(db, 'rooms', mpStore.roomName.trim().toLowerCase()), {
                           gmRequests: arrayUnion({ type: 'ask_stat', from: activeName, joinCode: mpStore.joinCode, isFreeEdit, ts: Date.now() })
                        });
                     }
                   }
                }}
                className={cn(
                  "px-2.5 py-0.5 text-[10px] flex items-center gap-1 uppercase tracking-wider font-cinzel transition-all",
                  isFreeEdit 
                    ? "wow-button-green font-bold" 
                    : "wow-button text-wow-gold disabled:opacity-30"
                )}
                title={isFreeEdit ? "Demander une nouvelle stat au MJ (Gratuit)" : "Demander une nouvelle stat au MJ (Coûte 3 EXP)"}
              >
                <Sparkles size={12} /> ASK FOR STAT
              </button>

              <button 
                onClick={() => store.increaseTextSize()}
                className="wow-button p-1 text-wow-gold hover:text-white"
                title="Agrandir le texte"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}

          {/* Top Section: Photo / Encounter Toggle / Dice (ALWAYS VISIBLE!) */}
          <div className="grid grid-cols-3 gap-2 mb-1.5 shrink-0">
            
            {/* Photo & Name */}
            <div className="flex flex-col items-center justify-start">
              <button
                disabled={isViewMode}
                onClick={() => setShowConfig(true)}
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded border-2 overflow-hidden bg-wow-dark shadow-[0_0_15px_rgba(0,0,0,0.8)] relative shrink-0 transition-all select-none outline-none",
                  !isViewMode && "cursor-pointer hover:brightness-110 active:scale-95",
                  isFreeEdit ? "border-[#4ade80]" : "border-[#FFD100]"
                )}
                title={!isViewMode ? "Configurer le personnage" : undefined}
              >
                {activePhoto ? (
                  <img src={activePhoto} alt="Character" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-cinzel text-[10px] text-white/50 text-center uppercase">No Hero</div>
                )}
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
              </button>
              <h2 className="mt-1 font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md text-center h-10 flex items-start justify-center px-1 w-full uppercase tracking-wider line-clamp-2">{activeName}</h2>
            </div>

            {/* Encounter Toggle (Square Button) - Middle */}
            <div className="flex flex-col items-center justify-start">
              <button
                onClick={() => mpStore.setIsEncounterViewActive(!mpStore.isEncounterViewActive)}
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded flex flex-col items-center justify-center relative overflow-hidden transition-all select-none active:scale-95 shadow-md wow-button",
                  mpStore.isEncounterViewActive ? "brightness-125 border-4 border-white" : ""
                )}
                title="Toggle view."
              >
                {mpStore.isEncounterViewActive ? (
                  <Swords size={28} className="text-wow-gold mt-1" />
                ) : (
                  <Sword size={24} className="text-wow-gold mt-1" />
                )}
              </button>
              <span className="mt-1 font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md text-center h-10 flex items-start justify-center px-1 w-full uppercase tracking-wider line-clamp-2">
                {mpStore.isEncounterViewActive ? "ENCOUNTERS" : "STATS"}
              </span>
            </div>
            
            {/* Target Dice Roller */}
            <div className="flex flex-col items-center justify-start">
              <button
                onClick={handlePlayerRoll}
                disabled={isViewMode || rolling}
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded flex flex-col items-center justify-center relative overflow-hidden transition-all select-none active:scale-95 shadow-md wow-button p-1 text-center",
                  selectedTarget !== null ? "bg-green-950/90 border-2 border-green-400 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.6)]" : "",
                  isSelectingTarget && selectedTarget === null ? "bg-green-900/40 border-2 border-green-500/80 animate-pulse" : "",
                  (isViewMode || rolling) && "opacity-60 cursor-not-allowed"
                )}
                title={selectedTarget !== null ? "Click to roll D12 against target" : "Click to select target"}
              >
                {rolling ? (
                  <span className="font-macondo text-3xl text-wow-gold animate-bounce">...</span>
                ) : rollResult !== null ? (
                  <div className="flex flex-col items-center">
                    <span className={cn("font-macondo text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)]", rollResult.isSuccess ? "text-green-400" : "text-red-400")}>
                      {rollResult.roll}
                    </span>
                    <span className={cn("font-cinzel text-[9px] font-bold uppercase", rollResult.isSuccess ? "text-green-300" : "text-red-300")}>
                      {rollResult.isSuccess ? "SUCCESS" : "FAILED"}
                    </span>
                  </div>
                ) : selectedTarget !== null ? (
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <Dices size={28} className="text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    <span className="font-cinzel text-[9px] text-green-200 font-bold uppercase truncate max-w-[80px]">
                      {selectedTarget.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Dices size={28} className={cn("text-wow-gold transition-transform", isSelectingTarget ? "animate-pulse scale-110 text-green-400" : "")} />
                  </div>
                )}
              </button>

              <div className="mt-1 font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md text-center h-10 flex flex-col items-center justify-start px-1 w-full uppercase tracking-wider">
                {rollResult !== null ? (
                  <button 
                    onClick={() => setRollResult(null)}
                    className="hover:text-white transition-colors cursor-pointer font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider"
                  >
                    CLEAR
                  </button>
                ) : selectedTarget !== null ? (
                  <button 
                    disabled={rolling}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (rolling) return;
                      setSelectedTarget(null);
                      setIsSelectingTarget(false);
                    }}
                    className={cn(
                      "text-red-400 hover:text-red-200 cursor-pointer font-cinzel font-bold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider transition-all",
                      rolling && "opacity-30 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    CANCEL
                  </button>
                ) : isSelectingTarget ? (
                  <button 
                    disabled={rolling}
                    onClick={() => {
                      if (rolling) return;
                      setIsSelectingTarget(false);
                    }}
                    className={cn(
                      "text-red-400 hover:text-red-200 cursor-pointer font-cinzel font-bold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider transition-all",
                      rolling && "opacity-30 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    CANCEL
                  </button>
                ) : (
                  <button 
                    disabled={rolling}
                    onClick={() => {
                      if (rolling) return;
                      setIsSelectingTarget(true);
                    }}
                    className="hover:text-white transition-colors cursor-pointer font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider"
                  >
                    TARGET
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c] to-transparent mb-2 shrink-0"></div>

          {/* BOTTOM SECTION OF COLUMN 2 (Toggled between Stats and Encounter) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {mpStore.isEncounterViewActive ? (
              // ENCOUNTER VIEW CONTENT BELOW THE 3 SQUARES
              <div className="h-full flex flex-col gap-4 p-2 bg-black/40 border border-[#5a4b3c] rounded relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-wow-gold opacity-30 m-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-wow-gold opacity-30 m-1"></div>

                <h3 className="font-cinzel text-wow-gold text-xs text-center border-b border-[#5a4b3c]/40 pb-2 flex items-center justify-center gap-2 mt-2 uppercase tracking-widest">
                  <Swords size={14} className="text-red-500" />
                  <span>GM Active Encounter</span>
                </h3>

                {mpStore.publishedEncounter ? (
                  <div className="flex-1 flex flex-col gap-4 font-sans text-sm p-1">
                    <div className="flex items-center justify-between text-xs text-wow-gold/70 border-b border-[#5a4b3c]/30 pb-1">
                      <span>ROOM LEVEL: {mpStore.publishedEncounter.level}</span>
                      <span>QUEST ACTIVE</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                      {mpStore.publishedEncounter.lines?.map((line: any, idx: number) => (
                        <div key={idx} className="bg-black/60 border border-[#5a4b3c]/30 p-3 rounded shadow-sm relative">
                          <h5 className="font-cinzel text-wow-gold text-xs mb-2 border-b border-[#3b2c19]/50 pb-1 flex items-center justify-between">
                            <span>LINE #{idx + 1}</span>
                            <span className="text-[10px] text-gray-500 font-mono">Drawn Options</span>
                          </h5>
                          <div className="flex flex-col gap-2 pl-2 border-l-2 border-wow-gold/30">
                            {line.map((act: any, i: number) => (
                              <div key={i} className="flex flex-col">
                                <span className="font-medium text-gray-100">{act.name}</span>
                                {act.sub && <span className="text-[11px] text-gray-400 font-mono italic">↳ {act.sub}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-white/50 p-6 font-cinzel">
                    <Sword size={36} className="text-wow-gold/30 mb-3" />
                    <p className="text-xs">No active encounter has been published yet by the Game Master.</p>
                  </div>
                )}
              </div>
            ) : (
              // STANDARD CHARACTER VIEW CONTENT BELOW THE 3 SQUARES
              <div className={cn("flex flex-col h-full rounded transition-colors", isFreeEdit && "p-2 bg-green-950/40 border border-green-900/50 shadow-[inset_0_0_15px_rgba(22,163,74,0.1)]")}>
                {/* Resources Zone */}
                <div className={cn(
                  "grid gap-x-3 gap-y-1 mb-3 shrink-0", 
                  visibleResources.length > 2 ? 'grid-cols-2' : 'grid-cols-1'
                )}>
                  {activeResources.map((res: any, idx: number) => {
                    if (!res.isVisible) return null;
                    return (
                      <ResourceBar 
                        key={idx} 
                        resource={res} 
                        isFreeEdit={isFreeEdit && !isViewMode}
                        onChange={isViewMode ? () => {} : (delta) => {
                          if (isScratch && (res.name === 'MP' || res.name === 'EXP')) return; // locked to 0
                          const max = parseMax(res.max) || 1;
                          store.updateResource(idx, { current: Math.max(0, Math.min(max, res.current + delta)) });
                        }} 
                      />
                    );
                  })}
                </div>

                {visibleStats.length > 0 && (
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c] to-transparent mb-3 shrink-0"></div>
                )}

                {/* Stats Zone */}
                <div className={cn(
                  "grid gap-x-3 gap-y-1", 
                  visibleStats.length > 4 ? 'grid-cols-2' : 'grid-cols-1'
                )}>
                  {activeStats.map((stat: any, idx: number) => {
                    if (!stat.isVisible) return null;
                    return (
                      <StatBar 
                        key={idx} 
                        stat={stat} 
                        isFreeEdit={isFreeEdit && !isViewMode}
                        onChange={isViewMode ? () => {} : (delta) => {
                          store.updateStat(idx, { current: Math.max(0, Math.min(12, stat.current + delta)) });
                        }} 
                        targetModeProps={{
                          isSelectingTarget,
                          isSelected: selectedTarget?.type === 'stat' && selectedTarget?.name === stat.name,
                          isOtherSelected: selectedTarget !== null && !(selectedTarget?.type === 'stat' && selectedTarget?.name === stat.name),
                          onSelectTarget: () => {
                            if (selectedTarget?.type === 'stat' && selectedTarget?.name === stat.name) {
                              setSelectedTarget(null);
                            } else {
                              setSelectedTarget({
                                type: 'stat',
                                name: stat.name,
                                value: stat.current
                              });
                            }
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: PARTY PLAYERS (top) & NOTES/JOURNAL (bottom) (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-hidden h-full">
          
          {/* Upper Half: Players & GM List (Always rendered!) */}
          <div className="h-[35%] sm:h-[40%] wow-panel flex flex-col p-3 bg-wow-dark border border-[#5a4b3c] rounded overflow-hidden shadow-lg relative shrink-0">
            <h4 className="font-cinzel text-wow-gold text-xs border-b border-[#5a4b3c]/40 pb-1.5 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Users size={14} className="text-wow-gold" />
              <span>Party Members</span>
            </h4>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 mt-2 pr-1">
              {mpStore.isConnected ? (
                <>
                  {/* "Me" button to view own HUD */}
                  <button
                    onClick={() => mpStore.setActivePlayerView('me')}
                    className={cn(
                      "w-full py-1.5 px-3 rounded font-cinzel text-xs text-left flex items-center justify-between border transition-all duration-200 shadow-sm",
                      (!mpStore.activePlayerView || mpStore.activePlayerView === 'me')
                        ? "bg-wow-gold/15 text-wow-gold border-wow-gold"
                        : "bg-black/30 text-gray-400 border-[#5a4b3c]/30 hover:bg-black/55 hover:border-[#5a4b3c]/60"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <User size={12} className="text-wow-gold" />
                      <span>Me (My HUD)</span>
                    </span>
                    <span className="font-mono text-[9px] text-wow-gold/60">Active</span>
                  </button>

                  {/* List of other players */}
                  {Object.values(mpStore.roomPlayers).map((p: any) => {
                    if (p.pseudo === mpStore.pseudo) return null; // Skip duplicate me
                    const isViewingThis = mpStore.activePlayerView === p.joinCode;
                    return (
                      <button
                        key={p.joinCode}
                        onClick={() => mpStore.setActivePlayerView(p.joinCode)}
                        className={cn(
                          "w-full py-1.5 px-3 rounded font-cinzel text-xs text-left flex items-center justify-between border transition-all duration-200 shadow-sm",
                          isViewingThis
                            ? "bg-wow-gold/15 text-wow-gold border-wow-gold"
                            : "bg-black/30 text-gray-400 border-[#5a4b3c]/30 hover:bg-black/55 hover:border-[#5a4b3c]/60"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate max-w-[70%]">
                          <Users size={12} className="text-gray-400" />
                          <span className="truncate">{p.pseudo}</span>
                        </span>
                        <span className="font-mono text-[9px] text-gray-500 uppercase shrink-0">View HUD</span>
                      </button>
                    );
                  })}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                  <WifiOff size={24} className="text-[#5a4b3c] mb-2" />
                  <span className="text-[10px] font-cinzel tracking-wider text-gray-400 uppercase">Offline Mode</span>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-[180px]">Connect to a room to view other players.</p>
                </div>
              )}
            </div>
          </div>

          {/* Lower Half: Notes / Journal split in 4 tabs */}
          <div className="flex-1 wow-panel flex flex-col bg-black/40 border border-[#5a4b3c] rounded relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/floral-texture.png')]"></div>
            
            {/* TABS HEADER: Styled unified as WoW buttons */}
            <div className="flex gap-1 p-1 bg-black/20 border-b border-[#5a4b3c]/40 relative z-10 shrink-0">
              {/* PUB tab */}
              <button
                onClick={() => mpStore.setPlayerNotesTab(3)}
                className={cn(
                  "wow-button flex-1 py-1.5 px-1.5 text-center text-xs font-cinzel font-bold rounded",
                  mpStore.playerNotesTab === 3 
                    ? "brightness-125 border-2 shadow-md" 
                    : "opacity-40 hover:opacity-80 border border-wow-gold/40"
                )}
              >
                PUB
              </button>

              {/* Note 1 tab */}
              <button
                onClick={() => mpStore.setPlayerNotesTab(0)}
                className={cn(
                  "wow-button flex-1 py-1.5 px-1.5 text-center text-xs font-cinzel font-bold rounded",
                  mpStore.playerNotesTab === 0 
                    ? "brightness-125 border-2 shadow-md" 
                    : "opacity-40 hover:opacity-80 border border-wow-gold/40"
                )}
              >
                N1
              </button>

              {/* Note 2 tab */}
              <button
                onClick={() => mpStore.setPlayerNotesTab(1)}
                className={cn(
                  "wow-button flex-1 py-1.5 px-1.5 text-center text-xs font-cinzel font-bold rounded",
                  mpStore.playerNotesTab === 1 
                    ? "brightness-125 border-2 shadow-md" 
                    : "opacity-40 hover:opacity-80 border border-wow-gold/40"
                )}
              >
                N2
              </button>

              {/* Note 3 tab */}
              <button
                onClick={() => mpStore.setPlayerNotesTab(2)}
                className={cn(
                  "wow-button flex-1 py-1.5 px-1.5 text-center text-xs font-cinzel font-bold rounded",
                  mpStore.playerNotesTab === 2 
                    ? "brightness-125 border-2 shadow-md" 
                    : "opacity-40 hover:opacity-80 border border-wow-gold/40"
                )}
              >
                N3
              </button>
            </div>

            {/* TAB CONTENT ZONE */}
            <div className="flex-1 flex flex-col p-3 overflow-hidden relative z-10 h-full">
              {mpStore.playerNotesTab === 3 ? (
                // PUB (Public Notes - read-only for player)
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  <div className="text-[10px] uppercase font-cinzel tracking-wider text-wow-gold/70 mb-1 border-b border-[#5a4b3c]/30 pb-0.5 flex items-center justify-between">
                    <span>Published Room Notes</span>
                    <span className="font-mono text-[9px] text-gray-500">View-Only</span>
                  </div>
                  <textarea
                    value={mpStore.publicNotes}
                    readOnly
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none font-macondo text-[15px] leading-relaxed custom-scrollbar overflow-y-scroll text-white opacity-85"
                    placeholder="No room notes have been published by the Game Master yet."
                    spellCheck="false"
                  />
                </div>
              ) : (
                // Private Notes 1, 2, 3
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  <div className="text-[10px] uppercase font-cinzel tracking-wider text-wow-gold/60 mb-1 border-b border-[#5a4b3c]/30 pb-0.5">
                    <span>My Private Journal (Tab #{mpStore.playerNotesTab + 1})</span>
                  </div>
                  <NoteTextarea
                    id="player-private-notes"
                    value={mpStore.playerNotes[mpStore.playerNotesTab] || ''}
                    onChange={(val) => mpStore.setPlayerNote(mpStore.playerNotesTab, val)}
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none font-macondo text-base leading-relaxed custom-scrollbar overflow-y-scroll text-white"
                    placeholder="Ecrivez vos notes d'aventure privées ici..."
                  />
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {showConfig && <PlayerConfigModal onClose={() => setShowConfig(false)} />}
    </div>
  );
}
