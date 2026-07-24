const fs = require('fs');
let content = fs.readFileSync('src/pages/PlayerView.tsx', 'utf8');

content = content.replace(
  'isViewMode && "border-red-600"',
  'isViewMode && "!border-red-600 !border-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"'
);

fs.writeFileSync('src/pages/PlayerView.tsx', content);
console.log("Done patching PlayerView.tsx");
