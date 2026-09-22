import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import {
  normalizeRoomBookingStatus,
  resolveRoomBookingProfileTarget,
  type RoomBookingProfileTarget,
} from '../../utils/roomBooking';
import { formatTimeRange } from '../../utils/timeRange';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type BookingStatus =
  | 'Confirmed'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Pending'
  | 'Approval Pending'
  | 'Payment Pending';

interface RoomBooking {
  id: string;
  roomName: string;
  floor: string;
  memberName: string;
  companyName: string;
  memberId: string;
  guestId?: string;
  clientId?: string;
  profileTarget: RoomBookingProfileTarget | null;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  attendees: number;
}

const STATUS_CONFIG: Record<BookingStatus, { color: string; icon: string }> = {
  Confirmed: { color: Colors.success, icon: 'check-circle-outline' },
  'In Progress': { color: '#30BCED', icon: 'progress-clock' },
  Completed: { color: Colors.textMuted, icon: 'check-circle' },
  Cancelled: { color: Colors.alert, icon: 'close-circle-outline' },
  Pending: { color: Colors.accent300, icon: 'clock-outline' },
  'Approval Pending': { color: '#A78BFA', icon: 'account-clock-outline' },
  'Payment Pending': {
    color: Colors.accent300,
    icon: 'credit-card-clock-outline',
  },
};

const FLOOR_COLORS: Record<string, string> = {
  'Floor 1': '#30BCED',
  'Floor 2': '#A78BFA',
  'Floor 3': '#F472B6',
};

const ALL_STATUSES: BookingStatus[] = [
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled',
  'Pending',
  'Approval Pending',
  'Payment Pending',
];

function BookingCard({
  booking,
  onViewProfile,
  onViewDetails,
}: {
  booking: RoomBooking;
  onViewProfile: () => void;
  onViewDetails: () => void;
}) {
  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.Pending;
  const floorColor = FLOOR_COLORS[booking.floor] ?? Colors.textSecondary;
  const profileAvailable = Boolean(booking.profileTarget);
  const displayName = booking.memberName || 'Guest details unavailable';

  return (
    <View style={styles.card}>
      {/* Time bar */}
      <View
        style={[
          styles.timeBar,
          {
            backgroundColor: `${statusCfg.color}22`,
            borderLeftColor: statusCfg.color,
          },
        ]}
      >
        <Text style={[styles.timeText, { color: statusCfg.color }]}>
          {formatTimeRange(booking.startTime, booking.endTime)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: `${statusCfg.color}22`,
              borderColor: statusCfg.color,
            },
          ]}
        >
          <Icon name={statusCfg.icon} size={12} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {booking.status}
          </Text>
        </View>
      </View>

      {/* Room info */}
      <View style={styles.roomRow}>
        <View style={styles.roomIconWrap}>
          <Icon name="door-open" size={20} color={floorColor} />
        </View>
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{booking.roomName}</Text>
          <View style={styles.floorRow}>
            {booking.floor ? (
              <View
                style={[
                  styles.floorBadge,
                  { backgroundColor: `${floorColor}22` },
                ]}
              >
                <Text style={[styles.floorText, { color: floorColor }]}>
                  {booking.floor}
                </Text>
              </View>
            ) : null}
            <View style={styles.attendeesRow}>
              <Icon
                name="account-group-outline"
                size={12}
                color={Colors.textMuted}
              />
              <Text style={styles.attendeesText}>
                {booking.attendees} attendees
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Member row */}
      <TouchableOpacity
        onPress={onViewProfile}
        disabled={!profileAvailable}
        activeOpacity={0.7}
        style={styles.memberRow}
      >
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {displayName
              .split(' ')
              .map(n => n[0])
              .join('')
              .slice(0, 2)}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{displayName}</Text>
          {booking.companyName ? (
            <Text style={styles.memberCompany}>{booking.companyName}</Text>
          ) : null}
        </View>
        {profileAvailable ? (
          <View style={styles.viewProfileBtn}>
            <Text style={styles.viewProfileText}>Profile</Text>
            <Icon name="chevron-right" size={14} color={Colors.accent300} />
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onViewDetails}
        style={styles.detailsButton}
        activeOpacity={0.7}
      >
        <Text style={styles.detailsButtonText}>Manage visitors & access</Text>
        <Icon name="chevron-right" size={16} color={Colors.accent300} />
      </TouchableOpacity>
    </View>
  );
}

