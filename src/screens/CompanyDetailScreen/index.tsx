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
import { downloadAuthenticatedFile } from '../../utils/downloadFile';
import { Routes } from '../../services/routes';
import { formatTimeRange } from '../../utils/timeRange';

type RouteProps = RouteProp<RootStackParamList, 'CompanyDetailScreen'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface CompanyMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  gender?: 'Male' | 'Female' | 'Other';
  kycVerified: boolean;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  cabin: string;
  floor: string;
  memberSince: string;
  leaseEnd: string;
  monthlyRent: number;
  status: 'Active' | 'Inactive';
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  website?: string;
  about?: string;
  members: CompanyMember[];
  openTickets: { id: string; title: string; status: string; category: string; raisedAt: string }[];
  recentBookings: { id: string; room: string; date: string; time: string; status: string }[];
}

const FLOOR_COLORS: Record<string, string> = {
  'Floor 1': '#30BCED',
  'Floor 2': '#A78BFA',
  'Floor 3': '#F472B6',
};

const GENDER_COLORS = { Male: '#30BCED', Female: '#F472B6', Other: Colors.textSecondary };

const TICKET_STATUS_COLORS: Record<string, string> = {
  'Open': Colors.alert, 'In Progress': '#30BCED',
  'Resolved': Colors.success, 'Closed': Colors.textMuted,
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  'Confirmed': Colors.success, 'In Progress': '#30BCED',
  'Completed': Colors.textMuted, 'Cancelled': Colors.alert, 'Pending': Colors.accent300,
};

