import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, BorderRadius } from '../../theme';

interface OutlineProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const OutlineButton: React.FC<OutlineProps> = ({
  label, onPress, disabled = false, icon, style, textStyle,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    style={[styles.outline, disabled && styles.disabled, style]}
  >
    <View style={styles.row}>
      {icon && <View style={styles.iconLeft}>{icon}</View>}
      <Text style={[styles.outlineLabel, textStyle]}>{label}</Text>
    </View>
  </TouchableOpacity>
);

interface TextBtnProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AppTextButton: React.FC<TextBtnProps> = ({
  label, onPress, disabled = false, style, textStyle,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    style={[styles.textBtn, style]}
  >
    <Text style={[styles.textBtnLabel, textStyle]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  outline: {
    borderWidth: 1.5,
    borderColor: Colors.accent300,
    borderRadius: BorderRadius.full,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: 8 },
  outlineLabel: { ...Typography.buttonText, color: Colors.accent300 },
  textBtn: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  textBtnLabel: { ...Typography.buttonText, color: Colors.accent300 },
});