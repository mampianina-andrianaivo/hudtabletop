import React, { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, Lock, ShoppingBag, Upload, X } from 'lucide-react';
import { usePlayerStore, Spell } from '@/store/usePlayerStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useGMStore } from '@/store/useGMStore';
import { RenderGMIcon } from './GMIcons';

export function RenderSpellIcon({ icon, size = 18 }: { icon: string, size?: number }) {
  if (!icon) return null;
  const isEmoji = icon.length <= 2;
  if (isEmoji) {
    return <span style={{ fontSize: `${size}px` }}>{icon}</span>;
  }
  return <RenderGMIcon iconName={icon} size={size} />;
}

import { cn, parseMpCost } from '@/lib/utils';

interface SpellBookProps {
  spells?: Spell[];
  readOnly?: boolean;
  targetModeProps?: {
    isSelectingTarget: boolean;
    selectedTargetId: string | null;
    onSelectTarget: (spell: Spell) => void;
    playerMp?: number;
    playerHp?: number;
    hasMP?: boolean;
    isConnected?: boolean;
  };
}

export function SpellBook({ spells, readOnly, targetModeProps }: SpellBookProps) {
  const store = usePlayerStore();
  const mpStore = useMultiplayerStore();
  const [showShop, setShowShop] = useState(false);
  const [spellToDelete, setSpellToDelete] = useState<string | null>(null);
  const [spellDetailsId, setSpellDetailsId] = useState<string | null>(null);
  const [shopSpellDetailsId, setShopSpellDetailsId] = useState<string | null>(null);

  const activeSpells = spells || store.spells;
  const detailedSpell = activeSpells.find(s => s.id === spellDetailsId);

  // Retrieve available shop spells
  const shopSpells = mpStore.isConnected 
    ? (mpStore.shopSpells || []) 
    : useGMStore.getState().shopSpells;

  const detailedShopSpell = shopSpells.find(s => s.id === shopSpellDetailsId);

  const handleImportShopJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const spellsToLoad = Array.isArray(parsed) ? parsed : (parsed.shopSpells || parsed.spells || []);
        if (Array.isArray(spellsToLoad)) {
          useGMStore.getState().loadShopSpells(spellsToLoad);
        }
      } catch (err) {
        console.error("Error loading shop JSON", err);
      }
    };
    reader.readAsText(file);
  };

  const gmStore = useGMStore();
  const isFreeEdit = mpStore.isConnected ? mpStore.isFreeEdit : true;

  return (
    <div className="flex flex-col h-full bg-black/40 border border-[#5a4b3c] rounded p-2 relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-[#5a4b3c]/20 shrink-0 h-9">
        <h3 className="font-cinzel text-wow-gold text-sm uppercase tracking-widest">Grimoire</h3>
        {!readOnly && (
          <div className="flex gap-1.5 items-center">
            {!mpStore.isConnected && (
              <label className="wow-button px-2.5 h-7 text-[10px] flex items-center gap-1 cursor-pointer justify-center">
                <Upload size={12} />
                <span>LOAD SHOP</span>
                <input type="file" accept=".json" className="hidden" onChange={handleImportShopJSON} />
              </label>
            )}
            <button 
              onClick={() => setShowShop(true)}
              className={cn(
                "w-24 h-7 text-[10px] flex items-center justify-center gap-1 shrink-0 font-bold transition-all",
                isFreeEdit 
                  ? "wow-button-green"
                  : "wow-button text-wow-gold"
              )}
            >
              <ShoppingBag size={12} />
              <span>OPEN SHOP</span>
            </button>
          </div>
        )}
      </div>

      {/* GRIMOIRE TABLE (ACTIVE SPELLS) */}
      <div className="flex-1 overflow-y-scroll custom-scrollbar">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-xs text-white font-cinzel border-b border-[#5a4b3c]">
            <tr>
              <th className="pb-2 w-10 text-center">Icon</th>
              <th className="pb-2 w-6"></th>
              <th className="pb-2 pl-3 pr-2 w-full">Name</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-10">D</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-12">MP</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 pl-1 w-20">Uses</th>
            </tr>
          </thead>
          <tbody>
            {activeSpells.map((spell, index) => (
              <tr key={spell.id} className={`border-b border-[#3b2c19] transition-colors font-sans group ${spell.isDisabled ? 'opacity-40 grayscale' : ''}`}>
                <td className="py-2 text-center">
                  <button 
                    onClick={() => setSpellDetailsId(spell.id)}
                    className="wow-button rounded p-1 w-8 h-8 flex items-center justify-center text-lg focus:outline-none shadow-sm cursor-pointer mx-auto"
                    title="View details"
                  >
                    <RenderSpellIcon icon={spell.icon} size={18} />
                  </button>
                </td>
                <td className="py-1">
                  {!readOnly ? (
                    <div className="flex flex-col items-center justify-center">
                      <button 
                        onClick={() => store.moveSpell(index, 'up')}
                        className="p-0.5 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center h-4"
                        disabled={index === 0}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button 
                        onClick={() => store.moveSpell(index, 'down')}
                        className="p-0.5 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center h-4"
                        disabled={index === activeSpells.length - 1}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center font-mono text-[10px] text-gray-500">-</div>
                  )}
                </td>
                <td className="py-2 pl-3 font-macondo text-white pr-2 truncate">
                  <div className="flex items-center gap-2">
                    {targetModeProps?.isSelectingTarget ? (
                      (() => {
                        const mpCost = parseMpCost(spell.r2 ?? spell.r1);
                        const cleanMax = (spell.maxUses || '').trim();
                        const isMaxNumeric = /^\d+$/.test(cleanMax);
                        const hasNoUses = isMaxNumeric && spell.uses <= 0;
                        const playerMp = targetModeProps.playerMp ?? 0;
                        const playerHp = targetModeProps.playerHp ?? 0;
                        const isScratch = !targetModeProps.isConnected;
                        const needsHpInsteadOfMp = mpCost > 0 && playerMp < mpCost;
                        const hasNoResourceLeft = !isScratch && mpCost > 0 && playerMp < mpCost && playerHp <= 0;
                        const isSpellDisabled = spell.isDisabled || (hasNoUses && !isScratch) || hasNoResourceLeft;
                        return (
                          <button
                            disabled={isSpellDisabled}
                            onClick={() => targetModeProps.onSelectTarget(spell)}
                            className={cn(
                              "font-macondo rounded px-1.5 py-0.5 border text-left transition-all duration-200 truncate select-none flex items-center gap-1",
                              isSpellDisabled
                                ? "bg-gray-900/90 text-gray-600 border-gray-800 opacity-40 cursor-not-allowed"
                                : targetModeProps.selectedTargetId === spell.id
                                ? "bg-green-600 text-white border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.9)] font-bold cursor-pointer"
                                : needsHpInsteadOfMp
                                ? "bg-amber-950/80 text-amber-200 border-amber-800 hover:bg-amber-900 hover:text-white cursor-pointer"
                                : "bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900 hover:text-white cursor-pointer"
                            )}
                          >
                            {needsHpInsteadOfMp && (
                              <span className="text-amber-400 font-bold text-[10px] tracking-tight bg-amber-950/90 border border-amber-600/50 px-1 rounded shrink-0">
                                [HP]
                              </span>
                            )}
                            <span className="truncate">{spell.name}</span>
                          </button>
                        );
                      })()
                    ) : (
                      <span className="truncate border border-transparent px-1.5 py-0.5">{spell.name}</span>
                    )}
                    {spell.tag && (
                      <span className="font-cinzel text-[10px] text-wow-gold border border-wow-gold/30 bg-wow-gold/10 px-1 py-0.5 rounded shadow-sm leading-none drop-shadow-md shrink-0">
                        {spell.tag}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1">{spell.dice}</td>
                <td className="py-2 text-blue-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1">{spell.r2 ?? spell.r1 ?? ''}</td>
                <td className="py-2 border-l border-[#5a4b3c]/50 pl-2">
                  {!readOnly && isFreeEdit ? (
                    (() => {
                      const cleanMax = (spell.maxUses || '').trim();
                      const isMaxNumeric = /^\d+$/.test(cleanMax);
                      if (isMaxNumeric) {
                        return (
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => store.updateSpellUses(spell.id, -1)} 
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-w-[1.5rem]"
                              disabled={spell.isDisabled}
                            >
                              -
                            </button>
                            <span className="font-mono text-wow-gold w-4 text-center select-none">{spell.uses}</span>
                            <button 
                              onClick={() => store.updateSpellUses(spell.id, 1)} 
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-w-[1.5rem]"
                              disabled={spell.isDisabled}
                            >
                              +
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-center font-mono text-wow-gold text-xs px-1 truncate max-w-[4rem]" title={spell.maxUses}>
                            {spell.maxUses}
                          </div>
                        );
                      }
                    })()
                  ) : (
                    <div className="text-center font-mono text-wow-gold text-xs">
                      {/^\d+$/.test((spell.maxUses || '').trim()) ? `${spell.uses} / ${spell.maxUses}` : spell.maxUses}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {activeSpells.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-white/50 font-cinzel text-sm">
                  Grimoire is empty. Load from shop.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete spell confirmation pop-up */}
      {spellToDelete && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[60] rounded">
          <div className="bg-wow-dark border-2 border-red-900/60 p-5 rounded shadow-2xl max-w-xs w-full mx-4 text-center">
            <h4 className="font-cinzel text-red-500 mb-2 text-lg">Delete spell?</h4>
            <p className="font-sans text-gray-300 mb-6 text-sm">
              Are you sure you want to permanently delete this spell from your spellbook?
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => { store.removeSpell(spellToDelete); setSpellToDelete(null); }}
                className="wow-button text-sm px-4 py-2 text-red-400 flex items-center justify-center font-bold"
              >
                DELETE
              </button>
              <button 
                onClick={() => setSpellToDelete(null)}
                className="wow-button text-sm px-4 py-2 flex items-center justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed view of spell with parameters and disable toggle */}
      {detailedSpell && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded">
          <div className="bg-wow-dark border-2 border-[#5a4b3c] p-6 rounded shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center relative">
            <button 
              onClick={() => { setSpellToDelete(detailedSpell.id); setSpellDetailsId(null); }}
              className="absolute top-3 right-3 text-red-900 hover:text-red-500 transition-colors p-2 rounded hover:bg-red-950/30"
              title="Delete spell"
            >
              <Trash2 size={18} />
            </button>

            <div className="text-4xl mb-3 mt-2 bg-black/40 w-16 h-16 rounded-full flex items-center justify-center border border-[#5a4b3c]">
              <RenderSpellIcon icon={detailedSpell.icon} size={32} />
            </div>
            <h4 className="font-cinzel text-wow-gold mb-2 text-xl">{detailedSpell.name}</h4>
            
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {detailedSpell.dice && <span className="bg-[#3b2c19] text-gray-300 px-2 py-1 rounded text-xs font-mono border border-[#5a4b3c]">D{detailedSpell.dice}</span>}
              {detailedSpell.r1 && <span className="bg-red-950/50 text-red-400 px-2 py-1 rounded text-xs font-mono border border-red-900/50">R1: {detailedSpell.r1}</span>}
              {detailedSpell.r2 && <span className="bg-blue-950/50 text-blue-400 px-2 py-1 rounded text-xs font-mono border border-blue-900/50">R2: {detailedSpell.r2}</span>}
              {detailedSpell.r3 && <span className="bg-purple-950/50 text-purple-400 px-2 py-1 rounded text-xs font-mono border border-purple-900/50">R3: {detailedSpell.r3}</span>}
              {detailedSpell.r4 && <span className="bg-green-950/50 text-green-400 px-2 py-1 rounded text-xs font-mono border border-green-900/50">R4: {detailedSpell.r4}</span>}
              <span className="bg-purple-950/50 text-purple-300 px-2 py-1 rounded text-xs font-mono border border-purple-900/50">
                Uses: {/^\d+$/.test((detailedSpell.maxUses || '').trim()) ? `${detailedSpell.uses} / ${detailedSpell.maxUses}` : detailedSpell.maxUses}
              </span>
            </div>

            <p className="font-sans text-gray-300 mb-6 text-sm leading-relaxed whitespace-pre-wrap">
              {detailedSpell.description || "No description available for this spell."}
            </p>
            <div className="flex justify-center gap-4 w-full">
              {!readOnly && (
                <button 
                  onClick={() => { store.toggleSpellStatus(detailedSpell.id); setSpellDetailsId(null); }} 
                  className={`wow-button px-4 py-2 text-sm flex-1 ${detailedSpell.isDisabled ? 'opacity-50' : ''}`}
                >
                  {detailedSpell.isDisabled ? 'Enable' : 'Disable'}
                </button>
              )}
              <button 
                onClick={() => setSpellDetailsId(null)} 
                className="wow-button px-6 py-2 text-sm rounded flex-1"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADER / SHOP INTERFACE OVERLAY - EXACTLY THE SAME INTERFACE BUT SLIGHTLY DARKER BACKGROUND */}
      {showShop && (
        <div className="absolute inset-0 bg-[#0c0806]/98 flex flex-col justify-between z-50 rounded p-2">
          
          {/* Shop Header */}
          <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-[#5a4b3c]/20 shrink-0 h-9">
            <h3 className="font-cinzel text-wow-gold text-sm uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={14} />
              <span>Magic Shop</span>
            </h3>
            <button 
              onClick={() => setShowShop(false)} 
              className="wow-button w-24 h-7 text-[10px] flex items-center justify-center gap-1 shrink-0"
            >
              <X size={12} />
              <span>CLOSE</span>
            </button>
          </div>

          {/* Shop Spells Table - Identical layout & structure to Grimoire table */}
          <div className="flex-1 overflow-y-scroll custom-scrollbar">
            <table className="w-full text-sm text-left table-fixed">
              <thead className="text-xs text-white font-cinzel border-b border-[#5a4b3c]">
                <tr>
                  <th className="pb-2 w-10 text-center">Icon</th>
                  <th className="pb-2 w-6"></th>
                  <th className="pb-2 pl-3 pr-2 w-full">Name</th>
                  <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-10">D</th>
                  <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-12">MP</th>
                  <th className="pb-2 text-center border-l border-[#5a4b3c]/50 pl-1 w-20">Uses</th>
                </tr>
              </thead>
              <tbody>
                {shopSpells.map((shopSpell) => {
                  const alreadyHave = store.spells.some(s => s.name.toLowerCase() === shopSpell.name.toLowerCase());
                  return (
                    <tr key={shopSpell.id} className={`transition-colors font-sans group ${shopSpell.isBlocked ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                      <td className="py-2 text-center">
                        <button 
                          onClick={() => setShopSpellDetailsId(shopSpell.id)}
                          className="wow-button rounded p-1 w-8 h-8 flex items-center justify-center text-lg focus:outline-none shadow-sm cursor-pointer mx-auto"
                          title="View shop item details"
                        >
                          <RenderSpellIcon icon={shopSpell.icon} size={18} />
                        </button>
                      </td>
                      <td className="py-1 text-center">
                        {alreadyHave && (
                          <span className="text-green-500 font-bold text-sm" title="Owned">✓</span>
                        )}
                      </td>
                      <td className="py-2 pl-3 font-macondo text-white pr-2 truncate">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{shopSpell.name}</span>
                          {shopSpell.tag && (
                            <span className="font-cinzel text-[10px] text-wow-gold border border-wow-gold/30 bg-wow-gold/10 px-1 py-0.5 rounded shadow-sm leading-none drop-shadow-md shrink-0">
                              {shopSpell.tag}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1">{shopSpell.dice}</td>
                      <td className="py-2 text-blue-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1">{shopSpell.r2 ?? shopSpell.r1 ?? ''}</td>
                      <td className="py-2 border-l border-[#5a4b3c]/50 pl-2 text-center font-mono text-wow-gold">
                        {/^\d+$/.test((shopSpell.maxUses || '').trim()) ? `0 / ${shopSpell.maxUses}` : shopSpell.maxUses}
                      </td>
                    </tr>
                  );
                })}
                {shopSpells.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-white/40 font-cinzel text-xs">
                      The shop is empty. The GM has not added any spells yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHOP SPELL DETAILED VIEW POPUP (When clicked icon inside Magic Shop) */}
      {detailedShopSpell && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[60] rounded">
          <div className="bg-wow-dark border-2 border-[#5a4b3c] p-6 rounded shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center relative">
            <button 
              onClick={() => setShopSpellDetailsId(null)}
              className="absolute top-3 right-3 text-wow-gold hover:text-white transition-colors p-2 rounded"
              title="Close"
            >
              <X size={18} />
            </button>

            <div className="text-4xl mb-3 mt-2 bg-black/40 w-16 h-16 rounded-full flex items-center justify-center border border-[#5a4b3c]">
              <RenderSpellIcon icon={detailedShopSpell.icon} size={32} />
            </div>
            <h4 className="font-cinzel text-wow-gold mb-2 text-xl">{detailedShopSpell.name}</h4>
            
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {detailedShopSpell.dice && <span className="bg-[#3b2c19] text-gray-300 px-2 py-1 rounded text-xs font-mono border border-[#5a4b3c]">D{detailedShopSpell.dice}</span>}
              {detailedShopSpell.r1 && <span className="bg-red-950/50 text-red-400 px-2 py-1 rounded text-xs font-mono border border-red-900/50">R1: {detailedShopSpell.r1}</span>}
              {detailedShopSpell.r2 && <span className="bg-blue-950/50 text-blue-400 px-2 py-1 rounded text-xs font-mono border border-blue-900/50">R2: {detailedShopSpell.r2}</span>}
              {detailedShopSpell.r3 && <span className="bg-purple-950/50 text-purple-400 px-2 py-1 rounded text-xs font-mono border border-purple-900/50">R3: {detailedShopSpell.r3}</span>}
              {detailedShopSpell.r4 && <span className="bg-green-950/50 text-green-400 px-2 py-1 rounded text-xs font-mono border border-green-900/50">R4: {detailedShopSpell.r4}</span>}
              <span className="bg-purple-950/50 text-purple-300 px-2 py-1 rounded text-xs font-mono border border-purple-900/50">
                Uses: {/^\d+$/.test((detailedShopSpell.maxUses || '').trim()) ? `0 / ${detailedShopSpell.maxUses}` : detailedShopSpell.maxUses}
              </span>
            </div>

            <p className="font-sans text-gray-300 mb-6 text-sm leading-relaxed whitespace-pre-wrap">
              {detailedShopSpell.description || "No description available for this spell."}
            </p>
            <div className="flex justify-center gap-4 w-full">
              {detailedShopSpell.isBlocked ? (
                <div className="flex items-center justify-center gap-1.5 px-4 py-2 text-red-500 font-cinzel text-sm bg-red-950/20 border border-red-900/50 rounded w-full">
                  <Lock size={14} />
                  <span>LOCKED BY GM</span>
                </div>
              ) : store.spells.some(s => s.name.toLowerCase() === detailedShopSpell.name.toLowerCase()) ? (
                <div className="px-4 py-2 text-gray-400 font-cinzel text-sm bg-black/40 border border-[#5a4b3c]/30 rounded w-full">
                  ALREADY OWNED
                </div>
              ) : (() => {
                const expRes = store.resources.find(r => r.name === 'EXP');
                const has3Exp = expRes ? expRes.current >= 3 : false;
                const canBuy = isFreeEdit || has3Exp;

                return (
                  <button 
                    disabled={!canBuy}
                    onClick={async () => {
                      if (!mpStore.isConnected) {
                        if (!isFreeEdit) {
                          const expIdx = store.resources.findIndex(r => r.name === 'EXP');
                          if (expIdx !== -1) {
                            store.updateResource(expIdx, { current: Math.max(0, store.resources[expIdx].current - 3) });
                          }
                        }
                        const cleanMax = (detailedShopSpell.maxUses || '').trim();
                        const isNumeric = /^\d+$/.test(cleanMax);
                        const initialUses = isNumeric ? parseInt(cleanMax, 10) : 0;
                        store.addSpell({
                          ...detailedShopSpell,
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
                          uses: initialUses,
                        });
                      } else {
                        const { db } = await import('@/lib/firebase');
                        const { updateDoc, arrayUnion, doc } = await import('firebase/firestore');
                        if (db && mpStore.roomName) {
                          await updateDoc(doc(db, 'rooms', mpStore.roomName.trim().toLowerCase()), {
                            gmRequests: arrayUnion({ 
                              type: 'ask_spell', 
                              spellName: detailedShopSpell.name,
                              spell: detailedShopSpell,
                              from: mpStore.pseudo || store.name || 'Player', 
                              joinCode: mpStore.joinCode, 
                              isFreeEdit, 
                              ts: Date.now() 
                            })
                          });
                        }
                      }
                      setShopSpellDetailsId(null);
                    }}
                    className={cn(
                      "px-4 py-2 text-sm rounded flex-1 font-cinzel font-bold transition-all",
                      canBuy 
                        ? "wow-button-green" 
                        : "wow-button text-gray-500 border-gray-700 cursor-not-allowed opacity-50"
                    )}
                  >
                    {isFreeEdit ? "BUY (FREE)" : (has3Exp ? "BUY (3 EXP)" : "NEED 3 EXP")}
                  </button>
                );
              })()}
              <button 
                onClick={() => setShopSpellDetailsId(null)} 
                className="wow-button px-6 py-2 text-sm rounded flex-1"
              >
                BACK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
