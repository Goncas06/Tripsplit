export const calculateTotalPerPerson = (expenses, numParticipants) => {
  if (!numParticipants) return 0;
  const total = expenses.reduce((sum, exp) => sum + (exp.value || 0), 0);
  return total / numParticipants;
};

export const getPersonalBalance = (expenses, allParticipantIds, participantId) => {
  let paid = 0;
  let owes = 0;
  for (const exp of expenses) {
    const value = exp.value || 0;
    const sharedWith = exp.sharedWith?.length > 0 ? exp.sharedWith : allParticipantIds;
    if (exp.paidBy === participantId) paid += value;
    if (sharedWith.includes(participantId)) owes += value / sharedWith.length;
  }
  return {
    paid: Math.round(paid * 100) / 100,
    owes: Math.round(owes * 100) / 100,
    net: Math.round((paid - owes) * 100) / 100,
  };
};

export const getAllBalances = (trip) => {
  if (!trip?.participants?.length) return [];
  const allIds = trip.participants.map(p => p.id);
  return trip.participants.map(p => ({
    id: p.id,
    name: p.name,
    ...getPersonalBalance(trip.expenses, allIds, p.id),
  }));
};

// Calculates how much a participant paid minus what they owe (respects sharedWith).
// Positive = others owe them. Negative = they owe others.
const getBalance = (expenses, allParticipantIds, participantId) => {
  let paid = 0;
  let owes = 0;

  for (const exp of expenses) {
    const value = exp.value || 0;
    const sharedWith = exp.sharedWith?.length > 0 ? exp.sharedWith : allParticipantIds;

    if (exp.paidBy === participantId) paid += value;
    if (sharedWith.includes(participantId)) owes += value / sharedWith.length;
  }

  return Math.round((paid - owes) * 100) / 100;
};

export const getSettlements = (trip) => {
  if (!trip.participants.length || !trip.expenses.length) return [];

  const allIds = trip.participants.map(p => p.id);
  const balances = {};
  for (const p of trip.participants) {
    balances[p.id] = getBalance(trip.expenses, allIds, p.id);
  }

  const debtors = [];
  const creditors = [];
  for (const [id, bal] of Object.entries(balances)) {
    if (bal < -0.01) debtors.push({ id, amount: Math.abs(bal) });
    else if (bal > 0.01) creditors.push({ id, amount: bal });
  }

  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({ debtor: debtors[i].id, creditor: creditors[j].id, amount: Math.round(transfer * 100) / 100 });
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
};
