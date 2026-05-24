const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const encodeTrip = (trip) => {
  try {
    return btoa(encodeURIComponent(JSON.stringify(trip)));
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

// Rebuilds the trip with fresh IDs so it doesn't conflict with existing local data.
export const buildImportedTrip = (raw) => {
  const idMap = {};
  const participants = (raw.participants || []).map(p => {
    const newId = uuidv4();
    idMap[p.id] = newId;
    return { id: newId, name: p.name };
  });

  const expenses = (raw.expenses || []).map(exp => ({
    id: uuidv4(),
    value: exp.value,
    category: exp.category,
    paidBy: idMap[exp.paidBy] ?? exp.paidBy,
    sharedWith: (exp.sharedWith || []).map(pid => idMap[pid] ?? pid),
    note: exp.note,
  }));

  return {
    id: uuidv4(),
    name: raw.name,
    destination: raw.destination,
    dates: raw.dates,
    participants,
    expenses,
  };
};
