import React, { useState } from 'react';
import { DownloadCloud, Upload, Plus, ChevronUp, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { useGMStore } from '@/store/useGMStore';
import { Spell } from '@/store/usePlayerStore';
import { IconPicker, RenderGMIcon, getAbilityTagClass } from './GMIcons';
import { RenderSpellIcon } from './SpellBook';
import { RenderSpellDice } from './RenderSpellDice';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn, evaluateSpellDice, renderMpDisplay } from '@/lib/utils';

export function GMSpellCrafter() {
  const store = useGMStore();
  const mpStore = useMultiplayerStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null);
  const [pendingShopSpells, setPendingShopSpells] = useState<Spell[] | null>(null);

  const handleExportShop = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.shopSpells, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "shop_abilities.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportShop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json) {
          alert("Fichier JSON vide.");
          return;
        }
        if (!Array.isArray(json)) {
          alert("Format invalide : Ce fichier est un JSON de Room/Campagne ou de Personnage. La boutique exige un fichier JSON de Shop (une liste d'aptitudes [ ]).");
          return;
        }
        setPendingShopSpells(json);
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Fichier JSON de shop invalide.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const openAddModal = () => {
    setEditingSpell({
      id: Date.now().toString(),
      icon: 'Sword', // default GM icon
      color: 'gold', // default yellow/gold
      name: 'New Ability',
      tag: '',
      description: '',
      dice: '1',
      r1: '',
      r2: '',
      r3: '',
      r4: '',
      uses: 0,
      maxUses: '1',
      isBlocked: false,
    });
    setShowAddModal(true);
  };

  return (
    <div className="flex flex-col h-full bg-black/40 border-2 border-[#5a4b3c] rounded p-2 relative shadow-md">
      <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-[#5a4b3c]/20 shrink-0 h-9">
        <h3 className="font-cinzel text-wow-gold text-sm uppercase tracking-widest">Ability Crafter</h3>
        <div className="flex gap-1.5 items-center">
          <button 
            onClick={async () => {
              const currentEdit = mpStore.isConnected ? mpStore.isFreeEdit : store.isFreeEdit;
              const currentShop = mpStore.isConnected ? mpStore.isFreeShop : store.isFreeShop;
              const nextShop = !currentShop;
              const nextEdit = nextShop ? false : currentEdit;
              store.setIsFreeShop(nextShop);
              if (mpStore.isConnected) {
                mpStore.setCredentials({ isFreeEdit: nextEdit, isFreeShop: nextShop });
                if (db && mpStore.roomName) {
                  try {
                    const roomRef = doc(db, 'rooms', mpStore.roomName.trim().toLowerCase());
                    await updateDoc(roomRef, { isFreeEdit: nextEdit, isFreeShop: nextShop });
                  } catch(err) {}
                }
              }
            }}
            className={cn(
              "px-2 h-7 text-[10px] uppercase tracking-wider font-cinzel font-bold transition-all whitespace-nowrap",
              (mpStore.isConnected ? mpStore.isFreeShop : store.isFreeShop)
                ? "wow-button-green"
                : "wow-button text-wow-gold"
            )}
            title="FREE TO SHOP"
          >
            {(mpStore.isConnected ? mpStore.isFreeShop : store.isFreeShop) ? 'FINISH SHOP' : 'FREE SHOP'}
          </button>
          <label className="wow-button px-2 h-7 cursor-pointer flex items-center gap-1 justify-center shrink-0" title="Load Shop JSON">
            <Upload size={14} /> <span className="font-sans font-bold">I</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportShop} />
          </label>
          <button onClick={openAddModal} className="wow-button px-2 h-7 flex items-center justify-center shrink-0" title="Add Ability">
             <Plus size={16} />
          </button>
          <button onClick={handleExportShop} className="wow-button px-2 h-7 flex items-center gap-1 justify-center shrink-0" title="Export Shop JSON">
            <DownloadCloud size={14} /> <span className="font-sans font-bold">E</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-scroll custom-scrollbar pr-2">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-xs text-white font-cinzel tracking-wider border-b border-[#5a4b3c]/50">
            <tr>
              <th className="pb-1 w-6"></th>
              <th className="pb-1 w-9 text-center"></th>
              <th className="pb-1 pl-2 pr-1 w-full">Ability</th>
              <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-32 font-bold text-xs sm:text-sm">D</th>
              <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-12 text-blue-400 font-bold text-xs sm:text-sm">MP</th>
              <th className="pb-1 text-center border-l border-[#5a4b3c]/50 px-1 w-24 font-bold text-xs sm:text-sm">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#5a4b3c]/30">
            {store.shopSpells.map((spell, index) => (
              <tr key={spell.id} className={`h-12 transition-colors font-sans group ${spell.isBlocked ? 'opacity-40 grayscale' : ''}`}>
                <td className="py-2 w-6">
                  <div className="flex flex-col items-center justify-center h-8">
                    <button 
                      onClick={() => store.moveShopSpell(index, 'up')}
                      className="p-0.5 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 !cursor-pointer flex items-center justify-center h-4"
                      disabled={index === 0}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={() => store.moveShopSpell(index, 'down')}
                      className="p-0.5 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 !cursor-pointer flex items-center justify-center h-4"
                      disabled={index === store.shopSpells.length - 1}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </td>
                <td className="py-2 text-center w-9">
                  <button 
                    onClick={() => { setEditingSpell(spell); setShowAddModal(true); }}
                    className="hover:scale-105 transition-transform"
                    title="Edit Ability"
                  >
                    <RenderSpellIcon icon={spell.icon} size={16} color={spell.color} />
                  </button>
                </td>
                <td className="py-2 pl-2 pr-1 truncate" title={spell.name}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-macondo text-[11px] sm:text-[13px]">{spell.name}</span>
                    {spell.tag && (
                      <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-sans font-semibold backdrop-blur-[1px] leading-none border ${getAbilityTagClass(spell.color)}`}>
                        {spell.tag}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1 text-sm font-semibold"><RenderSpellDice spell={spell} showUnknownResult={true} /></td>
                <td className="py-2 text-blue-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1 text-sm font-bold">{renderMpDisplay(spell)}</td>
                <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1 text-sm font-semibold">{spell.maxUses}</td>
              </tr>
            ))}
            {store.shopSpells.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-white/50 font-cinzel text-xs">
                  Shop is empty. Create abilities here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && editingSpell && (
        <SpellEditModal 
          spell={editingSpell} 
          onClose={() => { setShowAddModal(false); setEditingSpell(null); }} 
          onSave={(spell) => {
            if (store.shopSpells.find(s => s.id === spell.id)) {
              store.updateShopSpell(spell.id, spell);
            } else {
              store.addShopSpell(spell);
            }
            setShowAddModal(false);
            setEditingSpell(null);
          }} 
        />
      )}

      {/* Confirmation Modal for Import Shop Spells */}
      {pendingShopSpells && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[80] rounded p-4">
          <div className="bg-wow-dark border-2 border-wow-gold/40 p-5 rounded shadow-2xl w-full max-w-sm flex flex-col gap-4 text-center">
            <h5 className="font-cinzel text-wow-gold text-lg">Load Shop Abilities</h5>
            <p className="font-sans text-white text-sm">
              You loaded <span className="text-green-400 font-bold">{pendingShopSpells.length}</span> abilities. 
              Do you want to <span className="font-bold text-wow-gold">ADD</span> them to your existing shop list, 
              or <span className="font-bold text-red-400">REPLACE</span> your current shop completely?
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    store.loadShopSpells([...store.shopSpells, ...pendingShopSpells]);
                    setPendingShopSpells(null);
                  }}
                  className="wow-button flex-1 py-2 text-sm text-green-400 font-bold"
                >
                  ADD
                </button>
                <button 
                  onClick={() => {
                    store.loadShopSpells(pendingShopSpells!);
                    setPendingShopSpells(null);
                  }}
                  className="wow-button flex-1 py-2 text-sm text-red-400 font-bold"
                >
                  REPLACE
                </button>
              </div>
              <button 
                onClick={() => setPendingShopSpells(null)}
                className="wow-button w-full py-2 text-sm text-white"
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

function SpellEditModal({ spell, onClose, onSave }: { spell: Spell, onClose: () => void, onSave: (spell: Spell) => void }) {
  const store = useGMStore();
  const crafterTextSizeLevel = useGMStore(state => state.crafterTextSizeLevel);
  const increaseCrafterTextSize = useGMStore(state => state.increaseCrafterTextSize);
  const decreaseCrafterTextSize = useGMStore(state => state.decreaseCrafterTextSize);
  const nameSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
  const valueSizes = ['text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
  const labelClass = nameSizes[crafterTextSizeLevel] || 'text-sm';
  const valueClass = valueSizes[crafterTextSizeLevel] || 'text-xl';

  const initialEval = evaluateSpellDice(spell);

  const [draft, setDraft] = useState<Spell>({
    ...spell,
    diceStat: spell.diceStat || initialEval.statName,
    diceSign: spell.diceSign || initialEval.sign,
    diceVal: typeof spell.diceVal === 'number' ? spell.diceVal : initialEval.val,
  });

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pickerField, setPickerField] = useState<'dice' | 'mp' | 'maxUses' | null>(null);

  const [showStatModal, setShowStatModal] = useState(false);
  const [tempStat, setTempStat] = useState<string>('INTELLIGENCE');
  const [showValModal, setShowValModal] = useState(false);

  const isDotDice = draft.diceStat === '●' || draft.dice === '●';

  const ALL_STATS = ['●', 'INTELLIGENCE', 'STRENGTH', 'SPEED', 'ACCURACY', 'PATIENCE', 'LUCK'];

  return (
    <div className="absolute -inset-[2px] bg-black/95 z-50 rounded flex flex-col p-4 animate-in fade-in duration-200 border-2 border-[#5a4b3c] overflow-y-auto custom-scrollbar">
      {pickerField && (
        <div className="absolute inset-0 bg-wow-dark border-2 border-[#5a4b3c] p-4 rounded shadow-2xl flex flex-col gap-4 z-50">
          <h4 className="font-cinzel text-wow-gold text-lg font-bold border-b border-[#5a4b3c] pb-2 uppercase tracking-wider text-center">
            Select {pickerField === 'dice' ? 'Dice Configuration' : pickerField === 'mp' ? 'MP Cost' : 'Max Uses'}
          </h4>

          {pickerField === 'dice' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm mx-auto">
              <div className="w-full flex flex-col gap-3">
                {/* BUTTON 1: Stat Reference Selection */}
                <button
                  type="button"
                  onClick={() => {
                    setTempStat(draft.diceStat || 'INTELLIGENCE');
                    setShowStatModal(true);
                  }}
                  className="wow-button py-3 px-4 font-mono text-sm font-bold flex items-center justify-between border border-wow-gold/40 hover:border-wow-gold"
                >
                  <span className="font-cinzel text-xs text-gray-400">1. REFERENCE STAT:</span>
                  <span className="text-wow-gold text-base font-extrabold uppercase">{draft.diceStat || 'INTELLIGENCE'}</span>
                </button>

                {/* BUTTON 2: Sign Toggle (+ / -) */}
                <button
                  type="button"
                  disabled={draft.diceStat === '●' || draft.diceStat === '-const-'}
                  onClick={() => {
                    if (draft.diceStat === '●' || draft.diceStat === '-const-') return;
                    const nextSign = draft.diceSign === '-' ? '+' : '-';
                    const statName = draft.diceStat || 'INTELLIGENCE';
                    const numVal = draft.diceVal ?? 0;
                    setDraft(p => ({
                      ...p,
                      diceSign: nextSign,
                      dice: `${statName} ${nextSign} ${numVal}`
                    }));
                  }}
                  className={`wow-button py-3 px-4 font-mono text-sm font-bold flex items-center justify-between border ${(draft.diceStat === '●' || draft.diceStat === '-const-') ? 'opacity-40 cursor-not-allowed border-gray-700' : 'border-wow-gold/40 hover:border-wow-gold'}`}
                >
                  <span className="font-cinzel text-xs text-gray-400">2. OPERATOR (+/-):</span>
                  <span className="text-white text-lg font-black">{draft.diceStat === '●' ? '●' : draft.diceStat === '-const-' ? '+' : (draft.diceSign || '+')}</span>
                </button>

                {/* BUTTON 3: Number X Selection (0-12) */}
                <button
                  type="button"
                  disabled={draft.diceStat === '●'}
                  onClick={() => {
                    if (draft.diceStat === '●') return;
                    setShowValModal(true);
                  }}
                  className={`wow-button py-3 px-4 font-mono text-sm font-bold flex items-center justify-between border ${draft.diceStat === '●' ? 'opacity-40 cursor-not-allowed border-gray-700' : 'border-wow-gold/40 hover:border-wow-gold'}`}
                >
                  <span className="font-cinzel text-xs text-gray-400">3. VALUE X (0-12):</span>
                  <span className="text-green-400 text-lg font-black">{draft.diceStat === '●' ? '●' : (draft.diceVal ?? 0)}</span>
                </button>
              </div>

              {/* Preview of current Dice setup */}
              <div className="bg-black/60 p-3 rounded border border-[#5a4b3c] w-full flex flex-col items-center justify-center gap-1">
                <span className="font-cinzel text-[10px] text-gray-400 uppercase tracking-widest">Dice Representation</span>
                <RenderSpellDice spell={draft} showUnknownResult={true} />
              </div>
            </div>
          )}

          {/* Sub-modal: STAT SELECTION */}
          {showStatModal && (
            <div className="absolute inset-0 bg-black/95 border-2 border-wow-gold/50 p-4 rounded shadow-2xl flex flex-col gap-4 z-[60]">
              <div className="flex items-center justify-between border-b border-[#5a4b3c] pb-2">
                <h5 className="font-cinzel text-wow-gold text-base font-bold uppercase">
                  Choose Reference Stat
                </h5>
                <button
                  type="button"
                  onClick={() => setShowStatModal(false)}
                  className="text-gray-400 hover:text-white font-bold text-sm px-2 py-0.5"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 my-auto">
                {ALL_STATS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      if (st === '●') {
                        setDraft(p => ({
                          ...p,
                          diceStat: '●',
                          diceSign: '+',
                          diceVal: 0,
                          dice: '●',
                          r1: '',
                          r2: '',
                          maxUses: '●'
                        }));
                      } else {
                        const curSign = draft.diceSign || '+';
                        const curVal = draft.diceVal ?? 0;
                        setDraft(p => ({
                          ...p,
                          diceStat: st,
                          diceSign: curSign,
                          diceVal: curVal,
                          dice: `${st} ${curSign} ${curVal}`,
                          r1: p.r1 === '●' ? '' : p.r1,
                          r2: p.r2 === '●' ? '' : p.r2,
                          maxUses: p.maxUses === '●' ? '1' : p.maxUses
                        }));
                      }
                      setShowStatModal(false);
                    }}
                    className={`wow-button py-3 px-2 font-mono text-xs font-bold uppercase transition-all hover:bg-wow-gold/30 hover:border-wow-gold text-white ${draft.diceStat === st ? 'bg-wow-gold/20 border-wow-gold text-wow-gold' : ''}`}
                  >
                    {st}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const curVal = typeof draft.diceVal === 'number' && draft.diceVal >= 0 ? draft.diceVal : 0;
                    setDraft(p => ({
                      ...p,
                      diceStat: '-const-',
                      diceSign: '+',
                      diceVal: curVal,
                      dice: `-const- ${curVal}`,
                      r1: p.r1 === '●' ? '' : p.r1,
                      r2: p.r2 === '●' ? '' : p.r2,
                      maxUses: p.maxUses === '●' ? '1' : p.maxUses
                    }));
                    setShowStatModal(false);
                  }}
                  className={`wow-button py-3 px-2 font-mono text-xs font-bold uppercase transition-all hover:bg-wow-gold/30 hover:border-wow-gold text-white ${draft.diceStat === '-const-' ? 'bg-wow-gold/20 border-wow-gold text-wow-gold' : 'border-wow-gold/40'}`}
                >
                  -const-
                </button>
              </div>
            </div>
          )}

          {/* Sub-modal: VALUE X SELECTION (0..12) */}
          {showValModal && (
            <div className="absolute inset-0 bg-black/95 border-2 border-wow-gold/50 p-4 rounded shadow-2xl flex flex-col gap-4 z-[60]">
              <h5 className="font-cinzel text-wow-gold text-base font-bold text-center border-b border-[#5a4b3c] pb-2 uppercase">
                Choose Value X (0 to 12)
              </h5>
              <div className="flex-1 grid grid-cols-4 gap-2 my-auto max-w-xs mx-auto w-full">
                {Array.from({ length: 13 }, (_, i) => i).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (draft.diceStat === '-const-') {
                        setDraft(p => ({
                          ...p,
                          diceVal: num,
                          dice: `-const- ${num}`
                        }));
                      } else {
                        const statName = draft.diceStat || 'INTELLIGENCE';
                        const curSign = draft.diceSign || '+';
                        setDraft(p => ({
                          ...p,
                          diceVal: num,
                          dice: `${statName} ${curSign} ${num}`
                        }));
                      }
                      setShowValModal(false);
                    }}
                    className={`wow-button py-3 font-mono text-sm font-bold ${draft.diceVal === num ? 'bg-wow-gold/30 border-wow-gold text-wow-gold' : 'text-white'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowValModal(false)}
                className="wow-button w-full py-2.5 text-xs uppercase font-cinzel text-gray-400 border-[#5a4b3c]"
              >
                Back
              </button>
            </div>
          )}

          {pickerField === 'mp' && (
            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <div className="grid grid-cols-4 gap-2 w-full max-w-xs justify-center">
                {['●', '1', '2', '3', '4', '5', '6'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const val = opt === '●' ? '' : opt;
                      setDraft(p => ({ ...p, r1: val, r2: val }));
                      setPickerField(null);
                    }}
                    className={`wow-button py-2.5 font-mono text-sm font-bold flex items-center justify-center ${(opt === '●' && !(draft.r2 || draft.r1)) || (draft.r2 === opt || draft.r1 === opt) ? 'bg-blue-500/20 border-blue-400 text-blue-400' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pickerField === 'maxUses' && (
            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <div className="grid grid-cols-4 gap-2 w-full max-w-xs justify-center">
                {['●', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setDraft(p => ({ ...p, maxUses: opt }));
                      setPickerField(null);
                    }}
                    className={`wow-button py-2.5 font-mono text-sm font-bold flex items-center justify-center ${draft.maxUses === opt ? 'bg-wow-gold/20 border-wow-gold text-wow-gold' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setPickerField(null)}
            className="wow-button w-full py-2.5 text-xs uppercase font-cinzel tracking-wider text-gray-400 border-[#5a4b3c]"
          >
            Done
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-[#5a4b3c] pb-2 mb-3 shrink-0">
        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-[#5a4b3c]/50">
          <button 
            type="button"
            onClick={() => setDraft(p => ({ ...p, color: 'gold' }))}
            className={`w-5 h-5 rounded-sm bg-[#f3d178] border border-black/40 cursor-pointer transition-all ${(!draft.color || draft.color === 'gold') ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
            title="Yellow (Default)"
          />
          <button 
            type="button"
            onClick={() => setDraft(p => ({ ...p, color: 'purple' }))}
            className={`w-5 h-5 rounded-sm bg-purple-500 border border-black/40 cursor-pointer transition-all ${draft.color === 'purple' ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
            title="Purple"
          />
          <button 
            type="button"
            onClick={() => setDraft(p => ({ ...p, color: 'rose' }))}
            className={`w-5 h-5 rounded-sm bg-rose-500 border border-black/40 cursor-pointer transition-all ${draft.color === 'rose' ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
            title="Vermilion Rose"
          />
          <div className="h-4 w-[1px] bg-[#5a4b3c]/50 mx-0.5" />
          <button 
            type="button"
            onClick={() => decreaseCrafterTextSize()}
            className="text-wow-gold hover:text-white transition-colors cursor-pointer p-0.5 flex items-center justify-center"
            title="Réduire la taille du texte"
          >
            <ZoomOut size={14} />
          </button>
          <button 
            type="button"
            onClick={() => increaseCrafterTextSize()}
            className="text-wow-gold hover:text-white transition-colors cursor-pointer p-0.5 flex items-center justify-center"
            title="Augmenter la taille du texte"
          >
            <ZoomIn size={14} />
          </button>
        </div>
        <h4 className="font-cinzel text-wow-gold text-base sm:text-lg font-bold">
          {store.shopSpells.some(s => s.id === spell.id) ? 'Edit Ability' : 'Create Ability'}
        </h4>
      </div>
      
      <div className="flex gap-3 mb-3 shrink-0">
        <div className="relative">
          <label className={cn("block font-cinzel text-white mb-1", labelClass)}>Icon</label>
          <button 
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-12 h-12 wow-button rounded flex items-center justify-center shadow-md focus:outline-none shrink-0"
          >
            {typeof draft.icon === 'string' && draft.icon.length > 2 ? <RenderGMIcon iconName={draft.icon} size={24} color={draft.color} /> : draft.icon}
          </button>
          {showIconPicker && (
            <IconPicker 
              value={draft.icon as string} 
              color={draft.color}
              onChange={(val) => setDraft(p => ({ ...p, icon: val }))}
              onClose={() => setShowIconPicker(false)}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <label className={cn("block font-cinzel text-white mb-1", labelClass)}>Name</label>
          <input 
            type="text" 
            value={draft.name} 
            onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} 
            className={cn("wow-input w-full p-2 bg-black/60 border border-wow-gold/30 focus:border-wow-gold text-wow-gold font-macondo font-bold transition-colors min-h-[38px]", labelClass)} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className={cn("block font-cinzel text-white mb-1", labelClass)}>Tag (Golden Label)</label>
          <input 
            type="text" 
            value={draft.tag || ''} 
            onChange={e => setDraft(p => ({ ...p, tag: e.target.value }))} 
            placeholder="e.g. Rare, Lv 2..." 
            className={cn("wow-input w-full p-2 bg-black/60 border border-wow-gold/30 focus:border-wow-gold text-wow-gold font-sans transition-colors min-h-[38px]", labelClass)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0 bg-black/40 p-2 rounded border border-[#5a4b3c]/30 text-center">
        <div>
          <label className={cn("block font-cinzel text-gray-400 mb-1", labelClass)}>DICE</label>
          <button
            type="button"
            onClick={() => setPickerField('dice')}
            className={cn("wow-button w-full p-1.5 text-center font-mono font-bold text-white bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors rounded hover:bg-wow-gold/10 flex items-center justify-center min-h-[38px]", valueClass)}
          >
            <RenderSpellDice spell={draft} showUnknownResult={true} />
          </button>
        </div>
        <div>
          <label className={cn("block font-cinzel text-blue-400 mb-1", labelClass)}>MP COST</label>
          <button
            type="button"
            disabled={isDotDice}
            onClick={() => {
              if (!isDotDice) setPickerField('mp');
            }}
            className={cn(`wow-button w-full p-1.5 text-center font-mono font-bold text-blue-400 bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors rounded hover:bg-wow-gold/10 flex items-center justify-center min-h-[38px] ${isDotDice ? 'opacity-40 cursor-not-allowed border-gray-700' : ''}`, valueClass)}
          >
            {isDotDice ? '●' : renderMpDisplay(draft)}
          </button>
        </div>
        <div>
          <label className={cn("block font-cinzel text-gray-400 mb-1", labelClass)}>MAX USES</label>
          <button
            type="button"
            disabled={isDotDice}
            onClick={() => {
              if (!isDotDice) setPickerField('maxUses');
            }}
            className={cn(`wow-button w-full p-1.5 text-center font-mono font-bold text-white bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors rounded hover:bg-wow-gold/10 flex items-center justify-center min-h-[38px] ${isDotDice ? 'opacity-40 cursor-not-allowed border-gray-700' : ''}`, valueClass)}
          >
            {isDotDice ? '●' : (draft.maxUses || '●')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col mb-3 min-h-0">
        <label className={cn("block font-cinzel text-white mb-1", labelClass)}>Description</label>
        <textarea 
          value={draft.description || ''} 
          onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} 
          className={cn("wow-input w-full p-2 flex-1 resize-none bg-black/60 border border-wow-gold/30 focus:border-wow-gold text-gray-300 custom-scrollbar rounded", labelClass)} 
        />
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0 pt-1">
        {storeHasSpell(spell.id) && (
          <>
            <button 
              type="button"
              onClick={() => {
                useGMStore.getState().toggleShopSpellBlock(spell.id);
                setDraft(p => ({ ...p, isBlocked: !p.isBlocked }));
              }}
              className={`wow-button text-xs font-cinzel font-bold flex items-center justify-center gap-1 px-3 py-2 ${draft.isBlocked ? "opacity-50" : ""}`}
            >
              {draft.isBlocked ? 'Unblock' : 'Block'}
            </button>
            <button 
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="wow-button text-xs font-cinzel font-bold flex items-center justify-center gap-1 px-3 py-2 text-red-400 border-red-800"
            >
              DELETE
            </button>
          </>
        )}
        <div className="flex-1"></div>
        <button type="button" onClick={onClose} className="wow-button px-4 py-2 text-xs font-cinzel font-bold">Cancel</button>
        <button type="button" onClick={() => onSave(draft)} className="wow-button-green px-4 py-2 text-xs font-cinzel font-bold">Save</button>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[70] rounded p-4">
          <div className="bg-wow-dark border-2 border-red-900/60 p-5 rounded shadow-2xl w-full max-w-xs flex flex-col gap-4 text-center">
            <h5 className="font-cinzel text-red-400 text-lg">Confirm Delete</h5>
            <p className="font-sans text-white text-sm">
              Are you sure you want to delete "<span className="text-wow-gold font-bold">{draft.name}</span>" from the abilities list?
            </p>
            <div className="flex justify-center gap-3 mt-2">
              <button 
                onClick={() => {
                  useGMStore.getState().removeShopSpell(spell.id);
                  onClose();
                }}
                className="wow-button w-24 h-10 text-sm text-red-400 flex items-center justify-center font-bold"
              >
                DELETE
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="wow-button w-24 h-10 text-sm flex items-center justify-center font-bold"
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

function storeHasSpell(id: string) {
  return useGMStore.getState().shopSpells.some(s => s.id === id);
}
