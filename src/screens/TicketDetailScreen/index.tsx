import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import { BackendRecordUnavailable } from '../../components/BackendRecordUnavailable';
import { downloadAuthenticatedFile } from '../../utils/downloadFile';

type RouteProps = RouteProp<RootStackParamList, 'TicketDetailScreen'>;

type TicketStatus   = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
type TicketCategory = string;

interface Ticket {
  id: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  memberName: string;
  companyName: string;
  location: string;
  raisedAt: string;
  description: string;
  subCategory?: string;
  priority: string;
  assignedTo?: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

const STATUS_CONFIG: Record<TicketStatus, { color: string; icon: string }> = {
  'Open':        { color: Colors.alert,     icon: 'circle-outline' },
  'In Progress': { color: '#30BCED',        icon: 'progress-clock' },
  'Resolved':    { color: Colors.success,   icon: 'check-circle'   },
  'Closed':      { color: Colors.textMuted, icon: 'close-circle'   },
};

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  WiFi:         { icon: 'wifi',           color: '#30BCED'        },
  Acoustics:    { icon: 'volume-high',     color: '#A78BFA'        },
  Billing:      { icon: 'receipt',         color: Colors.accent300 },
  Maintenance:  { icon: 'hammer-wrench',   color: Colors.accent200 },
  IT:           { icon: 'laptop',          color: '#F472B6'        },
  Housekeeping: { icon: 'broom',           color: Colors.success   },
  Other:        { icon: 'dots-horizontal', color: Colors.textMuted },
};

const getCategoryConfig = (category: string) => {
  if (CATEGORY_CONFIG[category]) return CATEGORY_CONFIG[category];
  const normalized = category.toLowerCase();
  if (normalized.includes('connect')) return CATEGORY_CONFIG.WiFi;
  if (normalized.includes('housekeeping') || normalized.includes('pantry')) return CATEGORY_CONFIG.Housekeeping;
  if (normalized.includes('maintenance') || normalized.includes('electrical') || /\b(ac|air conditioning)\b/.test(normalized)) return CATEGORY_CONFIG.Maintenance;
  if (normalized.includes('meeting')) return { icon: 'door-open', color: '#A78BFA' };
  if (normalized.includes('parking')) return { icon: 'car-outline', color: '#30BCED' };
  if (normalized.includes('security') || normalized.includes('access')) return { icon: 'shield-account-outline', color: Colors.success };
  if (normalized.includes('community') || normalized.includes('event')) return { icon: 'account-group-outline', color: '#F472B6' };
  return CATEGORY_CONFIG.Other;
};

const ALL_STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

