const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Dados que vão para quem importa: sem fotos de recibos nem o código de partilha
export const slimTrip = (trip) => {
  const { shareCode: _c, shareExpiresAt: _e, ...resto } = trip;
  return { ...resto, expenses: (trip.expenses || []).map(({ receiptUrl: _r, ...e }) => e) };
};

export const encodeTrip = (trip) => {
  try {
    return btoa(encodeURIComponent(JSON.stringify(slimTrip(trip))));
  } catch {
    return null;
  }
};

export const decodeTrip = (code) => {
  try {
    return JSON.parse(decodeURIComponent(atob(code.trim())));
  } catch {
    return null;
  }
};

const CATEGORIAS = ['gasolina', 'portagens', 'hotel', 'refeicoes', 'outros'];
const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Rebuilds the trip with fresh IDs so it doesn't conflict with existing local data.
// The code comes from outside the app, so every field is validated; returns null if unusable.
export const buildImportedTrip = (raw) => {
  const name = texto(raw?.name, 100);
  if (!name) return null;

  const idMap = {};
  const participants = (Array.isArray(raw.participants) ? raw.participants : [])
    .filter(p => p && p.id != null && texto(p.name, 50))
    .map(p => {
      const newId = uuidv4();
      idMap[p.id] = newId;
      return { id: newId, name: texto(p.name, 50) };
    });

  const expenses = (Array.isArray(raw.expenses) ? raw.expenses : [])
    .filter(exp => exp && Number(exp.value) > 0 && Number.isFinite(Number(exp.value)) && idMap[exp.paidBy])
    .map(exp => {
      const note = texto(exp.note, 100);
      return {
        id: uuidv4(),
        value: Math.round(Number(exp.value) * 100) / 100,
        category: CATEGORIAS.includes(exp.category) ? exp.category : 'outros',
        paidBy: idMap[exp.paidBy],
        sharedWith: (Array.isArray(exp.sharedWith) ? exp.sharedWith : []).map(pid => idMap[pid]).filter(Boolean),
        ...(note ? { note } : {}),
      };
    });

  return {
    id: uuidv4(),
    name,
    destination: texto(raw.destination, 100),
    dates: texto(raw.dates, 50),
    participants,
    expenses,
  };
};
