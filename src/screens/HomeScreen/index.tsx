import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput,
  KeyboardAvoidingView, Modal, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import { getInitials } from '../../utils/userDisplay';
import { DropdownField } from '../../components/molecules/DropdownField';
import { ImagePickerField } from '../../components/molecules/ImagePickerField';
import { dateOptions, timeOptions, useEventFormOptions } from '../../hooks/useEventFormOptions';
import { FileAttachment } from '../../types/domain';
import { formatTimeRange } from '../../utils/timeRange';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Types ─────────────────────────────────────────────────────────────────────
type NotificationType = 'Announcement' | 'Event' | 'Billing' | 'Maintenance' | 'Visitor';
type AudienceType     = 'All Members' | 'Specific Cabin' | 'Specific Member' | 'Day Pass Users' | 'Community Staff';

const TYPE_CONFIG: Record<NotificationType, { color: string; icon: string; bg: string }> = {
  Announcement: { color: Colors.accent300, icon: 'bullhorn-outline',            bg: 'rgba(255,126,21,0.15)'  },
  Event:        { color: '#A78BFA',        icon: 'calendar-star',               bg: 'rgba(167,139,250,0.15)' },
  Billing:      { color: '#30BCED',        icon: 'receipt',                     bg: 'rgba(48,188,237,0.15)'  },
  Maintenance:  { color: Colors.accent200, icon: 'hammer-wrench',               bg: 'rgba(255,150,64,0.15)'  },
  Visitor:      { color: '#F472B6',        icon: 'account-arrow-right-outline', bg: 'rgba(244,114,182,0.15)' },
};

const ALL_TYPES: NotificationType[]  = ['Announcement', 'Event', 'Billing', 'Maintenance', 'Visitor'];
const ALL_AUDIENCES: AudienceType[]  = ['All Members', 'Specific Member', 'Community Staff'];
const EVENT_DATE_OPTIONS = dateOptions();
const EVENT_TIME_OPTIONS = timeOptions();

