import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

// ── PassCard ───────────────────────────────────────────────────────────────────
export const PassCard: React.FC<{
  title: string; subtitle: string; price: string;
  savingsLabel?: string; selected?: boolean;
  onPress: () => void; style?: ViewStyle;
}> = ({ title, subtitle, price, savingsLabel, selected = false, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.passCard, selected && styles.passCardSelected, style]}>
    <View style={styles.passLeft}>
      <Text style={styles.passTitle}>{title}</Text>
      <Text style={styles.passSub}>{subtitle}</Text>
    </View>
    <View style={styles.passRight}>
      <Text style={styles.passPrice}>{price}</Text>
      {savingsLabel && <Text style={styles.passSavings}>{savingsLabel}</Text>}
    </View>
  </TouchableOpacity>
);

// ── ActionTile ─────────────────────────────────────────────────────────────────
export const ActionTile: React.FC<{
  label: string; icon: React.ReactNode; onPress: () => void; style?: ViewStyle;
}> = ({ label, icon, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.actionTile, style]}>
    <View style={styles.actionIcon}>{icon}</View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── BookingCard ────────────────────────────────────────────────────────────────
export const BookingCard: React.FC<{
  title: string; time: string; location: string;
  imageUri?: string; onMenuPress?: () => void;
  onNavigatePress?: () => void; style?: ViewStyle;
}> = ({ title, time, location, imageUri, onMenuPress, onNavigatePress, style }) => (
  <View style={[styles.bookingCard, style]}>
    {imageUri
      ? <Image source={{ uri: imageUri }} style={styles.bookingImg} />
      : <View style={[styles.bookingImg, styles.bookingImgPlaceholder]} />
    }
    <View style={styles.bookingInfo}>
      <Text style={styles.bookingTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.bookingTime}>{time}</Text>
      <Text style={styles.bookingLocation} numberOfLines={1}>{location}</Text>
    </View>
    <View style={styles.bookingActions}>
      {onMenuPress && (
        <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
          <Text style={styles.menuDots}>•••</Text>
        </TouchableOpacity>
      )}
      {onNavigatePress && (
        <TouchableOpacity onPress={onNavigatePress} style={styles.navBtn}>
          <Text style={styles.navBtnIcon}>⊕</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ── EventCard ──────────────────────────────────────────────────────────────────
export const EventCard: React.FC<{
  title: string; date: string; time: string; location: string;
  imageUri?: string; isRsvpd?: boolean; onRsvp?: () => void; style?: ViewStyle;
}> = ({ title, date, time, location, imageUri, isRsvpd = false, onRsvp, style }) => (
  <View style={[styles.eventCard, style]}>
    <View style={styles.eventImgContainer}>
      {imageUri
        ? <Image source={{ uri: imageUri }} style={styles.eventImg} />
        : <View style={[styles.eventImg, styles.eventImgPlaceholder]} />
      }
      <View style={styles.eventBadgeRow}>
        <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>{date}</Text></View>
        <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>{time}</Text></View>
      </View>
    </View>
    <View style={styles.eventFooter}>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.eventLocation} numberOfLines={1}>{location}</Text>
      </View>
      <TouchableOpacity onPress={onRsvp} style={[styles.rsvpBtn, isRsvpd && styles.rsvpBtnDone]} activeOpacity={0.7}>
        <Text style={styles.rsvpText}>{isRsvpd ? "RSVP'd" : 'RSVP'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  passCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.borderDefault, marginBottom: Spacing.sm },
  passCardSelected: { borderColor: Colors.accent300, backgroundColor: 'rgba(255,126,21,0.08)' },
  passLeft: { flex: 1 },
  passRight: { alignItems: 'flex-end' },
  passTitle: { ...Typography.sectionHeader, color: Colors.textPrimary },
  passSub: { ...Typography.secondaryBody, marginTop: 2 },
  passPrice: { ...Typography.sectionHeader, color: Colors.textPrimary },
  passSavings: { ...Typography.secondaryBody, color: Colors.accent300, marginTop: 2 },
  actionTile: { flex: 1, backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: Colors.borderDefault, minHeight: 72 },
  actionIcon: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  bookingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.borderDefault },
  bookingImg: { width: 56, height: 56, borderRadius: BorderRadius.sm },
  bookingImgPlaceholder: { backgroundColor: Colors.borderDefault },
  bookingInfo: { flex: 1 },
  bookingTitle: { ...Typography.sectionLabel, color: Colors.textPrimary },
  bookingTime: { ...Typography.secondaryBody, marginTop: 2 },
  bookingLocation: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  bookingActions: { gap: 8 },
  menuBtn: { padding: 4 },
  menuDots: { color: Colors.textSecondary, fontSize: 14, letterSpacing: 1 },
  navBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  navBtnIcon: { color: Colors.white, fontSize: 14 },
  eventCard: { backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, overflow: 'hidden', width: 200 },
  eventImgContainer: { position: 'relative' },
  eventImg: { width: '100%', height: 120 },
  eventImgPlaceholder: { backgroundColor: Colors.borderDefault },
  eventBadgeRow: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 6 },
  eventBadge: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  eventBadgeText: { ...Typography.caption, color: Colors.black, fontWeight: '600' },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  eventInfo: { flex: 1, marginRight: 8 },
  eventTitle: { ...Typography.sectionLabel, color: Colors.textPrimary },
  eventLocation: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  rsvpBtn: { backgroundColor: Colors.accent300, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  rsvpBtnDone: { backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.accent300 },
  rsvpText: { ...Typography.smallLabel, color: Colors.white, fontWeight: '700' },
});
