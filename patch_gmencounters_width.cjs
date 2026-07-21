const fs = require('fs');
let code = fs.readFileSync('src/components/GMEncounters.tsx', 'utf8');

code = code.replace(
  /<div className="flex flex-col items-center w-full max-w-sm gap-1">/g,
  '<div className="flex flex-col items-center w-full gap-1">'
);

code = code.replace(
  /<div className="flex items-center justify-center w-5 shrink-0 font-cinzel text-wow-gold text-xs font-bold bg-\[#1a110a\] rounded border border-\[#3b2c19\]">/g,
  '<div className="flex items-center justify-center w-8 shrink-0 font-cinzel text-wow-gold text-sm font-bold bg-[#1a110a] rounded border border-[#3b2c19]">'
);

fs.writeFileSync('src/components/GMEncounters.tsx', code);
console.log("Success");
