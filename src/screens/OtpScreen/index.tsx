import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground,
  Image, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Typography, Spacing } from '../../theme';
import { OtpInput } from '../../components/atoms/OtpInput';
import { OrangeButton } from '../../components/atoms/OrangeButton';
import { AppTextButton } from '../../components/atoms/Buttons';
import { useApp } from '../../context/AppContext';
import { KeyboardSafeScrollView } from '../../components/molecules/KeyboardSafeScrollView';

const BG = { uri: 'https://ik.imagekit.io/p1zreiw3z/preview.jpg' };
const LOGO = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png' };

export function OtpScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'OtpScreen'>>();
  const { login, sendOtp } = useApp();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const code = otp.trim();
    if (code.length !== 6) {
      Alert.alert('Enter the complete code', 'Please enter all 6 digits before continuing.');
      return;
    }
    setLoading(true);
    try {
      await login(route.params.phone, code);
    } catch (error) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">

      {/* Gradient overlay: transparent top → black bottom */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Push sheet to bottom */}
      <KeyboardSafeScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.brand}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Bottom sheet */}
        <View style={styles.sheet}>
          <Text style={styles.title}>Verify your contact</Text>
          <Text style={styles.subtitle}>
            {`We sent a 6-digit code to\n+91 ${route.params.phone}`}
          </Text>

          <View style={styles.otpRow}>
            <OtpInput
              length={6}
              onChange={setOtp}
            />
          </View>

          <OrangeButton
            label="Verify Contact no."
            onPress={() => handleVerify()}
            loading={loading}
            style={styles.btn}
          />

          <AppTextButton
            label="Resend OTP"
            onPress={async () => {
              setOtp('');
              try {
                await sendOtp(route.params.phone);
                Alert.alert('Code sent', 'A new verification code has been requested.');
              } catch (error) {
                Alert.alert('Could not resend', error instanceof Error ? error.message : 'Please try again.');
              }
            }}
            style={styles.resend}
          />
        </View>
      </KeyboardSafeScrollView>

      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  bg: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 180,
    height: 122,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'rgba(28,28,30,0.80)',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: 48,
  },
 title: {
  ...Typography.pageTitle,
  color: Colors.textPrimary,
  marginBottom: Spacing.sm,
  textAlign: 'center',
},
subtitle: {
  fontFamily: 'SequelSans-BookBody',
  fontSize: 15,
  lineHeight: 20,
  color: '#9CA3AF',
  marginBottom: Spacing.xxl,
  textAlign: 'center',
},
  otpRow: {
    marginBottom: Spacing.xxl,
  },
  btn: {
    marginBottom: Spacing.lg,
  },
  resend: {
    alignSelf: 'center',
  },
});
