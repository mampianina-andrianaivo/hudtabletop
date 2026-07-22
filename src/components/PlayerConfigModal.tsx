import React, { useState } from 'react';
import { Upload, Trash2, Check, XCircle } from 'lucide-react';
import { usePlayerStore, PlayerState } from '@/store/usePlayerStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useGMStore } from '@/store/useGMStore';
import { cn } from '@/lib/utils';

interface PlayerConfigModalProps {
  onClose: () => void;
}

export function PlayerConfigModal({ onClose }: PlayerConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'aesthetic' | 'stats1' | 'stats2'>('aesthetic');
  const store = usePlayerStore();
  const mpStore = useMultiplayerStore();
  const gmStore = useGMStore();
  
  const isFreeEdit = mpStore.isConnected ? mpStore.isFreeEdit : false;
  
  // Local draft state
  const [draft, setDraft] = useState<Partial<PlayerState>>({
    name: store.name,
    photo: store.photo,
    resources: JSON.parse(JSON.stringify(store.resources)),
    stats: JSON.parse(JSON.stringify(store.stats)),
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setDraft(prev => ({ ...prev, photo: dataUrl }));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    store.loadState(draft);
    onClose();
  };

  const renderTabs = () => {
    if (isFreeEdit) return null; // No tabs in free edit mode - photo only

    const tabs = [
      { id: 'aesthetic', label: 'Aesthetic' },
    ];
    if (!mpStore.isConnected) {
      tabs.push(
        { id: 'stats1', label: 'Stats 1-6' },
        { id: 'stats2', label: 'Stats 7-12' }
      );
    }

    if (tabs.length <= 1) return null;

    return (
      <div className="flex border-b border-[#5a4b3c] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-2 font-cinzel text-sm transition-colors",
              activeTab === tab.id 
                ? "text-wow-gold border-b-2 border-wow-gold" 
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-10 overflow-y-auto backdrop-blur-sm pb-10">
      <div className="w-full max-w-2xl wow-panel shadow-2xl relative animate-in slide-in-from-top-4 flex flex-col p-6">
        
        <h2 className="font-cinzel text-2xl text-wow-gold mb-2 text-center drop-shadow-md">
          {isFreeEdit ? "Modifier la Photo" : "Character Configuration"}
        </h2>
        
        {renderTabs()}

        <div className="h-[300px] overflow-y-auto mb-6 pr-2 custom-scrollbar flex flex-col justify-center">
          {isFreeEdit ? (
            /* Free Edit Mode: Photo ONLY */
            <div className="space-y-6 flex flex-col items-center">
              <label className="block font-macondo text-wow-gold text-center text-lg">Photo de portrait</label>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 bg-wow-dark border-2 border-[#5a4b3c] rounded overflow-hidden flex items-center justify-center relative shrink-0 shadow-lg">
                  {draft.photo ? (
                    <img src={draft.photo} alt="Portrait" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-600 font-cinzel text-xs">No Image</span>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <label className="wow-button px-4 py-2 text-sm cursor-pointer flex items-center justify-center gap-2 w-44">
                    <Upload size={16} /> Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  {draft.photo && (
                    <button 
                      onClick={() => setDraft(prev => ({ ...prev, photo: null }))}
                      className="wow-button px-4 py-2 text-sm flex items-center justify-center gap-2 w-44 text-red-400 border-red-800"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Scratch Player Mode: Aesthetic & Stats */
            <>
              {activeTab === 'aesthetic' && (
                <div className="space-y-6">
                  <div>
                    <label className="block font-macondo text-wow-gold mb-2">Character Name</label>
                    <input 
                      type="text" 
                      value={draft.name}
                      onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-wow-dark border border-[#5a4b3c] text-gray-200 px-4 py-2 rounded focus:outline-none focus:border-wow-gold font-cinzel"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-macondo text-wow-gold mb-2">Portrait</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-wow-dark border-2 border-[#5a4b3c] rounded overflow-hidden flex items-center justify-center relative shrink-0">
                        {draft.photo ? (
                          <img src={draft.photo} alt="Portrait" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-600 font-cinzel text-xs">No Image</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="wow-button px-4 py-2 text-sm cursor-pointer flex items-center justify-center gap-2 w-40">
                          <Upload size={16} /> Upload Photo
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                        {draft.photo && (
                          <button 
                            onClick={() => setDraft(prev => ({ ...prev, photo: null }))}
                            className="wow-button px-4 py-2 text-sm flex items-center justify-center gap-2 w-40 text-red-400"
                          >
                            <Trash2 size={16} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === 'stats1' || activeTab === 'stats2') && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm mb-4 font-sans">Configure character stats. Max value is fixed at 12.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {draft.stats?.slice(activeTab === 'stats1' ? 0 : 6, activeTab === 'stats1' ? 6 : 12).map((stat, idx) => {
                      const globalIndex = activeTab === 'stats1' ? idx : idx + 6;
                      return (
                        <div key={globalIndex} className="flex items-center gap-3 bg-wow-dark/50 p-2 border border-[#5a4b3c]/50 rounded">
                          <input 
                            type="checkbox"
                            checked={stat.isVisible}
                            onChange={(e) => {
                              const newStats = [...(draft.stats || [])];
                              newStats[globalIndex].isVisible = e.target.checked;
                              setDraft(prev => ({ ...prev, stats: newStats }));
                            }}
                            className="w-4 h-4 accent-wow-gold cursor-pointer shrink-0"
                          />
                          <span className="text-wow-gold font-mono font-bold text-xs select-none shrink-0 border border-wow-gold/20 rounded px-1.5 py-0.5 bg-black/40 min-w-[28px] text-center">
                            #{globalIndex + 1}
                          </span>
                          <input 
                            type="text" 
                            value={stat.name}
                            onChange={(e) => {
                              const newStats = [...(draft.stats || [])];
                              newStats[globalIndex].name = e.target.value;
                              setDraft(prev => ({ ...prev, stats: newStats }));
                            }}
                            className="flex-1 bg-transparent border-b border-[#5a4b3c] text-gray-200 px-1 py-1 focus:outline-none focus:border-wow-gold font-macondo text-sm min-w-0"
                            placeholder={`Stat ${globalIndex + 1}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c] to-transparent mb-4"></div>
        <div className="flex justify-end gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="wow-button px-4 py-2 font-cinzel text-sm flex items-center gap-2"
          >
            <XCircle size={16} />Cancel
          </button>
          <button 
            onClick={handleSave}
            className="wow-button px-6 py-2 flex items-center gap-2 rounded text-sm text-green-400 border-green-700"
          >
            <Check size={16} /> Valider
          </button>
        </div>

      </div>
    </div>
  );
}
