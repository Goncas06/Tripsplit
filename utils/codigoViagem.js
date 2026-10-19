// Códigos curtos de partilha (ex: "AALX40").
// Sem caracteres que se confundem ao ler ou ditar: 0/O, 1/I/L.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const TAMANHO_CODIGO = 6;

const aleatorio = (n) => {
  const g = globalThis.crypto?.getRandomValues;
  if (g) return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(1)))[0] % n;
  return Math.floor(Math.random() * n);
};

export const gerarCodigo = () =>
  Array.from({ length: TAMANHO_CODIGO }, () => ALFABETO[aleatorio(ALFABETO.length)]).join('');

// "aalx 40" / "AALX-40" → "AALX40"
export const normalizarCodigo = (s) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const eCodigoCurto = (s) => normalizarCodigo(s).length === TAMANHO_CODIGO && (s ?? '').trim().length <= 10;
