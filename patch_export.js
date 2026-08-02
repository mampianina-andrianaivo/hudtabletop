const fs = require('fs');
const content = fs.readFileSync('src/pages/PlayerView.tsx', 'utf8');

const regex = /const handleExportJSON = \(\) => \{[\s\S]*?\}\s*\};\s*const handleImportJSON/m;

const replacement = `const handleExportJSON = () => {
    const gmState = useGMStore.getState();
    const pStore = usePlayerStore.getState();
    
    const roomNameToCheck = gmState.roomName?.trim() || 'scratch';
    
    const baseSpells = pStore.spells || [];
    const allSpellsMap = new Map();
    baseSpells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));

    Object.values(gmState.scratchPlayers).forEach((p: any) => {
      if (p?.characterState?.spells && Array.isArray(p.characterState.spells)) {
        p.characterState.spells.forEach((s: any) => allSpellsMap.set(s.id || s.name, s));
      }
    });

    const commonSpells = Array.from(allSpellsMap.values());

    const finalScratchPlayers: Record<string, any> = {};
    gmState.scratchLinks.forEach((link, idx) => {
      const existing: any = gmState.scratchPlayers[link] || { pseudo: '' };
      const pseudo = (existing.pseudo || '').trim() || \`Player \${idx + 1}\`;
      
      const playerSpellsMap = new Map();
      commonSpells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
      if (existing.characterState?.spells && Array.isArray(existing.characterState.spells)) {
        existing.characterState.spells.forEach((s: any) => playerSpellsMap.set(s.id || s.name, s));
      }

      finalScratchPlayers[link] = {
        ...existing,
        pseudo,
        characterState: {
          ...(existing.characterState || {
            name: pseudo,
            photo: pStore.photo || '',
            stats: pStore.stats || [],
            resources: pStore.resources || [],
            notes: pStore.notes || '',
          }),
          name: pseudo,
          spells: Array.from(playerSpellsMap.values()),
        }
      };
    });

    const campaignData = {
      roomName: roomNameToCheck,
      shopSpells: gmState.shopSpells,
      encounters: gmState.encounters,
      currentDraw: gmState.currentDraw,
      isFreeEdit: false,
      isFreeShop: false,
      notes: gmState.notes,
      publicNotes: mpStore.publicNotes,
      scratchLinks: gmState.scratchLinks,
      scratchPlayers: finalScratchPlayers,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(campaignData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", \`\${roomNameToCheck}_campaign.json\`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJSON`;

const newContent = content.replace(regex, replacement);
if (content !== newContent) {
  fs.writeFileSync('src/pages/PlayerView.tsx', newContent);
  console.log("Patched successfully!");
} else {
  console.log("Could not find regex match!");
}
