import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function sendVerificationEmail() {
    if (!auth.currentUser) return Promise.resolve();
    return sendEmailVerification(auth.currentUser);
  }

  useEffect(() => {
    let autoLoginAttempted = false;

    const unsubscribe = onAuthStateChanged(auth, async user => {
      // Auto-login utility for local emulator development
      if (
        !user &&
        import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' &&
        !autoLoginAttempted
      ) {
        autoLoginAttempted = true;
        const testEmail = 'dev@recifree.local';
        const testPassword = 'password123';
        
        try {
          await signInWithEmailAndPassword(auth, testEmail, testPassword);
          // Assuming successful, onAuthStateChanged re-triggers with real user.
          return;
        } catch (error) {
          // If the test user isn't in Auth DB yet, gracefully build them.
          try {
            await createUserWithEmailAndPassword(auth, testEmail, testPassword);
            return;
          } catch (e) {
            console.warn("Local Dev: Auto-login failed:", e);
          }
        }
      }

      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isEmailVerified: currentUser?.emailVerified ?? false,
    login,
    signup,
    loginWithGoogle,
    logout,
    resetPassword,
    sendVerificationEmail,
    loadingAuth: loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
