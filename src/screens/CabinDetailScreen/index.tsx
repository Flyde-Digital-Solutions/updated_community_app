import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { BorderRadius, Colors, Spacing, Typography } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CabinRoute = RouteProp<RootStackParamList, 'CabinDetailScreen'>;

export function CabinDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<CabinRoute>();
  const insets = useSafeAreaInsets();
  const { cabins, companies, members } = useApp();
  const cabin = cabins.find(item => item.id === route.params.cabinId);
  const company = cabin?.companyId
    ? companies.find(item => item.id === cabin.companyId)
    : undefined;
  const occupants = company
    ? members.filter(item => item.companyId === company.id)
    : [];

  if (!cabin) {
    return (
      <View style={styles.root}>
        <SafeAreaView>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
          >
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.empty}>
          <Icon name="domain-remove" size={48} color={Colors.textMuted} />
          <Text style={styles.title}>Cabin not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
          >
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.flex}>
            <Text style={styles.title}>{cabin.cabinNumber}</Text>
            <Text style={styles.meta}>
              {[cabin.floor, cabin.size].filter(Boolean).join(' · ') ||
                'Cabin details unavailable'}
            </Text>
          </View>
          <View
            style={[
              styles.pill,
              {
                borderColor:
                  cabin.status === 'Occupied'
                    ? Colors.success
                    : Colors.accent300,
              },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                {
                  color:
                    cabin.status === 'Occupied'
                      ? Colors.success
                      : Colors.accent300,
                },
              ]}
            >
              {cabin.status}
            </Text>
          </View>
        </View>
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.hero}>
          <Icon
            name={
              cabin.status === 'Occupied'
                ? 'office-building'
                : 'office-building-outline'
            }
            size={38}
            color={Colors.accent300}
          />
          <Text style={styles.capacity}>Capacity {cabin.capacity}</Text>
          <Text style={styles.rent}>
            {cabin.monthlyRent > 0
              ? `₹${cabin.monthlyRent.toLocaleString('en-IN')} / month`
              : 'Rent unavailable'}
          </Text>
        </View>
        <Text style={styles.section}>Occupancy</Text>
        <View style={styles.card}>
          {company ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('CompanyDetailScreen', {
                  companyId: company.id,
                })
              }
              style={styles.companyRow}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {company.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{company.name}</Text>
                <Text style={styles.meta}>
                  {company.memberCount} members · since{' '}
                  {cabin.occupiedSince || '—'}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.meta}>
              {cabin.status === 'Occupied'
                ? 'Occupied — client details are not included in the cabin response.'
                : 'This cabin is available for allocation.'}
            </Text>
          )}
        </View>
        {company && (
          <>
            <Text style={styles.section}>Members</Text>
            <View style={styles.card}>
              {occupants.map((member, index) => (
                <TouchableOpacity
                  key={member.id}
                  onPress={() =>
                    navigation.navigate('MemberDetailScreen', {
                      memberId: member.id,
                    })
                  }
                  style={[styles.memberRow, index > 0 && styles.divider]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{member.name}</Text>
                    <Text style={styles.meta}>{member.role}</Text>
                  </View>
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.pageTitle, color: Colors.textPrimary },
  meta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 3 },
  pill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },
  content: { padding: Spacing.lg },
  hero: {
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  capacity: {
    ...Typography.sectionHeader,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  rent: { ...Typography.secondaryBody, color: Colors.accent300, marginTop: 5 },
  section: {
    ...Typography.sectionLabel,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    padding: Spacing.lg,
  },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    color: Colors.accent300,
  },
  cardTitle: { ...Typography.sectionHeader, color: Colors.textPrimary },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  divider: { borderTopWidth: 1, borderTopColor: Colors.borderDefault },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
});
