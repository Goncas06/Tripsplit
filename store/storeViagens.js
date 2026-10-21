import { create } from 'zustand';
import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from '../utils/firebase';
import { slimTrip } from '../utils/share';
import { gerarCodigo, normalizarCodigo } from '../utils/codigoViagem';

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getUid = () => auth.currentUser?.uid;
const tripsCol = (uid) => collection(db, 'users', uid, 'trips');
const tripDoc = (uid, tripId) => doc(db, 'users', uid, 'trips', tripId);
// Cópia pública (para quem tem o código) de uma viagem partilhada
const sharedDoc = (code) => doc(db, 'sharedTrips', code);
// Um código de partilha é válido durante 30 dias; partilhar de novo renova o prazo
export const VALIDADE_PARTILHA_MS = 30 * 24 * 60 * 60 * 1000;
const dadosPartilha = (uid, trip, expiraEm) => ({
  ownerId: uid,
  trip: sanitize(slimTrip(trip)),
  updatedAt: Date.now(),
  expiresAt: Timestamp.fromMillis(expiraEm), // Timestamp: as regras comparam com request.time
});
const partilhaAtiva = (trip) => !!trip?.shareCode && (trip.shareExpiresAt ?? 0) > Date.now();

// Um código está livre se não existir. Um código expirado de outra pessoa é recusado
// pelas regras (permission-denied) — também conta como ocupado.
async function codigoLivre(code) {
  try {
    return !(await getDoc(sharedDoc(code))).exists();
  } catch (e) {
    if (e?.code === 'permission-denied') return false;
    throw e;
  }
}

// Firestore não aceita campos undefined — remove-os antes de guardar
const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

// A UI é atualizada logo; a gravação segue em segundo plano. Assim, sem rede, os ecrãs
// não ficam à espera da confirmação do servidor (o Firestore envia quando houver ligação).
function persist(promise, context) {
  promise.catch(e => handleFirebaseError(e, context));
}

function handleFirebaseError(e, context) {
  console.error(`[Firebase] ${context}:`, e?.code, e?.message);
  if (e?.code === 'permission-denied') {
    Alert.alert(
      'Erro de permissão',
      'Sem permissão para aceder aos dados. Verifica as regras do Firestore no Firebase Console.',
    );
  } else if (e?.code === 'unavailable' || e?.code === 'failed-precondition') {
    // sem internet — não mostrar alerta, os dados locais estão OK
  } else if (e) {
    console.warn(`[Firebase] ${context} falhou:`, e.code ?? e.message);
  }
}

const useTripStore = create((set, get) => ({
  trips: [],

  // Chamado sempre que a conta muda, para não mostrar viagens de outro utilizador
  reset: () => set({ trips: [] }),

  loadTrips: async () => {
    const uid = getUid();
    if (!uid) return;
    try {
      const snap = await getDocs(tripsCol(uid));
      if (getUid() !== uid) return; // a conta mudou entretanto
      const trips = snap.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      set({ trips });
    } catch (e) {
      handleFirebaseError(e, 'loadTrips');
    }
  },

  addTrip: async (trip) => {
    const uid = getUid();
    if (!uid) return;
    const newTrip = {
      ...trip,
      id: trip.id || uuidv4(),
      participants: trip.participants || [],
      expenses: trip.expenses || [],
      createdAt: Date.now(),
    };
    set({ trips: [newTrip, ...get().trips] });
    persist(setDoc(tripDoc(uid, newTrip.id), sanitize(newTrip)), 'addTrip');
  },

  updateTrip: async (id, updates) => {
    const uid = getUid();
    if (!uid) return;
    const updatedTrips = get().trips.map(t => t.id === id ? { ...t, ...updates } : t);
    set({ trips: updatedTrips });
    const updatedTrip = updatedTrips.find(t => t.id === id);
    if (!updatedTrip) return;
    // setDoc em vez de updateDoc para garantir que o documento existe
    persist(setDoc(tripDoc(uid, id), sanitize(updatedTrip)), 'updateTrip');
    // Mantém a cópia partilhada em dia, para quem importar depois receber a versão atual
    if (partilhaAtiva(updatedTrip)) {
      persist(setDoc(sharedDoc(updatedTrip.shareCode), dadosPartilha(uid, updatedTrip, updatedTrip.shareExpiresAt)), 'updateShare');
    }
  },

  deleteTrip: async (id) => {
    const uid = getUid();
    if (!uid) return;
    const trip = get().trips.find(t => t.id === id);
    set({ trips: get().trips.filter(t => t.id !== id) });
    persist(deleteDoc(tripDoc(uid, id)), 'deleteTrip');
    if (trip?.shareCode) persist(deleteDoc(sharedDoc(trip.shareCode)), 'deleteShare');
  },

  // Devolve { code, expiraEm }: cria o código na primeira partilha e renova a validade
  // (30 dias) a cada partilha. Precisa de internet. Lança o erro do Firestore
  // (ex: permission-denied) para o ecrã explicar o problema.
  partilharViagem: async (id) => {
    const uid = getUid();
    const trip = get().trips.find(t => t.id === id);
    if (!uid || !trip) throw new Error('viagem-inexistente');
    let code = trip.shareCode;
    if (!code) {
      for (let i = 0; i < 5 && !code; i++) {
        const candidato = gerarCodigo();
        if (await codigoLivre(candidato)) code = candidato;
      }
      if (!code) throw new Error('sem-codigo');
    }
    const expiraEm = Date.now() + VALIDADE_PARTILHA_MS;
    await setDoc(sharedDoc(code), dadosPartilha(uid, trip, expiraEm));
    get().updateTrip(id, { shareCode: code, shareExpiresAt: expiraEm });
    return { code, expiraEm };
  },

  // Apaga a cópia partilhada: o código deixa de funcionar de imediato
  pararPartilha: (id) => {
    const trip = get().trips.find(t => t.id === id);
    if (!trip?.shareCode) return;
    persist(deleteDoc(sharedDoc(trip.shareCode)), 'stopShare');
    get().updateTrip(id, { shareCode: undefined, shareExpiresAt: undefined });
  },

  // Dados de uma viagem partilhada pelo código; null se não existir ou já tiver expirado
  obterViagemPartilhada: async (codigo) => {
    try {
      const snap = await getDoc(sharedDoc(normalizarCodigo(codigo)));
      if (!snap.exists()) return null;
      const d = snap.data();
      if (d.expiresAt?.toMillis && d.expiresAt.toMillis() < Date.now()) return null;
      return d.trip;
    } catch (e) {
      if (e?.code === 'permission-denied') return null; // expirado (recusado pelas regras)
      throw e;
    }
  },
}));

export { useTripStore };
