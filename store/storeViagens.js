import { create } from 'zustand';
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getUid = () => auth.currentUser?.uid;
const tripsCol = (uid) => collection(db, 'users', uid, 'trips');
const tripDoc = (uid, tripId) => doc(db, 'users', uid, 'trips', tripId);

const useTripStore = create((set, get) => ({
  trips: [],

  loadTrips: async () => {
    const uid = getUid();
    if (!uid) return;
    const snap = await getDocs(tripsCol(uid));
    const trips = snap.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    set({ trips });
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
    await setDoc(tripDoc(uid, newTrip.id), newTrip);
    set({ trips: [newTrip, ...get().trips] });
  },

  updateTrip: async (id, updates) => {
    const uid = getUid();
    if (!uid) return;
    const trips = get().trips.map(t => t.id === id ? { ...t, ...updates } : t);
    set({ trips });
    await updateDoc(tripDoc(uid, id), updates);
  },

  deleteTrip: async (id) => {
    const uid = getUid();
    if (!uid) return;
    await deleteDoc(tripDoc(uid, id));
    set({ trips: get().trips.filter(t => t.id !== id) });
  },
}));

export { useTripStore };
