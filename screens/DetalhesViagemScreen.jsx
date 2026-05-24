import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Share, Alert, Image, TouchableOpacity, Modal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTripStore } from '../store/storeViagens';
import Botao from '../components/ui/Botao';
import Cartao from '../components/ui/Cartao';
import { getPersonalBalance, getSettlements } from '../utils/acertos';
import { encodeTrip } from '../utils/share';

const categoryLabels = {
  gasolina: '⛽ Gasolina', portagens: '🛣️ Portagens',
  hotel: '🏨 Hotel', refeicoes: '🍽️ Refeições', outros: '📦 Outros',
};

function ReceiptModal({ uri, onClose }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={receiptModalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <Image source={{ uri }} style={receiptModalStyles.image} resizeMode="contain" />
        <Text style={receiptModalStyles.closeHint}>Toca para fechar</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const receiptModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  image: { width: '92%', height: '75%' },
  closeHint: { color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 13 },
});

export default function DetalhesViagemScreen() {
  const [receiptModalUri, setReceiptModalUri] = useState(null);
  const { viagemId } = useRoute().params;
  const navigation = useNavigation();
  const trip = useTripStore((state) => state.trips.find(t => t.id === viagemId));
  const updateTrip = useTripStore((state) => state.updateTrip);
  const deleteTrip = useTripStore((state) => state.deleteTrip);

  if (!trip) return <Text style={styles.notFound}>Viagem não encontrada</Text>;

  const totalExpenses = trip.expenses.reduce((s, e) => s + e.value, 0);
  const allIds = trip.participants.map(p => p.id);
  const handleNav = (screen) => navigation.navigate(screen, { viagemId: trip.id });

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
        onPress: () => updateTrip(trip.id, { participants: trip.participants.filter(p => p.id !== participant.id) }),
      },
    ]);
  };

  const handleRemoveExpense = (id) => {
    Alert.alert('Eliminar despesa', 'Tens a certeza que queres eliminar esta despesa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => updateTrip(trip.id, { expenses: trip.expenses.filter(e => e.id !== id) }) },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Eliminar viagem', 'Esta ação é irreversível. Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteTrip(trip.id); navigation.goBack(); } },
    ]);
  };

  const handleShare = async () => {
    const code = encodeTrip(trip);
    if (!code) { Alert.alert('Erro', 'Não foi possível gerar o código.'); return; }
    await Share.share({
      message: `Junta-te à minha viagem "${trip.name}" no TripSplit!\n\nPara importar, abre o TripSplit → "Importar Viagem" e cola:\n\n${code}`,
      title: `Viagem: ${trip.name}`,
    });
  };

  const settlements = getSettlements(trip);
  const hasSettlements = settlements.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{trip.name}</Text>
      {trip.destination ? <Text style={styles.destination}>{trip.destination}</Text> : null}
      {trip.dates ? <Text style={styles.dates}>{trip.dates}</Text> : null}

      {/* Stats */}
      <Cartao>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>€{totalExpenses.toFixed(2)}</Text>
            <Text style={styles.statLabel}>total gasto</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{trip.participants.length}</Text>
            <Text style={styles.statLabel}>participantes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{trip.expenses.length}</Text>
            <Text style={styles.statLabel}>despesas</Text>
          </View>
        </View>
      </Cartao>

      {/* Acertos rápidos */}
      {hasSettlements && (
        <Cartao>
          <Text style={styles.sectionTitle}>Acertos pendentes</Text>
          {settlements.map((s, i) => {
            const debtorName = trip.participants.find(p => p.id === s.debtor)?.name ?? '?';
            const creditorName = trip.participants.find(p => p.id === s.creditor)?.name ?? '?';
            return (
              <View key={i} style={styles.settlementRow}>
                <Text style={styles.settlementDebtor}>{debtorName}</Text>
                <View style={styles.settlementMid}>
                  <Text style={styles.settlementArrow}>→</Text>
                  <Text style={styles.settlementAmount}>€{s.amount.toFixed(2)}</Text>
                </View>
                <Text style={styles.settlementCreditor}>{creditorName}</Text>
              </View>
            );
          })}
        </Cartao>
      )}

      {/* Participants */}
      <Cartao>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Participantes</Text>
          <Text style={styles.addLink} onPress={() => handleNav('AdicionarParticipante')}
            accessibilityRole="button">+ Adicionar</Text>
        </View>
        {trip.participants.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum participante ainda.</Text>
        ) : (
          trip.participants.map(p => {
            const bal = getPersonalBalance(trip.expenses, allIds, p.id);
            return (
              <View key={p.id} style={styles.participantRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.listName}>{p.name}</Text>
                  {trip.expenses.length > 0 && (
                    <Text style={styles.participantSub}>
                      <Text>Pagou €{bal.paid.toFixed(2)} · </Text>
                      {bal.net > 0.01
                        ? <Text style={styles.netPositive}>A receber €{bal.net.toFixed(2)}</Text>
                        : bal.net < -0.01
                        ? <Text style={styles.netNegative}>A pagar €{Math.abs(bal.net).toFixed(2)}</Text>
                        : <Text>Equilibrado</Text>}
                    </Text>
                  )}
                </View>
                <Text style={styles.removeText} onPress={() => handleRemoveParticipant(p)}
                  accessibilityRole="button">Remover</Text>
              </View>
            );
          })
        )}
      </Cartao>

      {/* Expenses */}
      <Cartao>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Despesas</Text>
          <Text style={styles.addLink} onPress={() => handleNav('AdicionarDespesa')}
            accessibilityRole="button">+ Adicionar</Text>
        </View>
        {trip.expenses.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma despesa ainda.</Text>
        ) : (
          trip.expenses.map(exp => {
            const payer = trip.participants.find(p => p.id === exp.paidBy);
            const sharedWith = exp.sharedWith?.length > 0 ? exp.sharedWith : allIds;
            const splitCount = sharedWith.length;
            const perPerson = splitCount > 0 ? exp.value / splitCount : exp.value;
            return (
              <View key={exp.id} style={styles.expenseRow}>
                <View style={styles.expenseMain}>
                  <Text style={styles.expenseCategory}>{categoryLabels[exp.category] ?? exp.category}</Text>
                  {exp.note ? <Text style={styles.expenseNote}>{exp.note}</Text> : null}
                  <Text style={styles.expensePayer}>
                    Pago por {payer?.name ?? '?'} · dividido por {splitCount} {splitCount === 1 ? 'pessoa' : 'pessoas'}
                  </Text>
                  <Text style={styles.expensePerPerson}>€{perPerson.toFixed(2)} por pessoa</Text>
                  {exp.receiptUrl ? (
                    <TouchableOpacity onPress={() => setReceiptModalUri(exp.receiptUrl)} style={styles.receiptThumbRow}>
                      <Image source={{ uri: exp.receiptUrl }} style={styles.receiptThumb} resizeMode="cover" />
                      <Text style={styles.receiptThumbLabel}>Ver recibo 🧾</Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.expenseActions}>
                    <Text style={styles.editText}
                      onPress={() => navigation.navigate('AdicionarDespesa', { viagemId: trip.id, expenseId: exp.id })}
                      accessibilityRole="button">Editar</Text>
                    <Text style={styles.removeText} onPress={() => handleRemoveExpense(exp.id)}
                      accessibilityRole="button">Apagar</Text>
                  </View>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={styles.expenseValue}>€{exp.value.toFixed(2)}</Text>
                </View>
              </View>
            );
          })
        )}
      </Cartao>

      {/* Actions */}
      <Cartao>
        <Botao title="Ver Acertos Detalhados" onPress={() => handleNav('Saldos')} />
        <Botao title="Resumo Final" onPress={() => handleNav('Resumo')} variant="secondary" />
        <Botao title="Partilhar Viagem" onPress={handleShare} variant="secondary" />
        <Botao title="Eliminar Viagem" onPress={handleDelete} variant="danger" />
      </Cartao>

      <ReceiptModal uri={receiptModalUri} onClose={() => setReceiptModalUri(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, textAlign: 'center', marginTop: 40, color: '#555' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  destination: { fontSize: 15, color: '#555', marginBottom: 2 },
  dates: { fontSize: 13, color: '#888', marginBottom: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#e0e0e0' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  addLink: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', paddingVertical: 8 },
  participantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  participantInfo: { flex: 1 },
  listName: { fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  participantSub: { fontSize: 12, color: '#888', marginTop: 2 },
  participantNet: { fontSize: 14, fontWeight: '700', marginRight: 10 },
  netPositive: { color: '#2e7d32' },
  netNegative: { color: '#c62828' },
  removeText: { fontSize: 13, color: '#FF3B30', fontWeight: '600' },
  settlementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  settlementDebtor: { flex: 1, fontSize: 14, fontWeight: '600', color: '#c62828' },
  settlementMid: { alignItems: 'center', paddingHorizontal: 8 },
  settlementArrow: { fontSize: 16, color: '#007AFF' },
  settlementAmount: { fontSize: 13, fontWeight: 'bold', color: '#007AFF' },
  settlementCreditor: { flex: 1, fontSize: 14, fontWeight: '600', color: '#2e7d32', textAlign: 'right' },
  expenseRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  expenseMain: { flex: 1 },
  expenseCategory: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  expenseNote: { fontSize: 13, color: '#555', marginTop: 1 },
  expensePayer: { fontSize: 12, color: '#888', marginTop: 2 },
  expensePerPerson: { fontSize: 12, color: '#007AFF', marginTop: 1, fontWeight: '500' },
  expenseActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  editText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  expenseRight: { alignItems: 'flex-end', paddingLeft: 8 },
  expenseValue: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  receiptThumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  receiptThumb: { width: 40, height: 40, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0' },
  receiptThumbLabel: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
});
