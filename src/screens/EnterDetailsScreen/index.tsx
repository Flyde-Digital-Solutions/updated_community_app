import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground,
  Image, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { OrangeButton } from '../../components/atoms/OrangeButton';
import { InputField } from '../../components/atoms/InputField';

const BG        = { uri: 'https://ik.imagekit.io/p1zreiw3z/preview.jpg' };
const LOGO      = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png' };
const ARROW_URI = 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square/Icon.png';
const CITIES    = ['Noida', 'Gurugram', 'Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad'];

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function EnterDetailsScreen() {
  const navigation = useNavigation<Nav>();

  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [city,       setCity]       = useState('Noida');
  const [company,    setCompany]    = useState('');
  const [terms,      setTerms]      = useState(false);
  const [showCities, setShowCities] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loading,    setLoading]    = useState(false);

  const validateEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSignUp = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    navigation.navigate('WhatToBookScreen');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">

        {/* Gradient overlay */}
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

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.flex} />

          {/* Bottom sheet */}
          <LinearGradient
            colors={['rgba(28,28,30,0.80)', 'rgba(21,21,23,0.80)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.sheet}
          >
            {/* Form area */}
            <View style={styles.formArea}>

              <Text style={styles.title}>Enter your Details</Text>

              {/* Full Name */}
              <Text style={styles.fieldLabel}>Full Name</Text>
              <InputField
                placeholder="Full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                containerStyle={styles.field}
              />

              {/* Email */}
              <Text style={styles.fieldLabel}>Email Address</Text>
              <InputField
                placeholder="Email address"
                value={email}
                onChangeText={val => {
                  setEmail(val);
                  if (emailError) setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.field}
                error={emailError}
              />

              {/* City */}
              <Text style={styles.fieldLabel}>City</Text>
              <View style={styles.dropdownWrapper}>
                <TouchableOpacity
                  onPress={() => setShowCities(p => !p)}
                  style={styles.dropdown}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValue}>{city}</Text>
                  <View style={[styles.arrowContainer, showCities && styles.arrowContainerUp]}>
                    <Image
                      source={{ uri: ARROW_URI }}
                      style={styles.arrowIcon}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableOpacity>

                {showCities && (
                  <View style={styles.cityList}>
                    {CITIES.map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.cityItem, c === city && styles.cityItemActive]}
                        onPress={() => { setCity(c); setShowCities(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cityText, c === city && styles.cityTextActive]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Company */}
              <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>
                Company Name <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <InputField
                placeholder="Company name"
                value={company}
                onChangeText={setCompany}
                containerStyle={styles.field}
              />

            </View>

            {/* Fixed bottom */}
            <View style={styles.fixedBottom}>
              <TouchableOpacity
                onPress={() => setTerms(p => !p)}
                activeOpacity={0.7}
                style={styles.checkRow}
              >
                <View style={[styles.checkBox, terms && styles.checkBoxOn]}>
                  {terms && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <View style={styles.checkTextCol}>
                  <Text style={styles.checkLabel}>Terms & Conditions</Text>
                  <Text style={styles.checkDesc}>
                    By signing up you agree to our Terms & Conditions and Privacy Policy.
                  </Text>
                </View>
              </TouchableOpacity>

              <OrangeButton
                label="Sign Up"
                onPress={handleSignUp}
                loading={loading}
                disabled={!fullName || !email || !terms}
              />
            </View>

          </LinearGradient>
        </KeyboardAvoidingView>

      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.black },
  bg:            { flex: 1, backgroundColor: Colors.black },
  flex:          { flex: 1 },
  logoContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  logo: { width: 180, height: 122 },

  sheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.xxxl,
    paddingBottom: 0,
  },

  formArea: {
    paddingHorizontal: Spacing.lg,
  },

  title: {
    ...Typography.pageTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  fieldLabel: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 12,
    lineHeight: 14,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },

  optional: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 12,
    color: Colors.textMuted,
  },

  field: { marginBottom: Spacing.lg },

  // Dropdown
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: Spacing.sm,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    height: 52,
    paddingHorizontal: Spacing.lg,
  },
  dropdownValue: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  arrowContainer: {
    width: 11,
    height: 5.5,
  },
  arrowContainerUp: {
    transform: [{ rotate: '180deg' }],
  },
  arrowIcon: {
    width: 11,
    height: 5.5,
  },
  cityList: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cityItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDefault,
  },
  cityItemActive: { backgroundColor: 'rgba(255,126,21,0.1)' },
  cityText:       { ...Typography.primaryBody, color: Colors.textPrimary },
  cityTextActive: { color: Colors.accent300 },

  // Fixed bottom
  fixedBottom: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDefault,
    marginTop: Spacing.lg,
  },

  // Checkbox
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.secondarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkBoxOn:   { backgroundColor: Colors.accent300, borderColor: Colors.accent300 },
  checkMark:    { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  checkTextCol: { flex: 1 },
  checkLabel: {
    fontFamily: 'SequelSans-LightBody',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
  },
  checkDesc: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});