import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  View, StyleSheet, ViewStyle, TextStyle, Image,
} from 'react-native';
import { Colors, BorderRadius } from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const OrangeButton: React.FC<Props> = ({
  label, onPress, loading = false, disabled = false,
  icon, iconPosition = 'right', style, textStyle,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
    style={[styles.button, disabled && styles.disabled, style]}
  >
    {loading ? (
      <ActivityIndicator color={Colors.white} />
    ) : (
      <View style={styles.row}>
        {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
        <Text style={[styles.label, textStyle]}>{label}</Text>
        {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF7300',
    borderRadius: BorderRadius.md,
    height: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.white,
    fontWeight: '315' as any,
  },
  iconLeft:  { },
  iconRight: { },
});