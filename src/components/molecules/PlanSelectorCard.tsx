import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, G, RadialGradient, Stop, Defs, Path, Rect, ClipPath } from 'react-native-svg';
import { Colors, Spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CARD_GAP         = 16;
export const CARD_WIDTH       = 240;
export const CARD_HEIGHT      = 308;
export const SIDE_SCALE       = 0.87;
export const SIDE_CARD_WIDTH  = Math.round(CARD_WIDTH * SIDE_SCALE);
export const SIDE_CARD_HEIGHT = Math.round(CARD_HEIGHT * SIDE_SCALE);

export const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
export const SIDE_PADDING     = (SCREEN_WIDTH - CARD_WIDTH) / 2;

export type PlanOption = {
  id: string;
  label: string;
  tabLabel: string;
  description: string;
};

function CardGlow({ width }: { width: number }) {
  return (
    <Svg
      width={width}
      height={Math.round(width * 0.75)}
      viewBox="0 0 240 266"
      style={styles.glowSvg}
    >
      <Defs>
        <RadialGradient
          id="planCardGlow"
          cx="0" cy="0" r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(119.489 101.411) rotate(94.9988) scale(88.2683 76.1682)"
        >
          <Stop offset="0" stopColor="#FF7300" stopOpacity="1" />
          <Stop offset="1" stopColor="#1B1919" stopOpacity="1" />
        </RadialGradient>
      </Defs>
      <Circle
        cx="119.5" cy="90.5" r="90.5"
        fill="url(#planCardGlow)"
        fillOpacity="0.21"
        opacity="0.8"
      />
    </Svg>
  );
}

function CardIcon({ dim }: { dim?: boolean }) {
  return (
    <Svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <G clipPath="url(#planIconClip)" opacity={dim ? 0.41 : 1}>
        <Path
          d="M36 13.5V28.5C36 32.6355 32.6355 36 28.5 36H7.5C3.3645 36 0 32.6355 0 28.5V13.5C0 9.3645 3.3645 6 7.5 6H13.5V4.5C13.5 2.019 15.519 0 18 0C20.481 0 22.5 2.019 22.5 4.5V6H28.5C32.6355 6 36 9.3645 36 13.5ZM16.5 10.5H19.5015V4.5C19.5 3.672 18.8265 3 18 3C17.1735 3 16.5 3.672 16.5 4.5V10.5ZM14.25 18.75C14.25 20.8185 15.9315 22.5 18 22.5C20.0685 22.5 21.75 20.8185 21.75 18.75C21.75 16.6815 20.0685 15 18 15C15.9315 15 14.25 16.6815 14.25 18.75ZM25.452 29.6265C24.6135 26.3655 21.48 24 18 24C14.52 24 11.385 26.3655 10.548 29.6265C10.341 30.429 10.824 31.2465 11.6265 31.4535C12.432 31.662 13.2465 31.1745 13.452 30.3735C13.947 28.4505 15.9015 27 18 27C20.0985 27 22.053 28.4505 22.548 30.3735C22.722 31.05 23.331 31.5 24 31.5C24.123 31.5 24.249 31.485 24.375 31.4535C25.1775 31.2465 25.659 30.429 25.452 29.6265Z"
          fill="white"
        />
      </G>
      <Defs>
        <ClipPath id="planIconClip">
          <Rect width="36" height="36" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

interface PlanSelectorCardProps {
  item: PlanOption;
  isActive: boolean;
  onPress: () => void;
  index: number;
}

export const PlanSelectorCard: React.FC<PlanSelectorCardProps> = ({
  item, isActive, onPress,
}) => {
  const cardW = isActive ? CARD_WIDTH : SIDE_CARD_WIDTH;
  const cardH = isActive ? CARD_HEIGHT : SIDE_CARD_HEIGHT;
  const mt    = isActive ? 0 : (CARD_HEIGHT - SIDE_CARD_HEIGHT) / 2;

const activeInline = {
  width: cardW,
  height: cardH,
  borderRadius: 20,
  paddingHorizontal: 21,
  paddingTop: 21,
  paddingBottom: 32,
  alignItems: 'center' as const,
  justifyContent: 'flex-start' as const,
  overflow: 'hidden' as const,
  backgroundColor: 'transparent',
  borderWidth: 0.5,
  borderColor: 'rgba(255,126,21,0.65)',
  shadowColor: '#FF7300',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 8,
};

const inactiveInline = {
  width: cardW,
  height: cardH,
  borderRadius: 20,
  paddingHorizontal: 21,
  paddingTop: 21,
  paddingBottom: 32,
  alignItems: 'center' as const,
  justifyContent: 'flex-start' as const,
  overflow: 'hidden' as const,
  backgroundColor: 'rgba(28,28,30,0.90)',
};

  const content = (
    <>
      <CardGlow width={cardW} />
      <View style={[styles.iconStack, !isActive && { opacity: 0.41 }]}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <CardIcon dim={!isActive} />
          </View>
        </View>
      </View>
      <Text style={[styles.cardTitle, !isActive && styles.cardTitleDim]}>
        {item.label}
      </Text>
      <Text style={isActive ? styles.cardDesc : styles.cardDescDim}>
        {item.description}
      </Text>
    </>
  );

  return (
    // Fixed width slot — always CARD_WIDTH wide so snap math is consistent
    <View style={{ width: CARD_WIDTH, marginRight: CARD_GAP }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{ marginTop: mt, alignItems: 'center' }}
      >
        <View style={isActive ? activeInline : inactiveInline}>
          {isActive && (
            <LinearGradient
              colors={['rgba(28,28,30,0.90)', 'rgba(21,21,23,0.90)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {content}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  glowSvg: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
  },
  iconStack: {
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconOuter: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: 'rgba(217,217,217,0.11)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconInner: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.27)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.38)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'SequelSans-MediumBody',
    fontSize: 22, lineHeight: 30,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    zIndex: 1,
  },
  cardTitleDim: { color: 'rgba(255,255,255,0.41)' },
  cardDesc: {
    fontFamily: 'SequelSans-LightBody',
    fontSize: 13, lineHeight: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
    zIndex: 1,
  },
  cardDescDim: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 11, lineHeight: 14,
    color: 'rgba(255,255,255,0.41)',
    textAlign: 'center',
  },
});