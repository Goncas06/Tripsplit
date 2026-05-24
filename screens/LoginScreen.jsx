import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAuthStore } from '../store/storeAuth';
import Botao from '../components/ui/Botao';

export default function LoginScreen({ onGoSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Preenche o email e a password.');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="TripSplit logótipo" />
        <Text style={styles.tagline}>Divide despesas de viagem entre amigos</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Entrar</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="exemplo@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            maxLength={100}
            accessibilityLabel="Email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="A tua password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            maxLength={50}
            accessibilityLabel="Password"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Botao title="Entrar" onPress={handleLogin} loading={loading} disabled={loading} />

          <TouchableOpacity onPress={onGoSignUp} style={styles.linkRow} accessibilityRole="button">
            <Text style={styles.linkText}>Não tens conta? <Text style={styles.link}>Criar conta</Text></Text>
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
  input: { borderWidth: 1.5, borderColor: '#ccc', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 16, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 48 },
  errorText: { fontSize: 13, color: '#CC0000', marginBottom: 12, textAlign: 'center' },
  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 15, color: '#555' },
  link: { color: '#007AFF', fontWeight: '600' },
});
