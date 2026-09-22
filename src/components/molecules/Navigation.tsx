import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

// ── TopBar ─────────────────────────────────────────────────────────────────────
interface TopBarProps {
  companyName?: string;
  location?: string;
  onLocationPress?: () => void;
  onBellPress?: () => void;
  hasNotification?: boolean;
  style?: ViewStyle;
}

export const TopBar: React.FC<TopBarProps> = ({
  companyName, location, onLocationPress, onBellPress, hasNotification = false, style,
}) => (
  <View style={[styles.topBar, style]}>
    <TouchableOpacity style={styles.topLeft} onPress={onLocationPress} activeOpacity={0.7}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarIcon}>📍</Text>
      </View>
      <View style={styles.topText}>
        {companyName && <Text style={styles.companyName} numberOfLines={1}>{companyName}</Text>}
        {location && <Text style={styles.locationText} numberOfLines={1}>{location}</Text>}
      </View>
    </TouchableOpacity>
    <TouchableOpacity onPress={onBellPress} style={styles.bellBtn} activeOpacity={0.7}>
      <Text style={styles.bellIcon}>🔔</Text>
      {hasNotification && <View style={styles.notifDot} />}
    </TouchableOpacity>
  </View>
);

// ── SectionHeader ──────────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{
  title: string; onViewAll?: () => void; style?: ViewStyle;
}> = ({ title, onViewAll, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
        <Text style={styles.viewAll}>View All</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── NavBar ─────────────────────────────────────────────────────────────────────
export type NavTab = 'home' | 'bookings' | 'events' | 'profile';

const tabs: { key: NavTab; label: string; icon: string }[] = [
  { key: 'home',     label: 'Home',     icon: '⌂' },
  { key: 'bookings', label: 'Bookings', icon: '📋' },
  { key: 'events',   label: 'Events',   icon: '🎭' },
  { key: 'profile',  label: 'Profile',  icon: '👤' },
];

export const NavBar: React.FC<{
  activeTab: NavTab; onTabPress: (tab: NavTab) => void; style?: ViewStyle;
}> = ({ activeTab, onTabPress, style }) => (
  <View style={[styles.navBar, style]}>
    {tabs.map(tab => {
      const isActive = tab.key === activeTab;
      return (
        <TouchableOpacity key={tab.key} onPress={() => onTabPress(tab.key)} style={styles.navTab} activeOpacity={0.7}>
          <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{tab.icon}</Text>
          <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
          {isActive && <View style={styles.activeDot} />}
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── BackHeader ─────────────────────────────────────────────────────────────────
export const BackHeader: React.FC<{
  title?: string; onBack: () => void; rightElement?: React.ReactNode; style?: ViewStyle;
}> = ({ title, onBack, rightElement, style }) => (
  <View style={[styles.backHeader, style]}>
    <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
      <Text style={styles.backArrow}>‹</Text>
    </TouchableOpacity>
    {title && <Text style={styles.backTitle}>{title}</Text>}
    <View style={styles.backRight}>{rightElement ?? null}</View>
  </View>
);

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  topLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  avatarIcon: { fontSize: 18 },
  topText: { flex: 1 },
  companyName: { ...Typography.sectionLabel, color: Colors.textPrimary },
  locationText: { ...Typography.secondaryBody, color: Colors.textSecondary },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center' },
  bellIcon: { fontSize: 16 },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent300 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.sectionHeader, color: Colors.textPrimary },
  viewAll: { ...Typography.sectionLabel, color: Colors.accent300 },
  navBar: { flexDirection: 'row', backgroundColor: Colors.cardSurface, borderTopWidth: 1, borderTopColor: Colors.borderDefault, paddingBottom: 24, paddingTop: 12 },
  navTab: { flex: 1, alignItems: 'center', gap: 4 },
  navIcon: { fontSize: 20, color: Colors.textSecondary },
  navIconActive: { color: Colors.accent300 },
  navLabel: { ...Typography.smallLabel, color: Colors.textSecondary },
  navLabelActive: { color: Colors.accent300 },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent300, marginTop: 2 },
  backHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, justifyContent: 'space-between' },
  backBtn: { width: 36 },
  backArrow: { color: Colors.textPrimary, fontSize: 28, fontWeight: '300' },
  backTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  backRight: { width: 36, alignItems: 'flex-end' },
});
