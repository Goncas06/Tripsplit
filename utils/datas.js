export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const pad = (n) => String(n).padStart(2, '0');

// Date → "dd/mm/yyyy" (formato guardado no Firestore)
export const formatDate = (d) => (d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '');

const parseDia = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s?.trim() ?? '');
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

// "12/07/2026 - 19/07/2026" → { inicio, fim }
export const parseDatas = (str) => {
  const [a, b] = (str ?? '').split(' - ');
  return { inicio: parseDia(a), fim: parseDia(b) };
};

export const noites = (inicio, fim) =>
  inicio && fim ? Math.round((fim - inicio) / 86400000) : 0;

// Intervalo compacto: "12 – 19 jul 2026", "28 jul – 3 ago 2026", "12 jul 2026"
export const formatIntervalo = (inicio, fim, { ano = true } = {}) => {
  if (!inicio) return '';
  const y = ano ? ` ${(fim ?? inicio).getFullYear()}` : '';
  if (!fim) return `${inicio.getDate()} ${MESES_CURTOS[inicio.getMonth()]}${ano ? ` ${inicio.getFullYear()}` : ''}`;
  if (inicio.getFullYear() !== fim.getFullYear()) {
    return `${inicio.getDate()} ${MESES_CURTOS[inicio.getMonth()]} ${inicio.getFullYear()} – ${fim.getDate()} ${MESES_CURTOS[fim.getMonth()]} ${fim.getFullYear()}`;
  }
  if (inicio.getMonth() === fim.getMonth()) {
    return `${inicio.getDate()} – ${fim.getDate()} ${MESES_CURTOS[fim.getMonth()]}${y}`;
  }
  return `${inicio.getDate()} ${MESES_CURTOS[inicio.getMonth()]} – ${fim.getDate()} ${MESES_CURTOS[fim.getMonth()]}${y}`;
};

// Texto das datas de uma viagem para mostrar; se não for no formato esperado, devolve-o tal como está
export const datasDaViagem = (str, opts) => {
  const { inicio, fim } = parseDatas(str);
  return inicio ? formatIntervalo(inicio, fim, opts) : (str ?? '');
};
