import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorCodes, isErrorWithCode, pick, types, type DocumentPickerResponse } from '@react-native-documents/picker';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../services/apiClient';
import { Routes } from '../../services/routes';
import { BorderRadius, Colors, Spacing, Typography } from '../../theme';
import { FileAttachment } from '../../types/domain';
import { DropdownField, DropdownOption } from '../../components/molecules/DropdownField';
import { downloadAuthenticatedFile } from '../../utils/downloadFile';
import { KeyboardSafeScrollView } from '../../components/molecules/KeyboardSafeScrollView';
import {
  formatRecordLabel,
  formatRecordValue,
  isHiddenRecordKey,
  isImageRecordValue,
  isInternalIdentifierKey,
  looksLikeInternalIdentifier,
  normalizeRecordKey,
} from '../../utils/displayRecord';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type AnyRecord = Record<string, unknown>;

const asRecord = (value: unknown): AnyRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
const unwrap = (value: unknown) => {
  const root = asRecord(value);
  return Object.keys(asRecord(root.data)).length ? asRecord(root.data) : root;
};
const listFrom = (value: unknown, keys: string[] = []) => {
  if (Array.isArray(value)) return value as AnyRecord[];
  const root = asRecord(value);
  if (Array.isArray(root.data)) return root.data as AnyRecord[];
  const data = asRecord(root.data);
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key] as AnyRecord[];
    if (Array.isArray(data[key])) return data[key] as AnyRecord[];
  }
  return [];
};
const valueText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  const record = asRecord(value);
  return valueText(record.name || record.companyName || record.label || record.title);
};
const recordId = (value: unknown) => valueText(asRecord(value)._id || asRecord(value).id || value);
const recordName = (value: unknown, fallback = 'Record') => {
  const record = asRecord(value);
  const combined = [record.firstName, record.lastName].map(valueText).filter(Boolean).join(' ');
  return valueText(record.name || record.displayName || record.companyName || record.legalName || record.title || record.label || record.cabinNumber || record.roomName || record.areaName || record.number) || combined || fallback;
};
const showError = (title: string, error: unknown) => Alert.alert(title, error instanceof Error ? error.message : 'Please try again.');
const prettyKey = formatRecordLabel;
const displayRows = (record: AnyRecord) => Object.entries(record).filter(([key, value]) => {
  if (isHiddenRecordKey(key)) return false;
  if (isInternalIdentifierKey(key)) return false;
  if (value == null || value === '') return false;
  if (looksLikeInternalIdentifier(value)) return false;
  if (Array.isArray(value)) return value.length > 0 && !value.every(looksLikeInternalIdentifier);
  if (typeof value === 'object') return Boolean(valueText(value));
  if (normalizeRecordKey(key) === 'discountstatus' && valueText(value).toLowerCase() === 'none') return false;
  return Boolean(formatRecordValue(key, value));
}).slice(0, 24);

function Page({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: { label: string; onPress(): void } }) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  return <View style={s.root}>
    <SafeAreaView edges={['top']}><View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}><Icon name="arrow-left" size={24} color={Colors.textPrimary} /></TouchableOpacity>
      <View style={s.flex}><Text style={s.title}>{title}</Text>{subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}</View>
      {action ? <TouchableOpacity onPress={action.onPress} style={s.headerAction}><Text style={s.headerActionText}>{action.label}</Text></TouchableOpacity> : null}
    </View></SafeAreaView>
    <KeyboardSafeScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 36 }]}>{children}</KeyboardSafeScrollView>
  </View>;
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: { label: string; value: string; onChangeText(value: string): void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'email-address' | 'phone-pad' }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={Colors.textMuted} multiline={multiline} keyboardType={keyboardType} style={[s.input, multiline && s.multiline]} /></View>;
}

function Button({ label, onPress, secondary, destructive, disabled }: { label: string; onPress(): void; secondary?: boolean; destructive?: boolean; disabled?: boolean }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[s.button, secondary && s.buttonSecondary, destructive && s.buttonDestructive, disabled && s.disabled]}><Text style={[s.buttonText, secondary && s.buttonTextSecondary]}>{label}</Text></TouchableOpacity>;
}

