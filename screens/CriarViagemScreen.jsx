import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripStore } from '../store/storeViagens';
import { useTheme } from '../store/storeTheme';
import Botao from '../components/ui/Botao';
import { Campo, FolhaInferior } from '../components/ui';
import { MESES, formatDate, formatIntervalo, noites } from '../utils/datas';
import { useConfirmarSaida } from '../utils/useConfirmarSaida';

const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const DIAS_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const mesmoDia = (a, b) => a && b && a.getTime() === b.getTime();
const textoNoites = (n) => `${n} ${n === 1 ? 'noite' : 'noites'}`;

// ── Calendário de intervalo (folha inferior) ─────────────────────────────────
function CalendarioDatas({ visible, inicial, onConfirm, onClose }) {
  const c = useTheme();
  const s = useMemo(() => mkCal(c), [c]);
  const hoje = new Date();
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const ref = inicial.inicio ?? hoje;
  const [mes, setMes] = useState(new Date(ref.getFullYear(), ref.getMonth(), 1));

  const ano = mes.getFullYear();
  const m = mes.getMonth();
  const offset = (new Date(ano, m, 1).getDay() + 6) % 7; // semana começa à segunda
  const total = new Date(ano, m + 1, 0).getDate();
  const celulas = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => new Date(ano, m, i + 1))];

  const tocar = (d) => {
    if (!inicio || fim || d < inicio) { setInicio(d); setFim(null); return; }
    if (mesmoDia(d, inicio)) return;
    setFim(d);
  };

  const resumo = inicio
    ? `${formatIntervalo(inicio, fim, { ano: false })}${fim ? ` · ${textoNoites(noites(inicio, fim))}` : ' · escolhe o fim'}`
    : 'Escolhe o dia de início';

  return (
    <FolhaInferior visible={visible} onClose={onClose}>
      <View style={s.topo}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={s.titulo}>Datas da viagem</Text>
          <Text style={s.resumo}>{resumo}</Text>
        </View>
        <Pressable style={s.navBtn} onPress={() => setMes(new Date(ano, m - 1, 1))} accessibilityLabel="Mês anterior">
          <Ionicons name="chevron-back" size={22} color={c.accent} />
        </Pressable>
        <Pressable style={s.navBtn} onPress={() => setMes(new Date(ano, m + 1, 1))} accessibilityLabel="Mês seguinte">
          <Ionicons name="chevron-forward" size={22} color={c.accent} />
        </Pressable>
      </View>

      <Text style={s.mes}>{MESES[m]} {ano}</Text>

      <View style={s.grelha}>
        {DIAS_SEMANA.map((d, i) => (
          <View key={`w${i}`} style={s.celulaSemana}><Text style={s.semana}>{d}</Text></View>
        ))}
        {celulas.map((d, i) => {
          if (!d) return <View key={`v${i}`} style={s.celula} />;
          const eInicio = mesmoDia(d, inicio);
          const eFim = mesmoDia(d, fim);
          const noIntervalo = inicio && fim && d > inicio && d < fim;
          const eHoje = mesmoDia(d, new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
          return (
            <Pressable key={i} style={({ pressed }) => [s.celula, pressed && { opacity: 0.6 }]} onPress={() => tocar(d)}
              accessibilityRole="button" accessibilityLabel={formatDate(d)} accessibilityState={{ selected: eInicio || eFim }}>
              {noIntervalo && <View style={s.faixa} />}
              {eInicio && fim && <View style={[s.faixa, { left: '50%' }]} />}
              {eFim && <View style={[s.faixa, { right: '50%' }]} />}
              {eInicio || eFim ? (
                <View style={s.circulo}><Text style={s.diaSel}>{d.getDate()}</Text></View>
              ) : (
                <Text style={[s.dia, noIntervalo && s.diaIntervalo, eHoje && !noIntervalo && { color: c.accentText, fontWeight: '700' }]}>
                  {d.getDate()}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 4 }}>
        <Botao title="Confirmar datas" disabled={!inicio} onPress={() => onConfirm(inicio, fim)} />
        {(inicio || fim) && (
          <Botao title="Limpar datas" variant="text" textColor={c.text2} onPress={() => { setInicio(null); setFim(null); }} />
        )}
      </View>
    </FolhaInferior>
  );
}

// ── Ecrã ─────────────────────────────────────────────────────────────────────
export default function CriarViagemScreen() {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showCal, setShowCal] = useState(false);

  const navigation = useNavigation();
  const addTrip = useTripStore((state) => state.addTrip);
  const destRef = useRef(null);
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const permitirSaida = useConfirmarSaida(!!(name.trim() || destination.trim() || startDate));

  const datesString = () => {
    if (!startDate) return '';
    if (!endDate) return formatDate(startDate);
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const handleCreate = () => {
    if (!name.trim()) { Alert.alert('Erro', 'Insere o nome da viagem.'); return; }
    if (!destination.trim()) { Alert.alert('Erro', 'Insere o destino da viagem.'); return; }
    permitirSaida();
    navigation.goBack();
    addTrip({
      id: uuidv4(),
      name: name.trim(),
      destination: destination.trim(),
      dates: datesString(),
      participants: [],
      expenses: [],
    });
  };

  const TileData = ({ icon, label, valor }) => (
    <Pressable style={({ pressed }) => [s.dataTile, pressed && { opacity: 0.7 }]} onPress={() => setShowCal(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${valor ? formatDate(valor) : 'por escolher'}`}>
      <Ionicons name={icon} size={20} color={c.text3} />
      <View style={{ gap: 2 }}>
        <Text style={s.dataLabel}>{label}</Text>
        <Text style={[s.dataValor, !valor && { color: c.text3, fontWeight: '400' }]}>{valor ? formatDate(valor) : 'Selecionar'}</Text>
      </View>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Campo
          label="Nome da viagem" icon="pricetag-outline" placeholder="Ex: Algarve 2026"
          value={name} onChangeText={setName} autoFocus returnKeyType="next" maxLength={60}
          onSubmitEditing={() => destRef.current?.focus()} accessibilityLabel="Nome da viagem"
        />
        <Campo
          label="Destino" icon="location-outline" placeholder="Ex: Lisboa, Algarve, Madrid..."
          inputRef={destRef} value={destination} onChangeText={setDestination}
          returnKeyType="done" maxLength={100} accessibilityLabel="Destino da viagem"
        />
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Datas <Text style={{ fontWeight: '400', color: c.text3 }}>· opcional</Text></Text>
          <View style={s.datasRow}>
            <TileData icon="calendar-outline" label="Início" valor={startDate} />
            <TileData icon="flag-outline" label="Fim" valor={endDate} />
          </View>
          {startDate && endDate ? <Text style={s.noites}>{textoNoites(noites(startDate, endDate))}</Text> : null}
        </View>
      </ScrollView>

      <View style={[s.rodape, { paddingBottom: insets.bottom + 12 }]}>
        <Botao title="Criar viagem" onPress={handleCreate} disabled={!name.trim() || !destination.trim()} />
      </View>

      {showCal && (
        <CalendarioDatas
          visible
          inicial={{ inicio: startDate, fim: endDate }}
          onClose={() => setShowCal(false)}
          onConfirm={(i, f) => { setStartDate(i); setEndDate(f); setShowCal(false); }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { padding: 20, gap: 18 },
  label: { fontSize: 13, fontWeight: '600', color: c.text2 },
  datasRow: { flexDirection: 'row', gap: 10 },
  dataTile: { flex: 1, height: 64, borderRadius: 14, backgroundColor: c.field, borderWidth: 1, borderColor: c.fieldBorder,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dataLabel: { fontSize: 12, color: c.text2 },
  dataValor: { fontSize: 16, fontWeight: '600', color: c.text },
  noites: { fontSize: 13, color: c.text3 },
  rodape: { paddingHorizontal: 20, paddingTop: 8, backgroundColor: c.bg },
});

const mkCal = (c) => StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center' },
  titulo: { fontSize: 20, fontWeight: '700', color: c.text },
  resumo: { fontSize: 15, color: c.text2 },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mes: { fontSize: 17, fontWeight: '600', color: c.text, textTransform: 'capitalize' },
  grelha: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  celulaSemana: { width: `${100 / 7}%`, height: 24, alignItems: 'center', justifyContent: 'center' },
  semana: { fontSize: 12, fontWeight: '600', color: c.text3 },
  celula: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  faixa: { position: 'absolute', top: 2, bottom: 2, left: 0, right: 0, backgroundColor: c.accentSoft },
  circulo: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  dia: { fontSize: 17, color: c.text },
  diaIntervalo: { fontWeight: '600', color: c.accentText },
  diaSel: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
