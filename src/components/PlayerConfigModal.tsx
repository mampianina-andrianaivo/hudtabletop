import React, { useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';

interface PlayerConfigModalProps {
  onClose: () => void;
}

export function PlayerConfigModal({ onClose }: PlayerConfigModalProps) {
  const store = usePlayerStore();
  
  // Local draft state for photo only
  const [draftPhoto, setDraftPhoto] = useState<string | null>(store.photo);

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
          setDraftPhoto(dataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    store.loadState({ photo: draftPhoto });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center backdrop-blur-md px-4">
      <div className="w-full max-w-sm wow-panel shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col p-6 border-2 border-wow-gold/60 bg-[#1c120c] rounded">
        
        {/* Centered Title */}
        <h2 className="font-cinzel text-lg text-wow-gold mb-6 text-center tracking-widest uppercase drop-shadow-md">
          Portrait
        </h2>
        
        {/* Centered Preview Photo */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-40 h-40 bg-black/60 border-2 border-[#5a4b3c] rounded overflow-hidden flex items-center justify-center relative shadow-[0_0_15px_rgba(0,0,0,0.8)]">
            {draftPhoto ? (
              <img src={draftPhoto} alt="Portrait" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-600 font-cinzel text-xs uppercase tracking-wider">No Photo</span>
            )}
            <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.6)] pointer-events-none"></div>
          </div>
        </div>

        {/* Upload & Delete in 1 line, centered */}
        <div className="flex items-center justify-center gap-3 mb-8 w-full">
          <label className="wow-button px-3.5 py-2 cursor-pointer flex items-center justify-center gap-1.5 font-cinzel tracking-wider text-[10px] uppercase shrink-0">
            <Upload size={12} className="text-wow-gold" /> Upload Photo
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          
          <button 
            onClick={() => setDraftPhoto(null)}
            disabled={!draftPhoto}
            className={cn(
              "wow-button px-3.5 py-2 flex items-center justify-center gap-1.5 font-cinzel tracking-wider text-[10px] uppercase border-red-900/60 shrink-0",
              draftPhoto 
                ? "text-red-400 hover:text-red-300 hover:border-red-600 cursor-pointer" 
                : "text-gray-600 border-gray-800 opacity-40 cursor-pointer"
            )}
          >
            <Trash2 size={12} /> Delete Photo
          </button>
        </div>

        {/* Subtle Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c]/50 to-transparent mb-6"></div>
        
        {/* Centered Cancel & OK Buttons (no icons) */}
        <div className="flex justify-center gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="wow-button px-6 py-2 font-cinzel text-[11px] tracking-widest min-w-[90px] text-center"
          >
            CANCEL
          </button>
          <button 
            onClick={handleSave}
            className="wow-button px-8 py-2 rounded text-[11px] font-bold tracking-widest min-w-[90px] text-center text-green-400 border-green-700/80 hover:bg-green-950/40"
          >
            OK
          </button>
        </div>

      </div>
    </div>
  );
}
