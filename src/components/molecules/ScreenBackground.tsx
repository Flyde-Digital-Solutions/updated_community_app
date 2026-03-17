import React from 'react';
import { View, ImageBackground, Image, StyleSheet, StatusBar } from 'react-native';
import { Colors } from '../../theme';

const LOGO_URI = 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png';

const logoSizes = {
  small:  { width: 120, height: 48 },
  medium: { width: 160, height: 64 },
  large:  { width: 220, height: 88 },
};

interface Props {
  children: React.ReactNode;
  showLogo?: boolean;
  logoSize?: 'small' | 'medium' | 'large';
  overlayOpacity?: number;
}

export const ScreenBackground: React.FC<Props> = ({
  children, showLogo = true, logoSize = 'medium', overlayOpacity = 0.55,
}) => {
  const size = logoSizes[logoSize];
  return (
    <ImageBackground
      source={require('../../assets/images/bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]} />
      {showLogo && (
        <View style={styles.logoContainer}>
          <Image source={{ uri: LOGO_URI }} style={size} resizeMode="contain" />
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  logoContainer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 80, zIndex: 1 },
  content: { flex: 1, zIndex: 2 },
});