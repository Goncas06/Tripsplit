// Tokens do redesign (Claude Design · "TripSplit Redesign").
// Os nomes antigos (background, primary, textSecondary…) ficam como aliases no fim
// para não partir ecrãs que ainda os usam.

const base = {
  // Avatar do utilizador e cores das categorias são iguais nos dois modos
  userColor: '#5271FF',
};

const light = {
  ...base,
  isDark: false,
  bg: '#F0F4FF',
  bgClear: 'rgba(240,244,255,0)',
  card: '#FFFFFF',
  field: '#F4F6FC',
  fieldBorder: '#E1E6F2',
  sep: '#EDF0F7',
  text: '#0F172A',
  text2: '#526079',
  text3: '#8B94AB',
  accent: '#5271FF',
  accentText: '#3F5EF5',
  accentSoft: '#E6EBFF',
  pos: '#00B868',
  posText: '#008F55',
  posSoft: '#DCF5E9',
  neg: '#EF4444',
  negText: '#D12F2F',
  negSoft: '#FDE7E7',
  checkBorder: '#C9D0E0',
  switchOff: '#E3E7F0',
  overlay: 'rgba(15,23,42,0.40)',
  sheet: '#FFFFFF',
  grabber: '#D2D8E5',
  hero: ['#5271FF', '#3B55E6'],
  heroText: '#DCE3FF',
  // Sombras em formato React Native (no escuro não há sombras)
  cardShadow: {
    shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  btnShadow: {
    shadowColor: '#5271FF', shadowOpacity: 0.28, shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
};

const dark = {
  ...base,
  isDark: true,
  bg: '#000000',
  bgClear: 'rgba(0,0,0,0)',
  card: '#0D0D18',
  field: '#14142A',
  fieldBorder: '#22223A',
  sep: '#1A1A2E',
  text: '#FFFFFF',
  text2: '#A3A9C2',
  text3: '#6E7493',
  accent: '#5B8AFF',
  accentText: '#7DA2FF',
  accentSoft: '#141F45',
  pos: '#00D97E',
  posText: '#00D97E',
  posSoft: '#062A1B',
  neg: '#FF4060',
  negText: '#FF5C75',
  negSoft: '#2E0B15',
  checkBorder: '#3A3D58',
  switchOff: '#2A2A40',
  overlay: 'rgba(0,0,0,0.70)',
  sheet: '#111120',
  grabber: '#3A3C52',
  hero: ['#5B8AFF', '#3A5CE0'],
  heroText: '#DCE3FF',
  cardShadow: {},
  btnShadow: {},
};

// Aliases dos nomes antigos
const aliases = (t) => ({
  ...t,
  background: t.bg,
  background2: t.bg,
  surface: t.card,
  cardBorder: t.fieldBorder,
  textSecondary: t.text2,
  textMuted: t.text3,
  textHint: t.text3,
  border: t.fieldBorder,
  borderLight: t.sep,
  separator: t.sep,
  inputBg: t.field,
  inputBorder: t.fieldBorder,
  primary: t.accent,
  primaryLight: t.accentText,
  primaryGlow: t.accentSoft,
  success: t.pos,
  successBg: t.posSoft,
  danger: t.neg,
  dangerBg: t.negSoft,
  warning: '#F59E0B',
  headerBg: t.bg,
  headerText: t.text,
  switchTrack: t.switchOff,
  avatarBg: t.accentSoft,
  pill: t.accentSoft,
});

export const lightColors = aliases(light);
export const darkColors = aliases(dark);

// Escala tipográfica (SF Pro / fonte do sistema)
export const type = {
  display:    { fontSize: 44, lineHeight: 48, fontWeight: '700', letterSpacing: -1.1 },
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.7 },
  title2:     { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3:     { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  headline:   { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body:       { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  subhead:    { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  footnote:   { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption:    { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

// Valores monetários alinhados
export const num = { fontVariant: ['tabular-nums'] };
