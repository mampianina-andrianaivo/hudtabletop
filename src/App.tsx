/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { GameState, SlotData } from './types';
import { Heart, Droplet, Settings, Edit2, Info, X, Image as ImageIcon, Trash2, Download, Upload } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const generateInitialSlots = (prefix: string, startIndex: number): SlotData[] => {
  const slots: SlotData[] = [];
  for (let i = 0; i < 6; i++) {
    slots.push({
      id: `${prefix}-slot-${i}`,
      image: null,
      description: '',
      diceTarget: 0,
      diceCondition: 'exact',
      noDice: false,
      chakraCost: 0,
      noCost: false,
      isGreyedOut: false,
      slotNumber: startIndex + i,
    });
  }
  return slots;
};

const DEFAULT_STATE: GameState = {
  maxHp: 3,
  currentHp: [true, true, true],
  maxChakra: 3,
  currentChakra: [true, true, true],
  characterImage: null,
  characterName: 'PERSONNAGE',
  characterDescription: '',
  customStats: Array(10).fill(null).map(() => ({ name: '', value: '', isVisible: false })),
  playerNotes: '',
  leftSlots: generateInitialSlots('left', 1),
  rightSlots: generateInitialSlots('right', 7),
  hudColor: '#1a1f2e',
  isLightMode: false,
};

