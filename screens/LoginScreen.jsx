import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/storeAuth';
import { useTheme } from '../store/storeTheme';
import Botao from '../components/ui/Botao';
import { Campo, CaixaErro } from '../components/ui';

export default function LoginScreen({ onGoSignUp }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const login          = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const recuperarPassword = useAuthStore((s) => s.recuperarPassword);
  const c = useTheme();
  const s = useMemo(() => mk(c), [c]);
  const insets = useSafeAreaInsets();
  const passRef = useRef(null);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Preenche o email e a password.'); return; }
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.error) setError(r.error);
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    const r = await loginWithGoogle();
    setGoogleLoading(false);
    if (r?.error) setError(r.error);
  };

  // Usa o email escrito no campo; a resposta não revela se a conta existe
  const handleRecuperar = async () => {
    setError('');
    if (!email.trim()) { setError('Escreve o teu email no campo acima e toca outra vez em "Esqueci-me da password".'); return; }
    const r = await recuperarPassword(email);
    if (r.error) { setError(r.error); return; }
    Alert.alert('Verifica o teu email', `Se existir uma conta com ${email.trim()}, vais receber um link para criar uma password nova. Confirma também a pasta de spam.`);
  };

  const busy = loading || googleLoading;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.logo, c.btnShadow]}>
            <Ionicons name="airplane" size={34} color="#FFFFFF" />
          </LinearGradient>
          <Text style={s.appName} accessibilityRole="header">TripSplit</Text>
          <Text style={s.tagline}>Divide despesas, guarda memórias</Text>
        </View>

        <View style={s.form}>
          <Campo
            label="Email" icon="mail-outline" placeholder="nome@email.com"
            value={email} onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none" autoComplete="email" returnKeyType="next" maxLength={100}
            onSubmitEditing={() => passRef.current?.focus()}
          />
          <Campo
            label="Password" icon="lock-closed-outline" placeholder="A tua password" secure
            inputRef={passRef} value={password} onChangeText={setPassword}
            autoComplete="password" returnKeyType="done" onSubmitEditing={handleLogin} maxLength={50}
          />
          <Pressable onPress={handleRecuperar} hitSlop={10} style={s.esqueci} accessibilityRole="button">
            <Text style={s.esqueciTexto}>Esqueci-me da password</Text>
          </Pressable>
        </View>

        <CaixaErro>{error}</CaixaErro>

        <View style={s.botoes}>
          <Botao title="Entrar" onPress={handleLogin} loading={loading} disabled={busy} />
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>ou</Text>
            <View style={s.dividerLine} />
          </View>
          <Botao
            title={googleLoading ? 'A entrar...' : 'Continuar com Google'}
            icon="logo-google" variant="secondary" onPress={handleGoogle} disabled={busy}
          />
        </View>

        <View style={{ flex: 1 }} />

        <Pressable onPress={onGoSignUp} style={s.switchRow} accessibilityRole="button">
          <Text style={s.switchText}>Ainda não tens conta?</Text>
          <Text style={s.switchLink}>Criar conta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const mk = (c) => StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 20, gap: 28 },
  hero: { alignItems: 'center', gap: 14 },
  logo: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 34, fontWeight: '800', letterSpacing: -0.7, color: c.text },
  tagline: { fontSize: 17, color: c.text2, marginTop: -8 },
  form: { gap: 16, marginTop: 8 },
  botoes: { gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.fieldBorder },
  dividerText: { fontSize: 13, color: c.text3 },
  esqueci: { alignSelf: 'flex-end', marginTop: -6 },
  esqueciTexto: { fontSize: 14, fontWeight: '600', color: c.accentText },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  switchText: { fontSize: 15, color: c.text2 },
  switchLink: { fontSize: 15, color: c.accentText, fontWeight: '600' },
});
