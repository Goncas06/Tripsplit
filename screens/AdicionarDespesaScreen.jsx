import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, Pressable,
  ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useTripStore } from '../store/storeViagens';
import { useTheme } from '../store/storeTheme';
import Botao from '../components/ui/Botao';
import Cartao from '../components/ui/Cartao';
import { Avatar, Campo, Separador } from '../components/ui';
import { parseValor, eur } from '../utils/valor';
import { CATEGORIAS, ORDEM_CATEGORIAS, suave, corParticipante } from '../utils/categorias';
import { num } from '../utils/theme';
import { useConfirmarSaida } from '../utils/useConfirmarSaida';

// Definidos no ficheiro .env (ver .env.example)
const CLOUDINARY_CLOUD = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD;
const CLOUDINARY_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET;
const MAX_LADO_FOTO = 1200;

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Reduz a foto para no máximo 1200px no lado maior e converte para JPEG (o iPhone tira HEIC)
async function prepararFoto(asset) {
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > MAX_LADO_FOTO) {
      ctx.resize(asset.width >= asset.height ? { width: MAX_LADO_FOTO } : { height: MAX_LADO_FOTO });
    }
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return result.uri;
  } catch (e) {
    console.warn('[Foto] não foi possível reduzir:', e?.message);
    return asset.uri;
  }
}

