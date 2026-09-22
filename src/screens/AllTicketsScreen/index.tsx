import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Types ─────────────────────────────────────────────────────────────────────
type TicketStatus   = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
type TicketCategory = string;

interface Ticket {
  id: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  memberName: string;
  companyName: string;
  location: string; // cabin number or 'On Demand'
  raisedAt: string;
  description: string;
  managementComment?: string;
}

const STATUS_CONFIG: Record<TicketStatus, { color: string; icon: string }> = {
  'Open':        { color: Colors.alert,    icon: 'circle-outline'    },
  'In Progress': { color: '#30BCED',       icon: 'progress-clock'    },
  'Resolved':    { color: Colors.success,  icon: 'check-circle'      },
  'Closed':      { color: Colors.textMuted,icon: 'close-circle'      },
};

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  WiFi:         { icon: 'wifi',               color: '#30BCED'        },
  Connectivity: { icon: 'wifi',               color: '#30BCED'        },
  Acoustics:    { icon: 'volume-high',         color: '#A78BFA'        },
  Billing:      { icon: 'receipt',             color: Colors.accent300 },
  Maintenance:  { icon: 'hammer-wrench',       color: Colors.accent200 },
  IT:           { icon: 'laptop',              color: '#F472B6'        },
  Housekeeping: { icon: 'broom',               color: Colors.success   },
  Other:        { icon: 'dots-horizontal',     color: Colors.textMuted },
};

const getCategoryConfig = (category: string) => {
  if (CATEGORY_CONFIG[category]) return CATEGORY_CONFIG[category];
  const normalized = category.toLowerCase();
  if (normalized.includes('connect')) return CATEGORY_CONFIG.Connectivity;
  if (normalized.includes('housekeeping') || normalized.includes('pantry')) return CATEGORY_CONFIG.Housekeeping;
  if (normalized.includes('maintenance') || normalized.includes('electrical') || /\b(ac|air conditioning)\b/.test(normalized)) return CATEGORY_CONFIG.Maintenance;
  if (normalized.includes('meeting')) return { icon: 'door-open', color: '#A78BFA' };
  if (normalized.includes('parking')) return { icon: 'car-outline', color: '#30BCED' };
  if (normalized.includes('security') || normalized.includes('access')) return { icon: 'shield-account-outline', color: Colors.success };
  if (normalized.includes('community') || normalized.includes('event')) return { icon: 'account-group-outline', color: '#F472B6' };
  return CATEGORY_CONFIG.Other;
};

const ALL_STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

