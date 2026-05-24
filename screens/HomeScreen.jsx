import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Botao from '../components/ui/Botao';
import Cartao from '../components/ui/Cartao';
import { useTripStore } from '../store/storeViagens';
import { decodeTrip, buildImportedTrip } from '../utils/share';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { trips, loadTrips, addTrip } = useTripStore();
  const [importVisible, setImportVisible] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadTrips(); }, []);

  const handleImport = async () => {
    const raw = decodeTrip(importCode);
    if (!raw || !raw.name) {
      Alert.alert('Código inválido', 'O código introduzido não é válido. Verifica se o copiaste corretamente.');
      return;
    }
    setImporting(true);
    const trip = buildImportedTrip(raw);
    await addTrip(trip);
    setImporting(false);
    setImportVisible(false);
    setImportCode('');
    Alert.alert('Viagem importada!', `"${trip.name}" foi adicionada às tuas viagens.`);
  };

  const renderTrip = ({ item }) => {
    const total = item.expenses.reduce((s, e) => s + (e.value || 0), 0);
    const settledCount = item.expenses.length;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('DetalhesViagem', { viagemId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={`Abrir viagem ${item.name}`}
      >
        <Cartao>
          <View style={styles.tripHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tripName}>{item.name}</Text>
              {item.destination ? <Text style={styles.tripSub}>{item.destination}</Text> : null}
              {item.dates ? <Text style={styles.tripDates}>{item.dates}</Text> : null}
            </View>
            {settledCount > 0 && (
              <Text style={styles.tripTotal}>€{total.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.tripStats}>
            <Text style={styles.tripStat}>{item.participants.length} participante{item.participants.length !== 1 ? 's' : ''}</Text>
            <Text style={styles.tripStatDot}>·</Text>
            <Text style={styles.tripStat}>{settledCount} despesa{settledCount !== 1 ? 's' : ''}</Text>
          </View>
        </Cartao>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        renderItem={renderTrip}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="TripSplit logótipo" />
            <Text style={styles.subtitle}>Divide despesas de viagem entre amigos</Text>
            <Botao
              title="Nova Viagem"
              onPress={() => navigation.navigate('CriarViagem')}
            />
            <Botao
              title="Importar Viagem"
              onPress={() => setImportVisible(true)}
              variant="secondary"
              accessibilityLabel="Importar viagem partilhada"
              accessibilityHint="Cola o código partilhado por um amigo para adicionar a viagem"
            />
            {trips.length > 0 && <Text style={styles.sectionLabel}>As tuas viagens</Text>}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Nenhuma viagem ainda</Text>
            <Text style={styles.emptySub}>Cria uma nova viagem ou importa uma partilhada por um amigo.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      <Modal
        visible={importVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Importar Viagem</Text>
            <Text style={styles.modalDesc}>
              Cola abaixo o código que o teu amigo partilhou contigo.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Cola o código aqui"
              value={importCode}
              onChangeText={setImportCode}
              multiline
              numberOfLines={4}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Código de importação"
            />
            <Botao
              title="Importar"
              onPress={handleImport}
              loading={importing}
              disabled={!importCode.trim() || importing}
            />
            <Botao
              title="Cancelar"
              onPress={() => { setImportVisible(false); setImportCode(''); }}
              variant="secondary"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  list: { padding: 20, paddingBottom: 40 },
  logo: { width: 200, height: 130, alignSelf: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, textAlign: 'center', color: '#555', marginBottom: 24 },
  actionsRow: { gap: 10, marginBottom: 8 },
  actionBtn: { flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  tripHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  tripName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  tripSub: { fontSize: 14, color: '#555', marginBottom: 1 },
  tripDates: { fontSize: 13, color: '#888', marginBottom: 2 },
  tripTotal: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginLeft: 8 },
  tripStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tripStat: { fontSize: 13, color: '#888', fontWeight: '500' },
  tripStatDot: { fontSize: 13, color: '#ccc' },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 20 },
  modalInput: { borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 13, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 100, textAlignVertical: 'top', fontFamily: 'monospace', marginBottom: 16 },
});
