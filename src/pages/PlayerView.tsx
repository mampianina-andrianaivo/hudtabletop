import React, { useState, useEffect, useRef } from 'react';
import { Home, Download, Upload, Settings, Wifi, WifiOff, ZoomIn, ZoomOut, User, Users, Swords, Sword, FileText, Lock, Sparkles, Dices, Eye, EyeOff, Copy, Check, Power, Cpu, Menu, X, ChevronRight, LayoutGrid, Zap, SlidersHorizontal, Scroll, Shield } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useGMStore } from '@/store/useGMStore';
import { useTheme } from '@/lib/useTheme';
import { useOnlineSync, sendOnlineRoll } from '@/lib/useOnlineSync';
import { ResourceBar } from '@/components/ResourceBar';
import { StatBar } from '@/components/StatBar';
import { SpellBook } from '@/components/SpellBook';
import { RollLogsSection } from '@/components/RollLogsSection';
import { PlayerConfigModal } from '@/components/PlayerConfigModal';
import { NoteTextarea } from '@/components/NoteTextarea';
import { cn, parseMax, parseMpCost, rollD12, evaluateSpellDice } from '@/lib/utils';
import { deserializeEncounter } from '@/lib/encounterUtils';

interface PlayerViewProps {
  onGoHome: () => void;
  onSwitchToGM: () => void;
}

