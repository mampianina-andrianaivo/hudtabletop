import React, { useState, useEffect } from 'react';
import { Home, Wifi, WifiOff, Upload, Download, Users, User, FileText, Swords, X, Copy, Check, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { GMSpellCrafter } from '@/components/GMSpellCrafter';
import { GMEncounters } from '@/components/GMEncounters';
import { useGMStore } from '@/store/useGMStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useOnlineSync } from '@/lib/useOnlineSync';
import { ResourceBar } from '@/components/ResourceBar';
import { StatBar } from '@/components/StatBar';
import { SpellBook } from '@/components/SpellBook';
import { DiceRoller } from '@/components/DiceRoller';
import { cn } from '@/lib/utils';

interface GMViewProps {
  onGoHome: () => void;
}

export function GMView({ onGoHome }: GMViewProps) {
  const store = useGMStore();
  const mpStore = useMultiplayerStore();

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

  // If viewing a player character sheet
  const isViewingPlayer = mpStore.isConnected && mpStore.activePlayerView && mpStore.activePlayerView !== 'me';
  const viewedPlayer = isViewingPlayer ? mpStore.roomPlayers[mpStore.activePlayerView || ''] : null;
  const activeCharState = isViewingPlayer ? viewedPlayer?.characterState : null;
  const activeSpells = activeCharState?.spells || [];

  // Latest public roll log
  const latestRoll = mpStore.rollLogs[mpStore.rollLogs.length - 1];

  const handleExportGMJSON = () => {
    const campaignData = {
      shopSpells: store.shopSpells,
      encounters: store.encounters,
      notes: store.notes,
      publicNotes: mpStore.publicNotes,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(campaignData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${mpStore.roomName || 'gm'}_campaign.json`);
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
          // Set each loaded action
          useGMStore.setState({ encounters: json.encounters });
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
        await fetch('/api/rooms/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: mpStore.roomName,
            gmSessionId: mpStore.gmSessionId,
          }),
        });
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
        
        {/* Section 3: Load / Export buttons & Room controls (lg:col-span-3) */}
        <div className="lg:col-span-3 wow-panel flex items-center justify-end gap-2 py-2 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] z-10 min-h-[44px]">
          <label className="wow-button px-3 py-1.5 cursor-pointer flex items-center gap-1.5 text-xs">
            <Upload size={14} /> <span className="hidden lg:inline">Load Campaign</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportGMJSON} />
          </label>
          <button onClick={handleExportGMJSON} className="wow-button px-3 py-1.5 flex items-center gap-1.5 text-xs">
            <Download size={14} /> <span className="hidden lg:inline">Export Campaign</span>
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
            <h4 className="font-cinzel text-wow-gold text-xs border-b border-[#5a4b3c]/40 pb-1.5 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Users size={14} className="text-wow-gold" />
              <span>Connected Players</span>
            </h4>
            
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
                        <span className="font-mono text-[9px] text-wow-gold uppercase shrink-0">Inspect HUD</span>
                      </button>
                    );
                  })}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                  <WifiOff size={24} className="text-[#5a4b3c] mb-2" />
                  <span className="text-[10px] font-cinzel tracking-wider text-gray-400 uppercase">Offline Mode</span>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-[180px]">Connect to a room to see connected players.</p>
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
                  <textarea
                    value={mpStore.localPublicNotes}
                    onChange={(e) => mpStore.setLocalPublicNotes(e.target.value)}
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none font-macondo text-[15px] leading-relaxed custom-scrollbar overflow-y-scroll text-white opacity-85"
                    placeholder="Write campaign notes here, then click the PUB button above to publish to players..."
                    spellCheck="false"
                  />
                </div>
              ) : (
                // Private Notes 1, 2, 3
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  <div className="text-[10px] uppercase font-cinzel tracking-wider text-wow-gold/60 mb-1 border-b border-[#5a4b3c]/30 pb-0.5">
                    <span>GM Private Notes (Tab #{mpStore.playerNotesTab + 1})</span>
                  </div>
                  <textarea
                    value={mpStore.playerNotes[mpStore.playerNotesTab] || ''}
                    onChange={(e) => mpStore.setPlayerNote(mpStore.playerNotesTab, e.target.value)}
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none font-macondo text-base leading-relaxed custom-scrollbar overflow-y-scroll text-white"
                    placeholder="Secret campaign details go here..."
                    spellCheck="false"
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
              {mpStore.links.map((linkCode, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopyLink(linkCode, idx)}
                  className="bg-black/40 border border-[#5a4b3c]/30 hover:border-green-500 hover:bg-black/60 p-2 rounded text-left font-sans text-xs transition-colors flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-cinzel text-[10px] text-wow-gold uppercase">Player Slot #{idx + 1}</span>
                    <span className="font-mono text-white text-[11px]">{linkCode}</span>
                  </div>
                  {copiedIndex === idx ? (
                    <span className="text-green-400 text-[10px] font-semibold flex items-center gap-0.5"><Check size={12} /> Copied!</span>
                  ) : (
                    <span className="text-gray-500 hover:text-white flex items-center gap-0.5"><Copy size={11} /> Copy</span>
                  )}
                </button>
              ))}
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
