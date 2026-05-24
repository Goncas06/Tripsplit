import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ListaParticipantes({ participants, onRemove, onAdd }) {
  return (
    <View>
      {participants.map(p => (
        <View key={p.id} style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{p.name}</Text>
          <TouchableOpacity onPress={() => onRemove(p.id)}
            accessibilityRole="button" accessibilityLabel={`Remover ${p.name}`}>
            <Text style={styles.remove}>Remover</Text>
          </TouchableOpacity>
        </View>
      ))}
      {onAdd && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd}
          accessibilityRole="button" accessibilityLabel="Adicionar participante">
          <Text style={styles.addText}>+ Adicionar Participante</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  name: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  remove: { fontSize: 13, color: '#FF3B30', fontWeight: '600' },
  addButton: { marginTop: 10, paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  addText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
});