const SlotUI: React.FC<{ 
  slot: SlotData;
  side: 'left' | 'right';
  onClick: (slot: SlotData, side: 'left' | 'right') => void;
  onDoubleClick: (slot: SlotData, side: 'left' | 'right') => void;
  onGaugeClick?: (slotId: string, gaugeIndex: number, side: 'left' | 'right') => void;
  isSelected?: boolean;
  isEditMode?: boolean;
}> = ({ 
  slot,
  side,
  onClick, 
  onDoubleClick,
  onGaugeClick,
  isSelected,
  isEditMode
}) => {
  const isGaugeLeft = slot.slotNumber % 2 !== 0;
  
  const renderGauges = () => {
    const max = slot.greenGaugeMax || 0;
    const current = slot.currentGreenGauge || Array(max).fill(true);
    
    const columns = [];
    for (let i = 0; i < max; i += 3) {
       columns.push(current.slice(i, i + 3).map((isActive, idx) => ({ isActive, index: i + idx })));
    }
    
    return (
      <div className={cn("flex gap-1 w-11 flex-shrink-0 pt-2", isGaugeLeft ? "justify-end" : "justify-start")} onClick={(e) => e.stopPropagation()}>
        {columns.map((col, cIdx) => (
          <div key={cIdx} className="flex flex-col-reverse gap-1 justify-end">
             {col.map((item) => (
                <button key={item.index} onClick={() => onGaugeClick && onGaugeClick(slot.id, item.index, side)} className="outline-none">
                  <div className={cn(
                    "w-3 h-6 rounded-none transition-all border border-white/20 shadow-inner cursor-pointer",
                    item.isActive ? "bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.6)] border-emerald-400" : "bg-black/50"
                  )} />
                </button>
             ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex gap-1 items-start justify-center w-full">
      {isGaugeLeft && renderGauges()}
      <div className="flex flex-col gap-1 flex-1 w-full min-w-0">
        <div 
          onClick={(e) => { e.stopPropagation(); onClick(slot, side); }}
          onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(slot, side); }}
          className={cn(
            "relative bg-white/5 rounded-none backdrop-blur-xl transition-all shadow-lg flex items-center justify-center cursor-pointer hover:bg-white/10 w-full overflow-hidden group aspect-square",
            slot.isGreyedOut && "opacity-30 grayscale"
          )}
        >
          {/* Top-level absolute border overlay to prevent any clipping, cropping or overlap by absolute child images/overlays */}
          <div className={cn(
            "absolute inset-0 border pointer-events-none z-30 transition-all",
            isSelected && !isEditMode ? "border-blue-500" : "border-white/10",
            isEditMode && "border-amber-500"
          )} />

          <div className="absolute top-2 left-2 text-xs text-white/50 font-bold tracking-widest z-10 px-1 bg-black/40 rounded-none pointer-events-none">#{slot.slotNumber}</div>
          
          <div className="w-full h-full flex flex-col relative">
            <div className="flex-grow w-full flex items-center justify-center bg-black/40 relative">
              {slot.image ? (
                <img src={slot.image} alt="slot" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              ) : (
                <span className="text-white/20 text-3xl font-light">+</span>
              )}
            </div>
          </div>
          
          {slot.name && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white/80 font-bold tracking-widest z-10 px-2 py-0.5 bg-black/80 rounded-none pointer-events-none uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[90%] text-center">{slot.name}</div>}

          {isEditMode && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20">
              <Edit2 className="w-6 h-6 text-white/80" />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-1 min-h-[36px]">
          <div className="flex items-center justify-center bg-black/40 h-9 w-12 rounded-none border border-white/5 shadow-inner transition-opacity duration-300" style={{ opacity: slot.noDice ? 0 : 1 }}>
            <span className="text-xl font-black text-orange-400 drop-shadow-md text-center">
              {slot.diceTarget}
            </span>
          </div>
          <div className="flex items-center justify-center bg-black/40 h-9 w-12 rounded-none border border-white/5 shadow-inner transition-opacity duration-300" style={{ opacity: slot.noCost ? 0 : 1 }}>
            <span className="text-xl font-black text-blue-400 drop-shadow-md text-center">
              {slot.chakraCost}
            </span>
          </div>
        </div>
      </div>
      {!isGaugeLeft && renderGauges()}
    </div>
  );
};

export default function App() {
  const [dimensions, setDimensions] = useState({ width: 1366, height: 768, scale: 1 });

  useEffect(() => {
    const handleResize = () => {
      const BASE_WIDTH = 1366;
      const BASE_HEIGHT = 768;
      const wScale = window.innerWidth / BASE_WIDTH;
      const hScale = window.innerHeight / BASE_HEIGHT;
      
      // Use the minimum scale factor to ensure everything fits inside the viewport
      const scaleVal = Math.min(wScale, hScale);
      
      // Calculate container dimensions so the scaled container fills the entire viewport
      const widthVal = window.innerWidth / scaleVal;
      const heightVal = window.innerHeight / scaleVal;

      setDimensions({
        width: widthVal,
        height: heightVal,
        scale: scaleVal,
      });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "tabletop-hud-save.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedState = JSON.parse(event.target?.result as string);
          if (importedState && typeof importedState === 'object') {
            setGameState({ ...DEFAULT_STATE, ...importedState });
          }
        } catch (error) {
          console.error("Error parsing JSON", error);
          alert("Fichier JSON invalide.");
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    get('tabletop-hud-state-v2')
      .then((saved) => {
        if (saved) {
          const updateSlots = (slots: any[], prefix: string, startIndex: number) => {
             const defaultSlots = generateInitialSlots(prefix, startIndex);
             return defaultSlots.map(ds => {
                const found = slots.find(s => s.id === ds.id);
                if (found) {
                   return { ...ds, ...found, diceCondition: found.diceCondition || 'exact', noDice: found.noDice || false, noCost: found.noCost || false, slotNumber: ds.slotNumber };
                }
                return ds;
             });
          };
          setGameState({
            ...DEFAULT_STATE,
            ...saved,
            leftSlots: updateSlots(saved.leftSlots || [], 'left', 1),
            rightSlots: updateSlots(saved.rightSlots || [], 'right', 7),
            characterDescription: saved.characterDescription || '',
            customStats: saved.customStats || Array(10).fill(null).map(() => ({ name: '', value: '', isVisible: false })),
            playerNotes: saved.playerNotes || ''
          });
        }
      })
      .catch((err) => console.error('Failed to load state from idb', err))
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      set('tabletop-hud-state-v2', gameState).catch((err) =>
        console.error('Failed to save state to idb', err)
      );
    }
  }, [gameState, isLoaded]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'slot', slot: SlotData, side: 'left' | 'right' } | { type: 'character' } | null>(null);
  
  const currentSelectedSlot = selectedItem && selectedItem.type === 'slot'
    ? (selectedItem.side === 'left' 
        ? gameState.leftSlots.find(s => s.id === selectedItem.slot.id) 
        : gameState.rightSlots.find(s => s.id === selectedItem.slot.id))
    : null;
  
  // Modals state
  const [editingSlot, setEditingSlot] = useState<{ slot: SlotData; side: 'left' | 'right' } | null>(null);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div className="h-screen w-full bg-[#05070a] flex items-center justify-center">
        <div className="text-blue-500 animate-pulse">Chargement du HUD...</div>
      </div>
    );
  }

  // --- Handlers ---
  
  const toggleHp = (index: number) => {
    setGameState((prev) => {
      const newHp = [...prev.currentHp];
      newHp[index] = !newHp[index];
      return { ...prev, currentHp: newHp };
    });
  };

  const toggleChakra = (index: number) => {
    setGameState((prev) => {
      const newChakra = [...prev.currentChakra];
      newChakra[index] = !newChakra[index];
      return { ...prev, currentChakra: newChakra };
    });
  };

  const handleReset = () => {
    setGameState(DEFAULT_STATE);
    setEditingSlot(null);
    setSelectedItem(null);
    setIsResetConfirmOpen(false);
  };

  const handleSlotClick = (slot: SlotData, side: 'left' | 'right') => {
    if (isEditMode) {
      setEditingSlot({ slot, side });
    } else {
      setSelectedItem({ type: 'slot', slot, side });
    }
  };

  const handleCharacterClick = () => {
    if (isEditMode) {
      setIsGlobalSettingsOpen(true);
    } else {
      setSelectedItem({ type: 'character' });
    }
  };

  const toggleSlotGreyedOut = (slotId: string, side: 'left' | 'right') => {
    setGameState((prev) => {
      const list = side === 'left' ? [...prev.leftSlots] : [...prev.rightSlots];
      const index = list.findIndex((s) => s.id === slotId);
      if (index !== -1) {
        list[index] = { ...list[index], isGreyedOut: !list[index].isGreyedOut };
      }
      return { ...prev, [side === 'left' ? 'leftSlots' : 'rightSlots']: list };
    });
  };

  const handleSlotDoubleClick = (slot: SlotData, side: 'left' | 'right') => {
    if (isEditMode) return;
    toggleSlotGreyedOut(slot.id, side);
  };

  const handleGaugeClick = (slotId: string, gaugeIndex: number, side: 'left' | 'right') => {
    if (isEditMode) return;
    setGameState((prev) => {
      const list = side === 'left' ? [...prev.leftSlots] : [...prev.rightSlots];
      const index = list.findIndex((s) => s.id === slotId);
      if (index !== -1) {
        const slot = list[index];
        if (slot.greenGaugeMax) {
          const newGauge = slot.currentGreenGauge ? [...slot.currentGreenGauge] : Array(slot.greenGaugeMax).fill(true);
          newGauge[gaugeIndex] = !newGauge[gaugeIndex];
          list[index] = { ...slot, currentGreenGauge: newGauge };
        }
      }
      return { ...prev, [side === 'left' ? 'leftSlots' : 'rightSlots']: list };
    });
  };

  const updateSlot = (updatedSlot: SlotData, side: 'left' | 'right') => {
    setGameState((prev) => {
      const list = side === 'left' ? [...prev.leftSlots] : [...prev.rightSlots];
      const index = list.findIndex((s) => s.id === updatedSlot.id);
      if (index !== -1) {
        list[index] = updatedSlot;
      }
      return { ...prev, [side === 'left' ? 'leftSlots' : 'rightSlots']: list };
    });
    setEditingSlot(null);
  };

  // --- Render Helpers ---
  
  return (
    <div 
      className={cn(
        "h-[100dvh] w-full bg-[#05070a] text-white flex items-center justify-center font-sans overflow-hidden select-none transition-all duration-500",
        gameState.isLightMode && "invert hue-rotate-180 light-mode"
      )}
      style={{ background: `radial-gradient(circle at center, ${gameState.hudColor || '#1a1f2e'} 0%, #05070a 100%)` }}
      onClick={() => setSelectedItem(null)}
    >
      <div 
        className="relative flex flex-col flex-shrink-0"
        style={{ 
          width: `${dimensions.width}px`, 
          height: `${dimensions.height}px`, 
          transform: `scale(${dimensions.scale})`, 
          transformOrigin: 'center' 
        }}
      >
      {/* Header / Controls */}
      <div className="absolute top-6 left-8 flex flex-row items-center z-50 gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditMode(!isEditMode); }}
          className={cn(
            "px-4 py-2 border rounded-none backdrop-blur-md text-xs font-bold uppercase tracking-widest transition-all shadow-lg",
            isEditMode ? "bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30" : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
          )}
        >
          <span className="flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            {isEditMode ? "Mode Édition Actif" : "Mode Édition"}
          </span>
        </button>

        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            setGameState(prev => ({ ...prev, isLightMode: !prev.isLightMode })); 
          }}
          className="px-4 py-2 border rounded-none backdrop-blur-md text-xs font-bold uppercase tracking-widest transition-all shadow-lg bg-white/10 hover:bg-white/20 border-white/20 text-white flex items-center gap-2"
        >
          {gameState.isLightMode ? "Mode Sombre" : "Mode Clair"}
        </button>
        
        {isEditMode && (
          <div className="flex items-center gap-3 pl-3 border-l border-white/10">
            <button
              onClick={(e) => { e.stopPropagation(); setIsResetConfirmOpen(true); }}
              className="bg-red-600/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 px-4 py-2 rounded-none backdrop-blur-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
            >
              <Trash2 className="w-4 h-4" />
              Réinitialiser
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleExport(); }}
              className="bg-blue-600/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 px-4 py-2 rounded-none backdrop-blur-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); importFileRef.current?.click(); }}
              className="bg-green-600/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 px-4 py-2 rounded-none backdrop-blur-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
            >
              <Upload className="w-4 h-4" />
              Importer
            </button>
            <input
              type="file"
              accept=".json"
              ref={importFileRef}
              onChange={handleImport}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Main HUD Area */}
      <div className="flex-1 flex flex-row items-center justify-center pt-22 pb-4 px-8 pr-[18rem] gap-12 min-h-0 relative">
        
        {/* Left Slots */}
        <div className="w-[32%] max-w-[30rem] grid grid-cols-2 gap-x-4 gap-y-6 items-start content-center h-full py-4">
          {gameState.leftSlots.map((slot) => (
            <SlotUI 
              key={slot.id} slot={slot} side="left" 
              onClick={handleSlotClick} onDoubleClick={handleSlotDoubleClick}
              onGaugeClick={handleGaugeClick}
              isSelected={selectedItem?.type === 'slot' && selectedItem.slot.id === slot.id}
              isEditMode={isEditMode}
            />
          ))}
        </div>

        {/* Center Area */}
        <div className="flex flex-col items-center justify-center w-auto min-w-[12rem] px-2 md:px-4 flex-shrink-0 h-full">
          
          {/* Hearts (HP) */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-[250px]">
            {gameState.currentHp.map((isActive, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); toggleHp(idx); }} className="outline-none">
                <div 
                  className={cn(
                    "w-6 h-6 rounded-none transition-all cursor-pointer border border-white/20 shadow-inner",
                    isActive 
                      ? "bg-red-600 border-red-400" 
                      : "bg-black/50"
                  )}
                />
              </button>
            ))}
          </div>

          {/* Character */}
          <div 
            onClick={(e) => { e.stopPropagation(); handleCharacterClick(); }}
            className={cn(
              "h-[65%] max-h-[512px] w-auto aspect-[1/2] bg-white/5 rounded-none backdrop-blur-2xl relative shadow-2xl overflow-hidden group cursor-pointer transition-all"
            )}
          >
            {/* Top-level absolute border overlay to prevent image or gradients from overlapping the border */}
            <div className={cn(
              "absolute inset-0 border pointer-events-none z-30 transition-all",
              selectedItem?.type === 'character' && "border-blue-500",
              isEditMode && "border-amber-500",
              !(selectedItem?.type === 'character') && !isEditMode && "border-white/10"
            )} />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent z-10 pointer-events-none"></div>
            {gameState.characterImage ? (
              <img src={gameState.characterImage} alt="Character" className="w-full h-full object-cover absolute inset-0 z-0 opacity-80 pointer-events-none" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-40 z-0 pointer-events-none">
                <div className="w-40 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
                <ImageIcon className="w-16 h-16 text-white/30 absolute" />
              </div>
            )}
            
            <div className="absolute top-0 left-0 right-0 flex flex-col items-center justify-start z-20 pointer-events-none px-4 pt-6 text-center">
               <span className="text-xl font-bold tracking-widest uppercase text-white drop-shadow-lg">{gameState.characterName}</span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none flex flex-col gap-1 pt-10">
              {gameState.customStats.filter(s => s.isVisible && s.name).map((stat, idx) => (
                <div key={idx} className="flex justify-between items-end text-xs">
                  <span className="text-white/60 font-bold uppercase tracking-widest">{stat.name}</span>
                  <span className="text-white font-black text-sm">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chakra */}
          <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-[250px]">
            {gameState.currentChakra.map((isActive, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); toggleChakra(idx); }} className="outline-none">
                <div 
                  className={cn(
                    "w-6 h-6 rounded-none transition-all cursor-pointer border border-white/20 shadow-inner",
                    isActive 
                      ? "bg-blue-500 border-blue-400" 
                      : "bg-black/50"
                  )}
                />
              </button>
            ))}
          </div>

        </div>

        {/* Right Slots */}
        <div className="w-[32%] max-w-[30rem] grid grid-cols-2 gap-x-4 gap-y-6 items-start content-center h-full py-4">
          {gameState.rightSlots.map((slot) => (
            <SlotUI 
              key={slot.id} slot={slot} side="right" 
              onClick={handleSlotClick} onDoubleClick={handleSlotDoubleClick}
              onGaugeClick={handleGaugeClick}
              isSelected={selectedItem?.type === 'slot' && selectedItem.slot.id === slot.id}
              isEditMode={isEditMode}
            />
          ))}
        </div>
      </div>

      {/* Bottom Info Panel */}
      <div 
        className="h-32 mx-8 mb-6 mr-[17rem] bg-black/40 border border-white/10 rounded-none backdrop-blur-md flex-shrink-0 p-4 flex flex-col justify-center shadow-2xl relative overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {selectedItem && !isEditMode ? (
          <div className="flex gap-6 h-full items-center px-4 relative z-10">
            {selectedItem.type === 'slot' && currentSelectedSlot?.image && (
              <div className="h-[80%] aspect-square border border-white/10 rounded-none overflow-hidden bg-black flex-shrink-0 shadow-lg">
                 <img src={currentSelectedSlot.image} className="w-full h-full object-cover opacity-80" />
              </div>
            )}
            {selectedItem.type === 'character' && gameState.characterImage && (
              <div className="h-[80%] aspect-[1/2] border border-white/10 rounded-none overflow-hidden bg-black flex-shrink-0 shadow-lg">
                 <img src={gameState.characterImage} className="w-full h-full object-cover opacity-80" />
              </div>
            )}
            <div className="flex-1 flex flex-col justify-center text-left">
              <div className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-4">
                <span>
                  {selectedItem.type === 'slot' && currentSelectedSlot 
                    ? (currentSelectedSlot.name || `TUILE #${currentSelectedSlot.slotNumber}`) 
                    : gameState.characterName}
                </span>

                {selectedItem.type === 'slot' && currentSelectedSlot && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSlotGreyedOut(currentSelectedSlot.id, selectedItem.side);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border rounded-none transition-all duration-200 cursor-pointer shadow-md",
                      currentSelectedSlot.isGreyedOut
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 animate-pulse"
                        : "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20"
                    )}
                  >
                    {currentSelectedSlot.isGreyedOut ? "Réactiver" : "Griser"}
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed max-h-[4.5rem] overflow-y-auto pr-2">
                {selectedItem.type === 'slot' && currentSelectedSlot 
                  ? (currentSelectedSlot.description || <span className="text-white/30 italic">Aucune description...</span>) 
                  : (gameState.characterDescription || <span className="text-white/30 italic">Aucune description...</span>)}
              </p>
            </div>
            {selectedItem.type === 'slot' && currentSelectedSlot && (!currentSelectedSlot.noDice || !currentSelectedSlot.noCost) && (
              <div className="flex gap-6 flex-shrink-0 items-center">
                {!currentSelectedSlot.noDice && (
                  <div className="flex flex-col items-center justify-center bg-black/50 border border-white/10 rounded-none w-20 h-20 shadow-inner">
                    <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Cible</span>
                    <span className="text-2xl font-black text-amber-500 drop-shadow-md">
                      {currentSelectedSlot.diceTarget}
                    </span>
                  </div>
                )}
                {!currentSelectedSlot.noCost && (
                  <div className="flex flex-col items-center justify-center bg-black/50 border border-white/10 rounded-none w-20 h-20 shadow-inner">
                    <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Coût</span>
                    <span className="text-2xl font-black text-blue-500 drop-shadow-md">{currentSelectedSlot.chakraCost}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-center h-full px-4 relative z-10">
            <div className="text-blue-400 font-bold uppercase tracking-wider text-sm">System Logs</div>
            <div className="text-gray-400 text-sm italic mt-1 flex items-center gap-2">
              <Info className="w-4 h-4 opacity-70" />
              Sélectionnez un emplacement ou le personnage pour afficher les détails. Double-cliquez pour griser un slot.
            </div>
          </div>
        )}
      </div>

      {/* Notes Area (Far Right) */}
      <div 
        className="absolute right-0 top-8 bottom-8 w-64 bg-black/40 border border-r-0 border-white/10 rounded-none p-6 flex flex-col z-10 backdrop-blur-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
          <Edit2 className="w-3 h-3" />
          Notes du Joueur
        </div>
        <textarea 
          spellCheck={false}
          className="flex-1 bg-transparent text-gray-300 text-sm resize-none focus:outline-none placeholder-white/20 leading-relaxed" 
          placeholder="Écrivez vos notes de campagne ici..."
          value={gameState.playerNotes}
          onChange={(e) => setGameState(prev => ({...prev, playerNotes: e.target.value}))}
        />
      </div>

      {/* Modals */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-none p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-center">
            <h2 className="text-xl font-bold text-red-400 uppercase tracking-widest">Avertissement</h2>
            <p className="text-gray-300 text-sm">
              Êtes-vous sûr de vouloir tout réinitialiser ? Cela supprimera toutes vos données de campagne.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button 
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleReset}
                className="px-6 py-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSlot && (
        <EditSlotModal 
          slot={editingSlot.slot} 
          onClose={() => setEditingSlot(null)}
          onSave={(updated) => updateSlot(updated, editingSlot.side)}
        />
      )}
      
      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          gameState={gameState}
          onClose={() => setIsGlobalSettingsOpen(false)}
          onSave={(updates) => {
            setGameState(prev => ({
              ...prev,
              ...updates,
              currentHp: Array.from({ length: updates.maxHp }).map((_, i) => i < prev.currentHp.length ? prev.currentHp[i] : true),
              currentChakra: Array.from({ length: updates.maxChakra }).map((_, i) => i < prev.currentChakra.length ? prev.currentChakra[i] : true),
            }));
            setIsGlobalSettingsOpen(false);
          }}
        />
      )}
      </div>
    </div>
  );
}