function RecordDetails({ record }: { record: AnyRecord }) {
  const { companies, members, buildings, meetingRooms, cabins, commonAreas, onDemandUsers, visitors, rfidCards } = useApp();
  const semanticKeys = new Set(Object.keys(record).map(normalizeRecordKey));
  const relationRows = Object.entries(record).flatMap(([key, value]) => {
    if (!isInternalIdentifierKey(key) || typeof value !== 'string') return [];
    const normalized = normalizeRecordKey(key);
    const relation = normalized === 'companyid' || normalized === 'clientid'
      ? { label: 'Company', value: companies.find(item => item.id === value)?.name, existing: ['company', 'companyname', 'client', 'clientname'] }
      : normalized === 'customerid'
        ? { label: 'Customer', value: onDemandUsers.find(item => item.id === value)?.name, existing: ['customer', 'customername', 'name'] }
      : normalized === 'memberid' || normalized === 'hostid' || normalized === 'assignedtoid'
        ? { label: normalized === 'hostid' ? 'Host' : normalized === 'assignedtoid' ? 'Assigned to' : 'Member', value: members.find(item => item.id === value)?.name, existing: normalized === 'hostid' ? ['host', 'hostname'] : normalized === 'assignedtoid' ? ['assignedto', 'assigneename'] : ['member', 'membername'] }
        : normalized === 'buildingid'
          ? { label: 'Building', value: buildings.find(item => item.id === value)?.name, existing: ['building', 'buildingname'] }
          : normalized === 'roomid'
            ? { label: 'Room', value: meetingRooms.find(item => item.id === value)?.name, existing: ['room', 'roomname'] }
            : normalized === 'cabinid'
              ? { label: 'Cabin', value: cabins.find(item => item.id === value)?.cabinNumber, existing: ['cabin', 'cabinnumber'] }
              : normalized === 'guestid'
                ? { label: 'Guest', value: onDemandUsers.find(item => item.id === value)?.name, existing: ['guest', 'guestname', 'membername'] }
                : normalized === 'visitorid'
                  ? { label: 'Visitor', value: visitors.find(item => item.id === value)?.name, existing: ['visitor', 'visitorname'] }
                  : normalized === 'cardid'
                  ? { label: 'Access card', value: rfidCards.find(item => item.id === value)?.uid, existing: ['card', 'carduid', 'rfid', 'uid'] }
                  : normalized === 'itemid'
                    ? { label: 'Item', value: [...meetingRooms.map(item => ({ id: item.id, name: item.name })), ...cabins.map(item => ({ id: item.id, name: item.cabinNumber })), ...commonAreas.map(item => ({ id: item.id, name: item.name }))].find(item => item.id === value)?.name, existing: ['item', 'itemname'] }
                    : null;
    if (!relation?.value || relation.existing.some(existing => semanticKeys.has(existing))) return [];
    return [[relation.label, relation.value] as [string, unknown]];
  });
  const rows = [...relationRows, ...displayRows(record)];
  const seen = new Set<string>();
  return <View style={s.card}>{rows.filter(([key, value]) => { const label = prettyKey(key); if (seen.has(label) || !formatRecordValue(key, value)) return false; seen.add(label); return true; }).slice(0, 24).map(([key, value]) => { const imageValue = Array.isArray(value) ? value.find(item => typeof item === 'string') : value; return <View key={key} style={s.detailRow}><Text style={s.detailLabel}>{prettyKey(key)}</Text>{isImageRecordValue(key, value) ? <Image source={{ uri: imageValue as string }} resizeMode="cover" style={s.detailImage} /> : <Text style={s.detailValue}>{formatRecordValue(key, value)}</Text>}</View>; })}</View>;
}

function Loading() { return <View style={s.loading}><ActivityIndicator color={Colors.accent300} /><Text style={s.subtitle}>Loading…</Text></View>; }

const toAttachment = (file: DocumentPickerResponse): FileAttachment => ({ uri: file.uri, name: file.name || 'document', type: file.type || 'application/octet-stream', size: file.size || undefined });
async function chooseFile(allowed: any = types.allFiles) {
  try {
    const [file] = await pick({ type: allowed, allowMultiSelection: false });
    return file ? toAttachment(file) : null;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
    throw error;
  }
}
const appendFile = (form: FormData, name: string, file: FileAttachment) => form.append(name, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);

