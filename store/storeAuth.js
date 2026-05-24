import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  // Configura o listener de autenticação — chama uma vez no App.jsx
  // Retorna a função de cleanup (unsubscribe)
  initAuth: () => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        set({
          user: {
            id: firebaseUser.uid,
            name: firebaseUser.displayName ?? firebaseUser.email,
            email: firebaseUser.email,
          },
          loading: false,
        });
      } else {
        set({ user: null, loading: false });
      }
    });
  },

  signup: async (name, email, password) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      // Guarda o perfil no Firestore para outros utilizadores poderem encontrar
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      return { success: true };
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') return { error: 'Já existe uma conta com este email.' };
      if (e.code === 'auth/weak-password') return { error: 'A password deve ter pelo menos 6 caracteres.' };
      return { error: 'Erro ao criar conta. Tenta novamente.' };
    }
  },

  login: async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { success: true };
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        return { error: 'Email ou password incorretos.' };
      }
      return { error: 'Erro ao iniciar sessão. Tenta novamente.' };
    }
  },

  logout: async () => {
    await signOut(auth);
    // onAuthStateChanged trata de limpar o user no store
  },
}));

export { useAuthStore };
