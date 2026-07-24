const fs = require('fs');
const content = fs.readFileSync('src/pages/GMView.tsx', 'utf8');

let newContent = content.replace(
  "const pStore = usePlayerStore.getState();",
  "const pStore = usePlayerStore.getState();" // Just checking if it exists
);

if (!newContent.includes("const pStore = usePlayerStore();")) {
  newContent = newContent.replace(
    "const mpStore = useMultiplayerStore();",
    "const mpStore = useMultiplayerStore();\n  const pStore = usePlayerStore();"
  );
}

if (!newContent.includes("ZoomIn,")) {
  newContent = newContent.replace(
    "import { Home, Wifi, WifiOff, Upload, Download, Users, User, FileText, Swords, Sword, Dices, X, Copy, Check, Lock, ShieldAlert, Sparkles, Eye, EyeOff, Power } from 'lucide-react';",
    "import { Home, Wifi, WifiOff, Upload, Download, Users, User, FileText, Swords, Sword, Dices, X, Copy, Check, Lock, ShieldAlert, Sparkles, Eye, EyeOff, Power, ZoomIn, ZoomOut } from 'lucide-react';"
  );
}

const startMarker = "// READ-ONLY PLAYER HUD MODE FOR THE GM - MATCHING THE PLAYER'S ORIGINAL HUD LAYOUT";
const endMarker = "// NORMAL GM DRAWER VIEW";

const startIndex = newContent.indexOf(startMarker);
const endIndex = newContent.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log("Markers not found");
  process.exit(1);
}

// Find the last closing tag before the end marker
const sliceToReplace = newContent.substring(startIndex, endIndex);

const replacement = `// READ-ONLY PLAYER HUD MODE FOR THE GM - MATCHING THE PLAYER'S ORIGINAL HUD LAYOUT
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
              <div className="flex items-center justify-center gap-2 w-full border-b border-[#5a4b3c]/20 pb-1.5 mb-1.5 shrink-0 flex-wrap">
                <button 
                  onClick={() => pStore.decreaseTextSize()}
                  className="wow-button p-1 text-wow-gold hover:text-white"
                  title="Decrease text size"
                >
                  <ZoomOut size={14} />
                </button>

                <div className="flex gap-0.5 items-center shrink-0">
                  <button 
                    onClick={() => pStore.decreasePhotoHeight?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                  >
                    <User size={10} />-
                  </button>
                  <button 
                    onClick={() => pStore.increasePhotoHeight?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                  >
                    <User size={10} />+
                  </button>
                </div>

                <button 
                  disabled
                  className="px-2.5 py-0.5 text-[10px] flex items-center justify-center gap-1 uppercase tracking-wider font-cinzel transition-all w-[130px] wow-button text-wow-gold opacity-30 cursor-not-allowed"
                  title="Disabled for GM"
                >
                  <Sparkles size={12} /> ASK FOR STAT
                </button>

                <div className="flex gap-0.5 items-center shrink-0">
                  <button 
                    onClick={() => pStore.decreaseBarHeight?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                  >
                    <FileText size={10} />-
                  </button>
                  <button 
                    onClick={() => pStore.increaseBarHeight?.()}
                    className="wow-button px-1 py-0.5 text-wow-gold hover:text-white flex items-center gap-0.5 text-[10px] font-mono h-[22px]"
                  >
                    <FileText size={10} />+
                  </button>
                </div>

                <button 
                  onClick={() => pStore.increaseTextSize()}
                  className="wow-button p-1 text-wow-gold hover:text-white"
                >
                  <ZoomIn size={14} />
                </button>
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
                    className="w-20 sm:w-24 rounded border-2 overflow-hidden bg-wow-dark shadow-[0_0_15px_rgba(0,0,0,0.8)] relative shrink-0 transition-all select-none outline-none border-red-600 opacity-90 cursor-not-allowed"
                    style={{ height: \`\${pStore.photoHeight ?? 96}px\` }}
                  >
                    {activeCharState.photo ? (
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
                    // Compute activeResources the exact same way as PlayerView
                    const rawResources = activeCharState.resources || [];
                    const fixedStats = FIXED_STATS_NAMES.map((name, i) => ({
                      name, current: (activeCharState.stats?.[i] || { current: 0 }).current
                    }));
                    const sortedStats = [...fixedStats].sort((a, b) => a.current - b.current);
                    const computedMpMax = sortedStats[0].current + sortedStats[1].current;
                    const res = [
                      { ...rawResources[0], name: 'HP', color: 'red', isVisible: true, max: '3' },
                      { ...rawResources[1], name: 'MP', color: 'blue', isVisible: true, max: String(computedMpMax) },
                      { ...rawResources[2], name: 'EXP', color: 'purple', isVisible: true, max: '3' }
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
            `;

newContent = newContent.replace(sliceToReplace, replacement);
fs.writeFileSync('src/pages/GMView.tsx', newContent);
console.log("Done patching GMView.tsx");
