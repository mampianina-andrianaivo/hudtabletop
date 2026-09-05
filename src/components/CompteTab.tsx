import React, { useState } from 'react';
import { SubRibbon, ActionButtonDef } from './SubRibbon';
import { FCPWindow } from './FCPWindow';
import { Shield, Info, LogOut } from 'lucide-react';
import { SoutenirBlock, FonctionnalitesContent, ConditionsContent } from './InfoTexts';

interface CompteTabProps {
  onLogout?: () => void;
  userEmail?: string;
}

export const CompteTab: React.FC<CompteTabProps> = ({ onLogout, userEmail }) => {
  const [activeZone, setActiveZone] = useState<'fonctionnalites' | 'conditions'>('fonctionnalites');
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);

  const subRibbonButtons: ActionButtonDef[] = [
    {
      id: 'fonctionnalites',
      label: 'Fonctionnalités',
      icon: Info,
      onClick: () => setActiveZone('fonctionnalites'),
      active: activeZone === 'fonctionnalites',
    },
    {
      id: 'conditions',
      label: 'Conditions',
      icon: Shield,
      onClick: () => setActiveZone('conditions'),
      active: activeZone === 'conditions',
    }
  ];

  if (onLogout) {
    subRibbonButtons.push({
      id: 'nouv', // Used to trigger the black button style in SubRibbon
      label: 'Déconnexion',
      icon: LogOut,
      onClick: () => setIsConfirmLogoutOpen(true),
    });
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FFFFFF] relative overflow-hidden">
      <SubRibbon buttons={subRibbonButtons} />

      <div className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4 tab-content-scroll overflow-y-auto">
        {userEmail && (
          <div className="text-black font-bold text-sm tracking-wide py-0.5 truncate">
            {userEmail}
          </div>
        )}

        <SoutenirBlock />

        {activeZone === 'fonctionnalites' && <FonctionnalitesContent />}
        {activeZone === 'conditions' && <ConditionsContent />}
      </div>

      {isConfirmLogoutOpen && (
        <FCPWindow
          title="Déconnexion"
          validateLabel="Confirmer"
          cancelLabel="Non"
          onValidate={() => {
            if (onLogout) onLogout();
            setIsConfirmLogoutOpen(false);
          }}
          onCancel={() => setIsConfirmLogoutOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment vous déconnecter ?
            </span>
            {userEmail && (
              <span className="f-app text-neutral-800 font-bold bg-[#F0F0F0] py-2 px-3 rounded-md mt-1 mb-1 border border-neutral-300">
                {userEmail}
              </span>
            )}
            <span className="f-app text-neutral-600">
              Une sauvegarde finale de sécurité sera effectuée avant la déconnexion. Les données locales seront effacées.
            </span>
          </div>
        </FCPWindow>
      )}
    </div>
  );
};
