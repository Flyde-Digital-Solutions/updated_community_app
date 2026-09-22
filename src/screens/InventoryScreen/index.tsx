import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import { resolveMonthlyRevenue } from '../../utils/dashboard';

type Nav          = NativeStackNavigationProp<RootStackParamList>;
type CabinStatus  = 'Occupied' | 'Vacant';

interface Cabin {
  id: string;
  cabinNumber: string;
  floor: string;
  size: string;
  capacity: number;
  monthlyRent: number;
  status: CabinStatus;
  companyName?: string;
  companyId?: string;
  memberCount?: number;
  occupiedSince?: string;
  leaseEnd?: string;
}

const FLOOR_COLORS: Record<string, string> = {
  'Floor 1': '#30BCED',
  'Floor 2': '#A78BFA',
  'Floor 3': '#F472B6',
};

const STATUS_CONFIG: Record<CabinStatus, { color: string; bg: string; icon: string }> = {
  'Occupied': { color: Colors.success,   bg: 'rgba(0,129,54,0.12)',    icon: 'office-building'      },
  'Vacant':   { color: Colors.accent300, bg: 'rgba(255,126,21,0.12)', icon: 'office-building-outline' },
};

const STATUSES: CabinStatus[] = ['Occupied', 'Vacant'];


const SIZE_COLORS: Record<string, string> = {
  Small:  Colors.accent300,
  Medium: '#A78BFA',
  Large:  '#F472B6',
};

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ cabins, monthlyRevenue }: { cabins: Cabin[]; monthlyRevenue?: number }) {
  const total = cabins.length;
  const occupied = cabins.filter(cabin => cabin.status === 'Occupied').length;
  const vacant = cabins.filter(cabin => cabin.status === 'Vacant').length;
  const occupancy = total ? Math.round((occupied / total) * 100) : 0;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryOccupancyPct}>{occupancy}%</Text>
          <Text style={styles.summaryOccupancyLabel}>Occupancy Rate</Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}><Text style={[styles.summaryStatValue, { color: Colors.success }]}>{occupied}</Text><Text style={styles.summaryStatLabel}>Occupied</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}><Text style={[styles.summaryStatValue, { color: Colors.accent300 }]}>{vacant}</Text><Text style={styles.summaryStatLabel}>Vacant</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}><Text style={styles.summaryStatValue}>{total}</Text><Text style={styles.summaryStatLabel}>Total</Text></View>
        </View>
      </View>
      <View style={styles.occupancyBar}><View style={[styles.occupancyFill, { width: `${occupancy}%` as `${number}%` }]} /></View>
      <View style={styles.revenueRow}>
        <Icon name="currency-inr" size={14} color={Colors.textSecondary} />
        <View style={styles.revenueDescription}>
          <Text style={styles.revenueLabel}>Monthly Revenue</Text>
          <Text style={styles.revenueSub}>Received this month</Text>
        </View>
        <Text style={styles.revenueValue}>{monthlyRevenue === undefined ? 'Unavailable' : `₹${monthlyRevenue.toLocaleString('en-IN')}`}</Text>
      </View>
    </View>
  );
}