async function uploadReceipt(uri) {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) throw new Error('Cloudinary não configurado (.env)');
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'receipt.jpg' });
  formData.append('upload_preset', CLOUDINARY_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Upload falhou (${response.status})`);
  }

  const data = await response.json();
  return data.secure_url;
}

export default function AdicionarDespesaScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const route = useRoute();
  const navigation = useNavigation();
  const { viagemId, expenseId } = route.params ?? {};

  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));
  const addExpense = useTripStore((state) => state.addExpense);
  const updateExpense = useTripStore((state) => state.updateExpense);
  const removeExpense = useTripStore((state) => state.removeExpense);

  const isEditing = !!expenseId;
  const existing = isEditing ? trip?.expenses.find(e => e.id === expenseId) : null;
  const allIds = trip?.participants.map(p => p.id) ?? [];

  const [value, setValue] = useState(existing ? String(existing.value).replace('.', ',') : '');
  const [valueError, setValueError] = useState('');
  const [description, setDescription] = useState(existing?.note ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'outros');
  const [paidById, setPaidById] = useState(existing?.paidBy ?? trip?.participants[0]?.id ?? '');
  const [sharedWithIds, setSharedWithIds] = useState(
    existing?.sharedWith?.length > 0 ? existing.sharedWith : allIds
  );
  const [receiptUri, setReceiptUri] = useState(existing?.receiptUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // evita despesas duplicadas com toques repetidos

  // Estado inicial, para saber se há alterações por guardar
  const inicial = useRef({ value, description, category, paidById, receiptUri, shared: [...sharedWithIds].sort().join() }).current;
  const alterado = value !== inicial.value || description !== inicial.description || category !== inicial.category
    || paidById !== inicial.paidById || receiptUri !== inicial.receiptUri
    || [...sharedWithIds].sort().join() !== inicial.shared;
  const permitirSaida = useConfirmarSaida(alterado);

  if (!trip) return <Text style={styles.notFound}>Viagem não encontrada</Text>;
  if (trip.participants.length === 0) return (
    <View style={styles.semPessoas}>
      <View style={styles.semPessoasIcone}>
        <Ionicons name="people-outline" size={40} color={c.accent} />
      </View>
      <Text style={styles.semPessoasTitulo}>Ainda não há participantes</Text>
      <Text style={styles.notFound}>Adiciona quem vai na viagem antes de registar despesas.</Text>
      <Botao title="Adicionar participante" icon="person-add-outline" style={{ alignSelf: 'stretch', marginTop: 12 }}
        onPress={() => navigation.replace('AdicionarParticipante', { viagemId })} />
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

  const showPermissionAlert = (tipo) => {
    Alert.alert(
      'Permissão necessária',
      `Para usar ${tipo}, abre as Definições e ativa a permissão manualmente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Definições', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const requestCameraPermission = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      return granted;
    } catch {
      return false;
    }
  };

  const requestGalleryPermission = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return granted;
    } catch {
      return false;
    }
  };

  const handleLaunchCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showPermissionAlert('a câmara');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptUri(await prepararFoto(result.assets[0]));
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir a câmara.');
    }
  };

  const handleLaunchGallery = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      showPermissionAlert('a galeria');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptUri(await prepararFoto(result.assets[0]));
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remover foto', 'Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setReceiptUri(null) },
    ]);
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const parsed = parseValor(value);
    if (!(parsed > 0)) {
      setValueError('Insere um valor válido (ex: 12,50)');
      return;
    }
    if (!paidById) { Alert.alert('Erro', 'Seleciona quem pagou'); return; }
    if (sharedWithIds.length === 0) {
      Alert.alert('Erro', 'Seleciona pelo menos uma pessoa para dividir a despesa.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const expId = existing?.id ?? uuidv4();
    let finalReceiptUrl = existing?.receiptUrl ?? null;

    if (receiptUri && !receiptUri.startsWith('http')) {
      setUploading(true);
      try {
        finalReceiptUrl = await uploadReceipt(receiptUri);
      } catch (e) {
        console.warn('[Cloudinary] upload falhou:', e?.message);
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
      ...(description.trim() ? { note: description.trim() } : {}),
      ...(finalReceiptUrl ? { receiptUrl: finalReceiptUrl } : {}),
    };

    if (isEditing) updateExpense(viagemId, updatedExpense);
    else addExpense(viagemId, updatedExpense);
    permitirSaida();
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Eliminar despesa', 'Tens a certeza que queres eliminar esta despesa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        removeExpense(viagemId, expenseId);
        permitirSaida();
        navigation.goBack();
      } },
    ]);
  };

  const allSelected = sharedWithIds.length === trip.participants.length;
  const valorAtual = parseValor(value);
  const cada = sharedWithIds.length > 0 && valorAtual > 0 ? eur(valorAtual / sharedWithIds.length) : '—';
  // O TextInput não cresce sozinho na horizontal: largura aproximada pelo nº de caracteres
  const larguraValor = Math.max(2, (value || '0,00').length) * 34 + 8;
  const nTotal = trip.participants.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">

        {/* Valor */}
        <View style={styles.valorBox}>
          <Text style={styles.label}>Valor</Text>
          <View style={styles.valorRow}>
            <Text style={styles.valorEuro}>€</Text>
            <TextInput
              style={[styles.valorInput, num, { width: larguraValor }]}
              placeholder="0,00"
              placeholderTextColor={c.text3}
              value={value}
              onChangeText={handleChangeValue}
              keyboardType="decimal-pad"
              autoFocus={!isEditing}
              selectionColor={c.accent}
              maxLength={10}
              accessibilityLabel="Valor da despesa"
            />
          </View>
          {valueError ? (
            <Text style={styles.erro} accessibilityLiveRegion="polite">{valueError}</Text>
          ) : (
            <View style={styles.porPessoa}>
              <Text style={[styles.porPessoaTexto, num]}>{cada} por pessoa</Text>
            </View>
          )}
        </View>

        <Campo
          label="Descrição" icon="create-outline" placeholder="Ex: Jantar na praia"
          value={description} onChangeText={setDescription} maxLength={100}
          accessibilityLabel="Descrição da despesa"
        />

        {/* Categoria */}
        <View style={styles.bloco}>
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.tiles}>
            {ORDEM_CATEGORIAS.map(k => {
              const cat = CATEGORIAS[k];
              const sel = category === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setCategory(k)}
                  style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }, sel
                    ? { backgroundColor: suave(cat.color), borderWidth: 2, borderColor: cat.color }
                    : { backgroundColor: c.card, borderWidth: 1, borderColor: c.fieldBorder }]}
                  accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={cat.label}
                >
                  <Ionicons name={sel ? cat.iconFilled : cat.icon} size={24} color={sel ? cat.color : c.text2} />
                  <Text style={[styles.tileTexto, sel ? { color: c.text, fontWeight: '700' } : { color: c.text2 }]}
                    numberOfLines={1} adjustsFontSizeToFit>{cat.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Pago por */}
        <View style={styles.bloco}>
          <Text style={styles.label}>Pago por</Text>
          <View style={styles.pagadores}>
            {trip.participants.map(p => {
              const sel = paidById === p.id;
              return (
                <Pressable key={p.id} onPress={() => setPaidById(p.id)} style={({ pressed }) => [styles.pagador, pressed && { opacity: 0.7 }]}
                  accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={'Pago por ' + p.name}>
                  <View style={[styles.anel, sel && { borderColor: c.accent }]}>
                    <Avatar nome={p.name} cor={corParticipante(trip, p.id)} tamanho={56} style={!sel && { opacity: 0.45 }} />
                    {sel && (
                      <View style={styles.visto}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.pagadorNome, sel ? { fontWeight: '700', color: c.text } : { color: c.text2 }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dividir entre */}
        <View style={styles.bloco}>
          <View style={styles.blocoTopo}>
            <Text style={styles.label}>Dividir entre</Text>
            <Pressable onPress={() => (allSelected ? setSharedWithIds([]) : selectAll())} hitSlop={10} accessibilityRole="button">
              <Text style={styles.link}>{allSelected ? 'Limpar' : 'Selecionar todos'}</Text>
            </Pressable>
          </View>
          <Cartao clip>
            {trip.participants.map(p => {
              const on = sharedWithIds.includes(p.id);
              return (
                <React.Fragment key={p.id}>
                  <Pressable
                    style={({ pressed }) => [styles.divRow, pressed && { backgroundColor: c.field }]}
                    onPress={() => toggleShared(p.id)}
                    accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={p.name}
                  >
                    <Avatar nome={p.name} cor={corParticipante(trip, p.id)} tamanho={36} />
                    <Text style={styles.divNome} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.divCada, num]}>{on ? cada : '—'}</Text>
                    <View style={[styles.check, on ? { backgroundColor: c.accent } : { borderWidth: 2, borderColor: c.checkBorder }]}>
                      {on && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                    </View>
                  </Pressable>
                  <Separador />
                </React.Fragment>
              );
            })}
            <View style={styles.divRodape}>
              <Text style={styles.divRodapeTexto}>{sharedWithIds.length} de {nTotal} {nTotal === 1 ? 'pessoa' : 'pessoas'}</Text>
              <Text style={[styles.divRodapeValor, num]}>
                {cada} <Text style={styles.divRodapeCada}>cada</Text>
              </Text>
            </View>
          </Cartao>
        </View>

        {/* Foto do recibo */}
        <View style={styles.bloco}>
          <Text style={styles.label}>Foto do recibo <Text style={{ fontWeight: '400', color: c.text3 }}>· opcional</Text></Text>
          <View style={styles.fotoBotoes}>
            <Botao title="Câmara" icon="camera-outline" variant="secondary" height={50} radius={14}
              style={{ flex: 1 }} onPress={handleLaunchCamera} />
            <Botao title="Galeria" icon="images-outline" variant="secondary" height={50} radius={14}
              style={{ flex: 1 }} onPress={handleLaunchGallery} />
          </View>
          {receiptUri ? (
            <View style={styles.preview}>
              <Image source={{ uri: receiptUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <Pressable onPress={handleRemovePhoto} style={styles.previewFechar} accessibilityRole="button" accessibilityLabel="Remover foto">
                <View style={styles.previewFecharCirculo}>
                  <Ionicons name="close" size={17} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          ) : null}
          {uploading && (
            <View style={styles.uploadingRow} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={c.accent} />
              <Text style={styles.uploadingText}>A carregar foto...</Text>
            </View>
          )}
        </View>

        <View style={{ gap: 6, marginTop: 4 }}>
          <Botao
            title={isEditing ? 'Guardar alterações' : 'Adicionar despesa'}
            onPress={handleSave}
            height={56} radius={18}
            loading={uploading}
            disabled={!value.trim() || uploading || saving}
          />
          <Botao title="Cancelar" variant="text" textColor={c.text2} onPress={() => navigation.goBack()} />
          {isEditing && (
            <Botao title="Eliminar despesa" icon="trash-outline" variant="text" textColor={c.negText} onPress={handleDelete} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 26 },
  notFound: { textAlign: 'center', color: c.text2, fontSize: 15, lineHeight: 22 },
  semPessoas: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8, backgroundColor: c.bg },
  semPessoasIcone: { width: 88, height: 88, borderRadius: 44, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  semPessoasTitulo: { fontSize: 20, fontWeight: '700', color: c.text },

  label: { fontSize: 13, fontWeight: '600', color: c.text2 },
  link: { fontSize: 15, fontWeight: '600', color: c.accentText },
  bloco: { gap: 10 },
  blocoTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  valorBox: { alignItems: 'center', gap: 4, paddingTop: 12, paddingBottom: 4 },
  valorRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  valorEuro: { fontSize: 36, fontWeight: '600', color: c.text3 },
  valorInput: { fontSize: 60, fontWeight: '700', letterSpacing: -1.5, color: c.text, paddingVertical: 0, maxWidth: 300 },
  porPessoa: { height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.accentSoft, justifyContent: 'center', marginTop: 6 },
  porPessoaTexto: { fontSize: 14, fontWeight: '600', color: c.accentText },
  erro: { fontSize: 13, color: c.negText, marginTop: 6 },

  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, height: 78, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 2 },
  tileTexto: { fontSize: 11, fontWeight: '600' },

  pagadores: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  pagador: { width: '25%', alignItems: 'center', gap: 6, paddingVertical: 4 },
  anel: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  visto: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent,
    borderWidth: 2, borderColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  pagadorNome: { fontSize: 14, maxWidth: '90%' },

  divRow: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  divNome: { flex: 1, fontSize: 17, fontWeight: '500', color: c.text },
  divCada: { fontSize: 15, color: c.text2 },
  check: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  divRodape: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: c.field },
  divRodapeTexto: { fontSize: 14, color: c.text2 },
  divRodapeValor: { fontSize: 17, fontWeight: '700', color: c.text },
  divRodapeCada: { fontSize: 13, fontWeight: '500', color: c.text2 },

  fotoBotoes: { flexDirection: 'row', gap: 10 },
  preview: { height: 132, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.fieldBorder, backgroundColor: c.field },
  previewFechar: { position: 'absolute', top: 4, right: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  previewFecharCirculo: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadingText: { fontSize: 13, color: c.accentText },
});
