import React, { useState } from 'react';
import { Trash2, DownloadCloud, Upload, Plus, ChevronUp, ChevronDown, Edit2, Lock, Unlock } from 'lucide-react';
import { useGMStore } from '@/store/useGMStore';
import { Spell } from '@/store/usePlayerStore';
import { IconPicker, RenderGMIcon } from './GMIcons';

export function GMSpellCrafter() {
  const store = useGMStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null);
  const [pendingShopSpells, setPendingShopSpells] = useState<Spell[] | null>(null);

  const handleExportShop = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.shopSpells, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "shop_spells.json");
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
      name: 'New Spell',
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
    <div className="flex flex-col h-full bg-black/40 border border-[#5a4b3c] rounded p-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-cinzel text-wow-gold text-lg">Spell Crafter</h3>
        <div className="flex gap-2">
          <label className="wow-button px-3 py-1 text-xs cursor-pointer flex items-center gap-1">
            <Upload size={14} /> Load
            <input type="file" accept=".json" className="hidden" onChange={handleImportShop} />
          </label>
          <button onClick={openAddModal} className="wow-button px-3 py-1 text-xs flex items-center gap-1">
             <Plus size={14} /> Add
          </button>
          <button onClick={handleExportShop} className="wow-button px-3 py-1 text-xs flex items-center gap-1">
            <DownloadCloud size={14} /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-scroll custom-scrollbar">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-xs text-white font-cinzel border-b border-[#5a4b3c]">
            <tr>
              <th className="pb-2 w-10"></th>
              <th className="pb-2 w-6"></th>
              <th className="pb-2 pl-3 pr-2 w-full">Name</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-10">D</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-10">R1</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-10">R2</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-10">R3</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 px-1 w-10">R4</th>
              <th className="pb-2 text-center border-l border-[#5a4b3c]/50 pl-1 w-12">Max</th>
            </tr>
          </thead>
          <tbody>
            {store.shopSpells.map((spell, index) => (
              <tr key={spell.id} className={`border-b border-[#3b2c19] transition-colors font-sans group ${spell.isBlocked ? 'opacity-40 grayscale' : ''}`}>
                <td className="py-2 text-center">
                  <button 
                    onClick={() => { setEditingSpell(spell); setShowAddModal(true); }}
                    className="wow-button rounded p-1 w-8 h-8 flex items-center justify-center text-lg focus:outline-none shadow-sm cursor-pointer mx-auto"
                    title="Edit Spell"
                  >
                    {typeof spell.icon === 'string' && spell.icon.length > 2 ? <RenderGMIcon iconName={spell.icon} size={20} /> : spell.icon}
                  </button>
                </td>
                <td className="py-1">
                  <div className="flex flex-col items-center justify-center">
                    <button 
                      onClick={() => store.moveShopSpell(index, 'up')}
                      className="p-0.5 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center h-4"
                      disabled={index === 0}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={() => store.moveShopSpell(index, 'down')}
                      className="p-0.5 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center h-4"
                      disabled={index === store.shopSpells.length - 1}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </td>
                <td className="py-2 pl-3 font-macondo text-white pr-2 truncate" title={spell.name}><div className="flex items-center gap-2"><span>{spell.name}</span>{spell.tag && <span className="font-cinzel text-[10px] text-wow-gold border border-wow-gold/30 bg-wow-gold/10 px-1 py-0.5 rounded shadow-sm leading-none drop-shadow-md">{spell.tag}</span>}</div></td>
                <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 px-1">{spell.dice}</td>
                <td className="py-2 text-red-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1">{spell.r1}</td>
                <td className="py-2 text-blue-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1">{spell.r2}</td>
                <td className="py-2 text-purple-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1">{spell.r3}</td>
                <td className="py-2 text-green-400 font-mono text-center border-l border-[#5a4b3c]/50 px-1">{spell.r4}</td>
                <td className="py-2 font-mono text-white text-center border-l border-[#5a4b3c]/50 pl-1">{spell.maxUses}</td>
              </tr>
            ))}
            {store.shopSpells.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-white/50 font-cinzel text-sm">
                  Shop is empty. Create spells here.
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
            <h5 className="font-cinzel text-wow-gold text-lg">Load Shop Spells</h5>
            <p className="font-sans text-white text-sm">
              You loaded <span className="text-green-400 font-bold">{pendingShopSpells.length}</span> spells. 
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
                className="wow-button w-full py-2 text-sm text-gray-400"
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
  const [draft, setDraft] = useState<Spell>({ ...spell });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded p-4">
      <div className="bg-wow-dark border-2 border-[#5a4b3c] p-4 rounded shadow-2xl w-full max-w-md flex flex-col gap-4 relative">
        <h4 className="font-cinzel text-wow-gold text-lg text-center">{storeHasSpell(spell.id) ? 'Edit Spell' : 'Create Spell'}</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex gap-4">
            <div className="relative">
              <label className="block text-xs font-cinzel text-gray-400 mb-1">Icon</label>
              <button 
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-12 h-12 wow-button rounded flex items-center justify-center shadow-md focus:outline-none"
              >
                {typeof draft.icon === 'string' && draft.icon.length > 2 ? <RenderGMIcon iconName={draft.icon} size={24} /> : draft.icon}
              </button>
              {showIconPicker && (
                <IconPicker 
                  value={draft.icon as string} 
                  onChange={(val) => setDraft(p => ({ ...p, icon: val }))}
                  onClose={() => setShowIconPicker(false)}
                />
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-cinzel text-gray-400 mb-1">Name</label>
              <input type="text" value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} className="wow-input w-full p-2 bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-cinzel text-gray-400 mb-1">Tag (Golden Label)</label>
              <input type="text" value={draft.tag || ''} onChange={e => setDraft(p => ({ ...p, tag: e.target.value }))} placeholder="e.g. Rare, Lv 2..." className="wow-input w-full p-2 bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-cinzel text-gray-400 mb-1">Dice (D)</label>
            <input type="text" value={draft.dice} onChange={e => setDraft(p => ({ ...p, dice: e.target.value }))} className="wow-input w-full p-2 text-center bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-cinzel text-gray-400 mb-1">Max Uses</label>
            <input type="text" value={draft.maxUses} onChange={e => setDraft(p => ({ ...p, maxUses: e.target.value }))} className="wow-input w-full p-2 text-center bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
          </div>

          <div className="grid grid-cols-4 col-span-2 gap-2">
            <div>
              <label className="block text-xs font-cinzel text-red-400 mb-1">R1</label>
              <input type="text" value={draft.r1} onChange={e => setDraft(p => ({ ...p, r1: e.target.value }))} className="wow-input w-full p-1 text-center font-mono bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-cinzel text-blue-400 mb-1">R2</label>
              <input type="text" value={draft.r2} onChange={e => setDraft(p => ({ ...p, r2: e.target.value }))} className="wow-input w-full p-1 text-center font-mono bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-cinzel text-purple-400 mb-1">R3</label>
              <input type="text" value={draft.r3} onChange={e => setDraft(p => ({ ...p, r3: e.target.value }))} className="wow-input w-full p-1 text-center font-mono bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-cinzel text-green-400 mb-1">R4</label>
              <input type="text" value={draft.r4} onChange={e => setDraft(p => ({ ...p, r4: e.target.value }))} className="wow-input w-full p-1 text-center font-mono bg-black/60 border border-wow-gold/30 focus:border-wow-gold transition-colors" />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-cinzel text-gray-400 mb-1">Description</label>
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
              Are you sure you want to delete "<span className="text-wow-gold font-bold">{draft.name}</span>" from the spell list?
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
  // Hacky way to check if it's new or edit without passing a prop down
  return useGMStore.getState().shopSpells.some(s => s.id === id);
}