export function TicketDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route      = useRoute<RouteProps>();
  const insets     = useSafeAreaInsets();
  const ticketId   = route.params.ticketId;
  const { tickets, updateTicket, deleteTicket } = useApp();
  const storedTicket = tickets.find(item => item.id === ticketId);
  const original: Ticket | null = storedTicket ? {
    id: storedTicket.id,
    title: storedTicket.subject,
    category: storedTicket.category || 'Other',
    status: storedTicket.status,
    memberName: storedTicket.memberName,
    companyName: storedTicket.company,
    location: storedTicket.location,
    raisedAt: new Date(storedTicket.createdAt).toLocaleString('en-IN'),
    description: storedTicket.description,
    subCategory: storedTicket.subCategoryName,
    priority: storedTicket.priority,
    assignedTo: storedTicket.assignedTo,
    attachmentName: storedTicket.attachmentName,
    attachmentUrl: storedTicket.attachmentUrl,
  } : null;

  const [ticket,          setTicket]          = useState<Ticket | null>(original);
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  useEffect(() => {
    if (!storedTicket) {
      setTicket(null);
      return;
    }
    setTicket({
      id: storedTicket.id,
      title: storedTicket.subject,
      category: storedTicket.category || 'Other',
      status: storedTicket.status,
      memberName: storedTicket.memberName,
      companyName: storedTicket.company,
      location: storedTicket.location,
      raisedAt: new Date(storedTicket.createdAt).toLocaleString('en-IN'),
      description: storedTicket.description,
      subCategory: storedTicket.subCategoryName,
      priority: storedTicket.priority,
      assignedTo: storedTicket.assignedTo,
      attachmentName: storedTicket.attachmentName,
      attachmentUrl: storedTicket.attachmentUrl,
    });
  }, [storedTicket]);

  if (!ticket) {
    return <BackendRecordUnavailable title="Ticket" onBack={() => navigation.goBack()} />;
  }

  const statusCfg   = STATUS_CONFIG[ticket.status];
  const categoryCfg = getCategoryConfig(ticket.category);

  const handleStatusChange = async (status: TicketStatus) => {
    const previousStatus = ticket.status;
    setTicket(prev => prev ? ({ ...prev, status }) : prev);
    setShowStatusSheet(false);
    try {
      await updateTicket(ticket.id, { status });
    } catch (error) {
      setTicket(prev => prev ? ({ ...prev, status: previousStatus }) : prev);
      Alert.alert('Status not updated', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const deleteCurrentTicket = async () => {
    try {
      await deleteTicket(ticket.id);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Ticket not deleted', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <Text style={styles.screenTitle}>Ticket Details</Text>
            <Text style={styles.screenSub}>{ticket.raisedAt}</Text>
          </View>
          <View style={[
            styles.statusChip,
            { borderColor: statusCfg.color, backgroundColor: `${statusCfg.color}22` },
          ]}>
            <Icon name={statusCfg.icon} size={12} color={statusCfg.color} />
            <Text style={[styles.statusChipText, { color: statusCfg.color }]}>
              {ticket.status}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Category + Title + Description */}
        <View style={styles.card}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryCfg.color}22` }]}>
              <Icon name={categoryCfg.icon} size={14} color={categoryCfg.color} />
              <Text style={[styles.categoryText, { color: categoryCfg.color }]}>
                {ticket.category}
              </Text>
            </View>
          </View>
          <Text style={styles.ticketTitle}>{ticket.title}</Text>
          <Text style={styles.description}>{ticket.description}</Text>
        </View>

        <Text style={styles.sectionLabel}>Ticket Information</Text>
        <View style={styles.card}>
          <Text style={styles.description}>
            Priority: {ticket.priority || 'Not set'}
          </Text>
          {ticket.subCategory ? (
            <Text style={styles.description}>
              Subcategory: {ticket.subCategory}
            </Text>
          ) : null}
          <Text style={styles.description}>
            Assignee: {ticket.assignedTo || 'Unassigned'}
          </Text>
          {ticket.attachmentName ? (
            <TouchableOpacity
              onPress={() =>
                ticket.attachmentUrl
                  ? downloadAuthenticatedFile(
                      ticket.attachmentUrl,
                      ticket.attachmentName || 'ticket-attachment',
                    ).catch(error =>
                      Alert.alert(
                        'Attachment unavailable',
                        error instanceof Error ? error.message : 'Please try again.',
                      ),
                    )
                  : Alert.alert('Attachment unavailable', 'The ticket response did not include a file URL.')
              }
            >
              <Text style={[styles.description, { color: Colors.accent300, textDecorationLine: 'underline' }]}>
                Attachment: {ticket.attachmentName}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Member Info */}
        <Text style={styles.sectionLabel}>Raised By</Text>
        <View style={styles.card}>
          <View style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {ticket.memberName ? ticket.memberName.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{ticket.memberName || 'Creator unavailable'}</Text>
              {ticket.companyName ? <Text style={styles.memberCompany}>{ticket.companyName}</Text> : null}
            </View>
          </View>
          {ticket.location ? <View style={[
              styles.locationBadge,
              {
                backgroundColor: ticket.location === 'On Demand'
                  ? 'rgba(255,126,21,0.15)'
                  : 'rgba(48,188,237,0.15)',
              },
            ]}>
              <Icon
                name={ticket.location === 'On Demand' ? 'badge-account-outline' : 'office-building'}
                size={12}
                color={ticket.location === 'On Demand' ? Colors.accent300 : '#30BCED'}
              />
              <Text style={[
                styles.locationText,
                { color: ticket.location === 'On Demand' ? Colors.accent300 : '#30BCED' },
              ]}>
                {ticket.location}
              </Text>
            </View> : null}
        </View>

        {/* Status Timeline */}
        <Text style={styles.sectionLabel}>Status Timeline</Text>
        <View style={styles.card}>
          <View style={styles.statusTimeline}>
            {ALL_STATUSES.map((s, i) => {
              const cfg      = STATUS_CONFIG[s];
              const isActive = ticket.status === s;
              const isDone   = ALL_STATUSES.indexOf(ticket.status) > i;
              const isLast   = i === ALL_STATUSES.length - 1;
              return (
                <View key={s} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      isActive && { backgroundColor: cfg.color, borderColor: cfg.color },
                      isDone   && { backgroundColor: Colors.success, borderColor: Colors.success },
                    ]}>
                      {(isActive || isDone) && (
                        <Icon name={isDone ? 'check' : cfg.icon} size={10} color={Colors.white} />
                      )}
                    </View>
                    {!isLast && (
                      <View style={[
                        styles.timelineLine,
                        isDone && { backgroundColor: Colors.success },
                      ]} />
                    )}
                  </View>
                  <Text style={[
                    styles.timelineLabel,
                    isActive && { color: cfg.color, fontFamily: 'SequelSans-SemiBoldBody' },
                    isDone   && { color: Colors.success },
                  ]}>
                    {s}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom — Update Status button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}> 
        <TouchableOpacity
          onPress={() => Alert.alert('Delete ticket?', 'This removes the ticket from the current workspace.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: deleteCurrentTicket },
          ])}
          style={styles.deleteBtn}
          activeOpacity={0.8}
        >
          <Icon name="delete-outline" size={20} color={Colors.alert} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateTicketScreen', { ticketId: ticket.id })}
          style={styles.editBtn}
          activeOpacity={0.8}
        >
          <Icon name="pencil-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowStatusSheet(true)}
          style={styles.updateStatusBtn}
          activeOpacity={0.8}
        >
          <Icon name="swap-horizontal" size={20} color={Colors.white} />
          <Text style={styles.updateStatusText}>Update Status</Text>
        </TouchableOpacity>
      </View>

      {/* Status bottom sheet */}
      {showStatusSheet && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowStatusSheet(false)}
            activeOpacity={1}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Update Status</Text>
            {ALL_STATUSES.map(s => {
              const cfg      = STATUS_CONFIG[s];
              const isActive = ticket.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => handleStatusChange(s)}
                  style={[
                    styles.sheetOption,
                    isActive && { backgroundColor: `${cfg.color}11` },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sheetOptionIcon, { backgroundColor: `${cfg.color}22` }]}>
                    <Icon name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                  <Text style={[
                    styles.sheetOptionText,
                    isActive && { color: cfg.color, fontFamily: 'SequelSans-SemiBoldBody' },
                  ]}>
                    {s}
                  </Text>
                  {isActive && (
                    <Icon name="check-circle" size={20} color={cfg.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },
  scroll:  { flex: 1 },
  scrollContent: { padding: Spacing.lg },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  topCenter:    { flex: 1 },
  screenTitle:  { ...Typography.sectionHeader, color: Colors.textPrimary },
  screenSub:    { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  statusChipText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  // Card
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 11, color: Colors.textSecondary,
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },

  // Category + title
  categoryRow:   { marginBottom: Spacing.sm },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start',
  },
  categoryText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  ticketTitle:   { ...Typography.pageTitle, color: Colors.textPrimary, marginBottom: Spacing.sm },
  description:   { ...Typography.primaryBody, color: Colors.textSecondary, lineHeight: 22 },

  // Member
  memberRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  memberAvatar:     {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.accent300,
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.white },
  memberInfo:       { flex: 1, minWidth: 0 },
  memberName:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary },
  memberCompany:    { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  locationBadge:    {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start',
    maxWidth: '100%', marginTop: Spacing.md,
  },
  locationText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, flexShrink: 1 },

  // Timeline
  statusTimeline: { gap: 0 },
  timelineItem:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  timelineLeft:   { alignItems: 'center', width: 20 },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.borderDefault,
    backgroundColor: Colors.secondarySurface,
    justifyContent: 'center', alignItems: 'center',
  },
  timelineLine:  { width: 2, height: 24, backgroundColor: Colors.borderDefault, marginTop: 2 },
  timelineLabel: {
    ...Typography.primaryBody, color: Colors.textMuted,
    paddingTop: 1, paddingBottom: Spacing.lg,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.borderDefault,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  deleteBtn: {
    width: 54, height: 54, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(229,67,57,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  editBtn: {
    width: 54, height: 54, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault,
    alignItems: 'center', justifyContent: 'center',
  },
  updateStatusBtn: {
    flex: 1,
    backgroundColor: Colors.accent300,
    borderRadius: BorderRadius.md,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  updateStatusText: {
    fontFamily: 'SequelSans-MediumBody',
    fontSize: 15, lineHeight: 20,
    color: Colors.white,
  },

  // Bottom sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 99,
  },
  sheet: {
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  sheetHandle:  {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderDefault,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  sheetTitle:   { ...Typography.pageTitle, color: Colors.textPrimary, marginBottom: Spacing.lg },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderDefault,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
  },
  sheetOptionIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  sheetOptionText: { ...Typography.primaryBody, color: Colors.textPrimary, flex: 1 },
});
