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
import { SubRibbon } from './components/SubRibbon';
import { FCPWindow } from './components/FCPWindow';
import { FonctionnalitesContent, ConditionsContent } from './components/InfoTexts';
import { Info, Shield } from 'lucide-react';
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
        
        // Also sync back to local storage just in case
        if (data.settings) saveSettings(data.settings);
        if (data.produits) saveProduits(data.produits);
        if (data.services) saveServices(data.services);
        if (data.clients) saveClients(data.clients);
        if (data.ventes) saveVentes(data.ventes);
      }
    } catch (error: any) {
      console.error('Failed to load/initialize data from Drive:', error);
      setAuthError("Le rattachement à votre Google Drive suit un processus de confirmation. Veuillez vous reconnecter avec votre compte Google déjà inscrit maintenant.");
      // Logout to prevent desynchronized state
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
    // Sync data first to be safe
    if (user) {
      try {
        await saveDataToDrive(user, { settings, produits, services, clients, ventes });
      } catch (e) {
        console.error('Logout sync failed:', e);
      }
    }
    
    // Clear local data so the next session/user starts fresh
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

  // Save changes to storage
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

  if (isInitializing) {
    return (
      <div className="w-full h-[100dvh] bg-black flex justify-center items-center overflow-hidden pt-4 pb-20 px-2 sm:py-8 sm:px-8">
        <div className="w-full max-w-[420px] h-full bg-[#FFFFFF] flex flex-col items-center justify-center border-4 border-rose-600 rounded-lg">
          <span className="font-bold text-neutral-600">Chargement des données...</span>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="w-full h-[100dvh] bg-black flex justify-center items-center overflow-hidden pt-4 pb-20 px-2 sm:py-8 sm:px-8">
        <div className="w-full max-w-[420px] h-full bg-[#FFFFFF] flex flex-col relative overflow-hidden shadow-xl border-4 border-rose-600 rounded-lg px-6 text-center">
          <div className="flex-1 w-full flex flex-col items-center justify-center overflow-y-auto py-4">
            
            <div className="flex flex-col items-center mb-6 w-full gap-1">
              <div className="flex justify-between w-[270px] text-5xl font-extrabold tracking-tight">
                <div className="w-[65px] text-center">F</div>
                <div className="w-[65px] text-center">C</div>
                <div className="w-[65px] text-center">P</div>
              </div>
              <h2 className="text-lg font-bold text-[#116611] tracking-wider whitespace-nowrap flex justify-between w-[270px]">
                <div className="w-[65px] text-center">FACILE</div>
                <div className="w-[65px] text-center">CLAIRE</div>
                <div className="w-[65px] text-center">PROPRE</div>
              </h2>
            </div>
            
            <div className="bg-[#E8F3E8] p-4 rounded-md mb-6 text-sm text-neutral-800 leading-relaxed border border-[#116611]/20 shadow-sm w-full text-center">
              <strong>Vous avez besoin de cette application 100% gratuite si :</strong><br/><br/>
              Vous souhaitez garder une trace rapide de vos ventes ou suivre vos clients sans vous encombrer de logiciels complexes ni d'abonnements payants. Tout est à portée de main, sécurisé, et entièrement gratuit.
            </div>

            <p className="text-neutral-600 text-sm mb-4">
              Vos données seront stockées de manière sécurisée et privée dans un dossier dédié sur votre propre Google Drive.
            </p>

            <div className="text-xs text-neutral-600 bg-neutral-100 border border-neutral-200 rounded p-2.5 mb-6 text-center max-w-[340px]">
              ℹ️ Vos données seront sauvegardées automatiquement et de manière privée dans un dossier FCP sur votre Google Drive.
            </div>

            <button onClick={handleLogin} disabled={isLoggingIn} className="gsi-material-button bg-white border border-neutral-300 rounded-md p-0 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 h-10 w-full max-w-sm flex items-center justify-center gap-3 mb-3 shrink-0">
              <div className="w-10 h-10 bg-white flex items-center justify-center shrink-0">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" className="w-5 h-5 block">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="font-medium text-neutral-700 text-sm pe-4">{isLoggingIn ? 'Connexion...' : 'Inscription / Connexion'}</span>
            </button>
            
            <p className="text-sm leading-tight text-neutral-500 mb-4 max-w-[300px]">
              En vous connectant, vous acceptez les conditions et confirmez avoir pris connaissance des fonctionnalités proposées.
            </p>

            {authError && (
              <div className="bg-[#E8F3E8] border border-[#116611]/30 text-[#116611] text-xs p-3 rounded mb-4 max-w-[340px] text-center leading-relaxed font-medium shadow-sm">
                {authError}
              </div>
            )}
            
            <div className="flex gap-4 w-full justify-center mt-auto pt-4 shrink-0 border-t border-neutral-100">
              <button onClick={() => setLandingInfoMode('fonctionnalites')} className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-black transition-colors cursor-pointer">
                <Info className="w-4 h-4" />
                Fonctionnalités
              </button>
              <span className="text-neutral-300">•</span>
              <button onClick={() => setLandingInfoMode('conditions')} className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-black transition-colors cursor-pointer">
                <Shield className="w-4 h-4" />
                Conditions
              </button>
            </div>
          </div>

          {landingInfoMode && (
            <FCPWindow
              title={landingInfoMode === 'fonctionnalites' ? 'Fonctionnalités' : 'Conditions'}
              cancelLabel="X"
              onCancel={() => setLandingInfoMode(null)}
            >
              <div className="p-4 max-w-md mx-auto text-left flex flex-col gap-5 tab-content-scroll overflow-y-auto max-h-[70vh]">
                {landingInfoMode === 'fonctionnalites' && <FonctionnalitesContent />}
                {landingInfoMode === 'conditions' && <ConditionsContent />}
              </div>
            </FCPWindow>
          )}

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
      {/* Smartphone fixed frame container */}
      <div className="w-full max-w-[420px] h-full bg-[#FFFFFF] flex flex-col relative overflow-hidden shadow-xl border-4 border-rose-600 rounded-lg">
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
          {activeTab === 'compte' && <CompteTab onLogout={handleLogout} userEmail={user?.email || undefined} />}
        </div>
      </div>
    </div>
  );
}
