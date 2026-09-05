import React, { useState } from 'react';
import { Produit, Settings } from '../types';
import { SubRibbon, ActionButtonDef } from './SubRibbon';
import { FCPWindow } from './FCPWindow';
import { Plus, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { generateProduitCode } from '../utils/storage';
import { formatPrice, splitPrice } from '../utils/format';

interface ProduitTabProps {
  produits: Produit[];
  settings: Settings;
  onSaveProduit: (produit: Produit) => void;
  onArchiveProduit: (id: string) => void;
  onRestoreProduit: (id: string) => void;
}

export const ProduitTab: React.FC<ProduitTabProps> = ({
  produits,
  settings,
  onSaveProduit,
  onArchiveProduit,
  onRestoreProduit,
}) => {
  const [filter, setFilter] = useState<'actif' | 'archive'>('actif');
  const [isFCPOpen, setIsFCPOpen] = useState(false);
  const [isConfirmArchiveOpen, setIsConfirmArchiveOpen] = useState(false);
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);

  // Form State
  const [nom, setNom] = useState('');
  const [mesure, setMesure] = useState('');
  const [prixInt, setPrixInt] = useState('');
  const [prixDec, setPrixDec] = useState('00');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [stockInt, setStockInt] = useState('00000');
  const [stockDec, setStockDec] = useState('00');

  const activeProduits = produits.filter((p) => !p.isArchived);
  const archivedProduits = produits.filter((p) => p.isArchived);
  const displayedProduits = filter === 'actif' ? activeProduits : archivedProduits;

  const handleOpenNew = () => {
    const newCode = generateProduitCode(produits);
    if (!newCode) {
      alert("Limite maximale atteinte (999Z). Création de produit impossible.");
      return;
    }
    setEditingProduit(null);
    setNom('');
    setMesure('');
    setPrixInt('');
    setPrixDec('00');
    setDescription('');
    setStockInt('00000');
    setStockDec('00');
    setCode(newCode);
    setIsFCPOpen(true);
  };

  const handleOpenEdit = (p: Produit) => {
    setEditingProduit(p);
    setNom(p.nom);
    setMesure(p.mesure || '');
    setPrixInt(p.prixInt);
    setPrixDec(p.prixDec || '00');
    setDescription(p.description || '');
    setStockInt(p.stockInt || '00000');
    setStockDec(p.stockDec || '00');
    setCode(p.code);
    setIsFCPOpen(true);
  };

  const handleValidate = () => {
    if (!nom.trim() || !prixInt.trim()) return;

    const finalCode = code || generateProduitCode(produits);
    if (!finalCode) {
      alert("Limite maximale atteinte (999Z). Création de produit impossible.");
      return;
    }

    const rawPrixInt = prixInt.replace(/\D/g, '');
    const normalizedPrixInt = String(parseInt(rawPrixInt, 10) || 0);

    const item: Produit = {
      id: editingProduit ? editingProduit.id : `prod_${Date.now()}`,
      code: finalCode,
      nom: nom.trim(),
      mesure: mesure.trim(),
      prixInt: normalizedPrixInt,
      prixDec: settings.decimalMode === '2' ? (prixDec.replace(/\D/g, '') || '00').slice(0, 2).padEnd(2, '0') : '00',
      stockInt: stockInt || '00000',
      stockDec: stockDec || '00',
      description: description.trim(),
      isArchived: editingProduit ? editingProduit.isArchived : false,
    };

    onSaveProduit(item);
    setIsFCPOpen(false);
  };

  const handleArchive = () => {
    if (editingProduit) {
      setIsConfirmArchiveOpen(true);
    } else {
      setIsFCPOpen(false);
    }
  };

  const activeCount = produits.filter((p) => !p.isArchived).length;
  const archivedCount = produits.filter((p) => p.isArchived).length;

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
      label: 'Produit',
      icon: Plus,
      onClick: handleOpenNew,
    },
  ];

  const isPriceZero = (parseInt(prixInt, 10) || 0) === 0 && (parseInt(prixDec, 10) || 0) === 0;
  const isFormValid = nom.trim().length > 0 && mesure.trim().length > 0 && !isPriceZero;
  const isArchived = editingProduit?.isArchived ?? false;

  const hasChanges = editingProduit
    ? (nom.trim() !== editingProduit.nom ||
       mesure.trim() !== (editingProduit.mesure || '') ||
       (parseInt(prixInt, 10) || 0) !== (parseInt(editingProduit.prixInt, 10) || 0) ||
       (parseInt(prixDec, 10) || 0) !== (parseInt(editingProduit.prixDec, 10) || 0) ||
       description.trim() !== (editingProduit.description || ''))
    : false;

  const handleStockChange = (type: 'int' | 'dec', index: number, direction: 1 | -1) => {
    if (isArchived) return;
    let newStockInt = stockInt;
    let newStockDec = stockDec;
    if (type === 'int') {
      const arr = stockInt.split('');
      let val = parseInt(arr[index], 10);
      val += direction;
      if (val > 9) val = 0;
      if (val < 0) val = 9;
      arr[index] = val.toString();
      newStockInt = arr.join('');
      setStockInt(newStockInt);
    } else {
      const arr = stockDec.split('');
      let val = parseInt(arr[index], 10);
      val += direction;
      if (val > 9) val = 0;
      if (val < 0) val = 9;
      arr[index] = val.toString();
      newStockDec = arr.join('');
      setStockDec(newStockDec);
    }

    if (editingProduit) {
      const updatedProduit = {
        ...editingProduit,
        stockInt: newStockInt,
        stockDec: newStockDec,
      };
      setEditingProduit(updatedProduit);
      onSaveProduit(updatedProduit);
    }
  };

  const isLeadingZeroInt = (index: number) => {
    for (let i = 0; i < index; i++) {
      if (stockInt[i] !== '0') return false;
    }
    return stockInt[index] === '0';
  };

  const isTrailingZeroDec = (index: number) => {
    for (let i = stockDec.length - 1; i > index; i--) {
      if (stockDec[i] !== '0') return false;
    }
    return stockDec[index] === '0';
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF] relative">
      <SubRibbon buttons={subRibbonButtons} />

      {/* Main Working Area */}
      <div className="flex-1 p-3 bg-[#FFFFFF] tab-content-scroll">
        {displayedProduits.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-neutral-500 gap-2">
            <Package className="w-10 h-10 opacity-40" />
            <span className="f-app">Aucun produit {filter === 'actif' ? 'actif' : 'archivé'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedProduits.map((p) => {
              const priceParts = splitPrice(p.prixInt, p.prixDec, settings.decimalMode);
              const isStockZero = (parseInt(p.stockInt, 10) || 0) === 0 && (parseInt(p.stockDec, 10) || 0) === 0;

              return (
                <button
                  key={p.id}
                  onClick={() => handleOpenEdit(p)}
                  type="button"
                  className="h-[160px] bg-[#F0F0F0] p-2.5 flex flex-col justify-start items-start text-left hover:bg-[#E5E5E5] transition-none cursor-pointer group border-none relative w-full gap-0.5"
                >
                  {/* Ligne 1 : Code Produit (Gras) */}
                  <span className={`f-app font-bold block truncate w-full leading-5 h-5 ${p.isArchived ? 'text-rose-600' : 'text-neutral-600'}`}>
                    {p.code}
                  </span>

                  {/* Ligne 2 : Nom du Produit (Gras) */}
                  <span className="f-app text-[#000000] font-bold block truncate w-full leading-5 h-5">
                    {p.nom}
                  </span>

                  {/* Ligne 3 : Titre Stock indicatif (pas gras) */}
                  <span className="f-app text-neutral-600 block truncate w-full leading-5 h-5 font-normal">
                    {isStockZero ? <span className="invisible select-none">Stock indicatif</span> : 'Stock indicatif'}
                  </span>

                  {/* Ligne 4 : Valeur Stock + Mesure (pas gras) */}
                  <span className="f-app text-neutral-600 flex items-center gap-1 w-full leading-5 h-5 font-normal">
                    {isStockZero ? (
                      p.mesure ? (
                        <>
                          <span className="text-neutral-600 font-bold shrink-0 select-none">└</span>
                          <span className="truncate">{p.mesure}</span>
                        </>
                      ) : (
                        <span className="invisible select-none">&nbsp;</span>
                      )
                    ) : (
                      <>
                        <span className="text-neutral-600 font-bold shrink-0 select-none">└</span>
                        <span className="truncate">
                          {p.stockInt ? Number(p.stockInt).toLocaleString('fr-FR') : '0'},
                          <span className="text-[0.75em]">{(p.stockDec || '00').padEnd(2, '0').slice(0, 2)}</span>
                          {p.mesure ? ` ${p.mesure}` : ''}
                        </span>
                      </>
                    )}
                  </span>

                  {/* Ligne 5 : Prix aligné à droite (Gras) */}
                  <div className="w-full text-right leading-5 h-5">
                    <span className="f-app text-[#000000] font-bold block truncate w-full">
                      {priceParts.intPart}
                      {priceParts.decPart !== undefined && (
                        <>
                          ,
                          <span className="text-[0.75em]">{priceParts.decPart}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Ligne 6 : Bandelette archivée/annulée (espace toujours pré-réservé) */}
                  <div className="w-full h-[24px] min-h-[24px] mt-auto shrink-0 flex items-center justify-center">
                    {p.isArchived ? (
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
          title={editingProduit ? `Produit ${code}` : 'Nouveau Produit'}
          validateLabel={editingProduit ? 'Ok' : 'Valider'}
          cancelLabel={
            editingProduit
              ? editingProduit.isArchived
                ? 'Restituer'
                : 'Archiver'
              : 'X'
          }
          onValidate={handleValidate}
          onCancel={
            editingProduit
              ? editingProduit.isArchived
                ? () => {
                    setIsConfirmRestoreOpen(true);
                  }
                : handleArchive
              : () => setIsFCPOpen(false)
          }
          validateDisabled={!isFormValid}
          cancelIsRed={!!editingProduit && !editingProduit.isArchived}
          isEdit={!!editingProduit}
          hasChanges={hasChanges}
          onCloseWithoutSaving={() => setIsFCPOpen(false)}
        >
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {/* Auto Code */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">Code Produit (Auto)</label>
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
                Nom du Produit <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold outline-none border-none disabled:opacity-50"
              />
            </div>

            {/* Mesure et Prix côte à côte */}
            <div className="grid grid-cols-2 gap-3 items-end">
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
                  className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold outline-none border-none disabled:opacity-50 w-full"
                />
              </div>

              {/* Prix avec * avant Prix et aligné à droite */}
              <div className="flex flex-col gap-1">
                <label className="f-app text-[#000000] font-bold text-right">
                  <span className="text-rose-600">*</span> Prix
                </label>

                {settings.decimalMode === '2' ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prixInt}
                      onChange={(e) => setPrixInt(e.target.value.replace(/\D/g, ''))}
                      disabled={isArchived}
                      className="flex-1 min-w-0 bg-[#FFFFFF] text-[#000000] px-2 py-2 f-app font-bold text-right outline-none border-none disabled:opacity-50"
                    />
                    <span className="f-app font-bold text-[#000000]">,</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={prixDec}
                      onChange={(e) => setPrixDec(e.target.value.replace(/\D/g, ''))}
                      disabled={isArchived}
                      className="w-12 bg-[#FFFFFF] text-[#000000] px-1 py-2 f-app font-bold text-center outline-none border-none disabled:opacity-50 shrink-0"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={prixInt}
                    onChange={(e) => setPrixInt(e.target.value.replace(/\D/g, ''))}
                    disabled={isArchived}
                    className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold text-right outline-none border-none disabled:opacity-50 w-full"
                  />
                )}
              </div>
            </div>

            {/* Description (1 ligne pour économiser de l'espace) */}
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-normal">Description (Facultatif)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isArchived}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none disabled:opacity-50"
              />
            </div>

            {/* Stock Indicatif */}
            <div className="mt-2 w-full flex justify-center overflow-x-auto scrollbar-none pb-2">
              <div className="flex items-end gap-1">
                {/* Integer Part with Label */}
                <div className="flex flex-col items-center gap-1">
                  <label className="f-app text-[#000000] font-bold">Stock Indicatif</label>
                  <div className="flex items-center gap-1">
                    {/* 5 digits integer */}
                    {stockInt.split('').map((digit, i) => (
                      <div key={`int-${i}`} className="flex flex-col items-center">
                        <button
                          type="button"
                          disabled={isArchived}
                          onClick={() => handleStockChange('int', i, 1)}
                          className="w-[40px] h-[44px] flex items-center justify-center bg-[#D0D0D0] hover:bg-[#C8C8C8] border-none cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <ChevronUp className="w-5 h-5 text-black shrink-0" />
                        </button>
                        <div className={`w-[40px] h-[44px] flex items-center justify-center bg-[#FFFFFF] text-3xl font-bold font-mono shrink-0 ${isLeadingZeroInt(i) ? 'text-neutral-300' : 'text-[#000000]'}`}>
                          {digit}
                        </div>
                        <button
                          type="button"
                          disabled={isArchived}
                          onClick={() => handleStockChange('int', i, -1)}
                          className="w-[40px] h-[44px] flex items-center justify-center bg-[#D0D0D0] hover:bg-[#C8C8C8] border-none cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <ChevronDown className="w-5 h-5 text-black shrink-0" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Separator */}
                <div className="flex flex-col items-center justify-center h-[132px] px-0.5 shrink-0">
                  <span className="text-4xl font-bold text-[#000000] leading-none shrink-0 translate-y-1">,</span>
                </div>

                {/* 2 digits decimal */}
                <div className="flex items-center gap-1">
                  {stockDec.split('').map((digit, i) => (
                    <div key={`dec-${i}`} className="flex flex-col items-center">
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => handleStockChange('dec', i, 1)}
                        className="w-[40px] h-[44px] flex items-center justify-center bg-[#D0D0D0] hover:bg-[#C8C8C8] border-none cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <ChevronUp className="w-5 h-5 text-black shrink-0" />
                      </button>
                      <div className={`w-[40px] h-[44px] flex items-center justify-center bg-[#FFFFFF] text-3xl font-bold font-mono shrink-0 ${isTrailingZeroDec(i) ? 'text-neutral-300' : 'text-[#000000]'}`}>
                        {digit}
                      </div>
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => handleStockChange('dec', i, -1)}
                        className="w-[40px] h-[44px] flex items-center justify-center bg-[#D0D0D0] hover:bg-[#C8C8C8] border-none cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <ChevronDown className="w-5 h-5 text-black shrink-0" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
            if (editingProduit) {
              onArchiveProduit(editingProduit.id);
            }
            setIsConfirmArchiveOpen(false);
            setIsFCPOpen(false);
          }}
          onCancel={() => setIsConfirmArchiveOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment archiver ce produit ?
            </span>
            <span className="f-app text-neutral-600">
              Le produit sera déplacé dans la liste des archivés.
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
            if (editingProduit) {
              onRestoreProduit(editingProduit.id);
            }
            setIsConfirmRestoreOpen(false);
            setIsFCPOpen(false);
          }}
          onCancel={() => setIsConfirmRestoreOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment désarchiver ce produit ?
            </span>
            <span className="f-app text-neutral-600">
              Le produit sera replacé dans la liste des actifs.
            </span>
          </div>
        </FCPWindow>
      )}
    </div>
  );
};
