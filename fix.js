const fs = require('fs');
let code = fs.readFileSync('src/components/GMSpellCrafter.tsx', 'utf8');
code = code.replace(/      <\/div>\n      <\/div>\n      <div className="flex-1 overflow-y-scroll custom-scrollbar">/g, '      <div className="flex-1 overflow-y-scroll custom-scrollbar">');
fs.writeFileSync('src/components/GMSpellCrafter.tsx', code);
