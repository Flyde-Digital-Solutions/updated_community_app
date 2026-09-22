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

type Nav        = NativeStackNavigationProp<RootStackParamList>;
type TabType    = 'Members' | 'Companies';
type MemberStatus  = 'Active' | 'Inactive';

interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyId: string;
  companyName: string;
  cabin: string;
  floor: string;
  memberSince?: string;
  status: MemberStatus;
  gender?: 'Male' | 'Female' | 'Other';
  kycVerified: boolean;
  role: string;
}

interface Company {
  id: string;
  name: string;
  cabin: string;
  floor: string;
  memberCount: number;
  memberSince?: string;
  leaseEnd?: string;
  monthlyRent: number;
  status: MemberStatus;
  industry?: string;
  contactPerson: string;
  contactPhone: string;
}

const FLOOR_COLORS: Record<string, string> = {
  'Floor 1': '#30BCED',
  'Floor 2': '#A78BFA',
  'Floor 3': '#F472B6',
};

const STATUS_CONFIG: Record<MemberStatus, { color: string; bg: string }> = {
  Active:   { color: Colors.success,   bg: 'rgba(0,129,54,0.12)'    },
  Inactive: { color: Colors.textMuted, bg: 'rgba(100,100,100,0.12)' },
};

const GENDER_COLORS = { Male: '#30BCED', Female: '#F472B6', Other: Colors.textSecondary };

const STATUSES: MemberStatus[] = ['Active', 'Inactive'];

// ── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({ member, onPress }: { member: Member; onPress: () => void }) {
  const statusCfg  = STATUS_CONFIG[member.status];
  const floorColor = FLOOR_COLORS[member.floor] ?? Colors.textSecondary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </Text>
          </View>
          {member.gender && <View style={[styles.genderDot, { backgroundColor: GENDER_COLORS[member.gender] }]} />}
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
          {member.kycVerified && (
            <Icon name="shield-check" size={14} color={Colors.success} />
          )}
          <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusPillText, { color: statusCfg.color }]}>{member.status}</Text>
          </View>
        </View>

        <Text style={styles.memberRole} numberOfLines={1}>{member.role}</Text>
        <Text style={styles.memberCompany} numberOfLines={1}>{member.companyName}</Text>

        <View style={styles.metaRow}>
          <View style={[styles.cabinBadge, { backgroundColor: `${floorColor}18` }]}>
            <Icon name="office-building" size={11} color={floorColor} />
            <Text style={[styles.cabinBadgeText, { color: floorColor }]}>{member.cabin}</Text>
          </View>
          {!!member.memberSince && <Text style={styles.memberSince}>Since {member.memberSince}</Text>}
        </View>
      </View>

      <Icon name="chevron-right" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// ── Company Card ──────────────────────────────────────────────────────────────