// ── Direct Notification Modal ─────────────────────────────────────────────────
function DirectNotificationModal({
  visible, companyName, memberIds, onClose, bottomInset,
}: {
  visible: boolean; companyName: string; memberIds: string[]; onClose: () => void; bottomInset: number;
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
      if (!memberIds.length) throw new Error('This company has no members available to notify.');
      await Promise.all(memberIds.map(memberId => sendNotification({
        type: 'Announcement', title: title.trim(), message: message.trim(), audience: companyName, memberId,
      })));
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
              <Text style={modalStyles.sentSub}>Message delivered to all members of {companyName}.</Text>
            </View>
          ) : (
            <>
              <Text style={modalStyles.title}>Notify Company</Text>
              <Text style={modalStyles.subtitle}>Send to all members of {companyName}</Text>
              <Text style={modalStyles.label}>Title</Text>
              <View style={modalStyles.inputWrapper}>
                <TextInput style={modalStyles.input} value={title} onChangeText={setTitle} placeholder="Notification title..." placeholderTextColor={Colors.textMuted} />
              </View>
              <Text style={modalStyles.label}>Message</Text>
              <View style={modalStyles.messageWrapper}>
                <TextInput style={modalStyles.messageInput} value={message} onChangeText={setMessage} placeholder="Write your message..." placeholderTextColor={Colors.textMuted} multiline textAlignVertical="top" />
              </View>
              <TouchableOpacity
                onPress={handleSend}
                disabled={!title.trim() || !message.trim() || sending}
                style={[modalStyles.sendBtn, (!title.trim() || !message.trim() || sending) && { opacity: 0.4 }]}
                activeOpacity={0.8}
              >
                <Icon name="send" size={18} color={Colors.white} />
                <Text style={modalStyles.sendBtnText}>{sending ? 'Sending...' : 'Send to All Members'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function CompanyDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<RouteProps>();
  const insets     = useSafeAreaInsets();
  const companyId  = route.params.companyId;
  const { companies, members, tickets, bookings, cabins } = useApp();
  const storedCompany = companies.find(item => item.id === companyId);
  const storedCabin = cabins.find(item => item.companyId === companyId);
  const company: Company | null = storedCompany ? {
    id: storedCompany.id, name: storedCompany.name, industry: storedCompany.industry || '', cabin: storedCompany.cabin,
    floor: storedCompany.floor, memberSince: storedCompany.memberSince || storedCabin?.occupiedSince || '', leaseEnd: storedCompany.leaseEnd || storedCabin?.leaseEnd || '',
    monthlyRent: storedCompany.monthlyRent || storedCabin?.monthlyRent || 0, status: storedCompany.status, contactPerson: storedCompany.contactPerson,
    contactPhone: storedCompany.phone, contactEmail: storedCompany.email,
    website: storedCompany.website, about: storedCompany.about,
    members: members.filter(item => item.companyId === storedCompany.id).map(item => ({ id: item.id, name: item.name, role: item.role, phone: item.phone, gender: item.gender, kycVerified: item.kycVerified })),
    openTickets: tickets.filter(item => item.company === storedCompany.name).map(item => ({ id: item.id, title: item.subject, status: item.status, category: item.category, raisedAt: new Date(item.createdAt).toLocaleString('en-IN') })),
    recentBookings: bookings.filter(item => item.company === storedCompany.name).map(item => ({ id: item.id, room: item.room, date: item.date, time: formatTimeRange(item.startTime, item.endTime), status: item.status })),
  } : null;

  const [showNotifModal, setShowNotifModal] = useState(false);

  if (!company) {
    return <BackendRecordUnavailable title="Company" onBack={() => navigation.goBack()} />;
  }

  const floorColor = FLOOR_COLORS[company.floor] ?? Colors.textSecondary;
  const daysToLeaseEnd = (() => {
    if (!company.leaseEnd) return Number.POSITIVE_INFINITY;
    const parts = company.leaseEnd.split(' ');
    const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const leaseDate = new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
    const today     = new Date();
    const diff      = Math.ceil((leaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  })();

  const leaseWarning = daysToLeaseEnd <= 60;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Company</Text>
          <TouchableOpacity
            onPress={() => setShowNotifModal(true)}
            style={styles.notifBtn}
            activeOpacity={0.7}
          >
            <Icon name="bell-plus-outline" size={20} color="#A78BFA" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Company Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.companyLogo}>
              <Text style={styles.companyLogoText}>{company.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              {!!company.industry && <Text style={styles.industryText}>{company.industry}</Text>}
              <View style={[styles.statusBadge, company.status === 'Active'
                ? { backgroundColor: 'rgba(0,129,54,0.15)', borderColor: Colors.success }
                : { backgroundColor: Colors.secondarySurface, borderColor: Colors.borderDefault }
              ]}>
                <View style={[styles.statusDot, { backgroundColor: company.status === 'Active' ? Colors.success : Colors.textMuted }]} />
                <Text style={[styles.statusText, { color: company.status === 'Active' ? Colors.success : Colors.textMuted }]}>
                  {company.status}
                </Text>
              </View>
            </View>
          </View>

          {company.about && <Text style={styles.about}>{company.about}</Text>}

          <View style={styles.profileMeta}>
            <View style={[styles.cabinBadge, { backgroundColor: `${floorColor}18` }]}>
              <Icon name="office-building" size={12} color={floorColor} />
              <Text style={[styles.cabinBadgeText, { color: floorColor }]}>{company.cabin} · {company.floor}</Text>
            </View>
            <View style={styles.memberCountBadge}>
              <Icon name="account-group-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.memberCountText}>{company.members.length} members</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            onPress={() => openExternalLink(`tel:${company.contactPhone}`, 'Calling is not available on this device.')}
            style={styles.contactBtn}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(48,188,237,0.15)' }]}>
              <Icon name="phone-outline" size={22} color="#30BCED" />
            </View>
            <Text style={styles.contactBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openExternalLink(`whatsapp://send?phone=${company.contactPhone.replace(/\D/g, '')}`, 'WhatsApp is not installed on this device.')}
            style={styles.contactBtn}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(37,211,102,0.15)' }]}>
              <Icon name="whatsapp" size={22} color="#25D366" />
            </View>
            <Text style={styles.contactBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openExternalLink(`mailto:${company.contactEmail}`, 'Email is not available on this device.')}
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
          <TouchableOpacity
            onPress={() => downloadAuthenticatedFile(Routes.clientRfidExport(company.id), `${company.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-rfid.xlsx`).catch(error => Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.'))}
            style={styles.contactBtn}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(0,129,54,0.15)' }]}><Icon name="download-outline" size={22} color={Colors.success} /></View>
            <Text style={styles.contactBtnText}>RFID Export</Text>
          </TouchableOpacity>
        </View>

        {/* Lease Info */}
        <Text style={styles.sectionLabel}>Lease Details</Text>
        <View style={[styles.card, leaseWarning && styles.leaseWarningCard]}>
          {leaseWarning && (
            <View style={styles.leaseWarningBanner}>
              <Icon name="alert-circle-outline" size={16} color={Colors.alert} />
              <Text style={styles.leaseWarningText}>Lease expires in {daysToLeaseEnd} days</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Icon name="calendar-start" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{company.memberSince || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="calendar-end" size={16} color={leaseWarning ? Colors.alert : Colors.textSecondary} />
            <Text style={[styles.infoLabel, leaseWarning && { color: Colors.alert }]}>Lease End</Text>
            <Text style={[styles.infoValue, leaseWarning && { color: Colors.alert }]}>{company.leaseEnd || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="currency-inr" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Monthly Rent</Text>
            <Text style={[styles.infoValue, { color: Colors.success }]}>{company.monthlyRent > 0 ? `₹${(company.monthlyRent / 1000).toFixed(0)}K / month` : '—'}</Text>
          </View>
        </View>

        {/* Contact Person */}
        <Text style={styles.sectionLabel}>Primary Contact</Text>
        <View style={styles.card}>
          <View style={styles.contactPersonRow}>
            <View style={styles.contactPersonAvatar}>
              <Text style={styles.contactPersonAvatarText}>
                {company.contactPerson.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </Text>
            </View>
            <View style={styles.contactPersonInfo}>
              <Text style={styles.contactPersonName}>{company.contactPerson}</Text>
              <TouchableOpacity onPress={() => openExternalLink(`tel:${company.contactPhone}`, 'Calling is not available on this device.')} activeOpacity={0.7}>
                <Text style={[styles.contactPersonDetail, { color: '#30BCED' }]}>{company.contactPhone}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openExternalLink(`mailto:${company.contactEmail}`, 'Email is not available on this device.')} activeOpacity={0.7}>
                <Text style={[styles.contactPersonDetail, { color: Colors.accent300 }]}>{company.contactEmail}</Text>
              </TouchableOpacity>
              {company.website && (
                <TouchableOpacity onPress={() => {
                  const website = company.website || '';
                  return openExternalLink(/^https?:\/\//i.test(website) ? website : `https://${website}`, 'The company website cannot be opened.');
                }} activeOpacity={0.7}>
                  <Text style={[styles.contactPersonDetail, { color: '#A78BFA' }]}>{company.website}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Members */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Members</Text>
          <View style={styles.memberCountPill}>
            <Text style={styles.memberCountPillText}>{company.members.length}</Text>
          </View>
        </View>
        <View style={styles.card}>
          {company.members.map((member, i) => (
            <View key={member.id}>
              <TouchableOpacity
                onPress={() => navigation.navigate('MemberDetailScreen', { memberId: member.id })}
                style={styles.memberRow}
                activeOpacity={0.7}
              >
                <View style={styles.memberAvatarWrap}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  {member.gender && <View style={[styles.genderDot, { backgroundColor: GENDER_COLORS[member.gender] }]} />}
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {member.kycVerified && <Icon name="shield-check" size={13} color={Colors.success} />}
                  </View>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
                <Icon name="chevron-right" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {i < company.members.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Open Tickets */}
        {company.openTickets.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Open Tickets</Text>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{company.openTickets.length}</Text>
              </View>
            </View>
            <View style={styles.card}>
              {company.openTickets.map((ticket, i) => (
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
                  {i < company.openTickets.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent Bookings */}
        {company.recentBookings.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recent Room Bookings</Text>
            <View style={styles.card}>
              {company.recentBookings.map((booking, i) => (
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
                  {i < company.recentBookings.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <DirectNotificationModal
        visible={showNotifModal}
        companyName={company.name}
        memberIds={company.members.map(member => member.id)}
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

  topBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  notifBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(167,139,250,0.15)', justifyContent: 'center', alignItems: 'center' },

  sectionLabel:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  alertBadge:       { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.alert, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  alertBadgeText:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.white },
  memberCountPill:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, backgroundColor: Colors.secondarySurface },
  memberCountPillText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary },

  // Profile
  profileCard:     { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.md },
  profileTop:      { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  companyLogo:     { width: 64, height: 64, borderRadius: BorderRadius.md, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center' },
  companyLogoText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 22, color: Colors.textSecondary },
  profileInfo:     { flex: 1, justifyContent: 'center' },
  companyName:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 18, color: Colors.textPrimary, marginBottom: 4 },
  industryText:    { ...Typography.secondaryBody, color: Colors.textSecondary, marginBottom: 8 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, alignSelf: 'flex-start' },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },
  statusText:      { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  about:           { ...Typography.secondaryBody, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  profileMeta:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cabinBadge:      { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  cabinBadgeText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  memberCountBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCountText: { ...Typography.caption, color: Colors.textSecondary },

  // Contact buttons
  contactRow:      { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  contactBtn:      { flex: 1, alignItems: 'center', gap: 6 },
  contactIconWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  contactBtnText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary },

  // Card
  card:            { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.md },
  leaseWarningCard:{ borderColor: 'rgba(229,67,57,0.40)' },
  leaseWarningBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(229,67,57,0.10)', borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  leaseWarningText:{ fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.alert },

  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 2 },
  infoLabel: { ...Typography.secondaryBody, color: Colors.textSecondary, flex: 1 },
  infoValue: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  divider:   { height: 1, backgroundColor: Colors.borderDefault, marginVertical: Spacing.md },

  // Contact person
  contactPersonRow:       { flexDirection: 'row', gap: Spacing.md },
  contactPersonAvatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  contactPersonAvatarText:{ fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.white },
  contactPersonInfo:      { flex: 1, gap: 4 },
  contactPersonName:      { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary },
  contactPersonDetail:    { fontFamily: 'SequelSans-BookBody', fontSize: 13 },

  // Members
  memberRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  memberAvatarWrap: { position: 'relative' },
  memberAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.white },
  genderDot:        { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: Colors.cardSurface },
  memberInfo:       { flex: 1 },
  memberNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberName:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textPrimary },
  memberRole:       { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  // Tickets
  ticketRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ticketDot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  ticketInfo:        { flex: 1 },
  ticketTitle:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  ticketMeta:        { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  ticketStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  ticketStatusText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  // Bookings
  bookingRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bookingIconWrap:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  bookingInfo:        { flex: 1 },
  bookingRoom:        { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  bookingMeta:        { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  bookingStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  bookingStatusText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
});

const modalStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: Colors.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderDefault, alignSelf: 'center', marginBottom: Spacing.lg },
  title:          { ...Typography.pageTitle, color: Colors.textPrimary, marginBottom: 4 },
  subtitle:       { ...Typography.secondaryBody, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label:          { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.md },
  inputWrapper:   { backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderDefault, height: 52, paddingHorizontal: Spacing.lg, justifyContent: 'center', marginBottom: Spacing.sm },
  input:          { fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  messageWrapper: { backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderDefault, padding: Spacing.lg, minHeight: 100, marginBottom: Spacing.sm },
  messageInput:   { fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary, minHeight: 80 },
  sendBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md, backgroundColor: '#A78BFA', marginTop: Spacing.md, marginBottom: Spacing.md },
  sendBtnText:    { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },
  sentState:      { alignItems: 'center', paddingVertical: Spacing.huge, gap: Spacing.md },
  sentTitle:      { ...Typography.pageTitle, color: Colors.textPrimary, textAlign: 'center' },
  sentSub:        { ...Typography.secondaryBody, color: Colors.textSecondary, textAlign: 'center' },
});