export function PlayerView({ onGoHome, onSwitchToGM }: PlayerViewProps) {
  const store = usePlayerStore();
  const mpStore = useMultiplayerStore();
  const gmStore = useGMStore();
  const { theme, toggleTheme } = useTheme();

  const isScratch = !mpStore.isConnected;
  const rawEncounter = isScratch ? gmStore.currentDraw : mpStore.publishedEncounter;
  const activeEncounter = React.useMemo(() => {
    if (!rawEncounter) return null;
    const deserialized = deserializeEncounter(rawEncounter);
    if (isScratch && !deserialized?.published) return null;
    return (deserialized && Array.isArray(deserialized.lines) && deserialized.lines.length > 0) ? deserialized : null;
  }, [rawEncounter, isScratch]);
  
  // Ensure role is set for PlayerView
  useEffect(() => {
    if (useMultiplayerStore.getState().role !== 'gm') {
      useMultiplayerStore.setState({ role: 'player' });
    }
  }, []);

  // Start custom real-time syncing via polling
  const { registerOnDisconnect } = useOnlineSync();
  useEffect(() => {
    registerOnDisconnect(() => {
      onGoHome();
    });
  }, [registerOnDisconnect]);

  const [showConfig, setShowConfig] = useState(false);
  const [showVisibilityToggles, setShowVisibilityToggles] = useState(false);
  const [visiblePlayers, setVisiblePlayers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const roomKey = mpStore.roomName ? mpStore.roomName.trim().toLowerCase() : 'default';
      const saved = localStorage.getItem(`player_visible_players_${roomKey}`);
      if (saved) {
        setVisiblePlayers(JSON.parse(saved));
      } else {
        setVisiblePlayers({});
      }
    } catch (e) {
      console.error(e);
    }
  }, [mpStore.roomName]);

  const togglePlayerVisibility = (joinCode: string) => {
    const updated = { ...visiblePlayers, [joinCode]: !(visiblePlayers[joinCode] !== false) };
    setVisiblePlayers(updated);
    try {
      const roomKey = mpStore.roomName ? mpStore.roomName.trim().toLowerCase() : 'default';
      localStorage.setItem(`player_visible_players_${roomKey}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

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
    isPerfect?: boolean;
    targetName: string;
  } | null>(null);

  const [rolling, setRolling] = useState(false);
  const [copiedEncounter, setCopiedEncounter] = useState(false);
  const autoClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isSelectingStatForBoost, setIsSelectingStatForBoost] = useState(false);
  const [selectedStatForBoost, setSelectedStatForBoost] = useState<string | null>(null);

  // Mobile Vertical View & Navigation State
  const [isVerticalScreen, setIsVerticalScreen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isNonComputer, setIsNonComputer] = useState(false);
  const [activeZone, setActiveZone] = useState<string>(() => !useMultiplayerStore.getState().isConnected ? 'stats' : 'spells');

  useEffect(() => {
    if (activeZone === 'logs') {
      mpStore.setLastViewedLogCountPlayer(mpStore.rollLogs.length);
    }
  }, [activeZone, mpStore.rollLogs.length, mpStore.setLastViewedLogCountPlayer]);

  const spellsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOrientation = () => {
      setIsVerticalScreen(window.innerHeight > window.innerWidth);
      setWindowWidth(window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    if (typeof navigator !== 'undefined') {
      setIsNonComputer(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    }

    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const isVerticalMode = isVerticalScreen || isNonComputer || windowWidth < 1024;

  const getVerticalButtonClass = (zone: string) => {
    const isActive = activeZone === zone;
    if (theme === 'scifi') {
      return isActive
        ? "bg-cyan-500 text-slate-950 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
        : "bg-slate-950 text-cyan-400 border border-[#06b6d4]/20 hover:bg-slate-900";
    } else {
      return isActive
        ? "bg-wow-gold text-red-950 border border-amber-300 shadow-[0_0_10px_rgba(212,175,55,0.6)] font-bold"
        : "bg-[#4a0d0d] text-wow-gold border border-[#5a4b3c]/50 hover:bg-[#5e1212]";
    }
  };

  const handleConfirmStatBoost = async (statName: string) => {
    if (!statName) return;
    const isWaiting = mpStore.gmRequests?.some(r => r.joinCode === mpStore.joinCode && (r.type === 'ask_stat' || r.type === 'ask_spell'));
    const expIdx = store.resources.findIndex(r => r.name === 'EXP');
    const has3Exp = expIdx !== -1 && store.resources[expIdx].current >= 3;
    if (isWaiting || (!isFreeEdit && !has3Exp)) return;

    if (!mpStore.isConnected) {
      if (!isFreeEdit) {
        store.updateResource(expIdx, { current: Math.max(0, store.resources[expIdx].current - 3) });
      }
      const statIndex = store.stats.findIndex(s => s.name.toUpperCase() === statName.toUpperCase());
      if (statIndex !== -1) {
        const cur = store.stats[statIndex].current;
        store.updateStat(statIndex, { current: Math.min(12, cur + 1) });
      }
    } else {
      const { db } = await import('@/lib/firebase');
      const { updateDoc, arrayUnion, doc } = await import('firebase/firestore');
      if (db && mpStore.roomName) {
        const myName = store.name || mpStore.pseudo || 'Player';
        sendOnlineRoll({
          text: `${myName} requested +1 ${statName} boost from the GM`,
          type: 'info',
          playerName: myName
        });

        await updateDoc(doc(db, 'rooms', mpStore.roomName.trim().toLowerCase()), {
          gmRequests: arrayUnion({ 
            type: 'ask_stat', 
            targetStat: statName, 
            from: myName, 
            joinCode: mpStore.joinCode, 
            isFreeEdit, 
            ts: Date.now() 
          })
        });
      }
    }

    setIsSelectingStatForBoost(false);
    setSelectedStatForBoost(null);
  };

  const clearRollState = () => {
    if (autoClearTimerRef.current) {
      clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }
    setRollResult(null);
    setSelectedTarget(null);
    setIsSelectingTarget(false);
    if (isVerticalMode) {
      setActiveZone('stats');
    }
    if (isScratch) {
      resetScratchState();
    }
  };

  // Determine if we are viewing another player's sheet (View Mode)
  const isViewMode = Boolean(
    mpStore.isConnected && 
    mpStore.activePlayerView && 
    mpStore.activePlayerView !== 'me'
  );

  const activeKey = mpStore.activePlayerView || '';
  const viewedPlayer = isViewMode 
    ? (mpStore.roomPlayers[activeKey] || Object.values(mpStore.roomPlayers || {}).find(p => p?.joinCode === activeKey) || null)
    : null;
  const activeCharState = isViewMode ? viewedPlayer?.characterState : null;

  // Resolve active sheet fields safely
  const activeName = isViewMode ? (activeCharState?.name || viewedPlayer?.pseudo || 'Awaiting Sync...') : store.name;
  const activePhoto = isViewMode ? (activeCharState?.photo || null) : store.photo;
  const rawStats = isViewMode ? (Array.isArray(activeCharState?.stats) ? activeCharState.stats : []) : store.stats;
  const FIXED_STATS_NAMES = ['INTELLIGENCE', 'STRENGTH', 'SPEED', 'ACCURACY', 'PATIENCE', 'LUCK'];
  const enforcedStats = FIXED_STATS_NAMES.map((name, i) => {
    const existing = (Array.isArray(rawStats) && rawStats[i]) || { current: 0 };
    return { name, current: Number(existing?.current ?? 0), isVisible: true };
  });

  const visibleStats = enforcedStats;
  const activeStats = enforcedStats;

  let mpMax = 0;
  if (visibleStats.length === 1) {
    mpMax = (visibleStats[0]?.current ?? 0) * 2;
  } else if (visibleStats.length >= 2) {
    const sortedStats = [...visibleStats].sort((a, b) => (a?.current ?? 0) - (b?.current ?? 0));
    mpMax = (sortedStats[0]?.current ?? 0) + (sortedStats[1]?.current ?? 0);
  }


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

  const rawResources = isViewMode 
    ? (Array.isArray(activeCharState?.resources) ? activeCharState.resources : []) 
    : store.resources;

  const activeResources = [
    { name: 'HP', color: 'red' as const, isVisible: true, max: '3', current: Number(rawResources?.[0]?.current ?? 3) },
    { name: 'MP', color: 'blue' as const, isVisible: true, max: isScratch ? '0' : String(mpMax), current: isScratch ? 0 : Number(rawResources?.[1]?.current ?? 0) },
    { name: 'EXP', color: 'purple' as const, isVisible: true, max: '3', current: isScratch ? 0 : Number(rawResources?.[2]?.current ?? 0) }
  ];

  const activeSpells = isViewMode ? (Array.isArray(activeCharState?.spells) ? activeCharState.spells : []) : store.spells;
  
  const visibleResources = activeResources;
  const isFreeEdit = mpStore.isConnected ? mpStore.isFreeEdit : gmStore.isFreeEdit;
  const isRollsBlocked = mpStore.isConnected ? mpStore.blockPlayerRolls : gmStore.blockPlayerRolls;

  const handlePlayerRoll = () => {
    if (isRollsBlocked) return;
    if (rollResult !== null) {
      clearRollState();
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
      const roll = rollD12(selectedTarget.value);
      const isSuccess = roll <= selectedTarget.value;
      const isCrit = roll === 1 || roll === 12;
      const isPerfect = selectedTarget.value > 0 && roll === selectedTarget.value;

      // Critical bonus or Perfect roll bonus (+1 EXP)
      if ((isCrit || isPerfect) && !isScratch) {
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
            // Player lacks required MP -> drains remaining MP AND deducts 1 HP
            if (mpIdx !== -1 && currentMp > 0) {
              store.updateResource(mpIdx, { current: 0 });
            }
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

      // Perfect roll passive abilities activation (D = ●)
      if (isPerfect) {
        const currentSpells = usePlayerStore.getState().spells;
        const updatedSpells = currentSpells.map(s => {
          if ((s.dice || '').trim() === '●') {
            return { ...s, isActivated: true };
          }
          return s;
        });
        usePlayerStore.setState({ spells: updatedSpells });
      }

      // Log text format
      const targetLabel = selectedTarget.name;
      const critText = isCrit ? ' (critical)' : '';
      const statusText = isSuccess ? 'succeeded' : 'failed';
      const rollText = `Player ${activeName} ${statusText} to roll ${targetLabel} (${roll})${critText}`;

      const rollObj = {
        text: rollText,
        type: 'roll' as const,
        playerName: activeName,
        targetLabel: targetLabel,
        roll: roll,
        requiredValue: selectedTarget.value,
        isSuccess: isSuccess,
        isCrit: isCrit
      };

      if (mpStore.isConnected) {
        sendOnlineRoll(rollObj);
      } else {
        const currentLogs = useMultiplayerStore.getState().rollLogs || [];
        useMultiplayerStore.setState({
          rollLogs: [...currentLogs.slice(-49), {
            id: `roll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            pseudo: activeName,
            timestamp: Date.now(),
            ...rollObj
          }]
        });
      }

      setRollResult({
        roll,
        isSuccess,
        isCrit,
        isPerfect,
        targetName: targetLabel
      });
      setRolling(false);
      setIsSelectingTarget(false);

      // Auto clear after 5 seconds if not cleared manually
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
      }
      autoClearTimerRef.current = setTimeout(() => {
        clearRollState();
      }, 5000);
    }, 1500);
  };

  // Latest public roll log
  const latestRoll = mpStore.rollLogs[mpStore.rollLogs.length - 1];

  const handleExportJSON = () => {
    if (isScratch) {
      // Export full campaign campaignData
      const gmState = useGMStore.getState();
      if (!gmState.roomName || !gmState.roomName.trim()) {
        alert("Room name cannot be empty for export.");
        return;
      }

      const pStore = usePlayerStore.getState();
      const baseSpells = pStore.spells || [];
      const allSpellsMap = new Map();
      baseSpells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));
      Object.values(gmState.scratchPlayers).forEach((p: any) => {
        if (p?.characterState?.spells && Array.isArray(p.characterState.spells)) {
          p.characterState.spells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));
        }
      });
      const commonSpells = Array.from(allSpellsMap.values());

      const finalScratchPlayers: Record<string, any> = {};
      gmState.scratchLinks.forEach((link, idx) => {
        const existing: any = gmState.scratchPlayers[link] || { pseudo: '' };
        const pseudo = (existing.pseudo || '').trim() || `Player ${idx + 1}`;
        const playerSpellsMap = new Map();
        commonSpells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
        if (existing.characterState?.spells && Array.isArray(existing.characterState.spells)) {
          existing.characterState.spells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
        }

        finalScratchPlayers[link] = {
          ...existing,
          pseudo,
          characterState: {
            ...(existing.characterState || {
              name: pseudo,
              photo: pStore.photo || '',
              stats: pStore.stats || [],
              resources: pStore.resources || [],
              notes: pStore.notes || '',
            }),
            name: pseudo,
            spells: Array.from(playerSpellsMap.values()),
          }
        };
      });

      const campaignData = {
        roomName: gmState.roomName,
        shopSpells: gmState.shopSpells,
        encounters: gmState.encounters,
        currentDraw: gmState.currentDraw,
        isFreeEdit: false,
        isFreeShop: false,
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
        if (Array.isArray(json)) {
          alert("Format invalide : Ce fichier est un JSON de Shop (liste d'aptitudes), pas un JSON de Room ou de Personnage.");
          return;
        }
        if (!json || typeof json !== 'object') {
          alert("Fichier JSON invalide.");
          return;
        }
        if (isScratch) {
          const gmState = useGMStore.getState();
          if (json.roomName) gmState.updateRoomName(json.roomName);
          if (json.shopSpells) gmState.loadShopSpells(json.shopSpells);
          if (json.encounters) {
            useGMStore.setState({ encounters: json.encounters });
          }
          if (json.currentDraw !== undefined) {
            useGMStore.setState({ currentDraw: json.currentDraw });
          }
          useGMStore.setState({ isFreeEdit: false, isFreeShop: false });
          if (json.blockPlayerRolls !== undefined) {
            useGMStore.setState({ blockPlayerRolls: json.blockPlayerRolls });
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
    e.target.value = '';
  };

  return (
    <div className="bg-iron text-white flex flex-col p-2 md:p-3 select-none h-full w-full overflow-hidden">
      
      {/* TOP HEADER CONTAINER */}
      {isVerticalMode ? (
        <div className="bg-[#120d08] border-b-2 border-[#5a4b3c] shadow-2xl p-2 -mx-2 -mt-2 mb-3 flex flex-col gap-1.5 shrink-0">
          {/* Line 1: Character Header with Theme Toggle */}
          <div className="wow-panel flex items-center justify-between py-1 px-2.5 shadow-md gap-2 relative">
            <div className="font-cinzel text-xs sm:text-sm text-wow-gold tracking-[0.2em] font-bold text-center truncate flex-1 uppercase px-1">
              {activeName || "CHARACTER"}
            </div>

            <button
              onClick={toggleTheme}
              className="wow-button py-1 px-2 text-[10px] uppercase font-cinzel font-bold text-wow-gold border border-[#5a4b3c] bg-black/40 hover:bg-black/70 flex items-center gap-1 shrink-0 cursor-pointer"
              title="Switch theme (Fantasy / Sci-Fi)"
            >
              {theme === 'scifi' ? (
                <>
                  <Cpu size={12} className="text-cyan-400" />
                  <span className="hidden sm:inline">SCI-FI</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} className="text-wow-gold" />
                  <span className="hidden sm:inline">FANTASY</span>
                </>
              )}
            </button>
          </div>

          {/* Line 2: Connection / Sync Status Bar */}
          <div className="wow-panel flex items-center justify-between py-1 px-2.5 shadow-sm min-h-[32px] gap-2">
            {!mpStore.isConnected && (
              <button onClick={onGoHome} className="wow-button px-2 py-0.5 flex items-center gap-1 text-[11px] shrink-0">
                <Home size={12} /> <span>Home</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 font-mono text-[10px] truncate flex-1 justify-center">
              {mpStore.isConnected ? (
                <div className="flex items-center gap-1 text-green-400 bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded shadow-inner truncate">
                  <Wifi size={11} />
                  <span className="font-cinzel tracking-wider truncate max-w-[140px]">ONLINE: {mpStore.roomName}</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <button onClick={onSwitchToGM} className="wow-button text-[10px] py-0.5 px-2 font-cinzel w-[195px] text-center text-wow-gold flex items-center justify-center gap-1.5 border border-[#5a4b3c]">
                    <Shield size={12} /> SWITCH TO GM
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0">
          {/* Section 1: Home / Status Button (lg:col-span-5) */}
          <div className="lg:col-span-5 wow-panel flex items-center gap-3 py-2 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px]">
            {!mpStore.isConnected && (
              <button onClick={onGoHome} className="wow-button px-3 py-1.5 flex items-center gap-2 text-sm shrink-0">
                <Home size={15} /> <span className="hidden sm:inline">Home</span>
              </button>
            )}
            
            <div className="flex items-center gap-1.5 font-mono text-[11px]" title="Sync Status">
              {mpStore.isConnected ? (
                <div className="flex items-center gap-1 text-green-400 bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded shadow-inner">
                  <Wifi size={12} />
                  <span className="font-cinzel tracking-wider truncate max-w-[120px]">ONLINE: {mpStore.roomName}</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <button onClick={onSwitchToGM} className="wow-button text-[10px] py-1 px-3 font-cinzel w-[225px] text-center text-wow-gold flex items-center justify-center gap-2 border border-[#5a4b3c]">
                    <Shield size={14} /> SWITCH TO GM
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Character Name Header (lg:col-span-4) */}
          <div className={cn(
            "lg:col-span-4 wow-panel flex items-center justify-between py-2 px-3 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px] gap-2 relative",
            isViewMode && "!border-red-600 !border-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
          )}>
            <div className="font-cinzel text-xs sm:text-sm text-wow-gold tracking-[0.2em] font-bold text-center truncate flex-1 uppercase px-1">
              {activeName || "CHARACTER"}
            </div>

            <button
              onClick={toggleTheme}
              className="wow-button py-1 px-2 text-[10px] uppercase font-cinzel font-bold text-wow-gold border border-[#5a4b3c] bg-black/40 hover:bg-black/70 flex items-center gap-1 shrink-0 cursor-pointer"
              title="Switch theme (Fantasy / Sci-Fi)"
            >
              {theme === 'scifi' ? (
                <>
                  <Cpu size={12} className="text-cyan-400" />
                  <span className="hidden sm:inline">SCI-FI</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} className="text-wow-gold" />
                  <span className="hidden sm:inline">FANTASY</span>
                </>
              )}
            </button>
          </div>

          {/* Section 3: Load / Export / Disconnect buttons (lg:col-span-3) */}
          <div className="lg:col-span-3 wow-panel scifi-no-tracing flex items-center justify-end gap-2 py-2 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px] overflow-hidden">
            <label className="wow-button p-2 cursor-pointer flex items-center justify-center gap-1.5 text-xs shrink-0 font-sans font-bold" title="LOAD">
              <Upload size={14} /> <span>I</span>
              <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
            </label>
            <button onClick={handleExportJSON} className="wow-button p-2 flex items-center justify-center gap-1.5 text-xs shrink-0 font-sans font-bold" title="EXPORT">
              <Download size={14} /> <span>E</span>
            </button>
            
            {mpStore.isConnected && (
              <>
                <div className="w-px h-6 bg-[#5a4b3c]/40 mx-1 shrink-0"></div>
                <div className="text-[10px] text-white font-mono tracking-widest bg-black/30 border border-[#5a4b3c]/10 px-2 py-1 rounded truncate shrink-0" title={`CODE: ${mpStore.joinCode}`}>
                  CODE: <span className="text-wow-gold font-bold">{mpStore.joinCode}</span>
                </div>
                <button 
                  onClick={() => {
                    if (confirm("Disconnect from room?")) {
                      mpStore.disconnect();
                      onGoHome();
                    }
                  }}
                  className="wow-button p-2 text-red-400 border-red-800/60 bg-red-950/10 hover:bg-red-900/30 shrink-0 flex items-center justify-center"
                  title="DISCONNECT"
                >
                  <Power size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* HORIZONTAL WRAPPER FOR VERTICAL SIDEBAR AND MAIN GRID */}
      <div className="flex-1 flex gap-2.5 overflow-hidden h-full w-full">
        {/* PERMANENT VERTICAL SIDEBAR FOR VERTICAL SCREEN MODE ONLY */}
        {isVerticalMode && (
          <div className="flex flex-col items-center p-1 bg-black/40 border border-[#5a4b3c]/60 rounded shrink-0 h-full justify-start w-11 shadow-2xl relative z-10">
            <div className="h-3/4 w-full flex flex-col gap-2 items-center py-2">
              <button
                onClick={() => setActiveZone('logs')}
                className={cn("w-9 flex-1 flex items-center justify-center rounded transition-all duration-150 cursor-pointer shrink-0 relative", getVerticalButtonClass('logs'))}
                title="Roll Logs"
              >
                <Scroll size={18} />
                {mpStore.rollLogs.length > mpStore.lastViewedLogCountPlayer && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 border border-black text-white font-bold text-[9px] font-sans rounded-full flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-10">
                    {Math.min(9, mpStore.rollLogs.length - mpStore.lastViewedLogCountPlayer)}
                  </div>
                )}
              </button>
              <button
                onClick={() => setActiveZone('spells')}
                className={cn("w-9 flex-1 flex items-center justify-center rounded transition-all duration-150 cursor-pointer shrink-0", getVerticalButtonClass('spells'))}
                title="Abilities (Grimoire)"
              >
                <Zap size={18} />
              </button>
              <button
                onClick={() => setActiveZone('stats')}
                className={cn("w-9 flex-1 flex items-center justify-center rounded transition-all duration-150 cursor-pointer shrink-0 relative", getVerticalButtonClass('stats'))}
                title="Character Sheet & Stats"
              >
                <User size={18} />
                {activeEncounter && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-wow-gold border border-black text-[#1c120c] font-extrabold text-[9px] font-sans rounded-full flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-10">
                    !!
                  </div>
                )}
              </button>
              <button
                onClick={() => setActiveZone('players')}
                className={cn("w-9 flex-1 flex items-center justify-center rounded transition-all duration-150 cursor-pointer shrink-0", getVerticalButtonClass('players'))}
                title="Player List & GM"
              >
                <Users size={18} />
              </button>
              <button
                onClick={() => setActiveZone('notes')}
                className={cn("w-9 flex-1 flex items-center justify-center rounded transition-all duration-150 cursor-pointer shrink-0", getVerticalButtonClass('notes'))}
                title="Notes & Journal"
              >
                <FileText size={18} />
              </button>
              <button
                onClick={() => setActiveZone('header3')}
                className={cn("w-9 flex-1 flex items-center justify-center rounded transition-all duration-150 cursor-pointer shrink-0", getVerticalButtonClass('header3'))}
                title="Import / Export Options"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 h-full min-h-0 overflow-hidden relative">
          {/* Main Layout Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden h-full w-full">
            
            {/* COLUMN 1: SPELLS grimoire / ROLL LOGS (col-span-5) */}
            {(!isVerticalMode || activeZone === 'all' || activeZone === 'logs' || activeZone === 'spells') && (
              <div 
                ref={spellsRef}
                className={cn(
                  "lg:col-span-5 wow-panel flex flex-col overflow-hidden shadow-xl bg-leather relative",
                  isVerticalMode && activeZone !== 'all' ? "h-full min-h-0 w-full" : "h-full min-h-0",
                  isViewMode && "!border-red-600 !border-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                )}
              >
                <div className={cn("absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 opacity-30 m-1", isViewMode ? "border-red-600" : "border-wow-gold")}></div>
                <div className={cn("absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 opacity-30 m-1", isViewMode ? "border-red-600" : "border-wow-gold")}></div>
                <div className={cn("absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 opacity-30 m-1", isViewMode ? "border-red-600" : "border-wow-gold")}></div>
                <div className={cn("absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 opacity-30 m-1", isViewMode ? "border-red-600" : "border-wow-gold")}></div>
                
                {/* Tiers 1: Roll Logs Section */}
                {(!isVerticalMode || activeZone === 'all' || activeZone === 'logs') && (
                  <div className={cn(
                    "flex flex-col overflow-visible",
                    isVerticalMode && activeZone === 'logs' ? "h-full min-h-0" : "h-1/3 min-h-0 pb-2"
                  )}>
                    <RollLogsSection />
                  </div>
                )}
                
                {/* Tiers 2 & 3: Spells SpellBook */}
                {(!isVerticalMode || activeZone === 'all' || activeZone === 'spells') && (
                  <div className={cn(
                    "flex flex-col overflow-hidden",
                    isVerticalMode && activeZone === 'spells' ? "h-full min-h-0" : "h-2/3 min-h-0 pt-2 border-t border-[#5a4b3c]/30"
                  )}>
                    <SpellBook 
                      spells={activeSpells} 
                      playerStats={activeStats}
                      readOnly={isViewMode} 
                      playerName={isViewMode ? activeName : undefined}
                      targetModeProps={{
                        isSelectingTarget,
                        isVerticalMode,
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
                            const evalRes = evaluateSpellDice(spell, activeStats);
                            const diceVal = typeof evalRes.effectiveD === 'number' ? evalRes.effectiveD : 12;
                            setSelectedTarget({
                              type: 'spell',
                              id: spell.id,
                              name: spell.name,
                              value: diceVal,
                              spell
                            });
                          }
                        },
                        onLaunchRoll: () => {
                          if (!rolling) {
                            handlePlayerRoll();
                          }
                        },
                        onSwitchToStats: () => {
                          if (isVerticalMode) {
                            setActiveZone('stats');
                          } else {
                            statsRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }
                        },
                        onCancelTargeting: () => {
                          setSelectedTarget(null);
                          setIsSelectingTarget(false);
                          setRollResult(null);
                          if (isVerticalMode) {
                            setActiveZone('stats');
                          }
                        },
                        playerMp: activeResources.find(r => r.name === 'MP')?.current || 0,
                        playerHp: activeResources.find(r => r.name === 'HP')?.current || 0,
                        isConnected: mpStore.isConnected
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* COLUMN 2: CHARACTER stats, resource trackers, and toggleable Encounter board (col-span-4) */}
            {(!isVerticalMode || activeZone === 'all' || activeZone === 'stats') && (
              <div 
                ref={statsRef}
                className={cn(
                  "lg:col-span-4 wow-panel flex flex-col shadow-xl bg-leather p-3 relative overflow-hidden",
                  isVerticalMode && activeZone !== 'all' ? "h-full min-h-0 w-full overflow-y-auto" : "h-full min-h-0",
                  isViewMode && "!border-red-600 !border-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                )}
              >
                {/* RESERVED SLOT FOR TARGETING SWITCH BUTTON (TO ABILITIES) & CANCEL */}
                <div className="mb-2 shrink-0 h-8 flex gap-2 w-full">
                  {/* Cancel/X Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTarget(null);
                      setIsSelectingTarget(false);
                      setRollResult(null);
                      if (isVerticalMode) {
                        setActiveZone('stats');
                      }
                    }}
                    className={cn(
                      "h-full w-10 shrink-0 font-cinzel font-bold text-xs uppercase rounded border flex items-center justify-center shadow-md bg-red-950/90 text-red-400 border-red-800/80 hover:bg-red-900 hover:text-white transition-colors cursor-pointer",
                      isSelectingTarget && isVerticalMode ? "opacity-100 pointer-events-auto" : "invisible"
                    )}
                    title="Annuler le ciblage"
                  >
                    <X size={14} className="stroke-[2.5]" />
                  </button>

                  {/* Switch Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isVerticalMode) {
                        setActiveZone('spells');
                      } else {
                        spellsRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={cn(
                      "flex-1 h-full py-1 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider font-cinzel rounded border flex items-center justify-center gap-2 shadow-md select-none bg-amber-950/90 text-amber-300 border-amber-500/80",
                      isSelectingTarget && isVerticalMode ? "opacity-100 cursor-pointer pointer-events-auto hover:bg-amber-900 shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "invisible"
                    )}
                  >
                    <span>SWITCH TO ABILITIES (GRIMOIRE)</span>
                  </button>
                </div>
              
              {/* Controls row (ASK FOR STAT + Symmetrical Zoom & Controls) - centered above 3 squares */}
              <div className="flex flex-col items-center justify-center gap-1.5 w-full border-b border-[#5a4b3c]/20 pb-1.5 mb-1.5 shrink-0">
                {/* Row 1: H-, W- | ASK FOR STAT | W+, H+ */}
                <div className="flex items-center justify-center gap-1.5 w-full flex-wrap">
                  {/* ALL MINUS CONTROLS (LEFT of ZoomOut) */}
                  <div className="flex gap-0.5 items-center shrink-0">
                    <button 
                      onClick={() => store.decreasePhotoHeight?.()}
                      className="wow-button px-1.5 py-0.5 text-wow-gold hover:text-white flex items-center justify-center text-[10px] font-mono h-[22px]"
                      title="Diminuer la hauteur de la photo"
                    >
                      H-
                    </button>
                    <button 
                      onClick={() => store.decreasePhotoWidth?.()}
                      className="wow-button px-1.5 py-0.5 text-wow-gold hover:text-white flex items-center justify-center text-[10px] font-mono h-[22px]"
                      title="Diminuer la largeur de la photo"
                    >
                      W-
                    </button>
                    <button 
                      onClick={() => store.decreaseBarHeight?.()}
                      className="wow-button px-1.5 py-0.5 text-wow-gold hover:text-white items-center justify-center text-[10px] font-mono h-[22px] lg:flex hidden"
                      title="Diminuer la hauteur des barres de stat"
                    >
                      B-
                    </button>
                  </div>

                  {/* LOUPE MINUS */}
                  <button 
                    onClick={() => store.decreaseTextSize()}
                    className="wow-button p-1 text-wow-gold hover:text-white lg:flex hidden"
                    title="Réduire la taille du texte"
                  >
                    <ZoomOut size={14} />
                  </button>

                  {/* CENTER: ASK FOR STAT */}
                  {(() => {
                    const isWaiting = mpStore.gmRequests?.some(r => r.joinCode === mpStore.joinCode && (r.type === 'ask_stat' || r.type === 'ask_spell'));
                    const has3Exp = (store.resources.find(r => r.name === 'EXP')?.current ?? 0) >= 3;
                    const canAsk = !isFreeEdit && has3Exp && !isWaiting;
                    return (
                      <button 
                        disabled={isFreeEdit || (!canAsk && !isSelectingStatForBoost)}
                        onClick={() => {
                           if (isWaiting || isFreeEdit) return;
                           if (isSelectingStatForBoost) {
                             setIsSelectingStatForBoost(false);
                             setSelectedStatForBoost(null);
                           } else if (canAsk) {
                             setIsSelectingStatForBoost(true);
                             setSelectedStatForBoost(null);
                             setIsSelectingTarget(false);
                           }
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] flex items-center justify-center gap-1 uppercase tracking-wider font-cinzel transition-all w-[110px]",
                          isWaiting ? "bg-yellow-900/50 text-yellow-500 border border-yellow-700 cursor-pointer font-bold" :
                          isSelectingStatForBoost ? "bg-red-950/80 text-red-300 border border-red-800 hover:bg-red-900 font-bold cursor-pointer" :
                          isFreeEdit ? "wow-button opacity-40 cursor-not-allowed" :
                          canAsk ? "bg-purple-900/90 hover:bg-purple-800 text-purple-200 border border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] font-bold cursor-pointer" :
                          "wow-button text-wow-gold opacity-30 cursor-not-allowed"
                        )}
                        title={isFreeEdit ? "Free Edit is active (modify stats directly)" : isSelectingStatForBoost ? "Cancel stat boost" : "Request a stat increase from GM (Cost: 3 EXP)"}
                        style={isWaiting ? { cursor: 'pointer' } : {}}
                      >
                        {isSelectingStatForBoost ? "CANCEL" : isWaiting ? "WAITING..." : "ASK FOR STAT"}
                      </button>
                    );
                  })()}

                  {/* LOUPE PLUS */}
                  <button 
                    onClick={() => store.increaseTextSize()}
                    className="wow-button p-1 text-wow-gold hover:text-white lg:flex hidden"
                    title="Augmenter la taille du texte"
                  >
                    <ZoomIn size={14} />
                  </button>

                  {/* ALL PLUS CONTROLS (RIGHT of ZoomIn) */}
                  <div className="flex gap-0.5 items-center shrink-0">
                    <button 
                      onClick={() => store.increaseBarHeight?.()}
                      className="wow-button px-1.5 py-0.5 text-wow-gold hover:text-white items-center justify-center text-[10px] font-mono h-[22px] lg:flex hidden"
                      title="Augmenter la hauteur des barres de stat"
                    >
                      B+
                    </button>
                    <button 
                      onClick={() => store.increasePhotoWidth?.()}
                      className="wow-button px-1.5 py-0.5 text-wow-gold hover:text-white flex items-center justify-center text-[10px] font-mono h-[22px]"
                      title="Augmenter la largeur de la photo"
                    >
                      W+
                    </button>
                    <button 
                      onClick={() => store.increasePhotoHeight?.()}
                      className="wow-button px-1.5 py-0.5 text-wow-gold hover:text-white flex items-center justify-center text-[10px] font-mono h-[22px]"
                      title="Augmenter la hauteur de la photo"
                    >
                      H+
                    </button>
                  </div>
                </div>

                {/* Row 2: Only in Vertical Mode (narrow screens), centered right under Row 1, containing B-, ZoomOut, ZoomIn, B+ */}
                <div className="flex items-center justify-center gap-4 w-full pt-1 lg:hidden">
                  {/* B- button */}
                  <button 
                    onClick={() => store.decreaseBarHeight?.()}
                    className="wow-button px-2.5 py-0.5 text-wow-gold hover:text-white flex items-center justify-center text-[10px] font-mono h-[22px]"
                    title="Diminuer la hauteur des barres de stat"
                  >
                    B-
                  </button>

                  {/* LOUPE MINUS */}
                  <button 
                    onClick={() => store.decreaseTextSize()}
                    className="wow-button p-1 text-wow-gold hover:text-white flex items-center justify-center"
                    title="Réduire la taille du texte"
                  >
                    <ZoomOut size={14} />
                  </button>

                  {/* LOUPE PLUS */}
                  <button 
                    onClick={() => store.increaseTextSize()}
                    className="wow-button p-1 text-wow-gold hover:text-white flex items-center justify-center"
                    title="Augmenter la taille du texte"
                  >
                    <ZoomIn size={14} />
                  </button>

                  {/* B+ button */}
                  <button 
                    onClick={() => store.increaseBarHeight?.()}
                    className="wow-button px-2.5 py-0.5 text-wow-gold hover:text-white flex items-center justify-center text-[10px] font-mono h-[22px]"
                    title="Augmenter la hauteur des barres de stat"
                  >
                    B+
                  </button>
                </div>
              </div>

              {/* Top Section: Encounter Toggle / Photo / Dice (ALWAYS VISIBLE!) */}
              <div className="grid grid-cols-3 gap-2 mb-1.5 shrink-0">
                
                {/* Encounter Toggle (Square Button) - Left */}
                <div className="flex flex-col items-center justify-start">
                  <button
                    onClick={() => mpStore.setIsEncounterViewActive(!mpStore.isEncounterViewActive)}
                    className={cn(
                      "w-20 h-20 sm:w-24 sm:h-24 rounded flex flex-col items-center justify-center relative overflow-hidden transition-all select-none active:scale-95 shadow-md wow-button",
                      mpStore.isEncounterViewActive ? "brightness-125 border-4 border-white" : ""
                    )}
                    title="Toggle view."
                  >
                    {activeEncounter ? (
                      <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-wow-gold bg-black/40 shadow-[0_0_8px_rgba(255,209,0,0.5)]">
                        {mpStore.isEncounterViewActive ? (
                          <Swords size={22} className="text-wow-gold" />
                        ) : (
                          <Sword size={18} className="text-wow-gold" />
                        )}
                        {/* Exclamation badge attached to the golden circle - static and gold instead of red */}
                        <div className="absolute -top-1 -right-1.5 w-5 h-5 bg-wow-gold border border-black text-[#1c120c] font-extrabold text-[10px] font-sans rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10">
                          !!
                        </div>
                      </div>
                    ) : (
                      mpStore.isEncounterViewActive ? (
                        <Swords size={28} className="text-wow-gold mt-1" />
                      ) : (
                        <Sword size={24} className="text-wow-gold mt-1" />
                      )
                    )}
                  </button>
                  <span className="mt-1 font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md text-center h-10 flex items-start justify-center px-1 w-full uppercase tracking-wider line-clamp-2">
                    {mpStore.isEncounterViewActive ? "ENCOUNTERS" : "STATS"}
                  </span>
                </div>

                {/* Photo - Middle (No name underneath) */}
                <div className="flex flex-col items-center justify-start">
                  <button
                    disabled={isViewMode || (mpStore.isConnected && !mpStore.isFreeEdit)}
                    onClick={() => {
                      if (isViewMode || (mpStore.isConnected && !mpStore.isFreeEdit)) return;
                      setShowConfig(true);
                    }}
                    className={cn(
                      "rounded border-2 overflow-hidden bg-wow-dark shadow-[0_0_15px_rgba(0,0,0,0.8)] relative shrink-0 transition-all select-none outline-none",
                      !(isViewMode || (mpStore.isConnected && !mpStore.isFreeEdit)) ? "cursor-pointer hover:brightness-110 active:scale-95" : "cursor-pointer opacity-90",
                      isViewMode ? "!border-red-600 !border-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]" : isFreeEdit ? "border-[#4ade80]" : "border-[#FFD100]"
                    )}
                    style={{ 
                      height: `${store.photoHeight ?? 96}px`,
                      width: `${store.photoWidth ?? 96}px`
                    }}
                    title={!(isViewMode || (mpStore.isConnected && !mpStore.isFreeEdit)) ? "Configurer le personnage" : undefined}
                  >
                    {activePhoto ? (
                      <img src={activePhoto} alt="Character" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-cinzel text-[10px] text-white/50 text-center uppercase">No Hero</div>
                    )}
                    <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                  </button>
                </div>
                
                {/* Target Dice Roller */}
                <div className="flex flex-col items-center justify-start">
                  <button
                    onClick={handlePlayerRoll}
                    disabled={isViewMode || rolling || isRollsBlocked}
                    className={cn(
                      "w-20 h-20 sm:w-24 sm:h-24 rounded flex flex-col items-center justify-center relative overflow-hidden transition-all select-none active:scale-95 shadow-md wow-button p-1 text-center",
                      selectedTarget !== null ? "bg-green-950/90 border-2 border-green-500 text-green-300" : "",
                      isSelectingTarget && selectedTarget === null ? "bg-green-900/40 border-2 border-green-500/80 " : "",
                      isRollsBlocked ? "border-red-600/80 bg-red-950/30 text-red-400" : "",
                      (isViewMode || rolling || isRollsBlocked) && "opacity-60",
                      isViewMode ? "cursor-not-allowed" : "cursor-pointer"
                    )}
                    title={isRollsBlocked ? "Rolls blocked by GM" : selectedTarget !== null ? "Click to roll D12 against target" : "Click to select target"}
                  >
                    {rolling ? (
                      <span className="font-macondo text-3xl text-wow-gold animate-bounce">...</span>
                    ) : isRollsBlocked ? (
                      <div className="flex flex-col items-center justify-center">
                        <Lock size={28} className="text-red-500" />
                      </div>
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
                        <Dices size={28} className="text-green-400" />
                        <span className="font-cinzel text-[9px] text-green-200 font-bold uppercase truncate max-w-[80px]">
                          {selectedTarget.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <Dices size={28} className={cn("text-wow-gold transition-transform", isSelectingTarget ? " scale-110 text-green-400" : "")} />
                      </div>
                    )}
                  </button>

                  <div className="mt-1 font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md text-center h-10 flex flex-col items-center justify-start px-1 w-full uppercase tracking-wider">
                    {rollResult !== null ? (
                      <button 
                        onClick={() => clearRollState()}
                        className="hover:text-white transition-colors cursor-pointer font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider"
                      >
                        CLEAR
                      </button>
                    ) : selectedTarget !== null ? (
                      <button 
                        disabled={rolling || isRollsBlocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (rolling || isRollsBlocked) return;
                          setSelectedTarget(null);
                          setIsSelectingTarget(false);
                        }}
                        className={cn(
                          "text-red-400 hover:text-red-200 cursor-pointer font-cinzel font-bold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider transition-all",
                          (rolling || isRollsBlocked) && "opacity-30 pointer-events-none cursor-pointer"
                        )}
                      >
                        CANCEL
                      </button>
                    ) : isSelectingTarget ? (
                      <button 
                        disabled={rolling || isRollsBlocked}
                        onClick={() => {
                          if (rolling || isRollsBlocked) return;
                          setIsSelectingTarget(false);
                        }}
                        className={cn(
                          "text-red-400 hover:text-red-200 cursor-pointer font-cinzel font-bold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider transition-all",
                          (rolling || isRollsBlocked) && "opacity-30 pointer-events-none cursor-pointer"
                        )}
                      >
                        CANCEL
                      </button>
                    ) : isRollsBlocked ? (
                      <span className="text-red-500 font-cinzel font-bold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider">
                        BLOCKED 🔒
                      </span>
                    ) : (
                      <button 
                        disabled={rolling || isViewMode}
                        onClick={() => {
                          if (rolling || isViewMode) return;
                          setIsSelectingTarget(true);
                        }}
                        className={cn(
                          "transition-colors font-cinzel font-bold text-wow-gold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider",
                          isViewMode ? "opacity-50 cursor-not-allowed" : "hover:text-white cursor-pointer"
                        )}
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

                    {activeEncounter ? (
                      <div className="flex-1 flex flex-col justify-between font-sans text-sm p-1">
                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                          <div className="flex items-center justify-center text-xs text-wow-gold/70 border-b border-[#5a4b3c]/30 pb-1 shrink-0">
                            <span>LEVEL: {activeEncounter.level}</span>
                          </div>
                          
                          <div className="flex flex-col items-center w-full gap-1">
                            {activeEncounter.lines?.map((line: any, lIdx: number) => {
                              const isCompleted = !!activeEncounter.completedLines?.[lIdx];
                              return (
                                <React.Fragment key={lIdx}>
                                  <div className={`w-full border rounded p-1 flex flex-row gap-1 shadow-lg items-stretch justify-center transition-all duration-200 ${
                                    isCompleted
                                      ? 'bg-green-950/55 border-green-600/80'
                                      : 'bg-[#2b1d14] border-[#5a4b3c]'
                                  }`}>
                                    <div className="flex items-center justify-center min-w-10 px-1.5 shrink-0 font-cinzel text-wow-gold text-sm font-bold bg-[#1a110a] rounded border border-[#3b2c19]">
                                      #{lIdx + 1}
                                    </div>
                                    {line.map((action: any, aIdx: number) => (
                                      <div key={aIdx} className="bg-[#1a110a] px-1 py-1 rounded border border-[#3b2c19] flex flex-col items-center justify-start flex-1 text-center min-w-0 h-full gap-0.5">
                                        <span className="font-macondo text-white text-[13px] leading-tight w-full" style={{ wordBreak: 'break-word' }}>{action.name}</span>
                                        {action.sub && (
                                          <span className="text-[10px] font-sans bg-purple-900/40 text-purple-200 px-1 py-0.5 rounded mt-1 border border-purple-800 w-full truncate">
                                            + {action.sub}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        {/* Copy Result Button at the bottom */}
                        <div className="flex justify-center mt-3 pt-3 border-t border-[#5a4b3c]/40 shrink-0">
                          <button
                            onClick={() => {
                              const text = activeEncounter.lines.map((line: any, idx: number) => 
                                `#${idx + 1}: ` + line.map((action: any) => action.sub ? `${action.name} (+${action.sub})` : action.name).join(' > ')
                              ).join('\n');
                              navigator.clipboard.writeText(text);
                              setCopiedEncounter(true);
                              setTimeout(() => setCopiedEncounter(false), 2000);
                            }}
                            className="wow-button font-cinzel text-xs py-2 px-5 flex items-center gap-1.5 shadow-md uppercase tracking-wider"
                          >
                            {copiedEncounter ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-wow-gold" />}
                            <span>{copiedEncounter ? "COPIED!" : "COPY RESULT"}</span>
                          </button>
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
                    {/* Resources Zone: HP and EXP side-by-side on top, MP full width below */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3 shrink-0">
                      {/* HP (index 0) */}
                      {activeResources[0]?.isVisible && (
                        <ResourceBar 
                          resource={activeResources[0]} 
                          isFreeEdit={isFreeEdit && !isViewMode}
                          onChange={isViewMode ? () => {} : (delta) => {
                            const max = parseMax(activeResources[0].max);
                            let nextVal = activeResources[0].current + delta;
                            if (max > 0) nextVal = Math.min(max, nextVal);
                            store.updateResource(0, { current: Math.max(0, nextVal) });
                          }} 
                        />
                      )}

                      {/* EXP (index 2) */}
                      {activeResources[2]?.isVisible && (
                        <ResourceBar 
                          resource={activeResources[2]} 
                          isFreeEdit={isFreeEdit && !isViewMode}
                          onChange={isViewMode ? () => {} : (delta) => {
                            if (isScratch) return; // locked to 0 in scratch
                            const max = parseMax(activeResources[2].max);
                            let nextVal = activeResources[2].current + delta;
                            if (max > 0) nextVal = Math.min(max, nextVal);
                            store.updateResource(2, { current: Math.max(0, nextVal) });
                          }} 
                        />
                      )}

                      {/* MP (index 1) - Spans full width across 2 columns */}
                      {activeResources[1]?.isVisible && (
                        <div className="col-span-2">
                          <ResourceBar 
                            resource={activeResources[1]} 
                            isFreeEdit={isFreeEdit && !isViewMode}
                            onChange={isViewMode ? () => {} : (delta) => {
                              if (isScratch) return; // locked to 0 in scratch
                              const max = parseMax(activeResources[1].max);
                              let nextVal = activeResources[1].current + delta;
                              if (max > 0) nextVal = Math.min(max, nextVal);
                              store.updateResource(1, { current: Math.max(0, nextVal) });
                            }} 
                          />
                        </div>
                      )}
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
                            statBoostModeProps={{
                              isSelectingForBoost: isSelectingStatForBoost && !isViewMode,
                              isSelectedForBoost: selectedStatForBoost === stat.name,
                              onSelectForBoost: () => {
                                if (selectedStatForBoost === stat.name) {
                                  setSelectedStatForBoost(null);
                                } else {
                                  setSelectedStatForBoost(stat.name);
                                }
                              },
                              onConfirmBoost: () => {
                                handleConfirmStatBoost(stat.name);
                              }
                            }}
                            targetModeProps={{
                              isSelectingTarget,
                              isSelected: selectedTarget?.type === 'stat' && selectedTarget?.name === stat.name,
                              isOtherSelected: selectedTarget !== null && !(selectedTarget?.type === 'stat' && selectedTarget?.name === stat.name),
                              isVerticalMode,
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
                              },
                              onLaunchRoll: () => {
                                if (!rolling) {
                                  handlePlayerRoll();
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
          )}

            {/* COLUMN 3: PARTY PLAYERS (top) & NOTES/JOURNAL (bottom) (col-span-3) */}
            {(!isVerticalMode || activeZone === 'all' || activeZone === 'players' || activeZone === 'notes') && (
              <div className={cn(
                "flex flex-col gap-3 overflow-hidden",
                isVerticalMode && activeZone !== 'all' ? "h-full min-h-0 w-full" : "lg:col-span-3 h-full min-h-0"
              )}>
                
                {/* Upper Half: Players & GM List */}
                {(!isVerticalMode || activeZone === 'all' || activeZone === 'players') && (
                  <div className={cn(
                    "wow-panel scifi-no-tracing flex flex-col p-3 bg-wow-dark border border-[#5a4b3c] rounded overflow-hidden shadow-lg relative",
                    isVerticalMode && activeZone !== 'all' ? "h-full w-full flex-1" : "h-[35%] sm:h-[40%] min-h-[220px] shrink-0"
                  )}>
                    <div className="border-b border-[#5a4b3c]/40 pb-1.5 flex items-center justify-between shrink-0">
                      <h4 className="font-cinzel text-wow-gold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={14} className="text-wow-gold" />
                        <span>Party Members</span>
                      </h4>
                      {mpStore.isConnected && (
                        <button
                          onClick={() => setShowVisibilityToggles(!showVisibilityToggles)}
                          className={cn(
                            "p-1 rounded transition-all hover:bg-[#5a4b3c]/20 text-xs",
                            showVisibilityToggles ? "text-wow-gold brightness-125" : "text-white"
                          )}
                          title={showVisibilityToggles ? "Masquer les cases à cocher" : "Afficher les cases à cocher"}
                        >
                          {showVisibilityToggles ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 mt-2 pr-1">
                      {mpStore.isConnected ? (
                        <>
                          {/* "Me" button to view own HUD */}
                          <div className="flex items-center gap-1 shrink-0 w-full">
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                              <div className="w-3.5 h-3.5" />
                            </div>
                            <button
                              onClick={() => mpStore.setActivePlayerView('me')}
                              className={cn(
                                "flex-1 py-1.5 px-3 rounded font-cinzel text-xs text-left flex items-center justify-between border transition-all duration-200 shadow-sm",
                                (!mpStore.activePlayerView || mpStore.activePlayerView === 'me')
                                  ? "bg-wow-gold/15 text-wow-gold border-wow-gold"
                                  : "bg-black/30 text-white border-[#5a4b3c]/30 hover:bg-black/55 hover:border-[#5a4b3c]/60"
                              )}
                            >
                              <span className="flex items-center gap-1.5">
                                <User size={12} className="text-wow-gold" />
                                <span>Me (My HUD)</span>
                              </span>
                              <span className="font-mono text-[9px] text-wow-gold/60">Active</span>
                            </button>
                          </div>

                           {/* List of other players */}
                          {mpStore.links.map((linkCode) => {
                            const p = mpStore.roomPlayers[linkCode];
                            if (!p) return null;
                            if (p.pseudo === mpStore.pseudo) return null;
                            
                            const isVisible = visiblePlayers[linkCode] !== false;

                            if (!showVisibilityToggles && !isVisible) return null;

                            const isViewingThis = mpStore.activePlayerView === linkCode || (p?.joinCode && mpStore.activePlayerView === p.joinCode);
                            return (
                              <div key={linkCode} className="flex items-center gap-1 shrink-0 w-full">
                                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={isVisible}
                                      onChange={() => togglePlayerVisibility(linkCode)}
                                      className={cn(
                                        "w-3.5 h-3.5 cursor-pointer accent-wow-gold bg-black/60 border border-[#5a4b3c]/50 rounded transition-all duration-200",
                                        showVisibilityToggles ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                                      )}
                                    />
                                  </div>
                                  <button
                                    onClick={() => mpStore.setActivePlayerView(linkCode)}
                                    className={cn(
                                      "flex-1 py-1.5 px-3 rounded font-cinzel text-xs text-left flex items-center justify-between border transition-all duration-200 shadow-sm",
                                      isViewingThis
                                        ? "bg-wow-gold/15 text-wow-gold border-wow-gold"
                                        : "bg-black/30 text-white border-[#5a4b3c]/30 hover:bg-black/55 hover:border-[#5a4b3c]/60"
                                    )}
                                  >
                                    <span className="flex items-center gap-1.5 truncate max-w-[70%]">
                                      <Users size={12} className="text-white" />
                                      <span className="truncate">{p.pseudo}</span>
                                    </span>
                                    <span className="font-mono text-[9px] text-white uppercase shrink-0">View HUD</span>
                                  </button>
                                </div>
                              );
                            })}
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                          <WifiOff size={24} className="text-[#5a4b3c] mb-2" />
                          <span className="text-[10px] font-cinzel tracking-wider text-white uppercase">Offline Mode</span>
                          <p className="text-[10px] text-white mt-1 max-w-[180px]">Connect to a room to view other players.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lower Half: Notes / Journal split in 4 tabs */}
                {(!isVerticalMode || activeZone === 'all' || activeZone === 'notes') && (
                  <div className={cn(
                    "wow-panel scifi-no-tracing flex flex-col bg-black/40 border border-[#5a4b3c] rounded relative overflow-hidden",
                    isVerticalMode && activeZone !== 'all' ? "h-full w-full flex-1" : "flex-1 min-h-[300px]"
                  )}>
                <div className="absolute inset-0 opacity-10 pointer-events-none "></div>
                
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
                        <span className="font-mono text-[9px] text-white">View-Only</span>
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
            )}
          </div>
        )}
      </div>

          {/* DEDICATED PANEL FOR IMPORT/EXPORT IN VERTICAL MODE */}
          {isVerticalMode && activeZone === 'header3' && (
            <div className="w-full h-full min-h-0 wow-panel flex flex-col items-center justify-center p-6 bg-leather border border-[#5a4b3c] rounded text-center gap-5 shadow-2xl overflow-y-auto">
              <h3 className="font-cinzel text-lg text-wow-gold uppercase tracking-widest font-bold border-b border-[#5a4b3c]/40 pb-2 w-full">
                Import / Export Options
              </h3>
              {isScratch ? (
                <>
                  <p className="font-sans text-xs text-gray-300 max-w-xs">
                    Save or restore the complete GM state via a local JSON file.
                  </p>
                  <div className="flex flex-col gap-4 w-full max-w-xs">
                    <label className="wow-button p-4 cursor-pointer flex items-center justify-center gap-2 text-sm font-cinzel font-bold text-wow-gold border-2 border-wow-gold/60 bg-black/60 hover:bg-black/80 rounded shadow-lg">
                      <Upload size={18} /> <span>LOAD JSON FILE</span>
                      <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
                    </label>
                    <button 
                      onClick={handleExportJSON}
                      className="wow-button p-4 flex items-center justify-center gap-2 text-sm font-cinzel font-bold text-wow-gold border-2 border-wow-gold/60 bg-black/60 hover:bg-black/80 rounded shadow-lg"
                    >
                      <Download size={18} /> <span>EXPORTER SAUVEGARDE (.JSON)</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <label className="wow-button p-3 cursor-pointer flex items-center justify-center gap-2 text-sm font-cinzel font-bold">
                    <Upload size={18} /> <span>LOAD JSON FILE</span>
                    <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
                  </label>
                  <button onClick={handleExportJSON} className="wow-button p-3 flex items-center justify-center gap-2 text-sm font-cinzel font-bold">
                    <Download size={18} /> <span>EXPORT AS JSON</span>
                  </button>
                  {mpStore.isConnected && (
                    <div className="flex flex-col gap-2 pt-3 border-t border-[#5a4b3c]/30">
                      <div className="text-xs text-white font-mono bg-black/40 border border-[#5a4b3c]/20 p-2 rounded">
                        ROOM CODE: <span className="text-wow-gold font-bold">{mpStore.joinCode}</span>
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm("Disconnect from room?")) {
                            mpStore.disconnect();
                            onGoHome();
                          }
                        }}
                        className="wow-button p-3 text-red-400 border-red-800/60 bg-red-950/20 hover:bg-red-900/40 flex items-center justify-center gap-2 font-cinzel font-bold"
                      >
                        <Power size={18} /> <span>DECONNEXION DU MULTIJOUEUR</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showConfig && <PlayerConfigModal onClose={() => setShowConfig(false)} />}

      {isVerticalMode && selectedTarget !== null && (
        <div className="fixed inset-0 z-[110] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="wow-panel w-full max-w-[280px] p-5 bg-[#120d08] border-2 border-wow-gold flex flex-col items-center justify-center gap-4 text-center shadow-2xl relative rounded-none">
            
            {/* Title */}
            <h4 className="font-cinzel text-xs text-wow-gold uppercase tracking-widest font-bold border-b border-[#5a4b3c]/60 pb-2 w-full">
              {rollResult !== null ? "Roll Completed" : rolling ? "Rolling..." : "Target Acquired"}
            </h4>

            {/* Target Information */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-macondo text-lg text-amber-200 tracking-wide font-bold uppercase truncate max-w-[240px]">
                {selectedTarget.name}
              </span>
              <span className="font-sans text-[11px] text-gray-400">
                Difficulty: <span className="font-sans text-wow-gold font-bold">Less than or equal to {selectedTarget.value}</span>
              </span>
            </div>

            {/* Target Box ("carré du target") */}
            <div className={cn(
              "w-24 h-24 rounded flex flex-col items-center justify-center relative overflow-hidden select-none shadow-md border-2 p-1 text-center bg-black/40",
              rollResult !== null 
                ? (rollResult.isSuccess ? "border-green-500 bg-green-950/20" : "border-red-500 bg-red-950/20")
                : "border-[#5a4b3c] bg-black/60"
            )}>
              {rolling ? (
                <div className="flex flex-col items-center justify-center h-16">
                  <span className="font-macondo text-4xl text-wow-gold">...</span>
                </div>
              ) : rollResult !== null ? (
                <div className="flex flex-col items-center justify-between h-20 w-full">
                  {/* Line 1: Roll Value */}
                  <div className="h-8 flex items-center justify-center">
                    <span className={cn("font-macondo text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)]", rollResult.isSuccess ? "text-green-400" : "text-red-400")}>
                      {rollResult.roll}
                    </span>
                  </div>
                  {/* Line 2: Success/Failed */}
                  <div className="h-4 flex items-center justify-center">
                    <span className={cn("font-cinzel text-[9px] font-bold uppercase tracking-wider", rollResult.isSuccess ? "text-green-300" : "text-red-300")}>
                      {rollResult.isSuccess ? "SUCCESS" : "FAILED"}
                    </span>
                  </div>
                  {/* Line 3: Perfect/Critical/Standard */}
                  <div className="h-4 flex items-center justify-center">
                    {rollResult.isPerfect ? (
                      <span className="font-cinzel text-[9px] font-extrabold uppercase text-amber-400 tracking-wider">
                        PERFECT
                      </span>
                    ) : rollResult.isCrit ? (
                      <span className="font-cinzel text-[9px] font-extrabold uppercase text-red-400 tracking-wider">
                        CRITICAL
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-16">
                  <Dices size={36} className="text-wow-gold" />
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="relative w-full h-[38px]">
              {/* Cancel and Roll Group */}
              <div className={cn(
                "absolute inset-0 flex gap-3.5",
                (rolling || rollResult !== null) ? "opacity-0 pointer-events-none" : "opacity-100"
              )}>
                {/* Cancel Button (X) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTarget(null);
                  }}
                  className="flex-1 py-1.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-400 font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95"
                >
                  <X size={14} className="stroke-[2.5]" />
                  <span>CANCEL</span>
                </button>

                {/* Confirm Button (nike) */}
                <button
                  type="button"
                  onClick={() => {
                    handlePlayerRoll();
                  }}
                  className="flex-1 py-1.5 rounded bg-green-900/95 hover:bg-green-800 border border-green-700 text-green-300 font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95"
                >
                  <Check size={14} className="stroke-[2.5]" />
                  <span>ROLL</span>
                </button>
              </div>

              {/* Back Button Group */}
              <div className={cn(
                "absolute inset-0 flex",
                (rollResult !== null && !rolling) ? "opacity-100" : "opacity-0 pointer-events-none"
              )}>
                <button
                  type="button"
                  onClick={() => {
                    clearRollState();
                    setActiveZone('stats');
                  }}
                  className="w-full py-1.5 rounded bg-amber-900/90 hover:bg-amber-800 border border-amber-700 text-amber-200 font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                >
                  <span>BACK</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
