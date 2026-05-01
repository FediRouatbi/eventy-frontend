import { initializeApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  verifyPasswordResetCode,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function signInToFirebaseWithGoogle() {
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
  return credential.user;
}

export async function signInToFirebaseWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return credential.user;
}

export async function createFirebaseUser(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

  if (name.trim()) {
    await updateProfile(credential.user, {
      displayName: name.trim(),
    });
  }

  return credential.user;
}

export async function sendFirebaseEmailVerification(user: User) {
  await sendEmailVerification(user, getFirebaseActionSettings());
}

export async function getFirebaseIDToken(user: User) {
  return user.getIdToken(true);
}

export async function sendFirebasePasswordReset(email: string) {
  await sendPasswordResetEmail(firebaseAuth, email.trim(), getFirebaseActionSettings());
}

export async function signOutFromFirebase() {
  await signOut(firebaseAuth);
}

export async function verifyFirebaseEmailAction(code: string) {
  const action = await checkActionCode(firebaseAuth, code);
  await applyActionCode(firebaseAuth, code);
  return action.data.email ?? "Your email";
}

export async function getFirebasePasswordResetEmail(code: string) {
  return verifyPasswordResetCode(firebaseAuth, code);
}

export async function confirmFirebasePasswordReset(code: string, password: string) {
  await confirmPasswordReset(firebaseAuth, code, password);
}

function getFirebaseActionSettings() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return {
    url: `${window.location.origin}/auth/action`,
    handleCodeInApp: true,
  };
}
