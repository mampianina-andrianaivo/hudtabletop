import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { SubRibbon, ActionButtonDef } from './SubRibbon';
import { FCPWindow } from './FCPWindow';
import { Save, AlertTriangle, CheckCheck, ArrowLeft } from 'lucide-react';

interface ParametresTabProps {
  settings: Settings;
  onSaveSettings: (settings: Settings) => void;
  onResetAllData: () => void;
}

export const ParametresTab: React.FC<ParametresTabProps> = ({ settings, onSaveSettings, onResetAllData }) => {
  const [orgNom, setOrgNom] = useState(settings.orgNom || '');
  const [contact, setContact] = useState(settings.contact || '');
  const [adresse, setAdresse] = useState(settings.adresse || '');
  const [information, setInformation] = useState(settings.information || '');
  const [currency, setCurrency] = useState(settings.currency || 'Ariary');
  const [decimalMode, setDecimalMode] = useState<'0' | '2'>(settings.decimalMode || '0');
  const [fontSize, setFontSize] = useState<'petit' | 'moyen' | 'grand'>(settings.fontSize || 'petit');
  const [isSaved, setIsSaved] = useState(false);
  const [isResetFCPOpen, setIsResetFCPOpen] = useState(false);

  useEffect(() => {
    setOrgNom(settings.orgNom || '');
    setContact(settings.contact || '');
    setAdresse(settings.adresse || '');
    setInformation(settings.information || '');
    setCurrency(settings.currency || 'Ariary');
    setDecimalMode(settings.decimalMode || '0');
    setFontSize(settings.fontSize || 'petit');
  }, [settings]);

  const handleSave = () => {
    const updated: Settings = {
      orgNom: orgNom.trim(),
      contact: contact.trim(),
      adresse: adresse.trim(),
      information: information.trim(),
      currency: currency.trim(),
      decimalMode,
      fontSize,
    };

    onSaveSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1000);
  };

  const subRibbonButtons: ActionButtonDef[] = [
    {
      id: 'save',
      label: isSaved ? 'Informations sauvegardées' : 'Sauvegarder',
      icon: Save,
      onClick: handleSave,
      color: 'gray',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF] relative">
      <SubRibbon buttons={subRibbonButtons} />

      {/* Main Working Canvas */}
      <div className="flex-1 p-3 max-w-md mx-auto w-full flex flex-col gap-4 bg-[#FFFFFF] tab-content-scroll">
        {/* Taille de Police */}
        <div className="bg-[#F0F0F0] p-3 flex flex-col gap-2">
          <label className="f-app text-[#000000] font-bold">Taille de police</label>
          <div className="flex bg-[#FFFFFF] p-1 gap-1">
            <button
              type="button"
              onClick={() => setFontSize('petit')}
              className={`flex-1 h-[36px] f-app font-bold border-none cursor-pointer flex items-center justify-center ${
                fontSize === 'petit' ? 'bg-[#222222] text-[#FFFFFF]' : 'bg-transparent text-[#000000] hover:bg-[#F0F0F0]'
              }`}
            >
              Petit
            </button>
            <button
              type="button"
              onClick={() => setFontSize('moyen')}
              className={`flex-1 h-[36px] f-app font-bold border-none cursor-pointer flex items-center justify-center ${
                fontSize === 'moyen' ? 'bg-[#222222] text-[#FFFFFF]' : 'bg-transparent text-[#000000] hover:bg-[#F0F0F0]'
              }`}
            >
              Moyen
            </button>
            <button
              type="button"
              onClick={() => setFontSize('grand')}
              className={`flex-1 h-[36px] f-app font-bold border-none cursor-pointer flex items-center justify-center ${
                fontSize === 'grand' ? 'bg-[#222222] text-[#FFFFFF]' : 'bg-transparent text-[#000000] hover:bg-[#F0F0F0]'
              }`}
            >
              Grand
            </button>
          </div>
        </div>

        {/* Nom Organisation */}
        <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
          <label className="f-app text-[#000000] font-normal">
            Nom d'organisation
          </label>
          <input
            type="text"
            value={orgNom}
            onChange={(e) => setOrgNom(e.target.value)}
            className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none"
          />
        </div>

        {/* Contact */}
        <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
          <label className="f-app text-[#000000] font-normal">
            Contact
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none"
          />
        </div>

        {/* Adresse */}
        <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
          <label className="f-app text-[#000000] font-normal">
            Adresse
          </label>
          <input
            type="text"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none"
          />
        </div>

        {/* Information */}
        <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
          <label className="f-app text-[#000000] font-normal">Autres précisions</label>
          <input
            type="text"
            value={information}
            onChange={(e) => setInformation(e.target.value)}
            className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none"
          />
        </div>

        {/* Unité Monétaire */}
        <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
          <label className="f-app text-[#000000] font-normal">Unité Monétaire</label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none"
          />
        </div>

        {/* Choix Unique Décimaux */}
        <div className="bg-[#F0F0F0] p-3 flex flex-col gap-2">
          <label className="f-app text-[#000000] font-bold">Format des Montants</label>
          
          <div className="flex flex-col gap-2 mt-1">
            <label className="flex items-center gap-3 bg-[#FFFFFF] p-2.5 cursor-pointer">
              <input
                type="radio"
                name="decimalMode"
                value="0"
                checked={decimalMode === '0'}
                onChange={() => setDecimalMode('0')}
                className="w-4 h-4 accent-black"
              />
              <span className="f-app text-[#000000] font-bold">0 décimal (Ex: 150)</span>
            </label>

            <label className="flex items-center gap-3 bg-[#FFFFFF] p-2.5 cursor-pointer">
              <input
                type="radio"
                name="decimalMode"
                value="2"
                checked={decimalMode === '2'}
                onChange={() => setDecimalMode('2')}
                className="w-4 h-4 accent-black"
              />
              <span className="f-app text-[#000000] font-bold">2 décimaux (Ex: 150,00)</span>
            </label>
          </div>
        </div>

        {/* Zone Dangereuse */}
        <div className="bg-rose-50 p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="f-app font-bold m-0">Zone dangereuse</h3>
          </div>
          <p className="f-app text-sm text-neutral-700 m-0 leading-relaxed">
            La suppression des données est irréversible. Toutes vos ventes, clients, produits et services seront effacés et les paramètres réinitialisés par défaut.
          </p>
          <button
            type="button"
            onClick={() => setIsResetFCPOpen(true)}
            className="h-[40px] bg-rose-600 hover:bg-rose-700 text-[#FFFFFF] font-bold f-app flex items-center justify-center border-none cursor-pointer w-full mt-1"
          >
            Supprimer les données
          </button>
        </div>
      </div>

      {/* FCP Confirmation de suppression */}
      {isResetFCPOpen && (
        <FCPWindow
          title="Supprimer les données ?"
          isEdit={true}
          hasChanges={true}
          onCloseWithoutSaving={() => setIsResetFCPOpen(false)}
          onValidate={() => {
            onResetAllData();
            setIsResetFCPOpen(false);
          }}
        >
          <div className="p-4 f-app text-neutral-800 text-center leading-relaxed">
            Êtes-vous sûr de vouloir supprimer <strong>absolument toutes vos données</strong> ?<br/><br/>
            Cette action est définitive et aucun retour en arrière n'est possible.
          </div>
        </FCPWindow>
      )}
    </div>
  );
};
