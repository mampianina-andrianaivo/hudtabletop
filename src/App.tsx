import React, { useState, useEffect } from 'react';
import { Client, Produit, Sale, Service, Settings, TabType } from './types';
import { TopTabs } from './components/TopTabs';
import { ProduitTab } from './components/ProduitTab';
import { ServiceTab } from './components/ServiceTab';
import { ClientTab } from './components/ClientTab';
import { VenteTab } from './components/VenteTab';
import { ParametresTab } from './components/ParametresTab';
import { StatsTab } from './components/StatsTab';
import { AidesTab } from './components/AidesTab';
import {
  getClients,
  getProduits,
  getServices,
  getSettings,
  getVentes,
  saveClients,
  saveProduits,
  saveServices,
  saveSettings,
  saveVentes,
  clearAllData,
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('produits');

  // App Data State
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [produits, setProduits] = useState<Produit[]>(getProduits());
  const [services, setServices] = useState<Service[]>(getServices());
  const [clients, setClients] = useState<Client[]>(getClients());
  const [ventes, setVentes] = useState<Sale[]>(getVentes());

  // Save changes to storage
  const handleSaveProduit = (item: Produit) => {
    const updated = produits.some((p) => p.id === item.id)
      ? produits.map((p) => (p.id === item.id ? item : p))
      : [...produits, item];
    setProduits(updated);
    saveProduits(updated);
  };

  const handleArchiveProduit = (id: string) => {
    const updated = produits.map((p) => (p.id === id ? { ...p, isArchived: true } : p));
    setProduits(updated);
    saveProduits(updated);
  };

  const handleRestoreProduit = (id: string) => {
    const updated = produits.map((p) => (p.id === id ? { ...p, isArchived: false } : p));
    setProduits(updated);
    saveProduits(updated);
  };

  const handleSaveService = (item: Service) => {
    const updated = services.some((s) => s.id === item.id)
      ? services.map((s) => (s.id === item.id ? item : s))
      : [...services, item];
    setServices(updated);
    saveServices(updated);
  };

  const handleArchiveService = (id: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, isArchived: true } : s));
    setServices(updated);
    saveServices(updated);
  };

  const handleRestoreService = (id: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, isArchived: false } : s));
    setServices(updated);
    saveServices(updated);
  };

  const handleSaveClient = (item: Client) => {
    const updated = clients.some((c) => c.id === item.id)
      ? clients.map((c) => (c.id === item.id ? item : c))
      : [...clients, item];
    setClients(updated);
    saveClients(updated);
  };

  const handleArchiveClient = (id: string) => {
    const updated = clients.map((c) => (c.id === id ? { ...c, isArchived: true } : c));
    setClients(updated);
    saveClients(updated);
  };

  const handleRestoreClient = (id: string) => {
    const updated = clients.map((c) => (c.id === id ? { ...c, isArchived: false } : c));
    setClients(updated);
    saveClients(updated);
  };

  const handleSaveVente = (item: Sale) => {
    const updated = [item, ...ventes];
    setVentes(updated);
    saveVentes(updated);
  };

  const handleCancelVente = (id: string) => {
    const updated = ventes.map((v) => (v.id === id ? { ...v, status: 'annule' as const } : v));
    setVentes(updated);
    saveVentes(updated);
  };

  const handleRestoreVente = (id: string) => {
    const updated = ventes.map((v) => (v.id === id ? { ...v, status: 'active' as const } : v));
    setVentes(updated);
    saveVentes(updated);
  };

  const handleSaveSettings = (newSettings: Settings) => {
    // If switching from 2 decimals to 0 decimals, truncate catalog prices only.
    // Historical sales (ventes) are frozen snapshots and must never be altered.
    if (settings.decimalMode === '2' && newSettings.decimalMode === '0') {
      const updatedProduits = produits.map((p) => ({ ...p, prixDec: '00' }));
      const updatedServices = services.map((s) => ({ ...s, prixDec: '00' }));

      setProduits(updatedProduits);
      saveProduits(updatedProduits);
      setServices(updatedServices);
      saveServices(updatedServices);
    }

    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleResetAllData = () => {
    clearAllData();
    const defaults = getSettings();
    saveSettings(defaults);
    setProduits([]);
    setServices([]);
    setClients([]);
    setVentes([]);
    setSettings(defaults);
  };

  const appFontSize = settings.fontSize === 'grand' ? '16px' : settings.fontSize === 'moyen' ? '13px' : '12px';
  const tabFontSize = settings.fontSize === 'grand' ? '13px' : '12px';

  return (
    <div 
      className="w-full h-screen bg-black flex justify-center items-center overflow-hidden py-4 px-2 sm:py-8 sm:px-8"
      style={{ 
        '--app-font-size': appFontSize,
        '--tab-font-size': tabFontSize 
      } as React.CSSProperties}
    >
      {/* Smartphone fixed frame container */}
      <div className="w-full max-w-[420px] h-full max-h-[95vh] bg-[#FFFFFF] flex flex-col relative overflow-hidden shadow-xl border-4 border-rose-600 rounded-lg">
        {/* Fixed Top Tabs Ribbon */}
        <TopTabs activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Permanent separator line matching selected sub-tab thickness */}
        <div className="h-1 bg-[#000000] w-full shrink-0 z-10" />

        {/* Dynamic Working Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'produits' && (
            <ProduitTab
              produits={produits}
              settings={settings}
              onSaveProduit={handleSaveProduit}
              onArchiveProduit={handleArchiveProduit}
              onRestoreProduit={handleRestoreProduit}
            />
          )}

          {activeTab === 'service' && (
            <ServiceTab
              services={services}
              settings={settings}
              onSaveService={handleSaveService}
              onArchiveService={handleArchiveService}
              onRestoreService={handleRestoreService}
            />
          )}

          {activeTab === 'clients' && (
            <ClientTab
              clients={clients}
              onSaveClient={handleSaveClient}
              onArchiveClient={handleArchiveClient}
              onRestoreClient={handleRestoreClient}
            />
          )}

          {activeTab === 'vente' && (
            <VenteTab
              ventes={ventes}
              produits={produits}
              services={services}
              clients={clients}
              settings={settings}
              onSaveVente={handleSaveVente}
              onCancelVente={handleCancelVente}
              onRestoreVente={handleRestoreVente}
            />
          )}

          {activeTab === 'parametres' && (
            <ParametresTab settings={settings} onSaveSettings={handleSaveSettings} onResetAllData={handleResetAllData} />
          )}

          {activeTab === 'perf' && (
            <StatsTab
              ventes={ventes}
              produits={produits}
              services={services}
              clients={clients}
              settings={settings}
            />
          )}

          {activeTab === 'aides' && <AidesTab />}
        </div>
      </div>
    </div>
  );
}
