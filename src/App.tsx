/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { GameState, SlotData } from './types';
import { Heart, Droplet, Settings, Edit2, Info, X, Image as ImageIcon, Trash2, Download, Upload, Plus, Minus, ArrowUp, ArrowDown, Check, Eye, EyeOff, Sun, Moon, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  if (!array) return chunks;
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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
      costColor: 'blue'
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
  characterName: 'CHARACTER',
  characterDescription: '',
  customStats: Array(10).fill(null).map(() => ({ name: '', value: '', isVisible: false })),
  playerNotes: '',
  leftSlots: generateInitialSlots('left', 1),
  rightSlots: generateInitialSlots('right', 7),
  hudColor: '#1a1f2e',
  isLightMode: false,
  slotScale: 1,
  slotOffsetY: 0,
  characterScale: 1,
  characterOffsetY: 0,
  isImmersiveMode: false,
  useStatBars: false,
  statBarsMax: 12,
  showHp: true,
  showChakra: true,
  showOrange: false,
  maxOrange: 10,
  currentOrange: Array(10).fill(true),
  showViolet: false,
  maxViolet: 10,
  currentViolet: Array(10).fill(true),
  counterHp: false,
  counterChakra: false,
  counterOrange: false,
  counterViolet: false,
  labelHp: 'XXX',
  labelChakra: 'XXX',
  labelOrange: 'XXX',
  labelViolet: 'XXX',
  slotTextSize: 6,
  charStatsTextSize: 10,
  characterDiceType: 'd12',
};

