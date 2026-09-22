import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from 'react-native';

type Props = ScrollViewProps & {
  keyboardVerticalOffset?: number;
  avoidKeyboard?: boolean;
};

/**
 * Keeps focused form controls above the software keyboard on both platforms.
 * Android still uses adjustResize at the Activity level; the height behaviour
 * also covers React Native modals and devices whose OEM keyboard ignores it.
 */
export function KeyboardSafeScrollView({
  children,
  keyboardVerticalOffset = 0,
  avoidKeyboard = true,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  ...scrollProps
}: Props) {
  const scrollView = (
    <ScrollView
      {...scrollProps}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {children}
    </ScrollView>
  );

  if (!avoidKeyboard) return scrollView;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={styles.flex}
    >
      {scrollView}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
