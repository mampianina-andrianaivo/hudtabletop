import React, { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, ShoppingBag, Check } from 'lucide-react';
import { usePlayerStore, Spell } from '@/store/usePlayerStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useGMStore } from '@/store/useGMStore';
import { RenderGMIcon, getAbilityTagClass } from './GMIcons';
import { cn, parseMpCost } from '@/lib/utils';

export function RenderSpellIcon({ icon, size = 18, color }: { icon: string, size?: number, color?: string }) {
  if (!icon) return null;
  const isEmoji = icon.length <= 2;
  return (
    <div className="w-7 h-7 rounded border border-[#5a4b3c] bg-black/60 flex items-center justify-center shrink-0 mx-auto overflow-hidden shadow-sm">
      {isEmoji ? (
        <span style={{ fontSize: `${size}px` }}>{icon}</span>
      ) : (
        <RenderGMIcon iconName={icon} size={size} color={color} />
      )}
    </div>
  );
}

interface SpellBookProps {
  spells?: Spell[];
  readOnly?: boolean;
  targetModeProps?: {
    isSelectingTarget: boolean;
    selectedTargetId: string | null;
    onSelectTarget: (spell: Spell) => void;
    onLaunchRoll?: () => void;
    playerMp?: number;
    playerHp?: number;
    hasMP?: boolean;
    isConnected?: boolean;
  };
}

