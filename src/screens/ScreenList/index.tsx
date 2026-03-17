import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREENS: {
  id: number;
  label: string;
  route: keyof RootStackParamList;
  status: 'ready' | 'todo';
}[] = [
  { id: 6,  label: 'Verify OTP',               route: 'OtpScreen',                 status: 'ready' },
  { id: 7,  label: 'Enter Details',             route: 'EnterDetailsScreen',        status: 'ready' },
  { id: 9,  label: 'What Do You Want to Book',  route: 'WhatToBookScreen',          status: 'ready' },
  { id: 12, label: 'Select Pass',               route: 'SelectPassScreen',          status: 'ready' },
  { id: 16, label: 'All Set (On Demand)',        route: 'AllSetOnDemandScreen',      status: 'ready' },
  { id: 10, label: 'Private Cabin Details',     route: 'PrivateCabinDetailsScreen', status: 'ready' },
  { id: 11, label: 'Private Cabin All Set',     route: 'PrivateCabinAllSetScreen',  status: 'ready' },
  { id: 17, label: 'Single Desk',               route: 'SingleDeskScreen',          status: 'ready' },
  { id: 18, label: 'Single Desk All Set',       route: 'SingleDeskAllSetScreen',    status: 'ready' },
];

const FONT_SAMPLES = [
  { label: 'Navigation Title', style: Typography.navigationTitle, font: FontFamily.semiBoldHead },
  { label: 'Page Title',       style: Typography.pageTitle,        font: FontFamily.mediumBody   },
  { label: 'Section Header',   style: Typography.sectionHeader,    font: FontFamily.mediumBody   },
  { label: 'Primary Body',     style: Typography.primaryBody,      font: FontFamily.bookBody     },
  { label: 'Secondary Body',   style: Typography.secondaryBody,    font: FontFamily.lightBody    },
  { label: 'Caption',          style: Typography.caption,          font: FontFamily.bookBody     },
  { label: 'Section Label',    style: Typography.sectionLabel,     font: FontFamily.semiBoldBody },
  { label: 'Small Label',      style: Typography.smallLabel,       font: FontFamily.bookBody     },
  { label: 'Button Text',      style: Typography.buttonText,       font: FontFamily.mediumBody   },
];

const COLOR_SWATCHES = [
  { label: 'background',       color: Colors.background       },
  { label: 'cardSurface',      color: Colors.cardSurface      },
  { label: 'secondarySurface', color: Colors.secondarySurface },
  { label: 'accent300',        color: Colors.accent300        },
  { label: 'accent400',        color: Colors.accent400        },
  { label: 'accent500',        color: Colors.accent500        },
  { label: 'accent200',        color: Colors.accent200        },
  { label: 'accent100',        color: Colors.accent100        },
  { label: 'alert',            color: Colors.alert            },
  { label: 'success',          color: Colors.success          },
  { label: 'textPrimary',      color: Colors.textPrimary      },
  { label: 'textSecondary',    color: Colors.textSecondary    },
  { label: 'textMuted',        color: Colors.textMuted        },
];

