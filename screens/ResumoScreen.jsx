import React from 'react';
import { Text, StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTripStore } from '../store/storeViagens';
import { getAllBalances, getSettlements } from '../utils/acertos';
import Cartao from '../components/ui/Cartao';

const categoryLabels = {
  gasolina: '⛽ Gasolina', portagens: '🛣️ Portagens',
  hotel: '🏨 Hotel', refeicoes: '🍽️ Refeições', outros: '📦 Outros',
};

function PersonReport({ person, trip, settlements }) {
  const navigation = useNavigation();
  const allIds = trip.participants.map(p => p.id);

  const expensesShared = trip.expenses.filter(e => {
    const sw = e.sharedWith?.length > 0 ? e.sharedWith : allIds;
    return sw.includes(person.id);
  });

  const deveReceber = settlements
    .filter(s => s.creditor === person.id)
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <View style={styles.personBlock}>
      <View style={styles.personHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{person.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.personName}>{person.name}</Text>
        <View style={[styles.netBadge, person.net >= 0 ? styles.netBadgePos : styles.netBadgeNeg]}>
          <Text style={[styles.netBadgeText, person.net >= 0 ? styles.netTextPos : styles.netTextNeg]}>
            {person.net > 0.01 ? `recebe €${person.net.toFixed(2)}` :
              person.net < -0.01 ? `deve €${Math.abs(person.net).toFixed(2)}` : 'equilibrado'}
          </Text>
        </View>
      </View>

      <View style={styles.personSummaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pagou</Text>
          <Text style={styles.summaryValue}>€{person.paid.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Deve pagar</Text>
          <Text style={styles.summaryValue}>€{person.owes.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Despesas</Text>
          <Text style={styles.summaryValue}>{expensesShared.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>A receber</Text>
          <Text style={[styles.summaryValue, deveReceber > 0.01 ? styles.receberValue : null]}>
            {deveReceber > 0.01 ? `€${deveReceber.toFixed(2)}` : '—'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.reportBtn}
        onPress={() => navigation.navigate('Relatorio', {
          viagemId: trip.id,
          personId: person.id,
          personName: person.name,
        })}
        activeOpacity={0.75}
      >
        <Text style={styles.reportBtnText}>Ver relatório →</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ResumoScreen() {
  const { viagemId } = useRoute().params;
  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));

  if (!trip) return <Text style={styles.notFound}>Viagem não encontrada</Text>;

  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.value, 0);
  const categories = trip.expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.value;
    return acc;
  }, {});
  const balances = getAllBalances(trip);
  const settlements = getSettlements(trip);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">{trip.name}</Text>
      <Text style={styles.subtitle}>
        {trip.destination}{trip.dates ? ` · ${trip.dates}` : ''}
      </Text>

      <Cartao>
        <Text style={styles.sectionTitle}>Totais</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total gasto</Text>
          <Text style={styles.statValue}>€{totalExpenses.toFixed(2)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Participantes</Text>
          <Text style={styles.statValue}>{trip.participants.length}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Despesas registadas</Text>
          <Text style={styles.statValue}>{trip.expenses.length}</Text>
        </View>
      </Cartao>

      {balances.length > 0 && trip.expenses.length > 0 && (
        <Cartao>
          <Text style={styles.sectionTitle}>Relatório por pessoa</Text>
          <Text style={styles.sectionHint}>Toca em "Ver relatório" para ver o detalhe de cada pessoa</Text>
          {balances.map(b => (
            <PersonReport key={b.id} person={b} trip={trip} settlements={settlements} />
          ))}
        </Cartao>
      )}

      {Object.keys(categories).length > 0 && (
        <Cartao>
          <Text style={styles.sectionTitle}>Por categoria</Text>
          {Object.entries(categories)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, val]) => (
              <View key={cat} style={styles.catRow}>
                <Text style={styles.catLabel}>{categoryLabels[cat] ?? cat}</Text>
                <View style={styles.catRight}>
                  <Text style={styles.catValue}>€{val.toFixed(2)}</Text>
                  {totalExpenses > 0 && (
                    <Text style={styles.catPercent}>{Math.round(val / totalExpenses * 100)}%</Text>
                  )}
                </View>
              </View>
            ))}
        </Cartao>
      )}

      {trip.expenses.length === 0 && (
        <Cartao>
          <Text style={styles.empty}>Ainda não há despesas registadas nesta viagem.</Text>
        </Cartao>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  notFound: { padding: 20, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#aaa', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statLabel: { fontSize: 16, color: '#555' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },

  personBlock: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 14 },
  personHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  personName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  netBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  netBadgePos: { backgroundColor: '#e8f5e9' },
  netBadgeNeg: { backgroundColor: '#ffebee' },
  netBadgeText: { fontSize: 12, fontWeight: '700' },
  netTextPos: { color: '#2e7d32' },
  netTextNeg: { color: '#c62828' },

  personSummaryRow: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginBottom: 10 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: '#888', marginBottom: 2, textAlign: 'center' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#333' },
  receberValue: { color: '#2e7d32' },
  summaryDivider: { width: 1, backgroundColor: '#e0e0e0', marginVertical: 2 },

  reportBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: '#007AFF' },
  reportBtnText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },

  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  catLabel: { fontSize: 16, color: '#444' },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  catPercent: { fontSize: 13, color: '#888', width: 36, textAlign: 'right' },
  empty: { textAlign: 'center', color: '#666', fontSize: 15, lineHeight: 22 },
});
