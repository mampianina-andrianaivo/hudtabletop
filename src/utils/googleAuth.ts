import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory and localStorage.
let cachedAccessToken: string | null = localStorage.getItem('fcp_drive_token');

export const createGoogleProvider = () => {
  const p = new GoogleAuthProvider();
  p.addScope('https://www.googleapis.com/auth/drive.file');
  p.addScope('https://www.googleapis.com/auth/userinfo.email');
  p.addScope('https://www.googleapis.com/auth/userinfo.profile');
  p.setCustomParameters({
    prompt: 'select_account',
  });
  return p;
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const savedToken = cachedAccessToken || localStorage.getItem('fcp_drive_token');
    if (user && savedToken) {
      cachedAccessToken = savedToken;
      if (onAuthSuccess) onAuthSuccess(user, savedToken);
    } else if (user && isSigningIn) {
      // Waiting for popup sign-in to finish
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('fcp_drive_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = createGoogleProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('fcp_drive_token', credential.accessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/user-cancelled') {
      console.log('Sign in popup closed or cancelled by user.');
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem('fcp_drive_token');
};

export const logout = async () => {
  cachedAccessToken = null;
  localStorage.removeItem('fcp_drive_token');
  await auth.signOut();
};
