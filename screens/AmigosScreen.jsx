import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Share, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuthStore } from '../store/storeAuth';
import { useAmigosStore } from '../store/storeAmigos';
import { useTripStore } from '../store/storeViagens';
import { encodeFriendCode, decodeFriendCode, shortCode } from '../utils/friendCode';
import { encodeTrip, decodeTrip, buildImportedTrip } from '../utils/share';
import Botao from '../components/ui/Botao';
import Cartao from '../components/ui/Cartao';

// ── My Code section ──────────────────────────────────────────────────────────
function MeuCodigo({ user }) {
  const myCode = encodeFriendCode(user);
  const display = shortCode(user.id);

  const handleShare = () =>
    Share.share({
      message: `Adiciona-me como amigo no TripSplit!\n\nO meu código:\n${myCode}`,
      title: 'O meu código TripSplit',
    });

  return (
    <Cartao>
      <Text style={styles.sectionTitle}>O teu código</Text>
      <Text style={styles.sectionSub}>Partilha-o com amigos para se ligarem a ti.</Text>
      <View style={styles.codeBox}>
        <Text style={styles.shortCode}>{display}</Text>
      </View>
      <TouchableOpacity style={[styles.codeBtn, styles.codeBtnPrimary]} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Partilhar código">
        <Text style={[styles.codeBtnText, { color: 'white' }]}>Partilhar o meu código</Text>
      </TouchableOpacity>
    </Cartao>
  );
}

