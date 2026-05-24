import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTripStore } from '../store/storeViagens';
import { getSettlements, getPersonalBalance } from '../utils/acertos';

export default function RelatorioScreen() {
  const { viagemId, personId } = useRoute().params;
  const navigation = useNavigation();
  const trip = useTripStore(state => state.trips.find(t => t.id === viagemId));

  if (!trip) return <Text style={styles.notFound}>Viagem não encontrada</Text>;

  const person = trip.participants.find(p => p.id === personId);
  const allIds = trip.participants.map(p => p.id);
  const settlements = getSettlements(trip);
  const bal = getPersonalBalance(trip.expenses, allIds, personId);

  const aReceber = settlements
    .filter(s => s.creditor === personId)
    .map(s => ({
      name: trip.participants.find(p => p.id === s.debtor)?.name ?? '?',
      amount: s.amount,
    }));

  const aPagar = settlements
    .filter(s => s.debtor === personId)
    .map(s => ({
      name: trip.participants.find(p => p.id === s.creditor)?.name ?? '?',
      amount: s.amount,
    }));

  const isEquilibrado = aReceber.length === 0 && aPagar.length === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{person?.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>Relatório de {person?.name}</Text>
        <View style={[styles.netBadge, bal.net >= 0 ? styles.netBadgePos : styles.netBadgeNeg]}>
          <Text style={[styles.netBadgeText, bal.net >= 0 ? styles.netTextPos : styles.netTextNeg]}>
            {bal.net > 0.01 ? `Recebe €${bal.net.toFixed(2)} no total` :
              bal.net < -0.01 ? `Deve €${Math.abs(bal.net).toFixed(2)} no total` :
              'Está equilibrado'}
          </Text>
        </View>
      </View>

      {/* Resumo rápido */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>€{bal.paid.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Pagou</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>€{bal.owes.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Parte a pagar</Text>
        </View>
      </View>

      {isEquilibrado ? (
        <View style={styles.section}>
          <Text style={styles.equilibrado}>Esta pessoa está equilibrada — não deve nada nem tem nada a receber.</Text>
        </View>
      ) : (
        <>
          {/* A receber */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Tens a receber:</Text>
            {aReceber.length === 0 ? (
              <Text style={styles.nada}>(nada)</Text>
            ) : (
              aReceber.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <View style={styles.itemDot} />
                  <Text style={styles.itemText}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text> deve-te </Text>
                    <Text style={styles.itemAmountPos}>€{item.amount.toFixed(2)}</Text>
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* A pagar */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💸 Tens a pagar:</Text>
            {aPagar.length === 0 ? (
              <Text style={styles.nada}>(nada)</Text>
            ) : (
              aPagar.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <View style={styles.itemDot} />
                  <Text style={styles.itemText}>
                    <Text>Deves </Text>
                    <Text style={styles.itemAmountNeg}>€{item.amount.toFixed(2)}</Text>
                    <Text> a </Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <Text style={styles.backBtnText}>← Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 48 },
  notFound: { padding: 20, textAlign: 'center', color: '#555' },

  header: { alignItems: 'center', marginBottom: 20 },
  avatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 28 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  netBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  netBadgePos: { backgroundColor: '#e8f5e9' },
  netBadgeNeg: { backgroundColor: '#ffebee' },
  netBadgeText: { fontSize: 14, fontWeight: '700' },
  netTextPos: { color: '#2e7d32' },
  netTextNeg: { color: '#c62828' },

  statsRow: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginBottom: 2 },
  statLabel: { fontSize: 13, color: '#888' },
  statDivider: { width: 1, backgroundColor: '#e0e0e0', marginVertical: 4 },

  section: { backgroundColor: 'white', borderRadius: 14, padding: 18, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#007AFF', marginTop: 7, marginRight: 10 },
  itemText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22 },
  itemName: { fontWeight: '700', color: '#1a1a1a' },
  itemAmountPos: { fontWeight: '700', color: '#2e7d32' },
  itemAmountNeg: { fontWeight: '700', color: '#c62828' },

  nada: { fontSize: 15, color: '#aaa', fontStyle: 'italic' },
  equilibrado: { fontSize: 15, color: '#555', lineHeight: 22, textAlign: 'center' },

  backBtn: { marginTop: 8, alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10, borderWidth: 1.5, borderColor: '#007AFF' },
  backBtnText: { fontSize: 15, color: '#007AFF', fontWeight: '600' },
});