export function GlobalSearchScreen() {
  const navigation = useNavigation<Nav>();
  const { tickets, members, companies, visitors, leads, onDemandUsers } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const runSearch = async () => {
    if (query.trim().length < 2) return Alert.alert('Keep typing', 'Enter at least two characters.');
    setLoading(true);
    try { setResults(listFrom(await apiClient.get(Routes.community.search, { q: query.trim(), limit: 20 }), ['results'])); }
    catch (error) { showError('Search failed', error); }
    finally { setLoading(false); }
  };
  const open = (result: AnyRecord) => {
    const type = valueText(result.type).toLowerCase();
    const url = valueText(result.url);
    const urlId = url.split(/[/?#]/).filter(Boolean).pop() || '';
    const id = valueText(
      result.ticketId || result.ticket_id || result.memberId || result.member_id ||
      result.companyId || result.company_id || result.clientId || result.client_id ||
      result.visitorId || result.visitor_id || result.leadId || result.lead_id ||
      result.guestId || result.guest_id || result.resourceId || result.resource_id,
    ) || urlId || recordId(result);
    const resultValues = new Set(
      [...Object.values(result).map(valueText), urlId, id]
        .map(value => value.trim().toLowerCase())
        .filter(Boolean),
    );
    const resultTitle = recordName(result, '').trim().toLowerCase();
    const matchingId = (records: Array<{ id: string; name: string }>) => records.find(item =>
      resultValues.has(item.id.toLowerCase()) ||
      Boolean(resultTitle && item.name.trim().toLowerCase() === resultTitle),
    )?.id || id;
    if (type.includes('ticket')) {
      const ticket = tickets.find(item =>
        resultValues.has(item.id.toLowerCase()) ||
        Boolean(item.backendId && resultValues.has(item.backendId.toLowerCase())) ||
        Boolean(resultTitle && item.subject.trim().toLowerCase() === resultTitle),
      );
      navigation.navigate('TicketDetailScreen', { ticketId: ticket?.id || id });
    }
    else if (type.includes('member')) navigation.navigate('MemberDetailScreen', { memberId: matchingId(members) });
    else if (type.includes('client') || type.includes('company')) navigation.navigate('CompanyDetailScreen', { companyId: matchingId(companies) });
    else if (type.includes('visitor')) navigation.navigate('VisitorDetailScreen', { visitorId: matchingId(visitors) });
    else if (type.includes('lead')) navigation.navigate('LeadDetailScreen', { leadId: matchingId(leads) });
    else if (type.includes('guest')) navigation.navigate('OnDemandUserDetailScreen', { guestId: matchingId(onDemandUsers) });
    else if (type.includes('event')) navigation.navigate('EventsScreen');
    else Alert.alert(recordName(result, 'Search result'), url || 'No app destination was supplied.');
  };
  return <Page title="Search" subtitle="Clients, members, guests, tickets and visitors"><View style={s.searchRow}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={runSearch} placeholder="Search the community…" placeholderTextColor={Colors.textMuted} style={[s.input, s.flex]} /><Button label="Search" onPress={runSearch} /></View>{loading ? <Loading /> : results.map((item, index) => <TouchableOpacity key={recordId(item) || String(index)} onPress={() => open(item)} style={s.card}><Text style={s.cardTitle}>{recordName(item, valueText(item.label) || 'Result')}</Text><Text style={s.subtitle}>{[valueText(item.type), valueText(item.subtitle || item.description)].filter(Boolean).join(' · ')}</Text></TouchableOpacity>)}</Page>;
}

export function LeadDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'LeadDetailScreen'>>();
  const { leads, syncAll } = useApp();
  const [lead, setLead] = useState<AnyRecord>(() => asRecord(leads.find(item => item.id === route.params.leadId)));
  const [file, setFile] = useState<FileAttachment | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const incoming = unwrap(await apiClient.get(Routes.lead(route.params.leadId))); setLead(current => ({ ...current, ...incoming })); } catch (error) { showError('Lead unavailable', error); } finally { setLoading(false); } }, [route.params.leadId]);
  useEffect(() => { load(); }, [load]);
  const upload = async () => {
    if (!file) return Alert.alert('Document required', 'Choose a JPG, PNG or PDF document.');
    if (file.size && file.size > 5 * 1024 * 1024) return Alert.alert('File too large', 'KYC documents must be 5 MB or smaller.');
    const form = new FormData(); appendFile(form, 'kycDocuments', file);
    try {
      await apiClient.put(Routes.leadKyc(route.params.leadId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedName = file.name;
      setFile(null);
      await load();
      setLead(current => ({
        ...current,
        kycStatus: 'pending_review',
        kycDocuments: [{ name: uploadedName }],
      }));
      Alert.alert('Uploaded', 'The KYC document is ready for review.');
    } catch (error) { showError('Upload failed', error); }
  };
  const act = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !reason.trim()) return Alert.alert('Reason required', 'Enter a rejection reason.');
    try {
      await apiClient.post(
        action === 'approve'
          ? Routes.approveLeadKyc(route.params.leadId)
          : Routes.rejectLeadKyc(route.params.leadId),
        action === 'reject' ? { reason: reason.trim() } : {},
      );
      await syncAll();
      await load();
      setLead(current => ({
        ...current,
        kycStatus: action === 'approve' ? 'approved' : 'rejected',
        ...(action === 'reject' ? { rejectionReason: reason.trim() } : {}),
      }));
      Alert.alert(action === 'approve' ? 'KYC approved' : 'KYC rejected');
    } catch (error) { showError('KYC action failed', error); }
  };
  const kycStatus = valueText(lead.kycStatus || lead.status).toLowerCase();
  const reviewComplete = ['approved', 'rejected'].includes(kycStatus);
  const hasDocument =
    (Array.isArray(lead.kycDocuments) && lead.kycDocuments.length > 0) ||
    ['pending', 'pending_review', 'under_review', 'approved'].includes(kycStatus);
  const documents = Array.isArray(lead.kycDocuments) ? lead.kycDocuments : [];
  const viewableDocuments = documents.map((entry, index) => {
    const document = asRecord(entry);
    return {
      name: valueText(document.name || document.fileName) || `Document ${index + 1}`,
      url: valueText(document.url || document.fileUrl || document.path || (typeof entry === 'string' ? entry : '')),
    };
  }).filter(document => document.url);
  return <Page title="Lead Details" subtitle={recordName(lead, '') || undefined}>{loading ? <Loading /> : <><RecordDetails record={lead} /><Text style={s.section}>KYC DOCUMENT</Text>{hasDocument ? <View style={s.card}><Text style={s.cardTitle}>Document uploaded</Text><Text style={s.subtitle}>Status: {formatRecordValue('status', lead.kycStatus || 'Pending review')}</Text>{viewableDocuments.map((document, index) => <Button key={`${document.url}-${index}`} label={`View ${document.name}`} secondary onPress={() => downloadAuthenticatedFile(document.url, document.name).catch(error => showError('KYC document unavailable', error))} />)}{viewableDocuments.length === 0 ? <Text style={s.subtitle}>The service did not provide a document link for review.</Text> : null}</View> : <><TouchableOpacity onPress={async () => { try { setFile(await chooseFile([types.images, types.pdf])); } catch (error) { showError('File unavailable', error); } }} style={s.file}><Icon name="file-upload-outline" size={24} color={Colors.accent300} /><Text style={s.flexText}>{file?.name || 'Choose JPG, JPEG, PNG or PDF (max 5 MB)'}</Text></TouchableOpacity><Button label="Upload KYC Document" onPress={upload} disabled={!file} /></>}{hasDocument && !reviewComplete ? <><Field label="Rejection reason" value={reason} onChangeText={setReason} placeholder="Required only when rejecting" multiline /><View style={s.actions}><Button label="Approve KYC" onPress={() => act('approve')} disabled={!viewableDocuments.length} /><Button label="Reject KYC" onPress={() => act('reject')} destructive disabled={!viewableDocuments.length} /></View></> : null}{reviewComplete && kycStatus === 'rejected' ? <Button label="Upload replacement document" secondary onPress={() => setLead(current => ({ ...current, kycStatus: '', kycDocuments: [] }))} /> : null}</>}</Page>;
}