// ── Add Friend modal ──────────────────────────────────────────────────────────
function AdicionarAmigoModal({ visible, onClose, onAdd }) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(null);

  const handlePreview = () => {
    const profile = decodeFriendCode(code);
    if (!profile) { Alert.alert('Código inválido', 'Verifica se copiaste o código corretamente.'); return; }
    setPreview(profile);
  };

  const handleConfirm = async () => {
    await onAdd({ ...preview, code: code.trim() });
    setCode('');
    setPreview(null);
    onClose();
  };

  const handleClose = () => { setCode(''); setPreview(null); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Adicionar amigo</Text>
          <Text style={styles.modalSub}>Cola o código que o teu amigo partilhou contigo.</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Cola o código aqui"
            value={code}
            onChangeText={(t) => { setCode(t); setPreview(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={3}
            accessibilityLabel="Código do amigo"
          />

          {preview ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewName}>{preview.name}</Text>
              <Text style={styles.previewSub}>Queres adicionar esta pessoa como amigo?</Text>
              <Botao title={`Adicionar ${preview.name}`} onPress={handleConfirm} />
            </View>
          ) : (
            <Botao title="Verificar código" onPress={handlePreview} disabled={!code.trim()} />
          )}

          <Botao title="Cancelar" onPress={handleClose} variant="secondary" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Share trip modal ──────────────────────────────────────────────────────────
function PartilharViagemModal({ visible, friend, trips, onClose }) {
  const handleShare = async (trip) => {
    const code = encodeTrip(trip);
    await Share.share({
      message:
        `${friend?.name}, partilhei a viagem "${trip.name}" contigo no TripSplit!\n\n` +
        `Para importar, abre o TripSplit → "Importar Viagem" e cola:\n\n${code}`,
      title: `Viagem: ${trip.name}`,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { maxHeight: '80%' }]}>
          <Text style={styles.modalTitle}>Partilhar com {friend?.name}</Text>
          <Text style={styles.modalSub}>Escolhe uma viagem para partilhar.</Text>
          <ScrollView style={{ marginTop: 8 }}>
            {trips.length === 0 ? (
              <Text style={styles.emptyText}>Não tens viagens criadas ainda.</Text>
            ) : (
              trips.map(trip => (
                <TouchableOpacity key={trip.id} style={styles.tripRow} onPress={() => handleShare(trip)}
                  accessibilityRole="button" accessibilityLabel={`Partilhar viagem ${trip.name}`}>
                  <View>
                    <Text style={styles.tripRowName}>{trip.name}</Text>
                    <Text style={styles.tripRowSub}>{trip.participants.length} participantes · {trip.expenses.length} despesas</Text>
                  </View>
                  <Text style={styles.shareArrow}>→</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <Botao title="Cancelar" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

// ── Receive trip modal ────────────────────────────────────────────────────────
function ReceberViagemModal({ visible, friend, onClose, onReceive }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReceive = async () => {
    const raw = decodeTrip(code);
    if (!raw?.name) { Alert.alert('Código inválido', 'Verifica o código da viagem.'); return; }
    setLoading(true);
    const trip = buildImportedTrip(raw);
    await onReceive(trip);
    setLoading(false);
    setCode('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Receber viagem de {friend?.name}</Text>
          <Text style={styles.modalSub}>Cola o código da viagem que o teu amigo te enviou.</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Cola o código da viagem"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={4}
            accessibilityLabel="Código da viagem"
          />
          <Botao title="Importar viagem" onPress={handleReceive} loading={loading} disabled={!code.trim() || loading} />
          <Botao title="Cancelar" onPress={() => { setCode(''); onClose(); }} variant="secondary" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Friend card ───────────────────────────────────────────────────────────────
function AmigoCard({ friend, trips, receivedTrips, onRemove, onReceive }) {
  const [shareVisible, setShareVisible] = useState(false);
  const [receiveVisible, setReceiveVisible] = useState(false);
  const myReceived = receivedTrips.filter(r => r.friendId === friend.id);

  return (
    <Cartao>
      <View style={styles.friendHeader}>
        <View style={styles.friendAvatar}>
          <Text style={styles.friendAvatarText}>{friend.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendSub}>{shortCode(friend.id)}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remover ${friend.name}`}>
          <Text style={styles.removeBtn}>Remover</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.friendActions}>
        <TouchableOpacity style={styles.friendActionBtn} onPress={() => setShareVisible(true)}
          accessibilityRole="button" accessibilityLabel={`Partilhar viagem com ${friend.name}`}>
          <Text style={styles.friendActionText}>Partilhar viagem</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.friendActionBtn} onPress={() => setReceiveVisible(true)}
          accessibilityRole="button" accessibilityLabel={`Importar viagem de ${friend.name}`}>
          <Text style={styles.friendActionText}>Importar viagem</Text>
        </TouchableOpacity>
      </View>

      {myReceived.length > 0 && (
        <View style={styles.receivedSection}>
          <Text style={styles.receivedLabel}>Viagens recebidas</Text>
          {myReceived.map(r => (
            <View key={r.id} style={styles.receivedRow}>
              <Text style={styles.receivedName}>{r.trip.name}</Text>
              <TouchableOpacity onPress={() => onReceive('remove', r.id)}
                accessibilityRole="button" accessibilityLabel={`Remover viagem recebida ${r.trip.name}`}>
                <Text style={styles.removeBtn}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <PartilharViagemModal
        visible={shareVisible}
        friend={friend}
        trips={trips}
        onClose={() => setShareVisible(false)}
      />
      <ReceberViagemModal
        visible={receiveVisible}
        friend={friend}
        onClose={() => setReceiveVisible(false)}
        onReceive={(trip) => onReceive('add', friend.id, trip)}
      />
    </Cartao>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AmigosScreen() {
  const user = useAuthStore(s => s.user);
  const { friends, receivedTrips, loadAll, addFriend, removeFriend, addReceivedTrip, removeReceivedTrip } = useAmigosStore();
  const { trips, loadTrips, addTrip } = useTripStore();
  const [addVisible, setAddVisible] = useState(false);

  useEffect(() => {
    loadAll();
    loadTrips();
  }, []);

  const handleAddFriend = async (profile) => {
    const result = await addFriend(profile);
    if (result.error) Alert.alert('Erro', result.error);
    else Alert.alert('Amigo adicionado!', `${profile.name} foi adicionado à tua lista.`);
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      'Remover amigo',
      `Tens a certeza que queres remover ${friend.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: () => removeFriend(friend.id),
        },
      ]
    );
  };

  const handleReceiveAction = async (action, idOrFriendId, trip) => {
    if (action === 'remove') {
      removeReceivedTrip(idOrFriendId);
    } else {
      const friend = friends.find(f => f.id === idOrFriendId);
      const result = await addReceivedTrip(idOrFriendId, friend?.name ?? 'Amigo', trip);
      if (result.error) { Alert.alert('Atenção', result.error); return; }
      await addTrip(trip);
      Alert.alert('Viagem importada!', `"${trip.name}" foi adicionada às tuas viagens.`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {user && <MeuCodigo user={user} />}

      <View style={styles.friendsHeader}>
        <Text style={styles.sectionTitle}>Amigos ({friends.length})</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Adicionar amigo"
        >
          <Text style={styles.addBtnText}>+ Adicionar</Text>
        </TouchableOpacity>
      </View>

      {friends.length === 0 ? (
        <Cartao>
          <Text style={styles.emptyText}>Ainda não tens amigos adicionados.</Text>
          <Text style={styles.emptySub}>Partilha o teu código ou pede o código de um amigo.</Text>
        </Cartao>
      ) : (
        friends.map(friend => (
          <AmigoCard
            key={friend.id}
            friend={friend}
            trips={trips}
            receivedTrips={receivedTrips}
            onRemove={() => handleRemoveFriend(friend)}
            onReceive={handleReceiveAction}
          />
        ))
      )}

      <AdicionarAmigoModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddFriend}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  sectionSub: { fontSize: 13, color: '#888', marginBottom: 12, marginTop: 2 },

  codeBox: { backgroundColor: '#f0f4ff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  shortCode: { fontSize: 28, fontWeight: 'bold', color: '#007AFF', letterSpacing: 3 },
  codeActions: { flexDirection: 'row', gap: 10 },
  codeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#007AFF', alignItems: 'center' },
  codeBtnPrimary: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  codeBtnText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },

  friendsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  addBtn: { backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

  friendHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  friendAvatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  friendSub: { fontSize: 13, color: '#888', marginTop: 1 },
  removeBtn: { fontSize: 13, color: '#FF3B30', fontWeight: '600' },

  friendActions: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  friendActionBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: '#007AFF', alignItems: 'center' },
  friendActionText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },

  receivedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  receivedLabel: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  receivedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  receivedName: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },

  tripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tripRowName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  tripRowSub: { fontSize: 12, color: '#888', marginTop: 2 },
  shareArrow: { fontSize: 18, color: '#007AFF', fontWeight: 'bold' },

  emptyText: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center' },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
  modalSub: { fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 20 },
  modalInput: { borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 13, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 80, textAlignVertical: 'top', fontFamily: 'monospace', marginBottom: 16 },

  previewBox: { backgroundColor: '#f0f7ff', borderRadius: 10, padding: 14, marginBottom: 12 },
  previewName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  previewSub: { fontSize: 13, color: '#555', marginBottom: 12 },
});
