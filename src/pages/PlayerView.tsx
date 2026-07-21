import React, { useState, useEffect } from 'react';
import { Home, Download, Upload, Settings, Wifi, WifiOff, ZoomIn, ZoomOut, User, Users, Swords, Sword, FileText, Lock } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useOnlineSync } from '@/lib/useOnlineSync';
import { ResourceBar } from '@/components/ResourceBar';
import { StatBar } from '@/components/StatBar';
import { DiceRoller } from '@/components/DiceRoller';
import { SpellBook } from '@/components/SpellBook';
import { PlayerConfigModal } from '@/components/PlayerConfigModal';
import { cn, parseMax } from '@/lib/utils';

interface PlayerViewProps {
  onGoHome: () => void;
}

export function PlayerView({ onGoHome }: PlayerViewProps) {
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

  // Determine if we are viewing another player's sheet (View Mode)
  const isViewMode = mpStore.isConnected && mpStore.activePlayerView && mpStore.activePlayerView !== 'me';
  const viewedPlayer = isViewMode ? mpStore.roomPlayers[mpStore.activePlayerView || ''] : null;
  const activeCharState = isViewMode ? viewedPlayer?.characterState : null;

  // Resolve active sheet fields
  const activeName = isViewMode ? (activeCharState?.name || viewedPlayer?.pseudo || 'Awaiting Sync...') : store.name;
  const activePhoto = isViewMode ? activeCharState?.photo : store.photo;
  const activeResources = isViewMode ? (activeCharState?.resources || []) : store.resources;
  const activeStats = isViewMode ? (activeCharState?.stats || []) : store.stats;
  const activeSpells = isViewMode ? (activeCharState?.spells || []) : store.spells;

  const visibleResources = activeResources.filter((r: any) => r.isVisible);
  const visibleStats = activeStats.filter((s: any) => s.isVisible);

  // Latest public roll log
  const latestRoll = mpStore.rollLogs[mpStore.rollLogs.length - 1];

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "character_sheet.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        store.loadState(json);
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Invalid character file.");
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
              <div className="flex items-center gap-1 text-gray-400 bg-black/40 border border-[#5a4b3c]/30 px-2 py-0.5 rounded shadow-inner">
                <WifiOff size={12} />
                <span className="font-cinzel tracking-wider">OFFLINE MODE</span>
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
                <Upload size={14} /> <span>Load JSON</span>
                <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </label>
              <button onClick={handleExportJSON} className="wow-button px-3 py-1.5 flex items-center gap-1.5 text-xs">
                <Download size={14} /> <span>Export JSON</span>
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
          
          <SpellBook spells={activeSpells} readOnly={isViewMode} />
        </div>

        {/* COLUMN 2: CHARACTER stats, resource trackers, and toggleable Encounter board (col-span-4) */}
        <div className="lg:col-span-4 wow-panel flex flex-col shadow-xl bg-leather p-3 relative overflow-hidden h-full">
          
          {/* Controls row (Zoom & Gear) - perfectly centered and grouped! */}
          {!isViewMode && (
            <div className="flex items-center justify-center gap-4 w-full border-b border-[#5a4b3c]/20 pb-1 mb-1.5 shrink-0">
              <button 
                onClick={() => store.decreaseTextSize()}
                className="p-1 text-wow-gold hover:text-white transition-colors"
                title="Réduire le texte"
              >
                <ZoomOut size={16} />
              </button>
              <button 
                onClick={() => setShowConfig(true)}
                className="p-1 text-wow-gold hover:text-white transition-colors hover:rotate-45 duration-300"
                title="Paramètres de fiche"
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={() => store.increaseTextSize()}
                className="p-1 text-wow-gold hover:text-white transition-colors"
                title="Agrandir le texte"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          )}

          {/* Top Section: Photo / Encounter Toggle / Dice (ALWAYS VISIBLE!) */}
          <div className="grid grid-cols-3 gap-2 mb-1.5 mt-1 shrink-0">
            
            {/* Photo & Name */}
            <div className="flex flex-col items-center justify-start">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded border-4 border-wow-gold overflow-hidden bg-wow-dark shadow-[0_0_15px_rgba(0,0,0,0.8)] relative shrink-0">
                {activePhoto ? (
                  <img src={activePhoto} alt="Character" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-cinzel text-[10px] text-white/50 text-center uppercase">No Hero</div>
                )}
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
              </div>
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
            
            {/* Dice Roller */}
            <div className="flex flex-col items-center justify-start">
              <DiceRoller disabled={isViewMode} />
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
              <div className="flex flex-col h-full">
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
                        onChange={isViewMode ? () => {} : (delta) => {
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
                        onChange={isViewMode ? () => {} : (delta) => {
                          store.updateStat(idx, { current: Math.max(0, Math.min(12, stat.current + delta)) });
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
                  <textarea
                    value={mpStore.playerNotes[mpStore.playerNotesTab] || ''}
                    onChange={(e) => mpStore.setPlayerNote(mpStore.playerNotesTab, e.target.value)}
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none font-macondo text-base leading-relaxed custom-scrollbar overflow-y-scroll text-white"
                    placeholder="Ecrivez vos notes d'aventure privées ici..."
                    spellCheck="false"
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