const SlotUI: React.FC<{ 
  slot: SlotData;
  side: 'left' | 'right';
  onClick: (slot: SlotData, side: 'left' | 'right') => void;
  onDoubleClick: (slot: SlotData, side: 'left' | 'right') => void;
  onGaugeClick?: (slotId: string, gaugeIndex: number, side: 'left' | 'right') => void;
  isSelected?: boolean;
  isEditMode?: boolean;
  textSize?: number;
}> = ({ 
  slot,
  side,
  onClick, 
  onDoubleClick,
  onGaugeClick,
  isSelected,
  isEditMode,
  textSize = 11
}) => {
  const isGaugeLeft = slot.slotNumber % 2 !== 0;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [slot.image]);
  
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

          <div 
            style={{ fontSize: `${textSize}px` }}
            className="absolute bottom-0 left-0 bg-slate-950/90 border-t border-r border-white/20 text-white font-mono font-bold tracking-widest z-10 px-1.5 py-0.5 pointer-events-none flex items-center gap-1.5 select-none whitespace-nowrap max-w-[95%] overflow-hidden text-ellipsis shadow-md"
          >
            <span className="text-white/50 font-black">#{slot.slotNumber}</span>
            {slot.name && <span className="text-white/95">{slot.name}</span>}
          </div>
          
          <div className="w-full h-full flex flex-col relative">
            <div className="flex-grow w-full flex items-center justify-center bg-black/40 relative">
              {slot.image && !imgError ? (
                <img 
                  src={slot.image} 
                  alt="slot" 
                  onError={() => setImgError(true)} 
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" 
                />
              ) : slot.image && imgError ? (
                <div className="absolute inset-0 bg-red-950/40 flex flex-col items-center justify-center border-2 border-red-500/50 p-2 select-none">
                  <span className="text-red-500 text-3xl font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse">!?</span>
                  <span className="text-[8px] text-red-400 font-bold tracking-wider uppercase mt-1 px-1 bg-black/60 text-center leading-tight">Missing Image</span>
                </div>
              ) : (
                <span className="text-white/20 text-3xl font-light">+</span>
              )}
            </div>
          </div>

          {isEditMode && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20">
              <Edit2 className="w-6 h-6 text-white/80" />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-1 min-h-[36px]">
          <div className="flex items-center justify-center bg-black/40 h-9 w-12 rounded-none border border-white/5 shadow-inner transition-opacity duration-300" style={{ opacity: slot.noDice ? 0 : 1 }}>
            <span className="text-xl font-black text-emerald-400 drop-shadow-md text-center">
              {slot.diceTarget}
            </span>
          </div>
          <div className="flex items-center justify-center bg-black/40 h-9 w-12 rounded-none border border-white/5 shadow-inner transition-opacity duration-300" style={{ opacity: slot.noCost ? 0 : 1 }}>
            <span className={cn(
              "text-xl font-black drop-shadow-md text-center",
              (slot.costColor || 'blue') === 'blue' && "text-blue-400",
              slot.costColor === 'red' && "text-red-400",
              slot.costColor === 'orange' && "text-orange-400",
              slot.costColor === 'violet' && "text-purple-400",
              slot.costColor === 'white' && "text-white"
            )}>
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
  const [charImgError, setCharImgError] = useState(false);

  useEffect(() => {
    setCharImgError(false);
  }, [gameState.characterImage]);

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
          alert("Invalid JSON file.");
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
  
  // Character dice rolling state
  const [rollState, setRollState] = useState<'idle' | 'charging' | 'rolling' | 'rolled'>('idle');
  const [pressProgress, setPressProgress] = useState(0);
  const [rolledValue, setRolledValue] = useState<number | null>(null);
  const [currentRollingValue, setCurrentRollingValue] = useState<number>(1);

  const pressTimerRef = useRef<number | null>(null);
  const rollAnimIntervalRef = useRef<number | null>(null);
  const rollAnimTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearPressTimers = () => {
    if (pressTimerRef.current) {
      cancelAnimationFrame(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const clearRollTimers = () => {
    if (rollAnimIntervalRef.current) {
      clearInterval(rollAnimIntervalRef.current);
      rollAnimIntervalRef.current = null;
    }
    if (rollAnimTimeoutRef.current) {
      clearTimeout(rollAnimTimeoutRef.current);
      rollAnimTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPressTimers();
      clearRollTimers();
    };
  }, []);
  
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
        <div className="text-blue-500 animate-pulse">Loading HUD...</div>
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

  const incrementHp = () => {
    setGameState((prev) => {
      const activeCount = prev.currentHp.filter(Boolean).length;
      if (activeCount >= prev.maxHp) return prev;
      const newHp = Array.from({ length: prev.maxHp }).map((_, i) => i < activeCount + 1);
      return { ...prev, currentHp: newHp };
    });
  };

  const decrementHp = () => {
    setGameState((prev) => {
      const activeCount = prev.currentHp.filter(Boolean).length;
      if (activeCount <= 0) return prev;
      const newHp = Array.from({ length: prev.maxHp }).map((_, i) => i < activeCount - 1);
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

  const incrementChakra = () => {
    setGameState((prev) => {
      const activeCount = prev.currentChakra.filter(Boolean).length;
      if (activeCount >= prev.maxChakra) return prev;
      const newChakra = Array.from({ length: prev.maxChakra }).map((_, i) => i < activeCount + 1);
      return { ...prev, currentChakra: newChakra };
    });
  };

  const decrementChakra = () => {
    setGameState((prev) => {
      const activeCount = prev.currentChakra.filter(Boolean).length;
      if (activeCount <= 0) return prev;
      const newChakra = Array.from({ length: prev.maxChakra }).map((_, i) => i < activeCount - 1);
      return { ...prev, currentChakra: newChakra };
    });
  };

  const toggleOrange = (index: number) => {
    setGameState((prev) => {
      const newOrange = [...(prev.currentOrange || Array(prev.maxOrange || 10).fill(true))];
      newOrange[index] = !newOrange[index];
      return { ...prev, currentOrange: newOrange };
    });
  };

  const incrementOrange = () => {
    setGameState((prev) => {
      const maxVal = prev.maxOrange || 10;
      const currentList = prev.currentOrange || Array(maxVal).fill(true);
      const activeCount = currentList.filter(Boolean).length;
      if (activeCount >= maxVal) return prev;
      const newOrange = Array.from({ length: maxVal }).map((_, i) => i < activeCount + 1);
      return { ...prev, currentOrange: newOrange };
    });
  };

  const decrementOrange = () => {
    setGameState((prev) => {
      const maxVal = prev.maxOrange || 10;
      const currentList = prev.currentOrange || Array(maxVal).fill(true);
      const activeCount = currentList.filter(Boolean).length;
      if (activeCount <= 0) return prev;
      const newOrange = Array.from({ length: maxVal }).map((_, i) => i < activeCount - 1);
      return { ...prev, currentOrange: newOrange };
    });
  };

  const toggleViolet = (index: number) => {
    setGameState((prev) => {
      const newViolet = [...(prev.currentViolet || Array(prev.maxViolet || 10).fill(true))];
      newViolet[index] = !newViolet[index];
      return { ...prev, currentViolet: newViolet };
    });
  };

  const incrementViolet = () => {
    setGameState((prev) => {
      const maxVal = prev.maxViolet || 10;
      const currentList = prev.currentViolet || Array(maxVal).fill(true);
      const activeCount = currentList.filter(Boolean).length;
      if (activeCount >= maxVal) return prev;
      const newViolet = Array.from({ length: maxVal }).map((_, i) => i < activeCount + 1);
      return { ...prev, currentViolet: newViolet };
    });
  };

  const decrementViolet = () => {
    setGameState((prev) => {
      const maxVal = prev.maxViolet || 10;
      const currentList = prev.currentViolet || Array(maxVal).fill(true);
      const activeCount = currentList.filter(Boolean).length;
      if (activeCount <= 0) return prev;
      const newViolet = Array.from({ length: maxVal }).map((_, i) => i < activeCount - 1);
      return { ...prev, currentViolet: newViolet };
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
      setSelectedItem(prev => 
        prev?.type === 'slot' && prev.slot.id === slot.id ? null : { type: 'slot', slot, side }
      );
    }
  };

  const handleCharacterClick = () => {
    if (isEditMode) {
      setIsGlobalSettingsOpen(true);
    }
  };

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isEditMode) return;
    
    if (rollState === 'rolled') {
      setRollState('idle');
      setRolledValue(null);
      setPressProgress(0);
      return;
    }
    if (rollState === 'rolling') {
      return;
    }

    clearPressTimers();
    clearRollTimers();

    setRollState('charging');
    setPressProgress(0);
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setPressProgress(progress);

      if (elapsed >= 2000) {
        // Trigger roll
        clearPressTimers();
        setRollState('rolling');
        setPressProgress(100);

        const diceType = gameState.characterDiceType || 'd12';
        const maxVal = diceType === 'd6' ? 6 : diceType === 'd8' ? 8 : diceType === 'd12' ? 12 : 20;

        rollAnimIntervalRef.current = window.setInterval(() => {
          const tempVal = Math.floor(Math.random() * maxVal) + 1;
          setCurrentRollingValue(tempVal);
        }, 60);

        rollAnimTimeoutRef.current = window.setTimeout(() => {
          if (rollAnimIntervalRef.current) {
            clearInterval(rollAnimIntervalRef.current);
            rollAnimIntervalRef.current = null;
          }
          
          const finalVal = Math.floor(Math.random() * maxVal) + 1;
          setRolledValue(finalVal);
          setRollState('rolled');
        }, 1000);
      } else {
        pressTimerRef.current = requestAnimationFrame(tick);
      }
    };

    pressTimerRef.current = requestAnimationFrame(tick);
  };

  const handlePressEnd = () => {
    if (rollState === 'charging') {
      clearPressTimers();
      setRollState('idle');
      setPressProgress(0);
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
  const colsOrange = (gameState.showOrange && !gameState.counterOrange) ? Math.ceil((gameState.maxOrange || 10) / 10) : 0;
  const colsViolet = (gameState.showViolet && !gameState.counterViolet) ? Math.ceil((gameState.maxViolet || 10) / 10) : 0;
  const effectiveColsOrange = gameState.showOrange ? (gameState.counterOrange ? 2 : colsOrange) : 0;
  const effectiveColsViolet = gameState.showViolet ? (gameState.counterViolet ? 2 : colsViolet) : 0;
  const maxSideCols = Math.max(effectiveColsOrange, effectiveColsViolet);
  
  // w-9 is 36px, gap is 6px, padding is 16px. Total approx 42px per col + padding.
  const sideWidth = maxSideCols > 0 ? `${maxSideCols * 42 + 16}px` : '1rem';

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
        {/* Immersive Mode Toggle (Always visible, placed BEFORE edit mode button) */}
        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            if (!isEditMode) {
              setGameState(prev => ({ ...prev, isImmersiveMode: !prev.isImmersiveMode })); 
            }
          }}
          disabled={isEditMode}
          title={isEditMode ? "Disable Edit Mode to enter Immersive Mode" : (gameState.isImmersiveMode ? "Exit Immersive Mode" : "Immersive Mode")}
          className={cn(
            "w-9 h-9 flex items-center justify-center border rounded-none backdrop-blur-md transition-all shadow-lg outline-none",
            isEditMode 
              ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed" 
              : gameState.isImmersiveMode 
                ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/40" 
                : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
          )}
        >
          {gameState.isImmersiveMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Other Controls (Hidden when in Immersive Mode) */}
        {!gameState.isImmersiveMode && (
          <>
            {/* Edit Mode Button (Icon-only: Pencil or Green Checkmark) */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditMode(!isEditMode); }}
              title={isEditMode ? "Save and exit Edit Mode" : "Edit Mode"}
              className={cn(
                "w-9 h-9 flex items-center justify-center border rounded-none backdrop-blur-md transition-all shadow-lg outline-none",
                isEditMode ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30" : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
              )}
            >
              {isEditMode ? <Check className="w-4 h-4 text-emerald-400 font-bold" /> : <Edit2 className="w-4 h-4" />}
            </button>

            {/* Light/Dark Mode Toggle (Icon-only) */}
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                setGameState(prev => ({ ...prev, isLightMode: !prev.isLightMode })); 
              }}
              title={gameState.isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className="w-9 h-9 flex items-center justify-center border rounded-none backdrop-blur-md transition-all shadow-lg bg-white/10 hover:bg-white/20 border-white/20 text-white outline-none"
            >
              {gameState.isLightMode ? <Moon className="w-4 h-4 text-sky-300" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {!isEditMode && (
              <>
                {/* Reset Viewport */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ 
                      ...prev, 
                      slotScale: 1, 
                      slotOffsetY: 0, 
                      characterScale: 1, 
                      characterOffsetY: 0, 
                      slotTextSize: 6, 
                      charStatsTextSize: 10, 
                      slotOffsetX: 0 
                    }));
                  }}
                  title="Reset Viewport"
                  className="w-9 h-9 flex items-center justify-center border border-white/20 bg-white/10 hover:bg-white/25 text-white/70 hover:text-white rounded-none backdrop-blur-md transition-all shadow-lg outline-none"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Tuiles (Slots) scale and position controls */}
            <div className="flex items-center h-9 bg-white/10 border border-white/20 backdrop-blur-md shadow-lg rounded-none divide-x divide-white/10">
              <span className="px-2.5 flex items-center h-full text-[9px] font-black tracking-widest text-white/50 select-none">Slots</span>
              <div className="flex items-center h-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, slotScale: Math.max(0.5, Number(((prev.slotScale ?? 1) - 0.05).toFixed(2))) }));
                  }}
                  title="Decrease slots size"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, slotScale: Math.min(2.0, Number(((prev.slotScale ?? 1) + 0.05).toFixed(2))) }));
                  }}
                  title="Increase slots size"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center h-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, slotOffsetY: (prev.slotOffsetY ?? 0) - 5 }));
                  }}
                  title="Move slots up"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, slotOffsetY: (prev.slotOffsetY ?? 0) + 5 }));
                  }}
                  title="Move slots down"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Slot Font Size +/- Controls */}
            <div className="flex items-center h-9 bg-white/10 border border-white/20 backdrop-blur-md shadow-lg rounded-none divide-x divide-white/10">
              <span className="px-2.5 flex items-center h-full text-[9px] font-black tracking-widest text-white/50 select-none">Slot Text</span>
              <div className="flex items-center h-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, slotTextSize: Math.max(4, (prev.slotTextSize ?? 6) - 1) }));
                  }}
                  title="Decrease slot text size"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, slotTextSize: Math.min(24, (prev.slotTextSize ?? 6) + 1) }));
                  }}
                  title="Increase slot text size"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Character Stats Font Size +/- Controls */}
            <div className="flex items-center h-9 bg-white/10 border border-white/20 backdrop-blur-md shadow-lg rounded-none divide-x divide-white/10">
              <span className="px-2.5 flex items-center h-full text-[9px] font-black tracking-widest text-white/50 select-none">Char Stats</span>
              <div className="flex items-center h-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, charStatsTextSize: Math.max(5, (prev.charStatsTextSize ?? 10) - 1) }));
                  }}
                  title="Decrease character stats text size"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, charStatsTextSize: Math.min(30, (prev.charStatsTextSize ?? 10) + 1) }));
                  }}
                  title="Increase character stats text size"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Perso (Character) scale and position controls */}
            <div className="flex items-center h-9 bg-white/10 border border-white/20 backdrop-blur-md shadow-lg rounded-none divide-x divide-white/10">
              <span className="px-2.5 flex items-center h-full text-[9px] font-black tracking-widest text-white/50 select-none">Char</span>
              <div className="flex items-center h-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, characterScale: Math.max(0.5, Number(((prev.characterScale ?? 1) - 0.05).toFixed(2))) }));
                  }}
                  title="Decrease character size"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, characterScale: Math.min(2.0, Number(((prev.characterScale ?? 1) + 0.05).toFixed(2))) }));
                  }}
                  title="Increase character size"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center h-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, characterOffsetY: (prev.characterOffsetY ?? 0) - 5 }));
                  }}
                  title="Move character up"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState(prev => ({ ...prev, characterOffsetY: (prev.characterOffsetY ?? 0) + 5 }));
                  }}
                  title="Move character down"
                  className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

                {/* Slot Gap (Spacing) controls */}
                <div className="flex items-center h-9 bg-white/10 border border-white/20 backdrop-blur-md shadow-lg rounded-none divide-x divide-white/10">
                  <span className="px-2.5 flex items-center h-full text-[9px] font-black tracking-widest text-white/50 select-none">Slot Gap</span>
                  <div className="flex items-center h-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Minus = decrease space (bring closer) -> slotOffsetX increases
                        setGameState(prev => ({ ...prev, slotOffsetX: Math.min(200, (prev.slotOffsetX ?? 0) + 10) }));
                      }}
                      title="Decrease space between slots"
                      className="w-8 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all outline-none"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={(gameState.slotOffsetX ?? 0) <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Plus = increase space (spread apart) -> slotOffsetX decreases (stopped at 0, which is initial default)
                        setGameState(prev => ({ ...prev, slotOffsetX: Math.max(0, (prev.slotOffsetX ?? 0) - 10) }));
                      }}
                      title={(gameState.slotOffsetX ?? 0) <= 0 ? "Initial default gap reached" : "Increase space between slots"}
                      className={cn(
                        "w-8 h-full flex items-center justify-center transition-all outline-none",
                        (gameState.slotOffsetX ?? 0) > 0 
                          ? "text-white/70 hover:text-white hover:bg-white/5" 
                          : "text-white/20 cursor-not-allowed bg-black/10"
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {isEditMode && (
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsResetConfirmOpen(true); }}
                  title="Reset Everything"
                  className="w-9 h-9 flex items-center justify-center bg-red-600/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-none backdrop-blur-md transition-all shadow-lg outline-none"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleExport(); }}
                  title="Export"
                  className="w-9 h-9 flex items-center justify-center bg-blue-600/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded-none backdrop-blur-md transition-all shadow-lg outline-none"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); importFileRef.current?.click(); }}
                  title="Import"
                  className="w-9 h-9 flex items-center justify-center bg-green-600/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-none backdrop-blur-md transition-all shadow-lg outline-none"
                >
                  <Upload className="w-4 h-4" />
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
          </>
        )}
      </div>

      {/* Main HUD Area */}
      <div className="flex-1 flex flex-row items-center justify-center pt-22 pb-4 px-8 pr-[18rem] min-h-0 relative">
        <div className="flex flex-row items-center justify-center h-full w-full max-w-[90rem] gap-12">
          {/* Left Slots */}
          <div 
            className="w-[32%] max-w-[30rem] h-full transition-transform duration-200 relative z-10"
            style={{
              transform: `translateX(${gameState.slotOffsetX ?? 0}px) scale(${gameState.slotScale ?? 1}) translateY(${gameState.slotOffsetY ?? 0}px)`,
              transformOrigin: 'center center'
            }}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 items-start content-center h-full py-4">
              {gameState.leftSlots.map((slot) => (
                <SlotUI 
                  key={slot.id} slot={slot} side="left" 
                  onClick={handleSlotClick} onDoubleClick={handleSlotDoubleClick}
                  onGaugeClick={handleGaugeClick}
                  isSelected={selectedItem?.type === 'slot' && selectedItem.slot.id === slot.id}
                  isEditMode={isEditMode}
                  textSize={gameState.slotTextSize ?? 11}
                />
              ))}
            </div>
          </div>

          {/* Center Area */}
          <div 
            className="flex flex-col items-center justify-center w-auto min-w-[12rem] px-2 md:px-4 flex-shrink-0 h-full transition-transform duration-200 relative z-20"
            style={{
              transform: `scale(${gameState.characterScale ?? 1}) translateY(${gameState.characterOffsetY ?? 0}px)`,
              transformOrigin: 'center center'
            }}
          >
            {/* Hearts (HP / Red bars) */}
            {(gameState.showHp ?? true) && (
              gameState.counterHp ? (
                <div className="flex items-center justify-center gap-6 mb-5 w-56 sm:w-60 md:w-64 select-none" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); decrementHp(); }}
                    className="w-10 h-10 flex items-center justify-center border rounded-none backdrop-blur-md transition-all outline-none bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 font-bold text-lg cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xl font-black tracking-widest text-red-400 min-w-[4rem] text-center">
                    {gameState.currentHp.filter(Boolean).length}/{gameState.maxHp}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); incrementHp(); }}
                    className="w-10 h-10 flex items-center justify-center border rounded-none backdrop-blur-md transition-all outline-none bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 font-bold text-lg cursor-pointer"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="flex flex-col-reverse items-center justify-center gap-y-1 mb-5 w-56 sm:w-60 md:w-64 select-none">
                  {chunkArray(gameState.currentHp, 5).map((row, rowIdx) => (
                    <div key={rowIdx} className="flex flex-row justify-center gap-x-[3px] w-full">
                      {row.map((isActive, idx) => {
                        const globalIdx = rowIdx * 5 + idx;
                        return (
                          <button key={globalIdx} onClick={(e) => { e.stopPropagation(); toggleHp(globalIdx); }} className="outline-none" style={{ width: 'calc(20% - 2.4px)' }}>
                            <div 
                              className={cn(
                                "h-[28px] rounded-none transition-all cursor-pointer border border-white/20 shadow-inner w-full",
                                isActive 
                                  ? "bg-red-600 border-red-400 shadow-[0_0_8px_rgba(220,38,38,0.5)]" 
                                  : "bg-black/50"
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Middle row containing: Left side bars, Character card, Right side bars */}
            <div className="flex flex-row items-stretch justify-center w-full max-w-[60rem]">
              {/* Left side: Orange bars */}
              <div 
                className="flex justify-end pr-2 md:pr-4 flex-shrink-0" 
                style={{ width: sideWidth, minWidth: sideWidth }}
              >
                {(gameState.showOrange ?? false) && (
                  gameState.counterOrange ? (
                    <div className="relative flex flex-col items-center justify-center gap-4 select-none h-full min-h-[16rem]" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); incrementOrange(); }}
                      className="w-10 h-10 flex items-center justify-center border rounded-none backdrop-blur-md transition-all outline-none bg-amber-500/20 border-amber-500/50 text-amber-500 hover:bg-amber-500/30 font-bold text-lg cursor-pointer"
                    >
                      +
                    </button>
                    <div className="text-xl font-black tracking-widest text-amber-500 flex flex-col items-center">
                      <span>{(gameState.currentOrange || []).filter(Boolean).length}</span>
                      <span className="text-xs opacity-50 my-0.5">/</span>
                      <span>{gameState.maxOrange || 10}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); decrementOrange(); }}
                      className="w-10 h-10 flex items-center justify-center border rounded-none backdrop-blur-md transition-all outline-none bg-amber-500/20 border-amber-500/50 text-amber-500 hover:bg-amber-500/30 font-bold text-lg cursor-pointer"
                    >
                      -
                    </button>
                  </div>
                ) : (
                  <div className="relative flex flex-row-reverse items-center justify-center gap-x-1.5 select-none h-full">
                    {chunkArray(gameState.currentOrange || Array(gameState.maxOrange || 10).fill(true), 10).map((column, colIdx) => (
                      <div 
                        key={colIdx} 
                        className="flex flex-col justify-center gap-y-[3px] w-8 sm:w-9"
                      >
                        {column.map((isActive, idx) => {
                          const globalIdx = colIdx * 10 + idx;
                          return (
                            <button key={globalIdx} onClick={(e) => { e.stopPropagation(); toggleOrange(globalIdx); }} className="outline-none w-full h-[24px]">
                              <div 
                                className={cn(
                                  "w-full h-full rounded-none transition-all cursor-pointer border border-white/20 shadow-inner",
                                  isActive 
                                    ? "bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                                    : "bg-black/50"
                                  )}
                              />
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )
              )}
              </div>

              {/* Character Wrapper with inner overlapping labels */}
              <div className="relative w-56 sm:w-60 md:w-64 aspect-[1/2] flex-shrink-0">
                {/* 1. TOP LABEL: HP (Red bars) */}
                {(gameState.showHp ?? true) && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-slate-950/95 border-2 border-red-500/80 text-red-400 px-3.5 py-1 text-xs font-mono font-black tracking-widest uppercase leading-none shadow-lg shadow-red-950/50 select-none pointer-events-none whitespace-nowrap">
                    {gameState.labelHp || 'HP'}
                  </div>
                )}

                {/* 2. BOTTOM LABEL: Chakra (Blue bars) */}
                {(gameState.showChakra ?? true) && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-45 bg-slate-950/95 border-2 border-blue-500/80 text-blue-400 px-3.5 py-1 text-xs font-mono font-black tracking-widest uppercase leading-none shadow-lg shadow-blue-950/50 select-none pointer-events-none whitespace-nowrap">
                    {gameState.labelChakra || 'CHAKRA'}
                  </div>
                )}

                {/* 3. LEFT LABEL: Orange bars (Vertical) */}
                {(gameState.showOrange ?? false) && (
                  <div 
                    className="absolute left-0 top-1/2 z-40 select-none pointer-events-none whitespace-nowrap"
                    style={{ transform: 'translate(-50%, -50%) rotate(-90deg)', transformOrigin: 'center' }}
                  >
                    <div className="bg-slate-950/95 border-2 border-amber-500/80 text-amber-500 px-3.5 py-1 text-xs font-mono font-black tracking-widest uppercase leading-none shadow-lg shadow-amber-950/50">
                      {gameState.labelOrange || 'ORANGE'}
                    </div>
                  </div>
                )}

                {/* 4. RIGHT LABEL: Violet bars (Vertical) */}
                {(gameState.showViolet ?? false) && (
                  <div 
                    className="absolute right-0 top-1/2 z-40 select-none pointer-events-none whitespace-nowrap"
                    style={{ transform: 'translate(50%, -50%) rotate(90deg)', transformOrigin: 'center' }}
                  >
                    <div className="bg-slate-950/95 border-2 border-purple-500/80 text-purple-400 px-3.5 py-1 text-xs font-mono font-black tracking-widest uppercase leading-none shadow-lg shadow-purple-950/50">
                      {gameState.labelViolet || 'VIOLET'}
                    </div>
                  </div>
                )}

                {/* Character Card Main Container (with overflow-hidden) */}
                <div 
                  onClick={(e) => { e.stopPropagation(); handleCharacterClick(); }}
                  onMouseDown={handlePressStart}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
                  className={cn(
                    "w-full h-full bg-white/5 rounded-none backdrop-blur-2xl relative shadow-2xl overflow-hidden group cursor-pointer transition-all select-none"
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
                  {gameState.characterImage && !charImgError ? (
                    <img 
                      src={gameState.characterImage} 
                      alt="Character" 
                      onError={() => setCharImgError(true)} 
                      className="w-full h-full object-cover absolute inset-0 z-0 opacity-80 pointer-events-none" 
                    />
                  ) : gameState.characterImage && charImgError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 z-0 border border-red-500/30 p-4 select-none">
                      <div className="w-40 h-80 bg-red-500/10 rounded-full blur-3xl absolute pointer-events-none"></div>
                      <span className="text-red-500 text-6xl font-black drop-shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse relative z-10">!?</span>
                      <span className="text-[10px] text-red-400 font-bold tracking-widest uppercase mt-3 px-2 py-0.5 bg-black/80 border border-red-500/20 relative z-10 text-center leading-tight">Image Not Found</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-40 z-0 pointer-events-none">
                      <div className="w-40 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
                      <ImageIcon className="w-16 h-16 text-white/30 absolute" />
                    </div>
                  )}
                  
                  <div className="absolute top-0 left-0 right-0 flex flex-col items-center justify-start z-20 pointer-events-none px-4 pt-6 text-center">
                    <span className="text-xl font-bold tracking-widest text-white drop-shadow-lg">{gameState.characterName}</span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-20 pointer-events-none flex flex-col gap-2 pt-10">
                    {gameState.useStatBars ? (
                      <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2 items-center w-full">
                        {gameState.customStats.filter(s => s.isVisible && s.name).map((stat, idx) => {
                          const numMatch = stat.value.match(/\d+(\.\d+)?/);
                          const numValue = numMatch ? parseFloat(numMatch[0]) : 0;
                          const maxVal = gameState.statBarsMax || 100;
                          const percent = Math.min(100, Math.max(0, (numValue / maxVal) * 100));

                           return (
                            <React.Fragment key={idx}>
                              {/* Stat Name */}
                              <span 
                                style={{ fontSize: `${gameState.charStatsTextSize ?? 10}px` }}
                                className="text-white font-bold tracking-widest whitespace-nowrap"
                              >
                                {stat.name}
                              </span>

                              {/* Stat Bar */}
                              <div className="h-1.5 bg-black/40 border border-white/5 relative overflow-hidden w-full">
                                <div 
                                  className="h-full bg-white transition-all duration-300"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>

                              {/* Stat Value */}
                              <span 
                                style={{ fontSize: `${(gameState.charStatsTextSize ?? 10) + 2}px` }}
                                className="text-white font-black text-right whitespace-nowrap min-w-[1.5rem]"
                              >
                                {stat.value}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ) : (
                      gameState.customStats.filter(s => s.isVisible && s.name).map((stat, idx) => (
                        <div key={idx} className="flex justify-between items-end w-full">
                          <span 
                            style={{ fontSize: `${gameState.charStatsTextSize ?? 10}px` }}
                            className="text-white font-bold tracking-widest"
                          >
                            {stat.name}
                          </span>
                          <span 
                            style={{ fontSize: `${(gameState.charStatsTextSize ?? 10) + 4}px` }}
                            className="text-white font-black"
                          >
                            {stat.value}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Character Dice Roll Overlay */}
                  {rollState !== 'idle' && (
                    <div 
                      className="absolute inset-0 bg-[#080b11]/95 z-50 flex flex-col items-center justify-center p-4 transition-all duration-300 animate-fade-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (rollState === 'rolled') {
                          setRollState('idle');
                          setRolledValue(null);
                        }
                      }}
                    >
                      {rollState === 'charging' && (
                        <div className="flex flex-col items-center justify-center gap-6">
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            {/* Circular SVG loader */}
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="48"
                                cy="48"
                                r="38"
                                className="stroke-white/5"
                                strokeWidth="6"
                                fill="transparent"
                              />
                              <circle
                                cx="48"
                                cy="48"
                                r="38"
                                className="stroke-blue-500 transition-all duration-75"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 38}
                                strokeDashoffset={2 * Math.PI * 38 * (1 - pressProgress / 100)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-xs font-mono font-black text-white">
                              {Math.round(pressProgress)}%
                            </span>
                          </div>
                          <div className="h-12 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase animate-pulse">
                              Charging Roll...
                            </span>
                          </div>
                        </div>
                      )}

                      {rollState === 'rolling' && (
                        <div className="flex flex-col items-center justify-center gap-6">
                          <DiceShape 
                            type={gameState.characterDiceType || 'd12'} 
                            value={currentRollingValue} 
                            isRolling={true} 
                          />
                          <div className="h-12 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase animate-pulse">
                              Rolling {gameState.characterDiceType?.toUpperCase() || 'D12'}...
                            </span>
                          </div>
                        </div>
                      )}

                      {rollState === 'rolled' && (
                        <div className="flex flex-col items-center justify-center gap-6 animate-fade-in">
                          <DiceShape 
                            type={gameState.characterDiceType || 'd12'} 
                            value={rolledValue ?? 1} 
                            isRolling={false} 
                          />
                          <div className="h-12 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase block mb-0.5">
                              Result
                            </span>
                            <span className="text-white/50 text-[9px] font-bold tracking-wider uppercase animate-pulse">
                              Click to clear
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Right side: Violet bars */}
              <div 
                className="flex justify-start pl-2 md:pl-4 flex-shrink-0"
                style={{ width: sideWidth, minWidth: sideWidth }}
              >
                {(gameState.showViolet ?? false) && (
                  gameState.counterViolet ? (
                    <div className="relative flex flex-col items-center justify-center gap-4 select-none h-full min-h-[16rem]" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); incrementViolet(); }}
                      className="w-10 h-10 flex items-center justify-center border rounded-none backdrop-blur-md transition-all outline-none bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30 font-bold text-lg cursor-pointer"
                    >
                      +
                    </button>
                    <div className="text-xl font-black tracking-widest text-purple-400 flex flex-col items-center">
                      <span>{(gameState.currentViolet || []).filter(Boolean).length}</span>
                      <span className="text-xs opacity-50 my-0.5">/</span>
                      <span>{gameState.maxViolet || 10}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); decrementViolet(); }}
                      className="w-10 h-10 flex items-center justify-center border rounded-none backdrop-blur-md transition-all outline-none bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30 font-bold text-lg cursor-pointer"
                    >
                      -
                    </button>
                  </div>
                ) : (
                  <div className="relative flex flex-row items-center justify-center gap-x-1.5 select-none h-full">
                    {chunkArray(gameState.currentViolet || Array(gameState.maxViolet || 10).fill(true), 10).map((column, colIdx) => (
                      <div 
                        key={colIdx} 
                        className="flex flex-col justify-center gap-y-[3px] w-8 sm:w-9"
                      >
                        {column.map((isActive, idx) => {
                          const globalIdx = colIdx * 10 + idx;
                          return (
                            <button key={globalIdx} onClick={(e) => { e.stopPropagation(); toggleViolet(globalIdx); }} className="outline-none w-full h-[24px]">
                              <div 
                                className={cn(
                                  "w-full h-full rounded-none transition-all cursor-pointer border border-white/20 shadow-inner",
                                  isActive 
                                    ? "bg-purple-600 border-purple-400 shadow-[0_0_8px_rgba(147,51,234,0.5)]" 
                                    : "bg-black/50"
                                )}
                              />
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )
              )}
              </div>
            </div>

            {/* Chakra (Blue bars) */}
            {(gameState.showChakra ?? true) && (
              gameState.counterChakra ? (
                <div className="flex items-center justify-center gap-6 mt-5 w-56 sm:w-60 md:w-64 select-none" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); decrementChakra(); }}
                    className="w-10 h-10 flex items-center justify-center border rounded-none backdrop-blur-md transition-all outline-none bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 font-bold text-lg cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xl font-black tracking-widest text-blue-400 min-w-[4rem] text-center">
                    {gameState.currentChakra.filter(Boolean).length}/{gameState.maxChakra}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); incrementChakra(); }}
                    className="w-10 h-10 flex items-center justify-center border rounded-none backdrop-blur-md transition-all outline-none bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 font-bold text-lg cursor-pointer"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-y-1 mt-5 w-56 sm:w-60 md:w-64 select-none">
                  {chunkArray(gameState.currentChakra, 5).map((row, rowIdx) => (
                    <div key={rowIdx} className="flex flex-row justify-center gap-x-[3px] w-full">
                      {row.map((isActive, idx) => {
                        const globalIdx = rowIdx * 5 + idx;
                        return (
                          <button key={globalIdx} onClick={(e) => { e.stopPropagation(); toggleChakra(globalIdx); }} className="outline-none" style={{ width: 'calc(20% - 2.4px)' }}>
                            <div 
                              className={cn(
                                "h-[28px] rounded-none transition-all cursor-pointer border border-white/20 shadow-inner w-full",
                                isActive 
                                  ? "bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                  : "bg-black/50"
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )
            )}

          </div>

          {/* Right Slots */}
          <div 
            className="w-[32%] max-w-[30rem] h-full transition-transform duration-200 relative z-10"
            style={{
              transform: `translateX(-${gameState.slotOffsetX ?? 0}px) scale(${gameState.slotScale ?? 1}) translateY(${gameState.slotOffsetY ?? 0}px)`,
              transformOrigin: 'center center'
            }}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 items-start content-center h-full py-4">
              {gameState.rightSlots.map((slot) => (
                <SlotUI 
                  key={slot.id} slot={slot} side="right" 
                  onClick={handleSlotClick} onDoubleClick={handleSlotDoubleClick}
                  onGaugeClick={handleGaugeClick}
                  isSelected={selectedItem?.type === 'slot' && selectedItem.slot.id === slot.id}
                  isEditMode={isEditMode}
                  textSize={gameState.slotTextSize ?? 11}
                />
              ))}
            </div>
          </div>
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
              <div className="text-blue-400 font-bold tracking-wider text-xs mb-1 flex items-center gap-4">
                <span>
                  {selectedItem.type === 'slot' && currentSelectedSlot 
                    ? (currentSelectedSlot.name || `SLOT #${currentSelectedSlot.slotNumber}`) 
                    : gameState.characterName}
                </span>

                {selectedItem.type === 'slot' && currentSelectedSlot && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSlotGreyedOut(currentSelectedSlot.id, selectedItem.side);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black tracking-widest border rounded-none transition-all duration-200 cursor-pointer shadow-md",
                      currentSelectedSlot.isGreyedOut
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 animate-pulse"
                        : "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20"
                    )}
                  >
                    {currentSelectedSlot.isGreyedOut ? "Restore" : "Grey Out"}
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed max-h-[4.5rem] overflow-y-auto pr-2">
                {selectedItem.type === 'slot' && currentSelectedSlot 
                  ? (currentSelectedSlot.description || <span className="text-white/30 italic">No description...</span>) 
                  : (gameState.characterDescription || <span className="text-white/30 italic">No description...</span>)}
              </p>
            </div>
            {selectedItem.type === 'slot' && currentSelectedSlot && (!currentSelectedSlot.noDice || !currentSelectedSlot.noCost) && (
              <div className="flex gap-6 flex-shrink-0 items-center">
                {!currentSelectedSlot.noDice && (
                  <div className="flex flex-col items-center justify-center bg-black/50 border border-white/10 rounded-none w-20 h-20 shadow-inner">
                    <span className="text-white/40 text-[10px] font-bold tracking-widest mb-1">Target</span>
                    <span className="text-2xl font-black text-emerald-400 drop-shadow-md">
                      {currentSelectedSlot.diceTarget}
                    </span>
                  </div>
                )}
                {!currentSelectedSlot.noCost && (
                  <div className="flex flex-col items-center justify-center bg-black/50 border border-white/10 rounded-none w-20 h-20 shadow-inner">
                    <span className="text-white/40 text-[10px] font-bold tracking-widest mb-1">Cost</span>
                    <span className={cn(
                      "text-2xl font-black drop-shadow-md",
                      (!currentSelectedSlot.costColor || currentSelectedSlot.costColor === 'blue') && "text-blue-500",
                      currentSelectedSlot.costColor === 'red' && "text-red-500",
                      currentSelectedSlot.costColor === 'orange' && "text-amber-500",
                      currentSelectedSlot.costColor === 'violet' && "text-purple-500",
                      currentSelectedSlot.costColor === 'white' && "text-white"
                    )}>{currentSelectedSlot.chakraCost}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-center h-full px-4 relative z-10">
            <div className="text-blue-400 font-bold tracking-wider text-sm">Informations</div>
            <div className="text-gray-400 text-sm italic mt-1 flex items-center gap-2">
              <Info className="w-4 h-4 opacity-70" />
              Select a slot to view details. Double-click to grey out a slot.
            </div>
          </div>
        )}
      </div>

      {/* Notes Area (Far Right) */}
      <div 
        className="absolute right-0 top-8 bottom-8 w-64 bg-black/40 border border-r-0 border-white/10 rounded-none p-6 flex flex-col z-10 backdrop-blur-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-blue-400 font-bold tracking-wider text-xs mb-4 flex items-center gap-2">
          <Edit2 className="w-3 h-3" />
          Player Notes
        </div>
        <textarea 
          spellCheck={false}
          className="flex-1 bg-transparent text-gray-300 text-sm resize-none focus:outline-none placeholder-white/20 leading-relaxed" 
          placeholder="Write your campaign notes here..."
          value={gameState.playerNotes}
          onChange={(e) => setGameState(prev => ({...prev, playerNotes: e.target.value}))}
        />
      </div>

      {/* Modals */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-none p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-center">
            <h2 className="text-xl font-bold text-red-400 tracking-widest">Warning</h2>
            <p className="text-gray-300 text-sm">
              Are you sure you want to reset everything? This will delete all your campaign data.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button 
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-none font-bold text-xs tracking-widest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleReset}
                className="px-6 py-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-none font-bold text-xs tracking-widest transition-all"
              >
                Reset
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
            setGameState(prev => {
              const activeHpCount = prev.currentHp.filter(Boolean).length;
              const newHp = Array.from({ length: updates.maxHp ?? prev.maxHp }).map((_, i) => i < activeHpCount);

              const activeChakraCount = prev.currentChakra.filter(Boolean).length;
              const newChakra = Array.from({ length: updates.maxChakra ?? prev.maxChakra }).map((_, i) => i < activeChakraCount);

              const activeOrangeCount = (prev.currentOrange || []).filter(Boolean).length;
              const newOrange = Array.from({ length: updates.maxOrange ?? prev.maxOrange ?? 10 }).map((_, i) => i < activeOrangeCount);

              const activeVioletCount = (prev.currentViolet || []).filter(Boolean).length;
              const newViolet = Array.from({ length: updates.maxViolet ?? prev.maxViolet ?? 10 }).map((_, i) => i < activeVioletCount);

              return {
                ...prev,
                ...updates,
                currentHp: newHp,
                currentChakra: newChakra,
                currentOrange: newOrange,
                currentViolet: newViolet,
              };
            });
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
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setPreviewError(false);
  }, [data.image]);

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
             {data.image && !previewError ? (
               <img src={data.image} onError={() => setPreviewError(true)} className="w-full h-full object-cover opacity-90 pointer-events-none" />
             ) : data.image && previewError ? (
               <div className="absolute inset-0 bg-red-950/40 flex flex-col items-center justify-center p-4 border border-red-500/30 select-none">
                 <span className="text-red-500 text-3xl font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse">!?</span>
                 <span className="text-[10px] text-red-400 font-bold tracking-widest uppercase mt-2 px-1.5 py-0.5 bg-black/60 text-center leading-none">Error Preview</span>
               </div>
             ) : (
               <span className="text-white/30 text-sm font-bold tracking-widest">Image</span>
             )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-none text-xs font-bold tracking-widest w-full transition-colors"
          >
            Change Image
          </button>
          <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          {data.image && (
            <button 
              onClick={() => setData(prev => ({ ...prev, image: null }))}
              className="text-red-400/80 hover:text-red-400 text-xs font-bold tracking-wider"
            >
              Delete
            </button>
          )}
        </div>

        {/* Right Form */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-blue-400">Edit Slot</h2>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="bg-white/5 rounded-none border border-white/10 p-5 space-y-5 max-h-[60vh] overflow-y-auto">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] opacity-60 mb-2 font-bold tracking-widest text-white">Slot Name</label>
                <input 
                  type="text"
                  value={data.name || ''}
                  onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-white text-sm font-bold tracking-widest focus:outline-none focus:border-blue-500/50 shadow-inner"
                  placeholder="e.g. Sword, Potion..."
                />
              </div>
              <div className="w-1/3">
                <label className="block text-[10px] opacity-60 mb-2 font-bold tracking-widest text-white">Green Gauge</label>
                <input 
                  type="number" min="0" max="20"
                  value={data.greenGaugeMax || 0}
                  onChange={(e) => setData(prev => ({ ...prev, greenGaugeMax: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-emerald-400 text-center font-bold text-sm focus:outline-none focus:border-emerald-500/50 shadow-inner"
                  placeholder="Max (0 = disabled)"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] opacity-60 mb-2 font-bold tracking-widest text-white">Description</label>
              <textarea 
                value={data.description}
                onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-24 bg-black/50 border border-white/10 rounded-none p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500/50 shadow-inner"
                placeholder="Description or effects of this card..."
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-white text-xs cursor-pointer hover:text-blue-300">
                <input type="checkbox" checked={data.noDice} onChange={(e) => setData(prev => ({...prev, noDice: e.target.checked}))} className="accent-blue-500" />
                Hide Die
              </label>
              <label className="flex items-center gap-2 text-white text-xs cursor-pointer hover:text-blue-300">
                <input type="checkbox" checked={data.noCost} onChange={(e) => setData(prev => ({...prev, noCost: e.target.checked}))} className="accent-blue-500" />
                Hide Cost
              </label>
            </div>

            <div className="flex gap-6">
              <div className={cn("flex-1 space-y-2 transition-opacity duration-300", data.noDice && "opacity-30 grayscale pointer-events-none")}>
                <label className="block text-[10px] opacity-60 font-bold tracking-widest text-white">Die Target</label>
                <input 
                  type="number" 
                  value={data.diceTarget}
                  onChange={(e) => setData(prev => ({ ...prev, diceTarget: parseInt(e.target.value) || 0 }))}
                  disabled={data.noDice}
                  className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-emerald-400 text-xl font-bold text-center focus:outline-none focus:border-emerald-500/50 shadow-inner h-[46px]"
                />
              </div>

              <div className={cn("flex-1 space-y-2 transition-opacity duration-300", data.noCost && "opacity-30 grayscale pointer-events-none")}>
                <label className="block text-[10px] opacity-60 font-bold tracking-widest text-white">Cost Value</label>
                <div className="flex gap-2 h-[46px]">
                  <input 
                    type="number" 
                    value={data.chakraCost}
                    onChange={(e) => setData(prev => ({ ...prev, chakraCost: parseInt(e.target.value) || 0 }))}
                    disabled={data.noCost}
                    className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-white text-xl font-bold text-center focus:outline-none shadow-inner"
                  />
                  <select 
                    value={data.costColor || 'blue'}
                    onChange={(e) => setData(prev => ({ ...prev, costColor: e.target.value as any }))}
                    disabled={data.noCost}
                    className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-white text-sm font-bold focus:outline-none shadow-inner"
                  >
                    <option value="blue">Blue</option>
                    <option value="red">Red</option>
                    <option value="orange">Orange</option>
                    <option value="violet">Violet</option>
                    <option value="white">White</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-5 py-2 text-white/50 hover:text-white font-bold text-xs tracking-widest transition-colors">Cancel</button>
            <button onClick={() => onSave(data)} className="px-6 py-2 bg-blue-600/80 hover:bg-blue-500/80 border border-blue-500/50 text-white rounded-none font-bold text-xs tracking-widest transition-all">Save</button>
          </div>
        </div>

      </div>
    </div>
  );
}

function GlobalSettingsModal({ gameState, onClose, onSave }: { gameState: GameState, onClose: () => void, onSave: (updates: Partial<GameState>) => void }) {
  const [maxHp, setMaxHp] = useState(gameState.maxHp);
  const [maxChakra, setMaxChakra] = useState(gameState.maxChakra);
  const [showHp, setShowHp] = useState(gameState.showHp ?? true);
  const [showChakra, setShowChakra] = useState(gameState.showChakra ?? true);
  const [showOrange, setShowOrange] = useState(gameState.showOrange ?? false);
  const [maxOrange, setMaxOrange] = useState(gameState.maxOrange ?? 10);
  const [showViolet, setShowViolet] = useState(gameState.showViolet ?? false);
  const [maxViolet, setMaxViolet] = useState(gameState.maxViolet ?? 10);
  const [counterHp, setCounterHp] = useState(gameState.counterHp ?? false);
  const [counterChakra, setCounterChakra] = useState(gameState.counterChakra ?? false);
  const [counterOrange, setCounterOrange] = useState(gameState.counterOrange ?? false);
  const [counterViolet, setCounterViolet] = useState(gameState.counterViolet ?? false);
  const [labelHp, setLabelHp] = useState(gameState.labelHp || 'HP');
  const [labelChakra, setLabelChakra] = useState(gameState.labelChakra || 'CHAKRA');
  const [labelOrange, setLabelOrange] = useState(gameState.labelOrange || 'ORANGE');
  const [labelViolet, setLabelViolet] = useState(gameState.labelViolet || 'VIOLET');
  const [characterImage, setCharacterImage] = useState<string | null>(gameState.characterImage);
  const [characterName, setCharacterName] = useState(gameState.characterName || 'CHARACTER');
  const [characterDescription, setCharacterDescription] = useState(gameState.characterDescription);
  const [customStats, setCustomStats] = useState(gameState.customStats);
  const [hudColor, setHudColor] = useState(gameState.hudColor || '#1a1f2e');
  const [useStatBars, setUseStatBars] = useState(gameState.useStatBars ?? false);
  const [statBarsMax, setStatBarsMax] = useState(gameState.statBarsMax ?? 100);
  const [slotCostColor, setSlotCostColor] = useState(gameState.slotCostColor || 'blue');
  const [characterDiceType, setCharacterDiceType] = useState(gameState.characterDiceType || 'd12');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [charPreviewError, setCharPreviewError] = useState(false);

  useEffect(() => {
    setCharPreviewError(false);
  }, [characterImage]);

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
          <h2 className="text-2xl font-bold text-blue-400">Global Settings</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="overflow-y-auto pr-2 space-y-6">
          <div className="bg-white/5 rounded-none border border-white/10 p-5 space-y-6">
            <div>
              <label className="block text-[10px] opacity-60 mb-3 font-bold tracking-widest text-white uppercase">Resource Bars</label>
              <div className="grid grid-cols-2 gap-4">
                {/* Red bars */}
                <div className="flex flex-col gap-2 bg-black/30 p-3 border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-white text-xs cursor-pointer select-none flex-shrink-0">
                      <input 
                        type="checkbox" 
                        checked={showHp} 
                        onChange={(e) => setShowHp(e.target.checked)}
                        className="accent-red-500 w-4 h-4" 
                      />
                      <span className="font-bold text-red-400 tracking-wider text-xs">Red Bars</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="HP"
                      value={labelHp}
                      onChange={(e) => setLabelHp(e.target.value)}
                      className="w-24 bg-black/50 border border-white/10 rounded-none px-1.5 py-0.5 text-right font-bold text-xs text-red-400 focus:outline-none focus:border-red-500/50 shadow-inner"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/50 tracking-wider">Max:</span>
                      <input 
                        type="number" min="1" max="50"
                        value={maxHp}
                        onChange={(e) => setMaxHp(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-black/50 border border-white/10 rounded-none p-1 text-center font-bold text-xs text-red-400 focus:outline-none focus:border-red-500/50"
                      />
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-white/70">
                      <input 
                        type="checkbox" 
                        checked={counterHp} 
                        onChange={(e) => setCounterHp(e.target.checked)}
                        className="accent-red-500 w-3.5 h-3.5" 
                      />
                      <span>Show +/-</span>
                    </label>
                  </div>
                </div>

                {/* Blue bars */}
                <div className="flex flex-col gap-2 bg-black/30 p-3 border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-white text-xs cursor-pointer select-none flex-shrink-0">
                      <input 
                        type="checkbox" 
                        checked={showChakra} 
                        onChange={(e) => setShowChakra(e.target.checked)}
                        className="accent-blue-500 w-4 h-4" 
                      />
                      <span className="font-bold text-blue-400 tracking-wider text-xs">Blue Bars</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="CHAKRA"
                      value={labelChakra}
                      onChange={(e) => setLabelChakra(e.target.value)}
                      className="w-24 bg-black/50 border border-white/10 rounded-none px-1.5 py-0.5 text-right font-bold text-xs text-blue-400 focus:outline-none focus:border-blue-500/50 shadow-inner"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/50 tracking-wider">Max:</span>
                      <input 
                        type="number" min="1" max="50"
                        value={maxChakra}
                        onChange={(e) => setMaxChakra(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-black/50 border border-white/10 rounded-none p-1 text-center font-bold text-xs text-blue-400 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-white/70">
                      <input 
                        type="checkbox" 
                        checked={counterChakra} 
                        onChange={(e) => setCounterChakra(e.target.checked)}
                        className="accent-blue-500 w-3.5 h-3.5" 
                      />
                      <span>Show +/-</span>
                    </label>
                  </div>
                </div>

                {/* Orange bars */}
                <div className="flex flex-col gap-2 bg-black/30 p-3 border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-white text-xs cursor-pointer select-none flex-shrink-0">
                      <input 
                        type="checkbox" 
                        checked={showOrange} 
                        onChange={(e) => setShowOrange(e.target.checked)}
                        className="accent-amber-500 w-4 h-4" 
                      />
                      <span className="font-bold text-amber-500 tracking-wider text-xs">Orange Bars</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="ORANGE"
                      value={labelOrange}
                      onChange={(e) => setLabelOrange(e.target.value)}
                      className="w-24 bg-black/50 border border-white/10 rounded-none px-1.5 py-0.5 text-right font-bold text-xs text-amber-500 focus:outline-none focus:border-amber-500/50 shadow-inner"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/50 tracking-wider">Max:</span>
                      <input 
                        type="number" min="1" max="50"
                        value={maxOrange}
                        onChange={(e) => setMaxOrange(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-black/50 border border-white/10 rounded-none p-1 text-center font-bold text-xs text-amber-500 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-white/70">
                      <input 
                        type="checkbox" 
                        checked={counterOrange} 
                        onChange={(e) => setCounterOrange(e.target.checked)}
                        className="accent-amber-500 w-3.5 h-3.5" 
                      />
                      <span>Show +/-</span>
                    </label>
                  </div>
                </div>

                {/* Violet bars */}
                <div className="flex flex-col gap-2 bg-black/30 p-3 border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-white text-xs cursor-pointer select-none flex-shrink-0">
                      <input 
                        type="checkbox" 
                        checked={showViolet} 
                        onChange={(e) => setShowViolet(e.target.checked)}
                        className="accent-purple-500 w-4 h-4" 
                      />
                      <span className="font-bold text-purple-400 tracking-wider text-xs">Violet Bars</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="VIOLET"
                      value={labelViolet}
                      onChange={(e) => setLabelViolet(e.target.value)}
                      className="w-24 bg-black/50 border border-white/10 rounded-none px-1.5 py-0.5 text-right font-bold text-xs text-purple-400 focus:outline-none focus:border-purple-500/50 shadow-inner"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/50 tracking-wider">Max:</span>
                      <input 
                        type="number" min="1" max="50"
                        value={maxViolet}
                        onChange={(e) => setMaxViolet(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-black/50 border border-white/10 rounded-none p-1 text-center font-bold text-xs text-purple-400 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-white/70">
                      <input 
                        type="checkbox" 
                        checked={counterViolet} 
                        onChange={(e) => setCounterViolet(e.target.checked)}
                        className="accent-purple-500 w-3.5 h-3.5" 
                      />
                      <span>Show +/-</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[10px] opacity-60 mb-3 font-bold tracking-widest text-white">Character</label>
              <div className="flex items-start gap-4">
                <div className="w-16 h-32 border border-white/10 rounded-none bg-black/50 shadow-inner flex-shrink-0 overflow-hidden flex items-center justify-center">
                   {characterImage && !charPreviewError ? (
                     <img src={characterImage} onError={() => setCharPreviewError(true)} className="w-full h-full object-cover opacity-80 pointer-events-none" />
                   ) : characterImage && charPreviewError ? (
                     <div className="absolute inset-0 bg-red-950/40 flex flex-col items-center justify-center p-2 border border-red-500/30 select-none">
                       <span className="text-red-500 text-2xl font-black drop-shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-pulse">!?</span>
                       <span className="text-[8px] text-red-400 font-bold tracking-tight text-center mt-1 uppercase leading-none">Error</span>
                     </div>
                   ) : (
                     <span className="text-white/30 text-[10px] font-bold tracking-widest">Image</span>
                   )}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <input 
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Character name"
                    className="w-full bg-black/50 border border-white/10 rounded-none p-2 text-white font-bold tracking-widest text-sm shadow-inner focus:outline-none focus:border-blue-500/50"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-none text-xs font-bold tracking-widest transition-colors"
                    >
                      Change Image
                    </button>
                    <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    {characterImage && (
                      <button onClick={() => setCharacterImage(null)} className="px-3 text-red-400/80 hover:text-red-400 text-xs font-bold tracking-wider text-left pl-1">
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    value={characterDescription}
                    onChange={(e) => setCharacterDescription(e.target.value)}
                    placeholder="Description, character notes..."
                    className="w-full h-14 bg-black/50 border border-white/10 rounded-none p-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500/50 shadow-inner mt-1"
                  />
                  
                  {/* Dice selection */}
                  <div className="flex items-center justify-between p-2.5 bg-black/40 border border-white/10 rounded-none mt-2">
                    <span className="text-xs text-white/80 font-bold tracking-wider">DICE ROLL TYPE</span>
                    <select
                      value={characterDiceType}
                      onChange={(e) => setCharacterDiceType(e.target.value as 'd6' | 'd8' | 'd12' | 'd20')}
                      className="bg-gray-950 border border-white/20 text-white rounded-none px-3 py-1 text-xs font-mono font-black focus:outline-none focus:border-blue-500 shadow-md cursor-pointer"
                    >
                      <option value="d6">D6</option>
                      <option value="d8">D8</option>
                      <option value="d12">D12 (Default)</option>
                      <option value="d20">D20</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <label className="block text-[10px] opacity-60 mb-3 font-bold tracking-widest text-white">Background Color</label>
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
              <label className="block text-[10px] opacity-60 mb-3 font-bold tracking-widest text-white">Custom Stats (on image)</label>
              
              {/* Option Barres de Progression */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white/5 border border-white/10 rounded-none mb-4">
                <label className="flex items-center gap-3 text-white text-xs cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={useStatBars} 
                    onChange={(e) => setUseStatBars(e.target.checked)}
                    className="accent-blue-500 w-4 h-4" 
                  />
                  <span>Show as progress bars</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold tracking-widest text-white/60", !useStatBars && "opacity-30")}>
                    Max Value :
                  </span>
                  <input 
                    type="number"
                    min="1"
                    value={statBarsMax}
                    disabled={!useStatBars}
                    onChange={(e) => setStatBarsMax(Math.max(1, parseInt(e.target.value) || 1))}
                    className={cn(
                      "w-20 bg-black/50 border border-white/10 rounded-none p-1 text-center font-bold text-sm text-blue-400 focus:outline-none focus:border-blue-500/50 shadow-inner",
                      !useStatBars && "opacity-30 cursor-not-allowed"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {customStats.map((stat, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-black/30 p-2 rounded-none border border-white/5">
                    <input 
                      type="text" placeholder="Name (e.g. Strength)"
                      value={stat.name} onChange={(e) => updateCustomStat(idx, 'name', e.target.value)}
                      className="w-1/2 bg-transparent text-white text-xs focus:outline-none placeholder-white/20 tracking-wider font-bold"
                    />
                    <input 
                      type="text" placeholder="Val (e.g. 18)"
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
          <button onClick={onClose} className="px-5 py-2 text-white/50 hover:text-white font-bold text-xs tracking-widest transition-colors">Cancel</button>
          <button 
            onClick={() => onSave({ maxHp, maxChakra, characterImage, characterName, characterDescription, customStats, hudColor, useStatBars, statBarsMax, showHp, showChakra, showOrange, maxOrange, showViolet, maxViolet, counterHp, counterChakra, counterOrange, counterViolet, labelHp, labelChakra, labelOrange, labelViolet, characterDiceType })} 
            className="px-6 py-2 bg-blue-600/80 hover:bg-blue-500/80 border border-blue-500/50 text-white rounded-none font-bold text-xs tracking-widest transition-all"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
}

const DiceShape: React.FC<{ type: 'd6' | 'd8' | 'd12' | 'd20', value: number, isRolling: boolean }> = ({ type, value, isRolling }) => {
  const getSvg = (colorClasses: string) => {
    switch (type) {
      case 'd6':
        return (
          <svg viewBox="0 0 100 100" className={cn("w-24 h-24 transition-all duration-300", colorClasses)}>
            <rect x="10" y="10" width="80" height="80" rx="16" fill="none" stroke="currentColor" strokeWidth="4.5" />
            <rect x="25" y="25" width="50" height="50" rx="8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.5" />
          </svg>
        );
      case 'd8':
        return (
          <svg viewBox="0 0 100 100" className={cn("w-24 h-24 transition-all duration-300", colorClasses)}>
            <polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="currentColor" strokeWidth="4.5" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="3" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          </svg>
        );
      case 'd20':
        return (
          <svg viewBox="0 0 100 100" className={cn("w-24 h-24 transition-all duration-300", colorClasses)}>
            <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" fill="none" stroke="currentColor" strokeWidth="4" />
            <polygon points="50,25 82,65 18,65" fill="none" stroke="currentColor" strokeWidth="3" />
            <line x1="50" y1="5" x2="50" y2="25" stroke="currentColor" strokeWidth="2" />
            <line x1="90" y1="28" x2="82" y2="65" stroke="currentColor" strokeWidth="2" />
            <line x1="90" y1="72" x2="82" y2="65" stroke="currentColor" strokeWidth="2" />
            <line x1="10" y1="72" x2="18" y2="65" stroke="currentColor" strokeWidth="2" />
            <line x1="10" y1="28" x2="18" y2="65" stroke="currentColor" strokeWidth="2" />
            <line x1="50" y1="95" x2="18" y2="65" stroke="currentColor" strokeWidth="2" />
            <line x1="50" y1="95" x2="82" y2="65" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'd12':
      default:
        return (
          <svg viewBox="0 0 100 100" className={cn("w-24 h-24 transition-all duration-300", colorClasses)}>
            <polygon points="50,5 95,38 78,90 22,90 5,38" fill="none" stroke="currentColor" strokeWidth="4" />
            <polygon points="50,28 75,46 65,75 35,75 25,46" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
            <line x1="50" y1="5" x2="50" y2="28" stroke="currentColor" strokeWidth="2.5" />
            <line x1="95" y1="38" x2="75" y2="46" stroke="currentColor" strokeWidth="2.5" />
            <line x1="78" y1="90" x2="65" y2="75" stroke="currentColor" strokeWidth="2.5" />
            <line x1="22" y1="90" x2="35" y2="75" stroke="currentColor" strokeWidth="2.5" />
            <line x1="5" y1="38" x2="25" y2="46" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        );
    }
  };

  // Dynamic colors & animations based on whether it is rolling or resolved (always green + pulsing lueur)
  const colorClass = isRolling 
    ? (type === 'd6' ? 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]' :
       type === 'd8' ? 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]' :
       type === 'd20' ? 'text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]' :
       'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]')
    : 'text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.95)]';

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Dice type displayed above the die */}
      <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400/90 uppercase mb-2 bg-emerald-950/40 px-2.5 py-0.5 border border-emerald-500/20 rounded-none select-none">
        {type}
      </span>

      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* SVG Shape background */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          isRolling ? "animate-spin" : "animate-pulse"
        )}>
          {getSvg(colorClass)}
        </div>
        {/* Number inside */}
        <span className="absolute text-3xl font-black text-white select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10">
          {value}
        </span>
      </div>
    </div>
  );
};

