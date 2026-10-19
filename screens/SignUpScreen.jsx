import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/storeAuth';
import { useTheme } from '../store/storeTheme';
import Botao from '../components/ui/Botao';
import { Campo, CaixaErro } from '../components/ui';

export default function SignUpScreen({ onGoLogin }) {
  const [name, setName]               = useState('');
  const [nameError, setNameError]     = useState('');
  const [email, setEmail]             = useState('');
  const [emailError, setEmailError]   = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleL]   = useState(false);
  const signup         = useAuthStore((s) => s.signup);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const c = useTheme();
  const s = useMemo(() => mk(c), [c]);
  const insets = useSafeAreaInsets();
  const emailRef   = useRef(null);
  const passRef    = useRef(null);
  const confirmRef = useRef(null);

  const handleSignUp = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) { setError('Preenche todos os campos.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Insere um email válido.'); return; }
    if (password.length < 6) { setError('A password deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As passwords não coincidem.'); return; }
    setLoading(true);
    const r = await signup(name, email, password);
    setLoading(false);
    if (r.error) setError(r.error);
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleL(true);
    const r = await loginWithGoogle();
    setGoogleL(false);
    if (r?.error) setError(r.error);
  };

  const busy = loading || googleLoading;
  const passwordsIguais = password.length >= 6 && password === confirmPassword;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      >
        <View style={s.nav}>
          <Pressable onPress={onGoLogin} style={s.voltar} accessibilityRole="button" accessibilityLabel="Voltar para entrar">
            <Ionicons name="chevron-back" size={28} color={c.accent} />
            <Text style={s.voltarTexto}>Entrar</Text>
          </Pressable>
        </View>

        <View style={s.corpo}>
          <View style={{ gap: 6 }}>
            <Text style={s.titulo} accessibilityRole="header">Criar conta</Text>
            <Text style={s.subtitulo}>Começa a dividir a próxima viagem.</Text>
          </View>

          <View style={s.form}>
            <Campo
              label="Nome" icon="person-outline" placeholder="O teu nome" value={name} erro={nameError}
              onChangeText={(t) => { setNameError(/[^a-zA-ZÀ-ÿ\s'-]/.test(t) ? 'Apenas letras' : ''); setName(t.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '')); }}
              autoComplete="name" textContentType="name" autoCapitalize="words"
              returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} maxLength={50}
            />
            <Campo
              label="Email" icon="mail-outline" placeholder="nome@email.com" inputRef={emailRef}
              value={email} erro={emailError}
              onChangeText={(t) => { setEmailError(''); setEmail(t); }}
              onBlur={() => { if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) setEmailError('Email inválido'); }}
              keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()} maxLength={100}
            />
            <Campo
              label="Password" icon="lock-closed-outline" placeholder="Mínimo 6 caracteres" secure
              inputRef={passRef} value={password} onChangeText={setPassword}
              autoComplete="new-password" textContentType="newPassword"
              returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} maxLength={50}
            />
            <Campo
              label="Confirmar password" icon="lock-closed-outline" placeholder="Repete a password" secure
              inputRef={confirmRef} value={confirmPassword} onChangeText={setConfirm}
              autoComplete="new-password" textContentType="newPassword"
              returnKeyType="done" onSubmitEditing={handleSignUp} maxLength={50}
              direita={passwordsIguais ? <Ionicons name="checkmark-circle" size={22} color={c.pos} style={{ marginRight: 6 }} /> : null}
            />
          </View>

          <CaixaErro>{error}</CaixaErro>

          <View style={{ gap: 12 }}>
            <Botao title="Criar conta" onPress={handleSignUp} loading={loading} disabled={busy} />
            <Botao
              title={googleLoading ? 'A entrar...' : 'Continuar com Google'}
              icon="logo-google" variant="secondary" onPress={handleGoogle} disabled={busy}
            />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable onPress={onGoLogin} style={s.switchRow} accessibilityRole="button">
          <Text style={s.switchText}>Já tens conta?</Text>
          <Text style={s.switchLink}>Entrar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const mk = (c) => StyleSheet.create({
  container: { flexGrow: 1 },
  nav: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  voltar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 8 },
  voltarTexto: { fontSize: 17, color: c.accent },
  corpo: { paddingHorizontal: 20, paddingTop: 8, gap: 24 },
  titulo: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.7, color: c.text },
  subtitulo: { fontSize: 17, color: c.text2 },
  form: { gap: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 16 },
  switchText: { fontSize: 15, color: c.text2 },
  switchLink: { fontSize: 15, color: c.accentText, fontWeight: '600' },
});
