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
      <div 
        className="w-full h-[100dvh] bg-black flex justify-center items-center overflow-hidden pt-4 pb-20 px-2 sm:py-8 sm:px-8"
        style={{ 
          '--app-font-size': '14px',
          '--tab-font-size': '14px' 
        } as React.CSSProperties}
      >
        <div className="w-full max-w-[420px] h-full bg-[#FFFFFF] flex flex-col relative overflow-hidden shadow-xl border-4 border-black rounded-lg text-center">
          <div className="flex-1 w-full flex flex-col items-center justify-center overflow-y-auto py-4 px-6 relative">
            
            <div className="w-full text-left mb-3">
              <h1 className="text-2xl font-black text-black leading-tight tracking-wider uppercase">
                FACILE<br />
                CLAIRE<br />
                PROPRE
              </h1>
              <div className="w-1/2 border-b-2 border-black mt-3 mb-4"></div>
              
              <p className="text-sm font-medium text-black leading-snug">
                Webapp d'enregistrement statistique<br />
                de vos activités de vente<br />
                axée sur la simplicité<br />
                et le minimalisme.
              </p>
              
              <div className="w-1/2 border-b-2 border-black mt-4 mb-4"></div>
            </div>

            <div className="w-full text-right mb-6">
              <p className="text-xs sm:text-sm text-black leading-snug mb-3">
                Vos données seront stockées de manière sécurisée<br />
                et privée dans un dossier dédié<br />
                sur votre propre Google Drive.
              </p>
              <p className="text-xs sm:text-sm text-black leading-snug">
                En vous connectant, vous acceptez les conditions<br />
                et confirmez avoir pris connaissance<br />
                des fonctionnalités proposées.
              </p>
            </div>

            <div className="w-full flex justify-center mb-4">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button bg-white border border-neutral-400 rounded-md p-0 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 h-10 w-full max-w-sm flex items-center justify-center gap-3 shrink-0"
              >
                <div className="w-10 h-10 bg-white flex items-center justify-center shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="font-semibold text-black text-sm pe-4">{isLoggingIn ? 'Connexion...' : 'Inscription / Connexion'}</span>
              </button>
            </div>

            {authError && (
              <div className="w-full flex flex-col items-center mb-4">
                <div className="border border-black bg-neutral-50 text-black text-sm p-3.5 rounded max-w-[340px] text-center leading-relaxed font-medium shadow-sm">
                  {authError}
                </div>
                <div className="mt-3 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-md">
                  <Check className="w-5 h-5 text-white stroke-[3]" />
                </div>
              </div>
            )}
            
            <div className="flex gap-4 w-full justify-center mt-auto pt-4 shrink-0 border-t border-neutral-200">
              <button
                onClick={() => setLandingInfoMode('fonctionnalites')}
                className="flex items-center gap-1.5 text-sm font-semibold text-black hover:opacity-75 transition-opacity cursor-pointer"
              >
                <Info className="w-4 h-4 text-black" />
                Fonctionnalités
              </button>
              <span className="text-black">•</span>
              <button
                onClick={() => setLandingInfoMode('conditions')}
                className="flex items-center gap-1.5 text-sm font-semibold text-black hover:opacity-75 transition-opacity cursor-pointer"
              >
                <Shield className="w-4 h-4 text-black" />
                Conditions
              </button>
            </div>

            {landingInfoMode && (
              <FCPWindow
                title={landingInfoMode === 'fonctionnalites' ? 'Fonctionnalités' : 'Conditions'}
                cancelLabel="X"
                onCancel={() => setLandingInfoMode(null)}
              >
                <div className="p-4 max-w-md mx-auto text-left flex flex-col gap-5">
                  {landingInfoMode === 'fonctionnalites' && <FonctionnalitesContent />}
                  {landingInfoMode === 'conditions' && <ConditionsContent />}
                </div>
              </FCPWindow>
            )}
          </div>

          {/* Bandelette copyright permanente avec texte en gris aligné à droite */}
          <div className="w-full bg-black py-1 px-3 flex flex-row items-center justify-end shrink-0 select-none">
            <span className="text-[10px] text-neutral-400 font-normal text-right whitespace-nowrap">
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
        
        {/* Bandelette permanente en bas : utilisateur (gauche) et copyright en gris (droite) */}
        <div className="w-full bg-black py-1 px-3 flex flex-row items-center justify-between shrink-0 select-none z-20">
          <div className="text-[10px] text-neutral-400 text-left font-normal truncate max-w-[50%]">
            {user?.email?.split('@')[0]}
          </div>
          <div className="text-[10px] text-neutral-400 text-right font-normal whitespace-nowrap ml-auto">
            Copyright {currentYear} | FCP
          </div>
        </div>
      </div>
    </div>
  );
}
