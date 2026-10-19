import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/storeViagens';
import { getSettlements, getAllBalances } from '../utils/acertos';
import { useTheme } from '../store/storeTheme';
import Cartao from '../components/ui/Cartao';
import { Avatar, TituloSecao, Separador } from '../components/ui';
import { corParticipante } from '../utils/categorias';
import { eur, eurComSinal } from '../utils/valor';
import { num } from '../utils/theme';

export default function SaldosScreen() {
  const { viagemId } = useRoute().params;
  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  if (!trip) return <Text style={s.notFound}>Viagem não encontrada</Text>;

  const settlements = getSettlements(trip);
  const balances = getAllBalances(trip);
  const maxAbs = Math.max(0.01, ...balances.map(b => Math.abs(b.net)));
  const totalTransf = settlements.reduce((sum, x) => sum + x.amount, 0);
  const nomeDe = (id) => trip.participants.find(p => p.id === id)?.name ?? '?';
  const semDespesas = trip.expenses.length === 0;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={s.content}>
      {!semDespesas && balances.length > 0 && (
        <View style={s.secao}>
          <TituloSecao>Saldo por pessoa</TituloSecao>
          <Cartao style={s.saldosCartao}>
            {balances.map((b, i) => {
              const pos = b.net > 0.005;
              const neg = b.net < -0.005;
              const largura = `${(Math.abs(b.net) / maxAbs) * 100}%`;
              return (
                <React.Fragment key={b.id}>
                  <View style={s.saldo}>
                    <View style={s.saldoTopo}>
                      <Avatar nome={b.name} cor={corParticipante(trip, b.id)} tamanho={36} />
                      <Text style={s.saldoNome} numberOfLines={1}>{b.name}</Text>
                      {pos || neg ? (
                        <Text style={[s.saldoValor, num, { color: pos ? c.posText : c.negText }]}>{eurComSinal(b.net)}</Text>
                      ) : (
                        <View style={s.equilibrado}>
                          <Ionicons name="checkmark-circle" size={18} color={c.text2} />
                          <Text style={s.equilibradoTexto}>Equilibrado</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.barra}>
                      <View style={[s.barraMetade, { justifyContent: 'flex-end', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]}>
                        {neg && <View style={{ width: largura, backgroundColor: c.neg, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />}
                      </View>
                      <View style={[s.barraMetade, { borderTopRightRadius: 4, borderBottomRightRadius: 4 }]}>
                        {pos && <View style={{ width: largura, backgroundColor: c.pos, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />}
                      </View>
                    </View>
                  </View>
                  {i < balances.length - 1 && <Separador />}
                </React.Fragment>
              );
            })}
            <View style={s.legenda}>
              <Text style={s.legendaTexto}>← a pagar</Text>
              <Text style={s.legendaTexto}>a receber →</Text>
            </View>
          </Cartao>
        </View>
      )}

      <View style={s.secao}>
        <TituloSecao direita={settlements.length > 0
          ? <Text style={[s.resumoTransf, num]}>{settlements.length} · {eur(totalTransf)}</Text> : null}>
          Transferências a fazer
        </TituloSecao>

        {settlements.length === 0 ? (
          <Cartao style={s.vazio}>
            <Ionicons name={semDespesas ? 'receipt-outline' : 'checkmark-circle'} size={24} color={semDespesas ? c.text3 : c.pos} />
            <Text style={s.vazioTexto}>
              {semDespesas ? 'Ainda não há despesas registadas.' : 'Todas as contas estão equilibradas!'}
            </Text>
          </Cartao>
        ) : (
          settlements.map((item, i) => (
            <Cartao key={i} style={s.transf}>
              <View style={[s.transfLado, { alignItems: 'flex-start' }]}>
                <Avatar nome={nomeDe(item.debtor)} cor={corParticipante(trip, item.debtor)} tamanho={40} />
                <Text style={s.transfNome} numberOfLines={1}>{nomeDe(item.debtor)}</Text>
              </View>
              <View style={s.transfMeio}>
                <Text style={[s.transfValor, num]}>{eur(item.amount)}</Text>
                <View style={s.pagaA}>
                  <Text style={s.pagaATexto}>paga a</Text>
                  <Ionicons name="arrow-forward" size={13} color={c.text3} />
                </View>
              </View>
              <View style={[s.transfLado, { alignItems: 'flex-end' }]}>
                <Avatar nome={nomeDe(item.creditor)} cor={corParticipante(trip, item.creditor)} tamanho={40} />
                <Text style={s.transfNome} numberOfLines={1}>{nomeDe(item.creditor)}</Text>
              </View>
            </Cartao>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48, gap: 26 },
  notFound: { padding: 20, textAlign: 'center', color: c.text2 },
  secao: { gap: 12 },

  saldosCartao: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  saldo: { paddingVertical: 12, gap: 10 },
  saldoTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saldoNome: { flex: 1, fontSize: 17, fontWeight: '600', color: c.text },
  saldoValor: { fontSize: 17, fontWeight: '700' },
  equilibrado: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  equilibradoTexto: { fontSize: 15, fontWeight: '600', color: c.text2 },
  barra: { flexDirection: 'row', height: 8, gap: 2 },
  barraMetade: { flex: 1, flexDirection: 'row', backgroundColor: c.field, overflow: 'hidden' },
  legenda: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6 },
  legendaTexto: { fontSize: 12, color: c.text3 },

  resumoTransf: { fontSize: 13, color: c.text2 },
  transf: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16 },
  transfLado: { flex: 1, gap: 4 },
  transfNome: { fontSize: 14, fontWeight: '600', color: c.text },
  transfMeio: { alignItems: 'center', gap: 4 },
  transfValor: { fontSize: 20, fontWeight: '700', color: c.text },
  pagaA: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pagaATexto: { fontSize: 12, color: c.text3 },

  vazio: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  vazioTexto: { fontSize: 16, color: c.text2, flex: 1 },
});