// ── Ticket Card ───────────────────────────────────────────────────────────────
function TicketCard({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  const status   = STATUS_CONFIG[ticket.status];
  const category = getCategoryConfig(ticket.category);
  const creatorName = ticket.memberName || 'Creator unavailable';
  const creatorMeta = [ticket.companyName, ticket.location].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: `${category.color}22` }]}>
            <Icon name={category.icon} size={14} color={category.color} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.categoryText, { color: category.color }]}>{ticket.category}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}22`, borderColor: status.color }]}>
          <Icon name={status.icon} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{ticket.status}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle}>{ticket.title}</Text>

      {/* Member info */}
      <View style={styles.memberRow}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {creatorName === 'Creator unavailable' ? '?' : creatorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{creatorName}</Text>
          {creatorMeta ? <Text style={styles.memberMeta}>{creatorMeta}</Text> : null}
        </View>
        <Text style={styles.timeText}>{ticket.raisedAt}</Text>
      </View>

      {/* Management comment */}
      {ticket.managementComment && (
        <View style={styles.commentBox}>
          <Icon name="comment-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.commentText} numberOfLines={1}>
            {ticket.managementComment}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function AllTicketsScreen() {
  const navigation = useNavigation<Nav>();
  const { tickets } = useApp();
  const ticketData: Ticket[] = tickets.map(ticket => ({
    id: ticket.id,
    title: ticket.subject,
    category: ticket.category || 'Other',
    status: ticket.status,
    memberName: ticket.memberName,
    companyName: ticket.company,
    location: ticket.location,
    raisedAt: new Date(ticket.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }),
    description: ticket.description,
    managementComment: ticket.assignedTo ? `Assigned to ${ticket.assignedTo}` : undefined,
  }));

  const [search,          setSearch]          = useState('');
  const [activeStatus,    setActiveStatus]    = useState<TicketStatus | 'All'>('All');
  const [activeCategory,  setActiveCategory]  = useState<TicketCategory | 'All'>('All');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const categoryOptions = Array.from(new Set(ticketData.map(ticket => ticket.category))).sort();

  const filtered = ticketData.filter(t => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.memberName.toLowerCase().includes(search.toLowerCase()) ||
      t.companyName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());

    const matchStatus   = activeStatus   === 'All' || t.status   === activeStatus;
    const matchCategory = activeCategory === 'All' || t.category === activeCategory;

    return matchSearch && matchStatus && matchCategory;
  });

  const counts = {
    All:         ticketData.length,
    Open:        ticketData.filter(t => t.status === 'Open').length,
    'In Progress': ticketData.filter(t => t.status === 'In Progress').length,
    Resolved:    ticketData.filter(t => t.status === 'Resolved').length,
    Closed:      ticketData.filter(t => t.status === 'Closed').length,
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Tickets</Text>
          <View style={styles.topRight}>
            <TouchableOpacity onPress={() => navigation.navigate('CreateTicketScreen')} style={styles.filterBtn} activeOpacity={0.7}>
              <Icon name="plus" size={20} color={Colors.accent300} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCategoryFilter(p => !p)}
              style={[styles.filterBtn, activeCategory !== 'All' && styles.filterBtnActive]}
              activeOpacity={0.7}
            >
              <Icon
                name="filter-variant"
                size={20}
                color={activeCategory !== 'All' ? Colors.accent300 : Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Category filter dropdown */}
      {showCategoryFilter && (
        <View style={styles.categoryDropdown}>
          <TouchableOpacity
            onPress={() => { setActiveCategory('All'); setShowCategoryFilter(false); }}
            style={[styles.categoryOption, activeCategory === 'All' && styles.categoryOptionActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryOptionText, activeCategory === 'All' && styles.categoryOptionTextActive]}>
              All Categories
            </Text>
          </TouchableOpacity>
          {categoryOptions.map(cat => {
            const cfg = getCategoryConfig(cat);
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => { setActiveCategory(cat); setShowCategoryFilter(false); }}
                style={[styles.categoryOption, activeCategory === cat && styles.categoryOptionActive]}
                activeOpacity={0.7}
              >
                <Icon name={cfg.icon} size={16} color={activeCategory === cat ? Colors.accent300 : cfg.color} />
                <Text style={[styles.categoryOptionText, activeCategory === cat && styles.categoryOptionTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tickets, members, companies..."
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

      {/* Status filter pills */}
      <View style={styles.statusFilters}>
        {(['All', ...ALL_STATUSES] as const).map(status => {
          const isActive = activeStatus === status;
          const color    = status === 'All' ? Colors.accent300 : STATUS_CONFIG[status as TicketStatus].color;
          return (
            <TouchableOpacity
              key={status}
              onPress={() => setActiveStatus(status)}
              style={[
                styles.statusFilter,
                isActive && { backgroundColor: `${color}22`, borderColor: color },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusFilterText, isActive && { color }]}>
                {status}
              </Text>
              <View style={[styles.countBadge, isActive && { backgroundColor: color }]}>
                <Text style={[styles.countText, isActive && { color: Colors.white }]}>
                  {counts[status as keyof typeof counts]}
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="ticket-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No tickets found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => navigation.navigate('TicketDetailScreen', { ticketId: item.id })}
          />
        )}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  topRight:    { flexDirection: 'row', gap: Spacing.sm },
  filterBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.cardSurface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  filterBtnActive: { borderColor: Colors.accent300, backgroundColor: 'rgba(255,126,21,0.1)' },

  // Category dropdown
  categoryDropdown: {
    position: 'absolute', top: 100, right: Spacing.lg,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault,
    zIndex: 100, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
    minWidth: 200,
  },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderDefault,
  },
  categoryOptionActive:     { backgroundColor: 'rgba(255,126,21,0.08)' },
  categoryOptionText:       { ...Typography.primaryBody, color: Colors.textPrimary },
  categoryOptionTextActive: { color: Colors.accent300 },

  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchIcon:  {},
  searchInput: {
    flex: 1,
    fontFamily: 'SequelSans-BookBody',
    fontSize: 15, color: Colors.textPrimary,
  },

  // Status filters
  statusFilters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statusFilter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  statusFilterText: { fontFamily: 'SequelSans-BookBody', fontSize: 12, color: Colors.textSecondary },
  countBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.secondarySurface,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  countText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 10, color: Colors.textSecondary },

  // List
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 32 },

  // Card
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginBottom: Spacing.sm,
  },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardHeaderLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginRight: Spacing.sm },
  categoryBadge:  { flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  categoryText:   { flexShrink: 1, fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  statusBadge:    { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusText:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  cardTitle:      { ...Typography.sectionLabel, color: Colors.textPrimary, marginBottom: Spacing.md },

  // Member row
  memberRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  memberAvatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  memberAvatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.white },
  memberInfo:       { flex: 1 },
  memberName:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary },
  memberMeta:       { ...Typography.caption, color: Colors.textSecondary, marginTop: 1 },
  locationText:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  timeText:         { ...Typography.caption, color: Colors.textMuted },

  // Comment
  commentBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.secondarySurface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  commentText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },

  // Empty
  empty:     { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textMuted },
});
