// Converte o texto de um valor em euros para número.
// Aceita "12", "12,5", "12.50", "1.000", "1.000,50", "1,000.50".
// Devolve NaN para formatos ambíguos ou inválidos (ex: "1.2.3", "12,345.6.7").
export const parseValor = (text) => {
  const s = String(text ?? '').replace(/\s/g, '');

  // Sem separador de milhares: um único separador decimal com até 2 casas
  let m = s.match(/^(\d+)(?:[.,](\d{1,2}))?$/);
  if (m) return Number(`${m[1]}.${m[2] ?? 0}`);

  // Com separador de milhares (ponto ou vírgula) e decimal opcional com o outro separador
  m = s.match(/^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/)
    || s.match(/^(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/);
  if (m) return Number(`${m[1].replace(/[.,]/g, '')}.${m[2] ?? 0}`);

  return NaN;
};

// "€12,50" (sempre positivo)
export const eur = (n) => '€' + (Math.round(Math.abs(n || 0) * 100) / 100).toFixed(2).replace('.', ',');

// "+€12,50" / "−€12,50" (sinal U+2212) / "€0,00"
export const eurComSinal = (n) => {
  const c = Math.round((n || 0) * 100);
  return (c > 0 ? '+' : c < 0 ? '−' : '') + eur(n);
};
