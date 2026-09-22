import React, { useState } from 'react';
import {
  Alert, View, Text, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, Modal, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import { normalizeDayPassStatus } from '../../utils/dayPass';
import { openExternalLink } from '../../utils/openExternalLink';

type Nav           = NativeStackNavigationProp<RootStackParamList>;
type CheckInStatus = string;
type Gender        = 'Male' | 'Female' | 'Other';
type BookingSource = 'MyHQ' | 'Our Portal' | 'Direct';

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
  accessCard?: AccessCard;
  amount: number;
  bookingFor?: string;
  bookedAt?: string;
  buildingName?: string;
  numberOfGuests?: number;
}

const CHECK_IN_CONFIG: Record<string, { color: string; icon: string }> = {
  'Checked In': { color: Colors.success,   icon: 'check-circle'  },
  'Pending':    { color: Colors.accent300, icon: 'clock-outline' },
  'No Show':    { color: Colors.alert,     icon: 'close-circle'  },
  'Active':          { color: Colors.success,       icon: 'check-circle-outline' },
  'Payment Pending': { color: Colors.accent300,     icon: 'cash' },
  'Expired':         { color: Colors.textMuted,     icon: 'clock-alert-outline' },
  'Cancelled':       { color: Colors.alert,         icon: 'close-circle-outline' },
  'Completed':       { color: Colors.success,       icon: 'check-all' },
  'Issued':          { color: '#30BCED',            icon: 'ticket-confirmation-outline' },
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

function AccessCardModal({ visible, memberName, onClose, onIssue, usedCards, availableCards, accessAreas, bottomInset }: {
  visible: boolean; memberName: string; onClose: () => void;
  onIssue: (cardId: string, areas: string[]) => void;
  usedCards: string[]; availableCards: CardOption[]; accessAreas: string[]; bottomInset: number;
}) {
  const [cardSearch,    setCardSearch]    = useState('');
  const [selectedCard,  setSelectedCard]  = useState('');
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const available = availableCards.filter(card =>
    !usedCards.includes(card.value) && card.label.toLowerCase().includes(cardSearch.toLowerCase())
  );
  const selectedCardLabel = availableCards.find(card => card.value === selectedCard)?.label;

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  };

  const handleIssue = () => {
    if (!selectedCard || selectedAreas.length === 0) return;
    onIssue(selectedCard, selectedAreas);
    setSelectedCard(''); setCardSearch(''); setSelectedAreas([]);
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
                      <Text style={[modalStyles.dropdownItemText, selectedCard === card.value && { color: Colors.accent300 }]}>{card.label}</Text>
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
                  <Icon name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={16} color={isSelected ? Colors.accent300 : Colors.textMuted} />
                  <Text style={[modalStyles.areaChipText, isSelected && { color: Colors.accent300 }]}>{area}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleIssue}
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
function PassCard({ pass, onCheckIn, onVerifyKyc, onIssueCard, onPress }: {
  pass: DayPass; onCheckIn: () => void; onVerifyKyc: () => void;
  onIssueCard: () => void; onPress: () => void;
}) {
  const statusCfg = CHECK_IN_CONFIG[pass.checkInStatus] ?? DEFAULT_STATUS_CONFIG;
  const sourceCfg = pass.bookingSource ? SOURCE_CONFIG[pass.bookingSource] : null;
  const displayName = pass.memberName.trim() || `${pass.bookingFor || 'Day pass'} booking`;
  const initials = pass.memberName.trim()
    ? pass.memberName.split(' ').map(name => name[0]).join('').slice(0, 2)
    : 'DP';
  const customerLabel = pass.companyName || pass.buildingName || 'Customer details not supplied';
  const visitSummary = [`Visit ${pass.date}`, pass.amount > 0 ? `₹${pass.amount.toLocaleString('en-IN')}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.card}>
      <View style={styles.cardHeader}>
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
            <Text style={styles.memberName} numberOfLines={1}>{displayName}</Text>
            {pass.kycVerified && <Icon name="shield-check" size={14} color={Colors.success} />}
          </View>
          <Text style={styles.companyName}>{customerLabel}</Text>
          <Text style={styles.memberSince}>{visitSummary}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}22`, borderColor: statusCfg.color }]}>
          <Icon name={statusCfg.icon} size={12} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {pass.checkInStatus === 'Checked In' ? (pass.checkInTime || 'Checked In') : pass.checkInStatus}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {sourceCfg && pass.bookingSource && (
          <View style={[styles.sourceBadge, { backgroundColor: sourceCfg.bg }]}>
            <Text style={[styles.sourceText, { color: sourceCfg.color }]}>{pass.bookingSource}</Text>
          </View>
        )}
        {pass.accessCard && (
          <View style={styles.accessCardBadge}>
            <Icon name="card-outline" size={12} color="#A78BFA" />
            <Text style={styles.accessCardBadgeText}>{pass.accessCard.cardLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {!!pass.phone && (
          <TouchableOpacity onPress={() => openExternalLink(`tel:${pass.phone}`, 'Calling is not available on this device.')} style={styles.actionBtn} activeOpacity={0.7}>
            <Icon name="phone-outline" size={16} color="#30BCED" />
            <Text style={[styles.actionBtnText, { color: '#30BCED' }]}>Call</Text>
          </TouchableOpacity>
        )}

        {!pass.kycVerified && (
          <TouchableOpacity onPress={onVerifyKyc} style={[styles.actionBtn, { borderColor: Colors.accent300 }]} activeOpacity={0.7}>
            <Icon name="shield-account-outline" size={16} color={Colors.accent300} />
            <Text style={[styles.actionBtnText, { color: Colors.accent300 }]}>Verify KYC</Text>
          </TouchableOpacity>
        )}

        {!pass.accessCard && (
          <TouchableOpacity onPress={onIssueCard} style={[styles.actionBtn, { borderColor: '#A78BFA' }]} activeOpacity={0.7}>
            <Icon name="card-plus-outline" size={16} color="#A78BFA" />
            <Text style={[styles.actionBtnText, { color: '#A78BFA' }]}>Issue Card</Text>
          </TouchableOpacity>
        )}

        {['Pending', 'Active'].includes(pass.checkInStatus) && (
          <TouchableOpacity onPress={onCheckIn} style={[styles.actionBtn, styles.checkInBtn]} activeOpacity={0.7}>
            <Icon name="login" size={16} color={Colors.white} />
            <Text style={[styles.actionBtnText, { color: Colors.white }]}>Provision Access</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function AllDayPassesScreen() {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();
  const { dayPasses, onDemandUsers, rfidCards, commonAreas, updateDayPass } = useApp();
  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const livePasses: DayPass[] = dayPasses.map(pass => {
    const customer = pass.customerId ? onDemandUsers.find(item => item.id === pass.customerId) : undefined;
    const accessCard = pass.rfidCard ? rfidCards.find(card => card.id === pass.rfidCard || card.uid === pass.rfidCard) : undefined;
    return {
      id: pass.id, customerId: pass.customerId, memberName: pass.name || customer?.name || '', companyName: pass.company || customer?.company || '', phone: pass.phone || customer?.phone || '',
      gender: pass.gender, memberSince: pass.memberSince, date: formatDate(pass.date), checkInStatus: normalizeDayPassStatus(pass.status),
      checkInTime: pass.checkInTime, kycVerified: pass.kycVerified, bookingSource: pass.bookingSource,
      accessCard: pass.rfidCard ? { cardId: accessCard?.id || pass.rfidCard, cardLabel: accessCard?.uid || 'Access card', areas: pass.accessAreas } : undefined,
      amount: pass.amount, bookingFor: pass.bookingFor, bookedAt: pass.bookedAt, buildingName: pass.buildingName,
      numberOfGuests: pass.numberOfGuests,
    };
  });
  const dynamicDates = Array.from(new Set(livePasses.map(pass => pass.date)));
  const todayLabel = formatDate(new Date().toISOString());

  const [search,       setSearch]       = useState('');
  const [activeStatus, setActiveStatus] = useState<CheckInStatus>('All');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalPassId,  setModalPassId]  = useState<string | null>(null);
  const passes = livePasses;

  const usedCards = passes.filter(p => p.accessCard).map(p => p.accessCard!.cardId);
  const modalPass = passes.find(p => p.id === modalPassId);

  const filtered = passes.filter(p => {
    const matchDate   = selectedDate === null || p.date === selectedDate;
    const matchSearch = p.memberName.toLowerCase().includes(search.toLowerCase()) ||
                        p.companyName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = activeStatus === 'All' || p.checkInStatus === activeStatus;
    return matchDate && matchSearch && matchStatus;
  });

  const statuses = Array.from(new Set(passes.map(pass => pass.checkInStatus)));
  const counts = Object.fromEntries(
    ['All', ...statuses].map(status => [
      status,
      passes.filter(pass => (selectedDate === null || pass.date === selectedDate) && (status === 'All' || pass.checkInStatus === status)).length,
    ]),
  );

  const handleCheckIn = async (id: string) => {
    try {
      await updateDayPass(id, { status: 'Checked In' });
      Alert.alert('Access provisioned', 'The day-pass access request was accepted.');
    } catch (error) {
      Alert.alert('Access not provisioned', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleIssueCard = async (passId: string, cardId: string, areas: string[]) => {
    try {
      await updateDayPass(passId, { rfidCard: cardId, accessAreas: areas });
      setModalPassId(null);
      Alert.alert('Card issued', 'The access card was assigned successfully.');
    } catch (error) {
      Alert.alert('Card not issued', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const DATES = dynamicDates.length ? dynamicDates : [todayLabel];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Day Passes</Text>
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>{counts['All']} passes</Text>
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <ScrollView
              horizontal
              style={styles.dateScroller}
              contentContainerStyle={styles.dateRow}
              showsHorizontalScrollIndicator={false}
            >
              <TouchableOpacity
                onPress={() => setSelectedDate(null)}
                style={[styles.dateChip, selectedDate === null && styles.dateChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateChipText, selectedDate === null && styles.dateChipTextActive]}>All dates</Text>
              </TouchableOpacity>
              {DATES.map(date => (
                <TouchableOpacity
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  style={[styles.dateChip, selectedDate === date && styles.dateChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateChipText, selectedDate === date && styles.dateChipTextActive]}>
                    {date === todayLabel ? 'Today' : date}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search member or company..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <Icon name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              style={styles.statusFilterScroller}
              contentContainerStyle={styles.statusFilters}
              showsHorizontalScrollIndicator={false}
            >
              {(['All', ...statuses] as const).map(status => {
                const isActive = activeStatus === status;
                const color = status === 'All' ? Colors.accent300 : (CHECK_IN_CONFIG[status] ?? DEFAULT_STATUS_CONFIG).color;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setActiveStatus(status)}
                    style={[styles.statusFilter, isActive && { backgroundColor: `${color}22`, borderColor: color }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusFilterText, isActive && { color }]}>{status}</Text>
                    <View style={[styles.countBadge, isActive && { backgroundColor: color }]}>
                      <Text style={[styles.countText, isActive && { color: Colors.white }]}>
                        {counts[status] || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="badge-account-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No passes found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PassCard
            pass={item}
            onPress={() => navigation.navigate('DayPassDetailScreen', { passId: item.id })}
            onCheckIn={() => handleCheckIn(item.id)}
            onVerifyKyc={() => navigation.navigate('KycVerificationScreen', { memberId: item.id })}
            onIssueCard={() => setModalPassId(item.id)}
          />
        )}
      />

      {modalPass && (
        <AccessCardModal
          visible={!!modalPassId}
          memberName={modalPass.memberName}
          usedCards={usedCards}
          availableCards={rfidCards.filter(card => card.status === 'Active' && !card.assignedTo).map(card => ({ value: card.id, label: card.uid || 'Access card' }))}
          accessAreas={commonAreas.filter(area => area.status === 'Available').map(area => area.name)}
          onClose={() => setModalPassId(null)}
          onIssue={(cardId, areas) => handleIssueCard(modalPass.id, cardId, areas)}
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },
  topBar:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  countChip: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  countChipText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textSecondary },
  dateScroller: { flexGrow: 0, flexShrink: 0, minHeight: 48, marginBottom: Spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  dateChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  dateChipActive: { backgroundColor: 'rgba(255,126,21,0.15)', borderColor: Colors.accent300 },
  dateChipText: { fontFamily: 'SequelSans-BookBody', fontSize: 13, color: Colors.textSecondary },
  dateChipTextActive: { color: Colors.accent300, fontFamily: 'SequelSans-SemiBoldBody' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, paddingHorizontal: Spacing.md, height: 48, gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput: { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  statusFilterScroller: { flexGrow: 0, flexShrink: 0 },
  statusFilters: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  statusFilter: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  statusFilterText: { fontFamily: 'SequelSans-BookBody', fontSize: 12, color: Colors.textSecondary },
  countBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  countText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 10, color: Colors.textSecondary },
  listContent: { paddingHorizontal: Spacing.lg },
  card: { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.white },
  genderDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.cardSurface },
  memberInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  memberName: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary, flex: 1 },
  companyName: { ...Typography.secondaryBody, marginBottom: 2, flexShrink: 1 },
  memberSince: { ...Typography.caption, color: Colors.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  sourceText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  accessCardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, backgroundColor: 'rgba(167,139,250,0.15)' },
  accessCardBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: '#A78BFA' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderDefault, backgroundColor: Colors.secondarySurface },
  actionBtnText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12 },
  checkInBtn: { backgroundColor: Colors.accent300, borderColor: Colors.accent300 },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textMuted },
});

const modalStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderDefault, alignSelf: 'center', marginBottom: Spacing.lg },
  title:    { ...Typography.pageTitle, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { ...Typography.secondaryBody, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderDefault, height: 52, paddingHorizontal: Spacing.lg },
  dropdownBtnText: { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textMuted },
  dropdown: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, marginTop: Spacing.xs, overflow: 'hidden' },
  dropdownSearch: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  dropdownInput: { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 14, color: Colors.textPrimary },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  dropdownItemActive: { backgroundColor: 'rgba(255,126,21,0.08)' },
  dropdownItemText: { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  noCards: { padding: Spacing.lg, textAlign: 'center', fontFamily: 'SequelSans-BookBody', fontSize: 14, color: Colors.textMuted },
  areasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  areaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  areaChipActive: { borderColor: Colors.accent300, backgroundColor: 'rgba(255,126,21,0.08)' },
  areaChipText: { fontFamily: 'SequelSans-BookBody', fontSize: 13, color: Colors.textSecondary },
  issueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md, backgroundColor: Colors.accent300, marginTop: Spacing.xl },
  issueBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },
});
