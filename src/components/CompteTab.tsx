import React, { useState } from 'react';
import { SubRibbon, ActionButtonDef } from './SubRibbon';
import { FCPWindow } from './FCPWindow';
import { Shield, Info, LogOut } from 'lucide-react';
import { SoutenirBlock, FonctionnalitesContent, ConditionsContent } from './InfoTexts';

interface CompteTabProps {
  onLogout?: () => void;
}

export const CompteTab: React.FC<CompteTabProps> = ({ onLogout }) => {
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
            <span className="f-app text-neutral-600">
              Une sauvegarde finale de sécurité sera effectuée avant la déconnexion. Les données locales seront effacées.
            </span>
          </div>
        </FCPWindow>
      )}
    </div>
  );
};
