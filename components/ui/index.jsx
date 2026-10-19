// Componentes pequenos do sistema visual do redesign
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../store/storeTheme';
import { categoria, suave } from '../../utils/categorias';
import { eurComSinal, eur } from '../../utils/valor';
import { num } from '../../utils/theme';

// ── Avatar: círculo com a inicial ─────────────────────────────────────────────
export function Avatar({ nome, cor, tamanho = 44, style }) {
  return (
    <View style={[{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: cor,
      alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: Math.round(tamanho * 0.4) }}>
        {(nome ?? '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ── Badge de saldo: +€ verde · −€ vermelho · ✓ neutro ─────────────────────────
export function BadgeValor({ valor, texto, tamanho = 14 }) {
  const c = useTheme();
  const cents = Math.round((valor || 0) * 100);
  const [bg, fg] = cents > 0 ? [c.posSoft, c.posText] : cents < 0 ? [c.negSoft, c.negText] : [c.field, c.text2];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      {cents === 0 && !texto ? <Ionicons name="checkmark" size={16} color={fg} /> : null}
      <Text style={[{ color: fg, fontSize: tamanho, fontWeight: '700' }, num]}>
        {texto ?? (cents === 0 ? eur(0) : eurComSinal(valor))}
      </Text>
    </View>
  );
}

// ── Ícone de categoria: quadrado arredondado com a cor da categoria a 16% ─────
export function IconeCategoria({ cat, tamanho = 44, raio = 14, preenchido = false }) {
  const k = categoria(cat);
  return (
    <View style={{ width: tamanho, height: tamanho, borderRadius: raio, backgroundColor: suave(k.color),
      alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={preenchido ? k.iconFilled : k.icon} size={Math.round(tamanho / 2)} color={k.color} />
    </View>
  );
}

// ── Título de secção ─────────────────────────────────────────────────────────
export function TituloSecao({ children, direita, style }) {
  const c = useTheme();
  return (
    <View style={[s.secaoRow, style]}>
      <Text style={[s.secaoTitulo, { color: c.text }]} accessibilityRole="header">{children}</Text>
      {direita}
    </View>
  );
}

// ── Separador com inset ──────────────────────────────────────────────────────
export function Separador({ inset = 0 }) {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.sep, marginLeft: inset }} />;
}

// ── Linha de ação: ícone em tile + texto + chevron ───────────────────────────
export function LinhaAcao({ icon, titulo, onPress, ultima }) {
  const c = useTheme();
  return (
    <>
      <Pressable onPress={onPress} accessibilityRole="button"
        style={({ pressed }) => [s.acao, pressed && { backgroundColor: c.field }]}>
        <View style={[s.acaoIcone, { backgroundColor: c.accentSoft }]}>
          <Ionicons name={icon} size={18} color={c.accent} />
        </View>
        <Text style={[s.acaoTexto, { color: c.text }]}>{titulo}</Text>
        <Ionicons name="chevron-forward" size={18} color={c.text3} />
      </Pressable>
      {!ultima && <Separador inset={60} />}
    </>
  );
}

// ── Campo de texto com label, ícone e estado de foco ─────────────────────────
export function Campo({ label, icon, erro, direita, inputRef, secure, style, inputStyle, ...props }) {
  const c = useTheme();
  const [focado, setFocado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const borda = erro ? c.neg : focado ? c.accent : c.fieldBorder;
  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? <Text style={[s.label, { color: c.text2 }]}>{label}</Text> : null}
      <View style={[s.campo, {
        backgroundColor: focado ? c.card : c.field,
        borderColor: borda,
        borderWidth: focado || erro ? 2 : 1,
        paddingLeft: focado || erro ? 15 : 16,
      }]}>
        {icon ? <Ionicons name={icon} size={20} color={focado ? c.accent : c.text3} /> : null}
        <TextInput
          ref={inputRef}
          placeholderTextColor={c.text3}
          selectionColor={c.accent}
          secureTextEntry={secure && !visivel}
          accessibilityLabel={label}
          accessibilityHint={erro || undefined}
          {...props}
          onFocus={(e) => { setFocado(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocado(false); props.onBlur?.(e); }}
          style={[s.input, { color: c.text }, inputStyle]}
        />
        {secure ? (
          <Pressable onPress={() => setVisivel(v => !v)} hitSlop={6} style={s.campoBotao}
            accessibilityRole="button" accessibilityLabel={visivel ? 'Esconder password' : 'Mostrar password'}>
            <Ionicons name={visivel ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.text3} />
          </Pressable>
        ) : null}
        {direita}
      </View>
      {erro ? <Text style={[s.erro, { color: c.negText }]} accessibilityLiveRegion="polite">{erro}</Text> : null}
    </View>
  );
}

// ── Folha inferior (bottom sheet) ────────────────────────────────────────────
export function FolhaInferior({ visible, onClose, children, style }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.overlay, { backgroundColor: c.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
          <View style={[s.folha, { backgroundColor: c.sheet, paddingBottom: Math.max(insets.bottom, 12) + 12 }, style]}>
            <View style={[s.grabber, { backgroundColor: c.grabber }]} />
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Caixa de erro ────────────────────────────────────────────────────────────
export function CaixaErro({ children }) {
  const c = useTheme();
  if (!children) return null;
  return (
    <View style={[s.caixaErro, { backgroundColor: c.negSoft }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={c.negText} />
      <Text style={[s.caixaErroTexto, { color: c.negText }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { height: 28, paddingHorizontal: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  secaoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secaoTitulo: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  acao: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  acaoIcone: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  acaoTexto: { flex: 1, fontSize: 17 },
  label: { fontSize: 13, fontWeight: '600' },
  campo: { minHeight: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 6 },
  input: { flex: 1, fontSize: 17, paddingVertical: 14, paddingRight: 10 },
  campoBotao: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  erro: { fontSize: 13, marginLeft: 2 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  folha: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8, paddingHorizontal: 20, gap: 16 },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center' },
  caixaErro: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  caixaErroTexto: { flex: 1, fontSize: 14, fontWeight: '600' },
});