export function OnDemandUserDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'OnDemandUserDetailScreen'>>();
  const { onDemandUsers } = useApp();
  const [record, setRecord] = useState<AnyRecord>(() => asRecord(onDemandUsers.find(item => item.id === route.params.guestId)));
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiClient.get(Routes.guest(route.params.guestId)).then(value => setRecord(current => ({ ...current, ...unwrap(value) }))).catch(error => showError('Guest unavailable', error)).finally(() => setLoading(false)); }, [route.params.guestId]);
  return <Page title="On-demand User" subtitle={recordName(record, '') || undefined}>{loading ? <Loading /> : <RecordDetails record={record} />}</Page>;
}

export function VisitorDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VisitorDetailScreen'>>();
  const { visitors, syncAll } = useApp();
  const [record, setRecord] = useState<AnyRecord>(() => asRecord(visitors.find(item => item.id === route.params.visitorId)));
  const [badgeId, setBadgeId] = useState(''); const [notes, setNotes] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const incoming = unwrap(await apiClient.get(Routes.visitor(route.params.visitorId))); setRecord(current => ({ ...current, ...incoming })); } catch (error) { showError('Visitor unavailable', error); } finally { setLoading(false); } }, [route.params.visitorId]);
  useEffect(() => { load(); }, [load]);
  const status = valueText(record.status).toLowerCase();
  const act = async (action: 'approve' | 'checkin' | 'checkout') => {
    try {
      if (action === 'approve') await apiClient.post(Routes.approveVisitorCheckin(route.params.visitorId));
      else if (action === 'checkin') await apiClient.patch(Routes.checkinVisitor(route.params.visitorId), { ...(badgeId.trim() ? { badgeId: badgeId.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) });
      else await apiClient.patch(Routes.checkoutVisitor(route.params.visitorId), notes.trim() ? { notes: notes.trim() } : {});
      await syncAll(); await load(); Alert.alert('Visitor updated');
    } catch (error) { showError('Visitor action failed', error); }
  };
  return <Page title="Visitor Details" subtitle={recordName(record, '') || undefined}>{loading ? <Loading /> : <><RecordDetails record={record} /><Field label="Badge number" value={badgeId} onChangeText={setBadgeId} placeholder="Optional" /><Field label="Reception notes" value={notes} onChangeText={setNotes} multiline />{status.includes('pending_checkin') || status.includes('pending checkin') ? <Button label="Approve Check-in" onPress={() => act('approve')} /> : null}{['invited', 'approved', 'expected'].some(value => status.includes(value)) ? <Button label="Check In" onPress={() => act('checkin')} /> : null}{status.includes('checked_in') || status.includes('checked in') ? <Button label="Check Out" onPress={() => act('checkout')} /> : null}</>}</Page>;
}