// --- Modals Components ---

function EditSlotModal({ slot, onClose, onSave }: { slot: SlotData, onClose: () => void, onSave: (s: SlotData) => void }) {
  const [data, setData] = useState<SlotData>(slot);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setData(prev => ({ ...prev, image: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-3xl border border-white/20 rounded-none p-8 w-full max-w-3xl shadow-2xl flex gap-8">
        
        {/* Left Image Preview */}
        <div className="flex flex-col gap-4 items-center w-48 flex-shrink-0">
          <div className="w-full aspect-square border border-white/10 rounded-none bg-black/50 shadow-inner relative overflow-hidden flex items-center justify-center">
             {data.image ? (
               <img src={data.image} className="w-full h-full object-cover opacity-90" />
             ) : (
               <span className="text-white/30 text-sm font-bold uppercase tracking-widest">Image</span>
             )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-none text-xs font-bold uppercase tracking-widest w-full transition-colors"
          >
            Changer Image
          </button>
          <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          {data.image && (
            <button 
              onClick={() => setData(prev => ({ ...prev, image: null }))}
              className="text-red-400/80 hover:text-red-400 text-xs uppercase font-bold tracking-wider"
            >
              Supprimer
            </button>
          )}
        </div>

        {/* Right Form */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-blue-400">Éditer le Slot</h2>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="bg-white/5 rounded-none border border-white/10 p-5 space-y-5 max-h-[60vh] overflow-y-auto">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] uppercase opacity-60 mb-2 font-bold tracking-widest text-white">Nom de la Tuile</label>
                <input 
                  type="text"
                  value={data.name || ''}
                  onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-white text-sm font-bold tracking-widest uppercase focus:outline-none focus:border-blue-500/50 shadow-inner"
                  placeholder="Ex: Épée, Potion..."
                />
              </div>
              <div className="w-1/3">
                <label className="block text-[10px] uppercase opacity-60 mb-2 font-bold tracking-widest text-white">Jauge Verte</label>
                <input 
                  type="number" min="0" max="20"
                  value={data.greenGaugeMax || 0}
                  onChange={(e) => setData(prev => ({ ...prev, greenGaugeMax: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-emerald-400 text-center font-bold text-sm focus:outline-none focus:border-emerald-500/50 shadow-inner"
                  placeholder="Max (0 = désactivé)"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase opacity-60 mb-2 font-bold tracking-widest text-white">Description</label>
              <textarea 
                value={data.description}
                onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-24 bg-black/50 border border-white/10 rounded-none p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500/50 shadow-inner"
                placeholder="Description ou effets de cette carte..."
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-white text-xs cursor-pointer hover:text-blue-300">
                <input type="checkbox" checked={data.noDice} onChange={(e) => setData(prev => ({...prev, noDice: e.target.checked}))} className="accent-blue-500" />
                Masquer Dé
              </label>
              <label className="flex items-center gap-2 text-white text-xs cursor-pointer hover:text-blue-300">
                <input type="checkbox" checked={data.noCost} onChange={(e) => setData(prev => ({...prev, noCost: e.target.checked}))} className="accent-blue-500" />
                Masquer Coût
              </label>
            </div>

            <div className="flex gap-6">
              <div className={cn("flex-1 space-y-2 transition-opacity duration-300", data.noDice && "opacity-30 grayscale pointer-events-none")}>
                <label className="block text-[10px] uppercase opacity-60 font-bold tracking-widest text-white">Cible Dé</label>
                <input 
                  type="number" 
                  value={data.diceTarget}
                  onChange={(e) => setData(prev => ({ ...prev, diceTarget: parseInt(e.target.value) || 0 }))}
                  disabled={data.noDice}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-amber-500 text-xl font-bold text-center focus:outline-none focus:border-amber-500/50 shadow-inner h-[46px]"
                />
              </div>

              <div className={cn("flex-1 space-y-2 transition-opacity duration-300", data.noCost && "opacity-30 grayscale pointer-events-none")}>
                <label className="block text-[10px] uppercase opacity-60 font-bold tracking-widest text-white">Coût Chakra</label>
                <input 
                  type="number" 
                  value={data.chakraCost}
                  onChange={(e) => setData(prev => ({ ...prev, chakraCost: parseInt(e.target.value) || 0 }))}
                  disabled={data.noCost}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-blue-500 text-xl font-bold text-center focus:outline-none focus:border-blue-500/50 shadow-inner h-[46px]"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-5 py-2 text-white/50 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">Annuler</button>
            <button onClick={() => onSave(data)} className="px-6 py-2 bg-blue-600/80 hover:bg-blue-500/80 border border-blue-500/50 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all">Sauvegarder</button>
          </div>
        </div>

      </div>
    </div>
  );
}

function GlobalSettingsModal({ gameState, onClose, onSave }: { gameState: GameState, onClose: () => void, onSave: (updates: Partial<GameState>) => void }) {
  const [maxHp, setMaxHp] = useState(gameState.maxHp);
  const [maxChakra, setMaxChakra] = useState(gameState.maxChakra);
  const [characterImage, setCharacterImage] = useState<string | null>(gameState.characterImage);
  const [characterName, setCharacterName] = useState(gameState.characterName || 'PERSONNAGE');
  const [characterDescription, setCharacterDescription] = useState(gameState.characterDescription);
  const [customStats, setCustomStats] = useState(gameState.customStats);
  const [hudColor, setHudColor] = useState(gameState.hudColor || '#1a1f2e');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    '#1a1f2e', // Default blue-grey
    '#3a1c12', // Warm brown
    '#1c2e1a', // Forest green
    '#2d1a29', // Deep purple
    '#2e1a1a', // Dark red
    '#1a2a2e', // Teal
    '#2e2a1a', // Olive
    '#0a0a0a', // True black
    '#1c1c1c', // Dark grey
    '#2b1b3d', // Royal violet
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCharacterImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateCustomStat = (index: number, field: 'name' | 'value' | 'isVisible', val: string | boolean) => {
    const newStats = [...customStats];
    newStats[index] = { ...newStats[index], [field]: val };
    setCustomStats(newStats);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-3xl border border-white/20 rounded-none p-8 w-full max-w-2xl shadow-2xl flex flex-col gap-6 max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-blue-400">Paramètres Globaux</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="overflow-y-auto pr-2 space-y-6">
          <div className="bg-white/5 rounded-none border border-white/10 p-5 space-y-6">
            <div className="flex gap-6">
              <div className="flex-1">
                <label className="block text-[10px] uppercase opacity-60 mb-2 font-bold tracking-widest text-white">Nombre de Vies (PV)</label>
                <input 
                  type="number" min="1" max="20"
                  value={maxHp}
                  onChange={(e) => setMaxHp(parseInt(e.target.value) || 1)}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-red-400 text-center font-bold text-xl shadow-inner focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] uppercase opacity-60 mb-2 font-bold tracking-widest text-white">Nombre de Chakra</label>
                <input 
                  type="number" min="1" max="20"
                  value={maxChakra}
                  onChange={(e) => setMaxChakra(parseInt(e.target.value) || 1)}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-blue-400 text-center font-bold text-xl shadow-inner focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[10px] uppercase opacity-60 mb-3 font-bold tracking-widest text-white">Personnage</label>
              <div className="flex items-start gap-4">
                <div className="w-16 h-32 border border-white/10 rounded-none bg-black/50 shadow-inner flex-shrink-0 overflow-hidden flex items-center justify-center">
                   {characterImage ? (
                     <img src={characterImage} className="w-full h-full object-cover opacity-80" />
                   ) : (
                     <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Image</span>
                   )}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <input 
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Nom du personnage"
                    className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-white font-bold tracking-widest uppercase text-sm shadow-inner focus:outline-none focus:border-blue-500/50"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-none text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      Changer Image
                    </button>
                    <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    {characterImage && (
                      <button onClick={() => setCharacterImage(null)} className="px-3 text-red-400/80 hover:text-red-400 text-xs font-bold uppercase tracking-wider text-left pl-1">
                        Retirer
                      </button>
                    )}
                  </div>
                  <textarea
                    value={characterDescription}
                    onChange={(e) => setCharacterDescription(e.target.value)}
                    placeholder="Description, notes sur le personnage..."
                    className="w-full h-14 bg-black/50 border border-white/10 rounded-none p-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500/50 shadow-inner mt-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <label className="block text-[10px] uppercase opacity-60 mb-3 font-bold tracking-widest text-white">Couleur du Fond</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setHudColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-none border-2 transition-all",
                      hudColor === c ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "border-white/10 hover:border-white/30"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <label className="block text-[10px] uppercase opacity-60 mb-3 font-bold tracking-widest text-white">Statistiques Personnalisées (sur l'image)</label>
              <div className="grid grid-cols-2 gap-4">
                {customStats.map((stat, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-black/30 p-2 rounded-none border border-white/5">
                    <input 
                      type="text" placeholder="Nom (ex: Force)"
                      value={stat.name} onChange={(e) => updateCustomStat(idx, 'name', e.target.value)}
                      className="w-1/2 bg-transparent text-white text-xs focus:outline-none placeholder-white/20 uppercase tracking-wider font-bold"
                    />
                    <input 
                      type="text" placeholder="Val (ex: 18)"
                      value={stat.value} onChange={(e) => updateCustomStat(idx, 'value', e.target.value)}
                      className="w-1/3 bg-black/50 border border-white/10 rounded-none px-2 py-1 text-white text-xs font-bold focus:outline-none focus:border-blue-500/50"
                    />
                    <label className="flex items-center justify-center w-6 h-6 cursor-pointer hover:bg-white/5 rounded-none">
                      <input 
                        type="checkbox" checked={stat.isVisible} 
                        onChange={(e) => updateCustomStat(idx, 'isVisible', e.target.checked)}
                        className="accent-blue-500 w-3 h-3"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-white/50 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">Annuler</button>
          <button 
            onClick={() => onSave({ maxHp, maxChakra, characterImage, characterName, characterDescription, customStats, hudColor })} 
            className="px-6 py-2 bg-blue-600/80 hover:bg-blue-500/80 border border-blue-500/50 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all"
          >
            Sauvegarder
          </button>
        </div>

      </div>
    </div>
  );
}

