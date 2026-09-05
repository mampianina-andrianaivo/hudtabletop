import React, { useState } from 'react';
import { Client } from '../types';
import { SubRibbon, ActionButtonDef } from './SubRibbon';
import { FCPWindow } from './FCPWindow';
import { Plus, Users } from 'lucide-react';
import { generateClientCode } from '../utils/storage';

interface ClientTabProps {
  clients: Client[];
  onSaveClient: (client: Client) => void;
  onArchiveClient: (id: string) => void;
  onRestoreClient: (id: string) => void;
}

export const ClientTab: React.FC<ClientTabProps> = ({
  clients,
  onSaveClient,
  onArchiveClient,
  onRestoreClient,
}) => {
  const [filter, setFilter] = useState<'actif' | 'archive'>('actif');
  const [isFCPOpen, setIsFCPOpen] = useState(false);
  const [isConfirmArchiveOpen, setIsConfirmArchiveOpen] = useState(false);
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [nom, setNom] = useState('');
  const [contact, setContact] = useState('');
  const [adresse, setAdresse] = useState('');
  const [remarque, setRemarque] = useState('');
  const [code, setCode] = useState('');

  const activeClients = clients.filter((c) => !c.isArchived);
  const archivedClients = clients.filter((c) => c.isArchived);
  const displayedClients = filter === 'actif' ? activeClients : archivedClients;

  const handleOpenNew = () => {
    const newCode = generateClientCode(clients);
    if (!newCode) {
      alert("Limite maximale atteinte (999Z). Création de client impossible.");
      return;
    }
    setEditingClient(null);
    setNom('');
    setContact('');
    setAdresse('');
    setRemarque('');
    setCode(newCode);
    setIsFCPOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setNom(c.nom);
    setContact(c.contact);
    setAdresse(c.adresse);
    setRemarque(c.description || '');
    setCode(c.code);
    setIsFCPOpen(true);
  };

  const handleValidate = () => {
    if (!nom.trim()) return;

    const finalCode = code || generateClientCode(clients);
    if (!finalCode) {
      alert("Limite maximale atteinte (999Z). Création de client impossible.");
      return;
    }

    const item: Client = {
      id: editingClient ? editingClient.id : `client_${Date.now()}`,
      code: finalCode,
      nom: nom.trim(),
      contact: contact.trim(),
      adresse: adresse.trim(),
      description: remarque.trim(),
      isArchived: editingClient ? editingClient.isArchived : false,
    };

    onSaveClient(item);
    setIsFCPOpen(false);
  };

  const handleArchive = () => {
    if (editingClient) {
      setIsConfirmArchiveOpen(true);
    } else {
      setIsFCPOpen(false);
    }
  };

  const activeCount = clients.filter((c) => !c.isArchived).length;
  const archivedCount = clients.filter((c) => c.isArchived).length;

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
      label: 'Client',
      icon: Plus,
      onClick: handleOpenNew,
    },
  ];

  const isFormValid = nom.trim().length > 0;
  const isArchived = editingClient?.isArchived ?? false;

  const hasChanges = editingClient
    ? (nom.trim() !== editingClient.nom ||
       contact.trim() !== editingClient.contact ||
       adresse.trim() !== editingClient.adresse ||
       remarque.trim() !== (editingClient.description || ''))
    : false;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF] relative">
      <SubRibbon buttons={subRibbonButtons} />

      {/* Main Working Canvas */}
      <div className="flex-1 p-3 bg-[#FFFFFF] tab-content-scroll">
        {displayedClients.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-neutral-500 gap-2">
            <Users className="w-10 h-10 opacity-40" />
            <span className="f-app">Aucun client {filter === 'actif' ? 'actif' : 'archivé'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedClients.map((c) => (
              <button
                key={c.id}
                onClick={() => handleOpenEdit(c)}
                type="button"
                className="h-[160px] bg-[#F0F0F0] p-2.5 flex flex-col justify-start items-start text-left hover:bg-[#E5E5E5] transition-none cursor-pointer group border-none relative w-full gap-0.5"
              >
                {/* Ligne 1 : Code Client (Gras) */}
                <span className={`f-app font-bold block truncate w-full leading-5 h-5 ${c.isArchived ? 'text-rose-600' : 'text-neutral-600'}`}>
                  {c.code}
                </span>

                {/* Ligne 2 : Nom Client (Gras) */}
                <span className="f-app text-[#000000] font-bold block truncate w-full leading-5 h-5">
                  {c.nom}
                </span>

                {/* Ligne 3 : Contact (pas gras) */}
                <span className="f-app text-neutral-600 flex items-center gap-1 w-full leading-5 h-5 font-normal">
                  {c.contact ? (
                    <>
                      <span className="text-neutral-600 font-bold shrink-0 select-none">└</span>
                      <span className="truncate">{c.contact}</span>
                    </>
                  ) : (
                    <span className="invisible select-none">&nbsp;</span>
                  )}
                </span>

                {/* Ligne 4 : Adresse (pas gras) */}
                <span className="f-app text-neutral-600 flex items-center gap-1 w-full leading-5 h-5 font-normal">
                  {c.adresse ? (
                    <>
                      <span className="text-neutral-600 font-bold shrink-0 select-none">└</span>
                      <span className="truncate">{c.adresse}</span>
                    </>
                  ) : (
                    <span className="invisible select-none">&nbsp;</span>
                  )}
                </span>

                {/* Ligne 5 : Description/Remarque (Gras) */}
                <span className="f-app text-[#000000] flex items-center gap-1 w-full leading-5 h-5 font-bold">
                  {c.description ? (
                    <>
                      <span className="text-neutral-600 font-bold shrink-0 select-none">└</span>
                      <span className="truncate">{c.description}</span>
                    </>
                  ) : (
                    <span className="invisible select-none">&nbsp;</span>
                  )}
                </span>

                {/* Ligne 6 : Bandelette archivée (espace toujours pré-réservé) */}
                <div className="w-full h-[24px] min-h-[24px] mt-auto shrink-0 flex items-center justify-center">
                  {c.isArchived ? (
                    <div className="w-full bg-[#000000] text-[#FFFFFF] f-app font-bold py-0.5 px-2 text-center uppercase tracking-wider h-[24px] flex items-center justify-center">
                      Archivé
                    </div>
                  ) : (
                    <div className="w-full h-[24px] bg-transparent" aria-hidden="true" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FCP Modal Window */}
      {isFCPOpen && (
        <FCPWindow
          title={editingClient ? `Client ${code}` : 'Nouveau Client'}
          validateLabel={editingClient ? 'Ok' : 'Valider'}
          cancelLabel={
            editingClient
              ? editingClient.isArchived
                ? 'Restituer'
                : 'Archiver'
              : 'X'
          }
          onValidate={handleValidate}
          onCancel={
            editingClient
              ? editingClient.isArchived
                ? () => {
                    setIsConfirmRestoreOpen(true);
                  }
                : handleArchive
              : () => setIsFCPOpen(false)
          }
          validateDisabled={!isFormValid}
          cancelIsRed={!!editingClient && !editingClient.isArchived}
          isEdit={!!editingClient}
          hasChanges={hasChanges}
          onCloseWithoutSaving={() => setIsFCPOpen(false)}
        >
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {/* Auto Code */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">Code Client (Auto)</label>
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
                Nom <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold outline-none border-none disabled:opacity-50"
              />
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-normal">Contact (Facultatif)</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none disabled:opacity-50"
              />
            </div>

            {/* Adresse */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-normal">Adresse (Facultatif)</label>
              <input
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none disabled:opacity-50"
              />
            </div>

            {/* Remarque */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-normal">Remarque (Facultatif)</label>
              <textarea
                rows={3}
                value={remarque}
                onChange={(e) => setRemarque(e.target.value)}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none resize-none disabled:opacity-50"
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
            if (editingClient) {
              onArchiveClient(editingClient.id);
            }
            setIsConfirmArchiveOpen(false);
            setIsFCPOpen(false);
          }}
          onCancel={() => setIsConfirmArchiveOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment archiver ce client ?
            </span>
            <span className="f-app text-neutral-600">
              Le client sera déplacé dans la liste des archivés.
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
            if (editingClient) {
              onRestoreClient(editingClient.id);
            }
            setIsConfirmRestoreOpen(false);
            setIsFCPOpen(false);
          }}
          onCancel={() => setIsConfirmRestoreOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment désarchiver ce client ?
            </span>
            <span className="f-app text-neutral-600">
              Le client sera replacé dans la liste des actifs.
            </span>
          </div>
        </FCPWindow>
      )}
    </div>
  );
};
