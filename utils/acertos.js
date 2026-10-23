// Cálculo de saldos e acertos.
// • despesa: { value, paidBy, sharedWith } — sharedWith vazio = todos os participantes
// • pagamento (acerto já feito): { from, to, amount } — `from` pagou `amount` a `to`
// Saldo (net) positivo = os outros devem-lhe; negativo = deve aos outros.

import { arredondarCentimos as cent } from './valor';

export const getPersonalBalance = (expenses, allParticipantIds, participantId, payments = []) => {
  let paid = 0;
  let owes = 0;
  for (const exp of expenses) {
    const value = exp.value || 0;
    const sharedWith = exp.sharedWith?.length > 0 ? exp.sharedWith : allParticipantIds;
    if (exp.paidBy === participantId) paid += value;
    if (sharedWith.includes(participantId)) owes += value / sharedWith.length;
  }
  // Pagamentos de acertos: quem pagou fica com menos dívida, quem recebeu com menos crédito
  let acertado = 0;
  for (const p of payments) {
    if (p.from === participantId) acertado += p.amount || 0;
    if (p.to === participantId) acertado -= p.amount || 0;
  }
  return {
    paid: cent(paid),
    owes: cent(owes),
    net: cent(paid - owes + acertado),
  };
};

export const getAllBalances = (trip) => {
  if (!trip?.participants?.length) return [];
  const allIds = trip.participants.map(p => p.id);
  return trip.participants.map(p => ({
    id: p.id,
    name: p.name,
    ...getPersonalBalance(trip.expenses, allIds, p.id, trip.payments),
  }));
};

// Transferências que faltam fazer para todos ficarem a zero.
// Emparelha os maiores devedores com os maiores credores (menos transferências na prática).
export const getSettlements = (trip) => {
  if (!trip.participants.length || !trip.expenses.length) return [];

  const allIds = trip.participants.map(p => p.id);
  const debtors = [];
  const creditors = [];
  for (const p of trip.participants) {
    const { net } = getPersonalBalance(trip.expenses, allIds, p.id, trip.payments);
    if (net < -0.01) debtors.push({ id: p.id, amount: -net });
    else if (net > 0.01) creditors.push({ id: p.id, amount: net });
  }
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({ debtor: debtors[i].id, creditor: creditors[j].id, amount: cent(transfer) });
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return settlements;
};
