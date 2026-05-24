import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAuthStore } from '../store/storeAuth';
import Botao from '../components/ui/Botao';

export default function SignUpScreen({ onGoLogin }) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signup = useAuthStore((s) => s.signup);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const handleSignUp = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Preenche todos os campos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Insere um email válido.');
      return;
    }
    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.');
      return;
    }
    setLoading(true);
    const result = await signup(name, email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="TripSplit logótipo" />
        <Text style={styles.tagline}>Cria a tua conta e começa a dividir despesas</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Criar conta</Text>

          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="O teu nome"
            value={name}
            onChangeText={(text) => {
              if (/[^a-zA-ZÀ-ÿ\s'-]/.test(text)) {
                setNameError('Apenas letras são permitidas');
              } else {
                setNameError('');
              }
              setName(text.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ''));
            }}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            maxLength={50}
            autoFocus
            accessibilityLabel="Nome"
          />
          {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

          <Text style={styles.label}>Email *</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder="exemplo@email.com"
            value={email}
            onChangeText={(text) => {
              setEmailError('');
              setEmail(text);
            }}
            onBlur={() => {
              if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                setEmailError('Email inválido');
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            maxLength={100}
            accessibilityLabel="Email"
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <Text style={styles.label}>Password *</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            maxLength={50}
            accessibilityLabel="Password"
          />

          <Text style={styles.label}>Confirmar password *</Text>
          <TextInput
            ref={confirmRef}
            style={styles.input}
            placeholder="Repete a password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
            maxLength={50}
            accessibilityLabel="Confirmar password"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Botao title="Criar conta" onPress={handleSignUp} loading={loading} disabled={loading} />

          <TouchableOpacity onPress={onGoLogin} style={styles.linkRow} accessibilityRole="button">
            <Text style={styles.linkText}>Já tens conta? <Text style={styles.link}>Entrar</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#f0f4ff', justifyContent: 'center' },
  logo: { width: 180, height: 120, alignSelf: 'center', marginBottom: 8 },
  tagline: { fontSize: 15, textAlign: 'center', color: '#555', marginBottom: 32 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#ccc', padding: 14, borderRadius: 10, marginBottom: 8, fontSize: 16, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 48 },
  fieldError: { fontSize: 13, color: '#CC0000', marginBottom: 10, marginLeft: 4 },
  errorText: { fontSize: 13, color: '#CC0000', marginBottom: 12, textAlign: 'center' },
  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 15, color: '#555' },
  link: { color: '#007AFF', fontWeight: '600' },
});
