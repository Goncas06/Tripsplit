import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTripStore } from '../store/storeViagens';
import { storage, auth } from '../utils/firebase';
import Botao from '../components/ui/Botao';

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const categories = [
  { key: 'gasolina', label: '⛽ Gasolina' },
  { key: 'portagens', label: '🛣️ Portagens' },
  { key: 'hotel', label: '🏨 Hotel' },
  { key: 'refeicoes', label: '🍽️ Refeições' },
  { key: 'outros', label: '📦 Outros' },
];

async function uploadReceipt(uri, viagemId, expenseId) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sem sessão');
  const storageRef = ref(storage, `users/${uid}/trips/${viagemId}/receipts/${expenseId}.jpg`);
  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

export default function AdicionarDespesaScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { viagemId, expenseId } = route.params ?? {};

  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));
  const updateTrip = useTripStore((state) => state.updateTrip);

  const isEditing = !!expenseId;
  const existing = isEditing ? trip?.expenses.find(e => e.id === expenseId) : null;
  const allIds = trip?.participants.map(p => p.id) ?? [];

  const [value, setValue] = useState(existing ? String(existing.value) : '');
  const [valueError, setValueError] = useState('');
  const [description, setDescription] = useState(existing?.note ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'outros');
  const [paidById, setPaidById] = useState(existing?.paidBy ?? trip?.participants[0]?.id ?? '');
  const [sharedWithIds, setSharedWithIds] = useState(
    existing?.sharedWith?.length > 0 ? existing.sharedWith : allIds
  );
  const [receiptUri, setReceiptUri] = useState(existing?.receiptUrl ?? null);
  const [uploading, setUploading] = useState(false);

  if (!trip) return <Text style={styles.notFound}>Viagem não encontrada</Text>;
  if (trip.participants.length === 0) return (
    <View style={styles.notFoundContainer}>
      <Text style={styles.notFound}>Adiciona participantes à viagem antes de registar despesas.</Text>
    </View>
  );

  const handleChangeValue = (text) => {
    const clean = text.replace(/[^0-9.,]/g, '');
    if (text !== clean) setValueError('Apenas números são permitidos');
    else setValueError('');
    setValue(clean);
  };

  const toggleShared = (id) =>
    setSharedWithIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const selectAll = () => setSharedWithIds(trip.participants.map(p => p.id));

  const handlePickPhoto = () => {
    Alert.alert('Adicionar foto', 'Escolhe a origem da foto', [
      {
        text: 'Câmara',
        onPress: () => launchCamera(
          { mediaType: 'photo', quality: 0.7, maxWidth: 1200, maxHeight: 1200 },
          handleImageResult
        ),
      },
      {
        text: 'Galeria',
        onPress: () => launchImageLibrary(
          { mediaType: 'photo', quality: 0.7, maxWidth: 1200, maxHeight: 1200 },
          handleImageResult
        ),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleImageResult = (result) => {
    if (result.didCancel || !result.assets?.[0]?.uri) return;
    setReceiptUri(result.assets[0].uri);
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remover foto', 'Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setReceiptUri(null) },
    ]);
  };

  const handleSave = async () => {
    const parsed = parseFloat(value.replace(',', '.'));
    if (!value || isNaN(parsed) || parsed <= 0) {
      setValueError('Insere um valor válido');
      return;
    }
    if (!paidById) { Alert.alert('Erro', 'Seleciona quem pagou'); return; }
    if (sharedWithIds.length === 0) {
      Alert.alert('Erro', 'Seleciona pelo menos uma pessoa para dividir a despesa.');
      return;
    }

    const expId = existing?.id ?? uuidv4();
    let finalReceiptUrl = existing?.receiptUrl ?? null;

    if (receiptUri && !receiptUri.startsWith('http')) {
      setUploading(true);
      try {
        finalReceiptUrl = await uploadReceipt(receiptUri, viagemId, expId);
      } catch {
        Alert.alert('Aviso', 'Não foi possível carregar a foto, mas a despesa será guardada na mesma.');
        finalReceiptUrl = null;
      } finally {
        setUploading(false);
      }
    } else if (!receiptUri) {
      finalReceiptUrl = null;
    }

    const updatedExpense = {
      id: expId,
      value: parsed,
      category,
      paidBy: paidById,
      sharedWith: sharedWithIds,
      note: description.trim() || undefined,
      receiptUrl: finalReceiptUrl || undefined,
    };

    if (isEditing) {
      updateTrip(viagemId, {
        expenses: trip.expenses.map(e => e.id === expenseId ? updatedExpense : e),
      });
    } else {
      updateTrip(viagemId, { expenses: [...trip.expenses, updatedExpense] });
    }

    navigation.goBack();
  };

  const allSelected = sharedWithIds.length === trip.participants.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>

          <Text style={styles.label}>Valor (€) *</Text>
          <TextInput
            style={[styles.input, valueError ? styles.inputError : null]}
            placeholder="0.00"
            value={value}
            onChangeText={handleChangeValue}
            keyboardType="decimal-pad"
            accessibilityLabel="Valor da despesa"
          />
          {valueError ? <Text style={styles.fieldError}>{valueError}</Text> : null}

          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Jantar na praia"
            value={description}
            onChangeText={setDescription}
            maxLength={100}
            accessibilityLabel="Descrição da despesa"
          />

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
              {categories.map(c => <Picker.Item key={c.key} label={c.label} value={c.key} />)}
            </Picker>
          </View>

          <Text style={styles.label}>Pago por</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={paidById} onValueChange={setPaidById} style={styles.picker}>
              {trip.participants.map(p => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
            </Picker>
          </View>

          <View style={styles.splitHeader}>
            <Text style={styles.label}>Dividir entre</Text>
            {!allSelected && (
              <TouchableOpacity onPress={selectAll} accessibilityRole="button">
                <Text style={styles.selectAll}>Selecionar todos</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.hint}>
            {allSelected
              ? 'Todos os participantes'
              : `${sharedWithIds.length} de ${trip.participants.length} selecionados`}
          </Text>

          {trip.participants.map(p => {
            const selected = sharedWithIds.includes(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.checkRow, selected && styles.checkRowSelected]}
                onPress={() => toggleShared(p.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={p.name}
              >
                <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkLabel, selected && styles.checkLabelSelected]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.label, { marginTop: 16 }]}>Foto do recibo (opcional)</Text>

          {receiptUri ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" />
              <View style={styles.receiptActions}>
                <TouchableOpacity style={styles.receiptBtn} onPress={handlePickPhoto}>
                  <Text style={styles.receiptBtnText}>Trocar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.receiptBtn, styles.receiptBtnDanger]} onPress={handleRemovePhoto}>
                  <Text style={[styles.receiptBtnText, { color: '#FF3B30' }]}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto} activeOpacity={0.75}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Adicionar foto do recibo</Text>
            </TouchableOpacity>
          )}

          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.uploadingText}>A carregar foto...</Text>
            </View>
          )}

          <Botao
            title={isEditing ? 'Guardar alterações' : 'Adicionar Despesa'}
            onPress={handleSave}
            disabled={!value.trim() || uploading}
            style={{ marginTop: 16 }}
          />
          <Botao title="Cancelar" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 20, paddingBottom: 40 },
  notFoundContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  notFound: { textAlign: 'center', color: '#555', fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  splitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  selectAll: { fontSize: 13, color: '#007AFF', fontWeight: '600', marginBottom: 6 },
  hint: { fontSize: 12, color: '#888', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10, padding: 13, fontSize: 16, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 48 },
  inputError: { borderColor: '#CC0000' },
  fieldError: { fontSize: 13, color: '#CC0000', marginTop: 4, marginLeft: 2 },
  pickerWrapper: { borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fafafa', overflow: 'hidden' },
  picker: { height: 50 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#e0e0e0', marginBottom: 6, backgroundColor: '#fafafa' },
  checkRowSelected: { borderColor: '#007AFF', backgroundColor: '#f0f7ff' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkmark: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  checkLabel: { fontSize: 15, color: '#555' },
  checkLabelSelected: { color: '#007AFF', fontWeight: '600' },

  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#007AFF', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, backgroundColor: '#f0f7ff', gap: 8 },
  photoBtnIcon: { fontSize: 20 },
  photoBtnText: { fontSize: 15, color: '#007AFF', fontWeight: '600' },

  receiptPreview: { borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: '#e0e0e0' },
  receiptImage: { width: '100%', height: 180 },
  receiptActions: { flexDirection: 'row' },
  receiptBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderColor: '#e0e0e0' },
  receiptBtnDanger: { borderLeftWidth: 1, borderColor: '#e0e0e0' },
  receiptBtnText: { fontSize: 14, color: '#007AFF', fontWeight: '600' },

  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  uploadingText: { fontSize: 13, color: '#007AFF' },
});
