import React, { useState } from 'react';
import {
  Alert, View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Modal, TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import { BackendRecordUnavailable } from '../../components/BackendRecordUnavailable';
import { openExternalLink } from '../../utils/openExternalLink';
import { formatTimeRange } from '../../utils/timeRange';

type RouteProps = RouteProp<RootStackParamList, 'MemberDetailScreen'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyId: string;
  companyName: string;
  cabin: string;
  floor: string;
  memberSince?: string;
  status: 'Active' | 'Inactive';
  gender?: 'Male' | 'Female' | 'Other';
  role: string;
  bio?: string;
  openTickets: { id: string; title: string; status: string; category: string; raisedAt: string }[];
  recentBookings: { id: string; room: string; date: string; time: string; status: string }[];
  recentPasses: { id: string; date: string; checkInStatus: string; checkInTime?: string }[];
}

const FLOOR_COLORS: Record<string, string> = {
  'Floor 1': '#30BCED',
  'Floor 2': '#A78BFA',
  'Floor 3': '#F472B6',
};

const GENDER_COLORS = { Male: '#30BCED', Female: '#F472B6', Other: Colors.textSecondary };

const TICKET_STATUS_COLORS: Record<string, string> = {
  'Open':        Colors.alert,
  'In Progress': '#30BCED',
  'Resolved':    Colors.success,
  'Closed':      Colors.textMuted,
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  'Confirmed':   Colors.success,
  'In Progress': '#30BCED',
  'Completed':   Colors.textMuted,
  'Cancelled':   Colors.alert,
  'Pending':     Colors.accent300,
};

