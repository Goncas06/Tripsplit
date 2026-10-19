import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/storeViagens';
import { useTheme } from '../store/storeTheme';
import Botao from '../components/ui/Botao';
import { Avatar, Campo } from '../components/ui';
import { corParticipante } from '../utils/categorias';

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function AdicionarParticipanteScreen() {
  const { viagemId } = useRoute().params;
  const updateTrip = useTripStore((state) => state.updateTrip);
  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const inputRef = useRef(null);
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  if (!trip) return <Text style={s.notFound}>Viagem não encontrada</Text>;

  const handleChangeName = (text) => {
    setNameError(/[^a-zA-ZÀ-ÿ\s'-]/.test(text) ? 'Apenas letras são permitidas' : '');
    setName(text.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ''));
  };

  // Fica no ecrã para se poderem adicionar várias pessoas seguidas
  const handleAdd = () => {
    const nome = name.trim();
    if (!nome) { setNameError('Insere o nome do participante'); return; }
    updateTrip(viagemId, { participants: [...trip.participants, { id: uuidv4(), name: nome }] });
    setName('');
    setNameError('');
    inputRef.current?.focus();
  };

  const n = trip.participants.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.topo}>
          <View style={s.icone}>
            <Ionicons name="person-add" size={34} color={c.accent} />
          </View>
          <Text style={s.titulo} accessibilityRole="header">Quem mais vai?</Text>
        </View>

        <Campo
          label="Nome" icon="person-outline" placeholder="Nome do participante"
          inputRef={inputRef} value={name} onChangeText={handleChangeName} erro={nameError}
          autoFocus returnKeyType="done" blurOnSubmit={false} onSubmitEditing={handleAdd} maxLength={50}
        />

        <Botao title="Adicionar" icon="add" onPress={handleAdd} disabled={!name.trim()} />

        {n > 0 && (
          <View style={{ gap: 10, marginTop: 4 }}>
            <Text style={s.label}>Já na viagem · {n}</Text>
            <View style={s.chips}>
              {trip.participants.map(p => (
                <View key={p.id} style={s.chip}>
                  <Avatar nome={p.name} cor={corParticipante(trip, p.id)} tamanho={30} />
                  <Text style={s.chipTexto}>{p.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40, gap: 24 },
  notFound: { padding: 20, textAlign: 'center', color: c.text2 },
  topo: { alignItems: 'center', gap: 10 },
  icone: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 22, fontWeight: '700', color: c.text },
  label: { fontSize: 13, fontWeight: '600', color: c.text2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingLeft: 5, paddingRight: 14, borderRadius: 20, backgroundColor: c.card, borderWidth: 1,
    borderColor: c.fieldBorder, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipTexto: { fontSize: 15, fontWeight: '600', color: c.text },
});
