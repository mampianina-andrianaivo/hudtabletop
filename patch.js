const fs = require('fs');
let code = fs.readFileSync('src/components/GMSpellCrafter.tsx', 'utf8');

const target = `<div className="flex flex-col h-full relative">
      <h3 className="font-cinzel font-bold text-xl mb-2 text-wow-gold text-center pt-2">Spell Crafter</h3>
      
      <div className="flex justify-between items-center px-4 mb-2">
        <label className="wow-button px-3 py-1 text-xs cursor-pointer flex items-center gap-1">
          <Upload size={14} /> Load Shop
          <input type="file" accept=".json" className="hidden" onChange={handleImportShop} />
        </label>
        
        <button onClick={openAddModal} className="wow-button px-3 py-1 text-xs flex items-center gap-1 bg-green-900/50 hover:bg-green-800">
           <Plus size={14} /> Add Spell
        </button>
        <button onClick={handleExportShop} className="wow-button px-3 py-1 text-xs flex items-center gap-1">
          <DownloadCloud size={14} /> Export Shop
        </button>
      </div>`;

const replacement = `<div className="flex flex-col h-full bg-black/40 border border-[#5a4b3c] rounded p-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-cinzel text-wow-gold text-lg">Spell Crafter</h3>
        <div className="flex gap-2">
          <label className="wow-button px-3 py-1 text-xs cursor-pointer flex items-center gap-1">
            <Upload size={14} /> Load
            <input type="file" accept=".json" className="hidden" onChange={handleImportShop} />
          </label>
          <button onClick={openAddModal} className="wow-button px-3 py-1 text-xs flex items-center gap-1 bg-green-900/50 hover:bg-green-800">
             <Plus size={14} /> Add
          </button>
          <button onClick={handleExportShop} className="wow-button px-3 py-1 text-xs flex items-center gap-1">
            <DownloadCloud size={14} /> Export
          </button>
        </div>
      </div>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/GMSpellCrafter.tsx', code);
  console.log("Success exact");
} else {
  // Let's replace line by line
  let lines = code.split('\n');
  let startIdx = lines.findIndex(l => l.includes('className="flex flex-col h-full relative"'));
  if (startIdx !== -1) {
    let endIdx = startIdx;
    while (!lines[endIdx].includes('Export Shop')) { endIdx++; }
    endIdx += 2; // to cover the closing div
    lines.splice(startIdx, endIdx - startIdx, replacement);
    fs.writeFileSync('src/components/GMSpellCrafter.tsx', lines.join('\n'));
    console.log("Success index");
  } else {
    console.log("Failed");
  }
}
