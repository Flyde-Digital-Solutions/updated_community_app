import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

// ── Badge ──────────────────────────────────────────────────────────────────────
type BadgeVariant = 'orange' | 'blue' | 'success' | 'error' | 'neutral' | 'outline';

const badgeColors: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  orange:  { bg: Colors.accent300,             text: Colors.white },
  blue:    { bg: 'rgba(48,188,237,0.2)',        text: '#30BCED',      border: '#30BCED' },
  success: { bg: 'rgba(0,129,54,0.2)',          text: Colors.success, border: Colors.success },
  error:   { bg: 'rgba(229,67,57,0.2)',         text: Colors.alert,   border: Colors.alert },
  neutral: { bg: Colors.secondarySurface,       text: Colors.textSecondary },
  outline: { bg: Colors.transparent,           text: Colors.accent300, border: Colors.accent300 },
};

export const Badge: React.FC<{ label: string; variant?: BadgeVariant; style?: ViewStyle }> = ({
  label, variant = 'orange', style,
}) => {
  const { bg, text, border } = badgeColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, border ? { borderWidth: 1, borderColor: border } : null, style]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
};

// ── Checkbox ───────────────────────────────────────────────────────────────────
export const Checkbox: React.FC<{
  checked: boolean; onToggle: () => void;
  label?: string; description?: string; style?: ViewStyle;
}> = ({ checked, onToggle, label, description, style }) => (
  <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={[styles.checkRow, style]}>
    <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
      {checked && <Text style={styles.checkMark}>✓</Text>}
    </View>
    {(label || description) && (
      <View style={styles.checkText}>
        {label && <Text style={styles.checkLabel}>{label}</Text>}
        {description && <Text style={styles.checkDesc}>{description}</Text>}
      </View>
    )}
  </TouchableOpacity>
);

// ── CounterInput ───────────────────────────────────────────────────────────────
export const CounterInput: React.FC<{
  value: number; onIncrement: () => void; onDecrement: () => void;
  min?: number; max?: number; style?: ViewStyle;
}> = ({ value, onIncrement, onDecrement, min = 1, max = 99, style }) => (
  <View style={[styles.counter, style]}>
    <TouchableOpacity onPress={onDecrement} disabled={value <= min} style={[styles.counterBtn, value <= min && styles.counterBtnOff]} activeOpacity={0.7}>
      <Text style={styles.counterBtnText}>−</Text>
    </TouchableOpacity>
    <Text style={styles.counterVal}>{value}</Text>
    <TouchableOpacity onPress={onIncrement} disabled={value >= max} style={[styles.counterBtn, value >= max && styles.counterBtnOff]} activeOpacity={0.7}>
      <Text style={styles.counterBtnText}>+</Text>
    </TouchableOpacity>
  </View>
);

// ── Dropdown ───────────────────────────────────────────────────────────────────
export const Dropdown: React.FC<{
  label?: string; value?: string; placeholder?: string;
  onPress: () => void; style?: ViewStyle; leftIcon?: React.ReactNode;
}> = ({ label, value, placeholder = 'Select', onPress, style, leftIcon }) => (
  <View style={style}>
    {label && <Text style={styles.dropLabel}>{label}</Text>}
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.dropContainer}>
      {leftIcon && <View style={styles.dropLeftIcon}>{leftIcon}</View>}
      <Text style={[styles.dropValue, !value && styles.dropPlaceholder]}>{value || placeholder}</Text>
      <Text style={styles.chevron}>⌄</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  badgeText: { ...Typography.smallLabel, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.borderDefault, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkBoxOn: { backgroundColor: Colors.accent300, borderColor: Colors.accent300 },
  checkMark: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  checkText: { flex: 1 },
  checkLabel: { ...Typography.sectionLabel, color: Colors.textPrimary },
  checkDesc: { ...Typography.secondaryBody, marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  counterBtnOff: { opacity: 0.4 },
  counterBtnText: { color: Colors.white, fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  counterVal: { ...Typography.sectionHeader, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  dropLabel: { ...Typography.sectionLabel, color: Colors.textSecondary, marginBottom: Spacing.sm },
  dropContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderDefault, height: 52, paddingHorizontal: Spacing.lg },
  dropLeftIcon: { marginRight: Spacing.sm },
  dropValue: { flex: 1, ...Typography.primaryBody, color: Colors.textPrimary },
  dropPlaceholder: { color: Colors.textMuted },
  chevron: { color: Colors.textSecondary, fontSize: 18 },
});