const fs = require('fs');
let code = fs.readFileSync('src/components/GMEncounters.tsx', 'utf8');

// 1. Remove the old settings block inside the actions tab
const oldSettingsRegex = /\{showSettings && \([\s\S]*?<\/div>\s*\)\}\s*/;
code = code.replace(oldSettingsRegex, '');

// 2. Add the modal at the end before the closing div
const modalContent = `      {showSettings && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded p-4">
          <div className="bg-[#1a110a] border-2 border-[#5a4b3c] p-4 rounded shadow-2xl w-full max-w-md flex flex-col gap-4 max-h-full">
            <h4 className="font-cinzel text-wow-gold text-lg text-center">Encounter Settings</h4>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
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
}`;

code = code.replace(/    <\/div>\n  \);\n\}/g, modalContent);

// 3. Fix Clear and Publish buttons
code = code.replace(/className="px-6 py-2 font-cinzel text-sm text-red-400 bg-red-950\/30 border border-red-900\/50 rounded hover:bg-red-900\/50 transition-colors shadow-md"/g, 'className="wow-button px-6 py-2 font-cinzel text-sm"');
code = code.replace(/className=\{`px-8 py-2 font-cinzel rounded shadow-md transition-colors \$\{store.currentDraw.published \? 'bg-green-800 text-white cursor-default' : 'wow-button'\}`\}/g, "className={`wow-button px-8 py-2 font-cinzel text-sm ${store.currentDraw.published ? 'opacity-50 cursor-not-allowed' : ''}`}");

// 4. Reduce gap in lines
code = code.replace(/<div className="flex flex-col items-center w-full max-w-sm gap-4">/g, '<div className="flex flex-col items-center w-full max-w-sm gap-2">');

// 5. Fix items-start in row
code = code.replace(/<div className="w-full bg-\[#2b1d14\] border border-\[#5a4b3c\] rounded p-2 flex flex-row gap-2 shadow-lg items-center justify-center">/g, '<div className="w-full bg-[#2b1d14] border border-[#5a4b3c] rounded p-2 flex flex-row gap-2 shadow-lg items-start justify-center">');

fs.writeFileSync('src/components/GMEncounters.tsx', code);
console.log("Success");
