import React, { useEffect, useMemo, useState } from 'react';
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
import { normalizeDayPassStatus } from '../../utils/dayPass';
import { openExternalLink } from '../../utils/openExternalLink';


type RouteProps = RouteProp<RootStackParamList, 'DayPassDetailScreen'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

type CheckInStatus = string;
type Gender        = 'Male' | 'Female' | 'Other';
type BookingSource = 'MyHQ' | 'Our Portal' | 'Direct';
type TicketStatus  = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

interface AccessCard {
  cardId: string;
  cardLabel: string;
  areas: string[];
}

type CardOption = { value: string; label: string };

interface DayPass {
  id: string;
  customerId?: string;
  memberName: string;
  companyName: string;
  phone: string;
  gender?: Gender;
  memberSince?: string;
  date: string;
  checkInStatus: CheckInStatus;
  checkInTime?: string;
  kycVerified: boolean;
  bookingSource?: BookingSource;
  amount: number;
  bookingFor?: string;
  bookedAt?: string;
  buildingName?: string;
  accessCard?: AccessCard;
  openTickets: {
    id: string;
    title: string;
    status: TicketStatus;
    category: string;
    raisedAt: string;
  }[];
  visitHistory: {
    date: string;
    checkInStatus: CheckInStatus;
    checkInTime?: string;
  }[];
}

// ── Config ────────────────────────────────────────────────────────────────────
const CHECK_IN_CONFIG: Record<string, { color: string; icon: string }> = {
  'Checked In': { color: Colors.success,   icon: 'check-circle'  },
  'Pending':    { color: Colors.accent300, icon: 'clock-outline' },
  'No Show':    { color: Colors.alert,     icon: 'close-circle'  },
  'Active':          { color: Colors.success,   icon: 'check-circle-outline' },
  'Payment Pending': { color: Colors.accent300, icon: 'cash' },
  'Expired':         { color: Colors.textMuted, icon: 'clock-alert-outline' },
  'Cancelled':       { color: Colors.alert,     icon: 'close-circle-outline' },
  'Completed':       { color: Colors.success,   icon: 'check-all' },
  'Issued':          { color: '#30BCED',        icon: 'ticket-confirmation-outline' },
};

const DEFAULT_STATUS_CONFIG = { color: Colors.textSecondary, icon: 'information-outline' };

