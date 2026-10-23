import { create } from 'zustand';
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, writeBatch,
  query, where, onSnapshot, arrayUnion, arrayRemove, deleteField, Timestamp,
} from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from '../utils/firebase';
import { gerarCodigo, normalizarCodigo } from '../utils/codigoViagem';

// ─────────────────────────────────────────────────────────────────────────────
// Modelo: cada viagem existe uma só vez em trips/{id}, com ownerId (quem criou)
// e members (uids com acesso). Todos os membros veem as alterações em tempo real.
// Despesas e participantes são alterados elemento a elemento (arrayUnion/arrayRemove)
// para que edições simultâneas de pessoas diferentes não se apaguem umas às outras.
// ─────────────────────────────────────────────────────────────────────────────

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getUid = () => auth.currentUser?.uid;
const tripsCol = collection(db, 'trips');
const tripRef = (id) => doc(db, 'trips', id);
const legacyCol = (uid) => collection(db, 'users', uid, 'trips'); // formato antigo (cópias por utilizador)
// Código curto → viagem
const sharedDoc = (code) => doc(db, 'sharedTrips', code);

// Um código de partilha é válido durante 30 dias; partilhar de novo renova o prazo
export const VALIDADE_PARTILHA_MS = 30 * 24 * 60 * 60 * 1000;

// Firestore não aceita campos undefined — remove-os antes de guardar
const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

// A UI é atualizada logo; a gravação segue em segundo plano. Sem rede, o Firestore
// guarda a escrita e envia-a quando houver ligação.
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

// Se duas pessoas editarem a mesma despesa ao mesmo tempo podem ficar duas versões com o
// mesmo id; fica a última.
const semDuplicados = (lista = []) => {
  const porId = new Map();
  lista.forEach(x => porId.set(x.id, x));
  return [...porId.values()];
};

// Documento do Firestore → objeto usado pelos ecrãs
const paraViagem = (d) => {
  const data = d.data();
  return {
    ...data,
    id: d.id,
    participants: semDuplicados(data.participants),
    expenses: semDuplicados(data.expenses),
    members: data.members ?? [],
    shareExpiresAt: data.shareExpiresAt?.toMillis?.() ?? data.shareExpiresAt ?? null,
  };
};

// Copia as viagens do formato antigo (users/{uid}/trips) para trips/{id} e apaga as antigas
async function migrarViagensAntigas(uid) {
  const snap = await getDocs(legacyCol(uid));
  for (const d of snap.docs) {
    const { shareCode: _c, shareExpiresAt: _e, ...antiga } = d.data();
    try {
      const batch = writeBatch(db);
      batch.set(tripRef(d.id), sanitize({
        ...antiga,
        participants: antiga.participants ?? [],
        expenses: antiga.expenses ?? [],
        ownerId: uid,
        members: [uid],
        createdAt: antiga.createdAt ?? Date.now(),
      }));
      batch.delete(d.ref);
      await batch.commit();
    } catch (e) {
      console.warn('[Migração] viagem', d.id, 'ficou no formato antigo:', e?.code ?? e?.message);
    }
  }
}

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

