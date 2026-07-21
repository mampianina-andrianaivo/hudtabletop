const fs = require('fs');
let code = fs.readFileSync('src/components/GMSpellCrafter.tsx', 'utf8');

const modalStart = `function SpellEditModal({ spell, onClose, onSave }: { spell: Spell, onClose: () => void, onSave: (spell: Spell) => void }) {
  const [draft, setDraft] = useState<Spell>({ ...spell });
  const [showIconPicker, setShowIconPicker] = useState(false);`;

const newModalStart = `function SpellEditModal({ spell, onClose, onSave }: { spell: Spell, onClose: () => void, onSave: (spell: Spell) => void }) {
  const [draft, setDraft] = useState<Spell>({ ...spell });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);`;

code = code.replace(modalStart, newModalStart);

const buttonsStr = `              <button 
                onClick={() => {
                  useGMStore.getState().removeShopSpell(spell.id);
                  onClose();
                }}
                className="wow-button px-3 py-2 text-sm flex items-center justify-center gap-1 w-24 text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <div className="flex-1"></div>
          <button onClick={onClose} className="wow-button px-4 py-2 text-sm w-24 flex justify-center">Cancel</button>
          <button onClick={() => onSave(draft)} className="wow-button w-32 px-6 py-2 text-sm flex justify-center">Save Spell</button>
        </div>`;

const newButtonsStr = `              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-xs font-cinzel whitespace-nowrap">Sure?</span>
                  <button onClick={() => { useGMStore.getState().removeShopSpell(spell.id); onClose(); }} className="wow-button px-2 py-2 text-xs flex items-center justify-center w-12 text-red-400">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="wow-button px-2 py-2 text-xs flex items-center justify-center w-12">No</button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmDelete(true)}
                  className="wow-button px-3 py-2 text-sm flex items-center justify-center gap-1 w-24 text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
          <div className="flex-1"></div>
          <button onClick={onClose} className="wow-button px-4 py-2 text-sm w-24 flex items-center justify-center">Cancel</button>
          <button onClick={() => onSave(draft)} className="wow-button w-24 px-6 py-2 text-sm flex items-center justify-center">Save</button>
        </div>`;

code = code.replace(buttonsStr, newButtonsStr);

// Let's also fix the Block button to have flex items-center so it aligns well
code = code.replace(
  /className=\{\`wow-button px-3 py-2 text-sm flex items-center justify-center gap-1 w-24 \$\{draft.isBlocked \? "opacity-50" : ""\}\`\}/g,
  'className={`wow-button px-3 py-2 text-sm flex items-center justify-center gap-1 w-24 ${draft.isBlocked ? "opacity-50" : ""}`}'
);

fs.writeFileSync('src/components/GMSpellCrafter.tsx', code);
console.log("Success");
