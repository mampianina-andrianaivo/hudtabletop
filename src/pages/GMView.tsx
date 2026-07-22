import React, { useState, useEffect } from 'react';
import { Home, Wifi, WifiOff, Upload, Download, Users, User, FileText, Swords, X, Copy, Check, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { GMSpellCrafter } from '@/components/GMSpellCrafter';
import { GMEncounters } from '@/components/GMEncounters';
import { useGMStore } from '@/store/useGMStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useOnlineSync } from '@/lib/useOnlineSync';
import { ResourceBar } from '@/components/ResourceBar';
import { StatBar } from '@/components/StatBar';
import { SpellBook } from '@/components/SpellBook';
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

  // Scratch init
  useEffect(() => {
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [disabledButtons, setDisabledButtons] = useState<Record<string, boolean>>({});

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
        const pendingCmds: any[] = [];

        // Deduct 3 EXP if not free edit
        if (!currentRequest.isFreeEdit) {
          pendingCmds.push({ type: 'deduct_exp', value: 3, ts: Date.now() });
        }

        // Add spell if spell request
        if (currentRequest.type === 'ask_spell' && currentRequest.spell) {
          pendingCmds.push({ type: 'add_spell', spell: currentRequest.spell, ts: Date.now() });
        }

        if (pendingCmds.length > 0) {
          updates[`players.${joinCode}.pendingCommands`] = arrayUnion(...pendingCmds);
        }
        
        // Log the acceptance
        let text = `GM accepted ${currentRequest.from}'s request for a new Stat!`;
        if (currentRequest.type === 'ask_spell') {
          text = `GM accepted ${currentRequest.from}'s request for Spell: ${currentRequest.spellName || currentRequest.spell?.name || 'Spell'}!`;
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
  const isViewingPlayer = mpStore.isConnected && mpStore.activePlayerView && mpStore.activePlayerView !== 'me';
  const viewedPlayer = isViewingPlayer ? mpStore.roomPlayers[mpStore.activePlayerView || ''] : null;
  const activeCharState = isViewingPlayer ? viewedPlayer?.characterState : null;
  const activeSpells = activeCharState?.spells || [];

  // Latest public roll log
  const latestRoll = mpStore.rollLogs[mpStore.rollLogs.length - 1];

  const handleExportGMJSON = () => {
    const roomNameToCheck = !mpStore.isConnected ? store.roomName : mpStore.roomName;
    if (!roomNameToCheck || !roomNameToCheck.trim()) {
      alert("Le nom de la Room ne peut pas être vide pour l'export.");
      return;
    }

    // If we are in scratch (offline) mode, embed the current player state as the default character state for all 6 slots
    const finalScratchPlayers: Record<string, any> = {};
    if (!mpStore.isConnected) {
      const pStore = usePlayerStore.getState();
      const currentCharacterState = {
        name: pStore.name || 'Scratch Base',
        photo: pStore.photo || '',
        stats: pStore.stats || [],
        resources: pStore.resources || [],
        spells: pStore.spells || [],
        notes: pStore.notes || '',
      };

      store.scratchLinks.forEach((link, idx) => {
        const existing = store.scratchPlayers[link] || { pseudo: '' };
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
    }

    const campaignData = {
      roomName: store.roomName,
      shopSpells: store.shopSpells,
      encounters: store.encounters,
      notes: store.notes,
      publicNotes: mpStore.publicNotes,
      scratchLinks: store.scratchLinks,
      scratchPlayers: !mpStore.isConnected ? finalScratchPlayers : store.scratchPlayers,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(campaignData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${store.roomName || 'scratch'}_campaign.json`);
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
        if (json.shopSpells) store.loadShopSpells(json.shopSpells);
        if (json.encounters) {
          useGMStore.setState({ encounters: json.encounters });
        }
        if (json.scratchLinks) {
          useGMStore.setState({ scratchLinks: json.scratchLinks });
        }
        if (json.scratchPlayers) {
          useGMStore.setState({ scratchPlayers: json.scratchPlayers });
        }
        if (json.notes) store.updateNotes(json.notes);
        if (json.publicNotes) mpStore.setLocalPublicNotes(json.publicNotes);
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
    const fullLink = `${window.location.origin}/?join=${linkCode}&room=${encodeURIComponent(mpStore.roomName || '')}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePublishNotes = () => {
    mpStore.setCredentials({ publicNotes: mpStore.localPublicNotes });
    alert("Public notes successfully published to the players!");
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-iron text-white flex flex-col p-2 md:p-3 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] select-none">
      
      {/* TOP BANNER SPLIT IN 3 SECTIONS ALIGNED WITH MAIN COLUMNS Below */}
      <div className="mb-3 grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0">
        
        {/* Section 1: Home / Connection Status Badge (lg:col-span-5) */}
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
                  <span className="font-cinzel tracking-wider">OFFLINE (SCRATCH GM)</span>
                </div>
                <button onClick={onSwitchToPlayer} className="wow-button text-[10px] py-0.5 px-2 font-cinzel">
                  To Player HUD
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
        
        {/* Section 3: Load / Export buttons & Room controls (lg:col-span-3) */}
        <div className="lg:col-span-3 wow-panel flex items-center justify-end gap-2 py-2 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px]">
          <label className="wow-button px-3 py-1.5 cursor-pointer flex items-center gap-1.5 text-xs">
            <Upload size={14} /> <span>{!mpStore.isConnected ? 'LOAD JSON' : 'Load Campaign'}</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportGMJSON} />
          </label>
          <button onClick={handleExportGMJSON} className="wow-button px-3 py-1.5 flex items-center gap-1.5 text-xs">
            <Download size={14} /> <span>{!mpStore.isConnected ? 'EXPORT JSON' : 'Export Campaign'}</span>
          </button>

          {mpStore.isConnected && (
            <>
              <div className="w-px h-6 bg-[#5a4b3c]/40 mx-1"></div>
              <button 
                onClick={() => setShowPlayersModal(true)}
                className="wow-button px-3 py-1.5 text-xs text-green-400 border-green-800/60 bg-green-950/10 flex items-center gap-1"
              >
                <Users size={13} /> <span>PLAYERS</span>
              </button>
              <button 
                onClick={() => setShowDisconnectConfirm(true)}
                className="wow-button px-3 py-1.5 text-xs text-red-400 border-red-800/60 bg-red-950/10 hover:bg-red-900/30"
              >
                DISCONNECT
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Full-height Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden h-full">
        
        {/* COLUMN 1: SPELL CRAFTER (col-span-5) */}
        <div className="lg:col-span-5 wow-panel flex flex-col overflow-hidden shadow-xl bg-leather relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-wow-gold opacity-30 m-1"></div>
          
          <GMSpellCrafter />
        </div>

        {/* COLUMN 2: ENCOUNTERS DRAW ZONE / VIEWED PLAYER HUD (col-span-4) */}
        <div className="lg:col-span-4 wow-panel !p-0 flex flex-col shadow-xl bg-leather relative overflow-hidden">
          
          {isViewingPlayer && viewedPlayer ? (
            // READ-ONLY PLAYER HUD MODE FOR THE GM
            <div className="flex-1 flex flex-col bg-black/50 border border-wow-gold/30 rounded p-4 relative overflow-y-auto custom-scrollbar">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-wow-gold opacity-30 m-1"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-wow-gold opacity-30 m-1"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-wow-gold opacity-30 m-1"></div>

              {/* Close viewing header banner */}
              <div className="flex items-center justify-between border-b border-[#5a4b3c]/60 pb-2 mb-4 mt-2 bg-wow-gold/10 px-3 py-1.5 rounded border border-wow-gold/20 shrink-0">
                <span className="font-cinzel text-xs text-wow-gold flex items-center gap-1.5">
                  <User size={14} className="animate-pulse" />
                  <span>VIEWING PLAYER: {viewedPlayer.pseudo}</span>
                </span>
                <button 
                  onClick={() => mpStore.setActivePlayerView('me')}
                  className="p-1 rounded hover:bg-black/40 text-wow-gold transition-colors"
                  title="Close and return to drawer"
                >
                  <X size={16} />
                </button>
              </div>

              {activeCharState ? (
                <div className="flex-1 flex flex-col">
                  {/* Avatar, name, dice */}
                  <div className="grid grid-cols-2 gap-2 mb-3 items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded border-4 border-wow-gold overflow-hidden bg-wow-dark relative">
                        {activeCharState.photo ? (
                          <img src={activeCharState.photo} alt="Character" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-cinzel text-[10px] text-white/40">No Photo</div>
                        )}
                      </div>
                      <span className="mt-1 font-cinzel text-xs font-bold text-wow-gold truncate max-w-full">{activeCharState.name}</span>
                    </div>
                    <div className="flex justify-center">
                      <DiceRoller disabled={true} />
                    </div>
                  </div>

                  {/* Resource trackers (read-only) */}
                  <div className="flex flex-col gap-1.5 mb-3">
                    {activeCharState.resources?.filter((r: any) => r.isVisible).map((res: any, i: number) => (
                      <ResourceBar key={i} resource={res} onChange={() => {}} />
                    ))}
                  </div>

                  {/* Stats (read-only) */}
                  <div className="flex flex-col gap-1.5 mb-3">
                    {activeCharState.stats?.filter((s: any) => s.isVisible).map((stat: any, i: number) => (
                      <StatBar key={i} stat={stat} onChange={() => {}} />
                    ))}
                  </div>

                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c] to-transparent my-3"></div>

                  {/* Spells Grimoire view (read-only) */}
                  <div className="flex-1 min-h-[220px]">
                    <SpellBook spells={activeSpells} readOnly={true} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-white/50 p-6 font-cinzel">
                  <User size={36} className="text-wow-gold/40 mb-2 animate-pulse" />
                  <p className="text-sm">Player is connected but hasn't synchronized their character dashboard yet.</p>
                </div>
              )}
            </div>
          ) : (
            // NORMAL GM DRAWER VIEW
            <GMEncounters />
          )}
        </div>

        {/* COLUMN 3: PLAYERS BUTTONS (top) & JOURNAL / TABS (bottom) (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-hidden h-full">
          
          {/* Upper Half: Players & GM list */}
          <div className="h-[35%] sm:h-[40%] wow-panel flex flex-col p-3 bg-wow-dark border border-[#5a4b3c] rounded overflow-hidden shadow-lg relative shrink-0">
            <div className="flex items-center justify-between border-b border-[#5a4b3c]/40 pb-1.5 shrink-0">
              <Users size={16} className="text-wow-gold" />
              <div className="flex items-center gap-1.5">
                {!mpStore.isConnected ? (
                  <>
                    <button 
                      onClick={() => {
                        alert("Campagne enregistrée ! Le nom de la Room et des joueurs ont été sauvegardés.");
                      }}
                      className="wow-button-green px-3 py-1 text-[10px] uppercase tracking-wider font-cinzel font-bold text-white"
                    >
                      SAVE
                    </button>
                    <span className="wow-button px-2.5 py-1 text-[10px] uppercase tracking-wider font-cinzel font-bold text-wow-gold border-wow-gold opacity-80 cursor-default select-none">
                      FREE EDIT
                    </span>
                  </>
                ) : (
                  <button 
                    onClick={async () => {
                      const nextValue = !(mpStore.isConnected ? mpStore.isFreeEdit : store.isFreeEdit);
                      store.setIsFreeEdit(nextValue);
                      if (mpStore.isConnected) {
                        mpStore.setCredentials({ isFreeEdit: nextValue });
                        if (db && mpStore.roomName) {
                          try {
                            const roomRef = doc(db, 'rooms', mpStore.roomName.trim().toLowerCase());
                            await updateDoc(roomRef, { isFreeEdit: nextValue });
                          } catch (e) {
                            console.error('Error toggling free edit:', e);
                          }
                        }
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[10px] uppercase tracking-wider font-cinzel font-bold transition-all",
                      (mpStore.isConnected ? mpStore.isFreeEdit : store.isFreeEdit) 
                        ? "wow-button-green" 
                        : "wow-button text-wow-gold"
                    )}
                  >
                    {(mpStore.isConnected ? mpStore.isFreeEdit : store.isFreeEdit) ? 'FINISH EDIT' : 'FREE EDIT'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 mt-2 pr-1">
              {mpStore.isConnected ? (
                <>
                  {/* Me button to reset viewed HUD */}
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
                      <Sparkles size={12} className="text-wow-gold" />
                      <span>Me (Encounter Drawer)</span>
                    </span>
                    <span className="font-mono text-[9px] text-wow-gold/60">Active</span>
                  </button>

                  {/* Other players */}
                  {Object.values(mpStore.roomPlayers).map((p: any) => {
                    const isViewingThis = mpStore.activePlayerView === p.joinCode;
                    return (
                      <div key={p.joinCode} className="flex items-center gap-1">
                        <button
                          onClick={() => mpStore.setActivePlayerView(p.joinCode)}
                          className={cn(
                            "flex-1 py-1.5 px-3 rounded font-cinzel text-xs text-left flex items-center justify-between border transition-all duration-200 shadow-sm",
                            isViewingThis
                              ? "bg-wow-gold/15 text-wow-gold border-wow-gold"
                              : "bg-black/30 text-gray-400 border-[#5a4b3c]/30 hover:bg-black/55 hover:border-[#5a4b3c]/60"
                          )}
                        >
                          <span className="flex items-center gap-1.5 truncate max-w-[70%]">
                            <Users size={12} className="text-gray-400" />
                            <span className="truncate">{p.pseudo}</span>
                          </span>
                          <span className="font-mono text-[9px] text-wow-gold uppercase shrink-0">Inspect</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePlayerCommand(p.joinCode, 'damage_mp', 1); }}
                          disabled={disabledButtons[`${p.joinCode}-damage_mp`]}
                          className="wow-button p-1.5 shrink-0 bg-red-950/40 text-red-400 hover:text-red-300 border-red-900/50 disabled:opacity-50"
                          title="Inflict -1 MP Damage"
                        >
                          <Swords size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePlayerCommand(p.joinCode, 'add_mp', 1); }}
                          disabled={disabledButtons[`${p.joinCode}-add_mp`]}
                          className="wow-button p-1.5 shrink-0 bg-green-950/40 text-green-400 hover:text-green-300 border-green-900/50 disabled:opacity-50"
                          title="Heal +1 MP"
                        >
                          <Sparkles size={12} />
                        </button>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="flex-1 flex flex-col gap-2 mt-2 px-1 text-sm font-sans">
                  {/* Room Name Input added at the top in Scratch Mode */}
                  <div className="flex flex-col bg-black/45 border border-[#5a4b3c]/45 rounded p-2 gap-1 shadow-inner mb-1 shrink-0">
                    <span className="text-[10px] font-cinzel text-wow-gold uppercase tracking-wider font-bold">Nom de la Room (Campagne)</span>
                    <input
                      type="text"
                      className="bg-black/60 border border-[#5a4b3c]/50 text-[11px] px-2 py-1 rounded text-white focus:outline-none focus:border-wow-gold"
                      placeholder="Room Name / Nom de la Room"
                      value={store.roomName || ''}
                      onChange={(e) => store.updateRoomName(e.target.value)}
                    />
                  </div>

                  <span className="text-[10px] font-cinzel text-gray-400 uppercase tracking-wider mb-1 shrink-0">Scratch Player Slots (Fixed Links)</span>
                  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
                    {store.scratchLinks.map((link, idx) => (
                      <div key={link} className="flex flex-col bg-black/30 border border-[#5a4b3c]/30 rounded p-2 gap-1.5 shadow-inner shrink-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-cinzel text-wow-gold uppercase">Slot #{idx + 1}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-wow-gold font-bold font-mono">{link}</span>
                            {copiedIndex === idx ? (
                              <span className="text-green-400 text-[10px]"><Check size={10} /></span>
                            ) : (
                              <button onClick={() => handleCopyLink(link, idx)} className="text-wow-gold hover:text-white" title="Copy join link"><Copy size={10} /></button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            className="flex-1 bg-black/60 border border-[#5a4b3c]/50 text-[11px] px-2 py-1 rounded text-white focus:outline-none focus:border-wow-gold"
                            placeholder="Player / Character Pseudo"
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
              className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="font-cinzel text-green-400 text-xl border-b border-green-900/40 pb-2 flex items-center gap-2">
              <Users size={18} />
              <span>Player Unique Invitations</span>
            </h3>

            <p className="font-sans text-xs text-gray-300">
              Share these 10 generated codes/links with your players. Each code corresponds to a unique slot in the campaign room. Click to copy the full join link.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 mt-2">
              {mpStore.links.map((linkCode, idx) => {
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
                          <span className="text-green-400 font-sans text-[11px] font-bold animate-pulse">
                            ● {connectedPlayer.pseudo || 'Connected'}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-white text-[11px]">{linkCode}</span>
                    </div>
                    {copiedIndex === idx ? (
                      <span className="text-green-400 text-[10px] font-semibold flex items-center gap-0.5"><Check size={12} /> Copied!</span>
                    ) : (
                      <span className="text-gray-500 hover:text-white flex items-center gap-0.5"><Copy size={11} /> Copy</span>
                    )}
                  </button>
                );
              })}
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

      {/* GM REQUEST MODAL */}
      {currentRequest && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-wow-dark border-2 border-wow-gold p-6 rounded shadow-2xl w-full max-w-sm relative flex flex-col gap-4 text-center">
            <h3 className="font-cinzel text-wow-gold text-lg">Player Request</h3>
            <p className="font-sans text-sm text-gray-200">
              <span className="font-bold text-wow-gold">{currentRequest.from}</span> asks for: <br />
              <span className="uppercase text-white font-mono mt-2 inline-block">
                {currentRequest.type === 'ask_stat' 
                  ? 'New Stat' 
                  : currentRequest.type === 'ask_spell'
                  ? `Spell: ${currentRequest.spellName || currentRequest.spell?.name || 'New Spell'}`
                  : 'Open Shop'}
              </span>
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button 
                onClick={() => handleProcessRequest(false)}
                className="wow-button bg-red-950/50 text-red-400 border border-red-900 px-6 py-2"
              >
                Decline
              </button>
              <button 
                onClick={() => handleProcessRequest(true)}
                className="wow-button bg-green-950/50 text-green-400 border border-green-900 px-6 py-2"
              >
                Accept
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
            
            <p className="font-sans text-sm text-gray-300 leading-relaxed">
              Are you sure you want to disconnect? 
              <br />
              <span className="text-red-400 font-semibold font-cinzel">This will delete the room on the server and disconnect all current players.</span>
            </p>

            <div className="bg-wow-gold/5 border border-wow-gold/20 p-3 rounded text-left text-xs text-wow-gold font-medium flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-wow-gold animate-pulse" />
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

    </div>
  );
}
