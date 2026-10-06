import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { apiClient } from '../../services/apiClient';
import { Routes } from '../../services/routes';
import { BorderRadius, Colors, Spacing, Typography } from '../../theme';

type IncidentRoute = RouteProp<RootStackParamList, 'IncidentDetailScreen'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type RecordValue = Record<string, unknown>;

const unwrap = (value: unknown): RecordValue => {
  if (!value || typeof value !== 'object') return {};
  const record = value as RecordValue;
  const data = record.data && typeof record.data === 'object' ? record.data as RecordValue : record;
  return data.incident && typeof data.incident === 'object' ? data.incident as RecordValue : data;
};

const displayValue = (value: unknown): string => {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (typeof value === 'object') {
    const record = value as RecordValue;
    return String(record.name || record.title || record.email || record._id || record.id || 'Available');
  }
  return String(value);
};

const labelFor = (key: string) => key
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/_/g, ' ')
  .replace(/^./, value => value.toUpperCase());

export function IncidentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<IncidentRoute>();
  const insets = useSafeAreaInsets();
  const [incident, setIncident] = useState<RecordValue>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setIncident(unwrap(await apiClient.get(Routes.incident(route.params.incidentId))));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'This incident is unavailable.';
      setError(message);
      Alert.alert('Incident unavailable', 'It may have been removed or may be outside your building access.');
    } finally {
      setLoading(false);
    }
  }, [route.params.incidentId]);

  useEffect(() => { load(); }, [load]);

  const hiddenKeys = new Set(['__v', '_id', 'id', 'building', 'createdBy', 'updatedBy']);
  const entries = Object.entries(incident).filter(([key, value]) => !hiddenKeys.has(key) && value != null && value !== '');
  const title = String(incident.title || (route.params.kind === 'building_incident' ? 'Building incident' : 'Access & safety issue'));

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Live authorized incident record</Text>
          </View>
          <TouchableOpacity onPress={load} style={styles.backBtn}>
            <Icon name="refresh" size={22} color={Colors.accent300} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {loading ? <ActivityIndicator color={Colors.accent300} /> : error ? (
          <View style={styles.emptyCard}>
            <Icon name="shield-alert-outline" size={42} color={Colors.alert} />
            <Text style={styles.emptyTitle}>Incident cannot be opened</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            {entries.map(([key, value], index) => (
              <View key={key} style={[styles.row, index > 0 && styles.rowBorder]}>
                <Text style={styles.label}>{labelFor(key)}</Text>
                <Text style={styles.value}>{displayValue(value)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { ...Typography.pageTitle, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  content: { padding: Spacing.lg },
  card: { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, paddingHorizontal: Spacing.md },
  row: { paddingVertical: Spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderDefault },
  label: { ...Typography.caption, color: Colors.textMuted, marginBottom: 4 },
  value: { ...Typography.secondaryBody, color: Colors.textPrimary },
  emptyCard: { alignItems: 'center', backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.borderDefault },
  emptyTitle: { ...Typography.sectionTitle, color: Colors.textPrimary, marginTop: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  retry: { marginTop: Spacing.lg, backgroundColor: Colors.accent300, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  retryText: { fontFamily: 'SequelSans-SemiBoldBody', color: Colors.white },
});
