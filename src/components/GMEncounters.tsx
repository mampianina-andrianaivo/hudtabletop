import React, { useState } from 'react';
import { Settings, Plus, X, ArrowDown, Copy, Swords, ClipboardPaste, Lock } from 'lucide-react';
import { useGMStore, DrawResultAction, DrawResult } from '@/store/useGMStore';
import { DiceRoller } from './DiceRoller';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { sendOnlineRoll } from '@/lib/useOnlineSync';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

function parseEncounterScheme(text: string): DrawResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { level: 0, published: false, lines: [], isInvalid: true };
  }

  const rawLines = trimmed
    .split(/\n|\||\//)
    .map(l => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) {
    return { level: 0, published: false, lines: [], isInvalid: true };
  }

  const lines: DrawResultAction[][] = [];

  for (const rawLine of rawLines) {
    const cleanLine = rawLine
      .replace(/^(line\s*#?\d+:?|#\d+:?)\s*/i, '')
      .trim();
    if (!cleanLine) continue;

    const actionStrs = cleanLine
      .split(/>|→|->/)
      .map(s => s.trim())
      .filter(Boolean);

    if (actionStrs.length === 0) continue;

    const lineActions: DrawResultAction[] = [];
    for (const actStr of actionStrs) {
      const subMatch = actStr.match(/^(.*?)\s*\(\+?\s*(.*?)\)$/);
      if (subMatch) {
        const name = subMatch[1].trim();
        const sub = subMatch[2].trim();
        if (name) {
          lineActions.push({ name, sub: sub || undefined });
        }
      } else {
        if (actStr) {
          lineActions.push({ name: actStr });
        }
      }
    }

    if (lineActions.length > 0) {
      lines.push(lineActions);
    }
  }

  const looksLikeScheme =
    trimmed.includes('>') ||
    trimmed.includes('→') ||
    trimmed.includes('->') ||
    trimmed.includes('/') ||
    trimmed.includes('(+') ||
    /#\d+/.test(trimmed);

  if (lines.length > 0 && looksLikeScheme) {
    return {
      level: lines.length,
      published: false,
      lines,
      isInvalid: false
    };
  }

  return {
    level: 0,
    published: false,
    lines: [],
    isInvalid: true
  };
}

export function GMEncounters() {
  const store = useGMStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [activeTab, setActiveTab] = useState<'actions' | 'result'>('actions');

  const handleCopy = () => {
    if (!store.currentDraw || store.currentDraw.isInvalid) return;
    const text = store.currentDraw.lines.map((line, idx) => 
      `#${idx + 1}: ` + line.map(action => action.sub ? `${action.name} (+${action.sub})` : action.name).join(' > ')
    ).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handlePasteConfirm = () => {
    const result = parseEncounterScheme(pastedText);
    store.setCurrentDraw(result);
    setShowPasteModal(false);
    setPastedText('');
  };

  const handlePublish = async () => {
    store.publishDraw();
    
    // Log the published encounter in the public log
    if (store.currentDraw) {
      const linesText = store.currentDraw.lines.map((line, lIdx) => 
        `#${lIdx + 1}: ${line.map(act => act.name + (act.sub ? ` (+${act.sub})` : '')).join(' > ')}`
      ).join(' / ');
      
      const logMsg = `⚔️ GM published an encounter (Lvl ${store.currentDraw.level}): ${linesText}`;
      await sendOnlineRoll(logMsg);
    }

    // Write immediately to Firestore
    const mpState = useMultiplayerStore.getState();
    if (mpState.isConnected && mpState.roomName && db) {
      try {
        const roomRef = doc(db, 'rooms', mpState.roomName.trim().toLowerCase());
        await updateDoc(roomRef, {
          publishedEncounter: {
            ...store.currentDraw,
            published: true,
            timestamp: Date.now()
          }
        });
      } catch (err) {
        console.error("Error publishing encounter immediately:", err);
      }
    }
  };

  const handleRollEncounter = (level: number) => {
    store.drawEncounters(level);
    setActiveTab('result');
  };

  const handleToggleLine = async (idx: number) => {
    store.toggleDrawLineCompleted(idx);
    
    // Write immediately to Firestore if connected
    const updatedDraw = useGMStore.getState().currentDraw;
    const mpState = useMultiplayerStore.getState();
    if (updatedDraw && mpState.isConnected && mpState.roomName && db) {
      try {
        const roomRef = doc(db, 'rooms', mpState.roomName.trim().toLowerCase());
        await updateDoc(roomRef, {
          publishedEncounter: updatedDraw
        });
      } catch (err) {
        console.error("Error updating encounter line completion:", err);
      }
    }
  };

  const handleToggleBlockRolls = async () => {
    const nextVal = !store.blockPlayerRolls;
    store.setBlockPlayerRolls(nextVal);
    
    const mpState = useMultiplayerStore.getState();
    if (mpState.isConnected && mpState.roomName && db) {
      try {
        const roomRef = doc(db, 'rooms', mpState.roomName.trim().toLowerCase());
        await updateDoc(roomRef, {
          blockPlayerRolls: nextVal
        });
      } catch (err) {
        console.error("Error updating blockPlayerRolls:", err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <button 
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-2 left-2 p-1.5 text-wow-gold hover:text-white transition-colors z-20 hover:rotate-90 duration-300"
      >
        <Settings size={20} />
      </button>

      {/* Top Rolling Zone */}
      <div className="flex flex-row items-start justify-center gap-6 px-4 pt-3 pb-1">
        <div className="flex flex-col items-center w-36 sm:w-40">
          <div className="grid grid-cols-2 gap-2 h-20 sm:h-24 w-full">
            {[1, 2, 3, 4].map(lvl => (
              <button 
                key={lvl} 
                onClick={() => handleRollEncounter(lvl)}
                className="wow-button font-cinzel text-sm flex items-center justify-center p-0"
              >
                Lvl {lvl}
              </button>
            ))}
          </div>
          <div className="mt-1 font-cinzel font-bold text-wow-gold text-xs tracking-wider uppercase drop-shadow-md text-center h-5 flex items-center justify-center px-1 w-full">
            Roll Encounter
          </div>
        </div>
        
        <DiceRoller />
      </div>

      {/* Block Player Rolls Button */}
      <div className="px-4 pb-1.5 flex justify-center shrink-0">
        <button
          onClick={handleToggleBlockRolls}
          className={`py-1.5 px-4 flex items-center justify-center gap-2 font-cinzel text-xs font-bold transition-all duration-150 uppercase tracking-widest ${
            store.blockPlayerRolls ? 'wow-button-red' : 'wow-button-green'
          }`}
          style={{ width: '220px' }}
        >
          <Lock size={12} className="shrink-0" />
          <span>{store.blockPlayerRolls ? "ROLLS BLOCKED" : "BLOCK ROLLS"}</span>
        </button>
      </div>

      <div className="flex bg-[#1a110a] border-y border-[#5a4b3c]">
        <button 
          onClick={() => setActiveTab('actions')}
          className={`flex-1 py-2 font-cinzel text-sm text-center border-r border-[#5a4b3c] ${activeTab === 'actions' ? 'bg-[#3b2c19] text-wow-gold' : 'text-white hover:text-white'}`}
        >
          Actions List
        </button>
        <button 
          onClick={() => setActiveTab('result')}
          className={`flex-1 py-2 font-cinzel text-sm text-center relative flex items-center justify-center gap-1.5 ${activeTab === 'result' ? 'bg-[#3b2c19] text-wow-gold' : 'text-white hover:text-white'}`}
        >
          <span>Draw Result</span>
          {store.currentDraw?.published && (
            <span className="w-5 h-5 bg-wow-gold border border-black text-[#1c120c] font-extrabold text-[10px] font-sans rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.5)] shrink-0">
              !!
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {activeTab === 'actions' && (
          <div className="flex flex-col gap-2">
            {store.encounters.filter(e => e.actionName.trim()).map(enc => (
              <label key={enc.id} className="flex items-center gap-3 p-2 bg-[#2b1d14]/50 border border-[#3b2c19] rounded cursor-pointer hover:bg-[#2b1d14]">
                <input 
                  type="checkbox" 
                  checked={enc.isEnabled} 
                  onChange={(e) => store.updateEncounterAction(enc.id, { isEnabled: e.target.checked })}
                  className="accent-wow-gold w-4 h-4"
                />
                <span className={`font-macondo text-lg ${enc.isEnabled ? 'text-white' : 'text-white'}`}>
                  {enc.actionName}
                </span>
                {enc.isSub && (
                  <span className="ml-auto text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-900">SUB</span>
                )}
              </label>
            ))}
            {store.encounters.filter(e => e.actionName.trim()).length === 0 && (
              <div className="text-center text-white font-cinzel mt-4">No actions defined. Check settings.</div>
            )}
          </div>
        )}

        {activeTab === 'result' && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {store.currentDraw ? (
                store.currentDraw.isInvalid ? (
                  <div className="flex flex-col items-center justify-center gap-6 py-8 w-full">
                    <div className="font-cinzel text-red-400 font-bold text-xs sm:text-sm tracking-wider uppercase text-center bg-red-950/40 border border-red-800/60 px-4 py-3 rounded shadow-md">
                      incorrect encounter scheme
                    </div>
                    <div className="flex gap-2 w-full justify-center">
                      <button 
                        disabled
                        className="wow-button w-10 h-10 flex items-center justify-center p-0 opacity-40 cursor-pointer"
                        title="Copy Draw Result"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => store.clearDraw()}
                        className="wow-button font-cinzel text-sm w-24 h-10"
                      >
                        Clear
                      </button>
                      <button 
                        disabled
                        className="wow-button font-cinzel text-sm w-32 h-10 opacity-40 cursor-pointer"
                      >
                        Publish
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <h4 className="font-cinzel text-xl text-wow-gold border-b border-[#5a4b3c] px-4 pb-1">
                      Level {store.currentDraw.level || 1}
                    </h4>
                    
                    <div className="flex flex-col items-center w-full gap-1">
                      {store.currentDraw.lines.map((line, lIdx) => {
                        const isCompleted = !!store.currentDraw?.completedLines?.[lIdx];
                        return (
                          <React.Fragment key={lIdx}>
                            <button
                              onClick={() => handleToggleLine(lIdx)}
                              className={`w-full border rounded p-1 flex flex-row gap-1 shadow-lg items-stretch justify-center transition-all duration-200 select-none ${
                                isCompleted
                                  ? 'bg-green-950/55 border-green-600/80 hover:bg-green-900/50 hover:border-green-500'
                                  : 'bg-[#2b1d14] border-[#5a4b3c] hover:bg-[#3d2a1d] hover:border-[#7d6752]'
                              }`}
                            >
                              <div className="flex items-center justify-center min-w-10 px-1.5 shrink-0 font-cinzel text-wow-gold text-sm font-bold bg-[#1a110a] rounded border border-[#3b2c19]">
                                #{lIdx + 1}
                              </div>
                              {line.map((action, aIdx) => (
                                <div key={aIdx} className="bg-[#1a110a] px-1 py-1 rounded border border-[#3b2c19] flex flex-col items-center justify-start flex-1 text-center min-w-0 h-full gap-0.5">
                                  <span className="font-macondo text-white text-[13px] leading-tight w-full" style={{ wordBreak: 'break-word' }}>{action.name}</span>
                                  {action.sub && (
                                    <span className="text-[10px] font-sans bg-purple-900/40 text-purple-200 px-1 py-0.5 rounded mt-1 border border-purple-800 w-full truncate">
                                      + {action.sub}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 mt-4 w-full justify-center">
                      <button 
                        onClick={handleCopy}
                        className="wow-button w-10 h-10 flex items-center justify-center p-0"
                        title="Copy Draw Result"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => store.clearDraw()}
                        className="wow-button font-cinzel text-sm w-24 h-10"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={handlePublish}
                        className={`wow-button font-cinzel text-sm w-32 h-10 ${store.currentDraw.published ? "!bg-green-800/80 !border-green-700 !text-white" : ""}`}
                      >
                        {store.currentDraw.published ? 'Published' : 'Publish'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center text-white font-cinzel py-10">
                  No draw result yet. Roll an encounter!
                </div>
              )}
            </div>

            {/* Paste Encounter Scheme Button at the bottom of Draw Result */}
            <div className="flex justify-center mt-4 pt-3 border-t border-[#5a4b3c]/40 shrink-0">
              <button 
                onClick={() => setShowPasteModal(true)}
                className="wow-button font-cinzel text-xs py-2 px-4 flex items-center gap-1.5 shadow-md"
              >
                <ClipboardPaste size={15} className="text-wow-gold" />
                <span>PASTE ENCOUNTER SCHEME</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showPasteModal && (
        <div className="absolute inset-0 bg-black/95 z-30 p-4 flex flex-col justify-between border-2 border-[#5a4b3c] rounded animate-in fade-in duration-150">
          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            <h4 className="font-cinzel text-wow-gold text-sm font-bold text-center tracking-wider uppercase border-b border-[#5a4b3c]/50 pb-2">
              Paste Encounter Scheme
            </h4>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="#1: Action 1 (+Sub) > Action 2 > Action 3 / #2: Action A > Action B (+Sub) > Action C"
              className="wow-input flex-1 w-full p-2 text-xs font-mono resize-none focus:outline-none custom-scrollbar bg-black/60 border border-[#5a4b3c]/60"
              rows={6}
              autoFocus
            />
          </div>

          <div className="flex justify-center gap-3 mt-3 shrink-0">
            <button
              onClick={handlePasteConfirm}
              className="wow-button font-cinzel text-xs px-6 py-2 font-bold"
            >
              OK
            </button>
            <button
              onClick={() => {
                setShowPasteModal(false);
                setPastedText('');
              }}
              className="wow-button font-cinzel text-xs px-6 py-2"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded p-4">
          <div className="bg-[#1a110a] border-2 border-[#5a4b3c] p-4 rounded shadow-2xl w-full max-w-md flex flex-col gap-4 max-h-full">
            <h4 className="font-cinzel text-wow-gold text-lg text-center">Encounter Settings</h4>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2">
              {store.encounters.map((enc, idx) => (
                <div key={enc.id} className="flex items-center gap-2">
                  {idx > 0 ? (
                    <button onClick={() => store.removeEncounterAction(enc.id)} className="text-red-400 hover:text-red-300 p-1">
                      <X size={14} />
                    </button>
                  ) : (
                    <div className="w-[22px]"></div>
                  )}
                  <label className="flex items-center gap-1 text-xs text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enc.isSub} 
                      onChange={(e) => store.updateEncounterAction(enc.id, { isSub: e.target.checked })} 
                      className="accent-wow-gold"
                    />
                    sub
                  </label>
                  <input 
                    type="text" 
                    value={enc.actionName} 
                    onChange={(e) => store.updateEncounterAction(enc.id, { actionName: e.target.value })}
                    placeholder="Action name..."
                    className="wow-input flex-1 p-1 text-sm"
                  />
                </div>
              ))}
              <button 
                onClick={() => store.addEncounterAction({ id: Date.now().toString(), actionName: '', isSub: false, isEnabled: true })}
                className="mt-1 flex items-center justify-center gap-1 p-1 text-xs text-wow-gold hover:bg-white/10 rounded border border-dashed border-[#5a4b3c]"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>
            
            <div className="flex justify-center mt-2">
              <button onClick={() => setShowSettings(false)} className="wow-button px-8 py-2 font-cinzel text-sm">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
