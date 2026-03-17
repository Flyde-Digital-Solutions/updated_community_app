import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, TextInputProps, ViewStyle, TextStyle,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const InputField: React.FC<Props> = ({
  label, error, hint, leftIcon, rightIcon,
  onRightIconPress, containerStyle, inputStyle, ...inputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = error
    ? Colors.borderError
    : isFocused
    ? Colors.borderActive
    : Colors.borderDefault;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.wrapper,
        { borderColor },
        error ? styles.errorWrapper : null,
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputLeft : null,
            rightIcon ? styles.inputRight : null,
            inputStyle,
          ]}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...inputProps}
        />
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error
        ? <Text style={styles.error}>{error}</Text>
        : hint
        ? <Text style={styles.hint}>{hint}</Text>
        : null
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.sectionLabel,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
  },
  errorWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(229,67,57,0.49)',
    shadowColor: 'rgba(143,0,0,1)',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.06,
    shadowRadius: 5.8,
    elevation: 3,
  },
  input: {
    flex: 1,
    ...Typography.primaryBody,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  inputLeft:  { paddingLeft: Spacing.sm },
  inputRight: { paddingRight: Spacing.sm },
  leftIcon:   { marginRight: Spacing.sm },
  rightIcon:  { marginLeft: Spacing.sm },
  error: {
    ...Typography.caption,
    color: Colors.alert,
    marginTop: Spacing.xs,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});