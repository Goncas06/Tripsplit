import { parseValor, eur, eurComSinal, arredondarCentimos } from '../utils/valor';

describe('arredondarCentimos', () => {
  test.each([
    [146.325, 146.33], [1.005, 1.01], [0.125, 0.13], [-2.675, -2.68], [10, 10], [0, 0], [1e-9, 0],
  ])('%d → %d', (x, esperado) => expect(arredondarCentimos(x)).toBe(esperado));
});
import { gerarCodigo, normalizarCodigo, eCodigoCurto } from '../utils/codigoViagem';
import { buildImportedTrip, encodeTrip, decodeTrip, slimTrip } from '../utils/share';
import { parseDatas, formatDate, formatIntervalo, noites, datasDaViagem } from '../utils/datas';

describe('parseValor', () => {
  test.each([
    ['12', 12], ['12,5', 12.5], ['12.50', 12.5], ['0,99', 0.99],
    ['1.000', 1000], ['1.000,50', 1000.5], ['1,000.50', 1000.5], ['1 000,50', 1000.5],
  ])('"%s" → %d', (txt, esperado) => expect(parseValor(txt)).toBe(esperado));

  test.each(['', 'abc', '1.2.3', '12,345.6.7', '1,2,3'])('"%s" é inválido', (txt) => {
    expect(parseValor(txt)).toBeNaN();
  });
});

describe('formatação em euros', () => {
  test('eur', () => {
    expect(eur(12.5)).toBe('€12,50');
    expect(eur(-3)).toBe('€3,00');
    expect(eur(0.005)).toBe('€0,01');
  });
  test('eurComSinal usa o sinal menos tipográfico', () => {
    expect(eurComSinal(5)).toBe('+€5,00');
    expect(eurComSinal(-5)).toBe('−€5,00');
    expect(eurComSinal(0)).toBe('€0,00');
  });
});

describe('códigos curtos', () => {
  test('têm 6 caracteres sem símbolos ambíguos', () => {
    const muitos = Array.from({ length: 2000 }, gerarCodigo);
    for (const c of muitos) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });
  test('normaliza minúsculas, espaços e hífens', () => {
    expect(normalizarCodigo(' ab-cd 23 ')).toBe('ABCD23');
    expect(eCodigoCurto('abcd-23')).toBe(true);
    expect(eCodigoCurto('ABCD2')).toBe(false);
    expect(eCodigoCurto('JTdCJTIybmFtZSUyMiUzQSUyMkFsZ2FydmUlMjI')).toBe(false);
  });
});

describe('importar viagens (dados vindos de fora)', () => {
  const raw = {
    name: '  Algarve  ',
    destination: 'Lagos',
    participants: [{ id: 'p1', name: 'Rita' }, { id: 'p2', name: 'João' }, { id: 'p3' }, null],
    expenses: [
      { id: 'e1', value: 10, category: 'hotel', paidBy: 'p1', sharedWith: ['p1', 'p2', 'x'] },
      { id: 'e2', value: '20.456', category: 'inexistente', paidBy: 'p2', note: 'jantar' },
      { id: 'e3', value: -5, paidBy: 'p1' },        // valor inválido
      { id: 'e4', value: 5, paidBy: 'desconhecido' }, // pagador inválido
    ],
  };
  const t = buildImportedTrip(raw);

  test('valida e limpa os campos', () => {
    expect(t.name).toBe('Algarve');
    expect(t.participants.map(p => p.name)).toEqual(['Rita', 'João']);
    expect(t.expenses).toHaveLength(2);
    expect(t.expenses[1]).toMatchObject({ value: 20.46, category: 'outros', note: 'jantar' });
  });

  test('gera ids novos e mantém as ligações entre pessoas e despesas', () => {
    const [rita, joao] = t.participants;
    expect(rita.id).not.toBe('p1');
    expect(t.expenses[0].paidBy).toBe(rita.id);
    expect(t.expenses[0].sharedWith).toEqual([rita.id, joao.id]); // 'x' descartado
  });

  test('sem nome não é uma viagem válida', () => {
    expect(buildImportedTrip({ name: '   ' })).toBeNull();
    expect(buildImportedTrip(null)).toBeNull();
  });

  test('o código longo antigo faz ida e volta e não leva recibos nem o código de partilha', () => {
    const trip = { name: 'X', shareCode: 'ABCD23', shareExpiresAt: 1, participants: [], expenses: [{ id: 'e', value: 1, receiptUrl: 'http://a' }] };
    const volta = decodeTrip(encodeTrip(trip));
    expect(volta).toEqual(slimTrip(trip));
    expect(volta.shareCode).toBeUndefined();
    expect(volta.expenses[0].receiptUrl).toBeUndefined();
  });

  test('código longo inválido devolve null', () => {
    expect(decodeTrip('isto-nao-e-base64!!')).toBeNull();
  });
});

describe('datas', () => {
  const ini = new Date(2026, 6, 12);
  const fim = new Date(2026, 6, 19);

  test('formato guardado e leitura', () => {
    expect(formatDate(ini)).toBe('12/07/2026');
    const { inicio, fim: f } = parseDatas('12/07/2026 - 19/07/2026');
    expect(inicio).toEqual(ini);
    expect(f).toEqual(fim);
  });
  test('noites', () => expect(noites(ini, fim)).toBe(7));
  test('intervalos compactos', () => {
    expect(formatIntervalo(ini, fim)).toBe('12 – 19 jul 2026');
    expect(formatIntervalo(new Date(2026, 6, 28), new Date(2026, 7, 3))).toBe('28 jul – 3 ago 2026');
    expect(formatIntervalo(ini, null)).toBe('12 jul 2026');
    expect(formatIntervalo(ini, fim, { ano: false })).toBe('12 – 19 jul');
  });
  test('texto livre antigo é mostrado tal como está', () => {
    expect(datasDaViagem('Verão 2025')).toBe('Verão 2025');
  });
});
