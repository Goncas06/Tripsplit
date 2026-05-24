import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

const variantStyles = {
  primary:   { bg: '#007AFF', text: 'white',   border: null },
  secondary: { bg: 'transparent', text: '#007AFF', border: '#007AFF' },
  danger:    { bg: '#FF3B30', text: 'white',   border: null },
};

export default function Botao({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}) {
  const v = variantStyles[variant] ?? variantStyles.primary;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border ?? 'transparent', borderWidth: v.border ? 1.5 : 0 },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading
        ? <ActivityIndicator color={v.text} size="small" />
        : <Text style={[styles.text, { color: v.text }, isDisabled && styles.disabledText]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '600' },
  disabledText: { opacity: 0.7 },
});
