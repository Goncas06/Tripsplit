import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTripStore } from '../store/storeViagens';
import Botao from '../components/ui/Botao';

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function AdicionarParticipanteScreen() {
  const { viagemId } = useRoute().params;
  const navigation = useNavigation();
  const updateTrip = useTripStore((state) => state.updateTrip);
  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  if (!trip) return <Text style={styles.notFound}>Viagem não encontrada</Text>;

  const handleChangeName = (text) => {
    if (/[^a-zA-ZÀ-ÿ\s'-]/.test(text)) {
      setNameError('Apenas letras são permitidas');
    } else {
      setNameError('');
    }
    setName(text.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ''));
  };

  const handleAdd = () => {
    if (!name.trim()) {
      setNameError('Insere o nome do participante');
      return;
    }
    updateTrip(viagemId, {
      participants: [...trip.participants, { id: uuidv4(), name: name.trim() }],
    });
    Alert.alert('Participante adicionado!', `${name.trim()} foi adicionado à viagem.`);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Adicionar participante</Text>
          <Text style={styles.subtitle}>A viagem: {trip.name}</Text>

          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="Nome do participante"
            value={name}
            onChangeText={handleChangeName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            maxLength={50}
            accessibilityLabel="Nome do participante"
            accessibilityHint="Apenas letras são permitidas"
          />
          {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

          <Botao title="Adicionar" onPress={handleAdd} disabled={!name.trim()} />
          <Botao title="Cancelar" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#f0f4ff', justifyContent: 'center' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#ccc', padding: 14, borderRadius: 10, marginBottom: 4, fontSize: 16, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 48 },
  inputError: { borderColor: '#CC0000' },
  fieldError: { fontSize: 13, color: '#CC0000', marginBottom: 12, marginLeft: 4 },
  notFound: { flex: 1, textAlign: 'center', marginTop: 40, color: '#555' },
});