// ── Cabin Card ────────────────────────────────────────────────────────────────
function CabinCard({ cabin, onPress }: { cabin: Cabin; onPress: () => void }) {
  const statusCfg  = STATUS_CONFIG[cabin.status];
  const floorColor = FLOOR_COLORS[cabin.floor] ?? Colors.textSecondary;
  const sizeColor  = SIZE_COLORS[cabin.size]   ?? Colors.textSecondary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.cabinIconWrap, { backgroundColor: `${floorColor}22` }]}>
          <Icon name={statusCfg.icon} size={22} color={floorColor} />
        </View>
        <View style={styles.cabinHeaderInfo}>
          <Text style={styles.cabinNumber}>{cabin.cabinNumber}</Text>
          <View style={styles.cabinBadgeRow}>
            <View style={[styles.floorBadge, { backgroundColor: `${floorColor}22` }]}>
              <Text style={[styles.floorBadgeText, { color: floorColor }]}>{cabin.floor}</Text>
            </View>
            <View style={[styles.sizeBadge, { backgroundColor: `${sizeColor}22` }]}>
              <Text style={[styles.sizeBadgeText, { color: sizeColor }]}>{cabin.size}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.color }]}>
          <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
          <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{cabin.status}</Text>
        </View>
      </View>

      {/* Company info if occupied */}
      {cabin.status === 'Occupied' ? (
        <>
          <View style={styles.divider} />
          {cabin.companyName ? (
            <View style={styles.companyRow}>
              <View style={styles.companyAvatar}>
                <Text style={styles.companyAvatarText}>{cabin.companyName.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{cabin.companyName}</Text>
                <Text style={styles.companySince}>Since {cabin.occupiedSince || '—'} · Lease ends {cabin.leaseEnd || '—'}</Text>
              </View>
              <View style={styles.memberCountBadge}>
                <Icon name="account-group-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.memberCountText}>{cabin.memberCount || 0}</Text>
              </View>
            </View>
          ) : <Text style={styles.companySince}>Client details are not included in the cabin response.</Text>}
        </>
      ) : (
        <>
          <View style={styles.divider} />
          <View style={styles.vacantRow}>
            <Icon name="tag-outline" size={14} color={Colors.accent300} />
            <Text style={styles.vacantRent}>{cabin.monthlyRent > 0 ? `₹${(cabin.monthlyRent / 1000).toFixed(0)}K / month` : 'Rent unavailable'}</Text>
            <View style={styles.capacityBadge}>
              <Icon name="account-multiple-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.capacityText}>Up to {cabin.capacity} people</Text>
            </View>
          </View>
        </>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerStat}>
          <Icon name="account-multiple-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.footerStatText}>Capacity {cabin.capacity}</Text>
        </View>
        <View style={styles.footerStat}>
          <Icon name="currency-inr" size={13} color={Colors.textMuted} />
          <Text style={styles.footerStatText}>{cabin.monthlyRent > 0 ? `₹${(cabin.monthlyRent / 1000).toFixed(0)}K/mo` : 'Rent unavailable'}</Text>
        </View>
        <View style={styles.viewDetailBtn}>
          <Text style={styles.viewDetailText}>View Detail</Text>
          <Icon name="chevron-right" size={14} color={Colors.accent300} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function InventoryScreen() {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();
  const { cabins, dashboardSummary } = useApp();
  const cabinData: Cabin[] = cabins;
  const monthlyRevenue = resolveMonthlyRevenue(dashboardSummary);
  const floorOptions = ['All Floors', ...Array.from(new Set(cabinData.map(cabin => cabin.floor).filter(Boolean)))];

  const [search,       setSearch]       = useState('');
  const [activeFloor,  setActiveFloor]  = useState('All Floors');
  const [activeStatus, setActiveStatus] = useState<CabinStatus | 'All'>('All');

  const filtered = cabinData.filter(c => {
    const matchSearch =
      c.cabinNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.companyName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFloor  = activeFloor === 'All Floors' || c.floor === activeFloor;
    const matchStatus = activeStatus === 'All' || c.status === activeStatus;
    return matchSearch && matchFloor && matchStatus;
  });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Inventory</Text>
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>{cabinData.length} cabins</Text>
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <SummaryCard cabins={cabinData} monthlyRevenue={monthlyRevenue} />

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cabin or company..."
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

            {/* Floor filters */}
            <View style={styles.filterRow}>
              {floorOptions.map(floor => {
                const isActive   = activeFloor === floor;
                const floorColor = FLOOR_COLORS[floor] ?? Colors.accent300;
                return (
                  <TouchableOpacity
                    key={floor}
                    onPress={() => setActiveFloor(floor)}
                    style={[styles.floorFilter, isActive && { backgroundColor: `${floorColor}22`, borderColor: floorColor }]}
                    activeOpacity={0.7}
                  >
                    {floor !== 'All Floors' && (
                      <View style={[styles.floorDot, { backgroundColor: floorColor }]} />
                    )}
                    <Text style={[styles.floorFilterText, isActive && { color: floorColor }]}>{floor}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status filters */}
            <View style={styles.filterRow}>
              {(['All', ...STATUSES] as const).map(status => {
                const isActive = activeStatus === status;
                const color    = status === 'All' ? Colors.accent300 : STATUS_CONFIG[status as CabinStatus].color;
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
                        {status === 'All'
                          ? cabinData.length
                          : cabinData.filter(c => c.status === status).length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Results count */}
            <Text style={styles.resultsCount}>{filtered.length} cabins</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="office-building-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No cabins found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CabinCard
            cabin={item}
            onPress={() => navigation.navigate('InventoryResourceDetailScreen', { kind: 'cabin', id: item.id })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  screenTitle:   { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  countChip:     { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  countChipText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textSecondary },

  listContent: { paddingHorizontal: Spacing.lg },

  // Summary
  summaryCard: { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.lg, marginTop: Spacing.sm },
  summaryTop:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.md },
  summaryMain: { alignItems: 'center' },
  summaryOccupancyPct:   { fontFamily: 'SequelSans-SemiBoldHead', fontSize: 32, color: Colors.textPrimary },
  summaryOccupancyLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  summaryStats:     { flex: 1, flexDirection: 'row', alignItems: 'center' },
  summaryStat:      { flex: 1, alignItems: 'center' },
  summaryStatValue: { fontFamily: 'SequelSans-SemiBoldHead', fontSize: 22, color: Colors.textPrimary },
  summaryStatLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  summaryDivider:   { width: 1, height: 32, backgroundColor: Colors.borderDefault },
  occupancyBar:     { height: 6, backgroundColor: Colors.secondarySurface, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.md },
  occupancyFill:    { height: '100%', backgroundColor: Colors.success, borderRadius: 3 },
  revenueRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  revenueDescription: { flex: 1 },
  revenueLabel:     { ...Typography.caption, color: Colors.textSecondary },
  revenueSub:       { fontFamily: 'SequelSans-BookBody', fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  revenueValue:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.success },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, paddingHorizontal: Spacing.md, height: 48, gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput:     { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },

  // Filters
  filterRow:      { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  floorFilter:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  floorDot:       { width: 8, height: 8, borderRadius: 4 },
  floorFilterText:{ fontFamily: 'SequelSans-BookBody', fontSize: 12, color: Colors.textSecondary },
  statusFilter:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  statusFilterText:{ fontFamily: 'SequelSans-BookBody', fontSize: 12, color: Colors.textSecondary },
  countBadge:     { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  countBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 10, color: Colors.textSecondary },
  resultsCount:   { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },

  // Card
  card: { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.sm, padding: Spacing.lg },

  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  cabinIconWrap:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cabinHeaderInfo: { flex: 1 },
  cabinNumber:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 16, color: Colors.textPrimary, marginBottom: 4 },
  cabinBadgeRow:   { flexDirection: 'row', gap: Spacing.sm },
  floorBadge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  floorBadgeText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  sizeBadge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  sizeBadgeText:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  divider: { height: 1, backgroundColor: Colors.borderDefault, marginBottom: Spacing.md },

  // Company row
  companyRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  companyAvatar:     { width: 40, height: 40, borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center' },
  companyAvatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textSecondary },
  companyInfo:       { flex: 1 },
  companyName:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textPrimary },
  companySince:      { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  memberCountBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: Colors.secondarySurface },
  memberCountText:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.textSecondary },

  // Vacant row
  vacantRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  vacantRent:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.accent300, flex: 1 },
  capacityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capacityText:  { ...Typography.caption, color: Colors.textSecondary },

  // Footer
  cardFooter:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  footerStat:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerStatText:{ ...Typography.caption, color: Colors.textMuted },
  viewDetailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  viewDetailText:{ fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.accent300 },

  empty:     { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textMuted },
});
