import React from 'react';
import * as Icons from 'lucide-react';

export const GMIconCategories: Record<string, string[]> = {
  'Magic & Elements': [
    'Wand', 'Flame', 'Droplet', 'Zap', 'Wind', 'Snowflake', 'Sparkles', 'Sparkle',
    'CloudLightning', 'Waves', 'FlaskConical', 'FlaskRound', 'Hourglass', 'Infinity',
    'Atom', 'Sun', 'Moon', 'Star', 'Cloud', 'CloudRain', 'CloudSnow'
  ],
  'Combat & Defense': [
    'Sword', 'Swords', 'Shield', 'Axe', 'Hammer', 'Crosshair', 'Target', 'Skull',
    'Ghost', 'Bone', 'ShieldAlert', 'ShieldCheck', 'ShieldX', 'ShieldQuestion',
    'HeartCrack', 'Anchor', 'Feather'
  ],
  'Gear & Treasure': [
    'Scroll', 'BookOpen', 'Book', 'Compass', 'Map', 'Key', 'Lock', 'Unlock',
    'Coins', 'Gem', 'Crown', 'Trophy', 'Medal', 'MapPin', 'Flag', 'Binoculars',
    'Gift', 'Bell', 'Lightbulb', 'ShoppingBag', 'Briefcase', 'Scale'
  ],
  'Nature & Environment': [
    'Mountain', 'TreePine', 'TreeDeciduous', 'Leaf', 'Sprout', 'Flower',
    'Flower2', 'Campfire', 'Tent', 'Globe', 'SunSnow'
  ],
  'Creatures & Wildlife': [
    'Bug', 'Fish', 'Bird', 'Cat', 'Dog', 'Rabbit', 'Snail', 'Turtle', 'Spider',
    'PawPrint'
  ],
  'Status & Alchemy': [
    'Eye', 'Heart', 'Brain', 'Smile', 'Frown', 'Angry', 'Dizzy', 'Activity',
    'Hand', 'Fingerprint', 'Timer', 'Watch', 'Clock', 'Glasses', 'Beer',
    'GlassWater', 'Wine', 'Coffee', 'Apple', 'Utensils'
  ]
};

export const GMIcons = Object.values(GMIconCategories).flat();

export function getAbilityColorClass(color?: string) {
  if (color === 'purple') return 'text-purple-400';
  if (color === 'rose') return 'text-rose-400';
  return 'text-wow-gold';
}

export function getAbilityTagClass(color?: string) {
  if (color === 'purple') return 'text-purple-300 bg-purple-500/20 border-purple-400/40';
  if (color === 'rose') return 'text-rose-300 bg-rose-500/20 border-rose-400/40';
  return 'text-wow-gold bg-wow-gold/20 border-wow-gold/40';
}

interface IconPickerProps {
  value: string;
  color?: string;
  onChange: (icon: string) => void;
  onClose: () => void;
}

export function IconPicker({ value, color, onChange, onClose }: IconPickerProps) {
  const colorClass = getAbilityColorClass(color);
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-wow-dark border-2 border-[#5a4b3c] p-5 rounded shadow-2xl w-full max-w-2xl flex flex-col h-[550px]">
        <h4 className="font-cinzel text-wow-gold mb-4 text-center text-lg">Select Icon</h4>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
          {Object.entries(GMIconCategories).map(([category, icons]) => (
            <div key={category} className="flex flex-col gap-2">
              <h5 className="font-cinzel text-xs text-wow-gold/70 border-b border-[#5a4b3c]/40 pb-1 uppercase tracking-wider">{category}</h5>
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                {icons.map((iconName) => {
                  // @ts-ignore
                  const IconComponent = Icons[iconName] || Icons.HelpCircle;
                  return (
                    <button
                      key={iconName}
                      onClick={() => { onChange(iconName); onClose(); }}
                      className={`p-2 rounded hover:bg-white/10 flex items-center justify-center transition-all ${value === iconName ? 'bg-white/20 ring-1 ring-wow-gold' : 'bg-black/20 border border-[#5a4b3c]/20'}`}
                      title={iconName}
                    >
                      <IconComponent size={22} className={colorClass} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-end border-t border-[#5a4b3c]/40 pt-4">
          <button onClick={onClose} className="wow-button px-6 py-2 text-sm w-28 flex justify-center items-center">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function RenderGMIcon({ iconName, size = 18, color }: { iconName: string, size?: number, color?: string }) {
  // @ts-ignore
  const IconComponent = Icons[iconName] || Icons.HelpCircle;
  const colorClass = getAbilityColorClass(color);
  return <IconComponent size={size} className={colorClass} />;
}
