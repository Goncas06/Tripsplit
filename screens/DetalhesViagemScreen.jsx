import React, { useState, useMemo, useCallback, useLayoutEffect, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, Share, Alert, Image, Pressable, Modal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripStore } from '../store/storeViagens';
import { useAuthStore } from '../store/storeAuth';
import { useAmigosStore, separarLigacoes } from '../store/storeAmigos';
import { useTheme } from '../store/storeTheme';
import Botao from '../components/ui/Botao';
import Cartao from '../components/ui/Cartao';
import { Avatar, BadgeValor, IconeCategoria, TituloSecao, Separador, LinhaAcao, FolhaInferior } from '../components/ui';
import { getPersonalBalance, getSettlements } from '../utils/acertos';
import { categoria, corParticipante } from '../utils/categorias';
import { datasDaViagem, formatIntervalo } from '../utils/datas';
import { eur } from '../utils/valor';
import { num } from '../utils/theme';

function ReceiptModal({ uri, onClose }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={receiptModalStyles.overlay} onPress={onClose}>
        <Image source={{ uri }} style={receiptModalStyles.image} resizeMode="contain" />
        <Text style={receiptModalStyles.closeHint}>Toca para fechar</Text>
      </Pressable>
    </Modal>
  );
}

const receiptModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  image: { width: '92%', height: '75%' },
  closeHint: { color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 13 },
});