const SOURCE_CONFIG: Record<BookingSource, { color: string; bg: string }> = {
  'MyHQ':       { color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
  'Our Portal': { color: '#30BCED', bg: 'rgba(48,188,237,0.15)'  },
  'Direct':     { color: Colors.accent300, bg: 'rgba(255,126,21,0.15)' },
};

const GENDER_COLORS: Record<Gender, string> = {
  Male:   '#30BCED',
  Female: '#F472B6',
  Other:  Colors.textSecondary,
};

const TICKET_STATUS_CONFIG: Record<TicketStatus, { color: string; icon: string }> = {
  'Open':        { color: Colors.alert,    icon: 'circle-outline'  },
  'In Progress': { color: '#30BCED',       icon: 'progress-clock'  },
  'Resolved':    { color: Colors.success,  icon: 'check-circle'    },
  'Closed':      { color: Colors.textMuted,icon: 'close-circle'    },
};

// ── Access Card Modal ─────────────────────────────────────────────────────────
function AccessCardModal({
  visible,
  memberName,
  onClose,
  onIssue,
  usedCards,
  availableCards,
  accessAreas,
  bottomInset,
}: {
  visible: boolean;
  memberName: string;
  onClose: () => void;
  onIssue: (cardId: string, areas: string[]) => void;
  usedCards: string[];
  availableCards: CardOption[];
  accessAreas: string[];
  bottomInset: number;
}) {
  const [cardSearch,    setCardSearch]    = useState('');
  const [selectedCard,  setSelectedCard]  = useState('');
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const available = availableCards.filter(card =>
    !usedCards.includes(card.value) &&
    card.label.toLowerCase().includes(cardSearch.toLowerCase())
  );
  const selectedCardLabel = availableCards.find(card => card.value === selectedCard)?.label;

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modalStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[modalStyles.sheet, { paddingBottom: bottomInset + 24 }]}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Issue Access Card</Text>
          <Text style={modalStyles.subtitle}>to {memberName}</Text>

          <Text style={modalStyles.label}>Select Access Card</Text>
          <TouchableOpacity
            onPress={() => setShowDropdown(p => !p)}
            style={[modalStyles.dropdownBtn, selectedCard ? { borderColor: Colors.accent300 } : {}]}
            activeOpacity={0.7}
          >
            <Icon name="card-account-details-outline" size={18} color={selectedCard ? Colors.accent300 : Colors.textMuted} />
            <Text style={[modalStyles.dropdownBtnText, selectedCard ? { color: Colors.accent300 } : {}]}>
              {selectedCardLabel || 'Search access cards...'}
            </Text>
            <Icon name={showDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {showDropdown && (
            <View style={modalStyles.dropdown}>
              <View style={modalStyles.dropdownSearch}>
                <Icon name="magnify" size={16} color={Colors.textMuted} />
                <TextInput
                  style={modalStyles.dropdownInput}
                  value={cardSearch}
                  onChangeText={setCardSearch}
                  placeholder="Search..."
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
              </View>
              <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                {available.length === 0 ? (
                  <Text style={modalStyles.noCards}>No available cards</Text>
                ) : (
                  available.map(card => (
                    <TouchableOpacity
                      key={card.value}
                      onPress={() => { setSelectedCard(card.value); setShowDropdown(false); setCardSearch(''); }}
                      style={[modalStyles.dropdownItem, selectedCard === card.value && modalStyles.dropdownItemActive]}
                      activeOpacity={0.7}
                    >
                      <Icon name="card-outline" size={16} color={selectedCard === card.value ? Colors.accent300 : Colors.textSecondary} />
                      <Text style={[modalStyles.dropdownItemText, selectedCard === card.value && { color: Colors.accent300 }]}>
                        {card.label}
                      </Text>
                      {selectedCard === card.value && <Icon name="check" size={14} color={Colors.accent300} />}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          <Text style={[modalStyles.label, { marginTop: Spacing.lg }]}>Access Areas</Text>
          <View style={modalStyles.areasGrid}>
            {accessAreas.map(area => {
              const isSelected = selectedAreas.includes(area);
              return (
                <TouchableOpacity
                  key={area}
                  onPress={() => toggleArea(area)}
                  style={[modalStyles.areaChip, isSelected && modalStyles.areaChipActive]}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={16}
                    color={isSelected ? Colors.accent300 : Colors.textMuted}
                  />
                  <Text style={[modalStyles.areaChipText, isSelected && { color: Colors.accent300 }]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => { onIssue(selectedCard, selectedAreas); setSelectedCard(''); setSelectedAreas([]); }}
            disabled={!selectedCard || selectedAreas.length === 0}
            style={[modalStyles.issueBtn, (!selectedCard || selectedAreas.length === 0) && { opacity: 0.4 }]}
            activeOpacity={0.8}
          >
            <Icon name="card-plus-outline" size={20} color={Colors.white} />
            <Text style={modalStyles.issueBtnText}>Issue Access Card</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function DayPassDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<RouteProps>();
  const insets     = useSafeAreaInsets();
  const passId     = route.params.passId;
  const { dayPasses, tickets, rfidCards, commonAreas, updateDayPass } = useApp();
  const storedPass = dayPasses.find(item => item.id === passId);
  const storedAccessCard = storedPass?.rfidCard
    ? rfidCards.find(card => card.id === storedPass.rfidCard || card.uid === storedPass.rfidCard)
    : undefined;

  const original: DayPass | null = useMemo(() => storedPass ? ({
    id: storedPass.id,
    customerId: storedPass.customerId,
    memberName: storedPass.name,
    companyName: storedPass.company || '',
    phone: storedPass.phone,
    gender: storedPass.gender,
    memberSince: storedPass.memberSince,
    date: storedPass.date,
    checkInStatus: normalizeDayPassStatus(storedPass.status),
    kycVerified: storedPass.kycVerified,
    bookingSource: storedPass.bookingSource,
    checkInTime: storedPass.checkInTime,
    amount: storedPass.amount,
    bookingFor: storedPass.bookingFor,
    bookedAt: storedPass.bookedAt,
    buildingName: storedPass.buildingName,
    accessCard: storedPass.rfidCard ? { cardId: storedAccessCard?.id || storedPass.rfidCard, cardLabel: storedAccessCard?.uid || 'Access card', areas: storedPass.accessAreas } : undefined,
    openTickets: storedPass.name.trim()
      ? tickets.filter(ticket => ticket.memberName.trim() === storedPass.name.trim()).map(ticket => ({ id: ticket.id, title: ticket.subject, status: ticket.status, category: ticket.category, raisedAt: new Date(ticket.createdAt).toLocaleString('en-IN') }))
      : [],
    visitHistory: dayPasses.filter(item => storedPass.customerId
      ? item.customerId === storedPass.customerId
      : storedPass.phone.trim() ? item.phone === storedPass.phone : item.id === storedPass.id)
      .map(item => ({ date: item.date, checkInStatus: normalizeDayPassStatus(item.status), checkInTime: item.checkInTime })),
  }) : null, [dayPasses, storedAccessCard, storedPass, tickets]);
  const [pass,          setPass]          = useState<DayPass | null>(original);
  const [showCardModal, setShowCardModal] = useState(false);

  useEffect(() => {
    setPass(original);
  }, [original]);

  if (!pass) {
    return <BackendRecordUnavailable title="Day pass" onBack={() => navigation.goBack()} />;
  }

  const statusCfg = CHECK_IN_CONFIG[pass.checkInStatus] ?? DEFAULT_STATUS_CONFIG;
  const sourceCfg = pass.bookingSource ? SOURCE_CONFIG[pass.bookingSource] : null;
  const displayName = pass.memberName.trim() || `${pass.bookingFor || 'Day pass'} booking`;
  const initials = pass.memberName.trim()
    ? pass.memberName.split(' ').map(name => name[0]).join('').slice(0, 2)
    : 'DP';
  const customerLabel = pass.companyName || pass.buildingName || 'Customer details not supplied';
  const bookedAt = pass.bookedAt ? new Date(pass.bookedAt) : null;
  const bookedLabel = bookedAt && !Number.isNaN(bookedAt.getTime())
    ? `Booked ${bookedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : '';

  const handleCheckIn = async () => {
    try {
      await updateDayPass(pass.id, { status: 'Checked In' });
      Alert.alert('Access provisioned', 'The day-pass access request was accepted.');
    } catch (error) {
      Alert.alert('Access not provisioned', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleIssueCard = async (cardId: string, areas: string[]) => {
    try {
      await updateDayPass(pass.id, { rfidCard: cardId, accessAreas: areas });
      const cardLabel = rfidCards.find(card => card.id === cardId)?.uid || 'Access card';
      setPass(prev => prev ? ({ ...prev, accessCard: { cardId, cardLabel, areas } }) : prev);
      setShowCardModal(false);
      Alert.alert('Card issued', 'The access card was assigned successfully.');
    } catch (error) {
      Alert.alert('Card not issued', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Pass Detail</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Member Card */}
        <View style={styles.memberCard}>
          <View style={styles.memberCardTop}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {initials}
                </Text>
              </View>
              {pass.gender && <View style={[styles.genderDot, { backgroundColor: GENDER_COLORS[pass.gender] ?? Colors.textSecondary }]} />}
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName}>{displayName}</Text>
                {pass.kycVerified
                  ? <Icon name="shield-check" size={16} color={Colors.success} />
                  : <Icon name="shield-alert-outline" size={16} color={Colors.alert} />
                }
              </View>
              <Text style={styles.companyName}>{customerLabel}</Text>
              {!!pass.memberSince && <Text style={styles.memberSince}>Member since {pass.memberSince}</Text>}
              {!pass.memberSince && !!bookedLabel && <Text style={styles.memberSince}>{bookedLabel}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}22`, borderColor: statusCfg.color }]}>
              <Icon name={statusCfg.icon} size={14} color={statusCfg.color} />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {pass.checkInStatus === 'Checked In' ? (pass.checkInTime || 'Checked In') : pass.checkInStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Booking Info */}
        <Text style={styles.sectionLabel}>Booking Info</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Icon name="calendar" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Visit Date</Text>
            <Text style={styles.infoValue}>{pass.date}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="cash" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={styles.infoValue}>₹{pass.amount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.divider} />
          {!!pass.bookingFor && (
            <>
              <View style={styles.infoRow}>
                <Icon name="account-arrow-right-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoLabel}>Booking For</Text>
                <Text style={styles.infoValue}>{pass.bookingFor}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}
          {!!pass.buildingName && (
            <>
              <View style={styles.infoRow}>
                <Icon name="office-building-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoLabel}>Building</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{pass.buildingName}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}
          <View style={styles.infoRow}>
            <Icon name="source-branch" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Booked Via</Text>
            {sourceCfg && pass.bookingSource && (
              <View style={[styles.sourceBadge, { backgroundColor: sourceCfg.bg }]}>
                <Text style={[styles.sourceText, { color: sourceCfg.color }]}>{pass.bookingSource}</Text>
              </View>
            )}
          </View>
          {!!pass.phone && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Icon name="phone" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoLabel}>Phone</Text>
                <TouchableOpacity onPress={() => openExternalLink(`tel:${pass.phone}`, 'Calling is not available on this device.')} activeOpacity={0.7}>
                  <Text style={[styles.infoValue, { color: '#30BCED' }]}>{pass.phone}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="shield-account-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>KYC Status</Text>
            <Text style={[styles.infoValue, { color: pass.kycVerified ? Colors.success : Colors.alert }]}>
              {pass.kycVerified ? 'Verified' : 'Not Verified'}
            </Text>
          </View>
        </View>

        {/* Access Card */}
        <Text style={styles.sectionLabel}>Access Card</Text>
        <View style={styles.card}>
          {pass.accessCard ? (
            <>
              <View style={styles.infoRow}>
                <Icon name="card-outline" size={16} color="#A78BFA" />
                <Text style={styles.infoLabel}>Access card</Text>
                <Text style={[styles.infoValue, { color: '#A78BFA' }]}>{pass.accessCard.cardLabel}</Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.areasLabel}>Access Areas</Text>
              <View style={styles.areasRow}>
                {pass.accessCard.areas.map(area => (
                  <View key={area} style={styles.areaBadge}>
                    <Text style={styles.areaBadgeText}>{area}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.noCardRow}>
              <Icon name="card-off-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.noCardText}>No access card issued</Text>
            </View>
          )}
        </View>

        {/* Open Tickets */}
        {pass.openTickets.length > 0 && (
          <>
            <View style={styles.ticketSectionHeader}>
              <Text style={styles.sectionLabel}>Open Tickets</Text>
              <View style={styles.ticketCountBadge}>
                <Text style={styles.ticketCountText}>{pass.openTickets.length}</Text>
              </View>
            </View>
            <View style={styles.card}>
              {pass.openTickets.map((ticket, i) => {
                const tCfg = TICKET_STATUS_CONFIG[ticket.status] ?? TICKET_STATUS_CONFIG.Open;
                return (
                  <View key={ticket.id}>
                    <View style={styles.ticketRow}>
                      <View style={[styles.ticketStatusDot, { backgroundColor: tCfg.color }]} />
                      <View style={styles.ticketInfo}>
                        <Text style={styles.ticketTitle}>{ticket.title}</Text>
                        <Text style={styles.ticketMeta}>
                          {ticket.category} · {ticket.raisedAt}
                        </Text>
                      </View>
                      <View style={[styles.ticketStatusBadge, { backgroundColor: `${tCfg.color}22`, borderColor: tCfg.color }]}>
                        <Text style={[styles.ticketStatusText, { color: tCfg.color }]}>{ticket.status}</Text>
                      </View>
                    </View>
                    {i < pass.openTickets.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Visit History */}
        <Text style={styles.sectionLabel}>Visit History</Text>
        <View style={styles.card}>
          {pass.visitHistory.map((visit, i) => {
            const vCfg = CHECK_IN_CONFIG[visit.checkInStatus] ?? DEFAULT_STATUS_CONFIG;
            return (
              <View key={i}>
                <View style={styles.visitRow}>
                  <Icon name={vCfg.icon} size={18} color={vCfg.color} />
                  <Text style={styles.visitDate}>{visit.date}</Text>
                  <Text style={[styles.visitStatus, { color: vCfg.color }]}>
                    {visit.checkInStatus === 'Checked In' ? `Checked in at ${visit.checkInTime}` : visit.checkInStatus}
                  </Text>
                </View>
                {i < pass.visitHistory.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* Fixed bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.bottomActions}>
          {/* Call */}
          {!!pass.phone && (
            <TouchableOpacity
              onPress={() => openExternalLink(`tel:${pass.phone}`, 'Calling is not available on this device.')}
              style={styles.secondaryBtn}
              activeOpacity={0.7}
            >
              <Icon name="phone-outline" size={18} color="#30BCED" />
              <Text style={[styles.secondaryBtnText, { color: '#30BCED' }]}>Call</Text>
            </TouchableOpacity>
          )}

          {/* Verify KYC */}
          {!pass.kycVerified && (
            <TouchableOpacity
              onPress={() => navigation.navigate('KycVerificationScreen', { memberId: pass.id })}
              style={[styles.secondaryBtn, { borderColor: Colors.accent300 }]}
              activeOpacity={0.7}
            >
              <Icon name="shield-account-outline" size={18} color={Colors.accent300} />
              <Text style={[styles.secondaryBtnText, { color: Colors.accent300 }]}>Verify KYC</Text>
            </TouchableOpacity>
          )}

          {/* Issue card. Recovery is not exposed by the documented day-pass API. */}
          {!pass.accessCard && (
            <TouchableOpacity
              onPress={() => setShowCardModal(true)}
              style={[styles.secondaryBtn, { borderColor: '#A78BFA' }]}
              activeOpacity={0.7}
            >
              <Icon name="card-plus-outline" size={18} color="#A78BFA" />
              <Text style={[styles.secondaryBtnText, { color: '#A78BFA' }]}>Issue Card</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Check In — full width primary */}
        {['Pending', 'Active'].includes(pass.checkInStatus) && (
          <TouchableOpacity
            onPress={handleCheckIn}
            style={styles.checkInBtn}
            activeOpacity={0.8}
          >
            <Icon name="login" size={20} color={Colors.white} />
            <Text style={styles.checkInBtnText}>Provision Access</Text>
          </TouchableOpacity>
        )}
      </View>

      <AccessCardModal
        visible={showCardModal}
        memberName={pass.memberName}
        usedCards={pass.accessCard ? [pass.accessCard.cardId] : []}
        availableCards={rfidCards.filter(card => card.status === 'Active' && !card.assignedTo).map(card => ({ value: card.id, label: card.uid || 'Access card' }))}
        accessAreas={commonAreas.filter(area => area.status === 'Available').map(area => area.name)}
        onClose={() => setShowCardModal(false)}
        onIssue={handleIssueCard}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.background },
  safeTop:       { backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.lg },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },

  sectionLabel: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 11, color: Colors.textSecondary,
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },

  // Member card
  memberCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginBottom: Spacing.md,
  },
  memberCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  avatarWrap:    { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.accent300,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 18, color: Colors.white },
  genderDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: Colors.cardSurface,
  },
  memberInfo:  { flex: 1 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  memberName:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 17, color: Colors.textPrimary, flex: 1 },
  companyName: { ...Typography.secondaryBody, marginBottom: 2, flexShrink: 1 },
  memberSince: { ...Typography.caption, color: Colors.textMuted },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  // Info card
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginBottom: Spacing.md,
  },
  infoRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 2 },
  infoLabel:  { ...Typography.secondaryBody, color: Colors.textSecondary, flex: 1 },
  infoValue:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  divider:    { height: 1, backgroundColor: Colors.borderDefault, marginVertical: Spacing.md },
  sourceBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  sourceText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  // Access areas
  areasLabel: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, marginBottom: Spacing.sm },
  areasRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  areaBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: 'rgba(167,139,250,0.15)' },
  areaBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: '#A78BFA' },
  noCardRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  noCardText: { ...Typography.primaryBody, color: Colors.textMuted },

  // Tickets
  ticketSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  ticketCountBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.alert,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  ticketCountText:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.white },
  ticketRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ticketStatusDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  ticketInfo:        { flex: 1 },
  ticketTitle:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  ticketMeta:        { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  ticketStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  ticketStatusText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  // Visit history
  visitRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 2 },
  visitDate:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary, flex: 1 },
  visitStatus: { fontFamily: 'SequelSans-BookBody', fontSize: 13 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.borderDefault,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  bottomActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.borderDefault,
    backgroundColor: Colors.secondarySurface,
  },
  secondaryBtnText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12 },
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent300,
  },
  checkInBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },
});

const modalStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
  },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderDefault, alignSelf: 'center', marginBottom: Spacing.lg },
  title:    { ...Typography.pageTitle, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { ...Typography.secondaryBody, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.borderDefault, height: 52,
    paddingHorizontal: Spacing.lg,
  },
  dropdownBtnText: { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textMuted },
  dropdown: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginTop: Spacing.xs, overflow: 'hidden',
  },
  dropdownSearch: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.borderDefault,
  },
  dropdownInput:     { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 14, color: Colors.textPrimary },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderDefault,
  },
  dropdownItemActive: { backgroundColor: 'rgba(255,126,21,0.08)' },
  dropdownItemText:   { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  noCards:            { padding: Spacing.lg, textAlign: 'center', fontFamily: 'SequelSans-BookBody', fontSize: 14, color: Colors.textMuted },
  areasGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.md, backgroundColor: Colors.secondarySurface,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  areaChipActive:  { borderColor: Colors.accent300, backgroundColor: 'rgba(255,126,21,0.08)' },
  areaChipText:    { fontFamily: 'SequelSans-BookBody', fontSize: 13, color: Colors.textSecondary },
  issueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent300, marginTop: Spacing.xl,
  },
  issueBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },
});