export function InventoryResourceDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'InventoryResourceDetailScreen'>>();
  const [record, setRecord] = useState<AnyRecord>({}); const [loading, setLoading] = useState(true);
  const path = route.params.kind === 'cabin' ? Routes.cabin(route.params.id) : route.params.kind === 'meeting-room' ? Routes.meetingRoom(route.params.id) : Routes.commonArea(route.params.id);
  useEffect(() => { apiClient.get(path).then(value => setRecord(unwrap(value))).catch(error => showError('Inventory details unavailable', error)).finally(() => setLoading(false)); }, [path]);
  return <Page title={route.params.kind === 'cabin' ? 'Cabin Details' : route.params.kind === 'meeting-room' ? 'Meeting Room Details' : 'Common Area Details'} subtitle={recordName(record, '') || undefined}>{loading ? <Loading /> : <RecordDetails record={record} />}</Page>;
}

type InventoryKind = 'cabins' | 'meeting-rooms' | 'common-areas';
export function InventoryImportsScreen() {
  const { syncAll } = useApp(); const [kind, setKind] = useState<InventoryKind>('cabins'); const [file, setFile] = useState<FileAttachment | null>(null); const [preview, setPreview] = useState<AnyRecord>({}); const [saving, setSaving] = useState(false); const [downloading, setDownloading] = useState(false);
  const labels: Record<InventoryKind, string> = { cabins: 'Cabins', 'meeting-rooms': 'Meeting rooms', 'common-areas': 'Common areas' };
  const upload = async (dryRun: boolean) => {
    if (!file) return Alert.alert('File required', 'Choose a CSV or Excel file.');
    setSaving(true);
    try { const form = new FormData(); appendFile(form, 'file', file); const response = await apiClient.post<AnyRecord>(Routes.inventoryImport(kind), form, { headers: { 'Content-Type': 'multipart/form-data' }, params: { dryRun } }); setPreview(unwrap(response)); if (!dryRun) { setFile(null); setPreview({}); await syncAll(); Alert.alert('Import complete', `${labels[kind]} were imported.`); } } catch (error) { showError(dryRun ? 'Preview failed' : 'Import failed', error); } finally { setSaving(false); }
  };
  const downloadSample = async () => { setDownloading(true); try { await downloadAuthenticatedFile(Routes.inventoryImportSample(kind), `${kind}-sample.csv`); } catch (error) { showError('Download failed', error); } finally { setDownloading(false); } };
  return <Page title="Inventory Imports" subtitle="Validate before committing"><DropdownField label="Inventory type" value={kind} options={(Object.keys(labels) as InventoryKind[]).map(value => ({ value, label: labels[value] }))} onChange={value => { setKind(value as InventoryKind); setFile(null); setPreview({}); }} /><TouchableOpacity onPress={async () => { try { setFile(await chooseFile()); } catch (error) { showError('File unavailable', error); } }} style={s.file}><Icon name="file-upload-outline" size={24} color={Colors.accent300} /><Text style={s.flexText}>{file?.name || 'Choose CSV or Excel file'}</Text></TouchableOpacity><View style={s.actions}><Button label={downloading ? 'Preparing…' : 'Download Sample'} secondary onPress={downloadSample} disabled={downloading} /><Button label="Validate" onPress={() => upload(true)} disabled={!file || saving} /></View>{Object.keys(preview).length ? <><Text style={s.section}>VALIDATION PREVIEW</Text><RecordDetails record={preview} /><Button label="Commit Import" onPress={() => upload(false)} disabled={saving} /></> : null}</Page>;
}

