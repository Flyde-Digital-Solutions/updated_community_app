import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useApp } from '../../context/AppContext';

type NotificationType = 'Announcement' | 'Event' | 'Billing' | 'Maintenance' | 'Visitor';
type AudienceType     = 'All Members' | 'Specific Cabin' | 'Specific Member' | 'Day Pass Users';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  sentTo: string;
  audience: AudienceType;
  sentAt: string;
  sentBy?: string;
  readCount?: number;
  totalCount?: number;
  syncState?: 'synced' | 'pending';
}

const TYPE_CONFIG: Record<NotificationType, { color: string; icon: string; bg: string }> = {
  Announcement: { color: Colors.accent300, icon: 'bullhorn-outline',             bg: 'rgba(255,126,21,0.15)'  },
  Event:        { color: '#A78BFA',        icon: 'calendar-star',                bg: 'rgba(167,139,250,0.15)' },
  Billing:      { color: '#30BCED',        icon: 'receipt',                      bg: 'rgba(48,188,237,0.15)'  },
  Maintenance:  { color: Colors.accent200, icon: 'hammer-wrench',                bg: 'rgba(255,150,64,0.15)'  },
  Visitor:      { color: '#F472B6',        icon: 'account-arrow-right-outline',  bg: 'rgba(244,114,182,0.15)' },
};

const AUDIENCE_CONFIG: Record<AudienceType, { color: string; icon: string }> = {
  'All Members':     { color: Colors.success,   icon: 'account-group'         },
  'Specific Cabin':  { color: '#30BCED',        icon: 'office-building'       },
  'Specific Member': { color: Colors.accent300, icon: 'account'               },
  'Day Pass Users':  { color: '#A78BFA',        icon: 'badge-account-outline' },
};

const ALL_TYPES: NotificationType[] = ['Announcement', 'Event', 'Billing', 'Maintenance', 'Visitor'];

