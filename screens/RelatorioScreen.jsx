import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/storeViagens';
import { getSettlements, getPersonalBalance } from '../utils/acertos';
import { useTheme } from '../store/storeTheme';
import Cartao from '../components/ui/Cartao';
import Botao from '../components/ui/Botao';
import { Avatar, IconeCategoria, Separador } from '../components/ui';
import { categoria, corParticipante } from '../utils/categorias';
import { eur, eurComSinal } from '../utils/valor';
import { num } from '../utils/theme';

export default function RelatorioScreen() {
  const { viagemId, personId } = useRoute().params;
  const navigation = useNavigation();
  const trip = useTripStore(state => state.trips.find(t => t.id === viagemId));
  const removeParticipant = useTripStore(state => state.removeParticipant);
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  if (!trip) return <Text style={s.notFound}>Viagem não encontrada</Text>;

  const person = trip.participants.find(p => p.id === personId);
  const allIds = trip.participants.map(p => p.id);
  const settlements = getSettlements(trip);
  const bal = getPersonalBalance(trip.expenses, allIds, personId);
  const nomeDe = (id) => trip.participants.find(p => p.id === id)?.name ?? '?';

  const expensesInvolved = trip.expenses
    .filter(exp => {
      const shared = exp.sharedWith?.length > 0 ? exp.sharedWith : allIds;
      return shared.includes(personId) || exp.paidBy === personId;
    })
    .map(exp => {
      const shared = exp.sharedWith?.length > 0 ? exp.sharedWith : allIds;
      const share = shared.includes(personId) ? exp.value / shared.length : 0;
      return {
        id: exp.id,
        cat: exp.category,
        titulo: exp.note || categoria(exp.category).label,
        value: exp.value,
        share,
        didPay: exp.paidBy === personId,
      };
    });

  const aReceber = settlements.filter(x => x.creditor === personId).map(x => ({ id: x.debtor, amount: x.amount }));
  const aPagar = settlements.filter(x => x.debtor === personId).map(x => ({ id: x.creditor, amount: x.amount }));

  const pos = bal.net > 0.005;
  const neg = bal.net < -0.005;
  const corSaldo = pos ? c.posText : neg ? c.negText : c.text;
  const pill = pos
    ? { bg: c.posSoft, fg: c.posText, t: `A receber de ${aReceber.length} ${aReceber.length === 1 ? 'pessoa' : 'pessoas'}` }
    : neg
    ? { bg: c.negSoft, fg: c.negText, t: `A pagar a ${aPagar.length} ${aPagar.length === 1 ? 'pessoa' : 'pessoas'}` }
    : { bg: c.field, fg: c.text2, t: 'Contas certas' };

  const handleRemover = () => {
    if (expensesInvolved.length > 0) {
      Alert.alert('Não é possível remover',
        `${person?.name} está associado a despesas registadas. Remove primeiro as despesas em que está incluído.`);
      return;
    }
    Alert.alert('Remover participante', `Tens a certeza que queres remover ${person?.name} da viagem?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => {
        removeParticipant(trip.id, personId);
        navigation.goBack();
      } },
    ]);
  };

  const ListaAcertos = ({ itens, sinal, texto, vazio }) => (
    itens.length === 0 ? (
      <Cartao style={s.vazio}>
        <Ionicons name="checkmark-circle" size={24} color={c.pos} />
        <Text style={s.vazioTexto}>{vazio}</Text>
      </Cartao>
    ) : (
      <Cartao clip>
        {itens.map((it, i) => (
          <React.Fragment key={it.id}>
            <View style={s.acerto}>
              <Avatar nome={nomeDe(it.id)} cor={corParticipante(trip, it.id)} tamanho={36} />
              <Text style={s.acertoTexto} numberOfLines={1}>{texto(nomeDe(it.id))}</Text>
              <Text style={[s.acertoValor, num, { color: sinal > 0 ? c.posText : c.negText }]}>
                {eurComSinal(sinal * it.amount)}
              </Text>
            </View>
            {i < itens.length - 1 && <Separador inset={64} />}
          </React.Fragment>
        ))}
      </Cartao>
    )
  );

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={s.content}>
      {/* Cabeçalho */}
      <View style={s.header}>
        <Avatar nome={person?.name} cor={corParticipante(trip, personId)} tamanho={80} style={{ marginBottom: 6 }} />
        <Text style={s.nome}>{person?.name}</Text>
        <Text style={s.saldoLabel}>Saldo total</Text>
        <Text style={[s.saldo, num, { color: corSaldo }]}>{pos || neg ? eurComSinal(bal.net) : eur(0)}</Text>
        <View style={[s.pill, { backgroundColor: pill.bg }]}>
          <Text style={[s.pillTexto, { color: pill.fg }]}>{pill.t}</Text>
        </View>
      </View>

      {/* Estatísticas */}
      <View style={s.stats}>
        <Cartao style={s.stat}>
          <Text style={s.statLabel}>Pagou</Text>
          <Text style={[s.statValor, num]} adjustsFontSizeToFit numberOfLines={1}>{eur(bal.paid)}</Text>
        </Cartao>
        <Cartao style={s.stat}>
          <Text style={s.statLabel}>Parte</Text>
          <Text style={[s.statValor, num]} adjustsFontSizeToFit numberOfLines={1}>{eur(bal.owes)}</Text>
        </Cartao>
        <Cartao style={s.stat}>
          <Text style={s.statLabel}>Despesas</Text>
          <Text style={s.statValor}>{expensesInvolved.length}</Text>
        </Cartao>
      </View>

      {/* A receber / A pagar */}
      <View style={s.secao}>
        <View style={s.secaoTitulo}>
          <View style={[s.ponto, { backgroundColor: c.pos }]} />
          <Text style={s.titulo} accessibilityRole="header">A receber</Text>
        </View>
        <ListaAcertos itens={aReceber} sinal={1} texto={(n) => <><Text style={{ fontWeight: '600' }}>{n}</Text><Text style={{ color: c.text2 }}> paga-lhe</Text></>} vazio="Nada a receber" />
      </View>

      <View style={s.secao}>
        <View style={s.secaoTitulo}>
          <View style={[s.ponto, { backgroundColor: c.neg }]} />
          <Text style={s.titulo} accessibilityRole="header">A pagar</Text>
        </View>
        <ListaAcertos itens={aPagar} sinal={-1} texto={(n) => <><Text style={{ color: c.text2 }}>Paga a </Text><Text style={{ fontWeight: '600' }}>{n}</Text></>} vazio="Nada a pagar" />
      </View>

      {/* Despesas */}
      {expensesInvolved.length > 0 && (
        <View style={s.secao}>
          <Text style={s.titulo} accessibilityRole="header">Despesas envolvidas</Text>
          <Cartao clip>
            {expensesInvolved.map((exp, i) => (
              <React.Fragment key={exp.id}>
                <View style={s.despesa}>
                  <IconeCategoria cat={exp.cat} tamanho={40} raio={12} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={s.despesaTopo}>
                      <Text style={s.despesaTitulo} numberOfLines={1}>{exp.titulo}</Text>
                      {exp.didPay && (
                        <View style={s.tag}><Text style={s.tagTexto}>PAGOU</Text></View>
                      )}
                    </View>
                    <Text style={[s.despesaSub, num]}>Total {eur(exp.value)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={[s.despesaParte, num]}>{eur(exp.share)}</Text>
                    <Text style={s.despesaSub}>parte</Text>
                  </View>
                </View>
                {i < expensesInvolved.length - 1 && <Separador inset={68} />}
              </React.Fragment>
            ))}
          </Cartao>
        </View>
      )}

      {person && (
        <Botao title="Remover da viagem" icon="person-remove-outline" variant="text" textColor={c.negText}
          onPress={handleRemover} style={{ marginTop: -8 }} />
      )}
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 56, gap: 26 },
  notFound: { padding: 20, textAlign: 'center', color: c.text2 },

  header: { alignItems: 'center', gap: 6 },
  nome: { fontSize: 22, fontWeight: '700', color: c.text },
  saldoLabel: { fontSize: 15, color: c.text2, marginTop: 8 },
  saldo: { fontSize: 44, lineHeight: 48, fontWeight: '700', letterSpacing: -1.1 },
  pill: { height: 28, paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center' },
  pillTexto: { fontSize: 14, fontWeight: '600' },

  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: 16, padding: 12, gap: 2 },
  statLabel: { fontSize: 12, color: c.text2 },
  statValor: { fontSize: 17, fontWeight: '700', color: c.text },

  secao: { gap: 12 },
  secaoTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  titulo: { fontSize: 20, fontWeight: '700', color: c.text },

  acerto: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  acertoTexto: { flex: 1, fontSize: 16, color: c.text },
  acertoValor: { fontSize: 17, fontWeight: '700' },
  vazio: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  vazioTexto: { fontSize: 16, color: c.text2 },

  despesa: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  despesaTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  despesaTitulo: { fontSize: 16, fontWeight: '600', color: c.text, flexShrink: 1 },
  despesaSub: { fontSize: 13, color: c.text2 },
  despesaParte: { fontSize: 16, fontWeight: '700', color: c.text },
  tag: { height: 20, paddingHorizontal: 7, borderRadius: 10, backgroundColor: c.accentSoft, justifyContent: 'center' },
  tagTexto: { fontSize: 11, fontWeight: '700', color: c.accentText },
});
