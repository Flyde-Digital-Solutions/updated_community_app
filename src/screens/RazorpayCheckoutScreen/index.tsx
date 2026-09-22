import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RazorpayCheckout, {
  type PaymentErrorData, type PaymentSuccessData, type RazorpayOptions,
} from 'react-native-razorpay';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/MainStackNavigator';
import { apiClient } from '../../services/apiClient';
import { Routes } from '../../services/routes';
import { BorderRadius, Colors, Spacing, Typography } from '../../theme';
import { useApp } from '../../context/AppContext';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'RazorpayCheckoutScreen'>;
type CheckoutRoute = RouteProp<RootStackParamList, 'RazorpayCheckoutScreen'>;

export const buildRazorpayOptions = (
  order: CheckoutRoute['params']['order'],
  prefill?: CheckoutRoute['params']['prefill'],
): RazorpayOptions => ({
  key: order.key,
  amount: order.amount,
  currency: 'INR',
  name: 'OSPLCommunity',
  description: order.description || 'Secure payment',
  order_id: order.orderId,
  ...(prefill ? { prefill } : {}),
  theme: { color: Colors.accent300 },
  modal: { confirm_close: true, handleback: true, backdropclose: false },
});

export const describeRazorpayError = (error: unknown) => {
  const paymentError = (error && typeof error === 'object' ? error : {}) as PaymentErrorData;
  let nestedError: PaymentErrorData = {};
  const rawDescription = paymentError.description?.trim() || '';
  if (rawDescription.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawDescription) as { error?: PaymentErrorData } & PaymentErrorData;
      nestedError = parsed.error && typeof parsed.error === 'object' ? parsed.error : parsed;
    } catch { /* Razorpay may also return an ordinary text description. */ }
  }
  const nestedDescription = nestedError.description?.trim();
  const description = nestedDescription && !['undefined', 'null'].includes(nestedDescription.toLowerCase())
    ? nestedDescription
    : rawDescription && !rawDescription.startsWith('{') && !['undefined', 'null'].includes(rawDescription.toLowerCase())
      ? rawDescription
      : 'The payment was cancelled or could not be completed.';
  const detail = [
    nestedError.reason || paymentError.reason,
    nestedError.step || paymentError.step,
    nestedError.source || paymentError.source,
  ]
    .map(value => value?.trim())
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .join(' · ');
  return detail ? `${description}\n${detail}` : description;
};

export function RazorpayCheckoutScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<CheckoutRoute>();
  const { syncAll } = useApp();
  const openedRef = useRef(false);
  const [opening, setOpening] = useState(true);
  const [failure, setFailure] = useState('');
  const [verificationFailed, setVerificationFailed] = useState(false);

  const openCheckout = useCallback(async () => {
    if (openedRef.current) return;
    openedRef.current = true;
    setOpening(true);
    setFailure('');
    setVerificationFailed(false);

    let payment: PaymentSuccessData;
    try {
      payment = await RazorpayCheckout.open(buildRazorpayOptions(route.params.order, route.params.prefill));
    } catch (error) {
      openedRef.current = false;
      setOpening(false);
      setFailure(describeRazorpayError(error));
      return;
    }

    try {
      await apiClient.post(Routes.razorpaySuccess, {
        ...payment,
        ...route.params.context,
        amount: route.params.context?.amount ?? route.params.order.amount,
      });
      await syncAll();
      Alert.alert(
        'Payment confirmed',
        'The payment was verified and the latest booking status has been loaded.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      setOpening(false);
      setVerificationFailed(true);
      setFailure(error instanceof Error
        ? `Payment succeeded, but confirmation failed: ${error.message}`
        : 'Payment succeeded, but confirmation could not be completed. Please contact support before trying again.');
    }
  }, [navigation, route.params.context, route.params.order, route.params.prefill, syncAll]);

  useEffect(() => { openCheckout(); }, [openCheckout]);

  const retry = () => {
    openedRef.current = false;
    openCheckout();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close payment" onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Icon name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{route.params.title || 'Secure Payment'}</Text>
            <View style={styles.secureRow}>
              <Icon name="shield-check" size={12} color={Colors.success} />
              <Text style={styles.secureText}>Native Razorpay checkout</Text>
            </View>
          </View>
          <View style={styles.headerButton} />
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        {opening ? (
          <>
            <ActivityIndicator size="large" color={Colors.accent300} />
            <Text style={styles.heading}>Opening secure checkout…</Text>
            <Text style={styles.message}>Complete the payment in the Razorpay window.</Text>
          </>
        ) : (
          <>
            <Icon name={verificationFailed ? 'alert-circle-outline' : 'credit-card-off-outline'} size={52} color={Colors.alert} />
            <Text style={styles.heading}>{verificationFailed ? 'Confirmation required' : 'Payment not completed'}</Text>
            <Text style={styles.message}>{failure}</Text>
            {!verificationFailed ? (
              <TouchableOpacity onPress={retry} style={styles.primaryButton}>
                <Icon name="refresh" size={18} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.cardSurface },
  header: { height: 64, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center', gap: 2 },
  title: { ...Typography.sectionHeader, color: Colors.textPrimary },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secureText: { ...Typography.smallLabel, color: Colors.success },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  heading: { ...Typography.pageTitle, color: Colors.textPrimary, textAlign: 'center' },
  message: { ...Typography.secondaryBody, color: Colors.textSecondary, textAlign: 'center' },
  primaryButton: { marginTop: Spacing.sm, minHeight: 48, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.full, backgroundColor: Colors.accent300, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  primaryButtonText: { ...Typography.buttonText, color: Colors.white },
  secondaryButton: { minHeight: 44, paddingHorizontal: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { ...Typography.buttonText, color: Colors.textSecondary },
});