// Linha de despesa com ações Editar/Apagar ao deslizar para a esquerda
function LinhaDespesa({ exp, trip, allIds, onEdit, onDelete, onReceipt, c, s }) {
  const ref = useRef(null);
  const payer = trip.participants.find(p => p.id === exp.paidBy);
  const sharedWith = exp.sharedWith?.length > 0 ? exp.sharedWith : allIds;
  const n = sharedWith.length;
  const perPerson = n > 0 ? exp.value / n : exp.value;

  const acao = (fn) => () => { ref.current?.close(); fn(); };
  const renderAcoes = () => (
    <View style={{ flexDirection: 'row' }}>
      <Pressable style={[s.swipeBtn, { backgroundColor: c.accent }]} onPress={acao(onEdit)} accessibilityRole="button" accessibilityLabel="Editar despesa">
        <Ionicons name="create-outline" size={22} color="#FFFFFF" />
        <Text style={s.swipeTexto}>Editar</Text>
      </Pressable>
      <Pressable style={[s.swipeBtn, { backgroundColor: c.neg }]} onPress={acao(onDelete)} accessibilityRole="button" accessibilityLabel="Apagar despesa">
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <Text style={s.swipeTexto}>Apagar</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable ref={ref} renderRightActions={renderAcoes} overshootRight={false} friction={1.6}>
      <Pressable onPress={onEdit} style={({ pressed }) => [s.despesa, pressed && { backgroundColor: c.field }]}
        accessibilityRole="button" accessibilityHint="Desliza para a esquerda para editar ou apagar">
        <IconeCategoria cat={exp.category} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={s.despesaTitulo} numberOfLines={1}>{exp.note || categoria(exp.category).label}</Text>
          <Text style={s.despesaSub}>
            Pago por {payer?.name ?? '?'} · dividido por {n} {n === 1 ? 'pessoa' : 'pessoas'}
          </Text>
          {exp.receiptUrl ? (
            <Pressable onPress={() => onReceipt(exp.receiptUrl)} style={s.recibo} hitSlop={6} accessibilityRole="button">
              <Image source={{ uri: exp.receiptUrl }} style={s.reciboThumb} resizeMode="cover" />
              <Text style={s.reciboTexto}>Ver recibo</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={[s.despesaValor, num]}>{eur(exp.value)}</Text>
          <Text style={[s.despesaPessoa, num]}>{eur(perPerson)}/pessoa</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

export default function DetalhesViagemScreen() {
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const [receiptModalUri, setReceiptModalUri] = useState(null);
  const { viagemId } = useRoute().params;
  const navigation = useNavigation();
  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));
  const removeParticipant = useTripStore((state) => state.removeParticipant);
  const removeExpense = useTripStore((state) => state.removeExpense);
  const deleteTrip = useTripStore((state) => state.deleteTrip);
  const sairDaViagem = useTripStore((state) => state.sairDaViagem);
  const convidarAmigo = useTripStore((state) => state.convidarAmigo);
  const ligacoes = useAmigosStore((state) => state.ligacoes);
  const [convidarVisivel, setConvidarVisivel] = useState(false);
  const uid = useAuthStore((state) => state.user?.id);
  const partilharViagem = useTripStore((state) => state.partilharViagem);
  const pararPartilha = useTripStore((state) => state.pararPartilha);
  const [aPartilhar, setAPartilhar] = useState(false);

  const allIds = useMemo(() => trip?.participants.map(p => p.id) ?? [], [trip?.participants]);
  const totalExpenses = useMemo(() => trip?.expenses.reduce((sum, e) => sum + (e.value || 0), 0) ?? 0, [trip?.expenses]);
  const settlements = useMemo(() => trip ? getSettlements(trip) : [], [trip]);
  const handleNav = useCallback((screen) => navigation.navigate(screen, { viagemId: trip?.id }), [navigation, trip?.id]);

  const handleShare = async () => {
    if (aPartilhar) return;
    setAPartilhar(true);
    let code, expiraEm;
    try {
      ({ code, expiraEm } = await partilharViagem(trip.id));
    } catch (e) {
      Alert.alert('Não foi possível partilhar', e?.code === 'permission-denied'
        ? 'O servidor recusou criar o código de partilha. As regras do Firestore têm de permitir a coleção "sharedTrips".'
        : 'Precisas de ligação à internet para gerar o código da viagem.');
      return;
    } finally {
      setAPartilhar(false);
    }
    await Share.share({
      message: `Junta-te à minha viagem "${trip.name}" no TripSplit!\n\nAbre o TripSplit, toca em "Usar código" e escreve: ${code}\n\n(válido até ${formatIntervalo(new Date(expiraEm))})`,
      title: `Viagem: ${trip.name}`,
    });
  };

  // O título serve de texto do botão "voltar" dos ecrãs seguintes (o título visível está no conteúdo)
  useLayoutEffect(() => {
    if (!trip) return;
    navigation.setOptions({
      title: trip.name,
      headerRight: () => (
        <Pressable onPress={handleShare} style={s.headerBtn} accessibilityRole="button" accessibilityLabel="Partilhar viagem">
          <Ionicons name="share-outline" size={22} color={c.accent} />
        </Pressable>
      ),
    });
  }, [navigation, trip, s, c.accent, aPartilhar]);

  if (!trip) return <Text style={s.notFound}>Viagem não encontrada</Text>;

  const handleRemoveParticipant = (participant) => {
    const hasPaid = trip.expenses.some(e => e.paidBy === participant.id);
    const isShared = trip.expenses.some(e =>
      (e.sharedWith?.length > 0 ? e.sharedWith : allIds).includes(participant.id)
    );

    if (hasPaid || isShared) {
      Alert.alert(
        'Não é possível remover',
        `${participant.name} está associado a despesas registadas. Remove primeiro as despesas em que está incluído.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert('Remover participante', `Tens a certeza que queres remover ${participant.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: () => removeParticipant(trip.id, participant.id),
      },
    ]);
  };

  const handleRemoveExpense = (id) => {
    Alert.alert('Eliminar despesa', 'Tens a certeza que queres eliminar esta despesa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeExpense(trip.id, id) },
    ]);
  };

  const souDono = !trip.ownerId || trip.ownerId === uid;
  const nMembros = trip.members?.length ?? 1;

  const handleSair = () => {
    Alert.alert('Sair da viagem', 'Deixas de ver esta viagem. Os dados ficam para os outros membros. Para voltar, precisas de um código novo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => { sairDaViagem(trip.id); navigation.goBack(); } },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Eliminar viagem', nMembros > 1
      ? `A viagem é apagada para todos os ${nMembros} membros. Esta ação é irreversível.`
      : 'Esta ação é irreversível. Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteTrip(trip.id); navigation.goBack(); } },
    ]);
  };

  const nomeDe = (id) => trip.participants.find(p => p.id === id)?.name ?? '?';
  const amigos = separarLigacoes(ligacoes, uid).amigos;
  const datas = datasDaViagem(trip.dates);
  const partilhaAtiva = !!trip.shareCode && (trip.shareExpiresAt ?? 0) > Date.now();
  const validade = trip.shareExpiresAt ? formatIntervalo(new Date(trip.shareExpiresAt)) : '';

  const handlePararPartilha = () => {
    Alert.alert('Deixar de partilhar', `O código ${trip.shareCode} deixa de funcionar e ninguém mais consegue importar esta viagem com ele.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Deixar de partilhar', style: 'destructive', onPress: () => pararPartilha(trip.id) },
    ]);
  };
  const nPart = trip.participants.length;
  const media = nPart > 0 ? totalExpenses / nPart : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 120 }]}>
        {/* Cabeçalho + total */}
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text style={s.titulo} accessibilityRole="header">{trip.name}</Text>
            <View style={s.meta}>
              {trip.destination ? (
                <View style={s.metaItem}>
                  <Ionicons name="location-outline" size={16} color={c.text2} />
                  <Text style={s.metaTexto}>{trip.destination}</Text>
                </View>
              ) : null}
              {datas ? (
                <View style={s.metaItem}>
                  <Ionicons name="calendar-outline" size={15} color={c.text2} />
                  <Text style={s.metaTexto}>{datas}</Text>
                </View>
              ) : null}
              {nMembros > 1 ? (
                <View style={s.metaItem} accessibilityLabel={`Partilhada com ${nMembros} pessoas`}>
                  <Ionicons name="people-outline" size={16} color={c.text2} />
                  <Text style={s.metaTexto}>{nMembros} membros</Text>
                </View>
              ) : null}
              {trip.shareCode ? (
                <View style={s.metaItem} accessibilityLabel={partilhaAtiva
                  ? `Código da viagem ${trip.shareCode.split('').join(' ')}, válido até ${validade}`
                  : 'Código de partilha expirado'}>
                  <Ionicons name="key-outline" size={15} color={c.text2} />
                  {partilhaAtiva ? (
                    <Text style={s.metaTexto}>
                      <Text style={s.codigo} selectable>{trip.shareCode}</Text> · até {validade}
                    </Text>
                  ) : (
                    <Text style={s.metaTexto}>código expirado</Text>
                  )}
                </View>
              ) : null}
            </View>
          </View>

          <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, c.btnShadow]}>
            <View style={{ gap: 2 }}>
              <Text style={s.heroLabel}>Total gasto</Text>
              <Text style={[s.heroTotal, num]} adjustsFontSizeToFit numberOfLines={1}>{eur(totalExpenses)}</Text>
            </View>
            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatValor}>{nPart}</Text>
                <Text style={s.heroStatLabel}>participantes</Text>
              </View>
              <View style={[s.heroStat, s.heroStatMeio]}>
                <Text style={s.heroStatValor}>{trip.expenses.length}</Text>
                <Text style={s.heroStatLabel}>despesas</Text>
              </View>
              <View style={s.heroStat}>
                <Text style={[s.heroStatValor, num]} adjustsFontSizeToFit numberOfLines={1}>{eur(media)}</Text>
                <Text style={s.heroStatLabel}>média/pessoa</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Acertos pendentes */}
        {settlements.length > 0 && (
          <View style={s.secao}>
            <View style={s.tituloComContador}>
              <TituloSecao>Acertos pendentes</TituloSecao>
              <View style={s.contador}><Text style={s.contadorTexto}>{settlements.length}</Text></View>
            </View>
            <Cartao clip>
              {settlements.map((st, i) => (
                <React.Fragment key={i}>
                  <View style={s.acerto}>
                    <View style={s.acertoLado}>
                      <Avatar nome={nomeDe(st.debtor)} cor={corParticipante(trip, st.debtor)} tamanho={36} />
                      <Text style={s.acertoNome} numberOfLines={1}>{nomeDe(st.debtor)}</Text>
                    </View>
                    <View style={s.acertoValor}>
                      <Text style={[s.acertoValorTexto, num]}>{eur(st.amount)}</Text>
                      <Ionicons name="arrow-forward" size={15} color={c.accentText} />
                    </View>
                    <View style={[s.acertoLado, { justifyContent: 'flex-end' }]}>
                      <Text style={s.acertoNome} numberOfLines={1}>{nomeDe(st.creditor)}</Text>
                      <Avatar nome={nomeDe(st.creditor)} cor={corParticipante(trip, st.creditor)} tamanho={36} />
                    </View>
                  </View>
                  <Separador />
                </React.Fragment>
              ))}
              <Pressable onPress={() => handleNav('Saldos')} style={s.verMais} accessibilityRole="button">
                <Text style={s.verMaisTexto}>Ver acertos detalhados</Text>
                <Ionicons name="chevron-forward" size={17} color={c.accentText} />
              </Pressable>
            </Cartao>
          </View>
        )}

        {/* Participantes */}
        <View style={s.secao}>
          <TituloSecao>Participantes</TituloSecao>
          <Cartao clip>
            {trip.participants.map((p) => {
              const bal = getPersonalBalance(trip.expenses, allIds, p.id);
              const label = bal.net > 0.005 ? 'A receber' : bal.net < -0.005 ? 'A pagar' : 'Equilibrado';
              return (
                <React.Fragment key={p.id}>
                  <Pressable
                    style={({ pressed }) => [s.pessoa, pressed && { backgroundColor: c.field }]}
                    onPress={() => navigation.navigate('Relatorio', { viagemId: trip.id, personId: p.id, personName: p.name })}
                    onLongPress={() => handleRemoveParticipant(p)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver relatório de ${p.name}`}
                    accessibilityHint="Mantém premido para remover"
                  >
                    <Avatar nome={p.name} cor={corParticipante(trip, p.id)} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.pessoaNome}>{p.name}</Text>
                      <Text style={[s.pessoaSub, num]}>Pagou {eur(bal.paid)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Text style={s.pessoaLabel}>{label}</Text>
                      <BadgeValor valor={bal.net} tamanho={15} />
                    </View>
                  </Pressable>
                  <Separador inset={72} />
                </React.Fragment>
              );
            })}
            <Pressable onPress={() => handleNav('AdicionarParticipante')} style={s.adicionarLinha} accessibilityRole="button">
              <View style={{ width: 44, alignItems: 'center' }}>
                <Ionicons name="person-add-outline" size={21} color={c.accentText} />
              </View>
              <Text style={s.verMaisTexto}>Adicionar participante</Text>
            </Pressable>
          </Cartao>
          {nPart > 0 && <Text style={s.dica}>Toca num participante para ver o relatório ou removê-lo.</Text>}
        </View>

        {/* Despesas */}
        <View style={s.secao}>
          <TituloSecao direita={trip.expenses.length > 0 ? <Text style={s.dica}>deslizar ← para editar</Text> : null}>
            Despesas
          </TituloSecao>
          <Cartao clip>
            {trip.expenses.length === 0 ? (
              <Text style={s.vazio}>Ainda não há despesas registadas.</Text>
            ) : (
              trip.expenses.map((exp, i) => (
                <React.Fragment key={exp.id}>
                  <LinhaDespesa
                    exp={exp} trip={trip} allIds={allIds} c={c} s={s}
                    onEdit={() => navigation.navigate('AdicionarDespesa', { viagemId: trip.id, expenseId: exp.id })}
                    onDelete={() => handleRemoveExpense(exp.id)}
                    onReceipt={setReceiptModalUri}
                  />
                  {i < trip.expenses.length - 1 && <Separador />}
                </React.Fragment>
              ))
            )}
          </Cartao>
        </View>

        {/* Ações */}
        <Cartao clip>
          <LinhaAcao icon="person-add-outline" titulo="Convidar amigos" onPress={() => setConvidarVisivel(true)} />
          <LinhaAcao icon="swap-horizontal" titulo="Ver acertos detalhados" onPress={() => handleNav('Saldos')} />
          <LinhaAcao icon="pie-chart-outline" titulo="Resumo final" onPress={() => handleNav('Resumo')} />
          <LinhaAcao icon="share-social-outline" titulo={partilhaAtiva ? 'Partilhar de novo (renova o código)' : 'Partilhar viagem'}
            onPress={handleShare} ultima={!trip.shareCode} />
          {trip.shareCode ? (
            <LinhaAcao icon="close-circle-outline" titulo="Deixar de partilhar" onPress={handlePararPartilha} ultima />
          ) : null}
        </Cartao>
        {souDono ? (
          <Botao title="Eliminar viagem" icon="trash-outline" variant="text" textColor={c.negText}
            onPress={handleDelete} style={{ marginTop: -12 }} />
        ) : (
          <Botao title="Sair da viagem" icon="exit-outline" variant="text" textColor={c.negText}
            onPress={handleSair} style={{ marginTop: -12 }} />
        )}
      </ScrollView>

      {/* Botão fixo */}
      <LinearGradient colors={[c.bgClear, c.bg, c.bg]} locations={[0, 0.4, 1]} style={[s.rodape, { paddingBottom: insets.bottom + 12 }]}
        pointerEvents="box-none">
        <Botao title="Adicionar despesa" icon="add" height={56} radius={18} onPress={() => handleNav('AdicionarDespesa')} />
      </LinearGradient>

      <ReceiptModal uri={receiptModalUri} onClose={() => setReceiptModalUri(null)} />

      {/* Convidar amigos: entram como membros e como participantes */}
      <FolhaInferior visible={convidarVisivel} onClose={() => setConvidarVisivel(false)}>
        <View style={{ gap: 4 }}>
          <Text style={s.folhaTitulo}>Convidar amigos</Text>
          <Text style={s.folhaTexto}>Quem convidares passa a ver e a editar esta viagem, e entra como participante.</Text>
        </View>
        {amigos.length === 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={s.folhaTexto}>Ainda não tens amigos na app.</Text>
            <Botao title="Adicionar amigos" icon="people-outline" variant="secondary"
              onPress={() => { setConvidarVisivel(false); navigation.navigate('Amigos'); }} />
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 360 }}>
            {amigos.map((a, i) => {
              const jaEsta = trip.members?.includes(a.uid);
              return (
                <React.Fragment key={a.id}>
                  <View style={s.convite}>
                    <Avatar nome={a.name} cor={corParticipante(trip, trip.participants.find(p => p.userId === a.uid)?.id)} tamanho={40} />
                    <Text style={s.conviteNome} numberOfLines={1}>{a.name}</Text>
                    {jaEsta ? (
                      <View style={s.conviteEsta}>
                        <Ionicons name="checkmark" size={16} color={c.text2} />
                        <Text style={s.conviteEstaTexto}>Na viagem</Text>
                      </View>
                    ) : (
                      <Botao title="Convidar" height={36} radius={18} style={{ minWidth: 110 }}
                        onPress={() => convidarAmigo(trip.id, a)} accessibilityLabel={`Convidar ${a.name}`} />
                    )}
                  </View>
                  {i < amigos.length - 1 && <Separador inset={52} />}
                </React.Fragment>
              );
            })}
          </ScrollView>
        )}
      </FolhaInferior>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 28 },
  notFound: { flex: 1, textAlign: 'center', marginTop: 40, color: c.text2 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  titulo: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.7, color: c.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTexto: { fontSize: 15, color: c.text2 },
  codigo: { fontWeight: '700', letterSpacing: 1.5, color: c.accentText },

  hero: { borderRadius: 24, padding: 20, gap: 18 },
  heroLabel: { fontSize: 15, fontWeight: '500', color: c.heroText },
  heroTotal: { fontSize: 44, lineHeight: 48, fontWeight: '700', letterSpacing: -1.1, color: '#FFFFFF' },
  heroStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  heroStatMeio: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroStatValor: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 12, color: c.heroText },

  secao: { gap: 12 },
  tituloComContador: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contador: { height: 22, minWidth: 22, paddingHorizontal: 7, borderRadius: 11,
    backgroundColor: c.negSoft, alignItems: 'center', justifyContent: 'center' },
  contadorTexto: { fontSize: 13, fontWeight: '700', color: c.negText },
  acerto: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16 },
  acertoLado: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  acertoNome: { fontSize: 15, fontWeight: '600', color: c.text, flexShrink: 1 },
  acertoValor: { height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: c.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 4 },
  acertoValorTexto: { fontSize: 15, fontWeight: '700', color: c.accentText },
  verMais: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  verMaisTexto: { fontSize: 16, fontWeight: '600', color: c.accentText },

  pessoa: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 68 },
  pessoaNome: { fontSize: 17, fontWeight: '600', color: c.text },
  pessoaSub: { fontSize: 13, color: c.text2 },
  pessoaLabel: { fontSize: 12, color: c.text2 },
  adicionarLinha: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  dica: { fontSize: 13, color: c.text3 },

  despesa: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.card },
  despesaTitulo: { fontSize: 16, fontWeight: '600', color: c.text },
  despesaSub: { fontSize: 13, lineHeight: 17, color: c.text2 },
  despesaValor: { fontSize: 17, fontWeight: '700', color: c.text },
  despesaPessoa: { fontSize: 12, color: c.text2 },
  recibo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, alignSelf: 'flex-start' },
  reciboThumb: { width: 30, height: 38, borderRadius: 6, borderWidth: 1, borderColor: c.fieldBorder, backgroundColor: c.field },
  reciboTexto: { fontSize: 13, fontWeight: '600', color: c.accentText },
  swipeBtn: { width: 76, alignItems: 'center', justifyContent: 'center', gap: 4 },
  swipeTexto: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  vazio: { fontSize: 15, color: c.text2, textAlign: 'center', paddingVertical: 24 },

  folhaTitulo: { fontSize: 20, fontWeight: '700', color: c.text },
  folhaTexto: { fontSize: 15, color: c.text2 },
  convite: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  conviteNome: { flex: 1, fontSize: 17, fontWeight: '600', color: c.text },
  conviteEsta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  conviteEstaTexto: { fontSize: 14, fontWeight: '600', color: c.text2 },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 24 },
});
