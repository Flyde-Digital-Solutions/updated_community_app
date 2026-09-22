import React, { useEffect, useState } from 'react';
import {
  Alert, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useApp } from '../../context/AppContext';
import { useDayPassCatalog } from '../../hooks/useDayPassCatalog';
import { DropdownField } from '../../components/molecules/DropdownField';
import type { RootStackParamList } from '../../navigation/MainStackNavigator';
import { apiClient } from '../../services/apiClient';
import { Routes } from '../../services/routes';
import { KeyboardSafeScrollView } from '../../components/molecules/KeyboardSafeScrollView';
import { selectedRoomAvailability } from '../../utils/roomAvailability';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'AddRoomBookingScreen'>;

const START_HOUR       = 8;
const END_HOUR         = 22;
const MIN_DURATION     = 0.5; // 30 min minimum

const FLOOR_COLORS: Record<string, string> = {
  'Floor 1': '#30BCED',
  'Floor 2': '#A78BFA',
  'Floor 3': '#F472B6',
};

type TimelineBooking = { start: number; end: number; name: string };
type MemberOption = { id: string; name: string; company: string; companyId?: string };

const DATE_OPTIONS = Array.from({ length: 5 }, (_, offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
});
const TODAY = DATE_OPTIONS[0];
const ROOM_TIME_OPTIONS = Array.from(
  { length: (END_HOUR - START_HOUR) * 2 + 1 },
  (_, index) => {
    const value = START_HOUR + index / 2;
    return { value: String(value), label: formatHour(value) };
  },
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatHour(hour: number) {
  const h   = Math.floor(hour);
  const m   = Math.round((hour - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh  = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function parseHour(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return hour + minute / 60;
}

function isOverlapping(
  startA: number, endA: number,
  startB: number, endB: number
) {
  return startA < endB && endA > startB;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function AddRoomBookingScreen() {
  const navigation = useNavigation<Navigation>();
  const insets     = useSafeAreaInsets();
  const { members, onDemandUsers, meetingRooms, bookings, createBooking, user } = useApp();
  const { buildings } = useDayPassCatalog();
  const memberOptions: MemberOption[] = members.map(member => ({ id: member.id, name: member.name, company: member.company, companyId: member.companyId }));

  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [selectedDate,   setSelectedDate]   = useState(TODAY);
  const [startHour,      setStartHour]      = useState(10);
  const [endHour,        setEndHour]        = useState(11);

  // Member type
  const [bookingType,    setBookingType]    = useState<'member' | 'walkin'>('member');

  // Member search
  const [memberSearch,   setMemberSearch]   = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [showMemberList, setShowMemberList] = useState(false);

  const [selectedGuestId, setSelectedGuestId] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'razorpay'>('razorpay');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [discountReason, setDiscountReason] = useState('Community promotional discount');
  const [useBuildingDiscount, setUseBuildingDiscount] = useState(true);
  const [bookingOutcome, setBookingOutcome] = useState<'confirmed' | 'approval_pending' | 'payment_pending'>('confirmed');

  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState('');
  const [creditInfo, setCreditInfo] = useState('');

  const selectedRoom = meetingRooms.find(room => room.id === selectedRoomId) || meetingRooms[0];
  const building = buildings.find(item => item.id === user?.buildingId);
  const selectedGuest = onDemandUsers.find(guest => guest.id === selectedGuestId);

  useEffect(() => { setAvailabilityInfo(''); }, [selectedRoomId, selectedDate, startHour, endHour]);

  useEffect(() => {
    if (!selectedMember?.companyId) { setCreditInfo(''); return; }
    apiClient.get<Record<string, unknown>>(Routes.creditsSummary(selectedMember.companyId)).then(response => {
      const raw = response.data && typeof response.data === 'object' ? response.data as Record<string, unknown> : response;
      const balance = raw.availableCredits ?? raw.balance ?? raw.credits ?? raw.remainingCredits;
      setCreditInfo(balance == null ? 'Credit summary loaded' : `${Number(balance).toLocaleString('en-IN')} credits available`);
    }).catch(() => setCreditInfo('Credit summary unavailable'));
  }, [selectedMember?.companyId]);

  if (!selectedRoom) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeTop} />
        <View style={styles.successContainer}>
          <Icon name="door-closed" size={42} color={Colors.textMuted} />
          <Text style={styles.successTitle}>No meeting rooms available</Text>
          <Text style={styles.successSub}>Meeting rooms will appear here when they become available.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.doneBtn} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredMembers = memberOptions.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.company.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const existingBookings: TimelineBooking[] = bookings
    .filter(booking => booking.room === selectedRoom.name && booking.date.slice(0, 10) === selectedDate)
    .map(booking => ({ start: parseHour(booking.startTime), end: parseHour(booking.endTime), name: booking.memberName }));
  const hasConflict = existingBookings.some(b =>
    isOverlapping(startHour, endHour, b.start, b.end)
  );

  const isValid =
    !hasConflict &&
    (bookingType === 'member'
      ? !!selectedMember
      : !!selectedGuest);

  const manualDiscount = paymentMethod === 'razorpay' ? Number(discountPercent) || 0 : 0;
  const buildingDiscountCap = building?.communityDiscountMaxPercent ?? 10;
  const discountCap = useBuildingDiscount
    ? buildingDiscountCap
    : selectedRoom.communityMaxDiscountPercent ?? buildingDiscountCap;

  const handleSubmit = async () => {
    if (!isValid) return;
    if (manualDiscount < 0 || manualDiscount > 100) return Alert.alert('Invalid discount', 'Enter a discount between 0 and 100%.');
    if (paymentMethod === 'razorpay' && manualDiscount > 0 && !discountReason.trim()) return Alert.alert('Reason required', 'Enter a reason for the manual discount.');
    setSubmitting(true);
    try {
      const availability = await apiClient.get<Record<string, unknown>>(
        Routes.meetingRoomSlots(selectedRoom.id),
        { date: selectedDate },
      );
      if (selectedRoomAvailability(availability, startHour, endHour) !== true)
        throw new Error('This room is not confirmed available for the selected time slot. Please choose another slot.');
      const memberName = bookingType === 'member' ? selectedMember?.name || '' : selectedGuest?.name || '';
      const booking = await createBooking({
        room: selectedRoom.name,
        roomId: selectedRoom.id,
        floor: selectedRoom.floor,
        date: selectedDate,
        startTime: formatHour(startHour),
        endTime: formatHour(endHour),
        memberId: bookingType === 'member' ? selectedMember?.id || '' : '',
        guestId: bookingType === 'walkin' ? selectedGuest?.id : undefined,
        clientId: bookingType === 'member' ? selectedMember?.companyId : undefined,
        memberName,
        company: bookingType === 'member' ? selectedMember?.company || '' : selectedGuest?.company || 'Walk-in Guest',
        attendees: 1,
        purpose: bookingType === 'member' ? 'Meeting room booking' : 'Walk-in guest meeting-room booking',
        status: 'Confirmed',
        paymentMethod,
        ...(paymentMethod === 'razorpay' && manualDiscount > 0 ? {
          discountPercent: manualDiscount,
          discountReason: discountReason.trim(),
          usingDefaultBuildingDiscount: useBuildingDiscount,
        } : {}),
      });
      setBookingOutcome(booking.discountStatus === 'pending' || booking.status === 'Approval Pending'
        ? 'approval_pending'
        : booking.status === 'Payment Pending' ? 'payment_pending' : 'confirmed');
      setDone(true);
      if (paymentMethod === 'razorpay' && booking.discountStatus !== 'pending' && booking.status !== 'Approval Pending' && (booking.paymentOrder || booking.paymentUrl)) {
        if (booking.paymentOrder?.noPaymentRequired) return;
        if (booking.paymentOrder) {
          navigation.replace('RazorpayCheckoutScreen', {
            order: { key: booking.paymentOrder.key, amount: booking.paymentOrder.amount, orderId: booking.paymentOrder.orderId, description: booking.paymentOrder.description },
            prefill: { name: memberName, email: selectedGuest?.email, contact: selectedGuest?.phone },
            context: { meetingBookingId: booking.id, amount: booking.paymentOrder.amount },
            title: 'Meeting Room Payment',
          });
        } else if (booking.paymentUrl) {
          navigation.replace('PaymentWebViewScreen', {
            url: booking.paymentUrl,
            context: { meetingBookingId: booking.id },
            title: 'Meeting Room Payment',
          });
        }
      }
    } catch (error) {
      Alert.alert('Booking failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const checkBackendAvailability = async () => {
    try {
      const response = await apiClient.get<Record<string, unknown>>(Routes.meetingRoomSlots(selectedRoom.id), { date: selectedDate });
      const selectedStart = formatHour(startHour);
      const selectedEnd = formatHour(endHour);
      const available = selectedRoomAvailability(response, startHour, endHour);
      const message = hasConflict || available === false
        ? `${selectedStart} – ${selectedEnd} is unavailable on ${selectedDate}.`
        : available === true
        ? `${selectedStart} – ${selectedEnd} is available on ${selectedDate}.`
        : `Availability data loaded for ${selectedDate}, but the service did not confirm ${selectedStart} – ${selectedEnd}.`;
      setAvailabilityInfo(message);
    } catch (error) {
      setAvailabilityInfo(error instanceof Error ? `Availability unavailable: ${error.message}` : 'Availability unavailable.');
    }
  };

  if (done) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeTop} />
        <View style={styles.successContainer}>
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <Icon name="calendar-check" size={40} color={Colors.white} />
            </View>
          </View>
          <Text style={styles.successTitle}>{bookingOutcome === 'approval_pending' ? 'Approval Requested' : bookingOutcome === 'payment_pending' ? 'Payment Pending' : 'Booking Confirmed!'}</Text>
          <Text style={styles.successSub}>
            {bookingOutcome === 'approval_pending'
              ? 'Discount request sent for approval. The slot remains reserved and payment has not started.'
              : `${selectedRoom.name} booked for ${formatHour(startHour)} – ${formatHour(endHour)} on ${selectedDate}`}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.doneBtn} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>New Booking</Text>
        </View>
      </SafeAreaView>

      <KeyboardSafeScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >

        {/* Room Selector */}
        <Text style={styles.sectionLabel}>Room</Text>
        <TouchableOpacity
          onPress={() => setShowRoomPicker(p => !p)}
          style={styles.roomSelector}
          activeOpacity={0.7}
        >
          <View style={[styles.roomIconWrap, { backgroundColor: `${FLOOR_COLORS[selectedRoom.floor]}22` }]}>
            <Icon name="door-open" size={20} color={FLOOR_COLORS[selectedRoom.floor]} />
          </View>
          <View style={styles.roomSelectorInfo}>
            <Text style={styles.roomSelectorName}>{selectedRoom.name}</Text>
            <Text style={styles.roomSelectorFloor}>{selectedRoom.floor}</Text>
          </View>
          <Icon name={showRoomPicker ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        {showRoomPicker && (
          <View style={styles.roomPickerDropdown}>
            {meetingRooms.map(room => {
              const floorColor = FLOOR_COLORS[room.floor];
              const isActive   = room.id === selectedRoom.id;
              return (
                <TouchableOpacity
                  key={room.id}
                  onPress={() => { setSelectedRoomId(room.id); setShowRoomPicker(false); }}
                  style={[styles.roomPickerItem, isActive && styles.roomPickerItemActive]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roomPickerDot, { backgroundColor: floorColor }]} />
                  <View style={styles.roomPickerInfo}>
                    <Text style={[styles.roomPickerName, isActive && { color: Colors.accent300 }]}>{room.name}</Text>
                    <Text style={styles.roomPickerFloor}>{room.floor}</Text>
                  </View>
                  {isActive && <Icon name="check" size={16} color={Colors.accent300} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Date Selector */}
        <Text style={styles.sectionLabel}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={styles.dateScrollContent}>
          {DATE_OPTIONS.map(date => (
            <TouchableOpacity
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[styles.dateChip, selectedDate === date && styles.dateChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateChipText, selectedDate === date && styles.dateChipTextActive]}>
                {date === TODAY ? 'Today' : date}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time Selector */}
        <Text style={styles.sectionLabel}>Time Slot</Text>
        <View style={styles.card}>
          <Text style={styles.timeHelper}>
            Choose a start and end time. Existing bookings are listed below.
          </Text>
          <DropdownField
            label="Start time"
            value={String(startHour)}
            options={ROOM_TIME_OPTIONS.slice(0, -1)}
            onChange={value => {
              const nextStart = Number(value);
              setStartHour(nextStart);
              if (endHour <= nextStart) setEndHour(nextStart + MIN_DURATION);
            }}
            placeholder="Select start time"
          />
          <DropdownField
            label="End time"
            value={String(endHour)}
            options={ROOM_TIME_OPTIONS.filter(
              option => Number(option.value) > startHour,
            )}
            onChange={value => setEndHour(Number(value))}
            placeholder="Select end time"
          />
          <Text style={styles.discountHint}>
            Duration: {Math.round((endHour - startHour) * 60)} minutes
          </Text>
          {existingBookings.length ? (
            <View style={styles.existingBookings}>
              <Text style={styles.walkinLabel}>Already booked</Text>
              {existingBookings.map((booking, index) => (
                <Text
                  key={`${booking.start}-${index}`}
                  style={styles.discountHint}
                >
                  {formatHour(booking.start)} – {formatHour(booking.end)} ·{' '}
                  {booking.name}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.discountHint}>
              No existing bookings for this room and date.
            </Text>
          )}
          {hasConflict ? (
            <Text style={[styles.discountHint, { color: Colors.alert }]}> 
              This time overlaps an existing booking.
            </Text>
          ) : null}
          <TouchableOpacity onPress={checkBackendAvailability} style={styles.availabilityButton}><Icon name="cloud-search-outline" size={16} color={Colors.accent300} /><Text style={styles.availabilityButtonText}>Check availability</Text></TouchableOpacity>
          {availabilityInfo ? <Text style={styles.discountHint}>{availabilityInfo}</Text> : null}
        </View>

        {/* Booking Type Toggle */}
        <Text style={styles.sectionLabel}>Booked For</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => setBookingType('member')}
            style={[styles.toggleBtn, bookingType === 'member' && styles.toggleBtnActive]}
            activeOpacity={0.7}
          >
            <Icon name="account-check-outline" size={16} color={bookingType === 'member' ? Colors.accent300 : Colors.textSecondary} />
            <Text style={[styles.toggleBtnText, bookingType === 'member' && { color: Colors.accent300 }]}>Member</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBookingType('walkin')}
            style={[styles.toggleBtn, bookingType === 'walkin' && styles.toggleBtnActive]}
            activeOpacity={0.7}
          >
            <Icon name="account-plus-outline" size={16} color={bookingType === 'walkin' ? Colors.accent300 : Colors.textSecondary} />
            <Text style={[styles.toggleBtnText, bookingType === 'walkin' && { color: Colors.accent300 }]}>Walk-in Guest</Text>
          </TouchableOpacity>
        </View>

        {/* Member Search */}
        {bookingType === 'member' && (
          <View style={styles.card}>
            {selectedMember ? (
              <View style={styles.selectedMemberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{selectedMember.name}</Text>
                  <Text style={styles.memberCompany}>{selectedMember.company}</Text>
                  {creditInfo ? <Text style={styles.discountHint}>{creditInfo}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => { setSelectedMember(null); setMemberSearch(''); }} activeOpacity={0.7}>
                  <Icon name="close-circle-outline" size={20} color={Colors.alert} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.memberSearchWrapper}>
                  <Icon name="magnify" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.memberSearchInput}
                    value={memberSearch}
                    onChangeText={t => { setMemberSearch(t); setShowMemberList(true); }}
                    onFocus={() => setShowMemberList(true)}
                    placeholder="Search member by name..."
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                {showMemberList && memberSearch.length > 0 && (
                  <View style={styles.memberList}>
                    {filteredMembers.length === 0 ? (
                      <Text style={styles.noMembersText}>No members found</Text>
                    ) : (
                      filteredMembers.map(m => (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => { setSelectedMember(m); setMemberSearch(''); setShowMemberList(false); }}
                          style={styles.memberListItem}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberListAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.memberListName}>{m.name}</Text>
                            <Text style={styles.memberListCompany}>{m.company}</Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Guest selection */}
        {bookingType === 'walkin' && (
          <View style={styles.card}>
            <DropdownField
              label="On-demand guest"
              value={selectedGuestId}
              options={onDemandUsers.map(guest => ({ value: guest.id, label: [guest.name, guest.phone].filter(Boolean).join(' · ') }))}
              onChange={setSelectedGuestId}
              placeholder="Select a guest"
              searchable
            />
            <Text style={styles.discountHint}>Select an existing on-demand guest before booking.</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Payment & Discount</Text>
        <View style={styles.toggleRow}>
          {(['razorpay', 'credits'] as const).map(method => (
            <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} style={[styles.toggleBtn, paymentMethod === method && styles.toggleBtnActive]} activeOpacity={0.7}>
              <Icon name={method === 'credits' ? 'wallet-outline' : 'credit-card-outline'} size={16} color={paymentMethod === method ? Colors.accent300 : Colors.textSecondary} />
              <Text style={[styles.toggleBtnText, paymentMethod === method && { color: Colors.accent300 }]}>{method === 'credits' ? 'Credits' : 'Razorpay'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {paymentMethod === 'razorpay' ? (
          <View style={styles.card}>
            <View style={styles.walkinField}>
              <Text style={styles.walkinLabel}>Manual discount %</Text>
              <View style={styles.walkinInput}>
                <Icon name="sale" size={18} color={Colors.textMuted} />
                <TextInput style={styles.walkinTextInput} value={discountPercent} onChangeText={value => setDiscountPercent(value.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
            <View style={styles.walkinField}>
              <Text style={styles.walkinLabel}>Discount reason</Text>
              <View style={styles.walkinInput}>
                <Icon name="text-box-outline" size={18} color={Colors.textMuted} />
                <TextInput style={styles.walkinTextInput} value={discountReason} onChangeText={setDiscountReason} placeholder="Reason for discount" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
            <TouchableOpacity onPress={() => setUseBuildingDiscount(value => !value)} style={styles.discountDefaultRow} activeOpacity={0.7}>
              <Icon name={useBuildingDiscount ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={Colors.accent300} />
              <Text style={styles.discountDefaultText}>Use building default cap ({buildingDiscountCap}%)</Text>
            </TouchableOpacity>
            <Text style={styles.discountHint}>Effective displayed cap: {discountCap}%. {manualDiscount > discountCap ? 'This request requires approval.' : 'The final approval decision is made during processing.'}</Text>
          </View>
        ) : <Text style={styles.discountHint}>Discounts are not sent for credit payments.</Text>}

        {/* Summary */}
        {isValid && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Icon name="door-open" size={16} color={FLOOR_COLORS[selectedRoom.floor]} />
              <Text style={styles.summaryText}>{selectedRoom.name} · {selectedRoom.floor}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon name="calendar" size={16} color={Colors.textSecondary} />
              <Text style={styles.summaryText}>{selectedDate}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.summaryText}>{formatHour(startHour)} – {formatHour(endHour)} ({Math.round((endHour - startHour) * 60)} min)</Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon name="account-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.summaryText}>
                {bookingType === 'member' ? selectedMember?.name : selectedGuest?.name}
                {bookingType === 'member' && selectedMember ? ` · ${selectedMember.company}` : ''}
              </Text>
            </View>
          </View>
        )}

      </KeyboardSafeScrollView>

      {/* Fixed bottom */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          style={[styles.submitBtn, (!isValid || submitting) && { opacity: 0.4 }]}
          activeOpacity={0.8}
        >
          {submitting ? (
            <Text style={styles.submitBtnText}>Confirming...</Text>
          ) : (
            <>
              <Icon name="calendar-plus" size={20} color={Colors.white} />
              <Text style={styles.submitBtnText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },
  scroll:  { flex: 1 },
  scrollContent: { padding: Spacing.lg },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },

  sectionLabel: {
    fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11,
    color: Colors.textSecondary, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },

  // Room selector
  roomSelector: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault, padding: Spacing.lg,
  },
  roomIconWrap:       { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  roomSelectorInfo:   { flex: 1 },
  roomSelectorName:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary },
  roomSelectorFloor:  { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  roomPickerDropdown: { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, overflow: 'hidden', marginTop: Spacing.xs },
  roomPickerItem:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  roomPickerItemActive: { backgroundColor: 'rgba(255,126,21,0.08)' },
  roomPickerDot:      { width: 10, height: 10, borderRadius: 5 },
  roomPickerInfo:     { flex: 1 },
  roomPickerName:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textPrimary },
  roomPickerFloor:    { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  // Date
  dateScroll:        { marginBottom: Spacing.sm },
  dateScrollContent: { gap: Spacing.sm, paddingRight: Spacing.lg },
  dateChip:          { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  dateChipActive:    { backgroundColor: 'rgba(255,126,21,0.15)', borderColor: Colors.accent300 },
  dateChipText:      { fontFamily: 'SequelSans-BookBody', fontSize: 13, color: Colors.textSecondary },
  dateChipTextActive:{ color: Colors.accent300, fontFamily: 'SequelSans-SemiBoldBody' },

  // Card
  card: {
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault,
  },
  availabilityButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderDefault, marginTop: Spacing.md, paddingTop: Spacing.md },
  availabilityButtonText: { ...Typography.caption, color: Colors.accent300 },
  timeHelper: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md },

  // Toggle
  toggleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault,
  },
  toggleBtnActive:  { borderColor: Colors.accent300, backgroundColor: 'rgba(255,126,21,0.08)' },
  toggleBtnText:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textSecondary },

  // Member search
  memberSearchWrapper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, height: 44 },
  memberSearchInput:   { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  memberList:          { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderDefault },
  memberListItem:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  memberListAvatar:    { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  memberListName:      { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  memberListCompany:   { ...Typography.caption, color: Colors.textSecondary, marginTop: 1 },
  noMembersText:       { ...Typography.secondaryBody, color: Colors.textMuted, padding: Spacing.md },
  selectedMemberRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  memberAvatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.white },
  memberInfo:          { flex: 1, minWidth: 0 },
  memberName:          { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary },
  memberCompany:       { ...Typography.caption, color: Colors.textSecondary, marginTop: 2, flexShrink: 1 },
  existingBookings:    { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderDefault },

  // Walk-in
  walkinField:     { marginBottom: Spacing.md },
  walkinLabel:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm },
  walkinInput:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, height: 48, borderWidth: 1, borderColor: Colors.borderDefault },
  walkinTextInput: { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  discountDefaultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  discountDefaultText: { ...Typography.secondaryBody, color: Colors.textPrimary, flex: 1 },
  discountHint: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },

  // Summary
  summaryCard: {
    backgroundColor: 'rgba(255,126,21,0.08)', borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,126,21,0.30)',
    marginTop: Spacing.lg, gap: Spacing.sm,
  },
  summaryTitle: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.accent300, marginBottom: Spacing.sm },
  summaryRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  summaryText:  { fontFamily: 'SequelSans-BookBody', fontSize: 14, color: Colors.textPrimary, flex: 1, flexShrink: 1 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background, borderTopWidth: 1,
    borderTopColor: Colors.borderDefault, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent300,
  },
  submitBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },

  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  successIconOuter: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,129,54,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl },
  successIconInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
  successTitle:     { ...Typography.pageTitle, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  successSub:       { ...Typography.primaryBody, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xxxl },
  doneBtn:          { height: 54, borderRadius: BorderRadius.md, backgroundColor: Colors.accent300, paddingHorizontal: Spacing.huge, justifyContent: 'center', alignItems: 'center' },
  doneBtnText:      { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },
});
