import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { db, auth, ensureAuthenticated } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export function useFirebaseSync(role: 'player' | 'gm') {
  const store = usePlayerStore();
  const [status, setStatus] = useState<'offline' | 'connecting' | 'online' | 'error'>('offline');
  const userIdRef = useRef<string | null>(null);
  
  // Track if we are currently updating from Firebase to prevent echo
  const isReceivingRef = useRef(false);

  useEffect(() => {
    if (!db || !auth) {
      console.warn("Firebase not configured");
      setStatus('error');
      return;
    }

    let unsub: () => void;

    const init = async () => {
      setStatus('connecting');
      try {
        const user = await ensureAuthenticated();
        userIdRef.current = user.uid;
        setStatus('online');
        
        if (role === 'player') {
           // We are a player, let's sync our store to Firebase
           // In a full app, we might use a room ID. Here we just use the UID.
           const docRef = doc(db, 'players', user.uid);
           
           // Initial push of our local state
           await setDoc(docRef, usePlayerStore.getState(), { merge: true });
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    init();

    return () => {
      if (unsub) unsub();
    };
  }, [role]);

  // Subscribe to local store changes and push to Firebase (Player only)
  useEffect(() => {
    if (role !== 'player' || status !== 'online' || !userIdRef.current || !db) return;

    // Use a subscription to the store to push updates
    const unsub = usePlayerStore.subscribe((state) => {
      if (isReceivingRef.current) return; // Prevent echo
      
      const docRef = doc(db, 'players', userIdRef.current!);
      // Debounce this in a real app, but for now just push
      setDoc(docRef, state, { merge: true }).catch(err => {
         console.error("Firebase sync error:", err);
      });
    });

    return () => unsub();
  }, [status, role]);

  return { status };
}
