import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground,
  Image, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { OtpInput } from '../../components/atoms/OtpInput';
import { OrangeButton } from '../../components/atoms/OrangeButton';
import { AppTextButton } from '../../components/atoms/Buttons';

const BG = { uri: 'https://ik.imagekit.io/p1zreiw3z/preview.jpg' };
const LOGO = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png' };

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function OtpScreen() {
  const navigation = useNavigation<Nav>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length < 4) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    navigation.navigate('EnterDetailsScreen');
  };

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">

      {/* Gradient overlay: transparent top → black bottom */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Push sheet to bottom */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.flex} />

        {/* Bottom sheet */}
        <View style={styles.sheet}>
          <Text style={styles.title}>Verify your contact</Text>
          <Text style={styles.subtitle}>
            We just sent you a 4-digit code to{'\n'}+91 XXXXXXXX
          </Text>

          <View style={styles.otpRow}>
            <OtpInput
              length={4}
              onChange={setOtp}
              onComplete={handleVerify}
            />
          </View>

          <OrangeButton
            label="Verify Contact no."
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length < 4}
            style={styles.btn}
          />

          <AppTextButton
            label="Resend OTP"
            onPress={() => setOtp('')}
            style={styles.resend}
          />
        </View>
      </KeyboardAvoidingView>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  flex: {
    flex: 1,
  },
  logoContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
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