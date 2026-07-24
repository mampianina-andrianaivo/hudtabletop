export function serializeEncounter(enc: any) {
  if (!enc) return null;
  const formattedLines = Array.isArray(enc.lines)
    ? enc.lines.map((line: any) => {
        if (Array.isArray(line)) {
          return { actions: line };
        }
        return line;
      })
    : [];

  return {
    ...enc,
    lines: formattedLines,
    published: enc.published !== undefined ? enc.published : true,
    timestamp: enc.timestamp || Date.now()
  };
}

export function deserializeEncounter(enc: any) {
  if (!enc) return null;
  if (!Array.isArray(enc.lines)) return enc;

  const restoredLines = enc.lines.map((line: any) => {
    if (Array.isArray(line)) {
      return line;
    }
    if (line && typeof line === 'object' && Array.isArray(line.actions)) {
      return line.actions;
    }
    return [];
  });

  return {
    ...enc,
    lines: restoredLines
  };
}
