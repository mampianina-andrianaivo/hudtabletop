import React, { useState } from 'react';
import { DownloadCloud, Upload, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { useGMStore } from '@/store/useGMStore';
import { Spell } from '@/store/usePlayerStore';
import { IconPicker, RenderGMIcon, getAbilityTagClass } from './GMIcons';
import { RenderSpellIcon } from './SpellBook';

export function GMSpellCrafter() {
  const store = useGMStore();
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
        if (Array.isArray(json)) {
          setPendingShopSpells(json);
        } else {
          alert("Invalid shop file format.");
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Invalid shop file.");
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
          <label className="wow-button px-2.5 h-7 text-[10px] sm:text-xs cursor-pointer flex items-center gap-1 justify-center">
            <Upload size={12} /> <span>Load</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportShop} />
          </label>
          <button onClick={openAddModal} className="wow-button px-2.5 h-7 text-[10px] sm:text-xs flex items-center gap-1 justify-center">
             <Plus size={12} /> <span>Add</span>
          </button>
          <button onClick={handleExportShop} className="wow-button px-2.5 h-7 text-[10px] sm:text-xs flex items-center gap-1 justify-center">
            <DownloadCloud size={12} /> <span>Export</span>
          </button>
        </div>
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
                <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1 text-xs">{spell.dice}</td>
                <td className="py-2 text-blue-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1 text-xs">{spell.r2 ?? spell.r1 ?? ''}</td>
                <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1 text-xs">{spell.maxUses}</td>
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
  const [draft, setDraft] = useState<Spell>({ ...spell });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pickerField, setPickerField] = useState<'dice' | 'mp' | 'maxUses' | null>(null);

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded p-4">
      <div className="bg-wow-dark border-2 border-[#5a4b3c] p-4 rounded shadow-2xl w-full max-w-md flex flex-col gap-4 relative">
        {pickerField && (
          <div className="absolute inset-0 bg-wow-dark border-2 border-[#5a4b3c] p-4 rounded shadow-2xl flex flex-col gap-4 z-50">
            <h4 className="font-cinzel text-wow-gold text-lg font-bold border-b border-[#5a4b3c] pb-2 uppercase tracking-wider text-center">
              Select {pickerField === 'dice' ? 'Dice' : pickerField === 'mp' ? 'MP Cost' : 'Max Uses'}
            </h4>
            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <div className="grid grid-cols-4 gap-2 w-full max-w-xs justify-center">
                {pickerField === 'dice' && (
                  ['●', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setDraft(p => ({ ...p, dice: opt }));
                        setPickerField(null);
                      }}
                      className={`wow-button py-2.5 font-mono text-sm font-bold flex items-center justify-center ${draft.dice === opt ? 'bg-wow-gold/20 border-wow-gold text-wow-gold' : ''}`}
                    >
                      {opt}
                    </button>
                  ))
                )}

                {pickerField === 'mp' && (
                  ['●', '1', '2', '3', '4', '5', '6'].map((opt) => (
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
                  ))
                )}

                {pickerField === 'maxUses' && (
                  ['●', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((opt) => (
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
                  ))
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPickerField(null)}
              className="wow-button w-full py-2.5 text-xs uppercase font-cinzel tracking-wider text-gray-400 border-[#5a4b3c]"
            >
              Back
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-[#5a4b3c] pb-2">
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-[#5a4b3c]/50">
            <button 
              type="button"
              onClick={() => setDraft(p => ({ ...p, color: 'gold' }))}
              className={`w-4 h-4 rounded-sm bg-[#f3d178] border border-black/40 cursor-pointer transition-all ${(!draft.color || draft.color === 'gold') ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
              title="Yellow (Default)"
            />
            <button 
              type="button"
              onClick={() => setDraft(p => ({ ...p, color: 'purple' }))}
              className={`w-4 h-4 rounded-sm bg-purple-500 border border-black/40 cursor-pointer transition-all ${draft.color === 'purple' ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
              title="Purple"
            />
            <button 
              type="button"
              onClick={() => setDraft(p => ({ ...p, color: 'rose' }))}
              className={`w-4 h-4 rounded-sm bg-rose-500 border border-black/40 cursor-pointer transition-all ${draft.color === 'rose' ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
              title="Vermilion Rose"
            />
          </div>
          <h4 className="font-cinzel text-wow-gold text-base sm:text-lg font-bold">
            {store.shopSpells.some(s => s.id === spell.id) ? 'Edit Ability' : 'Create Ability'}
          </h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex gap-4">
            <div className="relative">
              <label className="block text-xs font-cinzel text-white mb-1">Icon</label>
              <button 
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-12 h-12 wow-button rounded flex items-center justify-center shadow-md focus:outline-none"
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
            <div className="flex-1">
              <label className="block text-xs font-cinzel text-white mb-1">Name</label>
              <input type="text" value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} className="wow-input w-full p-2 bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-cinzel text-white mb-1">Tag (Golden Label)</label>
              <input type="text" value={draft.tag || ''} onChange={e => setDraft(p => ({ ...p, tag: e.target.value }))} placeholder="e.g. Rare, Lv 2..." className="wow-input w-full p-2 bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 col-span-2 bg-black/40 p-2 rounded border border-[#5a4b3c]/30 text-center text-xs">
            <div>
              <label className="block text-[10px] font-cinzel text-gray-400 mb-1">DICE</label>
              <button
                type="button"
                onClick={() => setPickerField('dice')}
                className="wow-button w-full p-1.5 text-center font-mono font-bold text-white bg-black/60 border border-wow-gold/30 focus:border-wow-gold text-xs transition-colors rounded hover:bg-wow-gold/10"
              >
                {draft.dice || '●'}
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-cinzel text-blue-400 mb-1">MP COST</label>
              <button
                type="button"
                onClick={() => setPickerField('mp')}
                className="wow-button w-full p-1.5 text-center font-mono font-bold text-blue-400 bg-black/60 border border-wow-gold/30 focus:border-wow-gold text-xs transition-colors rounded hover:bg-wow-gold/10"
              >
                {draft.r2 || draft.r1 || '●'}
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-cinzel text-gray-400 mb-1">MAX USES</label>
              <button
                type="button"
                onClick={() => setPickerField('maxUses')}
                className="wow-button w-full p-1.5 text-center font-mono font-bold text-white bg-black/60 border border-wow-gold/30 focus:border-wow-gold text-xs transition-colors rounded hover:bg-wow-gold/10"
              >
                {draft.maxUses || '●'}
              </button>
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-cinzel text-white mb-1">Description</label>
            <textarea value={draft.description || ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} className="wow-input w-full p-2 h-20 resize-none bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors custom-scrollbar" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-2">
          {storeHasSpell(spell.id) && (
            <>
              <button 
                onClick={() => {
                  useGMStore.getState().toggleShopSpellBlock(spell.id);
                  setDraft(p => ({ ...p, isBlocked: !p.isBlocked }));
                }}
                className={`wow-button text-sm flex items-center justify-center gap-1 w-24 h-10 ${draft.isBlocked ? "opacity-50" : ""}`}
              >
                {draft.isBlocked ? 'Unblock' : 'Block'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="wow-button text-sm flex items-center justify-center gap-1 w-24 h-10 text-red-400"
              >
                DELETE
              </button>
            </>
          )}
          <div className="flex-1"></div>
          <button onClick={onClose} className="wow-button w-24 h-10 text-sm flex items-center justify-center">Cancel</button>
          <button onClick={() => onSave(draft)} className="wow-button w-24 h-10 text-sm flex items-center justify-center">Save</button>
        </div>
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
