import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground,
  Image, TouchableOpacity, FlatList, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { OrangeButton } from '../../components/atoms/OrangeButton';
import {
  PlanSelectorCard,
  CARD_HEIGHT,
  SNAP_INTERVAL,
  SIDE_PADDING,
} from '../../components/molecules/PlanSelectorCard';
import type { PlanOption } from '../../components/molecules/PlanSelectorCard';

const BG   = { uri: 'https://ik.imagekit.io/p1zreiw3z/preview.jpg' };
const LOGO = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png' };

type Nav = NativeStackNavigationProp<RootStackParamList>;
type BookingOption = PlanOption & { route: keyof RootStackParamList };

const OPTIONS: BookingOption[] = [
  {
    id: 'privateCabin',
    label: 'Private Cabin',
    tabLabel: 'Private Cabin',
    description: 'Your own dedicated cabin for your team. Perfect for focused, private work with all amenities included.',
    route: 'PrivateCabinDetailsScreen',
  },
  {
    id: 'onDemand',
    label: 'On-Demand',
    tabLabel: 'On Demand',
    description: 'Work your way, just for the day. Grab a Day Pass and enjoy high-speed Wi-Fi, comfortable workstations, and a focused, vibrant co-working vibe.',
    route: 'SelectPassScreen',
  },
  {
    id: 'singleDesk',
    label: 'Single Desk',
    tabLabel: 'Single Desk',
    description: 'Your own permanent desk in a shared open space. A cost-effective way to enjoy a professional workspace.',
    route: 'SingleDeskScreen',
  },
  {
    id: 'virtualOffice',
    label: 'Virtual Office',
    tabLabel: 'Virtual Office',
    description: 'Get a prestigious business address and mail handling services without a physical space.',
    route: 'SingleDeskScreen',
  },
];

export function WhatToBookScreen() {
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  const handleTabPress = (index: number) => {
    if (index === activeIdx) return;
    Vibration.vibrate(40);
    setActiveIdx(index);
    flatListRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: true,
    });
  };

  const handleContinue = () => {
    navigation.navigate(OPTIONS[activeIdx].route);
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">

        <LinearGradient
          colors={['rgba(0,0,0,0)', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: .8 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Carousel */}
        <View style={[styles.carouselContainer, { height: CARD_HEIGHT + 8 }]}>
          <FlatList
            ref={flatListRef}
            data={OPTIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToOffsets={OPTIONS.map((_, i) => i * SNAP_INTERVAL)}
            contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
            initialScrollIndex={1}
            getItemLayout={(_, index) => ({
              length: SNAP_INTERVAL,
              offset: SNAP_INTERVAL * index,
              index,
            })}
            onMomentumScrollEnd={e => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / SNAP_INTERVAL
              );
              const clamped = Math.max(0, Math.min(idx, OPTIONS.length - 1));
              if (clamped !== activeIdx) {
                Vibration.vibrate(40);
                setActiveIdx(clamped);
              }
            }}
            renderItem={({ item, index }) => (
              <PlanSelectorCard
                item={item}
                index={index}
                isActive={index === activeIdx}
                onPress={() => handleTabPress(index)}
              />
            )}
            keyExtractor={item => item.id}
          />
        </View>

        {/* Tab pills */}
        <View style={styles.tabsRow}>
          {OPTIONS.map((opt, index) => {
            const isActive = index === activeIdx;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => handleTabPress(index)}
                activeOpacity={0.7}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {opt.tabLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.bottomTitle}>What do you want to book?</Text>
          <Text style={styles.bottomSubtitle}>Choose what fits your needs</Text>
          <OrangeButton label="Continue" onPress={handleContinue} />
        </View>

      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  bg:   { flex: 1 },

  logoContainer: {
    alignItems: 'center',
    paddingTop: 94,
    zIndex: 1,
  },
  logo: { width: 124, height: 84 },

  carouselContainer: {
    marginTop: Spacing.lg,
    zIndex: 1,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    zIndex: 1,
  },
  tab: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.secondarySurface,
  },
  tabActive: { backgroundColor: 'rgba(60, 28, 2, 0.4)' },
  tabText: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 11, lineHeight: 14,
    color: Colors.textPrimary,
  },
  tabTextActive: { color: Colors.accent300 },

  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    zIndex: 1,
  },
  bottomTitle: {
    ...Typography.pageTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  bottomSubtitle: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 15, lineHeight: 20,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});