// Categorias de despesa: nome, ícone Ionicons (normal e preenchido) e cor própria
export const CATEGORIAS = {
  hotel:     { label: 'Hotel',     icon: 'bed-outline',        iconFilled: 'bed',        color: '#7C5CFF' },
  gasolina:  { label: 'Gasolina',  icon: 'car-outline',        iconFilled: 'car',        color: '#FF9500' },
  portagens: { label: 'Portagens', icon: 'trail-sign-outline', iconFilled: 'trail-sign', color: '#0EA5E9' },
  refeicoes: { label: 'Refeições', icon: 'restaurant-outline', iconFilled: 'restaurant', color: '#FF6B3D' },
  outros:    { label: 'Outros',    icon: 'cube-outline',       iconFilled: 'cube',       color: '#8B94AB' },
};

export const ORDEM_CATEGORIAS = ['hotel', 'gasolina', 'portagens', 'refeicoes', 'outros'];

export const categoria = (key) => CATEGORIAS[key] ?? CATEGORIAS.outros;

// Converte "#RRGGBB" em rgba com transparência (fundo suave dos ícones)
export const suave = (hex, a = 0.16) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

// Cores dos avatares dos participantes, atribuídas pela ordem na viagem
const CORES_PESSOAS = ['#F43F6B', '#10B3A3', '#A855F7', '#F59E0B', '#0EA5E9', '#FF6B3D', '#22C55E', '#EC4899'];

export const corParticipante = (trip, id) => {
  const i = trip?.participants?.findIndex(p => p.id === id) ?? -1;
  return CORES_PESSOAS[(i < 0 ? 0 : i) % CORES_PESSOAS.length];
};
