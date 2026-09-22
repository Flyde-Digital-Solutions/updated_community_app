import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ScreenEntry = {
  id: number | string;
  label: string;
  route: keyof RootStackParamList;
  status: 'ready' | 'todo';
  group: string;
};

const SCREENS: ScreenEntry[] = [
  // ── Signup Flow ──────────────────────────────────────────────
  { id: 6,  label: 'Verify OTP',               route: 'OtpScreen',                 status: 'ready', group: 'Signup Flow' },
  { id: 7,  label: 'Enter Details',            route: 'EnterDetailsScreen',        status: 'ready', group: 'Signup Flow' },
  { id: 9,  label: 'What Do You Want to Book', route: 'WhatToBookScreen',          status: 'ready', group: 'Signup Flow' },
  { id: 12, label: 'Select Pass',              route: 'SelectPassScreen',          status: 'ready', group: 'Signup Flow' },
  { id: 16, label: 'All Set (On Demand)',       route: 'AllSetOnDemandScreen',      status: 'ready', group: 'Signup Flow' },
  { id: 10, label: 'Private Cabin Details',    route: 'PrivateCabinDetailsScreen', status: 'ready', group: 'Signup Flow' },
  { id: 11, label: 'Private Cabin All Set',    route: 'PrivateCabinAllSetScreen',  status: 'ready', group: 'Signup Flow' },
  { id: 17, label: 'Single Desk',              route: 'SingleDeskScreen',          status: 'ready', group: 'Signup Flow' },
  { id: 18, label: 'Single Desk All Set',      route: 'SingleDeskAllSetScreen',    status: 'todo',  group: 'Signup Flow' },

  // ── Community App ─────────────────────────────────────────────
  { id: 'C1',  label: 'Home',                  route: 'HomeScreen',                status: 'ready', group: 'Community App' },
  { id: 'C2',  label: 'All Tickets',           route: 'AllTicketsScreen',          status: 'ready',  group: 'Community App' },
  { id: 'C3',  label: 'Ticket Detail',         route: 'TicketDetailScreen',        status: 'ready',  group: 'Community App' },
  { id: 'C4',  label: 'All Day Passes',        route: 'AllDayPassesScreen',        status: 'ready',  group: 'Community App' },
  { id: 'C5',  label: 'Day Pass Detail',       route: 'DayPassDetailScreen',       status: 'ready',  group: 'Community App' },
  { id: 'C6',  label: 'KYC Verification',      route: 'KycVerificationScreen',     status: 'ready',  group: 'Community App' },
  { id: 'C7',  label: 'All Room Bookings',     route: 'AllRoomBookingsScreen',     status: 'ready',  group: 'Community App' },
  { id: 'C8',  label: 'Add Room Booking',      route: 'AddRoomBookingScreen',      status: 'ready',  group: 'Community App' },
  { id: 'C9',  label: 'Notifications',         route: 'NotificationsScreen',       status: 'ready',  group: 'Community App' },
  { id: 'C10', label: 'View Guests',           route: 'ViewGuestsScreen',          status: 'ready',  group: 'Community App' },
  { id: 'C11', label: 'Scan Visitor',          route: 'ScanVisitorScreen',         status: 'todo',  group: 'Community App' },
  { id: 'C12', label: 'Inventory',             route: 'InventoryScreen',           status: 'ready',  group: 'Community App' },
  { id: 'C13', label: 'Cabin Detail',          route: 'CabinDetailScreen',         status: 'todo',  group: 'Community App' },
  { id: 'C14', label: 'Members',               route: 'MembersScreen',             status: 'ready',  group: 'Community App' },
  { id: 'C15', label: 'Member Detail',         route: 'MemberDetailScreen',        status: 'ready',  group: 'Community App' },
  { id: 'C16', label: 'Company Detail',        route: 'CompanyDetailScreen',       status: 'todo',  group: 'Community App' },
  { id: 'C17', label: 'Profile',               route: 'ProfileScreen',             status: 'todo',  group: 'Community App' },
  { id: 'O1', label: 'Operations Hub',          route: 'OperationsHubScreen',       status: 'ready', group: 'Operations' },
  { id: 'O2', label: 'Events',                  route: 'EventsScreen',              status: 'ready', group: 'Operations' },
  { id: 'O3', label: 'Community',               route: 'CommunityScreen',           status: 'ready', group: 'Operations' },
  { id: 'O4', label: 'Leads',                   route: 'LeadsScreen',               status: 'ready', group: 'Operations' },
  { id: 'O5', label: 'RFID Cards',              route: 'RfidCardsScreen',           status: 'ready', group: 'Operations' },
  { id: 'O6', label: 'Printer Requests',        route: 'PrinterRequestsScreen',     status: 'ready', group: 'Operations' },
  { id: 'O7', label: 'Billing',                 route: 'BillingScreen',             status: 'ready', group: 'Operations' },
  { id: 'O9', label: 'Common Areas',            route: 'CommonAreasScreen',         status: 'ready', group: 'Operations' },
  { id: 'O10', label: 'Book Day Pass',          route: 'BookDayPassScreen',         status: 'ready', group: 'Operations' },
  { id: 'O11', label: 'On-demand Users',         route: 'OnDemandUsersScreen',       status: 'ready', group: 'Operations' },
  { id: 'O12', label: 'Meeting Rooms',           route: 'MeetingRoomsInventoryScreen', status: 'ready', group: 'Operations' },
];