const GRADIENTS = [
  {
    label: 'Card Gradient',
    colors: Colors.gradientCard,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  {
    label: 'Orange Gradient',
    colors: Colors.gradientOrange,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  {
    label: 'Blue Gradient',
    colors: Colors.gradientBlue,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
];

export function ScreenList() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = React.useState<'screens' | 'fonts' | 'colors'>('screens');

  return (
    <SafeAreaView style={styles.safe}>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['screens', 'fonts', 'colors'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Screens tab */}
      {tab === 'screens' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Ofis Square</Text>
            <Text style={styles.subtitle}>Screen Navigator</Text>
          </View>
          {SCREENS.map(screen => {
            const isReady = screen.status === 'ready';
            return (
              <TouchableOpacity
                key={screen.id}
                onPress={() => navigation.navigate(screen.route)}
                activeOpacity={0.7}
                style={styles.row}
              >
                <View style={[styles.badge, isReady && styles.badgeReady]}>
                  <Text style={styles.badgeText}>{screen.id}</Text>
                </View>
                <Text style={styles.rowLabel} numberOfLines={1}>{screen.label}</Text>
                <View style={[styles.pill, isReady && styles.pillReady]}>
                  <Text style={[styles.pillText, isReady && styles.pillTextReady]}>
                    {isReady ? '✓ Ready' : 'Placeholder'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Fonts tab */}
      {tab === 'fonts' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Typography</Text>
            <Text style={styles.subtitle}>Sequel Sans font preview</Text>
          </View>
          {FONT_SAMPLES.map(sample => (
            <View key={sample.label} style={styles.fontRow}>
              <Text style={styles.fontMeta}>{sample.label}</Text>
              <Text style={sample.style}>{sample.label}</Text>
              <Text style={styles.fontFamilyLabel}>{sample.font}</Text>
              <View style={styles.divider} />
            </View>
          ))}
        </ScrollView>
      )}

      {/* Colors tab */}
      {tab === 'colors' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Colors</Text>
            <Text style={styles.subtitle}>Design tokens</Text>
          </View>

          <Text style={styles.sectionTitle}>Solid Colors</Text>
          {COLOR_SWATCHES.map(s => (
            <View key={s.label} style={styles.swatchRow}>
              <View style={[styles.swatch, { backgroundColor: s.color, borderWidth: s.color === Colors.background ? 1 : 0, borderColor: Colors.borderDefault }]} />
              <Text style={styles.swatchLabel}>{s.label}</Text>
              <Text style={styles.swatchHex}>{s.color}</Text>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>Gradients</Text>
          {GRADIENTS.map(g => (
            <View key={g.label} style={styles.gradientRow}>
              <LinearGradient
                colors={g.colors}
                start={g.start}
                end={g.end}
                style={styles.gradientSwatch}
              />
              <View style={styles.gradientInfo}>
                <Text style={styles.swatchLabel}>{g.label}</Text>
                <Text style={styles.swatchHex}>{g.colors.join(' → ')}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent300 },
  tabText: { ...Typography.sectionLabel, color: Colors.textSecondary },
  tabTextActive: { color: Colors.accent300 },
  content: { padding: Spacing.xl, paddingBottom: 48 },
  header: { marginBottom: Spacing.xxxl, marginTop: Spacing.lg },
  title: { ...Typography.navigationTitle, color: Colors.textPrimary },
  subtitle: { ...Typography.secondaryBody, color: Colors.textSecondary, marginTop: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md, borderWidth: 1, borderColor: Colors.borderDefault },
  badge: { width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center' },
  badgeReady: { backgroundColor: Colors.accent300 },
  badgeText: { ...Typography.sectionLabel, color: Colors.textPrimary, fontSize: 12 },
  rowLabel: { ...Typography.primaryBody, color: Colors.textPrimary, flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  pillReady: { backgroundColor: 'rgba(0,129,54,0.15)', borderColor: Colors.success },
  pillText: { ...Typography.smallLabel, color: Colors.textSecondary },
  pillTextReady: { color: Colors.success },
  fontRow: { marginBottom: Spacing.xl },
  fontMeta: { ...Typography.caption, color: Colors.accent300, marginBottom: Spacing.xs },
  fontFamilyLabel: { ...Typography.smallLabel, color: Colors.textMuted, marginTop: Spacing.xs },
  divider: { height: 1, backgroundColor: Colors.borderDefault, marginTop: Spacing.md },
  sectionTitle: { ...Typography.sectionHeader, color: Colors.textPrimary, marginBottom: Spacing.lg },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  swatch: { width: 44, height: 44, borderRadius: BorderRadius.sm },
  swatchLabel: { ...Typography.primaryBody, color: Colors.textPrimary, flex: 1 },
  swatchHex: { ...Typography.caption, color: Colors.textSecondary },
  gradientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  gradientSwatch: { width: 80, height: 44, borderRadius: BorderRadius.sm },
  gradientInfo: { flex: 1 },
});