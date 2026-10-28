import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      cachedAccessTokenExpiresAt = 0;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    // Google OAuth access tokens normally expire after about one hour. Expire locally early
    // so a stale token is never reported as a confirmed authorization.
    cachedAccessTokenExpiresAt = Date.now() + 50 * 60 * 1000;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al iniciar sesión con Google:', error);

    // Give a specific, actionable message for Firebase Authentication domain configuration.
    // The allowlist is managed in Firebase Console, not in this source file.
    if (error?.code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const domainHint = host
        ? ` El dominio actual es: ${host}.`
        : '';
      const actionableError = new Error(
        'Firebase bloqueó el inicio de sesión porque este dominio no está autorizado.' +
        domainHint +
        ' En Firebase Console, abra Authentication > Settings > Authorized domains y agregue el dominio de la aplicación. Para la versión publicada, agregue saritama26-coder.github.io (sin https:// ni rutas). Luego vuelva a cargar la aplicación e intente vincular Google Drive otra vez.'
      );
      (actionableError as any).code = error.code;
      throw actionableError;
    }

    if (error?.code === 'auth/operation-not-allowed') {
      const actionableError = new Error(
        'El proveedor Google no está habilitado en Firebase. En Firebase Console, abra Authentication > Sign-in method y habilite Google.'
      );
      (actionableError as any).code = error.code;
      throw actionableError;
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken || Date.now() >= cachedAccessTokenExpiresAt) {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAt = 0;
    return null;
  }
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
};
