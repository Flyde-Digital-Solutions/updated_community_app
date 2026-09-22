import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../services/apiClient';
import { Routes } from '../../services/routes';
import { formatTimeRange } from '../../utils/timeRange';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type GuestStatus = 'Expected' | 'Checked In' | 'Checked Out' | 'No Show';

interface Guest {
  id: string;
  guestName: string;
  guestPhone: string;
  guestCompany?: string;
  invitedBy: string;
  invitedByCompany: string;
  cabin: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  status: GuestStatus;
  checkInTime?: string;
  checkOutTime?: string;
  purpose?: string;
}

const STATUS_CONFIG: Record<GuestStatus, { color: string; icon: string }> = {
  'Expected':    { color: Colors.accent300, icon: 'clock-outline'       },
  'Checked In':  { color: Colors.success,   icon: 'check-circle'        },
  'Checked Out': { color: '#30BCED',        icon: 'logout'              },
  'No Show':     { color: Colors.alert,     icon: 'close-circle-outline'},
};

const ALL_STATUSES: GuestStatus[] = ['Expected', 'Checked In', 'Checked Out', 'No Show'];

// ── Guest Card ────────────────────────────────────────────────────────────────
function GuestCard({
  guest,
  onCheckIn,
  onCheckOut,
  onDetails,
}: {
  guest: Guest;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onDetails: () => void;
}) {
  const statusCfg = STATUS_CONFIG[guest.status];

  return (
    <View style={styles.card}>
      {/* Time slot bar */}
      <View style={[styles.slotBar, { borderLeftColor: statusCfg.color, backgroundColor: `${statusCfg.color}11` }]}>
        <View style={styles.slotBarLeft}>
          <Icon name="clock-outline" size={13} color={statusCfg.color} />
          <Text style={[styles.slotTime, { color: statusCfg.color }]}>
            {formatTimeRange(guest.slotStart, guest.slotEnd)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}22`, borderColor: statusCfg.color }]}>
          <Icon name={statusCfg.icon} size={12} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{guest.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* Guest info */}
        <View style={styles.guestRow}>
          <View style={styles.guestAvatar}>
            <Text style={styles.guestAvatarText}>
              {guest.guestName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </Text>
          </View>
          <View style={styles.guestInfo}>
            <Text style={styles.guestName}>{guest.guestName}</Text>
            {guest.guestCompany && (
              <Text style={styles.guestCompany}>{guest.guestCompany}</Text>
            )}
            <Text style={styles.guestPhone}>{guest.guestPhone}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Invited by */}
        <View style={styles.invitedByRow}>
          <Icon name="account-arrow-left-outline" size={14} color={Colors.textMuted} />
          <View style={styles.invitedByDetails}>
            <Text style={styles.invitedByLabel}>Invited by</Text>
            <Text style={styles.invitedByName}>{guest.invitedBy || 'Reception'}</Text>
            {!!guest.invitedByCompany && (
              <Text style={styles.invitedByCompany}>{guest.invitedByCompany}</Text>
            )}
          </View>
          <View style={styles.cabinBadge}>
            <Icon name="office-building" size={11} color="#30BCED" />
            <Text style={styles.cabinBadgeText} numberOfLines={2}>{guest.cabin}</Text>
          </View>
        </View>

        {/* Purpose */}
        {guest.purpose && (
          <View style={styles.purposeRow}>
            <Icon name="text-box-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.purposeText}>{guest.purpose}</Text>
          </View>
        )}

        {/* Check in / out times */}
        {(guest.checkInTime || guest.checkOutTime) && (
          <View style={styles.timesRow}>
            {guest.checkInTime && (
              <View style={styles.timeChip}>
                <Icon name="login" size={12} color={Colors.success} />
                <Text style={styles.timeChipText}>In {guest.checkInTime}</Text>
              </View>
            )}
            {guest.checkOutTime && (
              <View style={[styles.timeChip, { backgroundColor: 'rgba(48,188,237,0.12)' }]}>
                <Icon name="logout" size={12} color="#30BCED" />
                <Text style={[styles.timeChipText, { color: '#30BCED' }]}>Out {guest.checkOutTime}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity onPress={onDetails} style={[styles.checkInBtn, styles.detailsBtn]} activeOpacity={0.8}>
          <Icon name="information-outline" size={16} color={Colors.textPrimary} />
          <Text style={[styles.checkInBtnText, { color: Colors.textPrimary }]}>View Details</Text>
        </TouchableOpacity>
        {guest.status === 'Expected' && (
          <TouchableOpacity
            onPress={onCheckIn}
            style={styles.checkInBtn}
            activeOpacity={0.8}
          >
            <Icon name="login" size={16} color={Colors.white} />
            <Text style={styles.checkInBtnText}>Mark Checked In</Text>
          </TouchableOpacity>
        )}

        {guest.status === 'Checked In' && (
          <TouchableOpacity
            onPress={onCheckOut}
            style={[styles.checkInBtn, styles.checkOutBtn]}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={16} color="#30BCED" />
            <Text style={[styles.checkInBtnText, { color: '#30BCED' }]}>Mark Checked Out</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function ViewGuestsScreen() {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();
  const { visitors, setVisitorStatus } = useApp();
  const [serverStats, setServerStats] = useState<Record<string, number>>({});
  useEffect(() => {
    apiClient.get<Record<string, unknown>>(Routes.community.visitorStats).then(response => {
      const root = response.data && typeof response.data === 'object' ? response.data as Record<string, unknown> : response;
      setServerStats(Object.fromEntries(Object.entries(root).filter(([, value]) => typeof value === 'number')) as Record<string, number>);
    }).catch(() => setServerStats({}));
  }, [visitors]);
  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const liveGuests: Guest[] = visitors.map(visitor => ({
    id: visitor.id, guestName: visitor.name, guestPhone: visitor.phone, guestCompany: visitor.company,
    invitedBy: visitor.host, invitedByCompany: '', cabin: visitor.purpose || 'Reception', date: formatDate(visitor.visitDate),
    slotStart: visitor.arrivalTime, slotEnd: visitor.departureTime || '', status: visitor.status, purpose: visitor.purpose,
  }));
  const todayLabel = formatDate(new Date().toISOString());

  const [search,        setSearch]        = useState('');
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null);
  const [activeStatus,  setActiveStatus]  = useState<GuestStatus | 'All'>('All');
  const guests = liveGuests;
  const dates = Array.from(new Set(guests.map(guest => guest.date)));

  const filtered = guests.filter(g => {
    const matchDate   = selectedDate === null || g.date === selectedDate;
    const matchSearch =
      g.guestName.toLowerCase().includes(search.toLowerCase()) ||
      (g.guestCompany ?? '').toLowerCase().includes(search.toLowerCase()) ||
      g.invitedBy.toLowerCase().includes(search.toLowerCase()) ||
      g.cabin.toLowerCase().includes(search.toLowerCase());
    const matchStatus = activeStatus === 'All' || g.status === activeStatus;
    return matchDate && matchSearch && matchStatus;
  });

  const counts = {
    All:           guests.filter(g => selectedDate === null || g.date === selectedDate).length,
    'Expected':    guests.filter(g => (selectedDate === null || g.date === selectedDate) && g.status === 'Expected').length,
    'Checked In':  guests.filter(g => (selectedDate === null || g.date === selectedDate) && g.status === 'Checked In').length,
    'Checked Out': guests.filter(g => (selectedDate === null || g.date === selectedDate) && g.status === 'Checked Out').length,
    'No Show':     guests.filter(g => (selectedDate === null || g.date === selectedDate) && g.status === 'No Show').length,
  };

  const handleCheckIn = async (id: string) => {
    await setVisitorStatus(id, 'Checked In');
  };

  const handleCheckOut = async (id: string) => {
    await setVisitorStatus(id, 'Checked Out');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.safeTop}>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                  <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Guests</Text>
                <TouchableOpacity onPress={() => navigation.navigate('InviteVisitorScreen')} style={styles.addButton} activeOpacity={0.7}>
                  <Icon name="account-plus-outline" size={18} color={Colors.white} />
                  <Text style={styles.addButtonText}>Invite</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateRow}
            >
              <TouchableOpacity
                onPress={() => setSelectedDate(null)}
                style={[styles.dateChip, selectedDate === null && styles.dateChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateChipText, selectedDate === null && styles.dateChipTextActive]}>All dates</Text>
              </TouchableOpacity>
              {(dates.length ? dates : [todayLabel]).map(date => (
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
                placeholder="Search guest, host or cabin..."
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

            <View style={styles.statusFilters}>
              {(['All', ...ALL_STATUSES] as const).map(status => {
                const isActive = activeStatus === status;
                const color    = status === 'All' ? Colors.accent300 : STATUS_CONFIG[status as GuestStatus].color;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setActiveStatus(status)}
                    style={[styles.statusFilter, isActive && { backgroundColor: `${color}22`, borderColor: color }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusFilterText, isActive && { color }]}>{status}</Text>
                    <View style={[styles.countBadge, isActive && { backgroundColor: color }]}> 
                      <Text style={[styles.countBadgeText, isActive && { color: Colors.white }]}> 
                        {counts[status as keyof typeof counts] ?? 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="account-group-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No guests found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <GuestCard
            guest={item}
            onCheckIn={() => handleCheckIn(item.id)}
            onCheckOut={() => handleCheckOut(item.id)}
            onDetails={() => navigation.navigate('VisitorDetailScreen', { visitorId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  screenTitle:  { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  countChip:    { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  countChipText:{ fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textSecondary },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accent300, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  addButtonText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.white },

  dateRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  dateChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  dateChipActive: { backgroundColor: 'rgba(255,126,21,0.15)', borderColor: Colors.accent300 },
  dateChipText: { fontFamily: 'SequelSans-BookBody', fontSize: 13, color: Colors.textSecondary },
  dateChipTextActive: { color: Colors.accent300, fontFamily: 'SequelSans-SemiBoldBody' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md, height: 48, gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput: { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },

  statusFilters: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  statusFilter:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  statusFilterText: { fontFamily: 'SequelSans-BookBody', fontSize: 12, color: Colors.textSecondary },
  countBadge:    { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  countBadgeText:{ fontFamily: 'SequelSans-SemiBoldBody', fontSize: 10, color: Colors.textSecondary },

  listContent: { flexGrow: 1 },

  card: { marginHorizontal: Spacing.lg, backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.sm, overflow: 'hidden' },

  slotBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderLeftWidth: 3 },
  slotBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotTime:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusText:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  cardBody: { padding: Spacing.lg },

  guestRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  guestAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#A78BFA', justifyContent: 'center', alignItems: 'center' },
  guestAvatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.white },
  guestInfo:       { flex: 1 },
  guestName:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary },
  guestCompany:    { ...Typography.secondaryBody, color: Colors.textSecondary, marginTop: 1 },
  guestPhone:      { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },

  divider: { height: 1, backgroundColor: Colors.borderDefault, marginBottom: Spacing.md },

  invitedByRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  invitedByDetails:{ flex: 1, minWidth: 0 },
  invitedByLabel:  { ...Typography.caption, color: Colors.textMuted },
  invitedByName:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, lineHeight: 18, color: Colors.textPrimary, flexShrink: 1 },
  cabinBadge:      { maxWidth: '38%', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, backgroundColor: 'rgba(48,188,237,0.12)' },
  cabinBadgeText:  { flexShrink: 1, fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, lineHeight: 14, color: '#30BCED' },
  invitedByCompany:{ ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  purposeRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  purposeText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },

  timesRow:    { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  timeChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, backgroundColor: 'rgba(0,129,54,0.12)' },
  timeChipText:{ fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.success },

  checkInBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.accent300, marginTop: Spacing.sm },
  checkOutBtn: { backgroundColor: 'rgba(48,188,237,0.12)', borderWidth: 1, borderColor: '#30BCED' },
  detailsBtn: { backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  checkInBtnText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.white },

  empty:     { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textMuted },
});
