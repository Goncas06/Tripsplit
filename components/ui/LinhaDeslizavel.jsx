import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Animated, PanResponder, View, StyleSheet, AccessibilityInfo } from 'react-native';

// Linha que desliza para a esquerda e mostra ações (ex: Editar / Apagar).
// Feita com PanResponder + Animated do React Native — não depende do gesture-handler.
// Só "agarra" gestos horizontais, por isso o scroll vertical da lista continua a funcionar.
const LinhaDeslizavel = forwardRef(function LinhaDeslizavel({ acoes, larguraAcoes, children }, ref) {
  const x = useRef(new Animated.Value(0)).current;
  const aberto = useRef(false);
  const [mostrarAcoes, setMostrarAcoes] = useState(false);

  const animarPara = (destino) => {
    aberto.current = destino !== 0;
    if (destino !== 0) setMostrarAcoes(true);
    AccessibilityInfo.isReduceMotionEnabled?.()
      .catch(() => false)
      .then((reduzir) => {
        const anim = reduzir
          ? Animated.timing(x, { toValue: destino, duration: 0, useNativeDriver: true })
          : Animated.spring(x, { toValue: destino, useNativeDriver: true, bounciness: 0, speed: 20 });
        anim.start(() => { if (destino === 0) setMostrarAcoes(false); });
      });
  };

  useImperativeHandle(ref, () => ({ close: () => animarPara(0) }));

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      setMostrarAcoes(true);
      x.setOffset(aberto.current ? -larguraAcoes : 0);
      x.setValue(0);
    },
    onPanResponderMove: (_, g) => {
      const base = aberto.current ? -larguraAcoes : 0;
      const alvo = Math.min(0, Math.max(-larguraAcoes, base + g.dx)); // só para a esquerda, até às ações
      x.setValue(alvo - base);
    },
    onPanResponderRelease: (_, g) => {
      x.flattenOffset();
      const base = aberto.current ? -larguraAcoes : 0;
      const final = base + g.dx;
      const abrir = g.vx < -0.3 || (g.vx <= 0.3 && final < -larguraAcoes / 2);
      animarPara(abrir ? -larguraAcoes : 0);
    },
    onPanResponderTerminate: () => { x.flattenOffset(); animarPara(aberto.current ? -larguraAcoes : 0); },
  })).current;

  return (
    <View style={styles.contentor}>
      {mostrarAcoes && <View style={[styles.acoes, { width: larguraAcoes }]}>{acoes}</View>}
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  contentor: { overflow: 'hidden' },
  acoes: { position: 'absolute', top: 0, right: 0, bottom: 0, flexDirection: 'row' },
});

export default LinhaDeslizavel;
