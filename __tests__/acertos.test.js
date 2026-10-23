import { getPersonalBalance, getAllBalances, getSettlements } from '../utils/acertos';

// Viagem do exemplo do design: Algarve 2026
const trip = {
  participants: [
    { id: 'rita', name: 'Rita' },
    { id: 'joao', name: 'João' },
    { id: 'ines', name: 'Inês' },
    { id: 'miguel', name: 'Miguel' },
  ],
  expenses: [
    { id: 'e1', value: 480, paidBy: 'rita', sharedWith: [] },                        // todos
    { id: 'e2', value: 86.4, paidBy: 'joao', sharedWith: [] },                       // todos
    { id: 'e3', value: 62.3, paidBy: 'ines', sharedWith: ['rita', 'joao', 'ines'] }, // sem o Miguel
    { id: 'e4', value: 18.9, paidBy: 'joao', sharedWith: [] },                       // todos
  ],
  payments: [],
};
const ids = trip.participants.map(p => p.id);
const soma = (xs) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;

describe('getPersonalBalance', () => {
  test('calcula pago, parte e saldo', () => {
    // parte da Rita: (480 + 86,4 + 18,9) / 4 + 62,3 / 3 = 146,325 + 20,7667
    expect(getPersonalBalance(trip.expenses, ids, 'rita')).toEqual({ paid: 480, owes: 167.09, net: 312.91 });
  });

  test('quem não participa numa despesa não paga parte dela', () => {
    expect(getPersonalBalance(trip.expenses, ids, 'miguel').owes).toBe(146.33);
  });

  test('sharedWith vazio divide por todos', () => {
    const r = getPersonalBalance([{ value: 30, paidBy: 'a', sharedWith: [] }], ['a', 'b', 'c'], 'b');
    expect(r).toEqual({ paid: 0, owes: 10, net: -10 });
  });

  test('pagamentos de acertos mexem no saldo mas não no "pagou"', () => {
    const pag = [{ from: 'b', to: 'a', amount: 10 }];
    const despesas = [{ value: 30, paidBy: 'a', sharedWith: [] }];
    expect(getPersonalBalance(despesas, ['a', 'b', 'c'], 'b', pag)).toEqual({ paid: 0, owes: 10, net: 0 });
    expect(getPersonalBalance(despesas, ['a', 'b', 'c'], 'a', pag).net).toBe(10);
  });
});

describe('getAllBalances', () => {
  test('os saldos somam zero', () => {
    expect(Math.abs(soma(getAllBalances(trip).map(b => b.net)))).toBeLessThanOrEqual(0.02);
  });

  test('viagem sem participantes devolve lista vazia', () => {
    expect(getAllBalances({ participants: [], expenses: [] })).toEqual([]);
  });
});

describe('getSettlements', () => {
  const settlements = getSettlements(trip);

  test('cada transferência vai de quem deve para quem tem a receber', () => {
    const saldos = Object.fromEntries(getAllBalances(trip).map(b => [b.id, b.net]));
    for (const s of settlements) {
      expect(saldos[s.debtor]).toBeLessThan(0);
      expect(saldos[s.creditor]).toBeGreaterThan(0);
      expect(s.amount).toBeGreaterThan(0);
    }
  });

  test('depois das transferências todos ficam a zero (ao cêntimo)', () => {
    const final = getAllBalances({
      ...trip,
      payments: settlements.map(s => ({ from: s.debtor, to: s.creditor, amount: s.amount })),
    });
    for (const b of final) expect(Math.abs(b.net)).toBeLessThanOrEqual(0.02);
    expect(getSettlements({ ...trip, payments: settlements.map(s => ({ from: s.debtor, to: s.creditor, amount: s.amount })) })).toEqual([]);
  });

  test('usa no máximo n-1 transferências', () => {
    expect(settlements.length).toBeLessThanOrEqual(trip.participants.length - 1);
  });

  test('pagamento parcial reduz o acerto pendente', () => {
    const [primeiro] = settlements;
    const parcial = getSettlements({ ...trip, payments: [{ from: primeiro.debtor, to: primeiro.creditor, amount: 10 }] });
    const total = (xs) => soma(xs.map(s => s.amount));
    expect(total(parcial)).toBeCloseTo(total(settlements) - 10, 1);
  });

  test('sem despesas não há acertos', () => {
    expect(getSettlements({ ...trip, expenses: [] })).toEqual([]);
  });

  test('despesa paga por quem a divide só consigo não gera acertos', () => {
    expect(getSettlements({ participants: [{ id: 'a' }, { id: 'b' }], expenses: [{ value: 50, paidBy: 'a', sharedWith: ['a'] }] })).toEqual([]);
  });
});