function CompanyCard({ company, onPress }: { company: Company; onPress: () => void }) {
  const statusCfg  = STATUS_CONFIG[company.status];
  const floorColor = FLOOR_COLORS[company.floor] ?? Colors.textSecondary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={styles.companyLogoWrap}>
        <Text style={styles.companyLogoText}>
          {company.name.slice(0, 2).toUpperCase()}
        </Text>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.memberName} numberOfLines={1}>{company.name}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusPillText, { color: statusCfg.color }]}>{company.status}</Text>
          </View>
        </View>

        {!!company.industry && <Text style={styles.memberRole} numberOfLines={1}>{company.industry}</Text>}

        <View style={styles.metaRow}>
          <View style={[styles.cabinBadge, { backgroundColor: `${floorColor}18` }]}>
            <Icon name="office-building" size={11} color={floorColor} />
            <Text style={[styles.cabinBadgeText, { color: floorColor }]}>{company.cabin}</Text>
          </View>
          <View style={styles.memberCountBadge}>
            <Icon name="account-group-outline" size={11} color={Colors.textSecondary} />
            <Text style={styles.memberCountText}>{company.memberCount} members</Text>
          </View>
        </View>

        <View style={styles.leaseRow}>
          <Icon name="calendar-clock" size={12} color={Colors.textMuted} />
          {!!company.leaseEnd && <Text style={styles.leaseText}>Lease ends {company.leaseEnd}</Text>}
          {company.monthlyRent > 0 && <Text style={styles.rentText}>₹{(company.monthlyRent / 1000).toFixed(0)}K/mo</Text>}
        </View>
      </View>

      <Icon name="chevron-right" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function MembersScreen() {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();
  const { members, companies, cabins } = useApp();
  const memberData: Member[] = members.map(member => ({
    id: member.id, name: member.name, phone: member.phone, email: member.email, companyId: member.companyId,
    companyName: member.company, cabin: member.cabin, floor: member.floor, memberSince: member.memberSince, status: member.status,
    gender: member.gender, kycVerified: member.kycVerified, role: member.role,
  }));
  const companyData: Company[] = companies.map(company => {
    const cabin = cabins.find(item => item.companyId === company.id);
    return {
      id: company.id, name: company.name, cabin: company.cabin, floor: company.floor, memberCount: company.memberCount,
      memberSince: company.memberSince || cabin?.occupiedSince, leaseEnd: company.leaseEnd || cabin?.leaseEnd, monthlyRent: company.monthlyRent || cabin?.monthlyRent || 0,
      status: company.status, industry: company.industry, contactPerson: company.contactPerson, contactPhone: company.phone,
    };
  });
  const floorOptions = ['All Floors', ...Array.from(new Set([
    ...memberData.map(member => member.floor),
    ...companyData.map(company => company.floor),
  ].filter(Boolean)))];

  const [activeTab,    setActiveTab]    = useState<TabType>('Members');
  const [search,       setSearch]       = useState('');
  const [activeFloor,  setActiveFloor]  = useState('All Floors');
  const [activeStatus, setActiveStatus] = useState<MemberStatus | 'All'>('All');

  const filteredMembers = memberData.filter(m => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.companyName.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase()) ||
      m.cabin.toLowerCase().includes(search.toLowerCase());
    const matchFloor  = activeFloor === 'All Floors' || m.floor === activeFloor;
    const matchStatus = activeStatus === 'All' || m.status === activeStatus;
    return matchSearch && matchFloor && matchStatus;
  });

  const filteredCompanies = companyData.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry || '').toLowerCase().includes(search.toLowerCase()) ||
      c.cabin.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchFloor  = activeFloor === 'All Floors' || c.floor === activeFloor;
    const matchStatus = activeStatus === 'All' || c.status === activeStatus;
    return matchSearch && matchFloor && matchStatus;
  });

  const ListHeader = (
    <>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'Members' ? 'Search member, role, company...' : 'Search company, industry...'}
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

      {/* Floor filter */}
      <View style={styles.filterRow}>
        {floorOptions.map(floor => {
          const isActive   = activeFloor === floor;
          const floorColor = FLOOR_COLORS[floor] ?? Colors.accent300;
          return (
            <TouchableOpacity
              key={floor}
              onPress={() => setActiveFloor(floor)}
              style={[styles.filterChip, isActive && { backgroundColor: `${floorColor}22`, borderColor: floorColor }]}
              activeOpacity={0.7}
            >
              {floor !== 'All Floors' && (
                <View style={[styles.floorDot, { backgroundColor: floorColor }]} />
              )}
              <Text style={[styles.filterChipText, isActive && { color: floorColor }]}>{floor}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status filter */}
      <View style={styles.filterRow}>
        {(['All', ...STATUSES] as const).map(status => {
          const isActive = activeStatus === status;
          const color    = status === 'All' ? Colors.accent300 : STATUS_CONFIG[status as MemberStatus].color;
          return (
            <TouchableOpacity
              key={status}
              onPress={() => setActiveStatus(status)}
              style={[styles.filterChip, isActive && { backgroundColor: `${color}22`, borderColor: color }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && { color }]}>{status}</Text>
              <View style={[styles.countBadge, isActive && { backgroundColor: color }]}>
                <Text style={[styles.countBadgeText, isActive && { color: Colors.white }]}>
                  {status === 'All'
                    ? (activeTab === 'Members' ? filteredMembers.length : filteredCompanies.length)
                    : activeTab === 'Members'
                      ? memberData.filter(m => m.status === status).length
                      : companyData.filter(c => c.status === status).length}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.resultsCount}>
        {activeTab === 'Members' ? filteredMembers.length : filteredCompanies.length} {activeTab.toLowerCase()}
      </Text>
    </>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Members</Text>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['Members', 'Companies'] as TabType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => { setActiveTab(tab); setSearch(''); }}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Icon
                name={tab === 'Members' ? 'account-group-outline' : 'office-building-outline'}
                size={16}
                color={activeTab === tab ? Colors.accent300 : Colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              <View style={[styles.tabCount, activeTab === tab && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, activeTab === tab && { color: Colors.accent300 }]}>
                  {tab === 'Members' ? memberData.length : companyData.length}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {activeTab === 'Members' ? (
        <FlatList
          key="members"
          data={filteredMembers}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="account-off-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MemberCard
              member={item}
              onPress={() => navigation.navigate('MemberDetailScreen', { memberId: item.id })}
            />
          )}
        />
      ) : (
        <FlatList
          key="companies"
          data={filteredCompanies}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="domain-remove" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No companies found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CompanyCard
              company={item}
              onPress={() => navigation.navigate('CompanyDetailScreen', { companyId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },

  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.borderDefault, paddingHorizontal: Spacing.lg },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:      { borderBottomColor: Colors.accent300 },
  tabText:        { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textSecondary },
  tabTextActive:  { color: Colors.accent300 },
  tabCount:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full, backgroundColor: Colors.secondarySurface },
  tabCountActive: { backgroundColor: 'rgba(255,126,21,0.15)' },
  tabCountText:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.textSecondary },

  listContent: { paddingHorizontal: Spacing.lg },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, paddingHorizontal: Spacing.md, height: 48, gap: Spacing.sm, marginBottom: Spacing.sm, marginTop: Spacing.md },
  searchInput:     { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 15, color: Colors.textPrimary },

  // Filters
  filterRow:      { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  filterChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault },
  filterChipText: { fontFamily: 'SequelSans-BookBody', fontSize: 12, color: Colors.textSecondary },
  floorDot:       { width: 8, height: 8, borderRadius: 4 },
  countBadge:     { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  countBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 10, color: Colors.textSecondary },
  resultsCount:   { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },

  // Member card
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },

  cardLeft:  { flexShrink: 0 },
  avatarWrap: { position: 'relative' },
  avatar:     { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.white },
  genderDot:  { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.cardSurface },

  cardInfo:   { flex: 1 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  memberName: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary, flex: 1 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: BorderRadius.full },
  statusPillText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 10 },
  memberRole:    { ...Typography.caption, color: Colors.textSecondary, marginBottom: 2 },
  memberCompany: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cabinBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: BorderRadius.full },
  cabinBadgeText:{ fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  memberSince:   { ...Typography.caption, color: Colors.textMuted },

  // Company card
  companyLogoWrap: { width: 46, height: 46, borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center' },
  companyLogoText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 16, color: Colors.textSecondary },
  memberCountBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberCountText: { ...Typography.caption, color: Colors.textSecondary },
  leaseRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  leaseText:       { ...Typography.caption, color: Colors.textMuted, flex: 1 },
  rentText:        { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.success },

  empty:     { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textMuted },
});