// ── Direct Notification Modal ─────────────────────────────────────────────────
function DirectNotificationModal({
  visible, memberId, memberName, onClose, bottomInset,
}: {
  visible: boolean; memberId: string; memberName: string; onClose: () => void; bottomInset: number;
}) {
  const { sendNotification } = useApp();
  const [title,   setTitle]   = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      await sendNotification({ type: 'Announcement', title: title.trim(), message: message.trim(), audience: memberName, memberId });
      setSent(true);
      setTimeout(() => { setSent(false); setTitle(''); setMessage(''); onClose(); }, 900);
    } catch (error) {
      Alert.alert('Notification not sent', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modalStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[modalStyles.sheet, { paddingBottom: bottomInset + 24 }]}>
          <View style={modalStyles.handle} />

          {sent ? (
            <View style={modalStyles.sentState}>
              <Icon name="check-circle" size={48} color={Colors.success} />
              <Text style={modalStyles.sentTitle}>Notification Sent!</Text>
              <Text style={modalStyles.sentSub}>Message delivered to {memberName}.</Text>
            </View>
          ) : (
            <>
              <Text style={modalStyles.title}>Send Notification</Text>
              <Text style={modalStyles.subtitle}>to {memberName}</Text>

              <Text style={modalStyles.label}>Title</Text>
              <View style={modalStyles.inputWrapper}>
                <TextInput
                  style={modalStyles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Notification title..."
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <Text style={modalStyles.label}>Message</Text>
              <View style={modalStyles.messageWrapper}>
                <TextInput
                  style={modalStyles.messageInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Write your message..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                onPress={handleSend}
                disabled={!title.trim() || !message.trim() || sending}
                style={[modalStyles.sendBtn, (!title.trim() || !message.trim() || sending) && { opacity: 0.4 }]}
                activeOpacity={0.8}
              >
                <Icon name={sending ? 'loading' : 'send'} size={18} color={Colors.white} />
                <Text style={modalStyles.sendBtnText}>{sending ? 'Sending...' : 'Send Notification'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function MemberDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<RouteProps>();
  const insets     = useSafeAreaInsets();
  const memberId   = route.params.memberId;
  const { members, tickets, bookings, dayPasses } = useApp();
  const storedMember = members.find(item => item.id === memberId);
  const member: Member | null = storedMember ? {
    id: storedMember.id, name: storedMember.name, phone: storedMember.phone, email: storedMember.email,
    companyId: storedMember.companyId, companyName: storedMember.company, cabin: storedMember.cabin, floor: storedMember.floor,
    memberSince: storedMember.memberSince, status: storedMember.status, gender: storedMember.gender, role: storedMember.role, bio: storedMember.bio,
    openTickets: tickets.filter(item => item.memberName === storedMember.name).map(item => ({ id: item.id, title: item.subject, status: item.status, category: item.category, raisedAt: new Date(item.createdAt).toLocaleString('en-IN') })),
    recentBookings: bookings.filter(item => item.memberId === storedMember.id || item.memberName === storedMember.name).map(item => ({ id: item.id, room: item.room, date: item.date, time: formatTimeRange(item.startTime, item.endTime), status: item.status })),
    recentPasses: dayPasses.filter(item => item.name === storedMember.name).map(item => ({ id: item.id, date: item.date, checkInStatus: item.status })),
  } : null;

  const [showNotifModal, setShowNotifModal] = useState(false);

  if (!member) {
    return <BackendRecordUnavailable title="Member" onBack={() => navigation.goBack()} />;
  }

  const floorColor  = FLOOR_COLORS[member.floor] ?? Colors.textSecondary;
  const genderColor = member.gender ? GENDER_COLORS[member.gender] : Colors.textSecondary;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Member</Text>
          <TouchableOpacity
            onPress={() => setShowNotifModal(true)}
            style={styles.notifBtn}
            activeOpacity={0.7}
          >
            <Icon name="bell-plus-outline" size={20} color={Colors.accent300} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { borderColor: genderColor }]}>
                <Text style={styles.avatarText}>
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              {member.gender && <View style={[styles.genderDot, { backgroundColor: genderColor }]} />}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Icon name="shield-check" size={16} color={Colors.success} />
              </View>
              <Text style={styles.memberRole}>{member.role}</Text>
              <View style={[styles.statusBadge, member.status === 'Active'
                ? { backgroundColor: 'rgba(0,129,54,0.15)', borderColor: Colors.success }
                : { backgroundColor: Colors.secondarySurface, borderColor: Colors.borderDefault }
              ]}>
                <View style={[styles.statusDot, { backgroundColor: member.status === 'Active' ? Colors.success : Colors.textMuted }]} />
                <Text style={[styles.statusText, { color: member.status === 'Active' ? Colors.success : Colors.textMuted }]}>
                  {member.status}
                </Text>
              </View>
            </View>
          </View>

          {member.bio && <Text style={styles.bio}>{member.bio}</Text>}

          <View style={styles.profileMeta}>
            {!!member.memberSince && <View style={styles.profileMetaItem}>
              <Icon name="calendar-account" size={14} color={Colors.textMuted} />
              <Text style={styles.profileMetaText}>Member since {member.memberSince}</Text>
            </View>}
            <View style={[styles.cabinBadge, { backgroundColor: `${floorColor}18` }]}>
              <Icon name="office-building" size={12} color={floorColor} />
              <Text style={[styles.cabinBadgeText, { color: floorColor }]}>{member.cabin} · {member.floor}</Text>
            </View>
          </View>
        </View>

        {/* Contact Actions */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            onPress={() => openExternalLink(`tel:${member.phone}`, 'Calling is not available on this device.')}
            style={styles.contactBtn}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(48,188,237,0.15)' }]}>
              <Icon name="phone-outline" size={22} color="#30BCED" />
            </View>
            <Text style={styles.contactBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openExternalLink(`whatsapp://send?phone=${member.phone.replace(/\D/g, '')}`, 'WhatsApp is not installed on this device.')}
            style={styles.contactBtn}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(37,211,102,0.15)' }]}>
              <Icon name="whatsapp" size={22} color="#25D366" />
            </View>
            <Text style={styles.contactBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openExternalLink(`mailto:${member.email}`, 'Email is not available on this device.')}
            style={styles.contactBtn}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(255,126,21,0.15)' }]}>
              <Icon name="email-outline" size={22} color={Colors.accent300} />
            </View>
            <Text style={styles.contactBtnText}>Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowNotifModal(true)}
            style={styles.contactBtn}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
              <Icon name="bell-plus-outline" size={22} color="#A78BFA" />
            </View>
            <Text style={styles.contactBtnText}>Notify</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <Text style={styles.sectionLabel}>Contact Info</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Icon name="phone" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Phone</Text>
            <TouchableOpacity onPress={() => openExternalLink(`tel:${member.phone}`, 'Calling is not available on this device.')} activeOpacity={0.7}>
              <Text style={[styles.infoValue, { color: '#30BCED' }]}>{member.phone}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="email-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Email</Text>
            <TouchableOpacity onPress={() => openExternalLink(`mailto:${member.email}`, 'Email is not available on this device.')} activeOpacity={0.7}>
              <Text style={[styles.infoValue, { color: Colors.accent300 }]}>{member.email}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="gender-male-female" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={[styles.infoValue, { color: genderColor }]}>{member.gender}</Text>
          </View>
        </View>

        {/* Company */}
        <Text style={styles.sectionLabel}>Company</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CompanyDetailScreen', { companyId: member.companyId })}
          style={styles.companyCard}
          activeOpacity={0.7}
        >
          <View style={styles.companyAvatar}>
            <Text style={styles.companyAvatarText}>
              {member.companyName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{member.companyName}</Text>
            <View style={[styles.cabinBadge, { backgroundColor: `${floorColor}18` }]}>
              <Icon name="office-building" size={11} color={floorColor} />
              <Text style={[styles.cabinBadgeText, { color: floorColor }]}>{member.cabin} · {member.floor}</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={18} color={Colors.accent300} />
        </TouchableOpacity>

        {/* Open Tickets */}
        {member.openTickets.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Open Tickets</Text>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{member.openTickets.length}</Text>
              </View>
            </View>
            <View style={styles.card}>
              {member.openTickets.map((ticket, i) => (
                <View key={ticket.id}>
                  <View style={styles.ticketRow}>
                    <View style={[styles.ticketDot, { backgroundColor: TICKET_STATUS_COLORS[ticket.status] ?? Colors.textMuted }]} />
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketTitle}>{ticket.title}</Text>
                      <Text style={styles.ticketMeta}>{ticket.category} · {ticket.raisedAt}</Text>
                    </View>
                    <View style={[styles.ticketStatusBadge, { backgroundColor: `${TICKET_STATUS_COLORS[ticket.status]}22`, borderColor: TICKET_STATUS_COLORS[ticket.status] ?? Colors.borderDefault }]}>
                      <Text style={[styles.ticketStatusText, { color: TICKET_STATUS_COLORS[ticket.status] }]}>{ticket.status}</Text>
                    </View>
                  </View>
                  {i < member.openTickets.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent Room Bookings */}
        {member.recentBookings.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recent Room Bookings</Text>
            <View style={styles.card}>
              {member.recentBookings.map((booking, i) => (
                <View key={booking.id}>
                  <View style={styles.bookingRow}>
                    <View style={[styles.bookingIconWrap, { backgroundColor: `${BOOKING_STATUS_COLORS[booking.status]}22` }]}>
                      <Icon name="door-open" size={16} color={BOOKING_STATUS_COLORS[booking.status] ?? Colors.textSecondary} />
                    </View>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingRoom}>{booking.room}</Text>
                      <Text style={styles.bookingMeta}>{booking.date} · {booking.time}</Text>
                    </View>
                    <View style={[styles.bookingStatusBadge, { backgroundColor: `${BOOKING_STATUS_COLORS[booking.status]}22`, borderColor: BOOKING_STATUS_COLORS[booking.status] ?? Colors.borderDefault }]}>
                      <Text style={[styles.bookingStatusText, { color: BOOKING_STATUS_COLORS[booking.status] }]}>{booking.status}</Text>
                    </View>
                  </View>
                  {i < member.recentBookings.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <DirectNotificationModal
        visible={showNotifModal}
        memberId={member.id}
        memberName={member.name}
        onClose={() => setShowNotifModal(false)}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.background },
  safeTop:       { backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.lg },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  notifBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(167,139,250,0.15)', justifyContent: 'center', alignItems: 'center' },

  sectionLabel: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  alertBadge:   { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.alert, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  alertBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.white },

  // Profile card
  profileCard: { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.md },
  profileTop:  { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  avatarWrap:  { position: 'relative' },
  avatar:      { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 22, color: Colors.white },
  genderDot:   { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.cardSurface },
  profileInfo: { flex: 1, justifyContent: 'center' },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  memberName:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 18, color: Colors.textPrimary, flex: 1 },
  memberRole:  { ...Typography.secondaryBody, color: Colors.textSecondary, marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, alignSelf: 'flex-start' },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  bio:         { ...Typography.secondaryBody, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  profileMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profileMetaText: { ...Typography.caption, color: Colors.textMuted },
  cabinBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  cabinBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  // Contact row
  contactRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  contactBtn: { flex: 1, alignItems: 'center', gap: 6 },
  contactIconWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  contactBtnText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary },

  // Info card
  card: { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.md },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 2 },
  infoLabel: { ...Typography.secondaryBody, color: Colors.textSecondary, flex: 1 },
  infoValue: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  divider:   { height: 1, backgroundColor: Colors.borderDefault, marginVertical: Spacing.md },

  // Company
  companyCard:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.md },
  companyAvatar: { width: 44, height: 44, borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center' },
  companyAvatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textSecondary },
  companyInfo:   { flex: 1, gap: 6 },
  companyName:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary },

  // Tickets
  ticketRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ticketDot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  ticketInfo:        { flex: 1 },
  ticketTitle:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  ticketMeta:        { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  ticketStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  ticketStatusText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  // Bookings
  bookingRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bookingIconWrap:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  bookingInfo:       { flex: 1 },
  bookingRoom:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  bookingMeta:       { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  bookingStatusBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  bookingStatusText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderDefault, alignSelf: 'center', marginBottom: Spacing.lg },
  title:    { ...Typography.pageTitle, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { ...Typography.secondaryBody, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.md },
  inputWrapper:  { backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderDefault, height: 52, paddingHorizontal: Spacing.lg, justifyContent: 'center', marginBottom: Spacing.sm },
  input:         { fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  messageWrapper:{ backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderDefault, padding: Spacing.lg, minHeight: 100, marginBottom: Spacing.sm },
  messageInput:  { fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary, minHeight: 80 },
  sendBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md, backgroundColor: Colors.accent300, marginTop: Spacing.md, marginBottom: Spacing.md },
  sendBtnText:   { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },
  sentState:     { alignItems: 'center', paddingVertical: Spacing.huge, gap: Spacing.md },
  sentTitle:     { ...Typography.pageTitle, color: Colors.textPrimary, textAlign: 'center' },
  sentSub:       { ...Typography.secondaryBody, color: Colors.textSecondary, textAlign: 'center' },
});