export function MeetingBookingDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'MeetingBookingDetailScreen'>>();
  const { bookings, members, visitors, rfidCards, syncAll, user } = useApp();
  const booking = bookings.find(item => item.id === route.params.bookingId);
  const [visitorId, setVisitorId] = useState(''); const [cardId, setCardId] = useState(''); const [credits, setCredits] = useState<AnyRecord>({});
  useEffect(() => { if (booking?.clientId) apiClient.get(Routes.creditsSummary(booking.clientId)).then(value => setCredits(unwrap(value))).catch(() => setCredits({})); }, [booking?.clientId]);
  if (!booking) return <Page title="Booking Details"><Text style={s.empty}>Booking record unavailable.</Text></Page>;
  const visitorOptions: DropdownOption[] = visitors.map(item => ({ value: item.id, label: `${item.name} · ${item.phone}` }));
  const cardOptions: DropdownOption[] = rfidCards.filter(card => card.status === 'Active' && !card.assignedTo).map(card => ({ value: card.id, label: card.uid || 'Access card' }));
  const accessPhone = booking.memberId ? members.find(item => item.id === booking.memberId)?.phone || '' : visitors.find(item => item.id === visitorId)?.phone || '';
  const addVisitor = async () => { if (!visitorId) return Alert.alert('Visitor required'); try { await apiClient.post(Routes.meetingBookingVisitors(booking.id), { visitorId, buildingId: user?.buildingId || '' }); Alert.alert('Visitor added'); } catch (error) { showError('Visitor not added', error); } };
  const provision = async () => { try { await apiClient.post(Routes.provisionMeetingAccess(booking.id)); await syncAll(); Alert.alert('Access provisioned'); } catch (error) { showError('Access not provisioned', error); } };
  const issueCard = async () => {
    if (!cardId || !accessPhone) return Alert.alert('Details required', 'Select a card and a booking person with a phone number.');
    try { const matrix = unwrap(await apiClient.get(Routes.matrixUserByPhone, { phone: accessPhone })); const matrixId = recordId(matrix.user || matrix); if (!matrixId) throw new Error('No Matrix user was found.'); await apiClient.post(Routes.setMatrixCard(matrixId), { rfidCardId: cardId, meetingBookingId: booking.id }); Alert.alert('Access card assigned'); } catch (error) { showError('Card not assigned', error); }
  };
  return <Page title="Booking Details" subtitle={`${booking.room} · ${formatRecordValue('date', booking.date)}`}><RecordDetails record={asRecord(booking)} />{Object.keys(credits).length ? <><Text style={s.section}>CREDIT SUMMARY</Text><RecordDetails record={credits} /></> : null}<Text style={s.section}>VISITORS & ACCESS</Text><DropdownField label="Visitor" value={visitorId} options={visitorOptions} onChange={setVisitorId} placeholder="Select an invited visitor" searchable /><Button label="Add Visitor" onPress={addVisitor} disabled={!visitorId} /><DropdownField label="Access card" value={cardId} options={cardOptions} onChange={setCardId} placeholder="Select an available card" searchable /><View style={s.actions}><Button label="Assign Card" secondary onPress={issueCard} disabled={!cardId || !accessPhone} /><Button label="Provision Access" onPress={provision} /></View></Page>;
}

