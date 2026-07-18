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
import { getUserProfile, createUserProfile, updateUserProfile } from '../services/userService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
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
        (import.meta.env.MODE !== 'test' || import.meta.env.VITE_ALLOW_AUTO_LOGIN === 'true') &&
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
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          
          if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' && user.email === 'dev@recifree.local') {
            if (!profile) {
              profile = await createUserProfile(user.uid, {
                displayName: 'Local Admin',
                role: 'admin'
              });
            } else if (profile.role !== 'admin') {
              await updateUserProfile(user.uid, { role: 'admin' });
              profile.role = 'admin';
            }
          }

          setUserProfile(profile);
        } catch (e) {
          console.error("Failed to fetch user profile:", e);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    isEmailVerified: (currentUser?.emailVerified ?? false) || (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' && currentUser?.email === 'dev@recifree.local'),
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
