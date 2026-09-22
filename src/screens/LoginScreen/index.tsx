import React, { useState } from 'react';
import {
  Alert, Image, ImageBackground, Linking, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InputField } from '../../components/atoms/InputField';
import { OrangeButton } from '../../components/atoms/OrangeButton';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Spacing, Typography } from '../../theme';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../services/apiClient';
import { Routes } from '../../services/routes';
import { KeyboardSafeScrollView } from '../../components/molecules/KeyboardSafeScrollView';

const BG = { uri: 'https://ik.imagekit.io/p1zreiw3z/preview.jpg' };
const LOGO = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png' };

type Nav = NativeStackNavigationProp<RootStackParamList, 'LoginScreen'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { sendOtp } = useApp();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [openingSignup, setOpeningSignup] = useState(false);
  const normalizedPhone = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(0, 10);
  const valid = /^\d{10}$/.test(normalizedPhone);

  const handleSendOtp = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await sendOtp(normalizedPhone);
      navigation.navigate('OtpScreen', { phone: normalizedPhone });
    } catch (error) {
      Alert.alert('Could not send OTP', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (openingSignup) return;
    setOpeningSignup(true);
    try {
      const response = await apiClient.get<Record<string, unknown>>(Routes.appConfig);
      const data = response.data && typeof response.data === 'object'
        ? response.data as Record<string, unknown>
        : response;
      const ticketRequestLink = typeof data.ticketRequestLink === 'string'
        ? data.ticketRequestLink.trim()
        : '';
      if (!/^https:\/\//i.test(ticketRequestLink)) {
        throw new Error('The signup link returned by the server is missing or invalid.');
      }
      const supported = await Linking.canOpenURL(ticketRequestLink);
      if (!supported) throw new Error('This signup link cannot be opened on your device.');
      await Linking.openURL(ticketRequestLink);
    } catch (error) {
      Alert.alert('Could not open signup', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setOpeningSignup(false);
    }
  };

  return (
    <ImageBackground source={BG} style={styles.background} resizeMode="cover">
      <LinearGradient colors={['rgba(0,0,0,0.25)', '#000000']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <KeyboardSafeScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.brand}><Image source={LOGO} style={styles.logo} resizeMode="contain" /></View>
          <View style={styles.sheet}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to manage your OSPLCommunity account.</Text>
            <InputField
              label="Mobile number"
              value={phone}
              onChangeText={value => setPhone(value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              leftIcon={<Text style={styles.prefix}>+91</Text>}
            />
            <OrangeButton label="Send verification code" onPress={handleSendOtp} loading={loading} disabled={!valid} />
            <TouchableOpacity disabled={openingSignup} onPress={handleCreateAccount} style={styles.linkButton}>
              <Text style={styles.linkText}>{openingSignup ? 'Requesting Ticket...' : 'Request Ticket'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardSafeScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: Colors.black }, safe: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center' }, logo: { width: 190, height: 120 },
  sheet: { backgroundColor: 'rgba(21,21,23,0.96)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 34, borderWidth: 1, borderColor: Colors.borderDefault },
  title: { ...Typography.navigationTitle, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { ...Typography.secondaryBody, color: Colors.textSecondary, marginBottom: Spacing.xl },
  prefix: { ...Typography.primaryBody, color: Colors.textSecondary }, linkButton: { alignItems: 'center', paddingVertical: Spacing.lg },
  linkText: { ...Typography.secondaryBody, color: Colors.accent300 },
});
