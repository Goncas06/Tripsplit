import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTripStore } from '../store/storeViagens';
import { getSettlements, getAllBalances } from '../utils/acertos';
import Cartao from '../components/ui/Cartao';
import Botao from '../components/ui/Botao';

export default function SaldosScreen() {
  const { viagemId } = useRoute().params;
  const navigation = useNavigation();
  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));

  if (!trip) return <Text style={styles.notFound}>Viagem não encontrada</Text>;

  const settlements = getSettlements(trip);
  const balances = getAllBalances(trip);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Acertos Finais</Text>
      <Text style={styles.subtitle}>{trip.name}</Text>

      {/* Balanço individual */}
      {balances.length > 0 && trip.expenses.length > 0 && (
        <Cartao>
          <Text style={styles.sectionTitle}>Saldo por pessoa</Text>
          {balances.map(b => (
            <View key={b.id} style={styles.balanceRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{b.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceName}>{b.name}</Text>
                <Text style={styles.balanceSub}>
                  Pagou €{b.paid.toFixed(2)} · deve €{b.owes.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.netBadge, b.net >= 0 ? styles.netPos : styles.netNeg]}>
                <Text style={[styles.netText, b.net >= 0 ? styles.netTextPos : styles.netTextNeg]}>
                  {b.net > 0.01 ? `+€${b.net.toFixed(2)}` : b.net < -0.01 ? `-€${Math.abs(b.net).toFixed(2)}` : '✓'}
                </Text>
              </View>
            </View>
          ))}
        </Cartao>
      )}

      {/* Transferências necessárias */}
      <Cartao>
        <Text style={styles.sectionTitle}>Transferências a fazer</Text>
        {settlements.length === 0 ? (
          <Text style={styles.empty} accessibilityLiveRegion="polite">
            {trip.expenses.length === 0
              ? 'Ainda não há despesas registadas.'
              : 'Todas as contas estão equilibradas!'}
          </Text>
        ) : (
          settlements.map((item, index) => {
            const debtorName = trip.participants.find(p => p.id === item.debtor)?.name ?? item.debtor;
            const creditorName = trip.participants.find(p => p.id === item.creditor)?.name ?? item.creditor;
            return (
              <View
                key={index}
                style={styles.settlementRow}
                accessibilityLabel={`${debtorName} deve pagar ${item.amount.toFixed(2)} euros a ${creditorName}`}
              >
                <View style={styles.settlementPerson}>
                  <View style={[styles.avatar, styles.avatarDebtor]}>
                    <Text style={styles.avatarText}>{debtorName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.debtorName}>{debtorName}</Text>
                </View>
                <View style={styles.arrowWrapper}>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.amount}>€{item.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.settlementPerson}>
                  <View style={[styles.avatar, styles.avatarCreditor]}>
                    <Text style={styles.avatarText}>{creditorName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.creditorName}>{creditorName}</Text>
                </View>
              </View>
            );
          })
        )}
      </Cartao>

      <Botao title="Voltar" onPress={() => navigation.goBack()} variant="secondary" />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  notFound: { padding: 20, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', color: '#1a1a1a' },
  subtitle: { fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 12 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarDebtor: { backgroundColor: '#c62828' },
  avatarCreditor: { backgroundColor: '#2e7d32' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  balanceInfo: { flex: 1 },
  balanceName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  balanceSub: { fontSize: 12, color: '#888', marginTop: 2 },
  netBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  netPos: { backgroundColor: '#e8f5e9' },
  netNeg: { backgroundColor: '#ffebee' },
  netText: { fontSize: 14, fontWeight: '700' },
  netTextPos: { color: '#2e7d32' },
  netTextNeg: { color: '#c62828' },
  settlementRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  settlementPerson: { alignItems: 'center', flex: 1 },
  debtorName: { fontSize: 13, fontWeight: '600', color: '#c62828', marginTop: 4, textAlign: 'center' },
  creditorName: { fontSize: 13, fontWeight: '600', color: '#2e7d32', marginTop: 4, textAlign: 'center' },
  arrowWrapper: { alignItems: 'center', paddingHorizontal: 8 },
  arrow: { fontSize: 22, color: '#007AFF' },
  amount: { fontSize: 15, fontWeight: 'bold', color: '#007AFF' },
  empty: { textAlign: 'center', fontSize: 15, color: '#555', paddingVertical: 8, lineHeight: 22 },
});
