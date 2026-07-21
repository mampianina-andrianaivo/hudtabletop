import React, { useState } from 'react';
import { Settings, Plus, X, ArrowDown, Copy } from 'lucide-react';
import { useGMStore } from '@/store/useGMStore';
import { DiceRoller } from './DiceRoller';

export function GMEncounters() {
  const store = useGMStore();
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'result'>('actions');

  const handleCopy = () => {
    if (!store.currentDraw) return;
    const text = store.currentDraw.lines.map((line, idx) => 
      `#${idx + 1} ` + line.map(action => action.sub ? `${action.name} (+${action.sub})` : action.name).join(' → ')
    ).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleRollEncounter = (level: number) => {
    store.drawEncounters(level);
    setActiveTab('result');
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
      <div className="flex flex-row items-start justify-center gap-6 px-4 pt-6 pb-4">
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
          <div className="mt-2 font-cinzel font-bold text-wow-gold text-sm sm:text-base drop-shadow-md text-center">
            Roll Encounter
          </div>
        </div>
        
        <DiceRoller />
      </div>

      <div className="flex bg-[#1a110a] border-y border-[#5a4b3c]">
        <button 
          onClick={() => setActiveTab('actions')}
          className={`flex-1 py-2 font-cinzel text-sm text-center border-r border-[#5a4b3c] ${activeTab === 'actions' ? 'bg-[#3b2c19] text-wow-gold' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Actions List
        </button>
        <button 
          onClick={() => setActiveTab('result')}
          className={`flex-1 py-2 font-cinzel text-sm text-center ${activeTab === 'result' ? 'bg-[#3b2c19] text-wow-gold' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Draw Result
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
                <span className={`font-macondo text-lg ${enc.isEnabled ? 'text-white' : 'text-gray-500'}`}>
                  {enc.actionName}
                </span>
                {enc.isSub && (
                  <span className="ml-auto text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-900">SUB</span>
                )}
              </label>
            ))}
            {store.encounters.filter(e => e.actionName.trim()).length === 0 && (
              <div className="text-center text-gray-500 font-cinzel mt-4">No actions defined. Check settings.</div>
            )}
          </div>
        )}

        {activeTab === 'result' && store.currentDraw && (
          <div className="flex flex-col items-center gap-4 py-2">
            <h4 className="font-cinzel text-xl text-wow-gold border-b border-[#5a4b3c] px-4 pb-1">
              Level {store.currentDraw.level}
            </h4>
            
            <div className="flex flex-col items-center w-full gap-1">
              {store.currentDraw.lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  <div className="w-full bg-[#2b1d14] border border-[#5a4b3c] rounded p-1 flex flex-row gap-1 shadow-lg items-stretch justify-center"><div className="flex items-center justify-center min-w-10 px-1.5 shrink-0 font-cinzel text-wow-gold text-sm font-bold bg-[#1a110a] rounded border border-[#3b2c19]">#{lIdx + 1}</div>
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
                  </div>
                </React.Fragment>
              ))}
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
                onClick={() => store.publishDraw()}
                
                className={`wow-button font-cinzel text-sm w-32 h-10 ${store.currentDraw.published ? "!bg-green-800/80 !border-green-700 !text-white" : ""}`}
              >
                {store.currentDraw.published ? 'Published' : 'Publish'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'result' && !store.currentDraw && (
          <div className="text-center text-gray-500 font-cinzel mt-10">
            No draw result yet. Roll an encounter!
          </div>
        )}
      </div>

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
                  <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
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