export function SpellBook({ spells, readOnly, targetModeProps }: SpellBookProps) {
  const store = usePlayerStore();
  const mpStore = useMultiplayerStore();
  const gmStore = useGMStore();

  const [showShop, setShowShop] = useState(false);
  const [spellToDelete, setSpellToDelete] = useState<string | null>(null);
  const [spellDetailsId, setSpellDetailsId] = useState<string | null>(null);
  const [shopSpellDetailsId, setShopSpellDetailsId] = useState<string | null>(null);

  const activeSpells = spells || store.spells;
  const detailedSpell = activeSpells.find(s => s.id === spellDetailsId);

  const shopSpells = mpStore.isConnected 
    ? (mpStore.shopSpells || []) 
    : gmStore.shopSpells;
  const detailedShopSpell = shopSpells.find(s => s.id === shopSpellDetailsId);

  const isFreeEdit = mpStore.isConnected ? mpStore.isFreeEdit : true;
  const isFreeShop = mpStore.isConnected ? mpStore.isFreeShop : true;

  return (
    <div className="flex flex-col h-full bg-black/40 border-2 border-[#5a4b3c] rounded p-2 relative shadow-md">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-[#5a4b3c]/20 shrink-0 h-9">
        <h3 className="font-cinzel text-wow-gold text-sm uppercase tracking-widest">Grimoire</h3>
        {!readOnly && (
          <div className="flex gap-1.5 items-center">
            <button 
              onClick={() => setShowShop(true)}
              className="wow-button text-[10px] sm:text-xs py-1 px-3 flex items-center justify-center gap-1.5 h-7"
            >
              <ShoppingBag size={12} />
              <span>ABILITY SHOP</span>
            </button>
          </div>
        )}
      </div>

      {/* ABILITIES LIST */}
      <div className="flex-1 overflow-y-scroll custom-scrollbar pr-2">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-[10px] text-white font-cinzel tracking-wider border-b border-[#5a4b3c]/50">
            <tr>
              <th className="pb-1 w-6"></th>
              <th className="pb-1 w-9 text-center"></th>
              <th className="pb-1 pl-2 pr-1 w-full">Ability</th>
              <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-8">D</th>
              <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-8 text-blue-400">MP</th>
              <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-24">Uses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#5a4b3c]/30">
            {activeSpells.map((spell, index) => {
              const rawMp = (spell.r2 || spell.r1 || '').trim();
              const isMpNumeric = /\d+/.test(rawMp);
              const mpCost = parseMpCost(rawMp);

              const isTargeting = targetModeProps?.isSelectingTarget;
              const isSelected = targetModeProps?.selectedTargetId === spell.id;

              // Targeting eligibility checks
              const hasNumericDice = /\d+/.test((spell.dice || '').trim());
              const cleanMax = (spell.maxUses || '').trim();
              const maxMatch = cleanMax.match(/\d+/);
              const isNumericMax = maxMatch !== null && parseInt(maxMatch[0], 10) > 0;
              const isOutOfUses = isNumericMax && spell.uses <= 0;

              const playerMp = targetModeProps?.playerMp ?? 0;
              const playerHp = targetModeProps?.playerHp ?? 0;

              const lacksMp = isMpNumeric && mpCost > 0 && playerMp < mpCost;
              const cannotAfford = lacksMp && playerHp <= 0;

              const canTarget = Boolean(
                isTargeting &&
                !spell.isDisabled &&
                !spell.isBlocked &&
                hasNumericDice &&
                !isOutOfUses &&
                !cannotAfford
              );

              const useHpMode = lacksMp;

              return (
                <tr key={spell.id} className={`h-12 transition-colors font-sans group ${spell.isBlocked ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                  <td className="py-2 w-6">
                    {!readOnly && (
                      <div className="flex flex-col items-center justify-center h-8">
                        <button disabled={index === 0} onClick={() => store.moveSpell(index, 'up')} className="text-gray-400 hover:text-white disabled:opacity-30 !cursor-pointer flex items-center justify-center p-0.5"><ChevronUp size={12}/></button>
                        <button disabled={index === activeSpells.length - 1} onClick={() => store.moveSpell(index, 'down')} className="text-gray-400 hover:text-white disabled:opacity-30 !cursor-pointer flex items-center justify-center p-0.5"><ChevronDown size={12}/></button>
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-center w-9">
                    <button onClick={() => setSpellDetailsId(spell.id)} className="hover:scale-105 transition-transform">
                      <RenderSpellIcon icon={spell.icon} size={16} color={spell.color} />
                    </button>
                  </td>
                  <td className="py-2 pl-2 pr-1 relative">
                    <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                      <button 
                        onClick={() => setSpellDetailsId(spell.id)} 
                        className="text-left flex items-center gap-1.5 hover:text-wow-gold transition-colors cursor-pointer min-w-0 truncate"
                        title="View ability details"
                      >
                        <span className="truncate font-macondo text-[11px] sm:text-[13px]">{spell.name}</span>
                        {spell.tag && (
                          <span className={cn("shrink-0 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-sans font-semibold backdrop-blur-[1px] leading-none border", getAbilityTagClass(spell.color))}>
                            {spell.tag}
                          </span>
                        )}
                      </button>

                      {canTarget && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => targetModeProps?.onSelectTarget(spell)}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-cinzel tracking-wider uppercase transition-colors cursor-pointer select-none border shrink-0",
                              isSelected
                                ? "bg-green-950/80 text-green-300 border-green-800 hover:bg-green-900 hover:text-white"
                                : useHpMode
                                  ? "bg-red-950/80 text-red-400 border-red-800 hover:bg-red-900 hover:text-white"
                                  : "bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900 hover:text-white"
                            )}
                          >
                            {useHpMode ? "USE HP" : "TARGET"}
                          </button>

                          <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  targetModeProps?.onLaunchRoll?.();
                                }}
                                className="w-full h-full rounded bg-green-800 hover:bg-green-700 text-white border border-green-600 transition-colors flex items-center justify-center cursor-pointer"
                                title="Roll D12 now!"
                              >
                                <Check size={14} className="stroke-[3]" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1 text-xs">{spell.dice}</td>
                  <td className="py-2 text-blue-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1 text-xs">{spell.r2 || spell.r1 || ''}</td>
                  <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1 text-xs">
                    {/^\d+$/.test((spell.maxUses || '').trim()) ? `${spell.uses} / ${spell.maxUses}` : spell.maxUses}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {activeSpells.length === 0 && (
          <div className="text-center text-gray-500 py-4 font-cinzel text-xs">
            Grimoire is empty.
          </div>
        )}
      </div>

      {/* ABILITY SHOP MODAL */}
      {showShop && (
        <div className="absolute -inset-[2px] bg-black/95 z-40 rounded flex flex-col animate-in fade-in zoom-in-95 duration-200 border-2 border-[#5a4b3c] shadow-xl p-2">
          {/* SHOP HEADER */}
          <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-[#5a4b3c]/20 shrink-0 h-9">
            <h3 className="font-cinzel text-wow-gold text-sm uppercase tracking-widest">Ability Shop</h3>
            <button 
              onClick={() => setShowShop(false)} 
              className="wow-button text-[10px] sm:text-xs py-1 px-3 flex items-center justify-center gap-1.5 h-7"
            >
              <span>CLOSE SHOP</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-scroll custom-scrollbar pr-2">
            <table className="w-full text-sm text-left table-fixed">
              <thead className="text-[10px] text-white font-cinzel tracking-wider border-b border-[#5a4b3c]/50">
                <tr>
                  <th className="pb-1 w-6"></th>
                  <th className="pb-1 w-9 text-center"></th>
                  <th className="pb-1 pl-2 pr-1 w-full">Ability</th>
                  <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-8">D</th>
                  <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-8 text-blue-400">MP</th>
                  <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-24">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#5a4b3c]/30">
                {shopSpells.map((shopSpell) => {
                  const isAcquired = store.spells.some(s => s.id === shopSpell.id || s.name.toLowerCase() === shopSpell.name.toLowerCase());
                  return (
                    <tr key={shopSpell.id} className={`h-12 transition-colors font-sans group ${shopSpell.isBlocked ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                      <td className="py-2 w-6 text-center">
                        <div className="flex items-center justify-center h-8">
                          {isAcquired && (
                            <span title="Acquired">
                              <Check size={14} className="text-green-400 mx-auto stroke-[2.5]" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-center w-9">
                        <button onClick={() => setShopSpellDetailsId(shopSpell.id)} className="hover:scale-105 transition-transform">
                          <RenderSpellIcon icon={shopSpell.icon} size={16} color={shopSpell.color} />
                        </button>
                      </td>
                      <td className="py-2 pl-2 pr-1">
                        <button 
                          onClick={() => setShopSpellDetailsId(shopSpell.id)} 
                          className="text-left w-full flex items-center gap-1.5 hover:text-wow-gold transition-colors cursor-pointer min-w-0"
                        >
                          <span className="truncate font-macondo text-[11px] sm:text-[13px]">{shopSpell.name}</span>
                          {shopSpell.tag && (
                            <span className={cn("shrink-0 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-sans font-semibold backdrop-blur-[1px] leading-none border", getAbilityTagClass(shopSpell.color))}>
                              {shopSpell.tag}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1 text-xs">{shopSpell.dice}</td>
                      <td className="py-2 text-blue-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1 text-xs">{shopSpell.r2 || shopSpell.r1 || ''}</td>
                      <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1 text-xs">{shopSpell.maxUses}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shopSpells.length === 0 && (
              <div className="text-center text-gray-500 py-4 font-cinzel text-xs">
                No abilities available in shop.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHOP ABILITY DETAILS */}
      {detailedShopSpell && (
        <div className="absolute -inset-[2px] bg-black/95 z-50 rounded flex flex-col p-4 animate-in fade-in duration-200 border-2 border-[#5a4b3c] overflow-y-auto custom-scrollbar">
          <h4 className="font-cinzel text-wow-gold text-base text-center mb-3">Ability Details</h4>

          <div className="flex gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-cinzel text-white mb-1">Icon</label>
              <div className="w-10 h-10 wow-button rounded flex items-center justify-center shadow-md">
                <RenderSpellIcon icon={detailedShopSpell.icon} size={20} color={detailedShopSpell.color} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-cinzel text-white mb-1">Name</label>
              <div className="wow-input w-full p-2 bg-black/60 border border-wow-gold/30 font-macondo text-xs font-bold text-wow-gold truncate">
                {detailedShopSpell.name}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-cinzel text-white mb-1">Tag (Golden Label)</label>
              <div className="wow-input w-full p-1.5 bg-black/60 border border-wow-gold/30 text-xs text-wow-gold flex items-center truncate min-h-[34px]">
                {detailedShopSpell.tag ? (
                  <span className={cn("shrink-0 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-sans font-semibold backdrop-blur-[1px] leading-none border", getAbilityTagClass(detailedShopSpell.color))}>
                    {detailedShopSpell.tag}
                  </span>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 bg-black/40 p-2 rounded border border-[#5a4b3c]/30 text-center text-xs">
            <div>
              <label className="block text-[10px] font-cinzel text-gray-400 mb-1">DICE</label>
              <div className="wow-input w-full p-1.5 text-center font-mono font-bold text-white bg-black/60 border border-wow-gold/30 text-xs rounded">
                {detailedShopSpell.dice || '-'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-cinzel text-blue-400 mb-1">MP COST</label>
              <div className="wow-input w-full p-1.5 text-center font-mono font-bold text-blue-400 bg-black/60 border border-wow-gold/30 text-xs rounded">
                {detailedShopSpell.r2 || detailedShopSpell.r1 || '0'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-cinzel text-gray-400 mb-1">MAX USES</label>
              <div className="wow-input w-full p-1.5 text-center font-mono font-bold text-white bg-black/60 border border-wow-gold/30 text-xs rounded">
                {detailedShopSpell.maxUses || '-'}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col mb-3 min-h-0">
            <label className="block text-[10px] font-cinzel text-white mb-1">Description</label>
            <div className="wow-input w-full p-2 flex-1 overflow-y-auto whitespace-pre-wrap bg-black/60 border border-wow-gold/30 text-xs text-gray-300 custom-scrollbar rounded">
              {detailedShopSpell.description || "No description provided."}
            </div>
          </div>
          
          <div className="flex gap-2 shrink-0 pt-1">
            {(() => {
              const alreadyHave = store.spells.some(s => s.name.toLowerCase() === detailedShopSpell.name.toLowerCase());
              if (alreadyHave) {
                return <button disabled className="wow-button flex-1 opacity-50 py-2 text-xs text-center truncate">ALREADY OWNED</button>;
              }

              const expIdx = store.resources.findIndex(r => r.name === 'EXP');
              const has3Exp = expIdx !== -1 && store.resources[expIdx].current >= 3;
              const isWaitingSpell = mpStore.gmRequests?.some(r => r.joinCode === mpStore.joinCode && r.type === 'ask_spell' && r.spellName === detailedShopSpell.name);
              const canBuy = (isFreeShop || has3Exp) && !isWaitingSpell;

              return (
                <button 
                  disabled={!canBuy}
                  onClick={async () => {
                    if (isFreeShop || !mpStore.isConnected) {
                      if (!isFreeShop) {
                        store.updateResource(expIdx, { current: Math.max(0, store.resources[expIdx].current - 3) });
                      }
                      const cleanMax = (detailedShopSpell.maxUses || '').trim();
                      store.addSpell({
                        ...detailedShopSpell,
                        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
                        uses: /^\d+$/.test(cleanMax) ? parseInt(cleanMax, 10) : 0,
                      });
                    } else {
                      const { db } = await import('@/lib/firebase');
                      const { updateDoc, arrayUnion, doc } = await import('firebase/firestore');
                      if (db && mpStore.roomName) {
                        const myName = mpStore.pseudo || store.name || 'Player';
                        const { sendOnlineRoll } = await import('@/lib/useOnlineSync');
                        await sendOnlineRoll({
                          text: `${myName} requested ability "${detailedShopSpell.name}" from the GM`,
                          type: 'info',
                          playerName: myName
                        });
                        await updateDoc(doc(db, 'rooms', mpStore.roomName.trim().toLowerCase()), {
                          gmRequests: arrayUnion({ 
                            type: 'ask_spell', 
                            spellName: detailedShopSpell.name,
                            spell: detailedShopSpell,
                            from: myName, 
                            joinCode: mpStore.joinCode, 
                            isFreeEdit: isFreeShop, 
                            ts: Date.now() 
                          })
                        });
                      }
                    }
                    setShopSpellDetailsId(null);
                  }}
                  className={cn(
                    "px-4 py-2 text-xs rounded flex-1 font-cinzel font-bold transition-all whitespace-nowrap",
                    isWaitingSpell ? "bg-yellow-900/50 text-yellow-500 border border-yellow-700 cursor-not-allowed" :
                    canBuy ? "wow-button-green" : "wow-button text-white border-gray-700 cursor-not-allowed opacity-50"
                  )}
                >
                  {isWaitingSpell ? "WAITING GM..." : (isFreeShop ? "BUY (FREE)" : (has3Exp ? "BUY (3 EXP)" : "NEED 3 EXP"))}
                </button>
              );
            })()}
            <button onClick={() => setShopSpellDetailsId(null)} className="wow-button px-6 py-2 text-xs rounded flex-1">BACK</button>
          </div>
        </div>
      )}

      {/* OWNED ABILITY DETAILS */}
      {detailedSpell && !showShop && (
        <div className="absolute -inset-[2px] bg-black/95 z-50 rounded flex flex-col p-4 animate-in fade-in duration-200 border-2 border-[#5a4b3c] overflow-y-auto custom-scrollbar">
          <h4 className="font-cinzel text-wow-gold text-base text-center mb-3">Ability Details</h4>

          <div className="flex gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-cinzel text-white mb-1">Icon</label>
              <div className="w-10 h-10 wow-button rounded flex items-center justify-center shadow-md">
                <RenderSpellIcon icon={detailedSpell.icon} size={20} color={detailedSpell.color} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-cinzel text-white mb-1">Name</label>
              <div className="wow-input w-full p-2 bg-black/60 border border-wow-gold/30 font-macondo text-xs font-bold text-wow-gold truncate">
                {detailedSpell.name}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-cinzel text-white mb-1">Tag (Golden Label)</label>
              <div className="wow-input w-full p-1.5 bg-black/60 border border-wow-gold/30 text-xs text-wow-gold flex items-center truncate min-h-[34px]">
                {detailedSpell.tag ? (
                  <span className={cn("shrink-0 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-sans font-semibold backdrop-blur-[1px] leading-none border", getAbilityTagClass(detailedSpell.color))}>
                    {detailedSpell.tag}
                  </span>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 bg-black/40 p-2 rounded border border-[#5a4b3c]/30 text-center text-xs">
            <div>
              <label className="block text-[10px] font-cinzel text-gray-400 mb-1">DICE</label>
              <div className="wow-input w-full p-1.5 text-center font-mono font-bold text-white bg-black/60 border border-wow-gold/30 text-xs rounded">
                {detailedSpell.dice || '-'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-cinzel text-blue-400 mb-1">MP COST</label>
              <div className="wow-input w-full p-1.5 text-center font-mono font-bold text-blue-400 bg-black/60 border border-wow-gold/30 text-xs rounded">
                {detailedSpell.r2 || detailedSpell.r1 || '0'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-cinzel text-gray-400 mb-1">MAX USES / USES</label>
              <div className="wow-input w-full p-1.5 text-center font-mono font-bold text-white bg-black/60 border border-wow-gold/30 text-xs rounded">
                {/^\d+$/.test((detailedSpell.maxUses || '').trim()) ? `${detailedSpell.uses} / ${detailedSpell.maxUses}` : detailedSpell.maxUses}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col mb-3 min-h-0">
            <label className="block text-[10px] font-cinzel text-white mb-1">Description</label>
            <div className="wow-input w-full p-2 flex-1 overflow-y-auto whitespace-pre-wrap bg-black/60 border border-wow-gold/30 text-xs text-gray-300 custom-scrollbar rounded">
              {detailedSpell.description || "No description provided."}
            </div>
          </div>

          <div className="flex gap-2 shrink-0 pt-1">
             {!readOnly && isFreeEdit && (
               <button onClick={() => { setSpellToDelete(detailedSpell.id); setSpellDetailsId(null); }} className="wow-button bg-red-900/50 text-red-500 px-4 py-2 flex items-center justify-center"><Trash2 size={16}/></button>
             )}
             <button onClick={() => setSpellDetailsId(null)} className="wow-button px-6 py-2 text-xs rounded flex-1">CLOSE</button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {spellToDelete && (
        <div className="absolute -inset-[2px] bg-black/95 z-[60] flex flex-col items-center justify-center p-4 rounded border-2 border-[#5a4b3c]">
           <h3 className="text-red-500 font-cinzel mb-4">Delete Ability?</h3>
           <div className="flex gap-4">
             <button onClick={() => setSpellToDelete(null)} className="wow-button px-4 py-2">CANCEL</button>
             <button onClick={() => { store.removeSpell(spellToDelete); setSpellToDelete(null); }} className="wow-button bg-red-900/50 text-white px-4 py-2 border-red-500">DELETE</button>
           </div>
        </div>
      )}
    </div>
  );
}
