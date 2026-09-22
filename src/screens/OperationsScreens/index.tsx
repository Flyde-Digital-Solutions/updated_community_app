import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';
import { useApp } from '../../context/AppContext';
import { formatTimeRange } from '../../utils/timeRange';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { BorderRadius, Colors, Spacing, Typography } from '../../theme';
import {
  CommunityPost,
  EventRecord,
  FileAttachment,
  PrinterRequest,
  RfidCard,
  Ticket,
} from '../../types/domain';
import { DropdownField } from '../../components/molecules/DropdownField';
import { ImagePickerField } from '../../components/molecules/ImagePickerField';
import {
  dateOptions,
  resolveDropdownSelection,
  timeOptions,
  useEventFormOptions,
} from '../../hooks/useEventFormOptions';
import { useDayPassCatalog } from '../../hooks/useDayPassCatalog';
import { useTicketFormOptions } from '../../hooks/useTicketFormOptions';
import { apiClient } from '../../services/apiClient';
import { Routes } from '../../services/routes';
import { downloadAuthenticatedFile } from '../../utils/downloadFile';
import { dayPassCreditSuccessMessage } from '../../utils/dayPass';
import { KeyboardSafeScrollView } from '../../components/molecules/KeyboardSafeScrollView';
import { formatRecordValue } from '../../utils/displayRecord';
import { isPastDateTime, localDateString } from '../../utils/dateTimeValidation';
import { pickedAttachment } from '../../utils/pickedAttachment';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type OperationRoute =
  | 'EventsScreen'
  | 'CommunityScreen'
  | 'LeadsScreen'
  | 'RfidCardsScreen'
  | 'PrinterRequestsScreen'
  | 'BillingScreen'
  | 'CommonAreasScreen'
  | 'BookDayPassScreen'
  | 'OnDemandUsersScreen'
  | 'MeetingRoomsInventoryScreen'
  | 'InvoicesScreen'
  | 'ExtendedHoursScreen';
const EVENT_DATE_OPTIONS = dateOptions();
const EVENT_TIME_OPTIONS = timeOptions();

const alertActionError = (title: string, error: unknown) =>
  Alert.alert(
    title,
    error instanceof Error ? error.message : 'Please try again.',
  );

