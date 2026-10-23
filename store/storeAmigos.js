import { create } from 'zustand';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { gerarCodigo, normalizarCodigo } from '../utils/codigoViagem';

// ─────────────────────────────────────────────────────────────────────────────
// Amigos
// • friendCodes/{código} → { uid, name }: o código de amigo de cada pessoa (ex: K7XB9Q)
// • friendships/{uidA_uidB} (uids por ordem): o pedido e, depois de aceite, a amizade
//   { users: [a, b], from, to, names: { uid: nome }, status: 'pending' | 'accepted' }
// ─────────────────────────────────────────────────────────────────────────────

const getUid = () => auth.currentUser?.uid;
const codeRef = (code) => doc(db, 'friendCodes', code);
const perfilRef = (uid) => doc(db, 'users', uid);
export const parId = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
const amizadeRef = (a, b) => doc(db, 'friendships', parId(a, b));

const useAmigosStore = create((set, get) => ({
  meuCodigo: null,
  ligacoes: [], // todas as friendships em que entro (pedidos e amizades)
  carregado: false,

  reset: () => set({ meuCodigo: null, ligacoes: [], carregado: false }),

  // Ouve em tempo real os pedidos e as amizades. Devolve a função para parar.
  subscrever: () => {
    const uid = getUid();
    if (!uid) return () => {};
    return onSnapshot(
      query(collection(db, 'friendships'), where('users', 'array-contains', uid)),
      (snap) => set({ ligacoes: snap.docs.map(d => ({ ...d.data(), id: d.id })), carregado: true }),
      (e) => { console.warn('[Amigos]', e?.code ?? e?.message); set({ carregado: true }); },
    );
  },

  // Devolve o código de amigo do utilizador, criando-o na primeira vez (precisa de internet)
  obterMeuCodigo: async (nome) => {
    const uid = getUid();
    if (!uid) return null;
    if (get().meuCodigo) return get().meuCodigo;
    const perfil = await getDoc(perfilRef(uid));
    let code = perfil.exists() ? perfil.data().friendCode : null;
    if (!code) {
      for (let i = 0; i < 5 && !code; i++) {
        const candidato = gerarCodigo();
        try {
          await setDoc(codeRef(candidato), { uid, name: (nome || 'Amigo').slice(0, 50) });
          code = candidato;
        } catch (e) {
          if (e?.code !== 'permission-denied') throw e; // ocupado por outra pessoa → tenta outro
        }
      }
      if (!code) throw new Error('sem-codigo');
      await setDoc(perfilRef(uid), { friendCode: code }, { merge: true });
    }
    set({ meuCodigo: code });
    return code;
  },

  // Envia pedido de amizade a partir do código. Devolve 'enviado' | 'aceite' | 'ja-amigos' |
  // 'ja-enviado' | 'proprio' | 'invalido'
  enviarPedido: async (codigo, meuNome) => {
    const uid = getUid();
    const snap = await getDoc(codeRef(normalizarCodigo(codigo)));
    if (!snap.exists()) return 'invalido';
    const { uid: outro, name: outroNome } = snap.data();
    if (outro === uid) return 'proprio';

    const existente = get().ligacoes.find(l => l.users.includes(outro));
    if (existente?.status === 'accepted') return 'ja-amigos';
    if (existente?.from === uid) return 'ja-enviado';
    if (existente?.to === uid) { await get().aceitar(existente.id); return 'aceite'; } // a outra pessoa já tinha pedido

    await setDoc(amizadeRef(uid, outro), {
      users: [uid, outro],
      from: uid,
      to: outro,
      names: { [uid]: (meuNome || 'Amigo').slice(0, 50), [outro]: outroNome },
      status: 'pending',
      createdAt: Date.now(),
    });
    return 'enviado';
  },

  aceitar: (id) => updateDoc(doc(db, 'friendships', id), { status: 'accepted' }),

  // Recusar um pedido, cancelar um pedido enviado ou remover um amigo
  remover: (id) => deleteDoc(doc(db, 'friendships', id)),
}));

// Lista derivada para os ecrãs
export const separarLigacoes = (ligacoes, uid) => {
  const outro = (l) => l.users.find(u => u !== uid);
  const comNome = (l) => ({ id: l.id, uid: outro(l), name: l.names?.[outro(l)] ?? 'Amigo' });
  return {
    amigos: ligacoes.filter(l => l.status === 'accepted').map(comNome).sort((a, b) => a.name.localeCompare(b.name)),
    recebidos: ligacoes.filter(l => l.status === 'pending' && l.to === uid).map(comNome),
    enviados: ligacoes.filter(l => l.status === 'pending' && l.from === uid).map(comNome),
  };
};

export { useAmigosStore };
