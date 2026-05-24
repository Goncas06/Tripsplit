import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTripStore } from '../store/storeViagens';
import Botao from '../components/ui/Botao';

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function CriarViagemScreen() {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const addTrip = useTripStore((state) => state.addTrip);

  const destRef = useRef(null);
  const datesRef = useRef(null);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Erro', 'Insere o nome da viagem.'); return; }
    if (!destination.trim()) { Alert.alert('Erro', 'Insere o destino da viagem.'); return; }
    setLoading(true);
    await addTrip({
      id: uuidv4(),
      name: name.trim(),
      destination: destination.trim(),
      dates: dates.trim(),
      participants: [],
      expenses: [],
    });
    setLoading(false);
    navigation.goBack();
  };

  const canCreate = name.trim().length > 0 && destination.trim().length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Nova Viagem</Text>

          <Text style={styles.label}>Nome da viagem *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Viagem a Madrid"
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => destRef.current?.focus()}
            maxLength={60}
            accessibilityLabel="Nome da viagem"
          />

          <Text style={styles.label}>Destino *</Text>
          <TextInput
            ref={destRef}
            style={styles.input}
            placeholder="Ex: Lisboa, Algarve, Madrid..."
            value={destination}
            onChangeText={setDestination}
            returnKeyType="next"
            onSubmitEditing={() => datesRef.current?.focus()}
            maxLength={100}
            accessibilityLabel="Destino da viagem"
          />

          <Text style={styles.label}>Datas (opcional)</Text>
          <TextInput
            ref={datesRef}
            style={styles.input}
            placeholder="Ex: 10/06 - 15/06"
            value={dates}
            onChangeText={setDates}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            maxLength={40}
            accessibilityLabel="Datas da viagem"
          />

          <Botao
            title="Criar Viagem"
            onPress={handleCreate}
            loading={loading}
            disabled={!canCreate || loading}
            style={{ marginTop: 8 }}
          />
          <Botao title="Cancelar" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#f0f4ff', justifyContent: 'center' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 48 },
});
