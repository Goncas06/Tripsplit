import React, { useState, useLayoutEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert, Switch, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Botao from '../components/ui/Botao';
import { Avatar, FolhaInferior } from '../components/ui';
import { useTripStore } from '../store/storeViagens';
import { useAuthStore } from '../store/storeAuth';
import { useThemeStore, useTheme } from '../store/storeTheme';
import { decodeTrip, buildImportedTrip } from '../utils/share';
import { eCodigoCurto } from '../utils/codigoViagem';
import { corParticipante } from '../utils/categorias';
import { datasDaViagem } from '../utils/datas';
import { eur } from '../utils/valor';
import { num } from '../utils/theme';

const MAX_AVATARES = 4;

// Resolve true quando a viagem aparece no store (até 8 s)
const esperarViagem = (id) => new Promise((resolve) => {
  const tem = (st) => st.trips.some(t => t.id === id);
  if (tem(useTripStore.getState())) { resolve(true); return; }
  const parar = useTripStore.subscribe((st) => { if (tem(st)) { parar(); clearTimeout(t); resolve(true); } });
  const t = setTimeout(() => { parar(); resolve(false); }, 8000);
});

function CartaoViagem({ trip, onPress, c, s }) {
  const total = trip.expenses.reduce((sum, e) => sum + (e.value || 0), 0);
  const datas = datasDaViagem(trip.dates);
  const visiveis = trip.participants.slice(0, MAX_AVATARES);
  const extra = trip.participants.length - visiveis.length;
  const n = trip.participants.length;
  const d = trip.expenses.length;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Abrir viagem ${trip.name}`}
      style={({ pressed }) => [s.tripCard, c.cardShadow, pressed && { opacity: 0.9 }]}>
      <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tripHero}>
        {datas ? (
          <View style={s.tripDatas}>
            <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
            <Text style={s.tripDatasTexto}>{datas}</Text>
          </View>
        ) : null}
        <Text style={s.tripNome} numberOfLines={1}>{trip.name}</Text>
        {trip.destination ? (
          <View style={s.tripLocal}>
            <Ionicons name="location" size={14} color="#E3E8FF" />
            <Text style={s.tripLocalTexto} numberOfLines={1}>{trip.destination}</Text>
          </View>
        ) : null}
      </LinearGradient>
      <View style={s.tripBase}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.tripLabel}>Total gasto</Text>
          <Text style={[s.tripTotal, num]}>{eur(total)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {n > 0 && (
            <View style={{ flexDirection: 'row' }}>
              {visiveis.map((p, i) => (
                <Avatar key={p.id} nome={p.name} cor={corParticipante(trip, p.id)} tamanho={28}
                  style={[s.avatarPilha, i === 0 && { marginLeft: 0 }]} />
              ))}
              {extra > 0 && (
                <View style={[s.avatarPilha, s.avatarExtra]}>
                  <Text style={s.avatarExtraTexto}>+{extra}</Text>
                </View>
              )}
            </View>
          )}
          <Text style={s.tripLabel}>
            {n} {n === 1 ? 'pessoa' : 'pessoas'} · {d} {d === 1 ? 'despesa' : 'despesas'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.text3} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { trips, carregado, addTrip, juntarComCodigo } = useTripStore();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isDark, toggle } = useThemeStore();
  const c = useTheme();
  const s = useMemo(() => mk(c), [c]);

  const [importVisible,  setImportVisible]  = useState(false);
  const [importCode,     setImportCode]     = useState('');
  const [importing,      setImporting]      = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setProfileVisible(true)} style={s.headerAvatar}
          accessibilityRole="button" accessibilityLabel="Perfil">
          <Avatar nome={user?.name} cor={c.userColor} tamanho={36} />
        </Pressable>
      ),
    });
  }, [navigation, user?.name, s, c.userColor]);

  const codigoInvalido = () => Alert.alert('Código não encontrado',
    'Confirma que escreveste bem os 6 caracteres. Os códigos expiram ao fim de 30 dias — pede um novo a quem partilhou.');

  // Com um código curto (ex: AALX40) a pessoa junta-se à viagem e passa a vê-la em tempo real.
  // Códigos antigos (longos, ou de antes das viagens partilhadas) continuam a criar uma cópia.
  const handleImport = async () => {
    setImporting(true);
    try {
      if (eCodigoCurto(importCode)) {
        const r = await juntarComCodigo(importCode);
        if (r.estado === 'invalido') { codigoInvalido(); return; }
        if (r.estado === 'copia') {
          const copia = buildImportedTrip(r.trip);
          if (!copia) { codigoInvalido(); return; }
          addTrip(copia);
          fecharImport();
          Alert.alert('Viagem importada', `"${copia.name}" foi adicionada como cópia (código antigo).`);
          return;
        }
        // Espera que a viagem chegue pela subscrição em tempo real antes de a abrir
        const chegou = await esperarViagem(r.tripId);
        fecharImport();
        if (r.estado === 'ja-membro') Alert.alert('Já fazes parte desta viagem');
        if (chegou) navigation.navigate('DetalhesViagem', { viagemId: r.tripId });
        else Alert.alert('Entraste na viagem', 'Vai aparecer na lista assim que houver ligação.');
        return;
      }
      const copia = (() => { const raw = decodeTrip(importCode); return raw && buildImportedTrip(raw); })();
      if (!copia) { codigoInvalido(); return; }
      addTrip(copia);
      fecharImport();
      Alert.alert('Viagem importada', `"${copia.name}" foi adicionada.`);
    } catch (e) {
      Alert.alert('Não foi possível entrar na viagem', e?.code === 'permission-denied'
        ? 'O servidor recusou o acesso. O código pode ter expirado entretanto.'
        : 'Verifica a ligação à internet e tenta de novo.');
    } finally {
      setImporting(false);
    }
  };

  const fecharImport = () => { setImportVisible(false); setImportCode(''); };

  const handleLogout = () => Alert.alert('Terminar sessão', 'Tens a certeza?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: () => { setProfileVisible(false); logout(); } },
  ]);

  const vazio = trips.length === 0;

  return (
    <View style={s.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        renderItem={({ item }) => (
          <CartaoViagem trip={item} c={c} s={s}
            onPress={() => navigation.navigate('DetalhesViagem', { viagemId: item.id })} />
        )}
        ListHeaderComponent={
          <View style={{ gap: 22, marginBottom: vazio ? 0 : 22 }}>
            <View style={{ gap: 4 }}>
              <Text style={s.titulo} accessibilityRole="header">As tuas viagens</Text>
              <Text style={s.subtitulo}>Divide despesas, guarda memórias</Text>
            </View>
            {!vazio && (
              <View style={s.acoes}>
                <Botao title="Nova viagem" icon="add" height={50} style={{ flex: 1.2 }}
                  onPress={() => navigation.navigate('CriarViagem')} />
                <Botao title="Usar código" icon="key-outline" variant="secondary" height={50} style={{ flex: 1 }}
                  onPress={() => setImportVisible(true)} accessibilityLabel="Entrar numa viagem com código" />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={!carregado ? (
          <View style={s.empty}><ActivityIndicator color={c.accent} /></View>
        ) : (
          <View style={s.empty}>
            <View style={s.emptyIcone}>
              <Ionicons name="airplane-outline" size={48} color={c.accent} />
            </View>
            <Text style={s.emptyTitulo}>Nenhuma viagem ainda</Text>
            <Text style={s.emptyTexto}>Cria a primeira viagem ou entra numa que um amigo partilhou contigo.</Text>
            <View style={s.emptyBotoes}>
              <Botao title="Nova viagem" icon="add" onPress={() => navigation.navigate('CriarViagem')} />
              <Botao title="Usar código de viagem" icon="key-outline" variant="secondary" onPress={() => setImportVisible(true)} />
            </View>
          </View>
        )}
      />

      {/* Folha de perfil */}
      <FolhaInferior visible={profileVisible} onClose={() => setProfileVisible(false)} style={{ alignItems: 'center', gap: 20 }}>
        <View style={s.perfil}>
          <Avatar nome={user?.name} cor={c.userColor} tamanho={80} style={{ marginBottom: 6 }} />
          <Text style={s.perfilNome}>{user?.name}</Text>
          <Text style={s.perfilEmail}>{user?.email}</Text>
        </View>
        <View style={s.linhaEscuro}>
          <View style={s.linhaEscuroIcone}>
            <Ionicons name="moon" size={17} color={c.accent} />
          </View>
          <Text style={s.linhaEscuroTexto}>Modo escuro AMOLED</Text>
          <Switch value={isDark} onValueChange={toggle}
            trackColor={{ false: c.switchOff, true: c.accent }} thumbColor="#FFFFFF" ios_backgroundColor={c.switchOff} />
        </View>
        <Botao title="Terminar sessão" icon="log-out-outline" variant="danger" onPress={handleLogout} style={{ alignSelf: 'stretch' }} />
      </FolhaInferior>

      {/* Folha de importar */}
      <FolhaInferior visible={importVisible} onClose={fecharImport}>
        <View style={{ gap: 4 }}>
          <Text style={s.folhaTitulo}>Entrar numa viagem</Text>
          <Text style={s.folhaTexto}>Escreve o código de 6 caracteres que o teu amigo partilhou. Passas a ver e a editar a viagem com ele, em tempo real.</Text>
        </View>
        <TextInput
          style={s.importInput} placeholder="Ex: AALX40"
          placeholderTextColor={c.text3} value={importCode} selectionColor={c.accent}
          onChangeText={setImportCode} autoCapitalize="characters" autoCorrect={false}
          returnKeyType="done" onSubmitEditing={() => importCode.trim() && handleImport()}
          accessibilityLabel="Código da viagem"
        />
        <View style={{ gap: 6 }}>
          <Botao title="Entrar na viagem" icon="enter-outline" onPress={handleImport} loading={importing}
            disabled={!importCode.trim() || importing} />
          <Botao title="Cancelar" variant="text" textColor={c.text2} onPress={fecharImport} />
        </View>
      </FolhaInferior>
    </View>
  );
}

const mk = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48, flexGrow: 1 },
  headerAvatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  titulo: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.7, color: c.text },
  subtitulo: { fontSize: 17, color: c.text2 },
  acoes: { flexDirection: 'row', gap: 10 },

  tripCard: { backgroundColor: c.card, borderRadius: 24 },
  tripHero: { height: 96, paddingHorizontal: 18, paddingVertical: 16, justifyContent: 'flex-end', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tripDatas: { position: 'absolute', top: 14, right: 14, height: 28, paddingHorizontal: 10, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  tripDatasTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  tripNome: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', letterSpacing: -0.2 },
  tripLocal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripLocalTexto: { color: '#E3E8FF', fontSize: 15 },
  tripBase: { paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tripLabel: { fontSize: 13, color: c.text2 },
  tripTotal: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3, color: c.text },
  avatarPilha: { marginLeft: -7, borderWidth: 2, borderColor: c.card },
  avatarExtra: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.field, alignItems: 'center', justifyContent: 'center' },
  avatarExtraTexto: { fontSize: 11, fontWeight: '700', color: c.text2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 40 },
  emptyIcone: { width: 112, height: 112, borderRadius: 56, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitulo: { fontSize: 22, fontWeight: '700', color: c.text },
  emptyTexto: { fontSize: 16, lineHeight: 23, color: c.text2, textAlign: 'center', maxWidth: 290 },
  emptyBotoes: { alignSelf: 'stretch', gap: 10, marginTop: 16 },

  perfil: { alignItems: 'center', gap: 6, marginTop: 6 },
  perfilNome: { fontSize: 22, fontWeight: '700', color: c.text },
  perfilEmail: { fontSize: 15, color: c.text2 },
  linhaEscuro: { alignSelf: 'stretch', height: 60, borderRadius: 16, backgroundColor: c.field,
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  linhaEscuroIcone: { width: 32, height: 32, borderRadius: 9, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  linhaEscuroTexto: { flex: 1, fontSize: 17, fontWeight: '500', color: c.text },

  folhaTitulo: { fontSize: 20, fontWeight: '700', color: c.text },
  folhaTexto: { fontSize: 15, color: c.text2 },
  importInput: { height: 64, borderRadius: 14, borderWidth: 1, borderColor: c.fieldBorder, backgroundColor: c.field,
    paddingHorizontal: 16, fontSize: 26, fontWeight: '700', letterSpacing: 6, textAlign: 'center', color: c.text,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
