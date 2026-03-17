import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  avoidKeyboard?: boolean;
  paddingBottom?: number;
}

export const BottomSheet: React.FC<Props> = ({
  children, style, scrollable = false, avoidKeyboard = false, paddingBottom = 40,
}) => {
  const inner = scrollable ? (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom }}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ paddingBottom }}>{children}</View>
  );

  const sheet = <View style={[styles.sheet, style]}>{inner}</View>;

  if (avoidKeyboard) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        {sheet}
      </KeyboardAvoidingView>
    );
  }
  return sheet;
};

export const BottomSheetModal: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={styles.modalOverlay}>
    <View style={[styles.modalSheet, style]}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  sheet: { backgroundColor: Colors.cardSurface, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl },
  kav: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', zIndex: 99 },
  modalSheet: { backgroundColor: Colors.cardSurface, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: 48, alignItems: 'center' },
});