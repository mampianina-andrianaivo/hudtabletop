import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Check, XCircle } from 'lucide-react';
import { usePlayerStore, PlayerState } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';

interface PlayerConfigModalProps {
  onClose: () => void;
}

export function PlayerConfigModal({ onClose }: PlayerConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'aesthetic' | 'resources' | 'stats1' | 'stats2'>('aesthetic');
  const store = usePlayerStore();
  
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

  const isFormValid = draft.resources?.every(res => {
    const val = parseInt(res.max, 10);
    return !isNaN(val) && val > 0 && /^\d+$/.test(res.max);
  }) ?? true;

  const renderTabs = () => (
    <div className="flex border-b border-[#5a4b3c] mb-6">
      {[
        { id: 'aesthetic', label: 'Aesthetic' },
        { id: 'resources', label: 'Resources' },
        { id: 'stats1', label: 'Stats 1-6' },
        { id: 'stats2', label: 'Stats 7-12' },
      ].map(tab => (
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-10 overflow-y-auto backdrop-blur-sm pb-10">
      <div className="w-full max-w-2xl wow-panel shadow-2xl relative animate-in slide-in-from-top-4 flex flex-col">
        
        <h2 className="font-cinzel text-2xl text-wow-gold mb-2 text-center drop-shadow-md">Character Configuration</h2>
        
        {renderTabs()}

        <div className="h-[340px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
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

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm mb-4 font-sans">Configure your primary resources. The first resource (Red) is always visible.</p>
              {draft.resources?.map((res, i) => {
                const colorMap: Record<string, string> = {
                  red: 'bg-red-500',
                  blue: 'bg-blue-500',
                  purple: 'bg-purple-500',
                  yellow: 'bg-purple-500',
                  green: 'bg-green-500',
                };
                return (
                <div key={i} className="flex items-center gap-4 bg-wow-dark/50 p-3 border border-[#5a4b3c]/50 rounded">
                  <input 
                    type="checkbox"
                    checked={res.isVisible}
                    disabled={i === 0} // First is always visible
                    onChange={(e) => {
                      const newRes = [...(draft.resources || [])];
                      newRes[i].isVisible = e.target.checked;
                      setDraft(prev => ({ ...prev, resources: newRes as any }));
                    }}
                    className="w-5 h-5 accent-wow-gold cursor-pointer"
                  />
                  <div className={cn("w-4 h-4 rounded-full", colorMap[res.color] || 'bg-gray-500')}></div>
                  <input 
                    type="text" 
                    value={res.name}
                    onChange={(e) => {
                      const newRes = [...(draft.resources || [])];
                      newRes[i].name = e.target.value;
                      setDraft(prev => ({ ...prev, resources: newRes as any }));
                    }}
                    className="flex-1 min-w-[100px] bg-transparent border-b border-[#5a4b3c] text-gray-200 px-2 py-1 focus:outline-none focus:border-wow-gold font-macondo"
                    placeholder="Resource Name"
                  />
                  <input 
                    type="text" 
                    value={res.max}
                    onChange={(e) => {
                      const newRes = [...(draft.resources || [])];
                      newRes[i].max = e.target.value;
                      setDraft(prev => ({ ...prev, resources: newRes as any }));
                    }}
                    className="w-16 sm:w-24 bg-transparent border-b border-[#5a4b3c] text-right text-gray-200 px-2 py-1 focus:outline-none focus:border-wow-gold font-mono"
                    placeholder="Max"
                  />
                </div>
              )})}
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
        </div>

        {/* Action Buttons */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c] to-transparent mb-4"></div>
        <div className="flex justify-end gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="wow-button px-4 py-2 font-cinzel text-sm flex items-center gap-2"
          >
            <XCircle size={16} />Cancel</button>
          <button 
            onClick={handleSave}
            disabled={!isFormValid}
            className={cn(
              "px-6 py-2 flex items-center gap-2 rounded text-sm transition-colors",
              isFormValid ? "wow-button" : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
            )}
          >
            <Check size={16} /> Valider
          </button>
        </div>

      </div>
    </div>
  );
}
