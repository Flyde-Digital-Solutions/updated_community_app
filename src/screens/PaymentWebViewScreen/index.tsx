import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView as NativeWebView } from 'react-native-webview';
import type {
  AndroidWebViewProps, IOSWebViewProps, WebViewMessageEvent, WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes';
import type { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Spacing, Typography } from '../../theme';
import { getPaymentNavigationTarget, isSecurePaymentUrl } from '../../utils/paymentUrl';
import { apiClient } from '../../services/apiClient';
import { Routes } from '../../services/routes';
import { useApp } from '../../context/AppContext';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'PaymentWebViewScreen'>;
type PaymentRoute = RouteProp<RootStackParamList, 'PaymentWebViewScreen'>;
type WebViewHandle = { goBack(): void };
type EmbeddedWebViewProps = IOSWebViewProps & Pick<AndroidWebViewProps,
  'domStorageEnabled' | 'mixedContentMode' | 'setSupportMultipleWindows' | 'thirdPartyCookiesEnabled'>;

// v14's public declaration intersects every platform's props, which collapses to
// `never`; the native exports still accept their platform-specific prop shape.
const WebView = NativeWebView as unknown as React.ForwardRefExoticComponent<
  EmbeddedWebViewProps & React.RefAttributes<WebViewHandle>
>;

export function PaymentWebViewScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<PaymentRoute>();
  const webViewRef = useRef<WebViewHandle>(null);
  const verifyingRef = useRef(false);
  const { syncAll } = useApp();
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const paymentUrl = route.params.url?.trim() || '';
  const isValidUrl = isSecurePaymentUrl(paymentUrl);

  const retry = () => {
    setLoadError('');
    setReloadKey(value => value + 1);
  };

  const handleBack = () => {
    if (canGoBack) webViewRef.current?.goBack();
    else navigation.goBack();
  };

  const shouldStartRequest = ({ url }: { url: string }) => {
    const target = getPaymentNavigationTarget(url);
    if (target === 'web') return true;
    if (target === 'external-app') {
      Linking.openURL(url).catch(() => {
        Alert.alert('Payment app unavailable', 'Install or open a supported payment app and try again.');
      });
      return false;
    }
    Alert.alert('Link blocked', 'The payment provider attempted to open an unsupported link.');
    return false;
  };

  const verifyPayment = async (payload: Record<string, unknown>) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    try {
      await apiClient.post(Routes.razorpaySuccess, { ...payload, ...route.params.context, amount: route.params.context?.amount });
      await syncAll();
      Alert.alert('Payment confirmed', 'The payment was verified and the latest booking status has been loaded.', [{ text: 'Done', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Payment verification failed', error instanceof Error ? error.message : 'Please contact support before retrying the payment.');
      verifyingRef.current = false;
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; payload?: Record<string, unknown> };
      if (message.type === 'success' && message.payload) verifyPayment(message.payload);
      else if (message.type === 'dismiss') navigation.goBack();
    } catch { /* Ignore messages not emitted by the checkout bridge. */ }
  };

  const handleNavigation = (state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    if (!state.url.includes('razorpay_payment_id')) return;
    try {
      const queryValue = (name: string) => {
        const match = state.url.match(new RegExp(`[?&]${name}=([^&#]+)`));
        return match ? decodeURIComponent(match[1]) : undefined;
      };
      const paymentId = queryValue('razorpay_payment_id');
      if (paymentId) verifyPayment({
        razorpay_payment_id: paymentId,
        razorpay_order_id: queryValue('razorpay_order_id'),
        razorpay_signature: queryValue('razorpay_signature'),
      });
    } catch { /* The hosted link may use a non-standard completion redirect. */ }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={canGoBack ? 'Go back in payment page' : 'Close payment'}
            onPress={handleBack}
            style={styles.headerButton}
          >
            <Icon name={canGoBack ? 'arrow-left' : 'close'} size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{route.params.title || 'Secure Payment'}</Text>
            <View style={styles.secureRow}>
              <Icon name="lock" size={11} color={Colors.success} />
              <Text style={styles.secureText}>Secure in-app checkout</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close payment"
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Icon name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {!isValidUrl || loadError ? (
        <View style={styles.errorState}>
          <Icon name="web-off" size={48} color={Colors.textMuted} />
          <Text style={styles.errorTitle}>Payment page unavailable</Text>
          <Text style={styles.errorMessage}>
            {!isValidUrl ? 'The server returned an invalid or insecure payment link.' : loadError}
          </Text>
          {isValidUrl ? (
            <TouchableOpacity onPress={retry} style={styles.retryButton}>
              <Icon name="refresh" size={18} color={Colors.white} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <WebView
          key={reloadKey}
          ref={webViewRef}
          testID="payment-webview"
          source={{ uri: paymentUrl }}
          style={styles.webView}
          // Let every navigation reach our handler; the WebView's built-in
          // whitelist otherwise sends rejected URLs straight to Linking.
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          startInLoadingState
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          mixedContentMode="never"
          onShouldStartLoadWithRequest={shouldStartRequest}
          onNavigationStateChange={handleNavigation}
          onMessage={handleMessage}
          onError={() => setLoadError('The checkout could not be loaded. Check your connection and try again.')}
          renderLoading={() => (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.accent300} />
              <Text style={styles.loadingText}>Opening secure checkout…</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.cardSurface },
  header: {
    height: 64, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center', gap: 2 },
  title: { ...Typography.sectionHeader, color: Colors.textPrimary },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  secureText: { ...Typography.smallLabel, color: Colors.success },
  webView: { flex: 1, backgroundColor: Colors.white },
  loadingState: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, backgroundColor: Colors.background,
  },
  loadingText: { ...Typography.secondaryBody, color: Colors.textSecondary },
  errorState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md,
  },
  errorTitle: { ...Typography.pageTitle, color: Colors.textPrimary, textAlign: 'center' },
  errorMessage: { ...Typography.secondaryBody, color: Colors.textSecondary, textAlign: 'center' },
  retryButton: {
    marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent300, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  retryText: { ...Typography.buttonText, color: Colors.white },
});
