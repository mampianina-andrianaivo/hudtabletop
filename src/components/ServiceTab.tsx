import React, { useState } from 'react';
import { Service, Settings } from '../types';
import { SubRibbon, ActionButtonDef } from './SubRibbon';
import { FCPWindow } from './FCPWindow';
import { CheckCircle2, Archive, Plus, Wrench } from 'lucide-react';
import { generateServiceCode } from '../utils/storage';
import { formatPrice } from '../utils/format';

interface ServiceTabProps {
  services: Service[];
  settings: Settings;
  onSaveService: (service: Service) => void;
  onArchiveService: (id: string) => void;
  onRestoreService: (id: string) => void;
}

export const ServiceTab: React.FC<ServiceTabProps> = ({
  services,
  settings,
  onSaveService,
  onArchiveService,
  onRestoreService,
}) => {
  const [filter, setFilter] = useState<'actif' | 'archive'>('actif');
  const [isFCPOpen, setIsFCPOpen] = useState(false);
  const [isConfirmArchiveOpen, setIsConfirmArchiveOpen] = useState(false);
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [nom, setNom] = useState('');
  const [mesure, setMesure] = useState('');
  const [prixInt, setPrixInt] = useState('');
  const [prixDec, setPrixDec] = useState('00');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');

  const activeServices = services.filter((s) => !s.isArchived);
  const archivedServices = services.filter((s) => s.isArchived);
  const displayedServices = filter === 'actif' ? activeServices : archivedServices;

  const handleOpenNew = () => {
    const newCode = generateServiceCode(services);
    if (!newCode) {
      alert("Limite maximale atteinte (999Z). Création de service impossible.");
      return;
    }
    setEditingService(null);
    setNom('');
    setMesure('');
    setPrixInt('');
    setPrixDec('00');
    setDescription('');
    setCode(newCode);
    setIsFCPOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditingService(s);
    setNom(s.nom);
    setMesure(s.mesure || '');
    setPrixInt(s.prixInt);
    setPrixDec(s.prixDec || '00');
    setDescription(s.description || '');
    setCode(s.code);
    setIsFCPOpen(true);
  };

  const handleValidate = () => {
    if (!nom.trim() || !prixInt.trim()) return;

    const finalCode = code || generateServiceCode(services);
    if (!finalCode) {
      alert("Limite maximale atteinte (999Z). Création de service impossible.");
      return;
    }

    const rawPrixInt = prixInt.replace(/\D/g, '');
    const normalizedPrixInt = String(parseInt(rawPrixInt, 10) || 0);

    const item: Service = {
      id: editingService ? editingService.id : `srv_${Date.now()}`,
      code: finalCode,
      nom: nom.trim(),
      mesure: mesure.trim(),
      prixInt: normalizedPrixInt,
      prixDec: settings.decimalMode === '2' ? (prixDec.replace(/\D/g, '') || '00').slice(0, 2).padEnd(2, '0') : '00',
      description: description.trim(),
      isArchived: editingService ? editingService.isArchived : false,
    };

    onSaveService(item);
    setIsFCPOpen(false);
  };

  const handleArchive = () => {
    if (editingService) {
      setIsConfirmArchiveOpen(true);
    } else {
      setIsFCPOpen(false);
    }
  };

  const activeCount = services.filter((s) => !s.isArchived).length;
  const archivedCount = services.filter((s) => s.isArchived).length;

  const subRibbonButtons: ActionButtonDef[] = [
    {
      id: 'actifs',
      label: `Actifs (${activeCount})`,
      onClick: () => setFilter('actif'),
      active: filter === 'actif',
    },
    {
      id: 'archives',
      label: `Archivés (${archivedCount})`,
      onClick: () => setFilter('archive'),
      active: filter === 'archive',
    },
    {
      id: 'nouv',
      label: 'Service',
      icon: Plus,
      onClick: handleOpenNew,
    },
  ];

  const isPriceZero = (parseInt(prixInt, 10) || 0) === 0 && (parseInt(prixDec, 10) || 0) === 0;
  const isFormValid = nom.trim().length > 0 && mesure.trim().length > 0 && !isPriceZero;
  const isArchived = editingService?.isArchived ?? false;

  const hasChanges = editingService
    ? (nom.trim() !== editingService.nom ||
       mesure.trim() !== (editingService.mesure || '') ||
       (parseInt(prixInt, 10) || 0) !== (parseInt(editingService.prixInt, 10) || 0) ||
       (parseInt(prixDec, 10) || 0) !== (parseInt(editingService.prixDec, 10) || 0) ||
       description.trim() !== (editingService.description || ''))
    : false;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF] relative">
      <SubRibbon buttons={subRibbonButtons} />

      {/* Main Working Canvas */}
      <div className="flex-1 p-3 bg-[#FFFFFF] tab-content-scroll">
        {displayedServices.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-neutral-500 gap-2">
            <Wrench className="w-10 h-10 opacity-40" />
            <span className="f-app">Aucun service {filter === 'actif' ? 'actif' : 'archivé'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedServices.map((s) => {
              const priceDisplay = formatPrice(s.prixInt, s.prixDec, settings.decimalMode);

              return (
                <button
                  key={s.id}
                  onClick={() => handleOpenEdit(s)}
                  type="button"
                  className="min-h-[145px] bg-[#F0F0F0] p-3 flex flex-col justify-between items-start text-left hover:bg-[#E5E5E5] transition-none cursor-pointer group border-none relative overflow-hidden"
                >
                  <div className="w-full flex-1 flex flex-col justify-start overflow-hidden">
                    <span className={`f-app font-bold block truncate w-full leading-tight ${s.isArchived ? 'text-rose-600' : 'text-neutral-600'}`}>{s.code}</span>
                    <span className="f-app text-[#000000] font-bold block truncate w-full mt-1 leading-tight">
                      {s.nom}
                    </span>
                    {s.mesure && (
                      <span className="f-app text-[#000000] block truncate w-full mt-0.5 leading-tight">
                        {s.mesure}
                      </span>
                    )}
                    <div className="w-full text-right mt-auto pt-1">
                      <span className="f-app text-[#000000] font-bold block truncate w-full">{priceDisplay}</span>
                    </div>
                  </div>

                  {/* Reserved bottom slot for archive label on all tiles */}
                  <div className="w-full h-[24px] min-h-[24px] mt-2 shrink-0 flex items-center justify-center">
                    {s.isArchived ? (
                      <div className="w-full bg-[#000000] text-[#FFFFFF] f-app font-bold py-0.5 px-2 text-center uppercase tracking-wider h-[24px] flex items-center justify-center">
                        Archivé
                      </div>
                    ) : (
                      <div className="w-full h-[24px] bg-transparent" aria-hidden="true" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FCP Modal Window */}
      {isFCPOpen && (
        <FCPWindow
          title={editingService ? `Service ${code}` : 'Nouveau Service'}
          validateLabel={editingService ? 'Ok' : 'Valider'}
          cancelLabel={
            editingService
              ? editingService.isArchived
                ? 'Restituer'
                : 'Archiver'
              : 'X'
          }
          onValidate={handleValidate}
          onCancel={
            editingService
              ? editingService.isArchived
                ? () => {
                    setIsConfirmRestoreOpen(true);
                  }
                : handleArchive
              : () => setIsFCPOpen(false)
          }
          validateDisabled={!isFormValid}
          cancelIsRed={!!editingService && !editingService.isArchived}
          isEdit={!!editingService}
          hasChanges={hasChanges}
          onCloseWithoutSaving={() => setIsFCPOpen(false)}
        >
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {/* Auto Code */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">Code Service (Auto)</label>
              <input
                type="text"
                value={code}
                readOnly
                className="bg-[#D0D0D0] text-[#333333] px-3 py-2 f-app font-bold cursor-not-allowed outline-none border-none"
              />
            </div>

            {/* Nom */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">
                Nom du Service <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold outline-none border-none disabled:opacity-50"
              />
            </div>

            {/* Mesure */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">
                Mesure <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={mesure}
                onChange={(e) => setMesure(e.target.value)}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold outline-none border-none disabled:opacity-50"
              />
            </div>

            {/* Prix */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">
                Prix <span className="text-rose-600">*</span>
              </label>

              {settings.decimalMode === '2' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={prixInt}
                    onChange={(e) => setPrixInt(e.target.value.replace(/\D/g, ''))}
                    disabled={isArchived}
                    className="flex-1 bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold text-right outline-none border-none disabled:opacity-50"
                  />
                  <span className="f-app font-bold text-[#000000]">,</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={prixDec}
                    onChange={(e) => setPrixDec(e.target.value.replace(/\D/g, ''))}
                    disabled={isArchived}
                    className="w-16 bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold text-center outline-none border-none disabled:opacity-50"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  value={prixInt}
                  onChange={(e) => setPrixInt(e.target.value.replace(/\D/g, ''))}
                  disabled={isArchived}
                  className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold text-right outline-none border-none disabled:opacity-50"
                />
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-normal">Description (Facultatif)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none resize-none border-none disabled:opacity-50"
              />
            </div>
          </div>
        </FCPWindow>
      )}

      {/* Confirmation FCP for Archiving */}
      {isConfirmArchiveOpen && (
        <FCPWindow
          title="Confirmation"
          validateLabel="Confirmer"
          validateIsGreen={true}
          cancelLabel="Non"
          onValidate={() => {
            if (editingService) {
              onArchiveService(editingService.id);
            }
            setIsConfirmArchiveOpen(false);
            setIsFCPOpen(false);
          }}
          onCancel={() => setIsConfirmArchiveOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment archiver ce service ?
            </span>
            <span className="f-app text-neutral-600">
              Le service sera déplacé dans la liste des archivés.
            </span>
          </div>
        </FCPWindow>
      )}

      {/* Confirmation FCP for Restoring */}
      {isConfirmRestoreOpen && (
        <FCPWindow
          title="Confirmation"
          validateLabel="Confirmer"
          cancelLabel="Non"
          onValidate={() => {
            if (editingService) {
              onRestoreService(editingService.id);
            }
            setIsConfirmRestoreOpen(false);
            setIsFCPOpen(false);
          }}
          onCancel={() => setIsConfirmRestoreOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment désarchiver ce service ?
            </span>
            <span className="f-app text-neutral-600">
              Le service sera replacé dans la liste des actifs.
            </span>
          </div>
        </FCPWindow>
      )}
    </div>
  );
};
