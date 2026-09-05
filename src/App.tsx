import React, { useState, useEffect, useCallback } from 'react';
import { Client, Produit, Sale, Service, Settings, TabType } from './types';
import { TopTabs } from './components/TopTabs';
import { ProduitTab } from './components/ProduitTab';
import { ServiceTab } from './components/ServiceTab';
import { ClientTab } from './components/ClientTab';
import { VenteTab } from './components/VenteTab';
import { ParametresTab } from './components/ParametresTab';
import { StatsTab } from './components/StatsTab';
import { CompteTab } from './components/CompteTab';
import { FCPWindow } from './components/FCPWindow';
import { FonctionnalitesContent, ConditionsContent } from './components/InfoTexts';
import { Info, Shield, Check } from 'lucide-react';
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
import { initAuth, googleSignIn, logout } from './utils/googleAuth';
import { loadDataFromDrive, saveDataToDrive, archiveDataFile } from './utils/driveSync';
import { User } from 'firebase/auth';

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [landingInfoMode, setLandingInfoMode] = useState<'fonctionnalites' | 'conditions' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // App Data State
  const [activeTab, setActiveTab] = useState<TabType>('produits');
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [produits, setProduits] = useState<Produit[]>(getProduits());
  const [services, setServices] = useState<Service[]>(getServices());
  const [clients, setClients] = useState<Client[]>(getClients());
  const [ventes, setVentes] = useState<Sale[]>(getVentes());

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setNeedsAuth(false);
        loadCloudData(currentUser);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setIsInitializing(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadCloudData = async (currentUser: User) => {
    setIsInitializing(true);
    setAuthError(null);
    try {
      const data = await loadDataFromDrive(currentUser);
      if (data) {
        if (data.settings) setSettings(data.settings);
        if (data.produits) setProduits(data.produits);
        if (data.services) setServices(data.services);
        if (data.clients) setClients(data.clients);
        if (data.ventes) setVentes(data.ventes);
        
        if (data.settings) saveSettings(data.settings);
        if (data.produits) saveProduits(data.produits);
        if (data.services) saveServices(data.services);
        if (data.clients) saveClients(data.clients);
        if (data.ventes) saveVentes(data.ventes);
      }
    } catch (error: any) {
      console.error('Failed to load/initialize data from Drive:', error);
      setAuthError("Erreur de synchronisation Google Drive. Veuillez vous reconnecter.");
      await logout();
      setUser(null);
      setNeedsAuth(true);
    } finally {
      setIsInitializing(false);
    }
  };

  const syncToCloud = useCallback((payload: any) => {
    if (!user) return;
    saveDataToDrive(user, payload).catch(err => console.error('Cloud sync failed:', err));
  }, [user]);

  const triggerSync = (
    newSettings = settings,
    newProduits = produits,
    newServices = services,
    newClients = clients,
    newVentes = ventes
  ) => {
    const payload = {
      settings: newSettings,
      produits: newProduits,
      services: newServices,
      clients: newClients,
      ventes: newVentes,
    };
    syncToCloud(payload);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        await loadCloudData(result.user);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await saveDataToDrive(user, { settings, produits, services, clients, ventes });
      } catch (e) {
        console.error('Logout sync failed:', e);
      }
    }
    
    clearAllData();
    const defaults = getSettings();
    saveSettings(defaults);
    setProduits([]);
    setServices([]);
    setClients([]);
    setVentes([]);
    setSettings(defaults);

    await logout();
    setUser(null);
    setNeedsAuth(true);
  };

  const handleSaveProduit = (item: Produit) => {
    const updated = produits.some((p) => p.id === item.id)
      ? produits.map((p) => (p.id === item.id ? item : p))
      : [...produits, item];
    setProduits(updated);
    saveProduits(updated);
    triggerSync(settings, updated, services, clients, ventes);
  };

  const handleArchiveProduit = (id: string) => {
    const updated = produits.map((p) => (p.id === id ? { ...p, isArchived: true } : p));
    setProduits(updated);
    saveProduits(updated);
    triggerSync(settings, updated, services, clients, ventes);
  };

  const handleRestoreProduit = (id: string) => {
    const updated = produits.map((p) => (p.id === id ? { ...p, isArchived: false } : p));
    setProduits(updated);
    saveProduits(updated);
    triggerSync(settings, updated, services, clients, ventes);
  };

  const handleSaveService = (item: Service) => {
    const updated = services.some((s) => s.id === item.id)
      ? services.map((s) => (s.id === item.id ? item : s))
      : [...services, item];
    setServices(updated);
    saveServices(updated);
    triggerSync(settings, produits, updated, clients, ventes);
  };

  const handleArchiveService = (id: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, isArchived: true } : s));
    setServices(updated);
    saveServices(updated);
    triggerSync(settings, produits, updated, clients, ventes);
  };

  const handleRestoreService = (id: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, isArchived: false } : s));
    setServices(updated);
    saveServices(updated);
    triggerSync(settings, produits, updated, clients, ventes);
  };

  const handleSaveClient = (item: Client) => {
    const updated = clients.some((c) => c.id === item.id)
      ? clients.map((c) => (c.id === item.id ? item : c))
      : [...clients, item];
    setClients(updated);
    saveClients(updated);
    triggerSync(settings, produits, services, updated, ventes);
  };

  const handleArchiveClient = (id: string) => {
    const updated = clients.map((c) => (c.id === id ? { ...c, isArchived: true } : c));
    setClients(updated);
    saveClients(updated);
    triggerSync(settings, produits, services, updated, ventes);
  };

  const handleRestoreClient = (id: string) => {
    const updated = clients.map((c) => (c.id === id ? { ...c, isArchived: false } : c));
    setClients(updated);
    saveClients(updated);
    triggerSync(settings, produits, services, updated, ventes);
  };

  const handleSaveVente = (item: Sale) => {
    const updated = [item, ...ventes];
    setVentes(updated);
    saveVentes(updated);
    triggerSync(settings, produits, services, clients, updated);
  };

  const handleCancelVente = (id: string) => {
    const updated = ventes.map((v) => (v.id === id ? { ...v, status: 'annule' as const } : v));
    setVentes(updated);
    saveVentes(updated);
    triggerSync(settings, produits, services, clients, updated);
  };

  const handleRestoreVente = (id: string) => {
    const updated = ventes.map((v) => (v.id === id ? { ...v, status: 'active' as const } : v));
    setVentes(updated);
    saveVentes(updated);
    triggerSync(settings, produits, services, clients, updated);
  };

  const handleSaveSettings = (newSettings: Settings) => {
    let updatedProduits = produits;
    let updatedServices = services;
    if (settings.decimalMode === '2' && newSettings.decimalMode === '0') {
      updatedProduits = produits.map((p) => ({ ...p, prixDec: '00' }));
      updatedServices = services.map((s) => ({ ...s, prixDec: '00' }));
      setProduits(updatedProduits);
      saveProduits(updatedProduits);
      setServices(updatedServices);
      saveServices(updatedServices);
    }
    setSettings(newSettings);
    saveSettings(newSettings);
    triggerSync(newSettings, updatedProduits, updatedServices, clients, ventes);
  };

  const handleResetAllData = async () => {
    if (user) {
      try {
        await archiveDataFile(user);
      } catch (e) {
        console.error("Failed to archive data file on Drive:", e);
      }
    }

    clearAllData();
    const defaults = getSettings();
    saveSettings(defaults);
    setProduits([]);
    setServices([]);
    setClients([]);
    setVentes([]);
    setSettings(defaults);
    triggerSync(defaults, [], [], [], []);
  };

  const appFontSize = settings.fontSize === 'grand' ? '16px' : settings.fontSize === 'moyen' ? '13px' : '12px';
  const tabFontSize = settings.fontSize === 'grand' ? '13px' : '12px';
  const currentYear = new Date().getFullYear();

  if (isInitializing) {
    return (
      <div className="w-full h-[100dvh] bg-black flex justify-center items-center overflow-hidden pt-4 pb-20 px-2 sm:py-8 sm:px-8">
        <div className="w-full max-w-[420px] h-full bg-[#FFFFFF] flex flex-col items-center justify-center border-4 border-black rounded-lg">
          <span className="font-bold text-neutral-600">Chargement des données...</span>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="w-full h-[100dvh] bg-black flex justify-center items-center overflow-hidden pt-4 pb-20 px-2 sm:py-8 sm:px-8">
        <div className="w-full max-w-[420px] h-full bg-[#FFFFFF] flex flex-col relative overflow-hidden shadow-xl border-4 border-black rounded-lg text-center">
          <div className="flex-1 w-full flex flex-col items-center justify-center overflow-y-auto py-4 px-6 relative">
            <div className="w-full text-left mb-3">
              <h1 className="text-2xl font-black text-black leading-tight tracking-wider uppercase">
                FACILE<br />CLAIRE<br />PROPRE
              </h1>
              <div className="w-1/2 border-b-2 border-black mt-3 mb-4"></div>
              <p className="text-sm font-medium text-black leading-snug">
                Webapp d'enregistrement statistique<br />
                de vos activités de vente<br />
                axée sur la simplicité<br />
                et le minimalisme.
              </p>
            </div>
            <div className="w-full text-right mb-6">
              <p className="text-xs sm:text-sm text-black leading-snug mb-3">
                Vos données seront stockées de manière sécurisée<br />
                et privée dans un dossier dédié<br />
                sur votre propre Google Drive.
              </p>
            </div>
            <div className="w-full flex justify-center mb-4">
              <button onClick={handleLogin} disabled={isLoggingIn} className="gsi-material-button bg-white border border-neutral-400 rounded-md p-0 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 h-10 w-full max-w-sm flex items-center justify-center gap-3">
                <span className="font-semibold text-black text-sm">{isLoggingIn ? 'Connexion...' : 'Inscription / Connexion'}</span>
              </button>
            </div>
            {authError && (
              <div className="w-full text-sm text-red-600 p-2 border border-red-600 rounded">
                {authError}
              </div>
            )}
            <div className="flex gap-4 w-full justify-center mt-auto pt-4 border-t border-neutral-200">
              <button onClick={() => setLandingInfoMode('fonctionnalites')} className="text-sm font-semibold text-black hover:opacity-75">Fonctionnalités</button>
              <button onClick={() => setLandingInfoMode('conditions')} className="text-sm font-semibold text-black hover:opacity-75">Conditions</button>
            </div>
          </div>
          {landingInfoMode && (
            <FCPWindow title={landingInfoMode === 'fonctionnalites' ? 'Fonctionnalités' : 'Conditions'} cancelLabel="X" onCancel={() => setLandingInfoMode(null)}>
              <div className="p-4">{landingInfoMode === 'fonctionnalites' ? <FonctionnalitesContent /> : <ConditionsContent />}</div>
            </FCPWindow>
          )}
          <div className="w-full bg-black py-1 px-3 flex flex-row items-center justify-end shrink-0 select-none">
            <span className="text-[10px] text-gray-500 font-normal text-right whitespace-nowrap">
              Copyright {currentYear} | FCP
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-[100dvh] bg-black flex justify-center items-center overflow-hidden pt-4 pb-20 px-2 sm:py-8 sm:px-8"
      style={{ 
        '--app-font-size': appFontSize,
        '--tab-font-size': tabFontSize 
      } as React.CSSProperties}
    >
      <div className="w-full max-w-[420px] h-full bg-[#FFFFFF] flex flex-col relative overflow-hidden shadow-xl border-4 border-black rounded-lg">
        <TopTabs activeTab={activeTab} onSelectTab={setActiveTab} />
        <div className="h-1 bg-[#000000] w-full shrink-0 z-10" />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'produits' && <ProduitTab produits={produits} settings={settings} onSaveProduit={handleSaveProduit} onArchiveProduit={handleArchiveProduit} onRestoreProduit={handleRestoreProduit} />}
          {activeTab === 'service' && <ServiceTab services={services} settings={settings} onSaveService={handleSaveService} onArchiveService={handleArchiveService} onRestoreService={handleRestoreService} />}
          {activeTab === 'clients' && <ClientTab clients={clients} onSaveClient={handleSaveClient} onArchiveClient={handleArchiveClient} onRestoreClient={handleRestoreClient} />}
          {activeTab === 'vente' && <VenteTab ventes={ventes} produits={produits} services={services} clients={clients} settings={settings} onSaveVente={handleSaveVente} onCancelVente={handleCancelVente} onRestoreVente={handleRestoreVente} />}
          {activeTab === 'parametres' && <ParametresTab settings={settings} onSaveSettings={handleSaveSettings} onResetAllData={handleResetAllData} />}
          {activeTab === 'perf' && <StatsTab ventes={ventes} produits={produits} services={services} clients={clients} settings={settings} />}
          {activeTab === 'compte' && <CompteTab onLogout={handleLogout} />}
        </div>
        <div className="w-full bg-black py-1 px-3 flex flex-row items-center justify-between shrink-0 select-none z-20">
          <div className="text-[10px] text-gray-500 text-left font-normal truncate max-w-[50%]">
            {user?.email?.split('@')[0]}
          </div>
          <div className="text-[10px] text-gray-500 text-right font-normal whitespace-nowrap ml-auto">
            Copyright {currentYear} | FCP
          </div>
        </div>
      </div>
    </div>
  );
}
