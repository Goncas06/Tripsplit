import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, Animated, View, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/storeTheme';

// Variantes: primary · secondary · danger · text
// Respeita a opção do sistema "Reduzir movimento"
let reduzirMovimento = false;
AccessibilityInfo.isReduceMotionEnabled?.().then(v => { reduzirMovimento = !!v; }).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', v => { reduzirMovimento = !!v; });

const variants = (c) => ({
  primary:   { bg: c.accent,  text: '#FFFFFF', border: null, shadow: c.btnShadow },
  secondary: { bg: c.card,    text: c.text,    border: c.fieldBorder },
  danger:    { bg: c.negSoft, text: c.negText, border: null },
  text:      { bg: 'transparent', text: c.accentText, border: null },
});

export default function Botao({
  title, onPress, variant = 'primary', icon, loading = false,
  disabled = false, height = 54, radius = 16, textColor, style,
  accessibilityLabel, accessibilityHint,
}) {
  const c = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const v = variants(c)[variant] ?? variants(c).primary;
  const isDisabled = disabled || loading;
  const color = textColor ?? v.text;

  const pressIn  = () => !reduzirMovimento && Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  const pressOut = () => !reduzirMovimento && Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60, bounciness: 4 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.button,
          { height: variant === 'text' ? Math.min(height, 48) : height, borderRadius: radius, backgroundColor: v.bg },
          v.border ? { borderWidth: 1, borderColor: v.border } : null,
          !isDisabled && v.shadow,
          pressed && { opacity: 0.85 },
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={color} size="small" />
        ) : (
          <View style={styles.content}>
            {icon ? <Ionicons name={icon} size={icon === 'add' ? 22 : 20} color={color} /> : null}
            <Text style={[styles.text, { color }]}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  disabled: { opacity: 0.4 },
  text: { fontSize: 17, fontWeight: '600' },
});