const GROUPS = ['Signup Flow', 'Community App', 'Operations'];

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

          {GROUPS.map(group => (
            <View key={group}>
              {/* Group header */}
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{group}</Text>
              </View>

              {SCREENS.filter(s => s.group === group).map(screen => {
                const isReady = screen.status === 'ready';
                return (
                  <TouchableOpacity
                    key={String(screen.id)}
                    onPress={() => navigation.navigate(screen.route as any)}
                    activeOpacity={0.7}
                    style={styles.row}
                  >
                    <View style={[styles.badge, isReady && styles.badgeReady]}>
                      <Text style={styles.badgeText}>{isReady ? '✓' : '•'}</Text>
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
            </View>
          ))}
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
              <View style={[
                styles.swatch,
                { backgroundColor: s.color },
                s.color === Colors.background ? { borderWidth: 1, borderColor: Colors.borderDefault } : {},
              ]} />
              <Text style={styles.swatchLabel}>{s.label}</Text>
              <Text style={styles.swatchHex}>{s.color}</Text>
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
  title:  { ...Typography.navigationTitle, color: Colors.textPrimary },
  subtitle: { ...Typography.secondaryBody, color: Colors.textSecondary, marginTop: Spacing.xs },

  // Group
  groupHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDefault,
  },
  groupLabel: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 11,
    color: Colors.accent300,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  badge: {
    width: 36, height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.secondarySurface,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeReady: { backgroundColor: Colors.accent300 },
  badgeText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textPrimary },
  rowLabel:   { ...Typography.primaryBody, color: Colors.textPrimary, flex: 1 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  pillReady:     { backgroundColor: 'rgba(0,129,54,0.15)', borderColor: Colors.success },
  pillText:      { ...Typography.smallLabel, color: Colors.textSecondary },
  pillTextReady: { color: Colors.success },

  // Fonts
  fontRow:         { marginBottom: Spacing.xl },
  fontMeta:        { ...Typography.caption, color: Colors.accent300, marginBottom: Spacing.xs },
  fontFamilyLabel: { ...Typography.smallLabel, color: Colors.textMuted, marginTop: Spacing.xs },
  divider:         { height: 1, backgroundColor: Colors.borderDefault, marginTop: Spacing.md },

  // Colors
  sectionTitle: { ...Typography.sectionHeader, color: Colors.textPrimary, marginBottom: Spacing.lg },
  swatchRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  swatch:       { width: 44, height: 44, borderRadius: BorderRadius.sm },
  swatchLabel:  { ...Typography.primaryBody, color: Colors.textPrimary, flex: 1 },
  swatchHex:    { ...Typography.caption, color: Colors.textSecondary },
});