// ── Send Notification Sheet ───────────────────────────────────────────────────
function SendNotificationSheet({
  visible, onClose, bottomInset,
}: { visible: boolean; onClose: () => void; bottomInset: number }) {
  const { cabins, members, sendNotification } = useApp();
  const cabinNames = cabins.map(cabin => cabin.cabinNumber);
  const [type,          setType]          = useState<NotificationType>('Announcement');
  const [audience,      setAudience]      = useState<AudienceType>('All Members');
  const [title,         setTitle]         = useState('');
  const [message,       setMessage]       = useState('');
  const [selectedCabin, setSelectedCabin] = useState(cabinNames[0] || '');
  const [memberSearch,  setMemberSearch]  = useState('');
  const [selectedMember,setSelectedMember]= useState<{ id: string; name: string; company: string } | null>(null);
  const [showMembers,   setShowMembers]   = useState(false);
  const [sending,       setSending]       = useState(false);
  const [sent,          setSent]          = useState(false);
  const [inApp,         setInApp]         = useState(true);
  const [emailChannel,  setEmailChannel]  = useState(false);
  const [smsChannel,    setSmsChannel]    = useState(false);
  const [emailSubject,  setEmailSubject]  = useState('');
  const [emailHtml,     setEmailHtml]     = useState('');
  const formScrollRef = useRef<ScrollView>(null);
  const revealBottomField = () => setTimeout(() => formScrollRef.current?.scrollToEnd({ animated: true }), 350);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const isValid = title.trim().length > 0 && message.trim().length > 0 && (inApp || emailChannel || smsChannel) &&
    (audience !== 'Specific Member' || !!selectedMember);

  const handleSend = async () => {
    if (!isValid) return;
    setSending(true);
    try {
      await sendNotification({
        type, title: title.trim(), message: message.trim(),
        audience: audience === 'Specific Member' ? selectedMember?.name || audience : audience,
        memberId: audience === 'Specific Member' ? selectedMember?.id : undefined,
        channels: { inApp, email: emailChannel, sms: smsChannel },
        emailSubject,
        emailHtml,
      });
      setSent(true);
      setTimeout(() => {
        setSent(false); setTitle(''); setMessage(''); setSelectedMember(null); setMemberSearch(''); onClose();
      }, 900);
    } catch (error) {
      Alert.alert('Notification not sent', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const typeCfg = TYPE_CONFIG[type];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sheetStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[sheetStyles.sheet, { paddingBottom: bottomInset + 24 }]}>
          <View style={sheetStyles.handle} />

          {sent ? (
            <View style={sheetStyles.sentState}>
              <Icon name="check-circle" size={48} color={Colors.success} />
              <Text style={sheetStyles.sentTitle}>Notification Sent!</Text>
              <Text style={sheetStyles.sentSub}>Your message has been delivered.</Text>
            </View>
          ) : (
            <ScrollView ref={formScrollRef} contentContainerStyle={sheetStyles.formScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={sheetStyles.sheetTitle}>Send Notification</Text>

              <DropdownField
                label="Type"
                value={type}
                options={ALL_TYPES.map(item => ({ value: item, label: item }))}
                onChange={value => setType(value as NotificationType)}
              />

              <DropdownField
                label="Send To"
                value={audience}
                options={ALL_AUDIENCES.map(item => ({ value: item, label: item }))}
                onChange={value => setAudience(value as AudienceType)}
              />

              {/* Cabin picker */}
              {audience === 'Specific Cabin' && (
                <DropdownField
                  label="Cabin"
                  value={selectedCabin}
                  options={cabinNames.map(item => ({ value: item, label: item }))}
                  onChange={setSelectedCabin}
                  placeholder="Select a cabin"
                  searchable
                />
              )}

              {/* Member search */}
              {audience === 'Specific Member' && (
                <View style={sheetStyles.memberSearch}>
                  {selectedMember ? (
                    <View style={sheetStyles.selectedMemberRow}>
                      <View style={sheetStyles.memberAvatar}>
                        <Text style={sheetStyles.memberAvatarText}>
                          {selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </Text>
                      </View>
                      <View style={sheetStyles.memberInfo}>
                        <Text style={sheetStyles.memberName}>{selectedMember.name}</Text>
                        <Text style={sheetStyles.memberCompany}>{selectedMember.company}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedMember(null)} activeOpacity={0.7}>
                        <Icon name="close-circle-outline" size={20} color={Colors.alert} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={sheetStyles.memberSearchInput}>
                        <Icon name="magnify" size={16} color={Colors.textMuted} />
                        <TextInput
                          style={sheetStyles.memberSearchText}
                          value={memberSearch}
                          onChangeText={t => { setMemberSearch(t); setShowMembers(true); }}
                          placeholder="Search member..."
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                      {showMembers && memberSearch.length > 0 && (
                        <View style={sheetStyles.memberList}>
                          {filteredMembers.map(m => (
                            <TouchableOpacity
                              key={m.id}
                              onPress={() => { setSelectedMember(m); setMemberSearch(''); setShowMembers(false); }}
                              style={sheetStyles.memberListItem}
                              activeOpacity={0.7}
                            >
                              <Text style={sheetStyles.memberListName}>{m.name}</Text>
                              <Text style={sheetStyles.memberListCompany}>{m.company}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Title */}
              <Text style={sheetStyles.label}>Delivery channels</Text>
              <View style={sheetStyles.channelRow}>
                {[{ label: 'In-app', value: inApp, set: setInApp, icon: 'bell-outline' }, { label: 'Email', value: emailChannel, set: setEmailChannel, icon: 'email-outline' }, { label: 'SMS', value: smsChannel, set: setSmsChannel, icon: 'message-text-outline' }].map(channel => <TouchableOpacity key={channel.label} onPress={() => channel.set(!channel.value)} style={[sheetStyles.channelChip, channel.value && { borderColor: typeCfg.color, backgroundColor: `${typeCfg.color}18` }]}><Icon name={channel.value ? 'checkbox-marked' : channel.icon} size={18} color={channel.value ? typeCfg.color : Colors.textMuted} /><Text style={[sheetStyles.channelText, channel.value && { color: typeCfg.color }]}>{channel.label}</Text></TouchableOpacity>)}
              </View>

              {/* Title */}
              <Text style={sheetStyles.label}>Title</Text>
              <View style={[sheetStyles.inputWrapper, { borderColor: title ? typeCfg.color : Colors.borderDefault }]}>
                <TextInput
                  style={sheetStyles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Notification title..."
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {emailChannel ? <><Text style={sheetStyles.label}>Email subject</Text><View style={sheetStyles.inputWrapper}><TextInput style={sheetStyles.input} value={emailSubject} onChangeText={setEmailSubject} placeholder="Optional email subject" placeholderTextColor={Colors.textMuted} /></View><Text style={sheetStyles.label}>Email HTML</Text><View style={sheetStyles.messageWrapper}><TextInput style={sheetStyles.messageInput} value={emailHtml} onChangeText={setEmailHtml} onFocus={revealBottomField} placeholder="Optional HTML email body" placeholderTextColor={Colors.textMuted} multiline /></View></> : null}

              {/* Message */}
              <Text style={sheetStyles.label}>Message</Text>
              <View style={[sheetStyles.messageWrapper, { borderColor: message ? typeCfg.color : Colors.borderDefault }]}>
                <TextInput
                  style={sheetStyles.messageInput}
                  value={message}
                  onChangeText={setMessage}
                  onFocus={revealBottomField}
                  placeholder="Write your message..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Send button */}
              <TouchableOpacity
                onPress={handleSend}
                disabled={!isValid || sending}
                style={[sheetStyles.sendBtn, (!isValid || sending) && { opacity: 0.4 }, { backgroundColor: typeCfg.color }]}
                activeOpacity={0.8}
              >
                <Icon name={sending ? 'loading' : 'send'} size={18} color={Colors.white} />
                <Text style={sheetStyles.sendBtnText}>{sending ? 'Sending...' : 'Send Notification'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Add Event Sheet ───────────────────────────────────────────────────────────
function AddEventSheet({
  visible, onClose, bottomInset,
}: { visible: boolean; onClose: () => void; bottomInset: number }) {
  const { createEvent } = useApp();
  const { categories, speakers } = useEventFormOptions();
  const [eventName,    setEventName]    = useState('');
  const [description,  setDescription]  = useState('');
  const [categoryId,   setCategoryId]   = useState('');
  const [subcategoryId,setSubcategoryId]= useState('');
  const [speakerId,    setSpeakerId]    = useState('');
  const [coverImage,   setCoverImage]   = useState<FileAttachment | null>(null);
  const [additionalImage, setAdditionalImage] = useState<FileAttachment | null>(null);
  const [date,         setDate]         = useState('');
  const [startTime,    setStartTime]    = useState('');
  const [endTime,      setEndTime]      = useState('');
  const [location,     setLocation]     = useState('');
  const [maxRsvp,      setMaxRsvp]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const formScrollRef = useRef<ScrollView>(null);
  const revealBottomField = () => setTimeout(() => formScrollRef.current?.scrollToEnd({ animated: true }), 350);
  const subcategories = categories.find(item => item.value === categoryId)?.subcategories || [];

  const isValid = eventName.trim().length > 0 && description.trim().length > 0 && categoryId.length > 0 &&
    (subcategories.length === 0 || subcategoryId.length > 0) && date.trim().length > 0 &&
    startTime.trim().length > 0 && endTime.trim().length > 0 && endTime > startTime;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await createEvent({
        title: eventName.trim(), description: description.trim(), date: date.trim(), startTime: startTime.trim(),
        endTime: endTime.trim(), location: location.trim(), capacity: Number(maxRsvp) || 0,
        categoryId, category: categories.find(item => item.value === categoryId)?.label,
        subcategoryId, subcategory: subcategories.find(item => item.value === subcategoryId)?.label,
        speakerId, speaker: speakers.find(item => item.value === speakerId)?.label,
        coverImageFile: coverImage || undefined, additionalImageFile: additionalImage || undefined,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false); setEventName(''); setDescription(''); setCategoryId(''); setSubcategoryId(''); setSpeakerId(''); setCoverImage(null); setAdditionalImage(null); setDate(''); setStartTime(''); setEndTime(''); setLocation(''); setMaxRsvp(''); onClose();
      }, 900);
    } catch (error) {
      Alert.alert('Event not created', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sheetStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[sheetStyles.sheet, { paddingBottom: bottomInset + 24 }]}>
          <View style={sheetStyles.handle} />

          {saved ? (
            <View style={sheetStyles.sentState}>
              <Icon name="calendar-check" size={48} color={Colors.success} />
              <Text style={sheetStyles.sentTitle}>Event Created!</Text>
              <Text style={sheetStyles.sentSub}>{eventName} has been added.</Text>
            </View>
          ) : (
            <ScrollView ref={formScrollRef} contentContainerStyle={sheetStyles.formScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={sheetStyles.sheetTitle}>Add Event</Text>

              {/* Event name */}
              <Text style={sheetStyles.label}>Event Name *</Text>
              <View style={sheetStyles.inputWrapper}>
                <TextInput
                  style={sheetStyles.input}
                  value={eventName}
                  onChangeText={setEventName}
                  placeholder="e.g. Startup Networking Night"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Description */}
              <Text style={sheetStyles.label}>Description</Text>
              <View style={sheetStyles.messageWrapper}>
                <TextInput
                  style={sheetStyles.messageInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What is this event about?"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <DropdownField
                label="Category"
                value={categoryId}
                options={categories}
                onChange={value => { setCategoryId(value); setSubcategoryId(''); }}
                placeholder="Select a category"
                searchable
              />
              <DropdownField
                label="Subcategory"
                value={subcategoryId}
                options={subcategories}
                onChange={setSubcategoryId}
                placeholder={categoryId ? 'Select a subcategory' : 'Select a category first'}
                disabled={!categoryId}
                searchable
              />
              <DropdownField
                label="Speaker"
                value={speakerId}
                options={speakers}
                onChange={setSpeakerId}
                placeholder="Select a speaker"
                searchable
              />

              <ImagePickerField label="Cover Image" file={coverImage} onChange={setCoverImage} onClear={() => setCoverImage(null)} />
              <ImagePickerField label="Additional Image" file={additionalImage} onChange={setAdditionalImage} onClear={() => setAdditionalImage(null)} />

              <DropdownField label="Date" required value={date} options={EVENT_DATE_OPTIONS} onChange={setDate} placeholder="Select a date" />

              {/* Time row */}
              <View style={sheetStyles.timeRow}>
                <View style={sheetStyles.timeField}>
                  <DropdownField label="Start Time" required value={startTime} options={EVENT_TIME_OPTIONS} onChange={setStartTime} placeholder="Select time" />
                </View>
                <View style={sheetStyles.timeField}>
                  <DropdownField label="End Time" value={endTime} options={EVENT_TIME_OPTIONS} onChange={setEndTime} placeholder="Select time" />
                </View>
              </View>

              {/* Location */}
              <Text style={sheetStyles.label}>Location</Text>
              <View style={sheetStyles.inputWrapper}>
                <Icon name="map-marker-outline" size={18} color={Colors.textMuted} style={{ marginRight: Spacing.sm }} />
                <TextInput
                  style={sheetStyles.input}
                  value={location}
                  onChangeText={setLocation}
                  onFocus={revealBottomField}
                  placeholder="e.g. Main Hall, Terrace"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Max RSVPs */}
              <Text style={sheetStyles.label}>Max RSVPs</Text>
              <View style={sheetStyles.inputWrapper}>
                <Icon name="account-multiple-outline" size={18} color={Colors.textMuted} style={{ marginRight: Spacing.sm }} />
                <TextInput
                  style={sheetStyles.input}
                  value={maxRsvp}
                  onChangeText={setMaxRsvp}
                  onFocus={revealBottomField}
                  placeholder="Leave blank for unlimited"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              {/* Save button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={!isValid || saving}
                style={[sheetStyles.sendBtn, (!isValid || saving) && { opacity: 0.4 }]}
                activeOpacity={0.8}
              >
                <Icon name="calendar-plus" size={18} color={Colors.white} />
                <Text style={sheetStyles.sendBtnText}>{saving ? 'Creating...' : 'Create Event'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string; value: string | number;
  sub?: string; accent: string; icon: string;
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <View style={[styles.statIconBox, { backgroundColor: `${accent}22` }]}>
          <Icon name={icon} size={20} color={accent} />
        </View>
        <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

// ── Action Button ─────────────────────────────────────────────────────────────
function ActionButton({ label, icon, onPress, accent }: {
  label: string; icon: string; onPress: () => void; accent: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.actionBtn}>
      <View style={[styles.actionIconBox, { backgroundColor: `${accent}22` }]}>
        <Icon name={icon} size={24} color={accent} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Section Title ─────────────────────────────────────────────────────────────
function SectionTitle({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Meeting Room Row ──────────────────────────────────────────────────────────
function MeetingRoomRow({ room, time, host, status }: {
  room: string; time: string; host: string;
  status: 'confirmed' | 'pending' | 'in-progress';
}) {
  const statusColors = { confirmed: Colors.success, pending: Colors.accent300, 'in-progress': '#30BCED' };
  const statusLabels = { confirmed: 'Confirmed', pending: 'Pending', 'in-progress': 'In Progress' };
  const color = statusColors[status];
  const meta = [host, time].filter(Boolean).join(' · ');
  return (
    <View style={styles.roomRow}>
      <View style={styles.roomLeft}>
        <Text style={styles.roomName}>{room}</Text>
        {meta ? <Text style={styles.roomMeta}>{meta}</Text> : null}
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${color}22`, borderColor: color }]}>
        <Text style={[styles.statusText, { color }]}>{statusLabels[status]}</Text>
      </View>
    </View>
  );
}

const NAV_TABS = [
  { label: 'Home',    icon: 'home-variant',  activeIcon: 'home-variant',  route: 'HomeScreen'           },
  { label: 'Rooms',   icon: 'door-open',      activeIcon: 'door-open',     route: 'AllRoomBookingsScreen' },
  { label: 'Passes',  icon: 'badge-account',  activeIcon: 'badge-account', route: 'AllDayPassesScreen'   },
  { label: 'Tickets', icon: 'ticket-outline', activeIcon: 'ticket',        route: 'AllTicketsScreen'     },
];

// ── Main Screen ───────────────────────────────────────────────────────────────
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();
  const { tickets, dayPasses, visitors, bookings, events, notifications, dashboardSummary, user, buildings, connection, syncAll, selectBuilding } = useApp();

  const [showNotifSheet, setShowNotifSheet] = useState(false);
  const [showEventSheet, setShowEventSheet] = useState(false);
  const [showBuildings, setShowBuildings] = useState(false);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayPasses = dayPasses.filter(pass => !pass.date || pass.date.slice(0, 10) === todayKey);
  const todayVisitors = visitors.filter(visitor => !visitor.visitDate || visitor.visitDate.slice(0, 10) === todayKey);
  const todayBookings = bookings.filter(booking => !booking.date || booking.date.slice(0, 10) === todayKey);
  const solvedTickets = tickets.filter(ticket => ['Resolved', 'Closed'].includes(ticket.status));
  const activeEvents = events.filter(event => ['Published', 'Draft'].includes(event.status));
  const dashboardValue = (fallback: number, ...keys: string[]) => {
    const normalizedKeys = keys.map(key => key.toLowerCase().replace(/[_\s-]/g, ''));
    const match = Object.entries(dashboardSummary).find(([key]) => {
      const normalized = key.toLowerCase().replace(/[_\s.-]/g, '');
      return normalizedKeys.some(candidate => normalized === candidate || normalized.endsWith(candidate));
    });
    return match ? match[1] : fallback;
  };
  const ticketsRaised = dashboardValue(tickets.length, 'ticketsRaised', 'totalTickets', 'tickets');
  const ticketsSolved = dashboardValue(solvedTickets.length, 'ticketsSolved', 'resolvedTickets', 'closedTickets');
  const urgentTickets = dashboardValue(tickets.filter(ticket => ticket.priority === 'Urgent').length, 'urgentTickets');
  const dayPassUsers = dashboardValue(todayPasses.length, 'dayPassUsers', 'dayPassesToday', 'upcomingDayPasses');
  const checkedInPasses = dashboardValue(todayPasses.filter(pass => pass.status === 'Checked In').length, 'checkedInDayPasses', 'dayPassCheckedIn');
  const visitorsToday = dashboardValue(todayVisitors.length, 'visitorsToday', 'todayVisitors');
  const pendingVisitors = dashboardValue(todayVisitors.filter(visitor => visitor.status === 'Expected').length, 'pendingVisitors', 'visitorsPending');
  const roomBookingsToday = dashboardValue(todayBookings.length, 'roomBookingsToday', 'meetingBookingsToday', 'roomBookings');
  const confirmedBookings = dashboardValue(todayBookings.filter(booking => booking.status === 'Confirmed').length, 'confirmedBookings');
  const activeEventCount = dashboardValue(activeEvents.length, 'activeEvents', 'events');

  useEffect(() => { syncAll(); }, [syncAll]);

  return (
        <View style={styles.root}>
          <SafeAreaView style={styles.safeTop}>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.headerIdentity} onPress={() => setShowBuildings(true)} disabled={buildings.length < 2} activeOpacity={0.7}>
                <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>Good morning{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
                <Text style={styles.dateText} numberOfLines={1}>{today}</Text>
                <View style={styles.buildingRow}><Icon name="office-building-outline" size={13} color={Colors.accent300} /><Text style={styles.buildingText} numberOfLines={1}>{user?.buildingName || 'Select building'}</Text>{buildings.length > 1 ? <Icon name="chevron-down" size={15} color={Colors.accent300} /> : null}</View>
              </TouchableOpacity>
              <View style={styles.topRight}>
                <TouchableOpacity onPress={() => navigation.navigate('GlobalSearchScreen')} style={styles.notifBtn} activeOpacity={0.7}><Icon name="magnify" size={21} color={Colors.textPrimary} /></TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('NotificationsScreen')}
                  style={styles.notifBtn}
                  activeOpacity={0.7}
                >
                  <Icon name="bell-outline" size={20} color={Colors.textPrimary} />
                  {notifications.length > 0 && <View style={styles.notifDot} />}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileScreen')}
                  activeOpacity={0.8}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Today's Overview */}
            <SectionTitle title="Today's Overview" />
            <View style={styles.statsGrid}>
              <StatCard label="Tickets Raised" value={ticketsRaised} sub={`${urgentTickets} urgent`} accent={Colors.alert} icon="ticket-outline" />
              <StatCard label="Tickets Solved" value={ticketsSolved} sub={`${ticketsRaised ? Math.round((ticketsSolved / ticketsRaised) * 100) : 0}% resolved`} accent={Colors.success} icon="ticket-confirmation-outline" />
              <StatCard label="Day Pass Users" value={dayPassUsers} sub={`${checkedInPasses} checked in`} accent={Colors.accent300} icon="badge-account-outline" />
              <StatCard label="Visitors Today" value={visitorsToday} sub={`${pendingVisitors} pending`} accent="#30BCED" icon="account-arrow-right-outline" />
              <StatCard label="Room Bookings" value={roomBookingsToday} sub={`${confirmedBookings} confirmed`} accent={Colors.accent200} icon="door-open" />
              <StatCard label="Active Events" value={activeEventCount} sub={connection === 'online' ? 'Live data' : 'Offline data'} accent="#A78BFA" icon="calendar-star" />
            </View>

            {/* Quick Actions */}
            <SectionTitle title="Quick Actions" />
            <View style={styles.actionsGrid}>
              <ActionButton label="Add Event"          icon="calendar-plus"              accent="#A78BFA"         onPress={() => navigation.navigate('EventsScreen')}  />
              <ActionButton label="Send Notification"  icon="bullhorn-outline"           accent={Colors.accent300} onPress={() => setShowNotifSheet(true)}  />
              <ActionButton label="Invite Visitor"     icon="account-plus-outline"       accent="#30BCED"         onPress={() => navigation.navigate('InviteVisitorScreen')} />
              <ActionButton label="View Guests"        icon="account-group-outline"      accent="#30BCED"         onPress={() => navigation.navigate('ViewGuestsScreen')} />
              <ActionButton label="Scan Visitor"       icon="qrcode-scan"                accent={Colors.success}  onPress={() => navigation.navigate('ScanVisitorScreen')} />
              <ActionButton label="Inventory"          icon="package-variant-closed"     accent={Colors.accent200} onPress={() => navigation.navigate('InventoryScreen')} />
              <ActionButton label="Members"            icon="card-account-details-outline" accent="#F472B6"       onPress={() => navigation.navigate('MembersScreen')} />
              <ActionButton label="Book Day Pass"      icon="badge-account-outline"      accent={Colors.accent300} onPress={() => navigation.navigate('BookDayPassScreen')} />
              <ActionButton label="On-Demand Users"    icon="account-clock-outline"      accent="#30BCED"         onPress={() => navigation.navigate('OnDemandUsersScreen')} />
              <ActionButton label="Operations"         icon="view-grid-plus-outline"       accent="#A78BFA"       onPress={() => navigation.navigate('OperationsHubScreen')} />
            </View>

            {/* Room Bookings */}
            <SectionTitle title="Room Bookings Today" onViewAll={() => navigation.navigate('AllRoomBookingsScreen')} />
            <View style={styles.card}>
              {todayBookings.slice(0, 4).map((booking, index) => (
                <React.Fragment key={booking.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <MeetingRoomRow room={booking.room} time={formatTimeRange(booking.startTime, booking.endTime)} host={booking.memberName} status={booking.status === 'In Progress' ? 'in-progress' : booking.status === 'Confirmed' ? 'confirmed' : 'pending'} />
                </React.Fragment>
              ))}
              {todayBookings.length === 0 && <Text style={styles.passLabel}>No room bookings today</Text>}
            </View>

            {/* Day Pass Summary */}
            <SectionTitle title="Day Pass Summary" onViewAll={() => navigation.navigate('AllDayPassesScreen')} />
            <View style={styles.card}>
              <View style={styles.passRow}>
                <View style={styles.passItem}><Text style={styles.passValue}>{todayPasses.length}</Text><Text style={styles.passLabel}>Booked</Text></View>
                <View style={styles.passDiv} />
                <View style={styles.passItem}><Text style={[styles.passValue, { color: Colors.success }]}>{todayPasses.filter(pass => pass.status === 'Checked In').length}</Text><Text style={styles.passLabel}>Checked In</Text></View>
                <View style={styles.passDiv} />
                <View style={styles.passItem}><Text style={[styles.passValue, { color: Colors.accent300 }]}>{todayPasses.filter(pass => pass.status === 'Pending').length}</Text><Text style={styles.passLabel}>Pending</Text></View>
                <View style={styles.passDiv} />
                <View style={styles.passItem}><Text style={[styles.passValue, { color: Colors.textSecondary }]}>{todayPasses.filter(pass => pass.status === 'No Show').length}</Text><Text style={styles.passLabel}>No Show</Text></View>
              </View>
            </View>

            {/* Active Events */}
            <SectionTitle title="Active Events" onViewAll={() => navigation.navigate('EventsScreen')} />
            <View style={styles.card}>
              {activeEvents.slice(0, 2).map((event, index) => (
                <React.Fragment key={event.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.eventRow}>
                    <View style={[styles.eventDot, { backgroundColor: index ? '#30BCED' : '#A78BFA' }]} />
                    <View style={styles.eventInfo}><Text style={styles.eventName}>{event.title}</Text><Text style={styles.eventMeta}>{[formatTimeRange(event.startTime, event.endTime), event.location, `${event.rsvpCount} RSVPs`].filter(Boolean).join(' · ')}</Text></View>
                    <View style={[styles.statusPill, { backgroundColor: 'rgba(167,139,250,0.15)', borderColor: '#A78BFA' }]}><Text style={[styles.statusText, { color: '#A78BFA' }]}>{event.status}</Text></View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Nav */}
          <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
            {NAV_TABS.map((tab, i) => {
              const isActive = i === 0;
              return (
                <TouchableOpacity
                  key={tab.label}
                  style={styles.navTab}
                  activeOpacity={0.7}
                  onPress={() => i !== 0 && navigation.navigate(tab.route as any)}
                >
                  <Icon name={isActive ? tab.activeIcon : tab.icon} size={22} color={isActive ? Colors.accent300 : Colors.textSecondary} />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
                  {isActive && <View style={styles.navActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sheets */}
          <SendNotificationSheet
            visible={showNotifSheet}
            onClose={() => setShowNotifSheet(false)}
            bottomInset={insets.bottom}
          />
          <AddEventSheet
            visible={showEventSheet}
            onClose={() => setShowEventSheet(false)}
            bottomInset={insets.bottom}
          />
          <Modal visible={showBuildings} transparent animationType="fade" onRequestClose={() => setShowBuildings(false)}>
            <View style={sheetStyles.overlay}><TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowBuildings(false)} /><View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 24 }]}><Text style={sheetStyles.sheetTitle}>Select Building</Text>{buildings.map(building => <TouchableOpacity key={building.id} onPress={async () => { setShowBuildings(false); try { await selectBuilding(building.id); } catch (error) { Alert.alert('Building not changed', error instanceof Error ? error.message : 'Please try again.'); } }} style={styles.buildingOption}><View><Text style={styles.buildingOptionTitle}>{building.name}</Text><Text style={styles.buildingOptionMeta}>{building.id === user?.buildingId ? 'Currently selected' : 'Switch workspace'}</Text></View>{building.id === user?.buildingId ? <Icon name="check-circle" size={20} color={Colors.success} /> : <Icon name="chevron-right" size={20} color={Colors.textMuted} />}</TouchableOpacity>)}</View></View>
          </Modal>
        </View>
  );
}

// ── Sheet Styles ──────────────────────────────────────────────────────────────
const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
    maxHeight: '90%',
  },
  formScrollContent: { paddingBottom: Spacing.xxl },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderDefault, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetTitle:{ ...Typography.pageTitle, color: Colors.textPrimary, marginBottom: Spacing.xl },
  label:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.md },

  typeScroll:        { marginBottom: Spacing.sm },
  typeScrollContent: { gap: Spacing.sm },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  typeChipText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textSecondary },

  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  audienceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  audienceBtnText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textSecondary },
  channelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  channelChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  channelText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textSecondary },

  cabinRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  cabinChip: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  cabinChipActive: { borderColor: Colors.accent300, backgroundColor: 'rgba(255,126,21,0.1)' },
  cabinChipText: { fontFamily: 'SequelSans-BookBody', fontSize: 12, color: Colors.textSecondary },

  memberSearch:      { marginBottom: Spacing.sm },
  memberSearchInput: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, borderColor: Colors.borderDefault },
  memberSearchText:  { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  memberList:        { marginTop: 4, backgroundColor: Colors.background, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.borderDefault, overflow: 'hidden' },
  memberListItem:    { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  memberListName:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  memberListCompany: { ...Typography.caption, color: Colors.textSecondary, marginTop: 1 },
  selectedMemberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  memberAvatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.white },
  memberInfo:        { flex: 1 },
  memberName:        { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textPrimary },
  memberCompany:     { ...Typography.caption, color: Colors.textSecondary, marginTop: 1 },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderDefault, height: 52, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  input:        { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },
  messageWrapper: { backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderDefault, padding: Spacing.lg, marginBottom: Spacing.sm, minHeight: 100 },
  messageInput:   { fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary, minHeight: 80 },

  timeRow:   { flexDirection: 'row', gap: Spacing.sm },
  timeField: { flex: 1 },

  sendBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md, backgroundColor: Colors.accent300, marginTop: Spacing.md, marginBottom: Spacing.md },
  sendBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },

  sentState:  { alignItems: 'center', paddingVertical: Spacing.huge, gap: Spacing.md },
  sentTitle:  { ...Typography.pageTitle, color: Colors.textPrimary, textAlign: 'center' },
  sentSub:    { ...Typography.secondaryBody, color: Colors.textSecondary, textAlign: 'center' },
});

// ── Main Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.background },
  safeTop:       { backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerIdentity: { flex: 1, minWidth: 0, marginRight: Spacing.sm },
  greeting:  { ...Typography.sectionHeader, color: Colors.textPrimary, flexShrink: 1 },
  buildingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  buildingText: { ...Typography.caption, color: Colors.accent300, flexShrink: 1 },
  buildingOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  buildingOptionTitle: { ...Typography.sectionHeader, color: Colors.textPrimary },
  buildingOptionMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 3 },
  dateText:  { ...Typography.secondaryBody, color: Colors.textSecondary, marginTop: 2 },
  topRight:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 0 },
  notifBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardSurface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.borderDefault },
  notifDot:  { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent300 },
  avatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  avatarText:{ fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.white },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle:  { ...Typography.sectionHeader, color: Colors.textPrimary },
  viewAll:       { ...Typography.sectionLabel, color: Colors.accent300 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { flex: 1, minWidth: '47%', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault },
  statTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statIconBox: { width: 36, height: 36, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  statValue:   { fontFamily: 'SequelSans-SemiBoldHead', fontSize: 24, color: Colors.textPrimary },
  statLabel:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  statSub:     { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionBtn:   { flex: 1, minWidth: '30%', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderDefault, gap: Spacing.sm },
  actionIconBox: { width: 48, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  actionLabel:   { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },

  card:    { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault },
  divider: { height: 1, backgroundColor: Colors.borderDefault, marginVertical: Spacing.md },

  roomRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomLeft:   { flex: 1, marginRight: Spacing.md },
  roomName:   { ...Typography.sectionLabel, color: Colors.textPrimary },
  roomMeta:   { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  passRow:   { flexDirection: 'row', alignItems: 'center' },
  passItem:  { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  passValue: { fontFamily: 'SequelSans-SemiBoldHead', fontSize: 24, color: Colors.textPrimary },
  passLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  passDiv:   { width: 1, height: 40, backgroundColor: Colors.borderDefault },

  eventRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  eventDot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  eventInfo: { flex: 1 },
  eventName: { ...Typography.sectionLabel, color: Colors.textPrimary },
  eventMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  bottomNav: { flexDirection: 'row', backgroundColor: Colors.cardSurface, borderTopWidth: 1, borderTopColor: Colors.borderDefault, paddingTop: Spacing.md, position: 'absolute', bottom: 0, left: 0, right: 0 },
  navTab:        { flex: 1, alignItems: 'center', gap: 4 },
  navLabel:      { ...Typography.smallLabel, color: Colors.textSecondary },
  navLabelActive:{ color: Colors.accent300 },
  navActiveDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent300 },
});
