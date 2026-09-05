export type TabType = 'produits' | 'service' | 'clients' | 'vente' | 'facturation' | 'parametres' | 'perf' | 'compte';

export interface Produit {
  id: string;
  code: string; // PR001, PR002...
  nom: string;
  mesure?: string;
  prixInt: string; // Integer part
  prixDec: string; // Decimal part (max 2 digits if decimal mode)
  stockInt?: string; // Indicative stock integer part (5 digits)
  stockDec?: string; // Indicative stock decimal part (2 digits)
  description: string;
  isArchived: boolean;
}

export interface Service {
  id: string;
  code: string; // SV001, SV002...
  nom: string;
  mesure?: string;
  prixInt: string;
  prixDec: string;
  description: string;
  isArchived: boolean;
}

export interface Client {
  id: string;
  code: string; // CL001, CL002...
  nom: string;
  contact: string;
  adresse: string;
  description: string;
  isArchived: boolean;
}

export interface CartItem {
  id: string; // Unique cart row id
  itemId: string; // ID of product or service
  type: 'produit' | 'service';
  code: string;
  nom: string;
  mesure?: string;
  prixInt: string;
  prixDec: string;
  quantiteInt: string; // Left numeric field
  quantiteDec: string; // Right numeric field
}

export interface Sale {
  id: string;
  code: string; // AAMMDDVTXXX
  clientId?: string;
  clientHorsListe?: {
    nom: string;
    contact: string;
    adresse: string;
  };
  clientCode: string;
  clientNom: string;
  clientContact: string;
  clientAdresse: string;
  items: CartItem[];
  deduction: {
    applied: boolean;
    motif: string;
    montant: string;
  };
  majoration: {
    applied: boolean;
    motif: string;
    montant: string;
  };
  totalAmount: string;
  status: 'active' | 'annule';
  createdAt: string; // ISO string
}

export interface Settings {
  orgNom: string;
  contact: string;
  adresse: string;
  information: string;
  currency: string; // e.g. EUR, FCFA, $
  decimalMode: '0' | '2'; // '0' or '2'
  fontSize: 'petit' | 'moyen' | 'grand';
}
