import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../store/storeTheme';

// Cartão base: raio 20, sombra suave no claro, sem sombra no escuro.
// Por omissão sem padding (listas); `padded` para conteúdo livre.
// `clip` recorta o conteúdo aos cantos (linhas com fundo, swipe) numa camada interior,
// porque no iOS overflow:hidden na mesma View apaga a sombra.
const Cartao = ({ children, style, padded = false, clip = false }) => {
  const c = useTheme();
  if (clip) {
    return (
      <View style={[styles.card, { backgroundColor: c.card }, c.cardShadow]}>
        <View style={[styles.card, styles.clip, padded && styles.padded, style]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: c.card }, c.cardShadow, padded && styles.padded, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 20 },
  clip: { overflow: 'hidden' },
  padded: { padding: 16 },
});

export default Cartao;
