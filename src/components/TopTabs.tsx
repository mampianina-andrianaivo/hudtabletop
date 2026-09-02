import React from 'react';
import { TabType } from '../types';
import { Package, Wrench, Users, ShoppingCart, FileText, Settings, HelpCircle, BarChart2 } from 'lucide-react';

interface TopTabsProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface TabDef {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: 'produits', label: 'Prod.', icon: Package },
  { id: 'service', label: 'Serv.', icon: Wrench },
  { id: 'clients', label: 'Client', icon: Users },
  { id: 'vente', label: 'Vente', icon: ShoppingCart },
  { id: 'perf', label: 'Perf.', icon: BarChart2 },
  { id: 'aides', label: 'Aides', icon: HelpCircle },
  { id: 'parametres', label: 'Param.', icon: Settings },
];

export const TopTabs: React.FC<TopTabsProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav className="w-full h-[56px] min-h-[56px] bg-[#000000] border-b-0 flex items-center overflow-x-auto shrink-0 scrollbar-none px-0">
      <div className="flex items-center min-w-full h-full">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 min-w-[44px] h-[56px] flex flex-col items-center justify-center px-0.5 py-1 transition-none border-4 border-black box-border cursor-pointer ${
                isActive
                  ? 'bg-[#FFFFFF] text-[#000000] font-normal'
                  : 'bg-[#000000] text-[#FFFFFF] hover:bg-[#1a1a1a] font-normal'
              }`}
              title={tab.label}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="f-tab truncate mt-0.5 leading-none text-center w-full block whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