function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress(): void };
}) {
  const navigation = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? (
          <TouchableOpacity
            onPress={action.onPress}
            style={styles.headerAction}
          >
            <Icon name="plus" size={18} color={Colors.white} />
            <Text style={styles.headerActionText}>{action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function FormSheet({
  visible,
  title,
  onClose,
  onSave,
  saving = false,
  saveLabel = 'Save',
  children,
}: {
  visible: boolean;
  title: string;
  onClose(): void;
  onSave(): void;
  saving?: boolean;
  saveLabel?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardSheet}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + Spacing.lg },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Close ${title}`}
                onPress={onClose}
                style={styles.sheetClose}
              >
                <Icon name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <KeyboardSafeScrollView
              avoidKeyboard={false}
              contentContainerStyle={styles.formSheetContent}
            >
              {children}
            </KeyboardSafeScrollView>
            <TouchableOpacity
              onPress={onSave}
              disabled={saving}
              style={[styles.primaryButton, saving && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Saving…' : saveLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText(value: string): void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const asAttachment = (file: DocumentPickerResponse): FileAttachment => ({
  uri: file.uri,
  name: file.name || 'document',
  type: file.type || 'application/octet-stream',
  size: file.size || undefined,
});
const appendMultipartFileLocal = (
  form: FormData,
  field: string,
  file: FileAttachment,
) =>
  form.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

const isPickerCancelled = (error: unknown) =>
  isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;

function AttachmentPicker({
  file,
  onPress,
  accept,
}: {
  file: FileAttachment | null;
  onPress(): void;
  accept: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>File</Text>
      <TouchableOpacity onPress={onPress} style={styles.filePicker}>
        <Icon
          name={file ? 'file-check-outline' : 'file-upload-outline'}
          size={25}
          color={file ? Colors.success : Colors.accent300}
        />
        <View style={styles.flex}>
          <Text style={styles.filePickerTitle} numberOfLines={1}>
            {file?.name || 'Choose a file'}
          </Text>
          <Text style={styles.meta}>
            {file
              ? `${file.type}${
                  file.size ? ` · ${(file.size / 1024).toFixed(0)} KB` : ''
                }`
              : accept}
          </Text>
        </View>
        <Icon name="chevron-right" size={22} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function Pill({
  label,
  color = Colors.accent300,
}: {
  label: string;
  color?: string;
}) {
  return (
    <View
      style={[
        styles.pill,
        { borderColor: color, backgroundColor: `${color}18` },
      ]}
    >
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={42} color={Colors.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const MODULES: Array<{
  title: string;
  description: string;
  icon: string;
  color: string;
  route: OperationRoute;
}> = [
  // { title: 'Events', description: 'Create, publish and manage RSVPs', icon: 'calendar-star', color: '#A78BFA', route: 'EventsScreen' },
  {
    title: 'Community',
    description: 'Announcements and member posts',
    icon: 'account-group-outline',
    color: '#30BCED',
    route: 'CommunityScreen',
  },
  {
    title: 'Leads',
    description: 'Enquiries and conversion pipeline',
    icon: 'account-convert-outline',
    color: '#F472B6',
    route: 'LeadsScreen',
  },
  {
    title: 'RFID Cards',
    description: 'Issue, assign and recover cards',
    icon: 'card-account-details-outline',
    color: Colors.success,
    route: 'RfidCardsScreen',
  },
  {
    title: 'Printing',
    description: 'Process member print requests',
    icon: 'printer-outline',
    color: Colors.accent200,
    route: 'PrinterRequestsScreen',
  },
  {
    title: 'Billing',
    description: 'Outstanding client balances',
    icon: 'receipt',
    color: '#30BCED',
    route: 'BillingScreen',
  },
  {
    title: 'Common Areas',
    description: 'Shared-space inventory',
    icon: 'sofa-outline',
    color: Colors.accent300,
    route: 'CommonAreasScreen',
  },
  {
    title: 'Meeting Rooms',
    description: 'Room availability and utilisation',
    icon: 'door-open',
    color: Colors.accent200,
    route: 'MeetingRoomsInventoryScreen',
  },
  {
    title: 'Invoices',
    description: 'Payments, e-invoices and Zoho actions',
    icon: 'file-document-outline',
    color: Colors.success,
    route: 'InvoicesScreen',
  },
  {
    title: 'Extended Hours',
    description: 'Submit requests for admin review',
    icon: 'clock-plus-outline',
    color: '#A78BFA',
    route: 'ExtendedHoursScreen',
  },
];

export function OperationsHubScreen() {
  const navigation = useNavigation<Nav>();
  const { connection, pendingOperations } = useApp();
  return (
    <View style={styles.root}>
      <Header
        title="Operations"
        subtitle={`${connection === 'online' ? 'Connected' : 'Offline'} · ${
          pendingOperations.length
        } queued`}
      />
      <FlatList
        data={MODULES}
        numColumns={2}
        keyExtractor={item => item.title}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate(item.route)}
            style={styles.moduleCard}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.moduleIcon,
                { backgroundColor: `${item.color}20` },
              ]}
            >
              <Icon name={item.icon} size={25} color={item.color} />
            </View>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            <Text style={styles.moduleDescription}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export function EventsScreen() {
  const {
    events,
    createEvent,
    loadEventRsvps,
    updateEvent,
    deleteEvent,
    buildings,
    user,
  } = useApp();
  const { categories } = useEventFormOptions();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [eventSpeakers, setEventSpeakers] = useState<Array<{
    key: string;
    name: string;
    role: string;
    link: string;
    image?: string;
    imageFile: FileAttachment | null;
  }>>([]);
  const [coverImage, setCoverImage] = useState('');
  const [additionalImage, setAdditionalImage] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<FileAttachment | null>(
    null,
  );
  const [additionalImageFile, setAdditionalImageFile] =
    useState<FileAttachment | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [buildingId, setBuildingId] = useState(user?.buildingId || '');
  const [isExternal, setIsExternal] = useState(false);
  const [venueAddress, setVenueAddress] = useState('');
  const [googleMapLink, setGoogleMapLink] = useState('');
  const [rsvpClosingDate, setRsvpClosingDate] = useState('');
  const [rsvpClosingTime, setRsvpClosingTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);
  const subcategories = useMemo(
    () =>
      categories.find(item => item.value === categoryId)?.subcategories || [],
    [categories, categoryId],
  );
  const editingEvent = useMemo(
    () => events.find(event => event.id === editingId),
    [editingId, events],
  );

  useEffect(() => {
    if (!editingEvent || !categories.length) return;
    const categoryIsValid = categories.some(
      option => option.value === categoryId,
    );
    const resolvedCategoryId = resolveDropdownSelection(
      categories,
      editingEvent.categoryId,
      editingEvent.category,
    );
    if (!categoryIsValid && resolvedCategoryId) {
      setCategoryId(resolvedCategoryId);
      return;
    }
    if (categoryId !== resolvedCategoryId) return;
    const categorySubcategories =
      categories.find(option => option.value === resolvedCategoryId)
        ?.subcategories || [];
    const subcategoryIsValid = categorySubcategories.some(
      option => option.value === subcategoryId,
    );
    if (!subcategoryIsValid) {
      const resolvedSubcategoryId = resolveDropdownSelection(
        categorySubcategories,
        editingEvent.subcategoryId,
        editingEvent.subcategory,
      );
      if (resolvedSubcategoryId) setSubcategoryId(resolvedSubcategoryId);
    }
  }, [categories, categoryId, editingEvent, subcategoryId]);

  const openEditor = (event?: EventRecord) => {
    const resolvedCategoryId = resolveDropdownSelection(
      categories,
      event?.categoryId,
      event?.category,
    );
    const categorySubcategories =
      categories.find(option => option.value === resolvedCategoryId)
        ?.subcategories || [];
    setEditingId(event?.id || null);
    setTitle(event?.title || '');
    setDescription(event?.description || '');
    setCategoryId(resolvedCategoryId);
    setSubcategoryId(
      resolveDropdownSelection(
        categorySubcategories,
        event?.subcategoryId,
        event?.subcategory,
      ),
    );
    const savedSpeakers = event?.speakers?.length
      ? event.speakers
      : event?.speaker
      ? [{ name: event.speaker }]
      : [];
    setEventSpeakers(
      savedSpeakers.map((speaker, index) => ({
        key: `${Date.now()}-${index}`,
        name: speaker.name,
        role: speaker.role || '',
        link: speaker.link || '',
        image: speaker.image,
        imageFile: null,
      })),
    );
    setCoverImage(event?.coverImage || '');
    setAdditionalImage(event?.additionalImage || '');
    setCoverImageFile(null);
    setAdditionalImageFile(null);
    setDate(event?.date || '');
    setStartTime(event?.startTime || '');
    setEndTime(event?.endTime || '');
    setBuildingId(event?.buildingId || user?.buildingId || '');
    setIsExternal(Boolean(event?.isExternal));
    setVenueAddress(event?.venueAddress || (event?.isExternal ? event.location : ''));
    setGoogleMapLink(event?.googleMapLink || '');
    setRsvpClosingDate(event?.rsvpClosingDate || '');
    setRsvpClosingTime(event?.rsvpClosingTime || '');
    setCapacity(event ? String(event.capacity) : '');
    setOpen(true);
  };
  const save = async () => {
    if (
      !title.trim() ||
      !description.trim() ||
      !categoryId ||
      !date ||
      !startTime ||
      !endTime ||
      (!isExternal && !buildingId) ||
      !rsvpClosingDate ||
      !rsvpClosingTime
    )
      return Alert.alert(
        'Missing details',
        'Name, description, category, RSVP closing date/time, building, date, and event time are required.',
      );
    if (subcategories.length && !subcategoryId)
      return Alert.alert(
        'Missing subcategory',
        'Select a subcategory for this event.',
      );
    if (endTime <= startTime)
      return Alert.alert('Invalid time', 'End time must be after start time.');
    if (isPastDateTime(date, startTime))
      return Alert.alert('Invalid time', 'Choose a future event date and start time.');
    if (isPastDateTime(rsvpClosingDate, rsvpClosingTime))
      return Alert.alert('Invalid RSVP time', 'RSVP closing must be in the future.');
    if (
      rsvpClosingDate > date ||
      (rsvpClosingDate === date && rsvpClosingTime >= startTime)
    )
      return Alert.alert(
        'Invalid RSVP closing time',
        'RSVP registration must close before the event starts.',
      );
    if (isExternal && !venueAddress.trim())
      return Alert.alert(
        'Venue required',
        'Enter the venue address for this external event.',
      );
    if (eventSpeakers.some(speaker => !speaker.name.trim()))
      return Alert.alert(
        'Speaker name required',
        'Enter a name for every speaker or remove the empty speaker.',
      );
    const selectedBuilding = buildings.find(item => item.id === buildingId);
    const values = {
      title: title.trim(),
      description: description.trim(),
      date,
      startTime,
      endTime,
      location: isExternal
        ? venueAddress.trim()
        : selectedBuilding?.name || '',
      buildingId: buildingId || user?.buildingId || '',
      buildingName: selectedBuilding?.name,
      isExternal,
      venueAddress: isExternal ? venueAddress.trim() : undefined,
      googleMapLink: isExternal ? googleMapLink.trim() : undefined,
      rsvpClosingDate,
      rsvpClosingTime,
      capacity: Number(capacity) || 0,
      categoryId,
      category: categories.find(item => item.value === categoryId)?.label,
      subcategoryId,
      subcategory: subcategories.find(item => item.value === subcategoryId)
        ?.label,
      speakers: eventSpeakers.map(speaker => ({
        name: speaker.name.trim(),
        role: speaker.role.trim() || undefined,
        link: speaker.link.trim() || undefined,
        image: speaker.image,
      })),
      speaker: eventSpeakers[0]?.name.trim() || undefined,
      speakerImageFiles: eventSpeakers
        .map(speaker => speaker.imageFile)
        .filter((file): file is FileAttachment => Boolean(file)),
      coverImage: coverImage.trim(),
      additionalImage: additionalImage.trim(),
      coverImageFile: coverImageFile || undefined,
      additionalImageFile: additionalImageFile || undefined,
    };
    setSaving(true);
    try {
      if (editingId) await updateEvent(editingId, values);
      else await createEvent(values);
      setOpen(false);
      setEditingId(null);
      setTitle('');
      setDescription('');
      setCategoryId('');
      setSubcategoryId('');
      setEventSpeakers([]);
      setCoverImage('');
      setAdditionalImage('');
      setCoverImageFile(null);
      setAdditionalImageFile(null);
      setDate('');
    } catch (error) {
      Alert.alert(
        editingId ? 'Event not updated' : 'Event not created',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };
  const changeEventStatus = async (
    event: EventRecord,
    status: EventRecord['status'],
  ) => {
    try {
      await updateEvent(event.id, { status });
    } catch (error) {
      alertActionError('Event not updated', error);
    }
  };
  const confirmCancel = (event: EventRecord) =>
    Alert.alert('Cancel event?', event.title, [
      { text: 'Keep event', style: 'cancel' },
      {
        text: 'Cancel event',
        style: 'destructive',
        onPress: () => changeEventStatus(event, 'Cancelled'),
      },
    ]);
  const confirmDelete = (event: EventRecord) =>
    Alert.alert('Delete event?', event.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(event.id);
          } catch (error) {
            alertActionError('Event not deleted', error);
          }
        },
      },
    ]);
  const openRsvps = async (event: EventRecord) => {
    try {
      const attendees = await loadEventRsvps(event.id);
      setSelectedEvent({ ...event, attendees, rsvpCount: attendees.length });
    } catch (error) {
      Alert.alert(
        'Could not load RSVPs',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };
  return (
    <View style={styles.root}>
      <Header
        title="Events"
        subtitle={`${events.length} events`}
        action={{ label: 'Add', onPress: () => openEditor() }}
      />
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Empty icon="calendar-blank-outline" text="No events yet" />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Pill
                label={item.status}
                color={
                  item.status === 'Published'
                    ? Colors.success
                    : Colors.accent300
                }
              />
              <Text style={styles.meta}>{formatRecordValue('date', item.date)}</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
            {item.category ? (
              <Text style={styles.meta}>
                {[item.category, item.subcategory, item.speaker]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {[formatTimeRange(item.startTime, item.endTime), item.location]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={styles.meta}>
              {item.rsvpCount}/{item.capacity || '∞'} RSVPs
            </Text>
            <View style={styles.actions}>
              {item.status === 'Draft' && (
                <TouchableOpacity
                  onPress={() => changeEventStatus(item, 'Published')}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Publish</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => openRsvps(item)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>RSVPs</Text>
              </TouchableOpacity>
              {item.status === 'Published' && (
                <TouchableOpacity
                  accessibilityLabel="Cancel event"
                  onPress={() => confirmCancel(item)}
                  style={styles.iconButton}
                >
                  <Icon name="cancel" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                accessibilityLabel="Edit event"
                onPress={() => openEditor(item)}
                style={styles.iconButton}
              >
                <Icon
                  name="pencil-outline"
                  size={18}
                  color={Colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Delete event"
                onPress={() => confirmDelete(item)}
                style={styles.iconButton}
              >
                <Icon name="delete-outline" size={18} color={Colors.alert} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <FormSheet
        visible={open}
        title={editingId ? 'Edit Event' : 'Create Event'}
        onClose={() => setOpen(false)}
        onSave={save}
        saving={saving}
      >
        <Field label="Event name" value={title} onChangeText={setTitle} />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <DropdownField
          label="Category"
          value={categoryId}
          options={categories}
          onChange={value => {
            setCategoryId(value);
            setSubcategoryId('');
          }}
          placeholder="Select a category"
          searchable
        />
        <DropdownField
          label="Subcategory"
          value={subcategoryId}
          options={subcategories}
          onChange={setSubcategoryId}
          placeholder={
            categoryId ? 'Select a subcategory' : 'Select a category first'
          }
          disabled={!categoryId}
          searchable
        />
        <Text style={styles.fieldLabel}>Speakers</Text>
        {eventSpeakers.map((speaker, index) => (
          <View key={speaker.key} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Speaker {index + 1}</Text>
              <TouchableOpacity
                accessibilityLabel={`Remove speaker ${index + 1}`}
                onPress={() =>
                  setEventSpeakers(current =>
                    current.filter(item => item.key !== speaker.key),
                  )
                }
              >
                <Icon name="close" size={20} color={Colors.alert} />
              </TouchableOpacity>
            </View>
            <Field
              label="Speaker name"
              value={speaker.name}
              onChangeText={value =>
                setEventSpeakers(current =>
                  current.map(item =>
                    item.key === speaker.key ? { ...item, name: value } : item,
                  ),
                )
              }
            />
            <Field
              label="Role"
              value={speaker.role}
              onChangeText={value =>
                setEventSpeakers(current =>
                  current.map(item =>
                    item.key === speaker.key ? { ...item, role: value } : item,
                  ),
                )
              }
            />
            <Field
              label="Speaker image link"
              value={speaker.image || ''}
              onChangeText={value =>
                setEventSpeakers(current =>
                  current.map(item =>
                    item.key === speaker.key ? { ...item, image: value } : item,
                  ),
                )
              }
              placeholder="Optional image URL"
            />
            <ImagePickerField
              label="Speaker image"
              file={speaker.imageFile}
              existingUri={speaker.image}
              onChange={file =>
                setEventSpeakers(current =>
                  current.map(item =>
                    item.key === speaker.key
                      ? { ...item, imageFile: file }
                      : item,
                  ),
                )
              }
              onClear={() =>
                setEventSpeakers(current =>
                  current.map(item =>
                    item.key === speaker.key
                      ? { ...item, image: undefined, imageFile: null }
                      : item,
                  ),
                )
              }
            />
          </View>
        ))}
        <TouchableOpacity
          onPress={() =>
            setEventSpeakers(current => [
              ...current,
              {
                key: `${Date.now()}-${current.length}`,
                name: '',
                role: '',
                link: '',
                imageFile: null,
              },
            ])
          }
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {eventSpeakers.length ? 'Add another speaker' : 'Add Speaker'}
          </Text>
        </TouchableOpacity>
        {eventSpeakers.length > 0 ? (
          <Text style={styles.help}>
            {eventSpeakers.filter(speaker => speaker.name.trim()).length} of{' '}
            {eventSpeakers.length} speaker{eventSpeakers.length === 1 ? '' : 's'}{' '}
            ready to save
          </Text>
        ) : null}
        <ImagePickerField
          label="Cover Image"
          file={coverImageFile}
          existingUri={coverImage}
          onChange={setCoverImageFile}
          onClear={() => {
            setCoverImage('');
            setCoverImageFile(null);
          }}
        />
        <DropdownField
          label="RSVP closing date"
          required
          value={rsvpClosingDate}
          options={EVENT_DATE_OPTIONS}
          onChange={setRsvpClosingDate}
          placeholder="Select closing date"
        />
        <DropdownField
          label="RSVP closing time"
          required
          value={rsvpClosingTime}
          options={EVENT_TIME_OPTIONS.filter(option => !isPastDateTime(rsvpClosingDate, option.value))}
          onChange={setRsvpClosingTime}
          placeholder="Select closing time"
        />
        <ImagePickerField
          label="Additional Image"
          file={additionalImageFile}
          existingUri={additionalImage}
          onChange={setAdditionalImageFile}
          onClear={() => {
            setAdditionalImage('');
            setAdditionalImageFile(null);
          }}
        />
        <DropdownField
          label="Date"
          required
          value={date}
          options={EVENT_DATE_OPTIONS}
          onChange={setDate}
          placeholder="Select a date"
        />
        <View style={styles.twoColumns}>
          <View style={styles.flex}>
            <DropdownField
              label="Start"
              required
              value={startTime}
              options={EVENT_TIME_OPTIONS.filter(option => !isPastDateTime(date, option.value))}
              onChange={setStartTime}
              placeholder="Select time"
            />
          </View>
          <View style={styles.flex}>
            <DropdownField
              label="End"
              value={endTime}
              options={EVENT_TIME_OPTIONS.filter(option => !isPastDateTime(date, option.value))}
              onChange={setEndTime}
              placeholder="Select time"
            />
          </View>
        </View>
        {!isExternal ? (
          <DropdownField
            label="Building"
            required
            value={buildingId}
            options={buildings.map(building => ({
              value: building.id,
              label: building.name,
            }))}
            onChange={setBuildingId}
            placeholder="Select a building"
            searchable
          />
        ) : null}
        <Text style={styles.fieldLabel}>Event location</Text>
        <View style={styles.chips}>
          {[
            { label: 'At selected building', value: false },
            { label: 'External venue', value: true },
          ].map(option => (
            <TouchableOpacity
              key={option.label}
              onPress={() => setIsExternal(option.value)}
            >
              <Pill
                label={option.label}
                color={
                  isExternal === option.value
                    ? Colors.accent300
                    : Colors.textMuted
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        {isExternal ? (
          <>
            <Field
              label="Venue address"
              value={venueAddress}
              onChangeText={setVenueAddress}
              multiline
            />
            <Field
              label="Google Maps link"
              value={googleMapLink}
              onChangeText={setGoogleMapLink}
              placeholder="Optional maps URL"
            />
          </>
        ) : null}
        <Field
          label="Capacity"
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="number-pad"
        />
      </FormSheet>
      <FormSheet
        visible={Boolean(selectedEvent)}
        title={`${selectedEvent?.title || 'Event'} RSVPs`}
        onClose={() => setSelectedEvent(null)}
        onSave={() => setSelectedEvent(null)}
        saveLabel="Done"
      >
        {selectedEvent?.attendees?.length ? (
          selectedEvent.attendees.map(attendee => (
            <View key={attendee.id} style={styles.attendee}>
              <View style={styles.memberCircle}>
                <Text style={styles.memberCircleText}>
                  {attendee.name
                    .split(' ')
                    .map(part => part[0])
                    .join('')
                    .slice(0, 2)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{attendee.name}</Text>
                <Text style={styles.meta}>
                  {[attendee.role, attendee.company]
                    .filter(Boolean)
                    .join(' · ') || 'Guest'}
                </Text>
                <Text style={styles.meta}>
                  {[attendee.email, attendee.phone].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Empty icon="account-group-outline" text="No RSVPs yet" />
        )}
      </FormSheet>
    </View>
  );
}

export function CommunityScreen() {
  const { posts, createPost, togglePostLike, user } = useApp();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<CommunityPost['type']>('Update');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!message.trim()) return Alert.alert('Message required', 'Enter the announcement or update you want to publish.');
    if (!user?.name || saving) return;
    setSaving(true);
    try {
      await createPost({ author: user.name, type, message: message.trim() });
      setMessage('');
      setOpen(false);
    } catch (error) {
      alertActionError('Post not published', error);
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.root}>
      <Header
        title="Community"
        subtitle="Member wall"
        action={{ label: 'Post', onPress: () => setOpen(true) }}
      />
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Empty icon="post-outline" text="No community posts" />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.cardTitle}>{item.author}</Text>
                <Text style={styles.meta}>
                  {new Date(item.createdAt).toLocaleString('en-IN')}
                </Text>
              </View>
              <Pill
                label={item.type}
                color={
                  item.type === 'Announcement' ? Colors.accent300 : '#30BCED'
                }
              />
            </View>
            <Text style={styles.postText}>{item.message}</Text>
            <TouchableOpacity
              onPress={() => togglePostLike(item.id)}
              style={styles.likeButton}
            >
              <Icon
                name={item.liked ? 'heart' : 'heart-outline'}
                size={18}
                color={item.liked ? '#F472B6' : Colors.textSecondary}
              />
              <Text style={styles.meta}>{item.likes}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <FormSheet
        visible={open}
        title="Create Community Post"
        onClose={() => setOpen(false)}
        onSave={save}
        saving={saving}
        saveLabel="Publish"
      >
        <View style={styles.chips}>
          {(['Announcement', 'Update', 'Offer'] as const).map(value => (
            <TouchableOpacity key={value} onPress={() => setType(value)}>
              <Pill
                label={value}
                color={type === value ? Colors.accent300 : Colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Field
          label="Message"
          value={message}
          onChangeText={setMessage}
          multiline
        />
      </FormSheet>
    </View>
  );
}

export function LeadsScreen() {
  const navigation = useNavigation<Nav>();
  const { leads, createLead } = useApp();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [kycDocument, setKycDocument] = useState<FileAttachment | null>(null);
  const save = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !/^\S+@\S+\.\S+$/.test(email.trim()) ||
      !/^\d{10}$/.test(phone) ||
      !address.trim() ||
      !/^\d{6}$/.test(pincode)
    )
      return Alert.alert(
        'Missing details',
        'Name, valid email, 10-digit phone number, address, and 6-digit pincode are required.',
      );
    try {
      await createLead({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        phone,
        company,
        purpose: '',
        address: address.trim(),
        pincode,
        kycDocument: kycDocument || undefined,
      });
      setOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setAddress('');
      setPincode('');
      setKycDocument(null);
    } catch (error) {
      alertActionError('Lead not created', error);
    }
  };
  return (
    <View style={styles.root}>
      <Header
        title="Leads"
        subtitle={`${leads.length} enquiries`}
        action={{ label: 'Add', onPress: () => setOpen(true) }}
      />
      <FlatList
        data={leads}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Empty icon="account-search-outline" text="No leads" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('LeadDetailScreen', { leadId: item.id })
            }
            style={styles.card}
          >
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.meta}>{item.company || item.email}</Text>
              </View>
              <Pill
                label={formatRecordValue('status', item.kycStatus || item.status)}
                color={
                  item.status === 'Converted'
                    ? Colors.success
                    : Colors.accent300
                }
              />
            </View>
            {item.address ? (
              <Text style={styles.body}>
                {[item.address, item.pincode].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            <Text style={styles.meta}>{item.phone}</Text>
          </TouchableOpacity>
        )}
      />
      <FormSheet
        visible={open}
        title="Add Lead"
        onClose={() => setOpen(false)}
        onSave={save}
      >
        <Field
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label="Phone"
          value={phone}
          onChangeText={value =>
            setPhone(value.replace(/\D/g, '').slice(0, 10))
          }
          keyboardType="phone-pad"
        />
        <Field label="Company" value={company} onChangeText={setCompany} />
        <Field
          label="Address"
          value={address}
          onChangeText={setAddress}
          multiline
        />
        <Field
          label="Pincode"
          value={pincode}
          onChangeText={value =>
            setPincode(value.replace(/\D/g, '').slice(0, 6))
          }
          keyboardType="number-pad"
        />
        <AttachmentPicker
          file={kycDocument}
          accept="JPG, JPEG, PNG or PDF · maximum 10 MB"
          onPress={async () => {
            try {
              const [file] = await pick({
                type: [types.images, types.pdf],
                allowMultiSelection: false,
              });
              if (!file) return;
              const attachment = asAttachment(file);
              if (attachment.size && attachment.size > 10 * 1024 * 1024)
                return Alert.alert(
                  'File too large',
                  'Choose a document smaller than 10 MB.',
                );
              setKycDocument(attachment);
            } catch (error) {
              if (!isPickerCancelled(error))
                alertActionError('KYC document unavailable', error);
            }
          }}
        />
      </FormSheet>
    </View>
  );
}

export function RfidCardsScreen() {
  const {
    rfidCards,
    companies,
    importRfidCards,
    updateRfidCard,
    assignRfidCard,
    syncAll,
    user,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [rfidFile, setRfidFile] = useState<FileAttachment | null>(null);
  const [importing, setImporting] = useState(false);
  const [clientImport, setClientImport] = useState(false);
  const [rfidImportMode, setRfidImportMode] = useState<'insert' | 'upsert'>(
    'insert',
  );
  const [assigning, setAssigning] = useState<RfidCard | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const importCards = async () => {
    if (!rfidFile)
      return Alert.alert(
        'File required',
        'Choose the RFID card import file supplied for this workspace.',
      );
    try {
      setImporting(true);
      let count = 0;
      if (clientImport) {
        const upload = (dryRun: boolean) => {
          const form = new FormData();
          appendMultipartFileLocal(form, 'file', rfidFile);
          return apiClient.post<Record<string, unknown>>(
            Routes.rfidClientImport,
            form,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
              params: { dryRun },
            },
          );
        };
        const preview = await upload(true);
        const previewRoot =
          preview.data && typeof preview.data === 'object'
            ? (preview.data as Record<string, unknown>)
            : preview;
        if (Array.isArray(previewRoot.errors) && previewRoot.errors.length)
          throw new Error(previewRoot.errors.map(String).join(', '));
        const result = await upload(false);
        const root =
          result.data && typeof result.data === 'object'
            ? (result.data as Record<string, unknown>)
            : result;
        count = Number(root.assignedCount || root.count || 0);
        await syncAll();
      } else count = await importRfidCards(rfidFile, rfidImportMode);
      setRfidFile(null);
      setOpen(false);
      Alert.alert(
        'Import complete',
        count > 0
          ? `${count} RFID cards were imported.`
          : 'The import was accepted and the card list was refreshed.',
      );
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof Error
          ? error.message
          : 'The RFID cards could not be imported.',
      );
    } finally {
      setImporting(false);
    }
  };
  const changeBillingType = async (
    card: RfidCard,
    billingType: 'FREE' | 'PAID',
  ) => {
    try {
      await apiClient.patch(`${Routes.rfidCard(card.id)}/billing-type`, {
        billingType,
      });
      await syncAll();
    } catch (error) {
      alertActionError('Billing type not updated', error);
    }
  };
  const unassign = async (card: RfidCard) => {
    try {
      await apiClient.post(`${Routes.rfidCard(card.id)}/unassign-client`);
      await syncAll();
    } catch (error) {
      alertActionError('Card not unassigned', error);
    }
  };
  const chooseImportFile = async () => {
    try {
      const [file] = await pick({
        // iOS can save CSV downloads with a generic public.data UTI even
        // though the filename still ends in .csv. Filtering the document
        // picker by MIME/UTI therefore greys out the app's own sample file.
        // Keep the picker broad and enforce the supported extensions below.
        type: types.allFiles,
        allowMultiSelection: false,
      });
      const attachment = asAttachment(file);
      if (!/\.(csv|xlsx?|txt)$/i.test(attachment.name))
        return Alert.alert(
          'Unsupported file',
          'Choose a CSV, XLS, XLSX or TXT file.',
        );
      if (attachment.size && attachment.size > 10 * 1024 * 1024)
        return Alert.alert(
          'File too large',
          'Choose a file smaller than 10 MB.',
        );
      setRfidFile(attachment);
    } catch (error) {
      if (!isPickerCancelled(error))
        Alert.alert(
          'Could not open file',
          error instanceof Error ? error.message : 'Please try again.',
        );
    }
  };
  const openAssignment = (card: RfidCard) => {
    setAssigning(card);
    setCompanyId(companies[0]?.id || '');
  };
  const saveAssignment = async () => {
    if (!assigning || !companyId)
      return Alert.alert(
        'Missing assignment',
        'Choose the client that should own this card.',
      );
    const company = companies.find(item => item.id === companyId);
    if (!company) return;
    try {
      await assignRfidCard(assigning.id, company.id, company.name);
      setAssigning(null);
    } catch (error) {
      alertActionError('Card not assigned', error);
    }
  };
  const changeCardStatus = async (
    card: RfidCard,
    status: RfidCard['status'],
  ) => {
    try {
      await updateRfidCard(card.id, { status });
    } catch (error) {
      alertActionError('Card not updated', error);
    }
  };
  const statusColor = (item: RfidCard) =>
    item.status.toLowerCase() === 'active'
      ? Colors.success
      : item.status.toLowerCase() === 'lost'
      ? Colors.alert
      : Colors.textSecondary;
  return (
    <View style={styles.root}>
      <Header
        title="RFID Cards"
        subtitle={`${rfidCards.length} cards`}
        action={{ label: 'Import', onPress: () => setOpen(true) }}
      />
      <FlatList
        data={rfidCards}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.actions}>
            <TouchableOpacity
              disabled={exporting}
              onPress={async () => {
                try {
                  setExporting(true);
                  await downloadAuthenticatedFile(
                  `${Routes.rfidExport}?buildingId=${encodeURIComponent(
                    user?.buildingId || '',
                  )}`,
                  'rfid-cards.xlsx',
                  );
                } catch (error) {
                  alertActionError('Export failed', error);
                } finally {
                  setExporting(false);
                }
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {exporting ? 'Preparing export…' : 'Export Cards'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.cardTitle}>
                  {item.uid || 'Access card'}
                </Text>
              </View>
              <Pill label={formatRecordValue('status', item.status)} color={statusColor(item)} />
            </View>
            <Text style={styles.body}>
              {item.company ? `Assigned to ${item.company}` : 'Unassigned'}
              {item.assignedTo ? ` · ${item.assignedTo}` : ''}
            </Text>
            <Text style={styles.meta}>
              Billing: {item.billingType || 'Not set'}
              {item.accessAreas.length
                ? ` · ${item.accessAreas.join(', ')}`
                : ''}
            </Text>
            <View style={styles.actions}>
              {item.status.toLowerCase() === 'active' && item.companyId ? (
                <TouchableOpacity
                  onPress={() => unassign(item)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Unassign</Text>
                </TouchableOpacity>
              ) : item.status.toLowerCase() === 'active' ? (
                <TouchableOpacity
                  onPress={() => openAssignment(item)}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Assign Client</Text>
                </TouchableOpacity>
              ) : null}
              {item.status.toLowerCase() === 'active' ? <TouchableOpacity
                onPress={() =>
                  changeBillingType(
                    item,
                    item.billingType === 'PAID' ? 'FREE' : 'PAID',
                  )
                }
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Set {item.billingType === 'PAID' ? 'Free' : 'Paid'}
                </Text>
              </TouchableOpacity> : null}
              {item.status.toLowerCase() === 'active' && (
                <TouchableOpacity
                  onPress={() => changeCardStatus(item, 'Inactive')}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Deactivate</Text>
                </TouchableOpacity>
              )}
              {item.status.toLowerCase() === 'active' && <TouchableOpacity
                onPress={() => changeCardStatus(item, 'Lost')}
                style={styles.secondaryButton}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: Colors.alert }]}
                >
                  Mark lost
                </Text>
              </TouchableOpacity>}
            </View>
          </View>
        )}
      />
      <FormSheet
        visible={open}
        title="Import RFID Cards"
        onClose={() => setOpen(false)}
        onSave={importCards}
        saving={importing}
        saveLabel="Validate & Import"
      >
        <Text style={styles.fieldLabel}>Import workflow</Text>
        <View style={styles.chips}>
          {[
            { label: 'Import cards', value: false },
            { label: 'Assign clients', value: true },
          ].map(option => (
            <TouchableOpacity
              key={option.label}
              onPress={() => {
                setClientImport(option.value);
                setRfidFile(null);
              }}
            >
              <Pill
                label={option.label}
                color={
                  clientImport === option.value
                    ? Colors.accent300
                    : Colors.textMuted
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        {!clientImport ? (
          <>
            <Text style={styles.fieldLabel}>Import mode</Text>
            <View style={styles.chips}>
              {(
                [
                  { label: 'Insert new only', value: 'insert' },
                  { label: 'Insert or update', value: 'upsert' },
                ] as const
              ).map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setRfidImportMode(option.value)}
                >
                  <Pill
                    label={option.label}
                    color={
                      rfidImportMode === option.value
                        ? Colors.accent300
                        : Colors.textMuted
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
        <Text style={styles.help}>
          {clientImport
            ? 'Assignments are validated with a dry run before they are committed.'
            : rfidImportMode === 'insert'
            ? 'Insert mode rejects duplicate card UIDs. The file is dry-run validated before commit.'
            : 'Upsert mode creates new cards and updates matching card UIDs after a dry-run validation.'}
        </Text>
        <TouchableOpacity
          disabled={downloadingSample}
          onPress={async () => {
            try {
              setDownloadingSample(true);
              await downloadAuthenticatedFile(
              clientImport
                ? Routes.rfidClientImportSample
                : Routes.rfidImportSample,
              clientImport
                ? 'rfid-client-assignment-sample.csv'
                : 'rfid-import-sample.csv',
              );
            } catch (error) {
              alertActionError('Sample download failed', error);
            } finally {
              setDownloadingSample(false);
            }
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {downloadingSample ? 'Preparing sample…' : 'Download Sample'}
          </Text>
        </TouchableOpacity>
        <AttachmentPicker
          file={rfidFile}
          onPress={chooseImportFile}
          accept="CSV, Excel or text · maximum 10 MB"
        />
      </FormSheet>
      <FormSheet
        visible={Boolean(assigning)}
        title={`Assign ${assigning?.uid || 'card'}`}
        onClose={() => setAssigning(null)}
        onSave={saveAssignment}
      >
        <Text style={styles.help}>
          Assigning a card links it to a client. Member credentials and access
          areas are provisioned through their dedicated access workflows.
        </Text>
        <Text style={styles.fieldLabel}>Client</Text>
        <View style={styles.chips}>
          {companies.map(company => (
            <TouchableOpacity
              key={company.id}
              onPress={() => setCompanyId(company.id)}
            >
              <Pill
                label={company.name}
                color={
                  companyId === company.id ? Colors.accent300 : Colors.textMuted
                }
              />
            </TouchableOpacity>
          ))}
        </View>
      </FormSheet>
    </View>
  );
}

export function PrinterRequestsScreen() {
  const {
    printerRequests,
    updatePrinterRequest,
    createPrinterRequest,
    companies,
    members,
    user,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [document, setDocument] = useState<FileAttachment | null>(null);
  const [clientId, setClientId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [copies, setCopies] = useState('1');
  const [printType, setPrintType] = useState<'bw' | 'color'>('bw');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4');
  const [sides, setSides] = useState<'single' | 'duplex'>('duplex');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [chargingRequest, setChargingRequest] = useState<PrinterRequest | null>(
    null,
  );
  const [chargeCredits, setChargeCredits] = useState('');
  const [charging, setCharging] = useState(false);
  const selectedCompany = companies.find(item => item.id === clientId);
  const availableMembers = members.filter(
    member => !clientId || member.companyId === clientId,
  );

  const resetForm = () => {
    setDocument(null);
    setClientId('');
    setMemberId('');
    setCopies('1');
    setPrintType('bw');
    setPaperSize('A4');
    setSides('duplex');
    setComments('');
  };
  const closeForm = () => {
    if (!saving) {
      setOpen(false);
      resetForm();
    }
  };
  const chooseDocument = async () => {
    try {
      const [file] = await pick({
        type: types.allFiles,
        allowMultiSelection: false,
      });
      const attachment = asAttachment(file);
      if (!/\.(pdf|docx?|pptx?|jpe?g|png|webp)$/i.test(attachment.name))
        return Alert.alert(
          'Unsupported file',
          'Choose a PDF, Word, PowerPoint, JPG, PNG or WebP file.',
        );
      if (attachment.size && attachment.size > 10 * 1024 * 1024)
        return Alert.alert(
          'File too large',
          'Choose a document no larger than 10 MB.',
        );
      setDocument(await pickedAttachment(file));
    } catch (error) {
      if (!isPickerCancelled(error))
        Alert.alert(
          'Could not open file',
          error instanceof Error ? error.message : 'Please try again.',
        );
    }
  };
  const submitRequest = async () => {
    const copyCount = Number(copies);
    if (!document)
      return Alert.alert(
        'Document required',
        'Choose the document that should be printed.',
      );
    if (!clientId)
      return Alert.alert(
        'Client required',
        'Choose the client that owns this printer request.',
      );
    if (!user?.buildingId)
      return Alert.alert(
        'Building required',
        'Select a building before creating the printer request.',
      );
    if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > 99)
      return Alert.alert(
        'Invalid copies',
        'Enter a whole number from 1 to 99.',
      );
    try {
      setSaving(true);
      await createPrinterRequest({
        attachment: document,
        clientId,
        memberId: memberId || undefined,
        buildingId: user.buildingId,
        fileName: document.name,
        copies: copyCount,
        printType,
        paperSize,
        sides,
        comments,
        requestedBy: user.name,
        company: selectedCompany?.name,
      });
      setOpen(false);
      resetForm();
      Alert.alert(
        'Request created',
        'The document was uploaded and the printer request is pending review.',
      );
    } catch (error) {
      alertActionError('Printer request not created', error);
    } finally {
      setSaving(false);
    }
  };
  const color = (item: PrinterRequest) =>
    item.status === 'Completed'
      ? Colors.success
      : item.status === 'Ready'
      ? '#30BCED'
      : Colors.accent300;
  const updateStatus = async (
    item: PrinterRequest,
    status: PrinterRequest['status'],
  ) => {
    try {
      await updatePrinterRequest(item.id, { status, credits: item.credits });
    } catch (error) {
      alertActionError('Print request not updated', error);
    }
  };
  const openChargeForm = (item: PrinterRequest) => {
    setChargingRequest(item);
    setChargeCredits(item.credits > 0 ? String(item.credits) : '');
  };
  const closeChargeForm = () => {
    if (charging) return;
    setChargingRequest(null);
    setChargeCredits('');
  };
  const completeAndCharge = async () => {
    if (!chargingRequest) return;
    const credits = Number(chargeCredits);
    if (!Number.isInteger(credits) || credits <= 0)
      return Alert.alert(
        'Invalid credit charge',
        'Enter a positive whole number of credits to deduct.',
      );
    try {
      setCharging(true);
      await updatePrinterRequest(chargingRequest.id, {
        status: 'Completed',
        credits,
      });
      setChargingRequest(null);
      setChargeCredits('');
    } catch (error) {
      alertActionError('Print request not updated', error);
    } finally {
      setCharging(false);
    }
  };
  return (
    <View style={styles.root}>
      <Header
        title="Printer Requests"
        subtitle={`${printerRequests.length} requests`}
        action={{ label: 'Add', onPress: () => setOpen(true) }}
      />
      <FlatList
        data={printerRequests}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Empty icon="printer-outline" text="No printer requests" />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{item.fileName}</Text>
                <Text style={styles.meta}>
                  {[item.requestedBy, item.company]
                    .filter(Boolean)
                    .join(' · ') || 'Requester unavailable'}
                </Text>
              </View>
              <Pill label={item.status} color={color(item)} />
            </View>
            <Text style={styles.body}>
              {item.copies} copies · {item.color ? 'Colour' : 'B&W'} ·{' '}
              {item.paperSize || 'A4'} ·{' '}
              {item.sides === 'single' ? 'Single-sided' : 'Duplex'} ·{' '}
              {item.credits} credits
            </Text>
            {item.comments ? (
              <Text style={styles.meta}>{item.comments}</Text>
            ) : null}
            <View style={styles.actions}>
              {item.documentUrl ? (
                <>
                  <TouchableOpacity
                    onPress={() =>
                      downloadAuthenticatedFile(
                        item.documentUrl!,
                        item.fileName || 'printer-document',
                        'view',
                      ).catch(error =>
                        alertActionError('Document could not be opened', error),
                      )
                    }
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>View Document</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      downloadAuthenticatedFile(
                        item.documentUrl!,
                        item.fileName || 'printer-document',
                      ).catch(error =>
                        alertActionError('Document download failed', error),
                      )
                    }
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Download Document
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {item.status === 'Pending' && (
                <TouchableOpacity
                  onPress={() => updateStatus(item, 'Ready')}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Mark ready</Text>
                </TouchableOpacity>
              )}
              {item.status === 'Ready' && (
                <TouchableOpacity
                  onPress={() => openChargeForm(item)}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Complete & charge</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
      <FormSheet
        visible={open}
        title="New Printer Request"
        onClose={closeForm}
        onSave={submitRequest}
        saving={saving}
        saveLabel="Upload & Create"
      >
        <AttachmentPicker
          file={document}
          onPress={chooseDocument}
          accept="PDF, Word, PowerPoint, JPG, PNG or WebP · maximum 10 MB"
        />
        <DropdownField
          label="Client"
          required
          value={clientId}
          options={companies
            .filter(item => item.id && item.name)
            .map(item => ({ value: item.id, label: item.name }))}
          onChange={value => {
            setClientId(value);
            setMemberId('');
          }}
          placeholder={
            companies.length
              ? 'Select a client'
              : 'No clients available for this building'
          }
          searchable
        />
        <DropdownField
          label="Member"
          value={memberId}
          options={availableMembers.map(item => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={setMemberId}
          placeholder="Optional member"
          searchable
          disabled={!clientId || availableMembers.length === 0}
        />
        <Field
          label="Copies"
          value={copies}
          onChangeText={value =>
            setCopies(value.replace(/\D/g, '').slice(0, 2))
          }
          keyboardType="number-pad"
        />
        <Text style={styles.fieldLabel}>Print type</Text>
        <View style={styles.chips}>
          {(
            [
              { label: 'Black & white', value: 'bw' },
              { label: 'Colour', value: 'color' },
            ] as const
          ).map(option => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setPrintType(option.value)}
            >
              <Pill
                label={option.label}
                color={
                  printType === option.value
                    ? Colors.accent300
                    : Colors.textMuted
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Paper size</Text>
        <View style={styles.chips}>
          {(['A4', 'A3', 'Letter'] as const).map(value => (
            <TouchableOpacity key={value} onPress={() => setPaperSize(value)}>
              <Pill
                label={value}
                color={
                  paperSize === value ? Colors.accent300 : Colors.textMuted
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Sides</Text>
        <View style={styles.chips}>
          {(
            [
              { label: 'Duplex', value: 'duplex' },
              { label: 'Single-sided', value: 'single' },
            ] as const
          ).map(option => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setSides(option.value)}
            >
              <Pill
                label={option.label}
                color={
                  sides === option.value ? Colors.accent300 : Colors.textMuted
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        <Field
          label="Printing instructions"
          value={comments}
          onChangeText={setComments}
          placeholder="Optional notes"
          multiline
        />
      </FormSheet>
      <FormSheet
        visible={Boolean(chargingRequest)}
        title="Complete Printer Request"
        onClose={closeChargeForm}
        onSave={completeAndCharge}
        saving={charging}
        saveLabel="Complete & Deduct"
      >
        <Text style={styles.cardTitle}>{chargingRequest?.fileName}</Text>
        <Text style={styles.help}>
          Enter the confirmed credit charge for this print job. This amount will
          be deducted from the client account.
        </Text>
        <Field
          label="Credits to deduct"
          value={chargeCredits}
          onChangeText={value =>
            setChargeCredits(value.replace(/\D/g, '').slice(0, 6))
          }
          keyboardType="number-pad"
          placeholder="e.g. 4"
        />
      </FormSheet>
    </View>
  );
}

type MeetingDiscountRequest = {
  id: string;
  roomName: string;
  memberName: string;
  percent: number;
  reason: string;
  start: string;
};

const discountRequestList = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  for (const value of [root.data, root.discountRequests, root.requests]) {
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;
      const list = nested.discountRequests || nested.requests || nested.items;
      if (Array.isArray(list)) return list as Record<string, unknown>[];
    }
  }
  return [];
};

export function BillingScreen() {
  const { companies } = useApp();
  const total = companies.reduce(
    (sum, item) => sum + Math.max(0, item.outstandingAmount),
    0,
  );
  const [discountRequests, setDiscountRequests] = useState<
    MeetingDiscountRequest[]
  >([]);
  const [selectedRequest, setSelectedRequest] =
    useState<MeetingDiscountRequest | null>(null);
  const [approvedPercent, setApprovedPercent] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDiscountRequests = async () => {
    try {
      const response = await apiClient.get<unknown>(
        Routes.meetingDiscountRequests,
      );
      setDiscountRequests(
        discountRequestList(response)
          .map(raw => {
            const discount =
              raw.discount && typeof raw.discount === 'object'
                ? (raw.discount as Record<string, unknown>)
                : {};
            const room =
              raw.room && typeof raw.room === 'object'
                ? (raw.room as Record<string, unknown>)
                : {};
            const member =
              raw.member && typeof raw.member === 'object'
                ? (raw.member as Record<string, unknown>)
                : {};
            return {
              id: String(raw._id || raw.id || ''),
              roomName: String(room.name || raw.roomName || 'Meeting room'),
              memberName: String(member.name || raw.memberName || 'Member'),
              percent: Number(discount.percent ?? raw.discountPercent ?? 0),
              reason: String(discount.reason || raw.discountReason || ''),
              start: String(raw.start || raw.startTime || ''),
            };
          })
          .filter(item => item.id),
      );
    } catch (error) {
      Alert.alert(
        'Could not load discount requests',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  useEffect(() => {
    loadDiscountRequests();
  }, []);

  const openApproval = (request: MeetingDiscountRequest) => {
    setSelectedRequest(request);
    setApprovedPercent(String(request.percent));
    setApprovalNotes('');
  };

  const approve = async () => {
    if (!selectedRequest) return;
    const percent = Number(approvedPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100)
      return Alert.alert(
        'Invalid percentage',
        'Enter an approved discount between 0 and 100%.',
      );
    setSaving(true);
    try {
      await apiClient.post(Routes.approveMeetingDiscount(selectedRequest.id), {
        approvedPercent: percent,
        approvalNotes: approvalNotes.trim(),
      });
      setDiscountRequests(current =>
        current.filter(item => item.id !== selectedRequest.id),
      );
      setSelectedRequest(null);
      Alert.alert(
        'Discount approved',
        'The invoice has been recalculated and the booking can proceed to payment.',
      );
    } catch (error) {
      Alert.alert(
        'Approval failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const reject = async (request: MeetingDiscountRequest) => {
    setSaving(true);
    try {
      await apiClient.post(Routes.rejectMeetingDiscount(request.id), {
        approvalNotes: 'Discount not approved',
      });
      setDiscountRequests(current =>
        current.filter(item => item.id !== request.id),
      );
      setSelectedRequest(null);
      Alert.alert(
        'Discount rejected',
        'The invoice has been recalculated without the requested discount.',
      );
    } catch (error) {
      Alert.alert(
        'Rejection failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header
        title="Billing"
        subtitle="Client balances and discount approvals"
      />
      <FlatList
        data={companies}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.summaryInline}>
              <Text style={styles.meta}>TOTAL OUTSTANDING</Text>
              <Text style={styles.summaryValue}>
                ₹{total.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.body}>
                {companies.filter(item => item.outstandingAmount > 0).length}{' '}
                accounts require attention
              </Text>
            </View>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.cardTitle}>
                Meeting-room discount requests
              </Text>
              <TouchableOpacity onPress={loadDiscountRequests}>
                <Icon name="refresh" size={20} color={Colors.accent300} />
              </TouchableOpacity>
            </View>
            {discountRequests.length ? (
              discountRequests.map(request => (
                <View key={request.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View style={styles.cardIdentity}>
                      <Text style={styles.cardTitle}>{request.roomName}</Text>
                      <Text style={styles.meta}>
                        {request.memberName}
                        {request.start ? ` · ${request.start}` : ''}
                      </Text>
                    </View>
                    <Pill label={`${request.percent}%`} color="#A78BFA" />
                  </View>
                  {request.reason ? (
                    <Text style={styles.body}>{request.reason}</Text>
                  ) : null}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => openApproval(request)}
                      style={styles.smallButton}
                    >
                      <Text style={styles.smallButtonText}>
                        Review & Approve
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => reject(request)}
                      disabled={saving}
                      style={styles.secondaryButton}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: Colors.alert },
                        ]}
                      >
                        Reject
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyInline}>
                No pending discount requests.
              </Text>
            )}
            <Text style={styles.sectionListTitle}>Client balances</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.contactPerson} · {item.cabin}
                </Text>
              </View>
              <Pill
                label={item.outstandingAmount > 0 ? 'Outstanding' : 'Clear'}
                color={
                  item.outstandingAmount > 0 ? Colors.alert : Colors.success
                }
              />
            </View>
            <Text style={styles.amount}>
              ₹{item.outstandingAmount.toLocaleString('en-IN')}
            </Text>
          </View>
        )}
      />
      <FormSheet
        visible={Boolean(selectedRequest)}
        title="Approve discount"
        onClose={() => setSelectedRequest(null)}
        onSave={approve}
        saving={saving}
        saveLabel="Approve"
      >
        <Field
          label="Approved percent"
          value={approvedPercent}
          onChangeText={value =>
            setApprovedPercent(value.replace(/[^\d.]/g, ''))
          }
          keyboardType="number-pad"
        />
        <Field
          label="Approval notes"
          value={approvalNotes}
          onChangeText={setApprovalNotes}
          placeholder="Approved by manager"
        />
      </FormSheet>
    </View>
  );
}

export function CommonAreasScreen() {
  const navigation = useNavigation<Nav>();
  const { commonAreas } = useApp();
  return (
    <View style={styles.root}>
      <Header
        title="Common Areas"
        subtitle={`${commonAreas.length} shared spaces`}
      />
      <FlatList
        data={commonAreas}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('InventoryResourceDetailScreen', {
                kind: 'common-area',
                id: item.id,
              })
            }
            style={styles.card}
          >
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.code} · capacity {item.capacity}
                </Text>
              </View>
              <Pill
                label={item.status}
                color={
                  item.status === 'Available' ? Colors.success : Colors.alert
                }
              />
            </View>
            <Text style={styles.body}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export function CreateTicketScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateTicketScreen'>>();
  const { createTicket, updateTicket, tickets, user, companies } = useApp();
  const { categories, staff } = useTicketFormOptions();
  const existing = tickets.find(item => item.id === route.params?.ticketId);
  const [subject, setSubject] = useState(existing?.subject || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId || '');
  const [subCategory, setSubCategory] = useState(existing?.subCategory || '');
  const [assignedTo, setAssignedTo] = useState(existing?.assignedToId || '');
  const [clientId, setClientId] = useState(existing?.clientId || '');
  const [status, setStatus] = useState<Ticket['status']>(
    existing?.status || 'Open',
  );
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [priority, setPriority] = useState<
    'Low' | 'Medium' | 'High' | 'Urgent'
  >(existing?.priority || 'Medium');
  const [saving, setSaving] = useState(false);
  const subcategories = useMemo(
    () =>
      categories.find(item => item.value === categoryId)?.subcategories || [],
    [categories, categoryId],
  );
  useEffect(() => {
    if (!existing || categoryId || !categories.length) return;
    const matchingCategory = categories.find(
      item =>
        item.label.toLowerCase() === existing.category.trim().toLowerCase(),
    );
    if (matchingCategory) setCategoryId(matchingCategory.value);
  }, [categories, categoryId, existing]);
  useEffect(() => {
    if (!existing?.subCategory || !categoryId || !subcategories.length) return;
    if (subcategories.some(item => item.value === subCategory)) return;
    const matchingSubcategory = subcategories.find(
      item =>
        item.label.toLowerCase() === existing.subCategory?.trim().toLowerCase(),
    );
    if (matchingSubcategory) setSubCategory(matchingSubcategory.value);
  }, [categoryId, existing, subCategory, subcategories]);
  useEffect(() => {
    if (!existing || clientId || !companies.length) return;
    const match = companies.find(
      item => item.name.trim().toLowerCase() === existing.company.trim().toLowerCase(),
    );
    if (match) setClientId(match.id);
  }, [clientId, companies, existing]);
  useEffect(() => {
    if (!existing || assignedTo || !existing.assignedTo || !staff.length) return;
    const match = staff.find(
      item => item.label.trim().toLowerCase() === existing.assignedTo?.trim().toLowerCase(),
    );
    if (match) setAssignedTo(match.value);
  }, [assignedTo, existing, staff]);
  const save = async () => {
    if (!subject.trim() || !description.trim())
      return Alert.alert(
        'Missing details',
        'Subject and description are required.',
      );
    const category =
      categories.find(item => item.value === categoryId)?.label || '';
    const subCategoryName =
      subcategories.find(item => item.value === subCategory)?.label || '';
    const selectedClient = companies.find(item => item.id === clientId);
    const selectedAssignee = staff.find(item => item.value === assignedTo);
    if (!clientId || !selectedClient)
      return Alert.alert('Missing client', 'Select the client for this ticket.');
    if (!existing && (!user?.name || !user.buildingName))
      return Alert.alert(
        'Profile unavailable',
        'Your profile must finish loading before creating a ticket.',
      );
    setSaving(true);
    try {
      if (existing)
        await updateTicket(existing.id, {
          subject,
          description,
          category,
          categoryId,
          subCategory,
          subCategoryName,
          assignedToId: assignedTo,
          assignedTo: selectedAssignee?.label || '',
          clientId,
          company: selectedClient.name,
          priority,
          status,
        });
      else
        await createTicket({
          subject,
          description,
          category,
          categoryId,
          subCategory,
          subCategoryName,
          assignedToId: assignedTo,
          assignedTo: selectedAssignee?.label || '',
          clientId,
          priority,
          location: '',
          status,
          memberName: user!.name,
          company: selectedClient.name,
          attachment: attachment || undefined,
        });
      navigation.goBack();
    } catch (error) {
      alertActionError(
        existing ? 'Ticket not updated' : 'Ticket not created',
        error,
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.root}>
      <Header
        title={existing ? 'Edit Ticket' : 'Create Ticket'}
        subtitle={existing ? 'Update ticket details' : 'Log a member issue'}
      />
      <KeyboardSafeScrollView contentContainerStyle={styles.formPage}>
        <Field label="Subject" value={subject} onChangeText={setSubject} />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <DropdownField
          label="Client"
          value={clientId}
          options={companies.map(company => ({
            value: company.id,
            label: company.name,
          }))}
          onChange={setClientId}
          placeholder="Select a client"
          searchable
        />
        <DropdownField
          label="Category"
          value={categoryId}
          options={categories}
          onChange={value => {
            setCategoryId(value);
            setSubCategory('');
          }}
          placeholder="Select a category"
          searchable
        />
        <DropdownField
          label="Subcategory"
          value={subCategory}
          options={subcategories}
          onChange={setSubCategory}
          placeholder={
            categoryId ? 'Select a subcategory' : 'Select a category first'
          }
          disabled={!categoryId}
          searchable
        />
        <DropdownField
          label="Assignee"
          value={assignedTo}
          options={staff}
          onChange={setAssignedTo}
          placeholder="Optional assignee"
          searchable
        />
        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.chips}>
          {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map(
            value => (
              <TouchableOpacity key={value} onPress={() => setStatus(value)}>
                <Pill
                  label={value}
                  color={status === value ? Colors.accent300 : Colors.textMuted}
                />
              </TouchableOpacity>
            ),
          )}
        </View>
        <Text style={styles.fieldLabel}>Priority</Text>
        <View style={styles.chips}>
          {(['Low', 'Medium', 'High', 'Urgent'] as const).map(value => (
            <TouchableOpacity key={value} onPress={() => setPriority(value)}>
              <Pill
                label={value}
                color={priority === value ? Colors.accent300 : Colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
        {!existing ? (
          <AttachmentPicker
            file={attachment}
            accept="PDF, images, or office documents"
            onPress={async () => {
              try {
                const [file] = await pick({
                  type: [types.allFiles],
                  allowMultiSelection: false,
                });
                if (file) setAttachment(await pickedAttachment(file));
              } catch (error) {
                if (!isPickerCancelled(error))
                  alertActionError('Attachment unavailable', error);
              }
            }}
          />
        ) : null}
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={[styles.primaryButton, saving && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Create Ticket'}
          </Text>
        </TouchableOpacity>
      </KeyboardSafeScrollView>
    </View>
  );
}

export function InviteVisitorScreen() {
  const navigation = useNavigation<Nav>();
  const { inviteVisitor, members } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hostId, setHostId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [visitDate, setVisitDate] = useState(
    localDateString(),
  );
  const [arrivalTime, setArrivalTime] = useState('10:00');
  const [saving, setSaving] = useState(false);
  const host = members.find(member => member.id === hostId);
  const save = async () => {
    if (
      !name.trim() ||
      phone.replace(/\D/g, '').length !== 10 ||
      !host
    )
      return Alert.alert(
        'Missing details',
        'Visitor name, a 10-digit phone number, and host are required.',
      );
    if (isPastDateTime(visitDate, arrivalTime))
      return Alert.alert('Invalid visit time', 'Choose a future visit date and time.');
    setSaving(true);
    try {
      await inviteVisitor({
        name: name.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, ''),
        company: companyName.trim(),
        host: host.name,
        hostId: host.id,
        purpose: purpose.trim(),
        visitDate,
        arrivalTime,
      });
      Alert.alert(
        'Invitation created',
        `${name.trim()} has been added to the visitor list.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert(
        'Could not add guest',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.root}>
      <Header title="Invite Visitor" subtitle="Create a reception entry" />
      <KeyboardSafeScrollView contentContainerStyle={styles.formPage}>
        <Field label="Visitor name" value={name} onChangeText={setName} />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label="Phone"
          value={phone}
          onChangeText={value =>
            setPhone(value.replace(/\D/g, '').slice(0, 10))
          }
          keyboardType="phone-pad"
        />
        <Field
          label="Company name (optional)"
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Enter the visitor's company"
        />
        <DropdownField
          label="Host"
          value={hostId}
          options={members.map(member => ({
            value: member.id,
            label: [member.name, member.company].filter(Boolean).join(' · '),
          }))}
          onChange={setHostId}
          placeholder={
            members.length
              ? 'Select a member'
              : 'No hosts available for this building'
          }
          searchable
        />
        <DropdownField
          label="Visit date"
          value={visitDate}
          options={EVENT_DATE_OPTIONS}
          onChange={setVisitDate}
        />
        <DropdownField
          label="Visit time"
          value={arrivalTime}
          options={EVENT_TIME_OPTIONS.filter(option => !isPastDateTime(visitDate, option.value))}
          onChange={setArrivalTime}
        />
        <Field
          label="Purpose"
          value={purpose}
          onChangeText={setPurpose}
          multiline
        />
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={[styles.primaryButton, saving && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Creating…' : 'Send Invitation'}
          </Text>
        </TouchableOpacity>
      </KeyboardSafeScrollView>
    </View>
  );
}

export function BookDayPassScreen() {
  const navigation = useNavigation<Nav>();
  const {
    createDayPass,
    createDayPassBundle,
    checkDayPassAvailability,
    user,
    onDemandUsers,
    members,
  } = useApp();
  const { buildings, bundles, loading: catalogLoading } = useDayPassCatalog();
  const [recipientType, setRecipientType] = useState<'member' | 'customer'>(
    'member',
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    user?.buildingId || '',
  );
  const building = buildings.find(item => item.id === selectedBuildingId);
  const availableBundles = bundles.filter(
    item => !item.buildingId || item.buildingId === selectedBuildingId,
  );
  const [recipientId, setRecipientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const passType = 'Full Day';
  const [purchaseType, setPurchaseType] = useState<'single' | 'bundle'>(
    'single',
  );
  const [bundleId, setBundleId] = useState('');
  const [splitSelf, setSplitSelf] = useState('');
  const [splitOther, setSplitOther] = useState('0');
  const [paymentMethod] = useState<'credits' | 'razorpay'>(
    'razorpay',
  );
  const [discountPercent, setDiscountPercent] = useState('0');
  const [discountReason, setDiscountReason] = useState(
    'Community promotional discount',
  );
  const [saving, setSaving] = useState(false);
  const selectedBundle = availableBundles.find(item => item.id === bundleId);
  const customer =
    recipientType === 'customer'
      ? onDemandUsers.find(item => item.id === recipientId)
      : undefined;
  const member =
    recipientType === 'member'
      ? members.find(item => item.id === recipientId)
      : undefined;
  const recipient = member || customer;
  const count = selectedBundle?.passCount || 0;
  const subtotal =
    purchaseType === 'bundle'
      ? (building?.price || 0) *
        count *
        (1 - (selectedBundle?.discountPercent || 0) / 100)
      : building?.price || 0;
  const manualDiscount =
    paymentMethod === 'razorpay' ? Number(discountPercent) || 0 : 0;
  const totalAmount =
    subtotal * (1 - Math.min(100, Math.max(0, manualDiscount)) / 100);
  const discountCap = building?.communityDiscountMaxPercent ?? 10;

  useEffect(() => {
    if (purchaseType !== 'bundle' || !availableBundles.length) return;
    if (!selectedBundle) setBundleId(availableBundles[0].id);
  }, [availableBundles, purchaseType, selectedBundle]);

  useEffect(() => {
    setRecipientId('');
  }, [recipientType]);

  useEffect(() => {
    if (selectedBuildingId && building) return;
    const preferred =
      buildings.find(item => item.id === user?.buildingId) || buildings[0];
    if (preferred) setSelectedBuildingId(preferred.id);
  }, [building, buildings, selectedBuildingId, user?.buildingId]);

  useEffect(() => {
    setBundleId('');
  }, [selectedBuildingId]);

  useEffect(() => {
    if (selectedBundle) {
      setSplitSelf(String(selectedBundle.passCount));
      setSplitOther('0');
    }
  }, [selectedBundle]);
  const save = async () => {
    if (!recipient)
      return Alert.alert(
        recipientType === 'member' ? 'Member required' : 'Customer required',
        recipientType === 'member'
          ? 'Select a community member.'
          : 'Select an on-demand user.',
      );
    if (!building || building.price <= 0)
      return Alert.alert(
        'Pricing unavailable',
        'Day-pass pricing has not been configured for this building.',
      );
    if (manualDiscount < 0 || manualDiscount > 100)
      return Alert.alert(
        'Invalid discount',
        'Enter a discount between 0 and 100%.',
      );
    if (
      paymentMethod === 'razorpay' &&
      manualDiscount > 0 &&
      !discountReason.trim()
    )
      return Alert.alert(
        'Reason required',
        'Enter a reason for the manual discount.',
      );
    const discountFields =
      paymentMethod === 'razorpay' && manualDiscount > 0
        ? {
            discountPercent: manualDiscount,
            discountReason: discountReason.trim(),
            usingDefaultBuildingDiscount: true as const,
          }
        : {};
    const base = {
      ...(member
        ? {
            customerId: member.id,
            memberId: member.id,
            purchaseType: 'member' as const,
          }
        : { customerId: customer!.id, purchaseType: 'customer' as const }),
      buildingId: building.id,
      name: recipient.name,
      email: recipient.email,
      phone: recipient.phone,
      company: recipient.company,
      date,
      passType,
      amount: building.price,
      bookingFor: 'other',
      paymentMethod,
      numberOfGuests: 1,
      kycVerified: false,
      accessAreas: [],
      ...discountFields,
    };
    setSaving(true);
    try {
      let discountStatus: string | undefined;
      let paymentUrl: string | undefined;
      let paymentOrder:
        | import('../../types/domain').PaymentOrderConfig
        | undefined;
      let paymentContext: {
        dayPassId?: string;
        bundleId?: string;
        amount?: number;
      } = {};
      if (purchaseType === 'bundle') {
        const total = count;
        const own = Number(splitSelf) || 0;
        const others = Number(splitOther) || 0;
        if (!selectedBundle)
          return Alert.alert(
            'Bundle unavailable',
            'Select an available bundle.',
          );
        if (total < 1 || own + others !== total)
          return Alert.alert(
            'Invalid allocation',
            'Self and other allocations must add up to the bundle size.',
          );
        const records = await createDayPassBundle({
          ...base,
          count: total,
          splitSelf: own,
          splitOther: others,
          paymentMethod,
          discountBundleId: selectedBundle.discountBundleId,
          discountBundleOptionId: selectedBundle.id,
        });
        discountStatus = records.find(
          record => record.discountStatus,
        )?.discountStatus;
        paymentUrl = records.find(record => record.paymentUrl)?.paymentUrl;
        paymentOrder = records.find(
          record => record.paymentOrder,
        )?.paymentOrder;
        paymentContext = {
          bundleId: records.find(record => record.bundleId)?.bundleId,
          amount: paymentOrder?.amount,
        };
      } else {
        const record = await createDayPass(base);
        discountStatus = record.discountStatus;
        paymentUrl = record.paymentUrl;
        paymentOrder = record.paymentOrder;
        paymentContext = { dayPassId: record.id, amount: paymentOrder?.amount };
      }
      if (discountStatus === 'pending') {
        Alert.alert(
          'Approval required',
          'Discount request sent for approval.',
          [{ text: 'Done', onPress: () => navigation.goBack() }],
        );
      } else if (
        paymentMethod === 'razorpay' &&
        paymentOrder?.noPaymentRequired
      ) {
        Alert.alert('No payment required', 'The booking is fully covered.', [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else if (paymentMethod === 'razorpay' && paymentOrder) {
        navigation.replace('RazorpayCheckoutScreen', {
          order: {
            key: paymentOrder.key,
            amount: paymentOrder.amount,
            orderId: paymentOrder.orderId,
            description: paymentOrder.description,
          },
          prefill: {
            name: recipient.name,
            email: recipient.email,
            contact: recipient.phone,
          },
          context: paymentContext,
          title: 'Day Pass Payment',
        });
      } else if (paymentMethod === 'razorpay' && paymentUrl) {
        navigation.replace('PaymentWebViewScreen', {
          url: paymentUrl,
          context: paymentContext,
          title: 'Day Pass Payment',
        });
      } else if (paymentMethod === 'razorpay') {
        Alert.alert(
          'Payment pending',
          'The booking was created, but a payment link could not be opened. Please retry payment from the booking record.',
          [{ text: 'Done', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert(
          'Day pass purchased',
          dayPassCreditSuccessMessage(
            purchaseType === 'bundle'
              ? 'bundle'
              : recipientType === 'member'
              ? 'member'
              : 'single',
            recipient.name,
            purchaseType === 'bundle' ? count : 1,
          ),
          [{ text: 'Done', onPress: () => navigation.goBack() }],
        );
      }
    } catch (error) {
      Alert.alert(
        'Could not book day pass',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };
  const check = async () => {
    try {
      const result = await checkDayPassAvailability(date, selectedBuildingId);
      Alert.alert(
        'Day-pass availability',
        `${result.available} of ${result.capacity} passes are available for ${date}.`,
      );
    } catch (error) {
      Alert.alert(
        'Availability unavailable',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };
  return (
    <View style={styles.root}>
      <Header
        title="Book Day Pass"
        subtitle={building?.name || 'Single passes and bundles'}
      />
      <KeyboardSafeScrollView contentContainerStyle={styles.formPage}>
        <Text style={styles.fieldLabel}>User type</Text>
        <View style={styles.chips}>
          {(['member', 'customer'] as const).map(value => (
            <TouchableOpacity
              key={value}
              onPress={() => setRecipientType(value)}
            >
              <Pill
                label={value === 'member' ? 'Member' : 'On-Demand User'}
                color={
                  recipientType === value ? Colors.accent300 : Colors.textMuted
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        <DropdownField
          label="Building"
          value={selectedBuildingId}
          options={buildings.map(item => ({ value: item.id, label: item.name }))}
          onChange={setSelectedBuildingId}
          placeholder={catalogLoading ? 'Loading buildings…' : 'Select a building'}
          searchable
        />
        <Text style={styles.fieldLabel}>Pass type</Text>
        <View style={styles.chips}>
          {(['single', 'bundle'] as const).map(value => (
            <TouchableOpacity key={value} onPress={() => setPurchaseType(value)}>
              <Pill
                label={value === 'single' ? 'Single Day Pass' : 'Bundle Day Pass'}
                color={purchaseType === value ? Colors.accent300 : Colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
        {purchaseType === 'bundle' ? (
          <DropdownField
            label="Bundle"
            value={bundleId}
            options={availableBundles.map(item => ({
              value: item.id,
              label: `${item.name} · Save ${item.discountPercent}%`,
            }))}
            onChange={setBundleId}
            placeholder={
              catalogLoading ? 'Loading bundles…' : 'Select a bundle'
            }
          />
        ) : null}
        <DropdownField
          label={recipientType === 'member' ? 'Member' : 'On-Demand User'}
          value={recipientId}
          options={(recipientType === 'member'
            ? members.filter(item => item.status === 'Active')
            : onDemandUsers
          ).map(item => ({
            value: item.id,
            label: [
              item.name ||
                (recipientType === 'member'
                  ? 'Unnamed member'
                  : 'Unnamed customer'),
              item.phone,
            ]
              .filter(Boolean)
              .join(' · '),
          }))}
          onChange={setRecipientId}
          placeholder={
            recipientType === 'member'
              ? 'Select a community member'
              : 'Select an on-demand user'
          }
          searchable
        />
        {recipient ? (
          <View style={styles.customerSummary}>
            <Text style={styles.cardTitle}>
              {recipient.name ||
                (member ? 'Unnamed member' : 'Unnamed customer')}
            </Text>
            {recipient.email ? (
              <Text style={styles.meta}>{recipient.email}</Text>
            ) : null}
            {recipient.company ? (
              <Text style={styles.meta}>{recipient.company}</Text>
            ) : null}
          </View>
        ) : null}
        <DropdownField
          label="Date"
          value={date}
          options={EVENT_DATE_OPTIONS}
          onChange={setDate}
        />
        <TouchableOpacity onPress={check} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>
            Check date availability
          </Text>
        </TouchableOpacity>
        <View style={styles.priceSummary}>
          <Text style={styles.meta}>
            {purchaseType === 'bundle'
              ? `${count} passes`
            : recipientType === 'member'
              ? 'Member day pass'
              : passType}
          </Text>
          <Text style={styles.amount}>
            ₹{Math.round(totalAmount).toLocaleString('en-IN')}
          </Text>
        </View>
        <Text style={styles.fieldLabel}>Payment method</Text>
        <Text style={styles.help}>Razorpay</Text>
        {paymentMethod === 'razorpay' ? (
          <>
            <Field
              label={`Manual discount % (default cap ${discountCap}%)`}
              value={discountPercent}
              onChangeText={value =>
                setDiscountPercent(value.replace(/[^\d.]/g, ''))
              }
              keyboardType="number-pad"
            />
            <Field
              label="Discount reason"
              value={discountReason}
              onChangeText={setDiscountReason}
              placeholder="Why is this discount being offered?"
            />
            <Text style={styles.discountNotice}>
              {manualDiscount > discountCap
                ? 'This exceeds the displayed cap and requires approval.'
                : 'The final approval decision is made during processing.'}
            </Text>
          </>
        ) : (
          <Text style={styles.discountNotice}>
            Discounts are not sent when credits are selected.
          </Text>
        )}
        <TouchableOpacity
          onPress={save}
          disabled={
            saving ||
            catalogLoading ||
            !building ||
            !recipient ||
            totalAmount <= 0
          }
          style={[
            styles.primaryButton,
            (saving ||
              catalogLoading ||
              !building ||
              !recipient ||
              totalAmount <= 0) &&
              styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {saving
              ? 'Submitting…'
              : `Purchase ${
                  purchaseType === 'bundle'
                    ? 'Bundle'
                    : recipientType === 'member'
                    ? 'Member Pass'
                    : 'Day Pass'
                }`}
          </Text>
        </TouchableOpacity>
      </KeyboardSafeScrollView>
    </View>
  );
}

export function OnDemandUsersScreen() {
  const { onDemandUsers } = useApp();
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [remoteUsers, setRemoteUsers] = useState<typeof onDemandUsers>([]);
  const [searched, setSearched] = useState(false);
  const runSearch = async () => {
    if (search.trim().length < 2) {
      setSearched(false);
      setRemoteUsers([]);
      return;
    }
    try {
      const response = await apiClient.get<unknown>(Routes.guestSearch, {
        q: search.trim(),
        limit: 20,
      });
      const root =
        response && typeof response === 'object'
          ? (response as Record<string, unknown>)
          : {};
      const data =
        root.data && typeof root.data === 'object' && !Array.isArray(root.data)
          ? (root.data as Record<string, unknown>)
          : root;
      const list = (
        Array.isArray(root.data)
          ? root.data
          : data.results || data.guests || root.results || []
      ) as Array<Record<string, unknown>>;
      setRemoteUsers(
        list
          .map(item => ({
            id: String(item._id || item.id || ''),
            name: String(
              item.name ||
                [item.firstName, item.lastName].filter(Boolean).join(' ') ||
                '',
            ),
            email: String(item.email || ''),
            phone: String(item.phone || item.mobile || ''),
            company: String(item.companyName || item.company || ''),
            createdAt: String(item.createdAt || ''),
            zohoContactId: item.zohoContactId
              ? String(item.zohoContactId)
              : undefined,
          }))
          .filter(item => item.id),
      );
      setSearched(true);
    } catch (error) {
      alertActionError('Guest search failed', error);
    }
  };
  const displayedUsers = searched ? remoteUsers : onDemandUsers;
  const renderUser = ({ item }: { item: (typeof onDemandUsers)[number] }) => {
    const name = item.name || 'Unnamed guest';
    const contact = [item.email, item.phone].filter(Boolean).join(' · ');
    const createdAt = item.createdAt ? new Date(item.createdAt) : null;
    const joined =
      createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleDateString('en-IN')
        : '';
    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('OnDemandUserDetailScreen', { guestId: item.id })
        }
        style={styles.card}
      >
        <View style={styles.rowBetween}>
          <View style={styles.cardIdentity}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {name}
            </Text>
            {contact ? <Text style={styles.meta}>{contact}</Text> : null}
          </View>
          <Pill label="Guest" color="#30BCED" />
        </View>
        {item.company ? <Text style={styles.body}>{item.company}</Text> : null}
        {joined ? <Text style={styles.meta}>Added {joined}</Text> : null}
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.root}>
      <Header
        title="On-demand Users"
        subtitle={`${displayedUsers.length} user records`}
        action={{
          label: 'Book',
          onPress: () => navigation.navigate('BookDayPassScreen'),
        }}
      />
      <FlatList
        data={displayedUsers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.searchBox}>
            <Icon name="magnify" size={19} color={Colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={value => {
                setSearch(value);
                if (!value.trim()) setSearched(false);
              }}
              onSubmitEditing={runSearch}
              placeholder="Search guests…"
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
            />
            <TouchableOpacity onPress={runSearch}>
              <Text style={styles.searchAction}>Search</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <Empty icon="account-clock-outline" text="No on-demand users" />
        }
        renderItem={renderUser}
      />
    </View>
  );
}

export function MeetingRoomsInventoryScreen() {
  const navigation = useNavigation<Nav>();
  const { bookings, meetingRooms } = useApp();
  const rooms = useMemo(() => {
    return meetingRooms.map(room => {
      const roomBookings = bookings.filter(
        booking => booking.room === room.name,
      );
      const active = roomBookings.find(booking =>
        ['Confirmed', 'In Progress'].includes(booking.status),
      );
      return {
        ...room,
        bookingCount: roomBookings.length,
        available: room.status === 'Available' && !active,
      };
    });
  }, [bookings, meetingRooms]);
  return (
    <View style={styles.root}>
      <Header title="Meeting Rooms" subtitle={`${rooms.length} rooms`} />
      <FlatList
        data={rooms}
        keyExtractor={item => item.name}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('InventoryResourceDetailScreen', {
                kind: 'meeting-room',
                id: item.id,
              })
            }
            style={styles.card}
          >
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.meta}>
                  {[item.floor, `capacity ${item.capacity || '—'}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Pill
                label={item.available ? 'Available' : 'Booked'}
                color={item.available ? Colors.success : Colors.accent300}
              />
            </View>
            <Text style={styles.body}>
              {item.bookingCount} bookings in the current dataset
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  back: { width: 40, height: 40, justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { ...Typography.pageTitle, color: Colors.textPrimary },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent300,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  headerActionText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 12,
    color: Colors.white,
  },
  grid: { padding: Spacing.lg, paddingBottom: 48 },
  gridRow: { gap: Spacing.sm },
  moduleCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  moduleTitle: { ...Typography.sectionHeader, color: Colors.textPrimary },
  moduleDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 5,
    lineHeight: 16,
  },
  list: { padding: Spacing.lg, paddingBottom: 48 },
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    marginBottom: Spacing.sm,
  },
  cardTitle: { ...Typography.sectionHeader, color: Colors.textPrimary },
  body: {
    ...Typography.secondaryBody,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  meta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  mono: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  postText: {
    ...Typography.primaryBody,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    lineHeight: 22,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardIdentity: { flex: 1, minWidth: 0 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  pill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 10 },
  smallButton: {
    backgroundColor: Colors.accent300,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  smallButtonText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 12,
    color: Colors.white,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    marginBottom: 10
  },
  secondaryButtonText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: BorderRadius.sm,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    alignSelf: 'flex-start',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlayDark,
  },
  keyboardSheet: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%',
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDefault,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  formSheetContent: { paddingBottom: Spacing.xxl },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sheetTitle: { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  sheetClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -Spacing.sm,
  },
  field: { marginBottom: Spacing.md },
  fieldLabel: {
    ...Typography.sectionLabel,
    color: Colors.textSecondary,
    marginBottom: 7,
  },
  input: {
    minHeight: 50,
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    ...Typography.primaryBody,
    color: Colors.textPrimary,
  },
  multiline: {
    minHeight: 105,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
  twoColumns: { flexDirection: 'row', gap: Spacing.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filePicker: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  filePickerTitle: { ...Typography.primaryBody, color: Colors.textPrimary },
  primaryButton: {
    minHeight: 52,
    backgroundColor: Colors.accent300,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  primaryButtonText: { ...Typography.buttonText, color: Colors.white },
  disabled: { opacity: 0.45 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: Spacing.md },
  emptyText: { ...Typography.secondaryBody, color: Colors.textMuted },
  help: {
    ...Typography.secondaryBody,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  attendee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDefault,
  },
  memberCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accent200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCircleText: {
    fontFamily: 'SequelSans-SemiBoldBody',
    color: Colors.white,
    fontSize: 13,
  },
  summary: {
    backgroundColor: Colors.cardSurface,
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  summaryValue: {
    fontFamily: 'SequelSans-SemiBoldHead',
    fontSize: 34,
    color: Colors.alert,
    marginTop: 5,
  },
  amount: {
    fontFamily: 'SequelSans-SemiBoldHead',
    fontSize: 24,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
  },
  summaryInline: {
    backgroundColor: Colors.cardSurface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    marginBottom: Spacing.xl,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionListTitle: {
    ...Typography.sectionHeader,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  emptyInline: {
    ...Typography.secondaryBody,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  priceSummary: {
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  customerSummary: {
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  discountNotice: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  formPage: { padding: Spacing.lg, paddingBottom: 50 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 46,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    ...Typography.secondaryBody,
  },
  searchAction: { ...Typography.smallLabel, color: Colors.accent300 },
});
