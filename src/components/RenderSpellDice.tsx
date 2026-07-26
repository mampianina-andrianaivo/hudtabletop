import React from 'react';
import { Spell, Stat } from '@/store/usePlayerStore';
import { evaluateSpellDice } from '@/lib/utils';

export function RenderSpellDice({ spell, playerStats, showUnknownResult }: { spell: Spell; playerStats?: Stat[]; showUnknownResult?: boolean }) {
  const evalResult = evaluateSpellDice(spell, playerStats);

  if (evalResult.statName === '●') {
    return <span className="font-mono text-white text-sm font-bold">●</span>;
  }

  if (evalResult.statName === '-const-') {
    return (
      <span className="bg-white text-black font-extrabold px-1.5 py-0.5 rounded text-[11px] sm:text-xs leading-none shadow-sm inline-block">
        {evalResult.val}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 font-mono text-xs sm:text-sm whitespace-nowrap">
      <span className="bg-white text-black font-extrabold px-1 py-0.5 rounded text-[11px] sm:text-xs uppercase leading-none shadow-sm">
        {evalResult.statInit}
      </span>
      <span className="text-white text-[11px] sm:text-xs font-bold">
        {evalResult.sign}{evalResult.val}
      </span>
      <span className="text-wow-gold text-xs font-bold">→</span>
      <span className="bg-white text-black font-extrabold px-1 py-0.5 rounded text-[11px] sm:text-xs leading-none shadow-sm">
        {showUnknownResult ? '?' : evalResult.effectiveD}
      </span>
    </div>
  );
}