type Invoice = AnyRecord & { _rowId?: string };
export function InvoicesScreen() {
  const navigation = useNavigation<Nav>(); const { companies } = useApp(); const [clientId, setClientId] = useState(''); const [invoices, setInvoices] = useState<Invoice[]>([]); const [loading, setLoading] = useState(false); const [selected, setSelected] = useState<Invoice | null>(null); const [amount, setAmount] = useState(''); const [reference, setReference] = useState(''); const [description, setDescription] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setInvoices(listFrom(await apiClient.get(Routes.invoices, clientId ? { client: clientId } : undefined), ['invoices', 'items'])); } catch (error) { showError('Invoices unavailable', error); } finally { setLoading(false); } }, [clientId]);
  useEffect(() => { load(); }, [load]);
  const upload = async (invoice: Invoice) => { try { const file = await chooseFile([types.pdf, types.images]); if (!file) return; const form = new FormData(); appendFile(form, 'file', file); await apiClient.post(Routes.invoiceUpload(recordId(invoice)), form, { headers: { 'Content-Type': 'multipart/form-data' } }); Alert.alert('E-invoice uploaded'); await load(); } catch (error) { showError('Upload failed', error); } };
  const push = async (invoice: Invoice, sendStatus: 'draft' | 'sent') => { try { await apiClient.post(Routes.invoicePushZoho(recordId(invoice)), { sendStatus }); Alert.alert(sendStatus === 'sent' ? 'Invoice sent through Zoho' : 'Invoice pushed to Zoho as draft'); await load(); } catch (error) { showError('Zoho action failed', error); } };
  const paymentLink = async (invoice: Invoice) => { try { const response = unwrap(await apiClient.post<AnyRecord>(Routes.razorpayCreatePaymentLink, { invoiceId: recordId(invoice) })); const url = valueText(response.short_url || response.shortUrl || response.url); if (!url) throw new Error('The payment service did not return a payment URL.'); navigation.navigate('PaymentWebViewScreen', { url, title: 'Invoice Payment', context: { invoiceId: recordId(invoice) } }); } catch (error) { showError('Payment link failed', error); } };
  const recordPayment = async () => { if (!selected || !clientId || Number(amount) <= 0) return Alert.alert('Details required', 'Select a client, invoice and positive amount.'); try { await apiClient.post(Routes.zohoCustomerPayment, { clientId, payment_mode: 'BankTransfer', amount: Number(amount), date: new Date().toISOString().slice(0, 10), reference_number: reference.trim(), description: description.trim(), invoices: [{ invoiceId: recordId(selected), amount_applied: Number(amount) }] }); setSelected(null); Alert.alert('Payment recorded'); await load(); } catch (error) { showError('Payment not recorded', error); } };
  return <Page title="Invoices" subtitle={`${invoices.length} records`}><DropdownField label="Client" value={clientId} options={companies.map(item => ({ value: item.id, label: item.name }))} onChange={setClientId} placeholder="All clients" searchable />{loading ? <Loading /> : invoices.map((invoice, index) => { const status = valueText(invoice.status); const paid = status.toLowerCase() === 'paid'; const amountLabel = formatRecordValue('amount', invoice.total || invoice.amount || invoice.balance); return <View key={recordId(invoice) || String(index)} style={s.card}><Text style={s.cardTitle}>{recordName(invoice, `Invoice ${index + 1}`)}</Text><Text style={s.subtitle}>{[formatRecordValue('status', status), amountLabel].filter(Boolean).join(' · ')}</Text><View style={s.actions}>{!paid ? <Button label="Payment Link" secondary onPress={() => paymentLink(invoice)} /> : null}<Button label="Upload E-Invoice" secondary onPress={() => upload(invoice)} /><Button label="Zoho Draft" secondary onPress={() => push(invoice, 'draft')} /><Button label="Send via Zoho" onPress={() => push(invoice, 'sent')} />{!paid ? <Button label="Record Payment" onPress={() => { setSelected(invoice); setAmount(valueText(invoice.balance || invoice.amount)); }} /> : null}</View></View>; })}<Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}><View style={s.modal}><Text style={s.title}>Record Payment</Text><Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /><Field label="Reference number" value={reference} onChangeText={setReference} /><Field label="Description" value={description} onChangeText={setDescription} multiline /><View style={s.actions}><Button label="Cancel" secondary onPress={() => setSelected(null)} /><Button label="Save Payment" onPress={recordPayment} /></View></View></KeyboardAvoidingView></Modal></Page>;
}