function NotificationCard({ notification }: { notification: Notification }) {
  const [expanded, setExpanded] = useState(false);
  const typeCfg     = TYPE_CONFIG[notification.type];
  const audienceCfg = AUDIENCE_CONFIG[notification.audience];
  const hasReadStats = typeof notification.readCount === 'number' && typeof notification.totalCount === 'number' && notification.totalCount > 0;
  const readPct = hasReadStats ? Math.round((notification.readCount! / notification.totalCount!) * 100) : 0;
  const isPending = notification.syncState === 'pending';

  return (
    <TouchableOpacity
      onPress={() => setExpanded(p => !p)}
      activeOpacity={0.8}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${expanded ? 'Hide' : 'Show'} notification details`}
      accessibilityState={{ expanded }}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.typeIconWrap, { backgroundColor: typeCfg.bg }]}>
          <Icon name={typeCfg.icon} size={20} color={typeCfg.color} />
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaTop}>
            <View style={[styles.typeBadge, { backgroundColor: typeCfg.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeCfg.color }]}>{notification.type}</Text>
            </View>
            <Text style={styles.sentAt}>{notification.sentAt}</Text>
          </View>
          <Text style={styles.cardTitle}>{notification.title}</Text>
        </View>
      </View>

      {/* Message — collapsed or expanded */}
      <Text
        style={styles.message}
        numberOfLines={expanded ? undefined : 2}
      >
        {notification.message}
      </Text>

      {/* Footer */}
      <View style={styles.cardFooter}>
        {/* Sent to */}
        <View style={styles.sentToRow}>
          <Icon name={audienceCfg.icon} size={13} color={audienceCfg.color} />
          <Text style={[styles.sentToText, { color: audienceCfg.color }]}>{notification.sentTo}</Text>
        </View>

        {/* Sent by */}
        {notification.sentBy ? <Text style={styles.sentBy}>by {notification.sentBy}</Text> : null}

      </View>

      {expanded ? (
        <View style={styles.detailsPanel}>
          <View style={styles.detailsHeader}>
            <Icon name="information-outline" size={16} color={typeCfg.color} />
            <Text style={styles.detailsTitle}>Notification details</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Audience</Text>
            <Text style={styles.detailValue}>{notification.sentTo}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sent by</Text>
            <Text style={styles.detailValue}>{notification.sentBy || 'Sender information unavailable'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>API status</Text>
            <View style={styles.statusRow}>
              <Icon
                name={isPending ? 'cloud-sync-outline' : 'check-circle-outline'}
                size={14}
                color={isPending ? Colors.accent300 : Colors.success}
              />
              <Text style={[styles.statusText, { color: isPending ? Colors.accent300 : Colors.success }]}>
                {isPending ? 'Waiting for server sync' : 'Synced with server'}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery</Text>
            {hasReadStats ? (
              <View style={styles.deliveryDetail}>
                <View style={styles.readReceiptRow}>
                  <Text style={styles.readReceiptText}>{notification.readCount}/{notification.totalCount} read</Text>
                  <Text style={[styles.readPct, { color: typeCfg.color }]}>{readPct}%</Text>
                </View>
                <View style={styles.readBar}>
                  <View style={[styles.readBarFill, { width: `${readPct}%` as any, backgroundColor: typeCfg.color }]} />
                </View>
              </View>
            ) : (
              <Text style={styles.detailValue}>Delivery data unavailable</Text>
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.expandHint}>
        <Text style={styles.expandHintText}>{expanded ? 'Hide details' : 'View details'}</Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const { notifications } = useApp();
  const notificationData: Notification[] = notifications.map(notification => {
    const audience = Object.prototype.hasOwnProperty.call(AUDIENCE_CONFIG, notification.audience) ? notification.audience as AudienceType : 'Specific Member';
    return {
      id: notification.id, type: notification.type,
      title: notification.title.replace(/\bbackend\b/gi, 'service'),
      message: notification.message.replace(/\bbackend\b/gi, 'service'),
      sentTo: notification.audience, audience, sentAt: new Date(notification.sentAt).toLocaleString('en-IN'),
      sentBy: notification.sentBy, readCount: notification.readCount, totalCount: notification.totalCount,
      syncState: notification.syncState,
    };
  });

  const [search,      setSearch]      = useState('');
  const [activeType,  setActiveType]  = useState<NotificationType | 'All'>('All');

  const filtered = notificationData.filter(n => {
    const matchSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase()) ||
      n.sentTo.toLowerCase().includes(search.toLowerCase());
    const matchType = activeType === 'All' || n.type === activeType;
    return matchSearch && matchType;
  });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Notifications</Text>
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>{notificationData.length} sent</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications..."
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

      {/* Type filters */}
      <View style={styles.typeFilters}>
        {(['All', ...ALL_TYPES] as const).map(type => {
          const isActive = activeType === type;
          const color    = type === 'All' ? Colors.accent300 : TYPE_CONFIG[type as NotificationType].color;
          const icon     = type === 'All' ? 'bell-outline' : TYPE_CONFIG[type as NotificationType].icon;
          return (
            <TouchableOpacity
              key={type}
              onPress={() => setActiveType(type)}
              style={[styles.typeFilter, isActive && { backgroundColor: `${color}22`, borderColor: color }]}
              activeOpacity={0.7}
            >
              <Icon name={icon} size={14} color={isActive ? color : Colors.textSecondary} />
              <Text style={[styles.typeFilterText, isActive && { color }]}>{type}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="bell-off-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No notifications found</Text>
          </View>
        }
        renderItem={({ item }) => <NotificationCard notification={item} />}
      />
    </View>
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
  countChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  countChipText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textSecondary },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md,
    height: 48, gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },

  typeFilters: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg,
    gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap',
  },
  typeFilter: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  typeFilterText: { fontFamily: 'SequelSans-BookBody', fontSize: 12, color: Colors.textSecondary },

  listContent: { paddingHorizontal: Spacing.lg },

  card: {
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault,
    marginBottom: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  typeIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardMeta:    { flex: 1 },
  cardMetaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  typeBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  typeBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  sentAt:      { ...Typography.caption, color: Colors.textMuted },
  cardTitle:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textPrimary },

  message: { ...Typography.secondaryBody, color: Colors.textSecondary, marginBottom: Spacing.md },

  cardFooter:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  sentToRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sentToText:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  sentBy:        { ...Typography.caption, color: Colors.textMuted, flex: 1 },
  readReceiptRow:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  readReceiptText: { fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textMuted },
  readBar:       { width: 96, height: 4, borderRadius: 2, backgroundColor: Colors.background, overflow: 'hidden' },
  readBarFill:   { height: '100%', borderRadius: 2 },
  readPct:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  detailsPanel: {
    marginTop: Spacing.md, padding: Spacing.md, gap: Spacing.sm,
    borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface,
  },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  detailsTitle: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textPrimary },
  detailRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md,
  },
  detailLabel: { ...Typography.caption, color: Colors.textMuted },
  detailValue: { ...Typography.caption, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, flex: 1 },
  statusText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, textAlign: 'right' },
  deliveryDetail: { alignItems: 'flex-end', gap: 5, flex: 1 },
  expandHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
    marginTop: Spacing.md, paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderDefault,
  },
  expandHintText: { fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textMuted },

  empty:     { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textMuted },
});
