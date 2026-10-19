import React, { useMemo, useLayoutEffect } from 'react';
import { Text, StyleSheet, ScrollView, View, Pressable, Share } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/storeViagens';
import { useTheme } from '../store/storeTheme';
import { getAllBalances, getSettlements } from '../utils/acertos';
import Cartao from '../components/ui/Cartao';
import { Avatar, BadgeValor, IconeCategoria, TituloSecao } from '../components/ui';
import { CATEGORIAS, ORDEM_CATEGORIAS, corParticipante } from '../utils/categorias';
import { datasDaViagem } from '../utils/datas';
import { eur } from '../utils/valor';
import { num } from '../utils/theme';

export default function ResumoScreen() {
  const c = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const navigation = useNavigation();
  const { viagemId } = useRoute().params;
  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));

  const dados = useMemo(() => {
    if (!trip) return null;
    const total = trip.expenses.reduce((sum, e) => sum + (e.value || 0), 0);
    const porCat = {};
    trip.expenses.forEach(e => { const k = CATEGORIAS[e.category] ? e.category : 'outros'; porCat[k] = (porCat[k] || 0) + (e.value || 0); });
    const categorias = ORDEM_CATEGORIAS.filter(k => porCat[k] > 0)
      .map(k => ({ key: k, total: porCat[k], pct: total > 0 ? porCat[k] / total : 0 }))
      .sort((a, b) => b.total - a.total);
    return { total, categorias, balances: getAllBalances(trip), settlements: getSettlements(trip) };
  }, [trip]);

  const partilharResumo = () => {
    if (!trip || !dados) return;
    const nome = (id) => trip.participants.find(p => p.id === id)?.name ?? '?';
    const linhas = [
      `Resumo da viagem "${trip.name}"`,
      `Total gasto: ${eur(dados.total)}`,
      '',
      ...dados.balances.map(b => `${b.name}: pagou ${eur(b.paid)}, parte ${eur(b.owes)}`),
    ];
    if (dados.settlements.length) {
      linhas.push('', 'Transferências:', ...dados.settlements.map(x => `• ${nome(x.debtor)} → ${nome(x.creditor)}: ${eur(x.amount)}`));
    }
    Share.share({ message: linhas.join('\n'), title: `Resumo: ${trip.name}` });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={partilharResumo} style={s.headerBtn} accessibilityRole="button" accessibilityLabel="Partilhar resumo">
          <Ionicons name="share-outline" size={22} color={c.accent} />
        </Pressable>
      ),
    });
  }, [navigation, trip, dados, s, c.accent]);

  if (!trip) return <Text style={s.notFound}>Viagem não encontrada</Text>;

  const nPart = trip.participants.length;
  const media = nPart > 0 ? dados.total / nPart : 0;
  const sub = [datasDaViagem(trip.dates, { ano: false }), trip.destination].filter(Boolean).join(' · ');

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={s.content}>
      {/* Totais */}
      <View style={s.totais}>
        <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <Text style={s.heroLabel}>Total gasto</Text>
          <Text style={[s.heroTotal, num]} adjustsFontSizeToFit numberOfLines={1}>{eur(dados.total)}</Text>
          {sub ? <Text style={s.heroLabel} numberOfLines={1}>{sub}</Text> : null}
        </LinearGradient>
        <View style={{ flex: 1, gap: 10 }}>
          <Cartao style={s.mini}>
            <Text style={s.miniLabel}>Média/pessoa</Text>
            <Text style={[s.miniValor, num]} adjustsFontSizeToFit numberOfLines={1}>{eur(media)}</Text>
          </Cartao>
          <Cartao style={s.mini}>
            <Text style={s.miniLabel}>Despesas</Text>
            <Text style={s.miniValor}>{trip.expenses.length}</Text>
          </Cartao>
        </View>
      </View>

      {/* Por categoria */}
      {dados.categorias.length > 0 && (
        <View style={s.secao}>
          <TituloSecao>Gasto por categoria</TituloSecao>
          <Cartao padded style={{ gap: 14 }}>
            <View style={s.barra}>
              {dados.categorias.map(k => (
                <View key={k.key} style={{ flex: k.pct, backgroundColor: CATEGORIAS[k.key].color }} />
              ))}
            </View>
            {dados.categorias.map(k => (
              <View key={k.key} style={s.catLinha}>
                <IconeCategoria cat={k.key} tamanho={36} raio={11} />
                <Text style={s.catNome}>{CATEGORIAS[k.key].label}</Text>
                <Text style={[s.catPct, num]}>{Math.round(k.pct * 100)}%</Text>
                <Text style={[s.catTotal, num]}>{eur(k.total)}</Text>
              </View>
            ))}
          </Cartao>
        </View>
      )}

      {/* Por pessoa */}
      {dados.balances.length > 0 && (
        <View style={s.secao}>
          <TituloSecao>Por pessoa</TituloSecao>
          {dados.balances.map(p => {
            const pos = p.net > 0.005;
            const neg = p.net < -0.005;
            return (
              <Cartao key={p.id} clip>
                <View style={s.pessoaTopo}>
                  <Avatar nome={p.name} cor={corParticipante(trip, p.id)} tamanho={40} />
                  <Text style={s.pessoaNome} numberOfLines={1}>{p.name}</Text>
                  <BadgeValor valor={p.net} texto={pos ? `A receber ${eur(p.net)}` : neg ? `A pagar ${eur(p.net)}` : 'Equilibrado'} />
                </View>
                <View style={s.grelha}>
                  <View style={s.celula}>
                    <Text style={s.celulaLabel}>Pagou</Text>
                    <Text style={[s.celulaValor, num]}>{eur(p.paid)}</Text>
                  </View>
                  <View style={s.celula}>
                    <Text style={s.celulaLabel}>Deve pagar (parte)</Text>
                    <Text style={[s.celulaValor, num]}>{eur(p.owes)}</Text>
                  </View>
                </View>
                <Pressable
                  style={s.relatorio}
                  onPress={() => navigation.navigate('Relatorio', { viagemId: trip.id, personId: p.id, personName: p.name })}
                  accessibilityRole="button" accessibilityLabel={`Ver relatório de ${p.name}`}
                >
                  <Text style={s.relatorioTexto}>Ver relatório</Text>
                  <Ionicons name="arrow-forward" size={16} color={c.accentText} />
                </Pressable>
              </Cartao>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 56, gap: 26 },
  notFound: { padding: 20, textAlign: 'center', color: c.text2 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  secao: { gap: 12 },

  totais: { flexDirection: 'row', gap: 10 },
  hero: { flex: 1.4, borderRadius: 20, padding: 16, gap: 2, justifyContent: 'center' },
  heroLabel: { fontSize: 13, color: c.heroText },
  heroTotal: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, color: '#FFFFFF' },
  mini: { flex: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, justifyContent: 'center' },
  miniLabel: { fontSize: 12, color: c.text2 },
  miniValor: { fontSize: 18, fontWeight: '700', color: c.text },

  barra: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  catLinha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catNome: { flex: 1, fontSize: 16, fontWeight: '500', color: c.text },
  catPct: { fontSize: 13, color: c.text3, width: 40, textAlign: 'right' },
  catTotal: { fontSize: 16, fontWeight: '700', color: c.text, minWidth: 76, textAlign: 'right' },

  pessoaTopo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 16 },
  pessoaNome: { flex: 1, fontSize: 17, fontWeight: '700', color: c.text },
  grelha: { flexDirection: 'row', gap: 1, marginHorizontal: 16, backgroundColor: c.sep, borderRadius: 12, overflow: 'hidden' },
  celula: { flex: 1, backgroundColor: c.field, paddingVertical: 10, paddingHorizontal: 12 },
  celulaLabel: { fontSize: 12, color: c.text2 },
  celulaValor: { fontSize: 16, fontWeight: '600', color: c.text },
  relatorio: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingHorizontal: 16 },
  relatorioTexto: { fontSize: 15, fontWeight: '600', color: c.accentText },
});
