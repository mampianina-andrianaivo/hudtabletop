import React from 'react';

export interface ActionButtonDef {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  active?: boolean;
  color?: 'default' | 'green' | 'red' | 'blue' | 'gray';
  tabVariant?: 'actif' | 'archive';
}

interface SubRibbonProps {
  buttons: ActionButtonDef[];
}

export const SubRibbon: React.FC<SubRibbonProps> = ({ buttons }) => {
  return (
    <div className="w-full h-[45px] min-h-[45px] bg-[#D0D0D0] px-0 flex items-center shrink-0 overflow-x-auto scrollbar-none">
      {buttons.map((btn) => {
        const Icon = btn.icon;
        const isNouv = btn.id === 'nouv';
        const isSpecialAction = btn.color === 'gray';

        let colorClasses = '';
        if (isNouv) {
          colorClasses = 'bg-[#222222] text-[#FFFFFF] hover:bg-[#000000]';
        } else if (isSpecialAction) {
          colorClasses = 'bg-[#D0D0D0] text-[#000000] hover:bg-[#C8C8C8]';
        } else {
          if (btn.active) {
            colorClasses = 'bg-[#D0D0D0] text-[#000000]';
          } else {
            colorClasses = 'bg-[#D0D0D0] text-[#555555] hover:bg-[#C8C8C8]';
          }
        }

        return (
          <button
            key={btn.id}
            onClick={btn.onClick}
            type="button"
            className={`relative flex-1 min-w-[90px] h-[45px] shrink-0 flex items-center justify-center gap-1.5 px-2 f-tab cursor-pointer transition-none border-4 border-black box-border ${colorClasses}`}
          >
            {btn.active && (
              <>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-black" />
              </>
            )}
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0 z-10" />}
            <span className={`truncate z-10 ${isNouv || isSpecialAction ? 'font-bold' : 'font-normal'}`}>
              {btn.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};