export function ExtendedHoursScreen() {
  const { companies } = useApp();
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('20:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const payload = () => ({ clientId, serviceDate: date, start, end, itemIds: [], notes: notes.trim() });
  const submit = async () => {
    if (!clientId || !date || !start || !end)
      return Alert.alert(
        'Details required',
        'Select a client and enter the service date, start time, and end time.',
      );
    if (end <= start)
      return Alert.alert('Invalid time', 'End time must be after start time.');
    try {
      setSubmitting(true);
      await apiClient.post(Routes.extendedHours.directRequest, {
        ...payload(),
        idempotencyKey: `community-mobile-${Date.now()}`,
      });
      setNotes('');
      Alert.alert(
        'Request submitted',
        'The extended-hours request has been sent to the admin team for review.',
      );
    } catch (error) {
      showError('Request failed', error);
    } finally {
      setSubmitting(false);
    }
  };
  return <Page title="Extended Hours" subtitle="Submit a request for admin review"><DropdownField label="Client" value={clientId} options={companies.map(item => ({ value: item.id, label: item.name }))} onChange={setClientId} placeholder="Select client" searchable /><Field label="Service date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /><View style={s.actions}><View style={s.flex}><Field label="Start" value={start} onChangeText={setStart} /></View><View style={s.flex}><Field label="End" value={end} onChangeText={setEnd} /></View></View><Field label="Notes" value={notes} onChangeText={setNotes} multiline /><Button label={submitting ? 'Submitting…' : 'Submit Request'} onPress={submit} disabled={!clientId || submitting} /></Page>;
}

export function CabinBlockingScreen() {
  const { user } = useApp(); const [cabins, setCabins] = useState<AnyRecord[]>([]); const [cabinId, setCabinId] = useState(''); const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10)); const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); const [reason, setReason] = useState('Maintenance');
  useEffect(() => { if (!user?.buildingId) return; apiClient.get(Routes.blockableCabins, { building: user.buildingId }).then(value => setCabins(listFrom(value, ['cabins']))).catch(error => showError('Cabins unavailable', error)); }, [user?.buildingId]);
  const block = async () => { if (!cabinId || !startDate || !endDate || !reason.trim()) return Alert.alert('Details required', 'Choose a cabin, date range and reason.'); if (endDate < startDate) return Alert.alert('Invalid dates', 'End date must be on or after start date.'); try { await apiClient.post(Routes.blockCabin(cabinId), { startDate, endDate, reason: reason.trim() }); Alert.alert('Cabin blocked', 'The date-based block was saved.'); } catch (error) { showError('Cabin not blocked', error); } };
  return <Page title="Block Cabin" subtitle={user?.buildingName}><DropdownField label="Cabin" value={cabinId} options={cabins.map(item => ({ value: recordId(item), label: recordName(item, valueText(item.cabinNumber || item.code)) }))} onChange={setCabinId} placeholder="Select cabin" searchable /><Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" /><Field label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" /><Field label="Reason" value={reason} onChangeText={setReason} multiline /><Button label="Block Cabin" onPress={block} destructive /></Page>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, flex: { flex: 1 }, flexText: { flex: 1, ...Typography.secondaryBody, color: Colors.textPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }, headerButton: { width: 40, height: 40, justifyContent: 'center' }, title: { ...Typography.pageTitle, color: Colors.textPrimary }, subtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 3 }, headerAction: { backgroundColor: Colors.accent300, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full }, headerActionText: { ...Typography.smallLabel, color: Colors.white },
  content: { padding: Spacing.lg }, section: { ...Typography.sectionLabel, color: Colors.textSecondary, marginTop: Spacing.xl, marginBottom: Spacing.sm }, card: { padding: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.borderDefault, marginBottom: Spacing.sm }, cardTitle: { ...Typography.sectionHeader, color: Colors.textPrimary },
  detailRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault, paddingVertical: Spacing.sm }, detailLabel: { ...Typography.smallLabel, color: Colors.textMuted }, detailValue: { ...Typography.secondaryBody, color: Colors.textPrimary, marginTop: 3 }, detailImage: { width: '100%', height: 180, borderRadius: BorderRadius.sm, marginTop: Spacing.sm, backgroundColor: Colors.secondarySurface },
  field: { marginBottom: Spacing.md }, label: { ...Typography.smallLabel, color: Colors.textSecondary, marginBottom: 6 }, input: { minHeight: 46, paddingHorizontal: Spacing.md, color: Colors.textPrimary, backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.borderDefault }, multiline: { minHeight: 88, paddingTop: Spacing.md, textAlignVertical: 'top' },
  button: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, backgroundColor: Colors.accent300, marginVertical: 4 }, buttonSecondary: { backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault }, buttonDestructive: { backgroundColor: Colors.alert }, buttonText: { ...Typography.buttonText, color: Colors.white }, buttonTextSecondary: { color: Colors.textPrimary }, disabled: { opacity: 0.4 }, actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  file: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, backgroundColor: Colors.cardSurface, marginBottom: Spacing.md }, searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg }, loading: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xxl }, empty: { ...Typography.secondaryBody, color: Colors.textMuted, textAlign: 'center', padding: Spacing.xxl },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlayDark }, modal: { backgroundColor: Colors.cardSurface, padding: Spacing.xl, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});
