import React, { useState } from 'react';
import { CartItem, Client, Produit, Sale, Service, Settings } from '../types';
import { ActionButtonDef, SubRibbon } from './SubRibbon';
import { FCPWindow } from './FCPWindow';
import { Plus, ShoppingCart, User, Package, Wrench, RefreshCw, Trash2, ArrowLeft, CheckCheck } from 'lucide-react';
import { generateVenteCode } from '../utils/storage';
import { formatPrice, formatNumberAmount, formatAmountString, formatIntWithThousands, splitAmountString } from '../utils/format';
import { generateInvoicePDF } from '../utils/pdf';

interface VenteTabProps {
  ventes: Sale[];
  produits: Produit[];
  services: Service[];
  clients: Client[];
  settings: Settings;
  onSaveVente: (vente: Sale) => void;
  onCancelVente: (id: string) => void;
  onRestoreVente: (id: string) => void;
}

export const VenteTab: React.FC<VenteTabProps> = ({
  ventes,
  produits,
  services,
  clients,
  settings,
  onSaveVente,
  onCancelVente,
  onRestoreVente,
}) => {
  const [filter, setFilter] = useState<'active' | 'annule'>('active');
  const [selectedDetailSale, setSelectedDetailSale] = useState<Sale | null>(null);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  
  // Invoice FCP State
  const [isInvoiceFCPOpen, setIsInvoiceFCPOpen] = useState(false);
  const [invoiceTitre, setInvoiceTitre] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceInstructions, setInvoiceInstructions] = useState('');

  // Main Sale FCP
  const [isNewVenteFCPOpen, setIsNewVenteFCPOpen] = useState(false);
  const [saleCode, setSaleCode] = useState('');

  // Selected Client State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientHorsListe, setClientHorsListe] = useState<{ nom: string; contact: string; adresse: string } | null>(null);

  // Sub-FCPs for Client selection
  const [isSelectingClientFCP, setIsSelectingClientFCP] = useState(false);
  const [isClientHorsListeFCP, setIsClientHorsListeFCP] = useState(false);
  
  // Hors liste form fields
  const [hlNom, setHlNom] = useState('');
  const [hlContact, setHlContact] = useState('');
  const [hlAdresse, setHlAdresse] = useState('');

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Sub-FCP for Item selection
  const [itemSelectMode, setItemSelectMode] = useState<'add_produit' | 'add_service' | 'replace' | null>(null);
  const [replacingCartItemId, setReplacingCartItemId] = useState<string | null>(null);

  // Déduction & Majoration State
  const [deductionApplied, setDeductionApplied] = useState(false);
  const [deductionMotif, setDeductionMotif] = useState('');
  const [deductionMontant, setDeductionMontant] = useState('');

  const [majorationApplied, setMajorationApplied] = useState(false);
  const [majorationMotif, setMajorationMotif] = useState('');
  const [majorationMontant, setMajorationMontant] = useState('');

  // Filtered sales
  const displayedSales = ventes.filter((s) => s.status === filter);

  // Open New Sale Flow
  const handleOpenNewVente = () => {
    const newCode = generateVenteCode(ventes);
    if (!newCode) {
      alert("Limite maximale atteinte pour aujourd'hui (999Z). Création de nouvelle vente impossible.");
      return;
    }
    setSaleCode(newCode);
    setSelectedClient(null);
    setClientHorsListe(null);
    setCartItems([]);
    setDeductionApplied(false);
    setDeductionMotif('');
    setDeductionMontant('');
    setMajorationApplied(false);
    setMajorationMotif('');
    setMajorationMontant('');
    setIsNewVenteFCPOpen(true);
  };

  // Add Item to Cart
  const handleSelectItem = (item: Produit | Service, type: 'produit' | 'service') => {
    if (itemSelectMode === 'replace' && replacingCartItemId) {
      setCartItems((prev) =>
        prev.map((c) =>
          c.id === replacingCartItemId
            ? {
                ...c,
                itemId: item.id,
                type,
                code: item.code,
                nom: item.nom,
                mesure: (item as any).mesure,
                prixInt: item.prixInt,
                prixDec: item.prixDec,
              }
            : c
        )
      );
    } else {
      const newCartItem: CartItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        itemId: item.id,
        type,
        code: item.code,
        nom: item.nom,
        mesure: (item as any).mesure,
        prixInt: item.prixInt,
        prixDec: item.prixDec,
        quantiteInt: '1',
        quantiteDec: '00',
      };
      setCartItems((prev) => [...prev, newCartItem]);
    }
    setItemSelectMode(null);
    setReplacingCartItemId(null);
  };

  // Remove Item from Cart
  const handleRemoveCartItem = (cartId: string) => {
    setCartItems((prev) => prev.filter((c) => c.id !== cartId));
  };

  // Replace Item (opens FCP selection for any article)
  const handleReplaceCartItem = (cartId: string) => {
    setReplacingCartItemId(cartId);
    setItemSelectMode('replace');
  };

  // Calculate Total
  const calculateTotal = () => {
    let subtotal = 0;
    cartItems.forEach((c) => {
      const qty = parseFloat(`${c.quantiteInt || '0'}.${c.quantiteDec || '0'}`);
      const pu = parseFloat(`${c.prixInt || '0'}.${c.prixDec || '0'}`);
      subtotal += qty * pu;
    });

    if (deductionApplied) {
      const ded = parseFloat(deductionMontant || '0');
      subtotal -= ded;
    }

    if (majorationApplied) {
      const maj = parseFloat(majorationMontant || '0');
      subtotal += maj;
    }

    if (subtotal < 0) subtotal = 0;

    return formatNumberAmount(subtotal, settings.decimalMode);
  };

  // Validate Sale Form
  const isClientChosen = !!selectedClient || !!clientHorsListe;
  const isCartNotEmpty = cartItems.length > 0;
  const isDeductionValid = !deductionApplied || (deductionMotif.trim().length > 0 && deductionMontant.trim().length > 0);
  const isMajorationValid = !majorationApplied || (majorationMotif.trim().length > 0 && majorationMontant.trim().length > 0);

  const isSaleFormValid = isClientChosen && isCartNotEmpty && isDeductionValid && isMajorationValid;

  const handleSaveSale = () => {
    if (!isSaleFormValid) return;

    let clientNom = '';
    let clientContact = '';
    let clientAdresse = '';
    let clientCode = 'CL#';

    if (selectedClient) {
      clientNom = selectedClient.nom;
      clientContact = selectedClient.contact;
      clientAdresse = selectedClient.adresse;
      clientCode = selectedClient.code;
    } else if (clientHorsListe) {
      clientNom = clientHorsListe.nom;
      clientContact = clientHorsListe.contact;
      clientAdresse = clientHorsListe.adresse;
      clientCode = 'CL-HORS';
    }

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      code: saleCode,
      clientId: selectedClient?.id,
      clientHorsListe: clientHorsListe || undefined,
      clientCode,
      clientNom,
      clientContact,
      clientAdresse,
      items: cartItems,
      deduction: {
        applied: deductionApplied,
        motif: deductionMotif.trim(),
        montant: deductionMontant.replace(/\D/g, ''),
      },
      majoration: {
        applied: majorationApplied,
        motif: majorationMotif.trim(),
        montant: majorationMontant.replace(/\D/g, ''),
      },
      totalAmount: calculateTotal(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    onSaveVente(newSale);
    setIsNewVenteFCPOpen(false);
  };

  // Copy Information State
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyInformation = () => {
    if (!selectedDetailSale) return;

    let text = ``;
    
    // Header
    const saleClient = selectedDetailSale.clientId
      ? clients.find((c) => c.id === selectedDetailSale.clientId)
      : clients.find((c) => c.nom === selectedDetailSale.clientNom);
    const clientCode = saleClient?.code || 'CL#';
    
    text += `Code Vente: ${selectedDetailSale.code}\n`;
    text += `Date: ${new Date(selectedDetailSale.createdAt).toLocaleDateString()}\n`;
    text += `Unité monétaire: ${settings.currency}\n\n`;
    
    text += `Client: ${selectedDetailSale.clientNom} (${clientCode})\n`;
    if (selectedDetailSale.clientContact) text += `Contact: ${selectedDetailSale.clientContact}\n`;
    if (selectedDetailSale.clientAdresse) text += `Adresse: ${selectedDetailSale.clientAdresse}\n`;
    text += `\n`;
    
    // Items
    selectedDetailSale.items.forEach(item => {
      const codeStr = item.code ? `[${item.code}] ` : ``;
      text += `DS: ${codeStr}${item.nom}\n`;
      
      const hasQtyDec = !!(item.quantiteDec && item.quantiteDec.trim() !== '' && parseInt(item.quantiteDec, 10) > 0);
      const qtyStr = hasQtyDec
        ? `${formatIntWithThousands(item.quantiteInt)},${item.quantiteDec.padEnd(2, '0').slice(0, 2)}`
        : `${formatIntWithThousands(item.quantiteInt)}`;
      text += `QT: ${qtyStr}\n`;
      
      if (item.mesure) {
        text += `MS: ${item.mesure}\n`;
      } else {
        text += `MS: -\n`;
      }
      
      const puStr = formatPrice(item.prixInt, item.prixDec, settings.decimalMode);
      text += `PU: ${puStr}\n`;
      
      const qtyVal = parseFloat(`${item.quantiteInt || '0'}.${item.quantiteDec || '0'}`);
      const puVal = parseFloat(`${item.prixInt || '0'}.${item.prixDec || '0'}`);
      const rowTotal = qtyVal * puVal;
      const mtStr = formatNumberAmount(rowTotal, settings.decimalMode);
      
      text += `MT: ${mtStr}\n\n`;
    });
    
    // Adjustments
    if (selectedDetailSale.deduction?.applied && selectedDetailSale.deduction.montant) {
      text += `Déduction (${selectedDetailSale.deduction.motif}): -${formatNumberAmount(parseFloat(selectedDetailSale.deduction.montant), settings.decimalMode)}\n\n`;
    }
    if (selectedDetailSale.majoration?.applied && selectedDetailSale.majoration.montant) {
      text += `Majoration (${selectedDetailSale.majoration.motif}): +${formatNumberAmount(parseFloat(selectedDetailSale.majoration.montant), settings.decimalMode)}\n\n`;
    }
    
    // Total
    text += `Total: ${selectedDetailSale.totalAmount}\n`;

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1000);
    });
  };

  const activeCount = ventes.filter((v) => v.status !== 'annule').length;
  const annuleCount = ventes.filter((v) => v.status === 'annule').length;

  const subRibbonButtons: ActionButtonDef[] = [
    {
      id: 'active',
      label: `Actifs (${activeCount})`,
      onClick: () => setFilter('active'),
      active: filter === 'active',
    },
    {
      id: 'annule',
      label: `Annulés (${annuleCount})`,
      onClick: () => setFilter('annule'),
      active: filter === 'annule',
    },
    {
      id: 'nouv',
      label: 'Vente',
      icon: Plus,
      onClick: handleOpenNewVente,
    },
  ];

  const activeClientsList = clients.filter((c) => !c.isArchived);
  const activeProduitsList = produits.filter((p) => !p.isArchived);
  const activeServicesList = services.filter((s) => !s.isArchived);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF] relative">
      <SubRibbon buttons={subRibbonButtons} />

      {/* Main Working Canvas */}
      <div className="flex-1 p-3 bg-[#FFFFFF] tab-content-scroll">
        {displayedSales.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-neutral-500 gap-2">
            <ShoppingCart className="w-10 h-10 opacity-40" />
            <span className="f-app">Aucune vente {filter === 'active' ? 'active' : 'annulée'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedSales.map((s) => {
              const saleClient = s.clientId
                ? clients.find((c) => c.id === s.clientId)
                : clients.find((c) => c.nom === s.clientNom);
              const clientCode = saleClient?.code || 'CL#';
              const isClientArchived = saleClient ? saleClient.isArchived : false;
              const totalParts = splitAmountString(s.totalAmount, settings.decimalMode);

              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedDetailSale(s)}
                  type="button"
                  className="min-h-[160px] bg-[#F0F0F0] p-3 flex flex-col justify-between items-start text-left hover:bg-[#E5E5E5] transition-none cursor-pointer group border-none relative"
                >
                  <div className="w-full flex-1 flex flex-col justify-start">
                    {/* Ligne 1 : Num ID Vente */}
                    <span className={`f-app font-bold block truncate w-full leading-normal pb-0.5 ${s.status === 'annule' ? 'text-rose-600' : 'text-neutral-600'}`}>
                      {s.code}
                    </span>

                    {/* Ligne 2 : Ligne vide insérée entre le num id vente et le nom client */}
                    <span className="f-app invisible select-none block truncate w-full mt-1 leading-normal pb-0.5" aria-hidden="true">
                      &nbsp;
                    </span>

                    {/* Ligne 3 : Nom Client */}
                    <span className="f-app text-[#000000] font-bold block truncate w-full mt-1 leading-normal pb-0.5">
                      {s.clientNom}
                    </span>

                    {/* Ligne 4 : Code Client */}
                    <span className={`f-app flex items-center gap-1 w-full mt-1 leading-normal pb-0.5 ${isClientArchived ? 'text-rose-600 font-bold' : 'text-neutral-600'}`}>
                      <span className="font-bold shrink-0 select-none">└</span>
                      <span className="truncate w-full block">{clientCode}</span>
                    </span>

                    {/* Ligne 5 : Montant Total aligné en bas à droite */}
                    <div className="w-full text-right mt-auto pt-2">
                      <span className="f-app text-[#000000] font-bold block truncate w-full leading-normal pb-0.5">
                        {totalParts.intPart}
                        {totalParts.decPart !== undefined && (
                          <>
                            ,
                            <span className="text-[0.75em]">{totalParts.decPart}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Reserved bottom slot for cancellation label on all tiles */}
                  <div className="w-full h-[24px] min-h-[24px] mt-2 shrink-0 flex items-center justify-center">
                    {s.status === 'annule' ? (
                      <div className="w-full bg-[#000000] text-[#FFFFFF] f-app font-bold py-0.5 px-2 text-center uppercase tracking-wider h-[24px] flex items-center justify-center">
                        Annulée
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

      {/* FCP Window for Sale Detail */}
      {selectedDetailSale && (
        <FCPWindow
          title={`Détail Vente - ${selectedDetailSale.code}`}
          validateLabel="Ok"
          onValidate={() => setSelectedDetailSale(null)}
          cancelLabel={selectedDetailSale.status === 'active' ? 'Annuler' : 'Restituer'}
          onCancel={
            selectedDetailSale.status === 'active'
              ? () => setIsConfirmCancelOpen(true)
              : () => setIsConfirmRestoreOpen(true)
          }
          cancelIsRed={selectedDetailSale.status === 'active'}
          isEdit={true}
          hasChanges={false}
          onCloseWithoutSaving={() => setSelectedDetailSale(null)}
        >
          <div className="flex flex-col gap-4 max-w-md mx-auto pb-6">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setInvoiceTitre('');
                  setInvoiceDescription('');
                  setInvoiceInstructions('');
                  setIsInvoiceFCPOpen(true);
                }}
                className="w-full h-[40px] bg-[#D0D0D0] hover:bg-[#C8C8C8] text-[#000000] font-bold f-app flex items-center justify-center border-t-4 border-l-4 border-b-4 border-r-4 border-black box-border cursor-pointer"
              >
                Générer un pdf
              </button>
              
              <button
                type="button"
                onClick={handleCopyInformation}
                className="w-full h-[40px] bg-[#D0D0D0] hover:bg-[#C8C8C8] text-[#000000] font-bold f-app flex items-center justify-center border-t-4 border-l-4 border-b-4 border-r-4 border-black box-border cursor-pointer"
              >
                {isCopied ? 'Informations copiées' : 'Copier les informations'}
              </button>
            </div>

            {/* Code Vente & Date & Status */}
            <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="f-app text-neutral-600 font-bold">Code Vente</span>
                <span className="f-app font-bold text-[#000000]">
                  {selectedDetailSale.status === 'active' ? 'ACTIVE' : 'ANNULÉE'}
                </span>
              </div>
              <span className="f-app font-bold text-[#000000]">{selectedDetailSale.code}</span>
              <span className="f-app text-neutral-600 mt-1">
                Date: {new Date(selectedDetailSale.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Client Info */}
            {(() => {
              const saleClient = selectedDetailSale.clientId
                ? clients.find((c) => c.id === selectedDetailSale.clientId)
                : clients.find((c) => c.nom === selectedDetailSale.clientNom);
              const clientCode = saleClient?.code || 'CL#';
              const isClientArchived = saleClient?.isArchived ?? false;

              return (
                <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
                  <span className="f-app text-neutral-600 font-bold">Client</span>
                  <span className="f-app font-bold text-[#000000]">
                    {selectedDetailSale.clientNom}{' '}
                    <span className={isClientArchived ? 'text-rose-600 font-bold' : 'text-[#000000]'}>
                      ({clientCode})
                    </span>
                  </span>
                  {selectedDetailSale.clientContact && (
                    <span className="f-app text-[#000000]">Contact: {selectedDetailSale.clientContact}</span>
                  )}
                  {selectedDetailSale.clientAdresse && (
                    <span className="f-app text-[#000000]">Adresse: {selectedDetailSale.clientAdresse}</span>
                  )}
                </div>
              );
            })()}

            {/* Cart Items */}
            <div className="bg-[#F0F0F0] p-3 flex flex-col gap-2">
              <span className="f-app text-[#000000] font-bold">
                Articles ({selectedDetailSale.items.length})
              </span>
              <div className="flex flex-col gap-2">
                {selectedDetailSale.items.map((item, idx) => {
                  const hasQtyDec = !!(item.quantiteDec && item.quantiteDec.trim() !== '' && parseInt(item.quantiteDec, 10) > 0);
                  const qtyStr = hasQtyDec
                    ? `${formatIntWithThousands(item.quantiteInt)},${item.quantiteDec.padEnd(2, '0').slice(0, 2)}`
                    : `${formatIntWithThousands(item.quantiteInt)}`;

                  const puStr = formatPrice(item.prixInt, item.prixDec, settings.decimalMode);

                  const targetItem = item.type === 'produit'
                    ? produits.find((p) => p.code === item.code)
                    : services.find((s) => s.code === item.code);
                  
                  const isItemArchived = targetItem?.isArchived ?? false;

                  return (
                    <div key={item.id || idx} className="bg-[#FFFFFF] p-2 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="f-app font-bold text-[#000000] truncate">
                          {idx + 1}. {item.nom}
                        </span>
                      </div>
                      <div className="flex items-center justify-between f-app">
                        <span className={`font-bold ${isItemArchived ? 'text-rose-600' : 'text-neutral-600'}`}>
                          {item.code}
                        </span>
                        <span className="f-app text-neutral-600 uppercase font-bold">{item.type}</span>
                      </div>
                      <div className="flex items-center justify-between f-app text-[#000000]">
                        <span className="whitespace-nowrap">
                          QT: {qtyStr}
                        </span>
                        {item.mesure ? (
                          <span className="truncate mx-2 text-center text-neutral-600">
                            {item.mesure}
                          </span>
                        ) : (
                          <span className="flex-1" />
                        )}
                        <span className="whitespace-nowrap">
                          PU: {puStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Déduction if applied */}
            {selectedDetailSale.deduction?.applied && (() => {
              const dedVal = parseFloat(selectedDetailSale.deduction.montant || '0');
              const dedStr = formatNumberAmount(dedVal, settings.decimalMode);

              return (
                <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
                  <span className="f-app text-neutral-600 font-bold">Déduction</span>
                  <div className="flex items-center justify-between f-app text-[#000000]">
                    <span>Motif: {selectedDetailSale.deduction.motif}</span>
                    <span className="font-bold">-{dedStr}</span>
                  </div>
                </div>
              );
            })()}

            {/* Majoration if applied */}
            {selectedDetailSale.majoration?.applied && (() => {
              const majVal = parseFloat(selectedDetailSale.majoration.montant || '0');
              const majStr = formatNumberAmount(majVal, settings.decimalMode);

              return (
                <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
                  <span className="f-app text-neutral-600 font-bold">Majoration</span>
                  <div className="flex items-center justify-between f-app text-[#000000]">
                    <span>Motif: {selectedDetailSale.majoration.motif}</span>
                    <span className="font-bold">+{majStr}</span>
                  </div>
                </div>
              );
            })()}

            {/* Total */}
            <div className="bg-[#D0D0D0] p-3 flex items-center justify-between">
              <span className="f-app font-bold text-[#000000]">Total Vente:</span>
              <span className="f-app font-bold text-[#000000]">
                {formatAmountString(selectedDetailSale.totalAmount, settings.decimalMode)}
              </span>
            </div>
          </div>
        </FCPWindow>
      )}

      {/* Main FCP Window for New Sale */}
      {isNewVenteFCPOpen && (
        <FCPWindow
          title={`Nouvelle Vente - ${saleCode}`}
          validateLabel="Valider"
          cancelLabel="X"
          onValidate={handleSaveSale}
          onCancel={() => setIsNewVenteFCPOpen(false)}
          validateDisabled={!isSaleFormValid}
        >
          <div className="flex flex-col gap-5 max-w-md mx-auto pb-6">
            {/* 1. Code Vente Auto */}
            <div className="flex flex-col gap-1 bg-[#F0F0F0] p-3">
              <label className="f-app text-[#000000] font-bold">Code Vente (Auto)</label>
              <span className="f-app font-bold text-[#000000]">{saleCode}</span>
            </div>

            {/* 2. Client Selection Section */}
            <div className="flex flex-col gap-2 bg-[#F0F0F0] p-3">
              <label className="f-app text-[#000000] font-bold">
                Client <span className="text-rose-600">*</span>
              </label>

              {selectedClient ? (
                <div className="bg-[#FFFFFF] p-3 flex items-center justify-between h-[88px] box-border">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="f-app font-bold text-[#000000] truncate">{selectedClient.nom}</span>
                    <span className="f-app text-neutral-600 truncate">{selectedClient.contact}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    className="w-[80px] h-[32px] bg-[#222222] text-[#FFFFFF] f-app font-bold border-none cursor-pointer shrink-0"
                  >
                    Changer
                  </button>
                </div>
              ) : clientHorsListe ? (
                <div className="bg-[#FFFFFF] p-3 flex items-center justify-between h-[88px] box-border">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="f-app font-bold text-[#000000] truncate">{clientHorsListe.nom} (Hors Liste)</span>
                    <span className="f-app text-neutral-600 truncate">{clientHorsListe.contact}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClientHorsListe(null)}
                    className="w-[80px] h-[32px] bg-[#222222] text-[#FFFFFF] f-app font-bold border-none cursor-pointer shrink-0"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 h-[88px] box-border justify-center">
                  <button
                    type="button"
                    onClick={() => setIsSelectingClientFCP(true)}
                    className="w-full h-[40px] bg-[#222222] hover:bg-[#111111] text-[#FFFFFF] font-bold f-app flex items-center justify-center gap-2 border-none cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>Choisir parmi les clients enregistrés</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHlNom('');
                      setHlContact('');
                      setHlAdresse('');
                      setIsClientHorsListeFCP(true);
                    }}
                    className="w-full h-[40px] bg-[#444444] hover:bg-[#333333] text-[#FFFFFF] font-bold f-app flex items-center justify-center gap-2 border-none cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Client hors liste</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Panier / Cart Section */}
            <div className="flex flex-col gap-3 bg-[#F0F0F0] p-3">
              <label className="f-app text-[#000000] font-bold">
                Articles du Panier <span className="text-rose-600">*</span>
              </label>

              {cartItems.length === 0 ? (
                <div className="p-4 bg-[#FFFFFF] text-center text-neutral-500 f-app">
                  Aucun article dans le panier
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cartItems.map((item, idx) => (
                    <div key={item.id} className="bg-[#FFFFFF] p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="f-app font-bold text-[#000000] truncate">
                          {idx + 1}. {item.nom}
                        </span>
                        
                        {/* Suppression cart line */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.id)}
                          className="w-[36px] h-[32px] bg-[#444444] hover:bg-[#333333] text-[#FFFFFF] flex items-center justify-center border-none cursor-pointer shrink-0 ml-2"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Code and Type line */}
                      <div className="flex items-center justify-between f-app">
                        <span className="text-neutral-600 font-bold">
                          {item.code}
                        </span>
                        <span className="text-neutral-600 uppercase font-bold">
                          {item.type === 'produit' ? 'Bien' : 'Service'}
                        </span>
                      </div>

                      {/* Replace Button & PU */}
                      <div className="flex items-center justify-between">
                        <span className="f-app text-neutral-600">
                          PU: {formatPrice(item.prixInt, item.prixDec, settings.decimalMode)}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleReplaceCartItem(item.id)}
                          className="w-[36px] h-[32px] bg-[#222222] hover:bg-[#111111] text-[#FFFFFF] flex items-center justify-center border-none cursor-pointer"
                          title="Remplacer l'article"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity Input Fields: Integer , Decimal */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="f-app text-[#000000] font-bold">Quantité:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.quantiteInt}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setCartItems((prev) =>
                              prev.map((c) => (c.id === item.id ? { ...c, quantiteInt: val } : c))
                            );
                          }}
                          className="w-16 bg-[#F0F0F0] text-[#000000] px-2 py-1 f-app font-bold text-right outline-none border-none"
                        />
                        <span className="f-app font-bold text-[#000000]">,</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={item.quantiteDec}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setCartItems((prev) =>
                              prev.map((c) => (c.id === item.id ? { ...c, quantiteDec: val } : c))
                            );
                          }}
                          className="w-14 bg-[#F0F0F0] text-[#000000] px-2 py-1 f-app font-bold text-center outline-none border-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Product / Service Buttons side-by-side at bottom */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setItemSelectMode('add_produit')}
                  className="flex-1 h-[40px] bg-[#222222] hover:bg-[#111111] text-[#FFFFFF] font-bold f-app flex items-center justify-center gap-1 border-none cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>+ Produit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setItemSelectMode('add_service')}
                  className="flex-1 h-[40px] bg-[#444444] hover:bg-[#333333] text-[#FFFFFF] font-bold f-app flex items-center justify-center gap-1 border-none cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>+ Service</span>
                </button>
              </div>
            </div>

            {/* 4. Déduction Section */}
            <div className="flex flex-col gap-2 bg-[#F0F0F0] p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductionApplied}
                  onChange={(e) => setDeductionApplied(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                <span className="f-app text-[#000000] font-bold">Appliquer une Déduction</span>
              </label>

              {deductionApplied && (
                <div className="flex flex-col gap-2 mt-2 pl-6">
                  <div className="flex flex-col gap-1">
                    <label className="f-app text-[#000000]">
                      Motif <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={deductionMotif}
                      onChange={(e) => setDeductionMotif(e.target.value)}
                      className="bg-[#FFFFFF] text-[#000000] px-3 py-1.5 f-app outline-none border-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="f-app text-[#000000]">
                      Montant <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={deductionMontant}
                      onChange={(e) => setDeductionMontant(e.target.value.replace(/\D/g, ''))}
                      className="bg-[#FFFFFF] text-[#000000] px-3 py-1.5 f-app font-bold text-right outline-none border-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Majoration Section */}
            <div className="flex flex-col gap-2 bg-[#F0F0F0] p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={majorationApplied}
                  onChange={(e) => setMajorationApplied(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                <span className="f-app text-[#000000] font-bold">Appliquer une Majoration</span>
              </label>

              {majorationApplied && (
                <div className="flex flex-col gap-2 mt-2 pl-6">
                  <div className="flex flex-col gap-1">
                    <label className="f-app text-[#000000]">
                      Motif <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={majorationMotif}
                      onChange={(e) => setMajorationMotif(e.target.value)}
                      className="bg-[#FFFFFF] text-[#000000] px-3 py-1.5 f-app outline-none border-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="f-app text-[#000000]">
                      Montant <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={majorationMontant}
                      onChange={(e) => setMajorationMontant(e.target.value.replace(/\D/g, ''))}
                      className="bg-[#FFFFFF] text-[#000000] px-3 py-1.5 f-app font-bold text-right outline-none border-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total Display */}
            <div className="bg-[#D0D0D0] p-3 flex items-center justify-between">
              <span className="f-app font-bold text-[#000000]">Total Vente:</span>
              <span className="f-app font-bold text-[#000000]">{calculateTotal()}</span>
            </div>
          </div>
        </FCPWindow>
      )}

      {/* Sub-FCP: Registered Clients List */}
      {isSelectingClientFCP && (
        <FCPWindow
          title="Sélectionner un Client"
          cancelLabel="X"
          onCancel={() => setIsSelectingClientFCP(false)}
        >
          <div className="flex flex-col gap-2 max-w-md mx-auto">
            {activeClientsList.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 f-app">Aucun client actif trouvé</div>
            ) : (
              activeClientsList.map((cli) => (
                <button
                  key={cli.id}
                  type="button"
                  onClick={() => {
                    setSelectedClient(cli);
                    setClientHorsListe(null);
                    setIsSelectingClientFCP(false);
                  }}
                  className="bg-[#FFFFFF] hover:bg-[#F0F0F0] p-3 text-left flex flex-col gap-1 border-none cursor-pointer"
                >
                  <span className="f-app font-bold text-[#000000]">{cli.nom}</span>
                  <span className="f-app text-neutral-600">
                    Code: {cli.code} | Contact: {cli.contact}
                  </span>
                </button>
              ))
            )}
          </div>
        </FCPWindow>
      )}

      {/* Sub-FCP: Hors Liste Client Form */}
      {isClientHorsListeFCP && (
        <FCPWindow
          title="Client Hors Liste"
          validateLabel="Free"
          cancelLabel="X"
          validateIsGreen={true}
          onValidate={() => {
            if (hlNom.trim() && hlContact.trim() && hlAdresse.trim()) {
              setClientHorsListe({
                nom: hlNom.trim(),
                contact: hlContact.trim(),
                adresse: hlAdresse.trim(),
              });
              setSelectedClient(null);
              setIsClientHorsListeFCP(false);
            }
          }}
          onCancel={() => setIsClientHorsListeFCP(false)}
          validateDisabled={!hlNom.trim() || !hlContact.trim() || !hlAdresse.trim()}
        >
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">
                Nom <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={hlNom}
                onChange={(e) => setHlNom(e.target.value)}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold outline-none border-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">
                Contact <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={hlContact}
                onChange={(e) => setHlContact(e.target.value)}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold outline-none border-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="f-app text-[#000000] font-bold">
                Adresse <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={hlAdresse}
                onChange={(e) => setHlAdresse(e.target.value)}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app font-bold outline-none border-none"
              />
            </div>
          </div>
        </FCPWindow>
      )}

      {/* Sub-FCP: Select Product or Service Item */}
      {itemSelectMode !== null && (
        <FCPWindow
          title="Sélectionner un Article"
          cancelLabel="X"
          onCancel={() => {
            setItemSelectMode(null);
            setReplacingCartItemId(null);
          }}
        >
          <div className="flex flex-col gap-2 max-w-md mx-auto">
            {(itemSelectMode === 'add_produit' || itemSelectMode === 'replace') && (
              (() => {
                const availableProduits = activeProduitsList.filter(
                  (p) => !cartItems.some((c) => c.itemId === p.id && c.type === 'produit' && c.id !== replacingCartItemId)
                );
                return (
                  <>
                    <span className="f-app font-bold text-[#000000] uppercase tracking-wider">Produits:</span>
                    {availableProduits.length === 0 ? (
                      <div className="p-3 text-neutral-500 f-app">Aucun produit actif disponible</div>
                    ) : (
                      availableProduits.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectItem(p, 'produit')}
                          className="bg-[#FFFFFF] hover:bg-[#F0F0F0] p-3 text-left flex flex-col border-none cursor-pointer w-full gap-1"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="f-app font-bold text-[#000000] truncate max-w-[70%]">{p.nom}</span>
                            <span className="f-app font-bold text-[#000000] shrink-0">
                              {formatPrice(p.prixInt, p.prixDec, settings.decimalMode)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center w-full">
                            <span className="f-app text-neutral-600">Code: {p.code}</span>
                            {p.mesure ? (
                              <span className="f-app text-neutral-600 truncate shrink-0 max-w-[50%] text-right">{p.mesure}</span>
                            ) : (
                              <span />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </>
                );
              })()
            )}

            {(itemSelectMode === 'add_service' || itemSelectMode === 'replace') && (
              (() => {
                const availableServices = activeServicesList.filter(
                  (s) => !cartItems.some((c) => c.itemId === s.id && c.type === 'service' && c.id !== replacingCartItemId)
                );
                return (
                  <>
                    <span className="f-app font-bold text-[#000000] uppercase tracking-wider mt-3">Services:</span>
                    {availableServices.length === 0 ? (
                      <div className="p-3 text-neutral-500 f-app">Aucun service actif disponible</div>
                    ) : (
                      availableServices.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectItem(s, 'service')}
                          className="bg-[#FFFFFF] hover:bg-[#F0F0F0] p-3 text-left flex flex-col border-none cursor-pointer w-full gap-1"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="f-app font-bold text-[#000000] truncate max-w-[70%]">{s.nom}</span>
                            <span className="f-app font-bold text-[#000000] shrink-0">
                              {formatPrice(s.prixInt, s.prixDec, settings.decimalMode)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center w-full">
                            <span className="f-app text-neutral-600">Code: {s.code}</span>
                            {s.mesure ? (
                              <span className="f-app text-neutral-600 truncate shrink-0 max-w-[50%] text-right">{s.mesure}</span>
                            ) : (
                              <span />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </>
                );
              })()
            )}
          </div>
        </FCPWindow>
      )}

      {/* Confirmation FCP for Canceling a Sale */}
      {isConfirmCancelOpen && selectedDetailSale && (
        <FCPWindow
          title="Confirmation"
          validateLabel="Confirmer"
          validateIsGreen={true}
          cancelLabel="Non"
          onValidate={() => {
            onCancelVente(selectedDetailSale.id);
            setIsConfirmCancelOpen(false);
            setSelectedDetailSale(null);
          }}
          onCancel={() => setIsConfirmCancelOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment annuler cette vente ?
            </span>
            <span className="f-app text-neutral-600">
              Cette vente sera déplacée dans la liste des ventes annulées.
            </span>
          </div>
        </FCPWindow>
      )}

      {/* Confirmation FCP for Restoring a Sale */}
      {isConfirmRestoreOpen && selectedDetailSale && (
        <FCPWindow
          title="Confirmation"
          validateLabel="Confirmer"
          cancelLabel="Non"
          onValidate={() => {
            onRestoreVente(selectedDetailSale.id);
            setIsConfirmRestoreOpen(false);
            setSelectedDetailSale(null);
          }}
          onCancel={() => setIsConfirmRestoreOpen(false)}
        >
          <div className="p-4 max-w-md mx-auto text-center flex flex-col gap-2">
            <span className="f-app font-bold text-[#000000]">
              Voulez-vous vraiment restaurer cette vente ?
            </span>
            <span className="f-app text-neutral-600">
              Cette vente sera replacée dans la liste des actives.
            </span>
          </div>
        </FCPWindow>
      )}

      {/* Sub-FCP: Invoice Generation */}
      {isInvoiceFCPOpen && selectedDetailSale && (
        <FCPWindow
          title="Générer un PDF - Facture"
          validateLabel="Valider"
          validateIcon={CheckCheck}
          cancelLabel="Retour"
          cancelIcon={ArrowLeft}
          onValidate={() => {
            generateInvoicePDF(
              selectedDetailSale,
              settings,
              clients,
              invoiceDescription.trim(),
              invoiceInstructions.trim(),
              invoiceTitre.trim()
            );
            setIsInvoiceFCPOpen(false);
          }}
          onCancel={() => setIsInvoiceFCPOpen(false)}
        >
          <div className="flex flex-col gap-5 max-w-md mx-auto pb-6 pt-3">
            {/* Titre (Facultatif) */}
            <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
              <label className="f-app text-[#000000] font-normal">Titre (Facultatif)</label>
              <input
                type="text"
                value={invoiceTitre}
                onChange={(e) => setInvoiceTitre(e.target.value)}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none border-none"
              />
            </div>

            {/* Information (Facultatif) */}
            <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
              <label className="f-app text-[#000000] font-normal">Information (Facultatif)</label>
              <textarea
                value={invoiceDescription}
                onChange={(e) => setInvoiceDescription(e.target.value)}
                rows={3}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none resize-none border-none"
              />
            </div>

            {/* Instructions (Facultatif) */}
            <div className="bg-[#F0F0F0] p-3 flex flex-col gap-1">
              <label className="f-app text-[#000000] font-normal">Instructions (Facultatif)</label>
              <textarea
                value={invoiceInstructions}
                onChange={(e) => setInvoiceInstructions(e.target.value)}
                rows={3}
                className="bg-[#FFFFFF] text-[#000000] px-3 py-2 f-app outline-none resize-none border-none"
              />
            </div>
          </div>
        </FCPWindow>
      )}
    </div>
  );
};
