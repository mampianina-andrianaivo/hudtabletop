import React, { useState, useEffect } from 'react';
import { Home, Wifi, WifiOff, Upload, Download, Users, User, FileText, Swords, Sword, Dices, X, Copy, Check, Lock, ShieldAlert, Sparkles, Eye, EyeOff, Power, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Cpu } from 'lucide-react';
import { GMSpellCrafter } from '@/components/GMSpellCrafter';
import { GMEncounters } from '@/components/GMEncounters';
import { useGMStore } from '@/store/useGMStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useTheme } from '@/lib/useTheme';
import { useOnlineSync, sendOnlineRoll } from '@/lib/useOnlineSync';
import { ResourceBar } from '@/components/ResourceBar';
import { StatBar } from '@/components/StatBar';
import { SpellBook } from '@/components/SpellBook';
import { RollLogsSection } from '@/components/RollLogsSection';
import { DiceRoller } from '@/components/DiceRoller';
import { NoteTextarea } from '@/components/NoteTextarea';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface GMViewProps {
  onGoHome: () => void;
  onSwitchToPlayer: () => void;
}

export function GMView({ onGoHome, onSwitchToPlayer }: GMViewProps) {
  const store = useGMStore();
  const mpStore = useMultiplayerStore();
  const pStore = usePlayerStore();
  const { theme, toggleTheme } = useTheme();

  // Scratch init
  useEffect(() => {
    useMultiplayerStore.setState({ role: 'gm' });
    if (!mpStore.isConnected) {
      store.initScratchLinks();
    }
  }, [mpStore.isConnected]);

  // Start real-time sync polling
  const { registerOnDisconnect } = useOnlineSync();
  useEffect(() => {
    registerOnDisconnect(() => {
      onGoHome();
    });
  }, [registerOnDisconnect]);

  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showResetDbConfirm, setShowResetDbConfirm] = useState(false);
  const [showVisibilityToggles, setShowVisibilityToggles] = useState(false);
  const [visiblePlayers, setVisiblePlayers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const roomKey = mpStore.roomName ? mpStore.roomName.trim().toLowerCase() : 'default';
      const saved = localStorage.getItem(`gm_visible_players_${roomKey}`);
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
      localStorage.setItem(`gm_visible_players_${roomKey}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [disabledButtons, setDisabledButtons] = useState<Record<string, boolean>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [inspectEncounterViewActive, setInspectEncounterViewActive] = useState(false);

  const handleToggleLineInGMView = async (idx: number) => {
    store.toggleDrawLineCompleted(idx);
    
    // Write immediately to Firestore if connected
    const updatedDraw = useGMStore.getState().currentDraw;
    if (updatedDraw && mpStore.isConnected && mpStore.roomName && db) {
      try {
        const roomRef = doc(db, 'rooms', mpStore.roomName.trim().toLowerCase());
        await updateDoc(roomRef, {
          publishedEncounter: updatedDraw
        });
      } catch (err) {
        console.error("Error updating encounter line completion from GMView:", err);
      }
    }
  };

  const currentRequest = mpStore.gmRequests?.[0];

  const handleProcessRequest = async (accept: boolean) => {
    if (!currentRequest || !mpStore.isConnected || !mpStore.roomName || !db) return;
    try {
      const roomRef = doc(db, 'rooms', mpStore.roomName.trim().toLowerCase());
      
      const updates: any = {};
      const newRequests = mpStore.gmRequests.slice(1);
      updates['gmRequests'] = newRequests;

      if (accept) {
        const joinCode = currentRequest.joinCode;
        const pendingCmds = [];

        // Deduct 3 EXP if not free edit
        if (!currentRequest.isFreeEdit) {
          pendingCmds.push({ type: 'deduct_exp', value: 3, ts: Date.now() });
        }

        // Add spell if spell request
        if (currentRequest.type === 'ask_spell' && currentRequest.spell) {
          pendingCmds.push({ type: 'add_spell', spell: currentRequest.spell, ts: Date.now() });
        }

        // Add stat if ask_stat request with targetStat
        if (currentRequest.type === 'ask_stat' && currentRequest.targetStat) {
          pendingCmds.push({ type: 'add_stat', statName: currentRequest.targetStat, value: 1, ts: Date.now() });
        }

        if (pendingCmds.length > 0) {
          updates[`players.${joinCode}.pendingCommands`] = arrayUnion(...pendingCmds);
        }
        
        // Log the acceptance
        let text = currentRequest.targetStat 
          ? `GM accepted ${currentRequest.from}'s request for +1 ${currentRequest.targetStat}!`
          : `GM accepted ${currentRequest.from}'s request for a Stat Increase!`;
        if (currentRequest.type === 'ask_spell') {
          text = `GM accepted ${currentRequest.from}'s request for Ability: ${currentRequest.spellName || currentRequest.spell?.name || 'Ability'}!`;
        } else if (currentRequest.type === 'ask_shop') {
          text = `GM accepted ${currentRequest.from}'s request to Open Shop!`;
        }
        
        const rollLogs = mpStore.rollLogs || [];
        const newRoll = {
          id: `req-${Date.now()}`,
          pseudo: 'System',
          text,
          timestamp: Date.now()
        };
        updates['rollLogs'] = [...rollLogs.slice(-49), newRoll];
      } else {
        let text = currentRequest.targetStat
          ? `GM declined ${currentRequest.from}'s request for +1 ${currentRequest.targetStat}.`
          : `GM declined ${currentRequest.from}'s request for a Stat Increase.`;
        if (currentRequest.type === 'ask_spell') {
          text = `GM declined ${currentRequest.from}'s request for Ability: ${currentRequest.spellName || currentRequest.spell?.name || 'Ability'}.`;
        } else if (currentRequest.type === 'ask_shop') {
          text = `GM declined ${currentRequest.from}'s request to Open Shop.`;
        }
        
        const rollLogs = mpStore.rollLogs || [];
        const newRoll = {
          id: `req-${Date.now()}`,
          pseudo: 'System',
          text,
          timestamp: Date.now()
        };
        updates['rollLogs'] = [...rollLogs.slice(-49), newRoll];
      }

      await updateDoc(roomRef, updates);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlayerCommand = async (joinCode: string, type: 'add_mp' | 'damage_mp', val: number) => {
    if (!mpStore.isConnected || !mpStore.roomName || !db) return;
    const btnKey = `${joinCode}-${type}`;
    setDisabledButtons(prev => ({ ...prev, [btnKey]: true }));
    try {
      const roomRef = doc(db, 'rooms', mpStore.roomName.trim().toLowerCase());
      await updateDoc(roomRef, {
        [`players.${joinCode}.pendingCommands`]: arrayUnion({ type, value: val, ts: Date.now() })
      });
    } catch (err) {
      console.error('Command error:', err);
    } finally {
      setTimeout(() => {
        setDisabledButtons(prev => ({ ...prev, [btnKey]: false }));
      }, 500);
    }
  };

  // If viewing a player character sheet
  const isViewingPlayer = Boolean(mpStore.isConnected && mpStore.activePlayerView && mpStore.activePlayerView !== 'me');
  const activeKey = mpStore.activePlayerView || '';
  const viewedPlayer = isViewingPlayer 
    ? (mpStore.roomPlayers[activeKey] || Object.values(mpStore.roomPlayers || {}).find(p => p?.joinCode === activeKey) || null)
    : null;
  const activeCharState = isViewingPlayer ? viewedPlayer?.characterState : null;
  
  const FIXED_STATS_NAMES = ['INTELLIGENCE', 'STRENGTH', 'SPEED', 'ACCURACY', 'PATIENCE', 'LUCK'];
  const activeStats = FIXED_STATS_NAMES.map((name, i) => {
    const existing = (Array.isArray(activeCharState?.stats) && activeCharState.stats[i]) || { current: 0 };
    return { name, current: Number(existing?.current ?? 0), isVisible: true };
  });

  const activeSpells = Array.isArray(activeCharState?.spells) ? activeCharState.spells : [];

  // Latest public roll log
  const latestRoll = mpStore.rollLogs[mpStore.rollLogs.length - 1];

  const performSilentSave = () => {
    if (!mpStore.isConnected) {
      const pStore = usePlayerStore.getState();
      const baseSpells = pStore.spells || [];
      const allSpellsMap = new Map();
      baseSpells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));
      Object.values(store.scratchPlayers).forEach((p: any) => {
        if (p?.characterState?.spells && Array.isArray(p.characterState.spells)) {
          p.characterState.spells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));
        }
      });
      const commonSpells = Array.from(allSpellsMap.values());

      const currentCharacterState = {
        name: pStore.name || 'Scratch Base',
        photo: pStore.photo || '',
        stats: pStore.stats || [],
        resources: pStore.resources || [],
        spells: commonSpells,
        notes: pStore.notes || '',
      };
      
      const updatedPlayers: Record<string, any> = { ...store.scratchPlayers };
      store.scratchLinks.forEach((link, idx) => {
        const existing = updatedPlayers[link] || { pseudo: '', characterState: undefined };
        const pseudo = (existing.pseudo || '').trim() || `Player ${idx + 1}`;
        const playerSpellsMap = new Map();
        commonSpells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
        if (existing.characterState?.spells && Array.isArray(existing.characterState.spells)) {
          existing.characterState.spells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
        }

        updatedPlayers[link] = {
          ...existing,
          pseudo,
          characterState: {
            ...(existing.characterState || currentCharacterState),
            name: pseudo,
            spells: Array.from(playerSpellsMap.values()),
          }
        };
      });
      useGMStore.setState({ scratchPlayers: updatedPlayers });
    }
  };

  const handleExportGMJSON = () => {
    performSilentSave();
    
    let roomNameToCheck = !mpStore.isConnected ? store.roomName : mpStore.roomName;
    if (!roomNameToCheck || !roomNameToCheck.trim()) {
      roomNameToCheck = "Untitled Campaign";
    }

    const pStore = usePlayerStore.getState();
    const baseSpells = pStore.spells || [];
    const allSpellsMap = new Map();
    baseSpells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));
    Object.values(store.scratchPlayers).forEach((p: any) => {
      if (p?.characterState?.spells && Array.isArray(p.characterState.spells)) {
        p.characterState.spells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));
      }
    });
    if (mpStore.isConnected) {
      Object.values(mpStore.roomPlayers).forEach((p: any) => {
        if (p?.characterState?.spells && Array.isArray(p.characterState.spells)) {
          p.characterState.spells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));
        }
      });
    }
    const commonSpells = Array.from(allSpellsMap.values());

    let finalScratchPlayers: Record<string, any> = {};
    let finalLinks: string[] = [];

    if (!mpStore.isConnected) {
      finalLinks = store.scratchLinks;
      finalLinks.forEach(link => {
        const existing: any = store.scratchPlayers[link] || { pseudo: '' };
        const playerSpellsMap = new Map();
        commonSpells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
        if (existing.characterState?.spells && Array.isArray(existing.characterState.spells)) {
          existing.characterState.spells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
        }
        finalScratchPlayers[link] = {
          ...existing,
          pseudo: existing.pseudo || `Player ${finalLinks.indexOf(link) + 1}`,
          characterState: {
            ...(existing.characterState || {
              name: existing.pseudo || `Player ${finalLinks.indexOf(link) + 1}`,
              photo: pStore.photo || '',
              stats: pStore.stats || [],
              resources: pStore.resources || [],
              notes: pStore.notes || '',
            }),
            name: existing.pseudo || `Player ${finalLinks.indexOf(link) + 1}`,
            spells: Array.from(playerSpellsMap.values()),
          }
        };
      });
    } else {
      finalLinks = mpStore.links.length > 0 ? mpStore.links : store.scratchLinks;
      finalLinks.forEach(link => {
        const connected = mpStore.roomPlayers[link];
        if (connected && connected.characterState) {
          const playerSpellsMap = new Map();
          commonSpells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
          if (Array.isArray(connected.characterState.spells)) {
            connected.characterState.spells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
          }
          finalScratchPlayers[link] = {
            pseudo: connected.pseudo,
            characterState: {
              ...connected.characterState,
              spells: Array.from(playerSpellsMap.values())
            }
          };
        } else {
          const existing: any = store.scratchPlayers[link] || { pseudo: '' };
          const playerSpellsMap = new Map();
          commonSpells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
          if (existing.characterState?.spells && Array.isArray(existing.characterState.spells)) {
            existing.characterState.spells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
          }
          finalScratchPlayers[link] = {
            ...existing,
            pseudo: existing.pseudo || `Player ${finalLinks.indexOf(link) + 1}`,
            characterState: {
              ...(existing.characterState || {
                name: existing.pseudo || `Player ${finalLinks.indexOf(link) + 1}`,
                photo: pStore.photo || '',
                stats: pStore.stats || [],
                resources: pStore.resources || [],
                notes: pStore.notes || '',
              }),
              name: existing.pseudo || `Player ${finalLinks.indexOf(link) + 1}`,
              spells: Array.from(playerSpellsMap.values()),
            }
          };
        }
      });
    }

    const campaignData = {
      roomName: roomNameToCheck,
      shopSpells: store.shopSpells,
      encounters: store.encounters,
      currentDraw: store.currentDraw,
      isFreeEdit: false,
      isFreeShop: false,
      blockPlayerRolls: store.blockPlayerRolls,
      notes: store.notes,
      publicNotes: mpStore.publicNotes,
      scratchLinks: finalLinks,
      scratchPlayers: finalScratchPlayers,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(campaignData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${roomNameToCheck || 'scratch'}_campaign.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportGMJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          alert("Format invalide : Ce fichier est un JSON de Shop (liste d'aptitudes), pas un JSON de Room/Campagne. Veuillez utiliser le bouton d'import dans la boutique de sort.");
          return;
        }
        if (!json || typeof json !== 'object') {
          alert("Format JSON invalide.");
          return;
        }
        if (json.roomName) {
           store.updateRoomName(json.roomName);
        }
        if (json.shopSpells) store.loadShopSpells(json.shopSpells);
        if (json.encounters) {
          useGMStore.setState({ encounters: json.encounters });
        }
        if (json.currentDraw !== undefined) {
          useGMStore.setState({ currentDraw: json.currentDraw });
        }
        // Always enforce false for isFreeEdit & isFreeShop on import
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
        if (json.notes) store.updateNotes(json.notes);
        if (json.publicNotes) mpStore.setLocalPublicNotes(json.publicNotes);
        
        setTimeout(() => {
          performSilentSave();
        }, 100);

        alert("GM campaign JSON loaded successfully!");
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Invalid campaign file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDisconnect = async () => {
    if (mpStore.isConnected && mpStore.roomName) {
      try {
        const { db } = await import('@/lib/firebase');
        if (db) {
          const { doc, deleteDoc, getDoc } = await import('firebase/firestore');
          const cleanName = mpStore.roomName.trim().toLowerCase();
          const roomRef = doc(db, 'rooms', cleanName);
          const snap = await getDoc(roomRef);
          if (snap.exists() && snap.data().gmSessionId === mpStore.gmSessionId) {
            await deleteDoc(roomRef);
          }
        }
      } catch (err) {
        console.error('Error deleting room on server:', err);
      }
    }
    mpStore.disconnect();
    setShowDisconnectConfirm(false);
    onGoHome();
  };

  const handleCopyLink = (linkCode: string, idx: number) => {
    // Generate actual browser enter link
    navigator.clipboard.writeText(linkCode);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePublishNotes = async () => {
    mpStore.setCredentials({ publicNotes: mpStore.localPublicNotes });
    
    // Log in campaign chat
    const previewText = mpStore.localPublicNotes.trim()
      ? (mpStore.localPublicNotes.length > 80 ? mpStore.localPublicNotes.substring(0, 80) + '...' : mpStore.localPublicNotes)
      : 'Vidé';
    await sendOnlineRoll(`📜 GM published campaign notes: "${previewText}"`);

    // Write immediately to Firestore
    if (mpStore.isConnected && mpStore.roomName && db) {
      try {
        const roomRef = doc(db, 'rooms', mpStore.roomName.trim().toLowerCase());
        await updateDoc(roomRef, {
          publicNotes: mpStore.localPublicNotes
        });
      } catch (err) {
        console.error("Error publishing notes immediately:", err);
      }
    }

    setSuccessToast("Campaign notes published successfully!");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-iron text-white flex flex-col p-2 md:p-3  select-none">
      
      {/* TOP BANNER SPLIT IN 3 SECTIONS ALIGNED WITH MAIN COLUMNS Below */}
      <div className="mb-3 grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0">
        
        {/* Section 1: Home / Connection Status Badge (lg:col-span-5) */}
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-white bg-black/40 border border-[#5a4b3c]/30 px-2 py-0.5 rounded shadow-inner">
                  <WifiOff size={12} />
                  <span className="font-cinzel tracking-wider">OFFLINE</span>
                </div>
                <div className="flex items-center gap-0">
                  <span className="wow-button text-[10px] py-0.5 px-2 font-cinzel w-[100px] text-center bg-black/50 text-wow-gold cursor-default">GM EDITS</span>
                  <button onClick={onSwitchToPlayer} className="wow-button text-[10px] py-0.5 px-2 font-cinzel w-[100px] text-center text-white opacity-70">
                    PLAYER EDITS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Character Name / GM Dashboard Header (lg:col-span-4) */}
        <div className={cn(
          "lg:col-span-4 wow-panel flex items-center justify-between py-2 px-3 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px] gap-2 relative",
          isViewingPlayer && "!border-red-600 !border-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
        )}>
          <div className="font-cinzel text-xs sm:text-sm text-wow-gold tracking-[0.2em] font-bold text-center truncate flex-1 uppercase px-1">
            {isViewingPlayer ? (activeCharState?.name || viewedPlayer?.pseudo || "CHARACTER") : "GM CONTROL DASHBOARD"}
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
        
        {/* Section 3: Load / Export buttons & Room controls (lg:col-span-3) */}
        <div className="lg:col-span-3 wow-panel scifi-no-tracing flex items-center justify-end gap-2 py-2 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px]">
          <label className="wow-button p-2 cursor-pointer flex items-center justify-center gap-1.5 text-xs shrink-0 font-sans font-bold" title="LOAD">
            <Upload size={14} /> <span>I</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportGMJSON} />
          </label>
          <button 
            onClick={handleExportGMJSON} 
            disabled={!mpStore.isConnected && !store.roomName.trim()}
            className={`wow-button p-2 flex items-center justify-center gap-1.5 text-xs shrink-0 font-sans font-bold ${(!mpStore.isConnected && !store.roomName.trim()) ? 'opacity-50 !cursor-default hover:!bg-transparent hover:!text-wow-gold' : ''}`} 
            title="EXPORT"
          >
            <Download size={14} /> <span>E</span>
          </button>

          {mpStore.isConnected && (
            <>
              <div className="w-px h-6 bg-[#5a4b3c]/40 mx-1 shrink-0"></div>
              <button 
                onClick={() => setShowDisconnectConfirm(true)}
                className="wow-button p-2 text-red-400 border-red-800/60 bg-red-950/10 hover:bg-red-900/30 shrink-0 flex items-center justify-center"
                title="DISCONNECT"
              >
                <Power size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Full-height Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden h-full">
        
        {/* COLUMN 1: SPELL CRAFTER / ROLL LOGS (col-span-5) */}
        <div className="lg:col-span-5 wow-panel flex flex-col overflow-hidden shadow-xl bg-leather relative h-full">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-wow-gold opacity-30 m-1"></div>
          
          {/* Section 1/3 always: Roll Logs Section with large fonts */}
          <div className="h-1/3 min-h-0 pb-2 flex flex-col overflow-visible">
            <RollLogsSection />
          </div>
          
          {/* Remaining 2/3 */}
          <div className="h-2/3 min-h-0 pt-2 flex flex-col overflow-hidden border-t border-[#5a4b3c]/30">
            {isViewingPlayer && viewedPlayer ? (
              <div className="flex flex-col h-full overflow-hidden gap-2">
                {/* Spell Crafter is now only 1/2 of the remaining 2/3 (i.e. 1/3 of the total) */}
                <div className="h-1/2 min-h-0 pb-1">
                  <GMSpellCrafter />
                </div>
                {/* Inspected Player Grimoire is the other 1/2 of the remaining 2/3 (i.e. last 1/3 of the total) */}
                <div className="h-1/2 min-h-0 flex flex-col overflow-hidden border-t border-[#5a4b3c]/60 pt-2 relative">
                  <div className="text-wow-gold font-cinzel text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5 px-1 font-bold shrink-0">
                    <FileText size={12} className="text-wow-gold" />
                    <span>GRIMOIRE OF {viewedPlayer.pseudo}</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1.5 bg-black/40 border-2 border-red-600 rounded shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                    <SpellBook spells={activeSpells} playerStats={viewedPlayer?.characterState?.stats} readOnly={true} playerName={viewedPlayer.pseudo} />
                  </div>
                </div>
              </div>
            ) : (
              // Spell Crafter takes up the entire remaining 2/3 of Column 1
              <div className="h-full min-h-0">
                <GMSpellCrafter />
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: ENCOUNTERS DRAW ZONE / VIEWED PLAYER HUD (col-span-4) */}
        <div className="lg:col-span-4 wow-panel !p-0 flex flex-col shadow-xl bg-leather relative overflow-hidden">
          
          {/* GM REQUEST NOTIFICATION OVERLAY (FULL CENTER ZONE) */}
          {currentRequest && (
            <div className="absolute inset-0 z-50 bg-black/95 border-2 border-wow-gold/80 shadow-[0_0_30px_rgba(0,0,0,0.95)] p-6 flex flex-col items-center justify-center gap-5 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full border-2 border-wow-gold bg-wow-gold/10 flex items-center justify-center text-wow-gold mb-1 shadow-[0_0_15px_rgba(255,209,0,0.3)]">
                <Sparkles size={24} />
              </div>
              <h3 className="font-cinzel text-wow-gold text-lg font-bold tracking-widest uppercase border-b border-wow-gold/30 pb-2 w-full max-w-xs">
                PLAYER REQUEST
              </h3>
              <div className="font-sans text-sm text-white max-w-xs space-y-2">
                <p>
                  <span className="font-bold text-wow-gold text-base">{currentRequest.from}</span> asks for:
                </p>
                <div className="uppercase text-amber-300 font-mono text-sm bg-black/60 border border-wow-gold/40 px-3 py-2 rounded shadow-inner">
                  {currentRequest.type === 'ask_stat' 
                    ? `Stat Increase: +1 ${currentRequest.targetStat || 'Stat'}` 
                    : currentRequest.type === 'ask_spell'
                    ? `Ability: ${currentRequest.spellName || currentRequest.spell?.name || 'New Ability'}`
                    : 'Open Shop'}
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-2 w-full max-w-xs">
                <button 
                  onClick={() => handleProcessRequest(false)}
                  className="wow-button bg-red-950/60 text-red-400 border border-red-800 hover:bg-red-900/50 px-6 py-2 text-sm font-bold flex-1"
                >
                  Decline
                </button>
                <button 
                  onClick={() => handleProcessRequest(true)}
                  className="wow-button-green px-6 py-2 text-sm font-bold flex-1"
                >
                  Accept
                </button>
              </div>
            </div>
          )}
          
          {isViewingPlayer && viewedPlayer ? (
            // READ-ONLY PLAYER HUD MODE FOR THE GM - MATCHING THE PLAYER'S ORIGINAL HUD LAYOUT
            <div className="flex-1 flex flex-col bg-black/50 border-2 border-red-600 rounded p-3 relative overflow-hidden h-full shadow-[0_0_20px_rgba(220,38,38,0.2)]">
              {/* Close viewing header banner */}
              <div className="flex items-center justify-between border-b border-[#5a4b3c]/60 pb-1 mb-2 mt-1 bg-wow-gold/10 px-2.5 py-1 rounded border border-wow-gold/20 shrink-0">
                <span className="font-cinzel text-xs text-wow-gold flex items-center gap-1.5">
                  <User size={12} className="" />
                  <span className="uppercase">INSPECTING: {viewedPlayer.pseudo}</span>
                </span>
                <button 
                  onClick={() => mpStore.setActivePlayerView('me')}
                  className="p-1 rounded hover:bg-black/40 text-wow-gold transition-colors"
                  title="Close and return to drawer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Controls row (Zoom & Gear - Ask For Stat disabled) */}
              <div className="flex items-center justify-center gap-1.5 w-full border-b border-[#5a4b3c]/20 pb-1.5 mb-1.5 shrink-0 flex-wrap">
                {/* ALL MINUS CONTROLS (LEFT of ZoomOut) */}
                <div className="flex gap-0.5 items-center shrink-0">
                  <button 
                    onClick={() => pStore.decreasePhotoHeight?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                    title="Diminuer la hauteur de la photo"
                  >
                    <User size={10} />H-
                  </button>
                  <button 
                    onClick={() => pStore.decreasePhotoWidth?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                    title="Diminuer la largeur de la photo"
                  >
                    <User size={10} />W-
                  </button>
                  <button 
                    onClick={() => pStore.decreaseBarHeight?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                    title="Diminuer la hauteur des barres de stat"
                  >
                    <FileText size={10} />-
                  </button>
                </div>

                {/* LOUPE MINUS */}
                <button 
                  onClick={() => pStore.decreaseTextSize()}
                  className="wow-button p-1 text-wow-gold hover:text-white"
                  title="Réduire la taille du texte"
                >
                  <ZoomOut size={14} />
                </button>

                {/* CENTER: ASK FOR STAT (Disabled for GM) */}
                <button 
                  disabled
                  className="px-2.5 py-0.5 text-[10px] flex items-center justify-center gap-1 uppercase tracking-wider font-cinzel transition-all w-[130px] wow-button text-wow-gold opacity-30 cursor-not-allowed"
                  title="Disabled for GM"
                >
                  <Sparkles size={12} /> ASK FOR STAT
                </button>

                {/* LOUPE PLUS */}
                <button 
                  onClick={() => pStore.increaseTextSize()}
                  className="wow-button p-1 text-wow-gold hover:text-white"
                  title="Augmenter la taille du texte"
                >
                  <ZoomIn size={14} />
                </button>

                {/* ALL PLUS CONTROLS (RIGHT of ZoomIn) */}
                <div className="flex gap-0.5 items-center shrink-0">
                  <button 
                    onClick={() => pStore.increaseBarHeight?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                    title="Augmenter la hauteur des barres de stat"
                  >
                    <FileText size={10} />+
                  </button>
                  <button 
                    onClick={() => pStore.increasePhotoWidth?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                    title="Augmenter la largeur de la photo"
                  >
                    <User size={10} />W+
                  </button>
                  <button 
                    onClick={() => pStore.increasePhotoHeight?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                    title="Augmenter la hauteur de la photo"
                  >
                    <User size={10} />H+
                  </button>
                </div>
              </div>

              {/* Top Section: Encounter Toggle / Photo / Dice */}
              <div className="grid grid-cols-3 gap-2 mb-1.5 shrink-0">
                {/* 1. STATS / ENCOUNTERS Toggle - Left (Disabled for GM) */}
                <div className="flex flex-col items-center justify-start">
                  <button
                    disabled
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded flex flex-col items-center justify-center relative overflow-hidden transition-all select-none shadow-md wow-button opacity-50 cursor-not-allowed"
                    title="Encounters disabled when inspecting"
                  >
                    <User size={20} className="text-wow-gold mt-1" />
                  </button>
                  <span className="mt-1 font-cinzel font-bold text-wow-gold text-[10px] sm:text-xs drop-shadow-md text-center h-8 flex items-start justify-center px-1 w-full uppercase tracking-wider">
                    STATS
                  </span>
                </div>

                {/* 2. Photo of inspected player - Middle */}
                <div className="flex flex-col items-center justify-start">
                  <button
                    disabled
                    className="rounded !border-2 !border-red-600 overflow-hidden bg-wow-dark shadow-[0_0_20px_rgba(220,38,38,0.2)] relative shrink-0 transition-all select-none outline-none opacity-90 cursor-not-allowed"
                    style={{ 
                      height: `${pStore.photoHeight ?? 96}px`,
                      width: `${pStore.photoWidth ?? 96}px`
                    }}
                  >
                    {activeCharState?.photo ? (
                      <img src={activeCharState.photo} alt="Character" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-cinzel text-[10px] text-white/50 text-center uppercase">No Hero</div>
                    )}
                    <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                  </button>
                </div>

                {/* 3. Target Dice Roller (Disabled for GM) */}
                <div className="flex flex-col items-center justify-start">
                  <button
                    disabled
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded flex flex-col items-center justify-center relative overflow-hidden transition-all select-none shadow-md wow-button p-1 text-center opacity-50 cursor-not-allowed"
                    title="Rolling disabled when inspecting"
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className="font-macondo text-[9px] text-wow-gold/70 mt-1 uppercase">Target</span>
                      <Dices size={16} className="text-wow-gold/40 mb-1" />
                      <span className="font-macondo text-[11px] text-wow-gold/50 truncate w-full px-1">None</span>
                    </div>
                  </button>
                  <span className="mt-1 font-cinzel font-bold text-wow-gold text-[10px] sm:text-xs drop-shadow-md text-center h-8 flex items-start justify-center px-1 w-full uppercase tracking-wider">
                    ROLL
                  </span>
                </div>
              </div>

              {/* STANDARD CHARACTER VIEW CONTENT BELOW THE 3 SQUARES */}
              <div className="flex flex-col h-full rounded transition-colors overflow-y-auto custom-scrollbar pr-1">
                {/* Resources Zone: HP and EXP side-by-side on top, MP full width below */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3 shrink-0">
                  {(() => {
                    // Compute activeResources safely
                    const rawResources = Array.isArray(activeCharState?.resources) ? activeCharState.resources : [];
                    const fixedStats = FIXED_STATS_NAMES.map((name, i) => ({
                      name, current: Number((Array.isArray(activeCharState?.stats) && activeCharState.stats[i])?.current ?? 0)
                    }));
                    const sortedStats = [...fixedStats].sort((a, b) => a.current - b.current);
                    const computedMpMax = (sortedStats[0]?.current ?? 0) + (sortedStats[1]?.current ?? 0);
                    const res = [
                      { name: 'HP', color: 'red' as const, isVisible: true, max: '3', current: Number(rawResources[0]?.current ?? 3) },
                      { name: 'MP', color: 'blue' as const, isVisible: true, max: String(computedMpMax), current: Number(rawResources[1]?.current ?? 0) },
                      { name: 'EXP', color: 'purple' as const, isVisible: true, max: '3', current: Number(rawResources[2]?.current ?? 0) }
                    ];

                    return (
                      <>
                        {res[0]?.isVisible && (
                          <ResourceBar 
                            resource={res[0]} 
                            isFreeEdit={false}
                            onChange={() => {}} 
                          />
                        )}
                        {res[2]?.isVisible && (
                          <ResourceBar 
                            resource={res[2]} 
                            isFreeEdit={false}
                            onChange={() => {}} 
                          />
                        )}
                        {res[1]?.isVisible && (
                          <div className="col-span-2">
                            <ResourceBar 
                              resource={res[1]} 
                              isFreeEdit={false}
                              onChange={() => {}} 
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {activeStats.length > 0 && (
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c] to-transparent mb-3 shrink-0"></div>
                )}

                {/* Stats Zone */}
                <div className={cn(
                  "grid gap-x-3 gap-y-1", 
                  activeStats.length > 4 ? 'grid-cols-2' : 'grid-cols-1'
                )}>
                  {activeStats.map((stat: any, idx: number) => (
                    <StatBar 
                      key={idx} 
                      stat={stat} 
                      isFreeEdit={false}
                      onChange={() => {}} 
                      targetModeProps={{
                        isSelectingTarget: false,
                        isSelected: false,
                        isOtherSelected: false,
                        onSelectTarget: () => {},
                        onLaunchRoll: () => {}
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // NORMAL GM DRAWER VIEW
            <GMEncounters />
          )}
        </div>

        {/* COLUMN 3: PLAYERS BUTTONS (top) & JOURNAL / TABS (bottom) (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-hidden h-full">
          
          {/* Upper Half: Players & GM list */}
          <div className="h-[35%] sm:h-[40%] wow-panel scifi-no-tracing flex flex-col p-3 bg-wow-dark border border-[#5a4b3c] rounded overflow-hidden shadow-lg relative shrink-0">
            <div className="flex items-center justify-between border-b border-[#5a4b3c]/40 pb-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <Users size={16} className="text-wow-gold" />
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
              <div className="flex items-center gap-1.5">
                {!mpStore.isConnected && (
                  <>
                    <button 
                      onClick={() => setShowResetDbConfirm(true)}
                      className="wow-button-red px-2 py-1 text-[10px] uppercase tracking-wider font-cinzel font-bold text-white flex items-center gap-1 bg-red-950/70 border border-red-700/80 hover:bg-red-900 transition-all shrink-0"
                      title="Reset Scratch Database"
                    >
                      <RotateCcw size={11} />
                      <span>RESET</span>
                    </button>
                    <button 
                      onClick={() => {
                        performSilentSave();
                        alert("Campaign saved! Room name and players have been saved.");
                      }}
                      disabled={!mpStore.isConnected && !store.roomName.trim()}
                      className={`wow-button-green px-3 py-1 text-[10px] uppercase tracking-wider font-cinzel font-bold text-white ${(!mpStore.isConnected && !store.roomName.trim()) ? 'opacity-50 !cursor-default hover:!bg-[#153a15]' : ''}`}
                    >
                      SAVE
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 mt-2 pr-1">
              {mpStore.isConnected ? (
                <>
                  {/* Me button to reset viewed HUD */}
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
                        <Sparkles size={12} className="text-wow-gold" />
                        <span>Me (Encounter Drawer)</span>
                      </span>
                      <span className="font-mono text-[9px] text-wow-gold/60">Active</span>
                    </button>
                  </div>

                  {/* Other players */}
                  {mpStore.links.map((linkCode, idx) => {
                    const connectedPlayer = mpStore.roomPlayers[linkCode];
                    const isVisible = visiblePlayers[linkCode] !== false;

                    // Hide player row if visibility settings say so, but keep it if toggles are visible so we can check it
                    if (!showVisibilityToggles && !isVisible) {
                      return null;
                    }

                    if (connectedPlayer) {
                      const isViewingThis = mpStore.activePlayerView === linkCode;
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
                              <span className="truncate">{connectedPlayer.pseudo}</span>
                            </span>
                            <span className="font-mono text-[9px] text-wow-gold uppercase shrink-0">Inspect</span>
                          </button>
                          
                          {/* Copy player join link button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(linkCode, idx);
                            }}
                            className="wow-button p-1.5 shrink-0 bg-yellow-950/40 text-wow-gold hover:text-white border-wow-gold/50"
                            title="Copy Player Join Link"
                          >
                            {copiedIndex === idx ? (
                              <Check size={12} className="text-green-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handlePlayerCommand(linkCode, 'damage_mp', 1); }}
                            disabled={disabledButtons[`${linkCode}-damage_mp`]}
                            className="wow-button p-1.5 shrink-0 bg-red-950/40 text-red-400 hover:text-red-300 border-red-900/50 disabled:opacity-50"
                            title="Inflict -1 MP Damage"
                          >
                            <Swords size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePlayerCommand(linkCode, 'add_mp', 1); }}
                            disabled={disabledButtons[`${linkCode}-add_mp`]}
                            className="wow-button p-1.5 shrink-0 bg-green-950/40 text-green-400 hover:text-green-300 border-green-900/50 disabled:opacity-50"
                            title="Heal +1 MP"
                          >
                            <Sparkles size={12} />
                          </button>
                        </div>
                      );
                    } else {
                      // Offline / Empty Slot
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
                          <div className="flex-1 flex items-center justify-between bg-black/15 border border-[#5a4b3c]/15 rounded p-1.5 shrink-0 min-h-[34px]" style={{ contentVisibility: 'auto' }}>
                            <span className="text-[10px] font-cinzel text-white uppercase tracking-wider pl-1.5">
                              Slot #{idx + 1} (Empty)
                            </span>
                            <button
                              onClick={() => handleCopyLink(linkCode, idx)}
                              className="wow-button py-1 px-2.5 text-[10px] uppercase font-cinzel flex items-center gap-1 text-wow-gold/70 hover:text-wow-gold border-wow-gold/20"
                              title="Copy Join Link"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check size={10} className="text-green-400" />
                                  <span className="text-green-400 font-bold">COPIED</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={10} />
                                  <span>COPY</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })}
                </>
              ) : (
                <div className="flex-1 flex flex-col gap-2 mt-2 px-1 text-sm font-sans">
                  {/* Room Name Input added at the top in Scratch Mode */}
                  <div className="flex flex-col bg-black/45 border border-[#5a4b3c]/45 rounded p-2 gap-1 shadow-inner mb-1 shrink-0">
                    <span className="text-[10px] font-cinzel text-wow-gold uppercase tracking-wider font-bold">Campaign Room Name</span>
                    <input
                      type="text"
                      className="bg-black/60 border border-[#5a4b3c]/50 text-[11px] px-2 py-1 rounded text-white focus:outline-none focus:border-wow-gold"
                      placeholder="Campaign Room Name"
                      value={store.roomName || ''}
                      onChange={(e) => store.updateRoomName(e.target.value)}
                    />
                  </div>

                  <span className="text-[10px] font-cinzel text-white uppercase tracking-wider mb-1 shrink-0">Scratch Player Slots</span>
                  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
                    {store.scratchLinks.map((link, idx) => (
                      <div key={link} className="flex flex-col bg-black/30 border border-[#5a4b3c]/30 rounded p-2 gap-1.5 shadow-inner shrink-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-cinzel text-wow-gold uppercase">Slot #{idx + 1}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            className="flex-1 bg-black/60 border border-[#5a4b3c]/50 text-[11px] px-2 py-1 rounded text-white focus:outline-none focus:border-wow-gold"
                            placeholder="Player / Character Name"
                            value={store.scratchPlayers[link]?.pseudo || ''}
                            onChange={(e) => store.updateScratchPlayer(link, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lower Half: Notes / Journal split in 4 tabs */}
          <div className="flex-1 wow-panel scifi-no-tracing flex flex-col bg-black/40 border border-[#5a4b3c] rounded relative overflow-hidden">
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
                // PUB (Public Notes - editable for GM!)
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  <div className="text-[10px] uppercase font-cinzel tracking-wider text-wow-gold/70 mb-1.5 border-b border-[#5a4b3c]/30 pb-1 flex items-center justify-between shrink-0">
                    <span>Public campaign notes</span>
                    <button
                      onClick={handlePublishNotes}
                      className="wow-button text-[9px] px-2 py-0.5 text-wow-gold bg-red-950/20 hover:bg-red-950/40 font-bold border-[#800000]/60 flex items-center gap-1"
                      title="Publish to room"
                    >
                      <Sparkles size={8} />
                      <span>PUB</span>
                    </button>
                  </div>
                  <NoteTextarea
                    id="gm-public-notes"
                    value={mpStore.localPublicNotes}
                    onChange={(val) => mpStore.setLocalPublicNotes(val)}
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none font-macondo text-[15px] leading-relaxed custom-scrollbar overflow-y-scroll text-white opacity-85"
                    placeholder="Write campaign notes here, then click the PUB button above to publish to players..."
                  />
                </div>
              ) : (
                // Private Notes 1, 2, 3
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  <div className="text-[10px] uppercase font-cinzel tracking-wider text-wow-gold/60 mb-1 border-b border-[#5a4b3c]/30 pb-0.5">
                    <span>GM Private Notes (Tab #{mpStore.playerNotesTab + 1})</span>
                  </div>
                  <NoteTextarea
                    id="gm-private-notes"
                    value={mpStore.playerNotes[mpStore.playerNotesTab] || ''}
                    onChange={(val) => mpStore.setPlayerNote(mpStore.playerNotesTab, val)}
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none font-macondo text-base leading-relaxed custom-scrollbar overflow-y-scroll text-white"
                    placeholder="Secret campaign details go here..."
                  />
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* GM PLAYERS LINK GENERATION WINDOW */}
      {showPlayersModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-wow-dark border-2 border-green-900/60 p-6 rounded shadow-2xl w-full max-w-lg relative flex flex-col gap-4">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500 m-1 opacity-50"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500 m-1 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500 m-1 opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500 m-1 opacity-50"></div>

            <button 
              onClick={() => setShowPlayersModal(false)}
              className="absolute top-3 right-3 text-white hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="font-cinzel text-green-400 text-xl border-b border-green-900/40 pb-2 flex items-center gap-2">
              <Users size={18} />
              <span>{mpStore.isConnected ? "Player Unique Invitations" : "Scratch Players"}</span>
            </h3>

            <p className="font-sans text-xs text-white">
              {mpStore.isConnected 
                ? "Share these 10 generated codes/links with your players. Each code corresponds to a unique slot in the campaign room. Click to copy the full join link."
                : "Enter the names of the players playing offline (scratch mode)."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 mt-2">
              {mpStore.isConnected ? (
                mpStore.links.map((linkCode, idx) => {
                  const connectedPlayer = mpStore.roomPlayers[linkCode];
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCopyLink(linkCode, idx)}
                      className="bg-black/40 border border-[#5a4b3c]/30 hover:border-green-500 hover:bg-black/60 p-2 rounded text-left font-sans text-xs transition-colors flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-cinzel text-[10px] text-wow-gold uppercase">Player Slot #{idx + 1}</span>
                          {connectedPlayer && (
                            <span className="text-green-400 font-sans text-[11px] font-bold ">
                              ● {connectedPlayer.pseudo || 'Connected'}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-white text-[11px]">{linkCode}</span>
                      </div>
                      {copiedIndex === idx ? (
                        <span className="text-green-400 text-[10px] font-semibold flex items-center gap-0.5"><Check size={12} /> Copied!</span>
                      ) : (
                        <span className="text-white hover:text-white flex items-center gap-0.5"><Copy size={11} /> Copy</span>
                      )}
                    </button>
                  );
                })
              ) : (
                store.scratchLinks.map((linkCode, idx) => {
                  const scratchPlayer = store.scratchPlayers[linkCode];
                  return (
                    <div key={linkCode} className="flex flex-col gap-1 bg-black/40 border border-[#5a4b3c]/30 p-2 rounded">
                      <span className="font-cinzel text-[10px] text-wow-gold uppercase">Player #{idx + 1}</span>
                      <input
                        type="text"
                        value={scratchPlayer?.pseudo || ''}
                        onChange={(e) => store.updateScratchPlayer(linkCode, e.target.value)}
                        placeholder="Character name..."
                        className="wow-input w-full px-2 py-1 bg-black/60 border border-[#5a4b3c] rounded text-white font-sans text-sm focus:border-green-400 focus:outline-none transition-colors"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end mt-2">
              <button 
                onClick={() => setShowPlayersModal(false)}
                className="wow-button px-5 py-1.5 text-xs text-green-400 border-green-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-wow-dark border-2 border-red-900/60 p-6 rounded shadow-2xl w-full max-w-sm text-center relative flex flex-col gap-4">
            <h4 className="font-cinzel text-red-500 text-lg border-b border-red-950/40 pb-2 uppercase tracking-wide">Disconnect Session</h4>
            
            <p className="font-sans text-sm text-white leading-relaxed">
              Are you sure you want to disconnect? 
              <br />
              <span className="text-red-400 font-semibold font-cinzel">This will delete the room on the server and disconnect all current players.</span>
            </p>

            <div className="bg-wow-gold/5 border border-wow-gold/20 p-3 rounded text-left text-xs text-wow-gold font-medium flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-wow-gold " />
              <span>
                <strong>Duty of the Game Master:</strong> Ensure you have exported your campaign JSON so you do not lose any modifications before leaving!
              </span>
            </div>

            <div className="flex justify-center gap-3 mt-2">
              <button 
                onClick={handleDisconnect}
                className="wow-button py-2 text-sm text-red-400 border-red-800 flex-1 font-bold"
              >
                DISCONNECT
              </button>
              <button 
                onClick={() => setShowDisconnectConfirm(false)}
                className="wow-button py-2 text-sm flex-1 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET SCRATCH DB CONFIRM MODAL */}
      {showResetDbConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="wow-panel bg-[#12100e] border-2 border-red-600/80 rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-red-900/50 pb-3">
              <div className="p-2 bg-red-950/60 rounded border border-red-700/60 text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-cinzel text-base font-bold text-red-400 uppercase tracking-wider">
                  Reset Scratch Database
                </h3>
                <p className="text-[11px] text-gray-400 font-sans">Complete wipe of local Scratch memory</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              Are you sure you want to clear all local Scratch data (characters, spells, encounters, notes)? The page will reload with default campaign values.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#5a4b3c]/30">
              <button
                onClick={() => setShowResetDbConfirm(false)}
                className="wow-button px-4 py-2 text-xs font-bold font-cinzel text-gray-300 border-[#5a4b3c] hover:bg-[#5a4b3c]/30 uppercase tracking-wider"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('hud-gm-storage-v5');
                    localStorage.removeItem('hud-player-storage-v5');
                    localStorage.removeItem('hud-multiplayer-storage-v1');
                    Object.keys(localStorage).forEach(key => {
                      if (key.startsWith('gm_visible_players_') || key.startsWith('player_visible_players_')) {
                        localStorage.removeItem(key);
                      }
                    });

                    useGMStore.setState({
                      roomName: '',
                      shopSpells: [],
                      encounters: [{ id: 'default-1', actionName: '', isSub: false, isEnabled: true }],
                      currentDraw: null,
                      notes: '',
                      scratchLinks: [],
                      scratchPlayers: {},
                      isFreeEdit: false,
                      isFreeShop: false,
                      blockPlayerRolls: false,
                      crafterTextSizeLevel: 0,
                    });
                    useGMStore.getState().initScratchLinks();

                    usePlayerStore.setState({
                      photo: null,
                      name: 'Unknown Hero',
                      resources: [
                        { name: 'HP', current: 3, max: '3', isVisible: true, color: 'red' },
                        { name: 'MP', current: 0, max: '0', isVisible: true, color: 'blue' },
                        { name: 'EXP', current: 0, max: '3', isVisible: true, color: 'purple' },
                      ],
                      stats: [
                        { name: 'INTELLIGENCE', current: 0, isVisible: true },
                        { name: 'STRENGTH', current: 0, isVisible: true },
                        { name: 'SPEED', current: 0, isVisible: true },
                        { name: 'ACCURACY', current: 0, isVisible: true },
                        { name: 'PATIENCE', current: 0, isVisible: true },
                        { name: 'LUCK', current: 0, isVisible: true },
                      ],
                      spells: [],
                      notes: '',
                      textSizeLevel: 0,
                      abilityTextSizeLevel: 0,
                      photoHeight: 96,
                      photoWidth: 96,
                      barHeight: 10,
                    });

                    useMultiplayerStore.setState({
                      roomName: null,
                      password: null,
                      role: null,
                      joinCode: null,
                      gmSessionId: null,
                      pseudo: null,
                      links: [],
                      isConnected: false,
                      activePlayerView: null,
                      publishedEncounter: null,
                      publicNotes: '',
                      localPublicNotes: '',
                      rollLogs: [],
                      roomPlayers: {},
                      isEncounterViewActive: false,
                      shopSpells: [],
                      isFreeEdit: false,
                      isFreeShop: false,
                      blockPlayerRolls: false,
                      gmRequests: [],
                      playerNotes: ['', '', ''],
                      playerNotesTab: 3,
                    });
                  } catch (e) {
                    console.error(e);
                  }
                  setShowResetDbConfirm(false);
                }}
                className="wow-button-red px-4 py-2 text-xs font-bold font-cinzel text-white bg-red-800 hover:bg-red-700 uppercase tracking-wider shadow-lg flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>PROCEED</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST OVERLAY */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-[#1c120c] border-2 border-green-700/80 p-3 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.8)] text-green-400 font-cinzel text-xs flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
            <span>{successToast}</span>
          </div>
        </div>
      )}

    </div>
  );
}
