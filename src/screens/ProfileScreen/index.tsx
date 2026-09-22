import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useApp } from '../../context/AppContext';
import { getInitials } from '../../utils/userDisplay';
import { openExternalLink } from '../../utils/openExternalLink';

export function ProfileScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout, connection, pendingOperations, syncAll, resetLocalData } = useApp();

  const PROFILE = {
    name:  user?.name || '',
    role:  user?.role || '',
    email: user?.email || '',
    phone: user?.phone || '',
    space: user?.buildingName || '',
  };
  const connectionLabel = connection === 'online' ? 'Connected' : connection === 'checking' ? 'Syncing…' : 'Offline mode';
  const connectionDetail = connection === 'checking' ? 'Refreshing account data' : `${pendingOperations.length} changes waiting to sync`;
  const connectionIcon = connection === 'online' ? 'cloud-check-outline' : connection === 'checking' ? 'cloud-sync-outline' : 'cloud-off-outline';
  const connectionColor = connection === 'online' ? Colors.success : Colors.accent300;
  const callProfilePhone = () => PROFILE.phone
    ? openExternalLink(`tel:${PROFILE.phone.replace(/\s/g, '')}`, 'Calling is not available on this device.')
    : Alert.alert('Details unavailable', 'No phone number is available for this profile.');
  const emailProfile = () => PROFILE.email
    ? openExternalLink(`mailto:${PROFILE.email}`, 'Email is not available on this device.')
    : Alert.alert('Details unavailable', 'No email address is available for this profile.');

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(PROFILE.name)}
            </Text>
          </View>
          <Text style={styles.name}>{PROFILE.name}</Text>
          <Text style={styles.role}>{PROFILE.role}</Text>
          {PROFILE.space ? (
            <View style={styles.spaceBadge}>
              <Icon name="office-building-outline" size={13} color={Colors.accent300} />
              <Text style={styles.spaceText}>{PROFILE.space}</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <Text style={styles.sectionLabel}>Contact Info</Text>
        <View style={styles.card}>
          <TouchableOpacity
            onPress={callProfilePhone}
            style={styles.infoRow}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(48,188,237,0.15)' }]}>
              <Icon name="phone-outline" size={18} color="#30BCED" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={[styles.infoValue, { color: '#30BCED' }]}>{PROFILE.phone}</Text>
            </View>
            <Icon name="chevron-right" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={emailProfile}
            style={styles.infoRow}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(255,126,21,0.15)' }]}>
              <Icon name="email-outline" size={18} color={Colors.accent300} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={[styles.infoValue, { color: Colors.accent300 }]}>{PROFILE.email}</Text>
            </View>
            <Icon name="chevron-right" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Data & Sync</Text>
        <View style={styles.card}>
          <TouchableOpacity onPress={syncAll} style={styles.infoRow} activeOpacity={0.7}>
            <View style={styles.infoIconWrap}>
              <Icon name={connectionIcon} size={20} color={connectionColor} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoValue}>{connectionLabel}</Text>
              <Text style={styles.infoLabel}>{connectionDetail}</Text>
            </View>
            <Icon name="sync" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={() => Alert.alert(
              'Clear local data?',
              'This removes locally cached records and pending changes. The records will reload when the service is available.',
              [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: resetLocalData }],
            )}
            style={styles.infoRow}
            activeOpacity={0.7}
          >
            <View style={styles.infoIconWrap}><Icon name="database-refresh-outline" size={20} color={Colors.textSecondary} /></View>
            <Text style={[styles.infoValue, styles.infoText]}>Clear local cached data</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        {!showLogoutConfirm ? (
          <TouchableOpacity
            onPress={() => setShowLogoutConfirm(true)}
            style={styles.logoutBtn}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={20} color={Colors.alert} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.logoutConfirm}>
            <Text style={styles.logoutConfirmText}>Are you sure you want to log out?</Text>
            <View style={styles.logoutConfirmBtns}>
              <TouchableOpacity
                onPress={() => setShowLogoutConfirm(false)}
                style={styles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={logout}
                style={styles.confirmLogoutBtn}
                activeOpacity={0.8}
              >
                <Icon name="logout" size={16} color={Colors.white} />
                <Text style={styles.confirmLogoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.version}>OSPLCommunity v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },

  scrollContent: { padding: Spacing.lg },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.accent300,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,126,21,0.30)',
  },
  avatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 30, color: Colors.white },
  name:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 22, color: Colors.textPrimary },
  role:       { ...Typography.secondaryBody, color: Colors.textSecondary },
  spaceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,126,21,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,126,21,0.30)',
  },
  spaceText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.accent300 },

  sectionLabel: {
    fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11,
    color: Colors.textSecondary, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.md,
  },

  // Card
  card: {
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginBottom: Spacing.xl, overflow: 'hidden',
  },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  infoIconWrap:{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  infoText:    { flex: 1 },
  infoLabel:   { ...Typography.caption, color: Colors.textSecondary, marginBottom: 2 },
  infoValue:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textPrimary },
  divider:     { height: 1, backgroundColor: Colors.borderDefault },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(229,67,57,0.10)',
    borderWidth: 1, borderColor: 'rgba(229,67,57,0.30)',
    marginBottom: Spacing.xl,
  },
  logoutText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.alert },

  logoutConfirm: {
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1,
    borderColor: 'rgba(229,67,57,0.30)', marginBottom: Spacing.xl, gap: Spacing.lg,
  },
  logoutConfirmText: { ...Typography.primaryBody, color: Colors.textPrimary, textAlign: 'center' },
  logoutConfirmBtns: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1, borderColor: Colors.borderDefault,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textSecondary },
  confirmLogoutBtn: {
    flex: 1, height: 46, borderRadius: BorderRadius.md,
    backgroundColor: Colors.alert,
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: Spacing.sm,
  },
  confirmLogoutText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.white },

  version: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
});