export function AllRoomBookingsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { bookings, members, onDemandUsers, companies } = useApp();
  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
  };
  const memberIds = new Set(members.map(member => member.id));
  const guestIds = new Set(onDemandUsers.map(guest => guest.id));
  const companyIds = new Set(companies.map(company => company.id));
  const bookingData: RoomBooking[] = bookings.map(booking => ({
    id: booking.id,
    roomName: booking.room,
    floor: booking.floor,
    memberName: booking.memberName,
    companyName: booking.company,
    memberId: booking.memberId,
    guestId: booking.guestId,
    clientId: booking.clientId,
    profileTarget: resolveRoomBookingProfileTarget(
      booking,
      memberIds,
      guestIds,
      companyIds,
    ),
    date: formatDate(booking.date),
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: normalizeRoomBookingStatus(booking.status),
    attendees: booking.attendees,
  }));
  const todayLabel = formatDate(new Date().toISOString());
  const dates = Array.from(new Set(bookingData.map(booking => booking.date)));
  const roomOptions = [
    'All Rooms',
    ...Array.from(
      new Set(bookingData.map(booking => booking.roomName).filter(Boolean)),
    ),
  ];
  const floorOptions = [
    'All Floors',
    ...Array.from(
      new Set(bookingData.map(booking => booking.floor).filter(Boolean)),
    ),
  ];

  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayLabel);
  const [activeStatus, setActiveStatus] = useState<BookingStatus | 'All'>(
    'All',
  );
  const [activeRoom, setActiveRoom] = useState('All Rooms');
  const [activeFloor, setActiveFloor] = useState('All Floors');
  const [showRoomFilter, setShowRoomFilter] = useState(false);
  const [showFloorFilter, setShowFloorFilter] = useState(false);

  const filtered = bookingData.filter(b => {
    const matchDate = b.date === selectedDate;
    const matchSearch =
      b.memberName.toLowerCase().includes(search.toLowerCase()) ||
      b.companyName.toLowerCase().includes(search.toLowerCase()) ||
      b.roomName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = activeStatus === 'All' || b.status === activeStatus;
    const matchRoom = activeRoom === 'All Rooms' || b.roomName === activeRoom;
    const matchFloor = activeFloor === 'All Floors' || b.floor === activeFloor;
    return matchDate && matchSearch && matchStatus && matchRoom && matchFloor;
  });

  const counts = {
    All: bookingData.filter(b => b.date === selectedDate).length,
    Confirmed: bookingData.filter(
      b => b.date === selectedDate && b.status === 'Confirmed',
    ).length,
    'In Progress': bookingData.filter(
      b => b.date === selectedDate && b.status === 'In Progress',
    ).length,
    Completed: bookingData.filter(
      b => b.date === selectedDate && b.status === 'Completed',
    ).length,
    Cancelled: bookingData.filter(
      b => b.date === selectedDate && b.status === 'Cancelled',
    ).length,
    Pending: bookingData.filter(
      b => b.date === selectedDate && b.status === 'Pending',
    ).length,
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Room Bookings</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddRoomBookingScreen')}
            style={styles.addBtn}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={20} color={Colors.white} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Date selector */}
      <View style={styles.dateRow}>
        {(dates.length ? dates : [todayLabel]).map(date => (
          <TouchableOpacity
            key={date}
            onPress={() => setSelectedDate(date)}
            style={[
              styles.dateChip,
              selectedDate === date && styles.dateChipActive,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dateChipText,
                selectedDate === date && styles.dateChipTextActive,
              ]}
            >
              {date === todayLabel ? 'Today' : date}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search + filters */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search room, member or company..."
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

      {/* Room + Floor filter chips */}
      <View style={styles.filterChipsRow}>
        {/* Room filter */}
        <TouchableOpacity
          onPress={() => {
            setShowRoomFilter(p => !p);
            setShowFloorFilter(false);
          }}
          style={[
            styles.filterChip,
            activeRoom !== 'All Rooms' && styles.filterChipActive,
          ]}
          activeOpacity={0.7}
        >
          <Icon
            name="door-open"
            size={14}
            color={
              activeRoom !== 'All Rooms'
                ? Colors.accent300
                : Colors.textSecondary
            }
          />
          <Text
            style={[
              styles.filterChipText,
              activeRoom !== 'All Rooms' && { color: Colors.accent300 },
            ]}
          >
            {activeRoom === 'All Rooms' ? 'All Rooms' : activeRoom}
          </Text>
          <Icon
            name="chevron-down"
            size={14}
            color={
              activeRoom !== 'All Rooms'
                ? Colors.accent300
                : Colors.textSecondary
            }
          />
        </TouchableOpacity>

        {/* Floor filter */}
        <TouchableOpacity
          onPress={() => {
            setShowFloorFilter(p => !p);
            setShowRoomFilter(false);
          }}
          style={[
            styles.filterChip,
            activeFloor !== 'All Floors' && styles.filterChipActive,
          ]}
          activeOpacity={0.7}
        >
          <Icon
            name="layers-outline"
            size={14}
            color={
              activeFloor !== 'All Floors'
                ? Colors.accent300
                : Colors.textSecondary
            }
          />
          <Text
            style={[
              styles.filterChipText,
              activeFloor !== 'All Floors' && { color: Colors.accent300 },
            ]}
          >
            {activeFloor === 'All Floors' ? 'All Floors' : activeFloor}
          </Text>
          <Icon
            name="chevron-down"
            size={14}
            color={
              activeFloor !== 'All Floors'
                ? Colors.accent300
                : Colors.textSecondary
            }
          />
        </TouchableOpacity>

        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{filtered.length} bookings</Text>
        </View>
      </View>

      {/* Room dropdown */}
      {showRoomFilter && (
        <View style={styles.filterDropdown}>
          {roomOptions.map(room => (
            <TouchableOpacity
              key={room}
              onPress={() => {
                setActiveRoom(room);
                setShowRoomFilter(false);
              }}
              style={[
                styles.filterDropdownItem,
                activeRoom === room && styles.filterDropdownItemActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterDropdownText,
                  activeRoom === room && { color: Colors.accent300 },
                ]}
              >
                {room}
              </Text>
              {activeRoom === room && (
                <Icon name="check" size={14} color={Colors.accent300} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Floor dropdown */}
      {showFloorFilter && (
        <View style={styles.filterDropdown}>
          {floorOptions.map(floor => {
            const color = FLOOR_COLORS[floor] ?? Colors.textSecondary;
            return (
              <TouchableOpacity
                key={floor}
                onPress={() => {
                  setActiveFloor(floor);
                  setShowFloorFilter(false);
                }}
                style={[
                  styles.filterDropdownItem,
                  activeFloor === floor && styles.filterDropdownItemActive,
                ]}
                activeOpacity={0.7}
              >
                {floor !== 'All Floors' && (
                  <View style={[styles.floorDot, { backgroundColor: color }]} />
                )}
                <Text
                  style={[
                    styles.filterDropdownText,
                    activeFloor === floor && { color: Colors.accent300 },
                  ]}
                >
                  {floor}
                </Text>
                {activeFloor === floor && (
                  <Icon name="check" size={14} color={Colors.accent300} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Status filters */}
      <View style={styles.statusFilters}>
        {(['All', ...ALL_STATUSES] as const).map(status => {
          const isActive = activeStatus === status;
          const color =
            status === 'All'
              ? Colors.accent300
              : STATUS_CONFIG[status as BookingStatus].color;
          return (
            <TouchableOpacity
              key={status}
              onPress={() => setActiveStatus(status)}
              style={[
                styles.statusFilter,
                isActive && {
                  backgroundColor: `${color}22`,
                  borderColor: color,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusFilterText, isActive && { color }]}>
                {status}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  isActive && { backgroundColor: color },
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    isActive && { color: Colors.white },
                  ]}
                >
                  {counts[status as keyof typeof counts] ?? 0}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon
              name="calendar-blank-outline"
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onViewProfile={() => {
              if (item.profileTarget?.type === 'member')
                navigation.navigate('MemberDetailScreen', {
                  memberId: item.profileTarget.id,
                });
              else if (item.profileTarget?.type === 'guest')
                navigation.navigate('OnDemandUserDetailScreen', {
                  guestId: item.profileTarget.id,
                });
              else if (item.profileTarget?.type === 'company')
                navigation.navigate('CompanyDetailScreen', {
                  companyId: item.profileTarget.id,
                });
            }}
            onViewDetails={() =>
              navigation.navigate('MeetingBookingDetailScreen', {
                bookingId: item.id,
              })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent300,
  },
  addBtnText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 13,
    color: Colors.white,
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  dateChipActive: {
    backgroundColor: 'rgba(255,126,21,0.15)',
    borderColor: Colors.accent300,
  },
  dateChipText: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dateChipTextActive: {
    color: Colors.accent300,
    fontFamily: 'SequelSans-SemiBoldBody',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'SequelSans-BookBody',
    fontSize: 15,
    color: Colors.textPrimary,
  },

  // Filter chips
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  filterChipActive: {
    borderColor: Colors.accent300,
    backgroundColor: 'rgba(255,126,21,0.1)',
  },
  filterChipText: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  countChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  countChipText: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Filter dropdown
  filterDropdown: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    zIndex: 100,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDefault,
  },
  filterDropdownItemActive: { backgroundColor: 'rgba(255,126,21,0.08)' },
  filterDropdownText: {
    flex: 1,
    fontFamily: 'SequelSans-BookBody',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  floorDot: { width: 8, height: 8, borderRadius: 4 },

  // Status filters
  statusFilters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  statusFilterText: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.secondarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  countBadgeText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 10,
    color: Colors.textSecondary,
  },

  // List
  listContent: { paddingHorizontal: Spacing.lg },

  // Card
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDefault,
  },
  detailsButtonText: { ...Typography.caption, color: Colors.accent300 },
  timeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderLeftWidth: 3,
  },
  timeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  roomIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomInfo: { flex: 1 },
  roomName: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  floorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  floorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  floorText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  attendeesRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendeesText: { ...Typography.caption, color: Colors.textMuted },

  divider: {
    height: 1,
    backgroundColor: Colors.borderDefault,
    marginHorizontal: Spacing.lg,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 12,
    color: Colors.white,
  },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 13,
    color: Colors.textPrimary,
  },
  memberCompany: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
    flexShrink: 1,
  },
  viewProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewProfileText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 12,
    color: Colors.accent300,
  },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textMuted },
});
