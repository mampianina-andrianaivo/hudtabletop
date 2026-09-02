import { Client, Produit, Sale, Service, Settings } from '../types';

const STORAGE_KEYS = {
  PRODUITS: 'app_produits_v1',
  SERVICES: 'app_services_v1',
  CLIENTS: 'app_clients_v1',
  VENTES: 'app_ventes_v1',
  SETTINGS: 'app_settings_v1',
};

const DEFAULT_SETTINGS: Settings = {
  orgNom: 'Mon Entreprise',
  contact: '+123456789',
  adresse: '123ABC',
  information: '',
  currency: 'Ariary',
  decimalMode: '0',
  fontSize: 'petit',
};

const DEFAULT_PRODUITS: Produit[] = [];

const DEFAULT_SERVICES: Service[] = [];

const DEFAULT_CLIENTS: Client[] = [];

export function getSettings(): Settings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function getProduits(): Produit[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUITS);
    return data ? JSON.parse(data) : DEFAULT_PRODUITS;
  } catch {
    return DEFAULT_PRODUITS;
  }
}

export function saveProduits(items: Produit[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUITS, JSON.stringify(items));
}

export function getServices(): Service[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SERVICES);
    return data ? JSON.parse(data) : DEFAULT_SERVICES;
  } catch {
    return DEFAULT_SERVICES;
  }
}

export function saveServices(items: Service[]): void {
  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(items));
}

export function getClients(): Client[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return data ? JSON.parse(data) : DEFAULT_CLIENTS;
  } catch {
    return DEFAULT_CLIENTS;
  }
}

export function saveClients(items: Client[]): void {
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(items));
}

export function getVentes(): Sale[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.VENTES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveVentes(items: Sale[]): void {
  localStorage.setItem(STORAGE_KEYS.VENTES, JSON.stringify(items));
}

// Helpers for Auto Increment Codes
export function formatSequenceNumber(num: number): string | null {
  if (num <= 999) {
    return String(num).padStart(3, '0');
  }
  if (num === 1000) return '999X';
  if (num === 1001) return '999Y';
  if (num === 1002) return '999Z';
  return null; // Refuse creation after 999Z
}

export function generateProduitCode(items: Produit[]): string | null {
  const seq = formatSequenceNumber(items.length + 1);
  return seq ? `PR${seq}` : null;
}

export function generateServiceCode(items: Service[]): string | null {
  const seq = formatSequenceNumber(items.length + 1);
  return seq ? `SV${seq}` : null;
}

export function generateClientCode(items: Client[]): string | null {
  const seq = formatSequenceNumber(items.length + 1);
  return seq ? `CL${seq}` : null;
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.PRODUITS);
  localStorage.removeItem(STORAGE_KEYS.SERVICES);
  localStorage.removeItem(STORAGE_KEYS.CLIENTS);
  localStorage.removeItem(STORAGE_KEYS.VENTES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}

export function generateVenteCode(sales: Sale[]): string | null {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const prefix = `${yy}${mm}${dd}VT`;
  
  const todaySales = sales.filter(s => s.code.startsWith(prefix));
  const seq = formatSequenceNumber(todaySales.length + 1);
  return seq ? `${prefix}${seq}` : null;
}
