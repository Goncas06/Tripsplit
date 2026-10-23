import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { auth, db } from '../utils/firebase';
import { useTripStore } from './storeViagens';
import { useAmigosStore } from './storeAmigos';

// O Expo Go não inclui o módulo nativo do Google Sign-In — só é carregado em builds próprias
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const GoogleSignin = isExpoGo
  ? null
  : require('@react-native-google-signin/google-signin').GoogleSignin;

GoogleSignin?.configure({
  webClientId: '927132450855-bah2imv0j7dbqfrqlo66vcdrhtl9q5v7.apps.googleusercontent.com',
});

const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  // Configura o listener de autenticação — chama uma vez no App.jsx
  // Retorna a função de cleanup (unsubscribe)
  initAuth: () => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      useTripStore.getState().reset();
      useAmigosStore.getState().reset();
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
      // O listener de auth já correu antes de o nome existir — atualiza-o aqui
      set({ user: { id: cred.user.uid, name: name.trim(), email: cred.user.email } });
      // Guarda o perfil no Firestore para outros utilizadores poderem encontrar
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      return { success: true };
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') return { error: 'Já existe uma conta com este email.' };
      if (e.code === 'auth/weak-password') return { error: 'A password deve ter pelo menos 6 caracteres.' };
      if (e.code === 'auth/invalid-email') return { error: 'Insere um email válido.' };
      if (e.code === 'auth/network-request-failed') return { error: 'Sem ligação à internet.' };
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
      if (e.code === 'auth/invalid-email') return { error: 'Insere um email válido.' };
      if (e.code === 'auth/too-many-requests') return { error: 'Demasiadas tentativas. Espera um pouco e tenta de novo.' };
      if (e.code === 'auth/network-request-failed') return { error: 'Sem ligação à internet.' };
      return { error: 'Erro ao iniciar sessão. Tenta novamente.' };
    }
  },

  loginWithGoogle: async () => {
    if (!GoogleSignin) {
      return { error: 'O login com Google não está disponível no Expo Go. Usa email e password.' };
    }
    try {
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      const credential = GoogleAuthProvider.credential(data.idToken);
      const result = await signInWithCredential(auth, credential);
      const userRef = doc(db, 'users', result.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          name: result.user.displayName ?? result.user.email,
          email: result.user.email,
        });
      }
      return { success: true };
    } catch (e) {
      console.warn('[Google SignIn]', e?.code, e?.message);
      if (e?.code === 'SIGN_IN_CANCELLED') return { error: null };
      return { error: 'Não foi possível entrar com o Google. Tenta novamente.' };
    }
  },

  logout: async () => {
    try { await GoogleSignin?.signOut(); } catch {}
    await signOut(auth);
  },

  // Envia o email de recuperação. A resposta é sempre a mesma, exista ou não a conta
  // (não revela que emails estão registados).
  recuperarPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (e) {
      if (e.code === 'auth/invalid-email') return { error: 'Insere um email válido.' };
      if (e.code === 'auth/network-request-failed') return { error: 'Sem ligação à internet.' };
      if (e.code === 'auth/user-not-found') return { success: true };
      return { error: 'Não foi possível enviar o email. Tenta novamente.' };
    }
  },

  // Apaga a conta e os dados: viagens criadas pelo utilizador (para todos), saída das
  // viagens dos outros, amizades, código de amigo e perfil. Pede a password por segurança.
  apagarConta: async (password) => {
    const u = auth.currentUser;
    if (!u) return { error: 'Sessão inválida.' };
    try {
      if (u.providerData.some(p => p.providerId === 'password')) {
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
      }
      await useTripStore.getState().apagarDadosDoUtilizador();
      await useAmigosStore.getState().apagarDadosDoUtilizador();
      await deleteDoc(doc(db, 'users', u.uid));
      try { await GoogleSignin?.signOut(); } catch {}
      await deleteUser(u);
      return { success: true };
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') return { error: 'Password incorreta.' };
      if (e.code === 'auth/requires-recent-login') return { error: 'Por segurança, termina sessão, volta a entrar e tenta de novo.' };
      if (e.code === 'auth/network-request-failed' || e.code === 'unavailable') return { error: 'Sem ligação à internet.' };
      console.warn('[Apagar conta]', e?.code, e?.message);
      return { error: 'Não foi possível apagar a conta. Tenta novamente.' };
    }
  },
}));

export { useAuthStore };
