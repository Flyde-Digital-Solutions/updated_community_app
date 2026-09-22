import React from 'react';
import {
  View, Text, StyleSheet, ImageBackground, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../../theme';
import { AppTextButton } from '../../components/atoms/Buttons';

const BG   = { uri: 'https://ik.imagekit.io/p1zreiw3z/preview.jpg' };
const LOGO = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png' };

function ThankYouIcon() {
  return (
    <Svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <Defs>
        <ClipPath id="clip0">
          <Rect width="36" height="36" fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip0)">
        <Path
          d="M25.4247 25.053C25.6842 23.7255 25.2687 22.362 24.3132 21.4065L14.5947 11.688C13.6392 10.731 12.2742 10.317 10.9497 10.5765C9.62367 10.8375 8.51817 11.7345 7.99317 12.9825L0.271171 31.3215C-0.262829 32.589 0.0206714 34.0365 0.992671 35.0085C1.63917 35.655 2.49567 35.997 3.36867 35.997C3.80967 35.997 4.25517 35.9085 4.68117 35.73L23.0217 28.0095C24.2682 27.4845 25.1667 26.379 25.4262 25.053H25.4247ZM3.51567 32.964C3.36717 33.0285 3.23067 33.0015 3.11367 32.886C2.99667 32.7705 2.97117 32.634 3.03567 32.4825L8.24367 20.112L15.8877 27.7545L3.51567 32.964ZM22.4817 24.4755C22.4487 24.6405 22.3242 25.047 21.8562 25.2435L18.8727 26.499L9.50067 17.1285L10.7577 14.1435C10.9542 13.677 11.3607 13.551 11.5257 13.5195C11.5752 13.509 11.6472 13.5 11.7327 13.5C11.9367 13.5 12.2217 13.5555 12.4737 13.8075L22.1922 23.526C22.5507 23.8845 22.5132 24.309 22.4817 24.4755ZM20.5872 0.5655C21.1047 -0.078 22.0362 -0.1845 22.6812 0.3225C22.8057 0.4215 25.7562 2.799 25.4982 6.846C25.3977 8.4315 24.7902 9.9645 23.6952 11.4075C23.4012 11.796 22.9527 12.0015 22.4997 12.0015C22.1847 12.0015 21.8652 11.9025 21.5937 11.697C20.9337 11.196 20.8047 10.2555 21.3057 9.5955C22.0377 8.631 22.4397 7.6425 22.5027 6.657C22.6587 4.2105 20.8857 2.7345 20.8107 2.673C20.1732 2.151 20.0697 1.209 20.5857 0.5685L20.5872 0.5655ZM35.3667 20.7255C35.1042 20.91 34.8027 21 34.5042 21C34.0377 21 33.5802 20.784 33.2877 20.3805C33.2427 20.322 32.5977 19.5 31.5027 19.5C30.9882 19.5 30.5322 19.647 30.1482 19.9365C29.4867 20.4375 28.5462 20.304 28.0467 19.644C27.5472 18.984 27.6792 18.042 28.3407 17.544C29.2452 16.8615 30.3387 16.5015 31.5027 16.5015C33.6507 16.5015 35.1687 17.844 35.7282 18.6375C36.2052 19.314 36.0432 20.25 35.3667 20.7285V20.7255ZM31.5027 2.25C31.5027 1.008 32.5107 0 33.7527 0C34.9947 0 36.0027 1.008 36.0027 2.25C36.0027 3.492 34.9947 4.5 33.7527 4.5C32.5107 4.5 31.5027 3.492 31.5027 2.25ZM28.5027 9.75C28.5027 8.508 29.5107 7.5 30.7527 7.5C31.9947 7.5 33.0027 8.508 33.0027 9.75C33.0027 10.992 31.9947 12 30.7527 12C29.5107 12 28.5027 10.992 28.5027 9.75ZM12.0012 3.75C12.0012 2.508 13.0092 1.5 14.2512 1.5C15.4932 1.5 16.5012 2.508 16.5012 3.75C16.5012 4.992 15.4932 6 14.2512 6C13.0092 6 12.0012 4.992 12.0012 3.75ZM34.5012 27.75C34.5012 28.992 33.4932 30 32.2512 30C31.0092 30 30.0012 28.992 30.0012 27.75C30.0012 26.508 31.0092 25.5 32.2512 25.5C33.4932 25.5 34.5012 26.508 34.5012 27.75ZM1.50117 5.25C1.50117 4.008 2.50917 3 3.75117 3C4.99317 3 6.00117 4.008 6.00117 5.25C6.00117 6.492 4.99317 7.5 3.75117 7.5C2.50917 7.5 1.50117 6.492 1.50117 5.25ZM27.0012 33.75C27.0012 34.992 25.9932 36 24.7512 36C23.5092 36 22.5012 34.992 22.5012 33.75C22.5012 32.508 23.5092 31.5 24.7512 31.5C25.9932 31.5 27.0012 32.508 27.0012 33.75Z"
          fill="white"
        />
      </G>
    </Svg>
  );
}

export function SingleDeskAllSetScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">

        <LinearGradient
          colors={['rgba(0,0,0,0)', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Logo — larger, centered vertically in upper half */}
        <View style={styles.logoContainer}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Bottom sheet */}
        <LinearGradient
          colors={['rgba(28,28,30,0.80)', 'rgba(21,21,23,0.80)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sheet}
        >
          <View style={[styles.inner, { paddingBottom: insets.bottom + 32 }]}>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconOuter}>
                <View style={styles.iconInner}>
                  <ThankYouIcon />
                </View>
              </View>
            </View>

            {/* Text */}
            <Text style={styles.title}>Thank You</Text>
            <Text style={styles.subtitle}>Our team will get back to you</Text>
            <Text style={styles.caption}>We have all the details we needed</Text>

            {/* Back link */}
            <AppTextButton
              label="Call Sales"
              onPress={() => navigation.navigate('ScreenList' as never)}
              style={styles.backBtn}
            />

          </View>
        </LinearGradient>

      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  bg:   { flex: 1 },

  logoContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: '45%',
    zIndex: 1,
  },
  logo: { width: 220, height: 149 },

  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  inner: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },

  iconContainer: { marginBottom: Spacing.xl },
  iconOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,115,0,0.30)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FF7300',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF7300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  title: {
    ...Typography.pageTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 15, lineHeight: 20,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  caption: {
    fontFamily: 'SequelSans-LightBody',
    fontSize: 13, lineHeight: 18,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },

  backBtn: { marginTop: Spacing.xl },
});
