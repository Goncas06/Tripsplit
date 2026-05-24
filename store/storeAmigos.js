import { create } from 'zustand';
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getUid = () => auth.currentUser?.uid;
const friendsCol = (uid) => collection(db, 'users', uid, 'friends');
const friendDoc = (uid, friendId) => doc(db, 'users', uid, 'friends', friendId);
const receivedCol = (uid) => collection(db, 'users', uid, 'receivedTrips');
const receivedDoc = (uid, recordId) => doc(db, 'users', uid, 'receivedTrips', recordId);

const useAmigosStore = create((set, get) => ({
  friends: [],       // [{ id, name, code, addedAt }]
  receivedTrips: [], // [{ id, friendId, friendName, trip, receivedAt }]

  loadAll: async () => {
    const uid = getUid();
    if (!uid) return;
    const [friendsSnap, receivedSnap] = await Promise.all([
      getDocs(friendsCol(uid)),
      getDocs(receivedCol(uid)),
    ]);
    const friends = friendsSnap.docs.map(d => ({ ...d.data(), id: d.id }))
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    const receivedTrips = receivedSnap.docs.map(d => ({ ...d.data(), id: d.id }))
      .sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
    set({ friends, receivedTrips });
  },

  addFriend: async (profile) => {
    const uid = getUid();
    if (!uid) return { error: 'Sessão inválida.' };
    const exists = get().friends.find(f => f.id === profile.id);
    if (exists) return { error: 'Este amigo já está na tua lista.' };
    const friend = { id: profile.id, name: profile.name, code: profile.code, addedAt: Date.now() };
    await setDoc(friendDoc(uid, profile.id), friend);
    set({ friends: [friend, ...get().friends] });
    return { success: true };
  },

  removeFriend: async (friendId) => {
    const uid = getUid();
    if (!uid) return;
    await deleteDoc(friendDoc(uid, friendId));
    set({ friends: get().friends.filter(f => f.id !== friendId) });
  },

  addReceivedTrip: async (friendId, friendName, trip) => {
    const uid = getUid();
    if (!uid) return { error: 'Sessão inválida.' };
    const already = get().receivedTrips.find(r => r.trip?.id === trip.id);
    if (already) return { error: 'Esta viagem já foi importada.' };
    const recordId = uuidv4();
    const record = { id: recordId, friendId, friendName, trip, receivedAt: Date.now() };
    await setDoc(receivedDoc(uid, recordId), record);
    set({ receivedTrips: [record, ...get().receivedTrips] });
    return { success: true };
  },

  removeReceivedTrip: async (recordId) => {
    const uid = getUid();
    if (!uid) return;
    await deleteDoc(receivedDoc(uid, recordId));
    set({ receivedTrips: get().receivedTrips.filter(r => r.id !== recordId) });
  },
}));

export { useAmigosStore };