const useTripStore = create((set, get) => {
  // Atualização otimista local de uma viagem (o snapshot do Firestore confirma a seguir)
  const mudarLocal = (id, fn) => set({ trips: get().trips.map(t => (t.id === id ? fn(t) : t)) });
  const viagem = (id) => get().trips.find(t => t.id === id);

  // Substitui um elemento de uma lista (despesas/participantes) sem regravar a lista inteira
  const substituirElemento = (id, campo, antigo, novo) => {
    const batch = writeBatch(db);
    if (antigo) batch.update(tripRef(id), { [campo]: arrayRemove(antigo) });
    if (novo) batch.update(tripRef(id), { [campo]: arrayUnion(sanitize(novo)), updatedAt: Date.now() });
    persist(batch.commit(), `update ${campo}`);
  };

  return {
    trips: [],
    carregado: false,

    // Chamado sempre que a conta muda, para não mostrar viagens de outro utilizador
    reset: () => set({ trips: [], carregado: false }),

    // Ouve em tempo real todas as viagens de que o utilizador é membro.
    // Devolve a função para deixar de ouvir.
    subscreverViagens: () => {
      const uid = getUid();
      if (!uid) return () => {};
      let ativo = true;
      let pararOuvir = () => {};

      migrarViagensAntigas(uid)
        .catch(e => console.warn('[Migração]', e?.code ?? e?.message))
        .finally(() => {
          if (!ativo) return;
          pararOuvir = onSnapshot(
            query(tripsCol, where('members', 'array-contains', uid)),
            (snap) => {
              if (getUid() !== uid) return;
              const trips = snap.docs.map(paraViagem).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
              set({ trips, carregado: true });
            },
            (e) => { set({ carregado: true }); handleFirebaseError(e, 'subscreverViagens'); },
          );
        });

      return () => { ativo = false; pararOuvir(); };
    },

    // ── Viagem ────────────────────────────────────────────────────────────────
    addTrip: (trip) => {
      const uid = getUid();
      if (!uid) return;
      const nova = {
        ...trip,
        id: trip.id || uuidv4(),
        participants: trip.participants || [],
        expenses: trip.expenses || [],
        ownerId: uid,
        members: [uid],
        createdAt: Date.now(),
      };
      set({ trips: [nova, ...get().trips] });
      const { id, ...dados } = nova;
      persist(setDoc(tripRef(id), sanitize(dados)), 'addTrip');
    },

    // Campos simples da viagem (nome, destino, datas…)
    updateTripFields: (id, campos) => {
      mudarLocal(id, t => ({ ...t, ...campos }));
      persist(updateDoc(tripRef(id), { ...sanitize(campos), updatedAt: Date.now() }), 'updateTripFields');
    },

    // Só o criador elimina a viagem (para todos)
    deleteTrip: (id) => {
      const t = viagem(id);
      set({ trips: get().trips.filter(x => x.id !== id) });
      persist(deleteDoc(tripRef(id)), 'deleteTrip');
      if (t?.shareCode) persist(deleteDoc(sharedDoc(t.shareCode)), 'deleteShare');
    },

    // Os outros membros saem da viagem (deixam de a ver; os dados ficam para os restantes)
    sairDaViagem: (id) => {
      const uid = getUid();
      set({ trips: get().trips.filter(x => x.id !== id) });
      persist(updateDoc(tripRef(id), { members: arrayRemove(uid) }), 'sairDaViagem');
    },

    // ── Despesas ──────────────────────────────────────────────────────────────
    addExpense: (id, despesa) => {
      mudarLocal(id, t => ({ ...t, expenses: [...t.expenses, despesa] }));
      substituirElemento(id, 'expenses', null, despesa);
    },
    updateExpense: (id, despesa) => {
      const antiga = viagem(id)?.expenses.find(e => e.id === despesa.id);
      mudarLocal(id, t => ({ ...t, expenses: t.expenses.map(e => (e.id === despesa.id ? despesa : e)) }));
      substituirElemento(id, 'expenses', antiga, despesa);
    },
    removeExpense: (id, expenseId) => {
      const antiga = viagem(id)?.expenses.find(e => e.id === expenseId);
      mudarLocal(id, t => ({ ...t, expenses: t.expenses.filter(e => e.id !== expenseId) }));
      if (antiga) substituirElemento(id, 'expenses', antiga, null);
    },

    // ── Participantes ─────────────────────────────────────────────────────────
    addParticipant: (id, participante) => {
      mudarLocal(id, t => ({ ...t, participants: [...t.participants, participante] }));
      substituirElemento(id, 'participants', null, participante);
    },
    removeParticipant: (id, participantId) => {
      const antigo = viagem(id)?.participants.find(p => p.id === participantId);
      mudarLocal(id, t => ({ ...t, participants: t.participants.filter(p => p.id !== participantId) }));
      if (antigo) substituirElemento(id, 'participants', antigo, null);
    },

    // ── Partilha por código ───────────────────────────────────────────────────
    // Devolve { code, expiraEm }: cria o código na primeira partilha e renova a validade
    // (30 dias) a cada partilha. Qualquer membro pode partilhar. Precisa de internet.
    partilharViagem: async (id) => {
      const uid = getUid();
      const t = viagem(id);
      if (!uid || !t) throw new Error('viagem-inexistente');
      let code = t.shareCode;
      if (!code) {
        for (let i = 0; i < 5 && !code; i++) {
          const candidato = gerarCodigo();
          if (await codigoLivre(candidato)) code = candidato;
        }
        if (!code) throw new Error('sem-codigo');
      }
      const expiraEm = Date.now() + VALIDADE_PARTILHA_MS;
      const expira = Timestamp.fromMillis(expiraEm);
      // Primeiro a viagem (as regras de adesão verificam o código e a validade guardados nela)
      await updateDoc(tripRef(id), { shareCode: code, shareExpiresAt: expira });
      await setDoc(sharedDoc(code), { tripId: id, ownerId: uid, expiresAt: expira, updatedAt: Date.now() });
      mudarLocal(id, x => ({ ...x, shareCode: code, shareExpiresAt: expiraEm }));
      return { code, expiraEm };
    },

    // O código deixa de funcionar de imediato (quem já entrou continua na viagem)
    pararPartilha: (id) => {
      const t = viagem(id);
      if (!t?.shareCode) return;
      persist(deleteDoc(sharedDoc(t.shareCode)), 'stopShare');
      mudarLocal(id, x => ({ ...x, shareCode: undefined, shareExpiresAt: null }));
      persist(updateDoc(tripRef(id), { shareCode: deleteField(), shareExpiresAt: deleteField() }), 'stopShare');
    },

    // Usa um código: junta o utilizador à viagem.
    // Devolve { estado: 'juntou' | 'ja-membro' | 'copia' | 'invalido', tripId?, trip? }.
    // 'copia' = código antigo (antes das viagens partilhadas), que traz uma cópia dos dados.
    juntarComCodigo: async (codigo) => {
      const uid = getUid();
      const code = normalizarCodigo(codigo);
      let snap;
      try {
        snap = await getDoc(sharedDoc(code));
      } catch (e) {
        if (e?.code === 'permission-denied') return { estado: 'invalido' }; // expirado
        throw e;
      }
      if (!snap.exists()) return { estado: 'invalido' };
      const d = snap.data();
      if (d.expiresAt?.toMillis && d.expiresAt.toMillis() < Date.now()) return { estado: 'invalido' };
      if (!d.tripId) return d.trip ? { estado: 'copia', trip: d.trip } : { estado: 'invalido' };
      if (get().trips.some(t => t.id === d.tripId)) return { estado: 'ja-membro', tripId: d.tripId };
      await updateDoc(tripRef(d.tripId), { members: arrayUnion(uid), joinCode: code });
      return { estado: 'juntou', tripId: d.tripId };
    },
  };
});

export { useTripStore };
