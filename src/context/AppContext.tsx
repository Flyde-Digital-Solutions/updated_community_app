import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Environment } from '../config/environment';
import {
  ApiError,
  apiClient,
  setApiSession,
  setUnauthorizedHandler,
} from '../services/apiClient';
import { Routes } from '../services/routes';
import {
  BuildingOption,
  Cabin,
  CommonArea,
  CommunityPost,
  Company,
  DayPass,
  EventRecord,
  FileAttachment,
  Lead,
  Member,
  MeetingRoom,
  NotificationRecord,
  OnDemandUser,
  PrinterRequest,
  RfidCard,
  RoomBooking,
  SessionUser,
  Ticket,
  Visitor,
} from '../types/domain';
import { normalizeDayPassStatus } from '../utils/dayPass';
import { paymentOrderFrom } from '../utils/razorpay';
import { normalizeRoomBookingStatus } from '../utils/roomBooking';
import { UPLOAD_TIMEOUT_MS } from '../utils/pickedAttachment';

const STORAGE_KEY = '@ofis/community-state/v3';
const LEGACY_DEMO_SESSION_KEY = '@ofis/community-demo-session/v1';
const AUTH_SERVICE = 'org.ofissquare.community.session';

type CollectionKey =
  | 'tickets'
  | 'visitors'
  | 'onDemandUsers'
  | 'dayPasses'
  | 'bookings'
  | 'meetingRooms'
  | 'members'
  | 'companies'
  | 'cabins'
  | 'events'
  | 'notifications'
  | 'leads'
  | 'rfidCards'
  | 'printerRequests'
  | 'posts'
  | 'commonAreas';

type PendingOperation = {
  id: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
};

type AppState = {
  hydrated: boolean;
  sessionValidated: boolean;
  authenticated: boolean;
  token: string | null;
  user: SessionUser | null;
  connection: 'checking' | 'online' | 'offline';
  lastSyncedAt: string | null;
  syncError: string | null;
  pendingOperations: PendingOperation[];
  tickets: Ticket[];
  visitors: Visitor[];
  onDemandUsers: OnDemandUser[];
  dayPasses: DayPass[];
  bookings: RoomBooking[];
  meetingRooms: MeetingRoom[];
  members: Member[];
  companies: Company[];
  cabins: Cabin[];
  events: EventRecord[];
  notifications: NotificationRecord[];
  leads: Lead[];
  rfidCards: RfidCard[];
  printerRequests: PrinterRequest[];
  posts: CommunityPost[];
  commonAreas: CommonArea[];
  dashboardSummary: Record<string, number>;
  buildings: BuildingOption[];
};

const initialState: AppState = {
  hydrated: false,
  sessionValidated: false,
  authenticated: false,
  token: null,
  user: null,
  connection: 'checking',
  lastSyncedAt: null,
  syncError: null,
  pendingOperations: [],
  tickets: [],
  visitors: [],
  onDemandUsers: [],
  dayPasses: [],
  bookings: [],
  meetingRooms: [],
  members: [],
  companies: [],
  cabins: [],
  events: [],
  notifications: [],
  leads: [],
  rfidCards: [],
  printerRequests: [],
  posts: [],
  commonAreas: [],
  dashboardSummary: {},
  buildings: [],
};

type NewTicket = Omit<Ticket, 'id' | 'backendId' | 'createdAt' | 'syncState'> & {
  attachment?: FileAttachment;
};
type NewVisitor = Omit<Visitor, 'id' | 'status' | 'syncState'>;
type NewBooking = Omit<RoomBooking, 'id' | 'syncState'>;
export type NewDayPass = Omit<DayPass, 'id' | 'status' | 'syncState'> & {
  buildingId?: string;
  paymentMethod?: 'credits' | 'razorpay';
};
type NewDayPassBundle = NewDayPass & {
  count: number;
  splitSelf: number;
  splitOther: number;
  paymentMethod: 'credits' | 'razorpay';
  discountBundleId?: string;
  discountBundleOptionId?: string;
};
type EventImages = {
  coverImageFile?: FileAttachment;
  additionalImageFile?: FileAttachment;
  speakerImageFiles?: FileAttachment[];
  speakerImageIndexes?: number[];
};
type NewEvent = Omit<EventRecord, 'id' | 'rsvpCount' | 'status' | 'syncState'> &
  EventImages;
type EventPatch = Partial<EventRecord> & EventImages;
type NewLead = Omit<Lead, 'id' | 'status' | 'createdAt' | 'syncState'> & {
  kycDocument?: FileAttachment;
};
type NewPost = Omit<
  CommunityPost,
  'id' | 'createdAt' | 'likes' | 'liked' | 'syncState'
>;
type NewArea = Omit<CommonArea, 'id' | 'syncState'>;
type NewPrinterRequest = {
  attachment: FileAttachment;
  clientId: string;
  memberId?: string;
  buildingId: string;
  fileName?: string;
  copies: number;
  printType: 'bw' | 'color';
  paperSize: 'A4' | 'A3' | 'Letter';
  sides: 'single' | 'duplex';
  comments?: string;
  requestedBy?: string;
  company?: string;
};
type SendNotificationInput = Omit<
  NotificationRecord,
  'id' | 'sentAt' | 'syncState'
> & {
  memberId?: string;
  channels?: { inApp: boolean; email: boolean; sms: boolean };
  emailSubject?: string;
  emailHtml?: string;
};

type AppContextValue = AppState & {
  sendOtp(phone: string): Promise<void>;
  login(phone: string, otp: string): Promise<void>;
  register(details: {
    name: string;
    email: string;
    phone: string;
    password: string;
    company?: string;
    city?: string;
    buildingId?: string;
  }): Promise<{ offline: boolean }>;
  logout(): Promise<void>;
  syncAll(): Promise<void>;
  resetLocalData(): Promise<void>;
  selectBuilding(buildingId: string): Promise<void>;
  createTicket(ticket: NewTicket): Promise<Ticket>;
  updateTicket(id: string, patch: Partial<Ticket>): Promise<void>;
  deleteTicket(id: string): Promise<void>;
  inviteVisitor(visitor: NewVisitor): Promise<Visitor>;
  setVisitorStatus(
    id: string,
    status: Visitor['status'],
    badgeId?: string,
  ): Promise<void>;
  scanVisitorToken(
    token: string,
    details?: { badgeId?: string; notes?: string },
  ): Promise<Visitor>;
  createBooking(booking: NewBooking): Promise<RoomBooking>;
  createDayPass(dayPass: NewDayPass): Promise<DayPass>;
  createDayPassBundle(bundle: NewDayPassBundle): Promise<DayPass[]>;
  checkDayPassAvailability(
    date: string,
    buildingId?: string,
  ): Promise<{ available: number; capacity: number }>;
  updateDayPass(id: string, patch: Partial<DayPass>): Promise<void>;
  updateMember(id: string, patch: Partial<Member>): Promise<void>;
  createEvent(event: NewEvent): Promise<EventRecord>;
  loadEventRsvps(id: string): Promise<NonNullable<EventRecord['attendees']>>;
  updateEvent(id: string, patch: EventPatch): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  sendNotification(
    notification: SendNotificationInput,
  ): Promise<NotificationRecord>;
  createLead(lead: NewLead): Promise<Lead>;
  verifyLeadKyc(leadId: string, documents: FileAttachment[]): Promise<void>;
  updateLead(id: string, patch: Partial<Lead>): Promise<void>;
  addRfidCard(card: Omit<RfidCard, 'id' | 'syncState'>): Promise<RfidCard>;
  importRfidCards(
    file: FileAttachment,
    mode?: 'insert' | 'upsert',
  ): Promise<number>;
  updateRfidCard(id: string, patch: Partial<RfidCard>): Promise<void>;
  assignRfidCard(id: string, companyId: string, company: string): Promise<void>;
  updatePrinterRequest(
    id: string,
    patch: Partial<PrinterRequest>,
  ): Promise<void>;
  createPrinterRequest(request: NewPrinterRequest): Promise<PrinterRequest>;
  createPost(post: NewPost): Promise<CommunityPost>;
  togglePostLike(id: string): void;
  saveCommonArea(area: NewArea & { id?: string }): Promise<CommonArea>;
  deleteCommonArea(id: string): Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

const makeId = (prefix: string) =>
  `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;

const extractList = <T,>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as T[];
  const data =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : undefined;
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key] as T[];
    if (data && Array.isArray(data[key])) return data[key] as T[];
  }
  return [];
};

const normalizeStatus = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ');
export const ticketApiStatus = (value: unknown) =>
  normalizeStatus(value).replace(/\s+/g, '');
const ticketDisplayStatus = (value: unknown) =>
  ticketApiStatus(value) === 'inprogress'
    ? 'In Progress'
    : titleCase(value);
const titleCase = (value: unknown) =>
  String(value || '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
const text = (value: unknown) =>
  value == null ? '' : typeof value === 'object' ? '' : String(value);
const objectId = (value: unknown) => {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return text(record._id || record.id);
  }
  return text(value);
};
const displayName = (value: unknown) => {
  if (!value || typeof value !== 'object') return text(value);
  const record = value as Record<string, unknown>;
  return text(
    record.name ||
      record.fullName ||
      record.displayName ||
      record.companyName ||
      [record.firstName, record.lastName].filter(Boolean).join(' '),
  );
};

const unwrapData = (payload: Record<string, unknown>) =>
  payload.data &&
  typeof payload.data === 'object' &&
  !Array.isArray(payload.data)
    ? (payload.data as Record<string, unknown>)
    : payload;

const normalizeIndianPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits.slice(-10);
};

const toIsoDateTime = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime()))
    throw new Error('Select a valid event date and time.');
  return parsed.toISOString();
};

const toApiLocalDateTime = (date: string, time: string) => {
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !match)
    throw new Error('Select a valid booking date and time.');
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || hour > (meridiem ? 12 : 23))
    throw new Error('Select a valid booking date and time.');
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(
    2,
    '0',
  )}`;
};

const INDIA_OFFSET_MINUTES = 5 * 60 + 30;

const indianDateTimeParts = (value: unknown) => {
  const source = text(value);
  if (!source || !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(source)) return null;
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return null;
  const indiaTime = new Date(
    parsed.getTime() + INDIA_OFFSET_MINUTES * 60 * 1000,
  );
  return {
    date: `${indiaTime.getUTCFullYear()}-${String(
      indiaTime.getUTCMonth() + 1,
    ).padStart(2, '0')}-${String(indiaTime.getUTCDate()).padStart(2, '0')}`,
    time: `${String(indiaTime.getUTCHours()).padStart(2, '0')}:${String(
      indiaTime.getUTCMinutes(),
    ).padStart(2, '0')}`,
  };
};

export const dateFromDateTime = (value: unknown) => {
  const source = text(value);
  return indianDateTimeParts(source)?.date || source.slice(0, 10);
};

export const timeFromDateTime = (value: unknown) => {
  const source = text(value);
  const match = source.match(/[T ](\d{2}:\d{2})/);
  return indianDateTimeParts(source)?.time || match?.[1] || source;
};

export const createCommunityIdempotencyKey = (scope: string) =>
  `community-mobile-${scope}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

export const createDayPassPurchasePayload = (
  input: NewDayPass,
  buildingId: string,
) => {
  const paymentMethod = input.paymentMethod || 'credits';
  const discountPercent = Math.max(
    0,
    Math.min(100, Number(input.discountPercent) || 0),
  );
  const isMemberPurchase =
    input.purchaseType === 'member' || Boolean(input.memberId);
  return {
    // The Community API expects customerId for every single-pass purchase. For
    // members it accepts the member as that customer and uses memberId as the
    // optional relationship field; purchaseType is UI-only state.
    customerId: input.customerId || input.memberId,
    ...(isMemberPurchase ? { memberId: input.memberId } : {}),
    buildingId,
    bookingFor: 'other',
    paymentMethod,
    idempotencyKey: createCommunityIdempotencyKey('day-pass'),
    ...(paymentMethod !== 'credits' && discountPercent > 0
      ? {
          discount: {
            percent: discountPercent,
            reason:
              input.discountReason?.trim() || 'Community promotional discount',
          },
          usingDefaultBuildingDiscount: true,
        }
      : {}),
  };
};

export const mergeCreatedDayPass = (
  input: NewDayPass,
  normalized: DayPass,
): DayPass => ({
  ...input,
  ...normalized,
  customerId: normalized.customerId || input.customerId,
  memberId: normalized.memberId || input.memberId,
  purchaseType: normalized.purchaseType || input.purchaseType,
  name: normalized.name || input.name,
  email: normalized.email || input.email,
  phone: normalized.phone || input.phone,
  company: normalized.company || input.company,
  date: normalized.date || input.date,
  passType: normalized.passType || input.passType,
  amount: normalized.amount > 0 ? normalized.amount : input.amount,
  paymentMethod: normalized.paymentMethod || input.paymentMethod,
  syncState: 'synced',
});

const appendMultipartFields = (
  form: FormData,
  fields: Record<string, unknown>,
) => {
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value),
    );
  });
};

const appendMultipartFile = (
  form: FormData,
  field: string,
  file: FileAttachment,
) => {
  form.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
};

export const normalizeTicket = (raw: Record<string, unknown>): Ticket => {
  const categoryContainer =
    raw.category && typeof raw.category === 'object'
      ? (raw.category as Record<string, unknown>)
      : undefined;
  const categoryRecord =
    raw.categoryId || categoryContainer?.categoryId || raw.category;
  const subCategoryRecord =
    raw.subCategoryId ||
    raw.subcategoryId ||
    categoryContainer?.subCategory ||
    raw.subCategory ||
    raw.subcategory;
  const creator =
    raw.member ||
    raw.raisedBy ||
    raw.raised_by ||
    raw.createdBy ||
    raw.created_by ||
    raw.creator;
  const creatorName =
    creator && typeof creator === 'object'
      ? displayName(creator)
      : /^[a-f\d]{24}$/i.test(text(creator))
      ? ''
      : text(creator);
  const attachmentSource =
    raw.attachment && typeof raw.attachment === 'object'
      ? (raw.attachment as Record<string, unknown>)
      : Array.isArray(raw.attachments) && raw.attachments[0]
      ? (raw.attachments[0] as Record<string, unknown>)
      : raw.file && typeof raw.file === 'object'
      ? (raw.file as Record<string, unknown>)
      : {};
  const attachmentString =
    typeof raw.attachment === 'string'
      ? raw.attachment
      : Array.isArray(raw.attachments) && typeof raw.attachments[0] === 'string'
      ? raw.attachments[0]
      : typeof raw.file === 'string'
      ? raw.file
      : '';

  return {
    id: text(raw.ticketId || raw._id || raw.id) || makeId('T'),
    backendId: text(raw._id || raw.id) || undefined,
    subject: text(raw.subject || raw.title),
    description: text(raw.description),
    status: (ticketDisplayStatus(raw.status) || 'Open') as Ticket['status'],
    category: displayName(categoryRecord) || 'Other',
    categoryId: objectId(categoryRecord) || undefined,
    subCategory: objectId(subCategoryRecord) || undefined,
    subCategoryName: displayName(subCategoryRecord) || undefined,
    priority: (titleCase(raw.priority) || 'Medium') as Ticket['priority'],
    memberName:
      creatorName ||
      text(
        raw.memberName ||
          raw.creatorName ||
          raw.createdByName ||
          raw.createdByFullName ||
          raw.raisedByName ||
          raw.created_by_name,
      ),
    createdById:
      objectId(
        creator || raw.createdById || raw.created_by_id || raw.creatorId,
      ) || undefined,
    company: displayName(raw.client || raw.company) || text(raw.companyName),
    clientId: objectId(raw.clientId || raw.client) || undefined,
    location: text(raw.location) || displayName(raw.building),
    createdAt: text(raw.createdAt),
    assignedTo: displayName(raw.assignedTo),
    assignedToId: objectId(raw.assignedTo) || undefined,
    attachmentName:
      text(attachmentSource.fileName || attachmentSource.name || raw.attachmentName) ||
      (attachmentString ? attachmentString.split('/').pop() : undefined),
    attachmentUrl:
      text(
        attachmentSource.url ||
          attachmentSource.fileUrl ||
          attachmentSource.path ||
          raw.attachmentUrl ||
          raw.fileUrl ||
          attachmentString,
      ) || undefined,
    syncState: 'synced',
  };
};

const normalizeVisitor = (raw: Record<string, unknown>): Visitor => ({
  id: text(raw._id || raw.id) || makeId('V'),
  name:
    text(raw.name) || [raw.firstName, raw.lastName].filter(Boolean).join(' '),
  email: text(raw.email),
  phone: text(raw.phone || raw.mobile),
  company: displayName(raw.company) || text(raw.companyName),
  host: displayName(raw.hostMember || raw.host),
  hostId: objectId(raw.hostId || raw.hostMember || raw.host),
  purpose: text(raw.purpose),
  visitDate: dateFromDateTime(raw.expectedVisitDate || raw.visitDate),
  arrivalTime: timeFromDateTime(
    raw.expectedArrivalTime || raw.arrivalTime || raw.time,
  ),
  departureTime:
    timeFromDateTime(
      raw.expectedDepartureTime ||
        raw.departureTime ||
        raw.slotEnd ||
        raw.endTime ||
        raw.end,
    ) || undefined,
  status: ({
    invited: 'Expected',
    approved: 'Expected',
    awaiting_arrival: 'Expected',
    pending_checkin: 'Expected',
    pending_host_approval: 'Expected',
    checked_in: 'Checked In',
    checked_out: 'Checked Out',
    no_show: 'No Show',
  }[String(raw.status)] ||
    titleCase(raw.status) ||
    'Expected') as Visitor['status'],
  badgeId: text(raw.badgeId),
  checkInMethod: text(raw.checkInMethod),
  checkInTime: text(raw.checkInTime || raw.checkinTime),
  notes: text(raw.notes),
  backendStatus: text(raw.status),
  syncState: 'synced',
});

const normalizeOnDemandUser = (raw: Record<string, unknown>): OnDemandUser => ({
  id: text(raw._id || raw.id) || makeId('GUEST-'),
  name:
    text(raw.name || raw.fullName) ||
    [raw.firstName, raw.lastName].map(text).filter(Boolean).join(' '),
  email: text(raw.email),
  phone: text(raw.phone || raw.mobile),
  company: displayName(raw.company) || text(raw.companyName),
  createdAt: text(raw.createdAt || raw.registeredAt),
  zohoContactId: text(raw.zohoContactId || raw.zoho_contact_id) || undefined,
});

const normalizeDayPass = (raw: Record<string, unknown>): DayPass => {
  const relatedCustomer =
    raw.customer ||
    raw.member ||
    raw.guest ||
    raw.user ||
    raw.customerId ||
    raw.memberId ||
    raw.userId;
  const customer =
    relatedCustomer && typeof relatedCustomer === 'object'
      ? (relatedCustomer as Record<string, unknown>)
      : undefined;
  const memberId = objectId(raw.memberId || raw.member) || undefined;
  const customerId =
    objectId(
      raw.customerId || raw.customer || raw.guest || raw.user || raw.userId,
    ) || undefined;
  return {
    id: text(raw.bookingId || raw._id || raw.id) || makeId('DP'),
    customerId,
    memberId,
    purchaseType: (text(raw.purchaseType).toLowerCase() ||
      (memberId ? 'member' : 'customer')) as DayPass['purchaseType'],
    name:
      text(
        raw.customerName ||
          raw.memberName ||
          raw.guestName ||
          raw.userName ||
          raw.fullName ||
          raw.name,
      ) || displayName(customer),
    email: text(raw.email || raw.customerEmail || customer?.email),
    phone: text(
      raw.phone ||
        raw.mobile ||
        raw.customerPhone ||
        customer?.phone ||
        customer?.mobile,
    ),
    company:
      displayName(raw.company || customer?.company) || text(raw.companyName),
    date: text(
      raw.bookingDate || raw.visitDate || raw.date || raw.createdAt,
    ).slice(0, 10),
    passType: text(raw.passType || raw.dayPassType || raw.type),
    amount: Number(raw.totalAmount || raw.amount || raw.price || 0),
    status: normalizeDayPassStatus(raw.status),
    kycVerified: Boolean(raw.kycVerified || raw.kycStatus === 'verified'),
    rfidCard: text(raw.rfidCard || raw.cardUid),
    accessAreas: Array.isArray(raw.accessAreas)
      ? raw.accessAreas.map(text)
      : [],
    gender: titleCase(raw.gender) as DayPass['gender'],
    memberSince: text(raw.memberSince),
    bookingSource: titleCase(
      raw.bookingSource || raw.source,
    ) as DayPass['bookingSource'],
    checkInTime: text(raw.checkInTime),
    bookingFor: titleCase(raw.bookingFor),
    bookedAt: text(raw.createdAt),
    buildingName: displayName(raw.building),
    numberOfGuests: Number(raw.numberOfGuests || 0) || undefined,
    paymentMethod: text(raw.paymentMethod) as DayPass['paymentMethod'],
    discountPercent:
      Number(
        (raw.discount as Record<string, unknown> | undefined)?.percent ??
          raw.discountPercent,
      ) || undefined,
    discountReason:
      text(
        (raw.discount as Record<string, unknown> | undefined)?.reason ||
          raw.discountReason,
      ) || undefined,
    discountStatus: normalizeStatus(
      raw.discountStatus,
    ) as DayPass['discountStatus'],
    usingDefaultBuildingDiscount:
      typeof raw.usingDefaultBuildingDiscount === 'boolean'
        ? raw.usingDefaultBuildingDiscount
        : undefined,
    syncState: 'synced',
  };
};

export const normalizeBooking = (raw: Record<string, unknown>): RoomBooking => {
  const member = raw.member || raw.memberId;
  const guest = raw.guest || raw.guestId;
  const customer = raw.customer || raw.customerId;
  const client = raw.client || raw.clientId || raw.company;
  const room = raw.room || raw.meetingRoom;
  const roomId = objectId(raw.roomId || raw.meetingRoomId || room) || undefined;
  const roomName = displayName(room);
  const memberId = objectId(member);
  const guestId = objectId(guest) || undefined;
  const relatedName = displayName(member || guest || customer);
  return {
    id: text(raw.bookingId || raw._id || raw.id) || makeId('RB'),
    room: roomName === roomId ? '' : roomName,
    roomId,
    floor:
      displayName(raw.floor || (room as Record<string, unknown>)?.floor) ||
      text(raw.floorName),
    date: text(raw.bookingDate || raw.date || raw.start || raw.startDate).slice(
      0,
      10,
    ),
    startTime: timeFromDateTime(
      raw.startTime || raw.start || raw.startDate || raw.slotStart || raw.from,
    ),
    endTime: timeFromDateTime(
      raw.endTime || raw.end || raw.endDate || raw.slotEnd || raw.to,
    ),
    memberId,
    guestId,
    clientId: objectId(client) || undefined,
    memberName:
      (relatedName !== memberId && relatedName !== guestId
        ? relatedName
        : '') || text(raw.memberName || raw.guestName || raw.customerName),
    company:
      displayName(client) ||
      displayName(
        (member as Record<string, unknown> | undefined)?.company ||
          (guest as Record<string, unknown> | undefined)?.company,
      ) ||
      text(raw.companyName),
    attendees: Number(raw.attendees || raw.attendeeCount || raw.capacity || 1),
    purpose: text(raw.purpose || raw.notes),
    status: normalizeRoomBookingStatus(raw.status),
    paymentMethod: text(raw.paymentMethod) as RoomBooking['paymentMethod'],
    discountPercent:
      Number(
        (raw.discount as Record<string, unknown> | undefined)?.percent ??
          raw.discountPercent,
      ) || undefined,
    discountReason:
      text(
        (raw.discount as Record<string, unknown> | undefined)?.reason ||
          raw.discountReason,
      ) || undefined,
    discountStatus: normalizeStatus(
      raw.discountStatus,
    ) as RoomBooking['discountStatus'],
    usingDefaultBuildingDiscount:
      typeof raw.usingDefaultBuildingDiscount === 'boolean'
        ? raw.usingDefaultBuildingDiscount
        : undefined,
    syncState: 'synced',
  };
};

export const mergeBookingDetails = (
  base: Partial<RoomBooking>,
  incoming: RoomBooking,
): RoomBooking => ({
  ...base,
  ...incoming,
  room: incoming.room || base.room || '',
  roomId: incoming.roomId || base.roomId,
  floor: incoming.floor || base.floor || '',
  memberId: incoming.memberId || base.memberId || '',
  guestId: incoming.guestId || base.guestId,
  clientId: incoming.clientId || base.clientId,
  memberName: incoming.memberName || base.memberName || '',
  company: incoming.company || base.company || '',
  purpose: incoming.purpose || base.purpose || '',
  paymentMethod: incoming.paymentMethod || base.paymentMethod,
});

export const hydrateRoomBookingRelations = (
  bookings: RoomBooking[],
  members: Member[],
  guests: OnDemandUser[],
  companies: Company[],
  rooms: MeetingRoom[],
): RoomBooking[] =>
  bookings.map(booking => {
    const member = members.find(item => item.id === booking.memberId);
    const guest = booking.guestId
      ? guests.find(item => item.id === booking.guestId)
      : undefined;
    const company = companies.find(
      item => item.id === (booking.clientId || member?.companyId),
    );
    const room = rooms.find(item => item.id === booking.roomId);
    return {
      ...booking,
      room: booking.room || room?.name || 'Room unavailable',
      floor: booking.floor || room?.floor || '',
      memberName: member?.name || guest?.name || booking.memberName,
      company:
        member?.company || guest?.company || company?.name || booking.company,
    };
  });

const normalizeMeetingRoom = (raw: Record<string, unknown>): MeetingRoom => ({
  id: text(raw._id || raw.id) || makeId('ROOM'),
  name: text(raw.name || raw.roomName),
  floor: displayName(raw.floor) || text(raw.floorName),
  capacity: Number(raw.capacity || raw.seats || 0),
  status:
    normalizeStatus(raw.status) === 'unavailable' || raw.isActive === false
      ? 'Unavailable'
      : 'Available',
  communityMaxDiscountPercent: Number.isFinite(
    Number(raw.communityMaxDiscountPercent),
  )
    ? Number(raw.communityMaxDiscountPercent)
    : undefined,
});

const normalizeMember = (raw: Record<string, unknown>): Member => {
  const company = raw.company || raw.client;
  const cabin = raw.cabin as Record<string, unknown> | undefined;
  return {
    id: text(raw._id || raw.id) || makeId('M'),
    name: displayName(raw),
    email: text(raw.email),
    phone: text(raw.phone || raw.mobile),
    role: text(raw.designation || raw.role),
    companyId: objectId(raw.companyId || raw.clientId || company),
    company: displayName(company) || text(raw.companyName),
    cabin: displayName(cabin) || text(raw.cabinNumber),
    floor: text(raw.floor || cabin?.floor),
    status: normalizeStatus(raw.status) === 'inactive' ? 'Inactive' : 'Active',
    kycVerified: Boolean(
      raw.kycVerified || normalizeStatus(raw.kycStatus) === 'verified',
    ),
    gender: titleCase(raw.gender) as Member['gender'],
    memberSince: text(raw.memberSince || raw.createdAt),
    bio: text(raw.bio),
  };
};

const normalizeCompany = (raw: Record<string, unknown>): Company => ({
  // Mutation endpoints require the Mongo record id. `clientID` is the human-facing
  // code (for example CLIENT-3) and is not accepted as a clientId by the API.
  id: text(raw._id || raw.id || raw.clientID) || makeId('CO'),
  name: text(raw.companyName || raw.name) || displayName(raw.client),
  contactPerson: text(raw.contactPerson) || displayName(raw.primaryContact),
  email: text(
    raw.email || (raw.primaryContact as Record<string, unknown>)?.email,
  ),
  phone: text(
    raw.phone ||
      raw.mobile ||
      (raw.primaryContact as Record<string, unknown>)?.phone,
  ),
  cabin: displayName(raw.cabin) || text(raw.cabinNumber),
  floor: text(raw.floor || (raw.cabin as Record<string, unknown>)?.floor),
  status: normalizeStatus(raw.status) === 'inactive' ? 'Inactive' : 'Active',
  memberCount: Number(
    raw.memberCount ||
      raw.membersCount ||
      (Array.isArray(raw.members) ? raw.members.length : 0),
  ),
  outstandingAmount: Number(
    raw.outstandingAmount || raw.outstanding || raw.balanceDue || 0,
  ),
  industry: text(raw.industry),
  memberSince: text(raw.memberSince || raw.createdAt),
  leaseEnd: text(raw.leaseEnd),
  monthlyRent: Number(raw.monthlyRent || raw.rent || 0),
  website: text(raw.website),
  about: text(raw.about || raw.description),
});

const looksLikeDatabaseId = (value: string) =>
  /^[a-f\d]{24}$/i.test(value.trim());

export const resolveMemberCompanyNames = (
  members: Member[],
  companies: Company[],
): Member[] =>
  members.map(member => {
    const company = companies.find(
      item => item.id === member.companyId || item.id === member.company,
    );
    if (company?.name)
      return { ...member, companyId: company.id, company: company.name };
    return looksLikeDatabaseId(member.company)
      ? { ...member, company: 'Company unavailable' }
      : member;
  });

const normalizeCabin = (raw: Record<string, unknown>): Cabin => {
  const occupant =
    raw.client ||
    raw.company ||
    raw.tenant ||
    raw.allocatedTo ||
    raw.occupiedBy;
  const backendStatus = normalizeStatus(
    raw.status ||
      raw.occupancyStatus ||
      raw.allocationStatus ||
      raw.availabilityStatus,
  );
  const explicitlyOccupied =
    ['occupied', 'allocated', 'rented', 'booked'].includes(backendStatus) ||
    raw.isOccupied === true;
  const explicitlyVacant =
    ['vacant', 'available', 'unallocated', 'empty'].includes(backendStatus) ||
    raw.isOccupied === false;
  const occupants = raw.occupants || raw.members;
  const pricing =
    raw.pricing && typeof raw.pricing === 'object'
      ? (raw.pricing as Record<string, unknown>)
      : undefined;
  return {
    id: text(raw._id || raw.id) || makeId('C'),
    cabinNumber: text(
      raw.cabinNumber || raw.cabinNo || raw.code || raw.name || raw.number,
    ),
    floor: displayName(raw.floor) || text(raw.floorName),
    size: displayName(raw.size || raw.type || raw.category),
    capacity: Number(raw.capacity || raw.seats || raw.seatingCapacity || 0),
    monthlyRent: Number(
      raw.monthlyRent ||
        raw.monthlyPrice ||
        raw.rent ||
        raw.price ||
        pricing?.monthly ||
        0,
    ),
    status:
      explicitlyOccupied || (!explicitlyVacant && Boolean(objectId(occupant)))
        ? 'Occupied'
        : 'Vacant',
    companyName:
      displayName(occupant) ||
      text(raw.clientName || raw.companyName || raw.tenantName),
    companyId: objectId(occupant || raw.clientId || raw.companyId),
    memberCount: Number(
      raw.memberCount ||
        raw.membersCount ||
        (Array.isArray(occupants) ? occupants.length : occupants) ||
        0,
    ),
    occupiedSince: text(raw.occupiedSince || raw.leaseStart || raw.allocatedAt),
    leaseEnd: text(raw.leaseEnd || raw.leaseEndDate),
  };
};

const normalizeEvent = (raw: Record<string, unknown>): EventRecord => {
  const location =
    raw.location && typeof raw.location === 'object'
      ? (raw.location as Record<string, unknown>)
      : undefined;
  const speakers = Array.isArray(raw.speakers) ? raw.speakers : [];
  const speaker = speakers[0];
  const normalizedSpeakers = speakers.map(entry => {
    const value: Record<string, unknown> =
      entry && typeof entry === 'object'
        ? (entry as Record<string, unknown>)
        : { name: entry };
    return {
      name: displayName(value),
      role: text(value.role || value.designation) || undefined,
      profile: text(value.profile || value.bio) || undefined,
      link: text(value.link || value.url || value.profileUrl) || undefined,
      image: text(value.image || value.imageUrl) || undefined,
    };
  });
  return {
    id: text(raw._id || raw.id) || makeId('E'),
    title: text(raw.title || raw.name),
    description: text(raw.description),
    category: displayName(raw.category),
    categoryId: objectId(raw.categoryId || raw.category),
    subcategory: displayName(raw.subcategory || raw.subCategory),
    subcategoryId: objectId(
      raw.subcategoryId ||
        raw.subCategoryId ||
        raw.subcategory ||
        raw.subCategory,
    ),
    speaker: displayName(raw.speaker || speaker),
    speakerId: objectId(raw.speakerId || raw.speaker || speaker),
    speakers: normalizedSpeakers,
    coverImage: text(
      raw.thumbnail || raw.coverImage || raw.coverImageUrl || raw.cover,
    ),
    additionalImage: text(
      raw.mainImage ||
        raw.additionalImage ||
        raw.additionalImageUrl ||
        raw.image,
    ),
    date: dateFromDateTime(
      raw.date || raw.eventDate || raw.startDate || raw.startsAt,
    ),
    startTime: timeFromDateTime(
      raw.startTime || raw.startDate || raw.startsAt || raw.startAt,
    ),
    endTime: timeFromDateTime(
      raw.endTime || raw.endDate || raw.endsAt || raw.endAt,
    ),
    location: text(location?.address || raw.location || raw.venue),
    buildingId: objectId(raw.buildingId || raw.building) || undefined,
    buildingName: displayName(raw.building) || text(raw.buildingName),
    isExternal: Boolean(
      raw.isExternal || raw.externalEvent || location?.googleMapLink,
    ),
    venueAddress: text(location?.address || raw.venueAddress) || undefined,
    googleMapLink:
      text(location?.googleMapLink || raw.googleMapLink) || undefined,
    rsvpClosingDate:
      dateFromDateTime(
        raw.rsvpClosingDate || raw.rsvpCloseAt || raw.rsvpClosingAt,
      ) || undefined,
    rsvpClosingTime:
      timeFromDateTime(
        raw.rsvpClosingTime || raw.rsvpCloseAt || raw.rsvpClosingAt,
      ) || undefined,
    capacity: Number(raw.capacity || raw.maxRsvp || raw.maxAttendees || 0),
    rsvpCount: Number(
      raw.rsvpCount ||
        raw.attendeeCount ||
        (Array.isArray(raw.rsvps) ? raw.rsvps.length : 0),
    ),
    attendees: Array.isArray(raw.rsvps)
      ? raw.rsvps.map((entry, index) => {
          const attendee =
            entry && typeof entry === 'object'
              ? (entry as Record<string, unknown>)
              : {};
          return {
            id: text(attendee._id || attendee.id) || `attendee-${index}`,
            name: displayName(attendee) || text(attendee.email),
            email: text(attendee.email),
            phone: text(attendee.phone || attendee.mobile),
            company: text(attendee.companyName || attendee.company),
            role: text(attendee.role),
          };
        })
      : [],
    status: (titleCase(raw.status) || 'Draft') as EventRecord['status'],
    syncState: 'synced',
  };
};

export const mergeEventSelections = (
  base: EventRecord,
  incoming: Partial<EventRecord>,
): EventRecord => ({
  ...base,
  ...incoming,
  category: incoming.category || base.category,
  categoryId: incoming.categoryId || base.categoryId,
  subcategory: incoming.subcategory || base.subcategory,
  subcategoryId: incoming.subcategoryId || base.subcategoryId,
  speaker: incoming.speaker || base.speaker,
  speakerId: incoming.speakerId || base.speakerId,
  speakers:
    incoming.speakers?.length ? incoming.speakers : base.speakers,
  buildingId: incoming.buildingId || base.buildingId,
  buildingName: incoming.buildingName || base.buildingName,
  rsvpClosingDate: incoming.rsvpClosingDate || base.rsvpClosingDate,
  rsvpClosingTime: incoming.rsvpClosingTime || base.rsvpClosingTime,
});

const normalizeLead = (raw: Record<string, unknown>): Lead => ({
  id: text(raw._id || raw.id) || makeId('L'),
  name: displayName(raw),
  email: text(raw.email),
  phone: text(raw.phone || raw.mobile),
  company: displayName(raw.company || raw.client) || text(raw.companyName),
  purpose: text(raw.purpose || raw.requirement || raw.notes),
  address: text(raw.address || raw.addressLine) || undefined,
  pincode: text(raw.pincode || raw.pinCode || raw.postalCode) || undefined,
  status: (titleCase(raw.status) || 'New') as Lead['status'],
  createdAt: text(raw.createdAt),
  kycStatus: text(raw.kycStatus || raw.kyc_status),
  kycDocuments: Array.isArray(raw.kycDocuments)
    ? raw.kycDocuments.map((item, index) => {
        const document =
          item && typeof item === 'object'
            ? (item as Record<string, unknown>)
            : {};
        const url =
          typeof item === 'string'
            ? item
            : text(document.url || document.fileUrl || document.path);
        return {
          name:
            text(document.name || document.fileName) ||
            (url ? url.split('/').pop()?.split('?')[0] : '') ||
            `Document ${index + 1}`,
          url: url || undefined,
        };
      })
    : undefined,
  syncState: 'synced',
});

const normalizeRfidCard = (raw: Record<string, unknown>): RfidCard => ({
  id: text(raw._id || raw.id || raw.cardUid) || makeId('RFID-'),
  uid: text(raw.cardUid || raw.uid),
  status: (titleCase(raw.status) || 'Inactive') as RfidCard['status'],
  assignedTo: displayName(raw.companyUser || raw.assignedTo),
  company: displayName(raw.clientId || raw.client),
  accessAreas: Array.isArray(raw.accessAreas) ? raw.accessAreas.map(text) : [],
  billingType: (text(raw.billingType).toUpperCase() ||
    undefined) as RfidCard['billingType'],
  companyId: objectId(raw.clientId || raw.client) || undefined,
  syncState: 'synced',
});

const normalizePrinter = (raw: Record<string, unknown>): PrinterRequest => {
  const file =
    raw.file && typeof raw.file === 'object'
      ? (raw.file as Record<string, unknown>)
      : {};
  const printType = text(raw.printType || raw.print_type).toLowerCase();
  const paperSize = text(raw.paperSize || raw.paper_size);
  const sides = text(raw.sides).toLowerCase();
  return {
    id: text(raw._id || raw.id) || makeId('PR'),
    fileName: text(raw.fileName || raw.documentName || file.name || raw.name),
    requestedBy: displayName(raw.requester || raw.user || raw.requestedBy),
    company: displayName(raw.client || raw.company),
    clientId: objectId(raw.clientId || raw.client) || undefined,
    memberId: objectId(raw.memberId || raw.member) || undefined,
    copies: Number(raw.copies || 1),
    color: printType === 'color' || Boolean(raw.color || raw.isColor),
    printType: printType === 'color' ? 'color' : 'bw',
    paperSize: (['A4', 'A3', 'Letter'].includes(paperSize)
      ? paperSize
      : 'A4') as PrinterRequest['paperSize'],
    sides: sides === 'single' ? 'single' : 'duplex',
    comments: text(raw.comments || raw.notes),
    credits: Number(raw.credits || raw.creditsToDeduct || raw.creditCost || 0),
    status: (titleCase(raw.status) || 'Pending') as PrinterRequest['status'],
    createdAt: text(raw.createdAt) || new Date().toISOString(),
    syncState: 'synced',
    documentUrl: text(
      raw.documentUrl || raw.fileUrl || file.url || file.path || raw.url,
    ),
  };
};

const normalizeArea = (raw: Record<string, unknown>): CommonArea => ({
  id: text(raw._id || raw.id) || makeId('CA'),
  name: text(raw.name),
  code: text(raw.code),
  building: displayName(raw.building),
  capacity: Number(raw.capacity || 0),
  status:
    normalizeStatus(raw.status) === 'unavailable' ? 'Unavailable' : 'Available',
  description: text(raw.description),
  syncState: 'synced',
});

const normalizeDashboardSummary = (
  payload: unknown,
): Record<string, number> => {
  if (!payload || typeof payload !== 'object') return {};
  const root = unwrapData(payload as Record<string, unknown>);
  const source =
    root.summary && typeof root.summary === 'object'
      ? (root.summary as Record<string, unknown>)
      : root;
  const values: Record<string, number> = {};
  const visit = (record: Record<string, unknown>, prefix = '') => {
    Object.entries(record).forEach(([key, value]) => {
      const normalizedKey = `${prefix}${prefix ? '.' : ''}${key}`;
      if (typeof value === 'number' && Number.isFinite(value))
        values[normalizedKey] = value;
      else if (value && typeof value === 'object' && !Array.isArray(value))
        visit(value as Record<string, unknown>, normalizedKey);
    });
  };
  visit(source);
  return values;
};

const toTicketPayload = (input: Partial<Ticket>, buildingId?: string) => ({
  ...(input.subject !== undefined ? { subject: input.subject.trim() } : {}),
  ...(input.description !== undefined
    ? { description: input.description.trim() }
    : {}),
  ...(input.priority !== undefined
    ? { priority: normalizeStatus(input.priority).replace(/\s+/g, '_') }
    : {}),
  ...(input.status !== undefined
    ? { status: ticketApiStatus(input.status) }
    : {}),
  ...(buildingId ? { building: buildingId } : {}),
  ...(input.clientId ? { clientId: input.clientId } : {}),
  ...(input.assignedToId || input.assignedTo
    ? { assignedTo: input.assignedToId || input.assignedTo }
    : {}),
  ...(input.categoryId
    ? {
        category: {
          categoryId: input.categoryId,
          subCategory: input.subCategory || '',
        },
      }
    : {}),
});

const paymentLinkFrom = (payload: Record<string, unknown>) => {
  const data = unwrapData(payload);
  return text(data.short_url || data.shortUrl || data.url);
};

const normalizeSessionUser = (
  payload: Record<string, unknown>,
  fallback?: SessionUser | null,
): SessionUser => {
  const source = unwrapData(payload);
  const rawUser =
    source.user && typeof source.user === 'object'
      ? (source.user as Record<string, unknown>)
      : source;
  const assignedBuildings = Array.isArray(rawUser.buildings)
    ? rawUser.buildings
    : [];
  const rawBuilding =
    rawUser.building ||
    source.building ||
    assignedBuildings[0] ||
    rawUser.buildingId ||
    source.buildingId;
  const building =
    rawBuilding && typeof rawBuilding === 'object'
      ? (rawBuilding as Record<string, unknown>)
      : undefined;
  const role =
    rawUser.role && typeof rawUser.role === 'object'
      ? displayName(rawUser.role)
      : text(rawUser.role);
  return {
    id: text(rawUser._id || rawUser.id) || fallback?.id || '',
    name: displayName(rawUser) || fallback?.name || '',
    email: text(rawUser.email) || fallback?.email || '',
    phone: text(rawUser.phone || rawUser.mobile) || fallback?.phone || '',
    role: role || fallback?.role || 'Community Manager',
    buildingId:
      objectId(
        rawUser.buildingId || source.buildingId || building || rawBuilding,
      ) ||
      fallback?.buildingId ||
      '',
    buildingName:
      text(rawUser.buildingName || source.buildingName) ||
      displayName(building) ||
      fallback?.buildingName ||
      '',
  };
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
      Keychain.getGenericPassword({ service: AUTH_SERVICE }).catch(
        () => false as const,
      ),
      AsyncStorage.getItem(LEGACY_DEMO_SESSION_KEY).catch(() => null),
    ])
      .then(([value, credentials, demoSession]) => {
        let saved: Partial<AppState> & { demoSession?: boolean } = {};
        let secureSession: Partial<
          Pick<AppState, 'authenticated' | 'token' | 'user'>
        > = {};
        let storedSession: Partial<
          Pick<AppState, 'authenticated' | 'token' | 'user'>
        > = {};

        try {
          saved = value
            ? (JSON.parse(value) as Partial<AppState> & {
                demoSession?: boolean;
              })
            : {};
        } catch {
          saved = {};
        }

        if (credentials) {
          try {
            storedSession = JSON.parse(credentials.password) as Pick<
              AppState,
              'authenticated' | 'token' | 'user'
            >;
          } catch {
            storedSession = {};
          }
        }

        const { demoSession: savedDemoSession, ...savedState } = saved;
        const hadDemoSession =
          demoSession === 'true' ||
          Boolean(savedDemoSession) ||
          storedSession.token === 'offline-demo';
        secureSession = hadDemoSession ? {} : storedSession;

        const hydratedSaved = hadDemoSession
          ? {
              ...savedState,
              authenticated: false,
              token: null,
              user: null,
              tickets: [],
              visitors: [],
              onDemandUsers: [],
              dayPasses: [],
              bookings: [],
              meetingRooms: [],
              members: [],
              companies: [],
              cabins: [],
              events: [],
              notifications: [],
              leads: [],
              rfidCards: [],
              printerRequests: [],
              posts: [],
              commonAreas: [],
              pendingOperations: [],
            }
          : savedState;
        if (hadDemoSession)
          AsyncStorage.removeItem(LEGACY_DEMO_SESSION_KEY).catch(
            () => undefined,
          );
        setState(current => ({
          ...current,
          ...hydratedSaved,
          ...secureSession,
          hydrated: true,
          sessionValidated: !secureSession.authenticated,
          connection: 'checking',
        }));
      })
      .catch(() =>
        setState(current => ({
          ...current,
          hydrated: true,
          sessionValidated: true,
          connection: 'offline',
        })),
      );
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setApiSession(null, null);
      setState(current => ({
        ...current,
        authenticated: false,
        sessionValidated: true,
        token: null,
        user: null,
        connection: 'offline',
        syncError: 'Your session expired. Please sign in again.',
      }));
      Keychain.resetGenericPassword({ service: AUTH_SERVICE }).catch(
        () => undefined,
      );
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (
      !state.hydrated ||
      !state.authenticated ||
      !state.token ||
      state.sessionValidated
    )
      return;
    let cancelled = false;
    setApiSession(state.token, state.user?.buildingId || null);
    apiClient
      .get<Record<string, unknown>>(Routes.auth.me)
      .then(response => {
        if (cancelled) return;
        const user = normalizeSessionUser(response, state.user);
        setApiSession(state.token, user.buildingId || null);
        setState(current => ({
          ...current,
          user,
          sessionValidated: true,
          connection: 'online',
          syncError: null,
        }));
      })
      .catch(error => {
        if (cancelled || (error instanceof ApiError && error.status === 401))
          return;
        setApiSession(null, null);
        setState(current => ({
          ...current,
          authenticated: false,
          sessionValidated: true,
          token: null,
          user: null,
          connection: 'offline',
          syncError:
            error instanceof Error
              ? error.message
              : 'Could not validate your session.',
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [
    state.authenticated,
    state.hydrated,
    state.sessionValidated,
    state.token,
    state.user,
  ]);

  useEffect(() => {
    if (!state.hydrated) return;
    setApiSession(state.token, state.user?.buildingId || null);
    const persistable = {
      ...state,
      hydrated: undefined,
      connection: undefined,
      syncError: undefined,
      authenticated: undefined,
      token: undefined,
      user: undefined,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(
      () => undefined,
    );
  }, [state]);

  useEffect(() => {
    if (!state.hydrated) return;
    if (!state.authenticated || !state.token || !state.user) {
      Keychain.resetGenericPassword({ service: AUTH_SERVICE }).catch(
        () => undefined,
      );
      return;
    }
    Keychain.setGenericPassword(
      'session',
      JSON.stringify({
        authenticated: state.authenticated,
        token: state.token,
        user: state.user,
      }),
      {
        service: AUTH_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    ).catch(() => undefined);
  }, [state.authenticated, state.hydrated, state.token, state.user]);

  useEffect(() => {
    if (
      !state.hydrated ||
      !state.authenticated ||
      !state.token ||
      !state.user?.buildingId ||
      state.user.buildingName
    )
      return;
    let cancelled = false;
    apiClient
      .get<unknown>(Routes.community.buildings)
      .then(payload => {
        const building = extractList<Record<string, unknown>>(payload, [
          'buildings',
        ]).find(item => objectId(item) === state.user?.buildingId);
        const buildingName = displayName(building);
        if (!cancelled && buildingName) {
          setState(current =>
            current.user
              ? { ...current, user: { ...current.user, buildingName } }
              : current,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [
    state.authenticated,
    state.hydrated,
    state.token,
    state.user?.buildingId,
    state.user?.buildingName,
  ]);

  const replaceCollection = useCallback(
    <K extends CollectionKey>(key: K, value: AppState[K]) => {
      setState(current => ({ ...current, [key]: value }));
    },
    [],
  );

  const queueOperation = useCallback(
    (operation: Omit<PendingOperation, 'id'>) => {
      setState(current => ({
        ...current,
        connection: 'offline',
        pendingOperations: [
          ...current.pendingOperations,
          { ...operation, id: makeId('OP') },
        ],
      }));
    },
    [],
  );

  const performMutation = useCallback(
    async (operation: Omit<PendingOperation, 'id'>) => {
      try {
        const method = operation.method.toLowerCase() as
          | 'post'
          | 'patch'
          | 'put'
          | 'delete';
        if (method === 'delete') await apiClient.delete(operation.path);
        else await apiClient[method](operation.path, operation.body);
        setState(current => ({
          ...current,
          connection: 'online',
          syncError: null,
        }));
        return true;
      } catch (error) {
        if (
          Environment.allowOfflineFallback &&
          error instanceof ApiError &&
          error.offline
        ) {
          queueOperation(operation);
          return false;
        }
        throw error;
      }
    },
    [queueOperation],
  );

  const sendOtp = useCallback(async (phone: string) => {
    await apiClient.post(Routes.auth.sendOtp, { phone });
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    const response = await apiClient.post<Record<string, unknown>>(
      Routes.auth.login,
      { phone, otp },
    );
    const data = unwrapData(response);
    const token = text(
      data.accessToken || data.token || response.accessToken || response.token,
    );
    const hasUser = data.user && typeof data.user === 'object';
    if (!token || !hasUser)
      throw new Error('The server returned an incomplete session.');
    const user = normalizeSessionUser(data);
    setApiSession(token, user.buildingId);
    setState(current => ({
      ...current,
      authenticated: true,
      sessionValidated: true,
      token,
      user,
      connection: 'online',
      syncError: null,
    }));
  }, []);

  const register = useCallback(
    async (_details: {
      name: string;
      email: string;
      phone: string;
      password: string;
      company?: string;
      city?: string;
      buildingId?: string;
    }) => {
      throw new Error(
        'Account registration is handled by the signup link on the login screen.',
      );
    },
    [],
  );

  const logout = useCallback(async () => {
    setApiSession(null, null);
    setState(current => ({
      ...current,
      authenticated: false,
      sessionValidated: true,
      token: null,
      user: null,
    }));
    await Promise.all([
      Keychain.resetGenericPassword({ service: AUTH_SERVICE }).catch(
        () => false,
      ),
      AsyncStorage.removeItem(LEGACY_DEMO_SESSION_KEY).catch(() => undefined),
    ]);
  }, []);

  const syncAll = useCallback(async () => {
    setState(current => ({
      ...current,
      connection: 'checking',
      syncError: null,
    }));
    try {
      const remainingOperations: PendingOperation[] = [];
      for (const operation of stateRef.current.pendingOperations) {
        try {
          const method = operation.method.toLowerCase() as
            | 'post'
            | 'patch'
            | 'put'
            | 'delete';
          if (method === 'delete') await apiClient.delete(operation.path);
          else await apiClient[method](operation.path, operation.body);
        } catch {
          remainingOperations.push(operation);
        }
      }
      const collectionResults = await Promise.allSettled([
        apiClient.get(Routes.community.dashboard),
        apiClient.get(Routes.community.tickets, { limit: 100 }),
        apiClient.get(Routes.community.visitors, { limit: 100 }),
        apiClient.get(Routes.community.guests, {
          page: 1,
          limit: 100,
          sortBy: 'createdAt:desc',
        }),
        apiClient.get(Routes.community.dayPasses, { limit: 100 }),
        apiClient.get(Routes.community.meetingBookings, { limit: 100 }),
        apiClient.get(Routes.community.meetingRooms),
        apiClient.get(Routes.community.members),
        apiClient.get(Routes.community.clients, { limit: 100 }),
        apiClient.get(Routes.community.cabins),
        apiClient.get(Routes.community.events, { limit: 100 }),
        apiClient.get(Routes.community.leads, { page: 1, limit: 100 }),
        apiClient.get(Routes.community.rfidCards, { page: 1, limit: 100 }),
        apiClient.get(Routes.community.printerRequests),
        apiClient.get(Routes.community.commonAreas),
        apiClient.get(Routes.community.buildings),
      ]);
      const failedCollections = collectionResults.filter(
        result => result.status === 'rejected',
      );
      if (failedCollections.length === collectionResults.length) {
        throw (failedCollections[0] as PromiseRejectedResult).reason;
      }
      const valueAt = (index: number): unknown | null => {
        const result = collectionResults[index];
        return result.status === 'fulfilled' ? result.value : null;
      };
      const [
        dashboard,
        tickets,
        visitors,
        guests,
        dayPasses,
        bookings,
        meetingRooms,
        members,
        companies,
        cabins,
        events,
        leads,
        cards,
        printers,
        areas,
        buildings,
      ] = collectionResults.map((_, index) => valueAt(index));
      const nextTickets =
        tickets === null
          ? null
          : extractList<Record<string, unknown>>(tickets, ['tickets']).map(
              normalizeTicket,
            );
      const nextVisitors =
        visitors === null
          ? null
          : extractList<Record<string, unknown>>(visitors, ['visitors']).map(
              normalizeVisitor,
            );
      const nextOnDemandUsers =
        guests === null
          ? null
          : extractList<Record<string, unknown>>(guests, ['guests']).map(
              normalizeOnDemandUser,
            );
      const nextPasses =
        dayPasses === null
          ? null
          : extractList<Record<string, unknown>>(dayPasses, [
              'dayPasses',
              'bookings',
            ]).map(normalizeDayPass);
      const passCustomers = nextOnDemandUsers ?? stateRef.current.onDemandUsers;
      const hydratedPasses = nextPasses?.map(pass => {
        const customer = pass.customerId
          ? passCustomers.find(item => item.id === pass.customerId)
          : undefined;
        return customer
          ? {
              ...pass,
              name: pass.name || customer.name,
              email: pass.email || customer.email,
              phone: pass.phone || customer.phone,
              company: pass.company || customer.company,
            }
          : pass;
      });
      const nextBookings =
        bookings === null
          ? null
          : extractList<Record<string, unknown>>(bookings, ['bookings']).map(
              normalizeBooking,
            );
      const nextMeetingRooms =
        meetingRooms === null
          ? null
          : extractList<Record<string, unknown>>(meetingRooms, [
              'meetingRooms',
              'rooms',
            ]).map(normalizeMeetingRoom);
      const nextCompanies =
        companies === null
          ? null
          : extractList<Record<string, unknown>>(companies, ['clients']).map(
              normalizeCompany,
            );
      const nextMembers =
        members === null
          ? null
          : extractList<Record<string, unknown>>(members, ['members']).map(
              normalizeMember,
            );
      const hydratedMembers = nextMembers
        ? resolveMemberCompanyNames(
            nextMembers,
            nextCompanies ?? stateRef.current.companies,
          )
        : nextCompanies
        ? resolveMemberCompanyNames(stateRef.current.members, nextCompanies)
        : null;
      const hydratedBookings = nextBookings
        ? hydrateRoomBookingRelations(
            nextBookings,
            hydratedMembers ?? stateRef.current.members,
            nextOnDemandUsers ?? stateRef.current.onDemandUsers,
            nextCompanies ?? stateRef.current.companies,
            nextMeetingRooms ?? stateRef.current.meetingRooms,
          )
        : null;
      const hydratedTickets = nextTickets?.map(ticket => {
        const previous = stateRef.current.tickets.find(
          item =>
            item.id === ticket.id ||
            (item.backendId && item.backendId === ticket.backendId),
        );
        const creator = (hydratedMembers ?? stateRef.current.members).find(
          item => item.id === ticket.createdById,
        );
        const company = (nextCompanies ?? stateRef.current.companies).find(
          item => item.id === ticket.clientId,
        );
        return {
          ...ticket,
          memberName:
            ticket.memberName ||
            creator?.name ||
            (ticket.createdById === stateRef.current.user?.id
              ? stateRef.current.user?.name
              : '') ||
            previous?.memberName ||
            '',
          company: ticket.company || company?.name || previous?.company || '',
          assignedTo: ticket.assignedTo || previous?.assignedTo,
          assignedToId: ticket.assignedToId || previous?.assignedToId,
          attachmentName:
            ticket.attachmentName || previous?.attachmentName,
          attachmentUrl: ticket.attachmentUrl || previous?.attachmentUrl,
        };
      });
      setState(current => ({
        ...current,
        connection: 'online',
        lastSyncedAt: new Date().toISOString(),
        syncError: remainingOperations.length
          ? `${remainingOperations.length} changes could not be synchronized.`
          : failedCollections.length
          ? `${failedCollections.length} data sections could not be refreshed.`
          : null,
        pendingOperations: remainingOperations,
        dashboardSummary:
          dashboard === null
            ? current.dashboardSummary
            : normalizeDashboardSummary(dashboard),
        tickets: hydratedTickets ?? current.tickets,
        visitors: nextVisitors ?? current.visitors,
        onDemandUsers: nextOnDemandUsers ?? current.onDemandUsers,
        dayPasses: hydratedPasses ?? current.dayPasses,
        bookings: hydratedBookings ?? current.bookings,
        meetingRooms: nextMeetingRooms ?? current.meetingRooms,
        members: hydratedMembers ?? current.members,
        companies: nextCompanies ?? current.companies,
        cabins:
          cabins === null
            ? current.cabins
            : extractList<Record<string, unknown>>(cabins, ['cabins']).map(
                normalizeCabin,
              ),
        events:
          events === null
            ? current.events
            : extractList<Record<string, unknown>>(events, ['events']).map(
                rawEvent => {
                  const normalizedEvent = normalizeEvent(rawEvent);
                  const cachedEvent = current.events.find(
                    event => event.id === normalizedEvent.id,
                  );
                  return cachedEvent
                    ? mergeEventSelections(cachedEvent, normalizedEvent)
                    : normalizedEvent;
                },
              ),
        leads:
          leads === null
            ? current.leads
            : extractList<Record<string, unknown>>(leads, ['leads']).map(
                normalizeLead,
              ),
        rfidCards:
          cards === null
            ? current.rfidCards
            : extractList<Record<string, unknown>>(cards, ['cards']).map(
                normalizeRfidCard,
              ),
        printerRequests:
          printers === null
            ? current.printerRequests
            : extractList<Record<string, unknown>>(printers, ['requests']).map(
                normalizePrinter,
              ),
        commonAreas:
          areas === null
            ? current.commonAreas
            : extractList<Record<string, unknown>>(areas, ['areas']).map(
                normalizeArea,
              ),
        buildings:
          buildings === null
            ? current.buildings
            : extractList<Record<string, unknown>>(buildings, ['buildings'])
                .map(item => ({
                  id: objectId(item),
                  name: displayName(item) || text(item.code),
                }))
                .filter(item => item.id && item.name),
      }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setState(current => ({
          ...current,
          authenticated: false,
          token: null,
          user: null,
          connection: 'offline',
          syncError: 'Your session expired. Please sign in again.',
        }));
      } else {
        setState(current => ({
          ...current,
          connection: 'offline',
          syncError:
            error instanceof Error ? error.message : 'Unable to synchronize.',
        }));
      }
    }
  }, []);

  const resetLocalData = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    const current = stateRef.current;
    const resetState: AppState = {
      ...initialState,
      hydrated: true,
      sessionValidated: true,
      authenticated: current.authenticated,
      token: current.token,
      user: current.user,
      connection: 'checking',
    };
    stateRef.current = resetState;
    setState(resetState);
    await syncAll();
  }, [syncAll]);

  const createTicket = useCallback(
    async (input: NewTicket) => {
      const buildingId = stateRef.current.user?.buildingId;
      if (!buildingId)
        throw new Error('Your account does not have a selected building.');
      const { attachment, ...ticketInput } = input;
      const body = toTicketPayload(ticketInput, buildingId);
      try {
        const requestBody: Record<string, unknown> | FormData = attachment
          ? (() => {
              const form = new FormData();
              appendMultipartFields(form, body);
              appendMultipartFile(form, 'attachment', attachment);
              return form;
            })()
          : body;
        const response = await apiClient.post<Record<string, unknown>>(
          Routes.community.tickets,
          requestBody,
          attachment
            ? {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: UPLOAD_TIMEOUT_MS,
              }
            : undefined,
        );
        const data = unwrapData(response);
        const raw =
          data.ticket && typeof data.ticket === 'object'
            ? (data.ticket as Record<string, unknown>)
            : data;
        const normalized = normalizeTicket(raw);
        const record: Ticket = {
          ...ticketInput,
          ...normalized,
          memberName:
            normalized.memberName ||
            ticketInput.memberName ||
            stateRef.current.user?.name ||
            '',
          company: normalized.company || ticketInput.company,
          clientId: normalized.clientId || ticketInput.clientId,
          assignedTo: normalized.assignedTo || ticketInput.assignedTo,
          assignedToId:
            normalized.assignedToId || ticketInput.assignedToId,
          attachmentName:
            normalized.attachmentName || attachment?.name || undefined,
          syncState: 'synced',
        };
        setState(current => ({
          ...current,
          tickets: [
            record,
            ...current.tickets.filter(item => item.id !== record.id),
          ],
        }));
        return record;
      } catch (error) {
        if (
          !(
            Environment.allowOfflineFallback &&
            error instanceof ApiError &&
            error.offline
          )
        )
          throw error;
        const record: Ticket = {
          ...ticketInput,
          attachmentName: attachment?.name,
          id: makeId('T'),
          createdAt: new Date().toISOString(),
          syncState: 'pending',
        };
        replaceCollection('tickets', [record, ...stateRef.current.tickets]);
        queueOperation({
          method: 'POST',
          path: Routes.community.tickets,
          body,
        });
        return record;
      }
    },
    [queueOperation, replaceCollection],
  );

  const selectBuilding = useCallback(
    async (buildingId: string) => {
      const building = stateRef.current.buildings.find(
        item => item.id === buildingId,
      );
      if (!building || !stateRef.current.user)
        throw new Error('That building is not available for this account.');
      const nextUser = {
        ...stateRef.current.user,
        buildingId: building.id,
        buildingName: building.name,
      };
      setApiSession(stateRef.current.token, building.id);
      stateRef.current = { ...stateRef.current, user: nextUser };
      setState(current => ({ ...current, user: nextUser }));
      await syncAll();
    },
    [syncAll],
  );

  const updateTicket = useCallback(
    async (id: string, patch: Partial<Ticket>) => {
      const previous = stateRef.current.tickets.find(
        item => item.id === id || item.backendId === id,
      );
      if (!previous)
        throw new Error('The ticket record is no longer available.');
      const backendId = previous.backendId || id;
      setState(current => ({
        ...current,
        tickets: current.tickets.map(item =>
          item.id === id || item.backendId === id
            ? { ...item, ...patch, syncState: 'pending' }
            : item,
        ),
      }));
      try {
        const synced = await performMutation({
          method: 'PATCH',
          path: Routes.ticket(backendId),
          body: toTicketPayload(patch),
        });
        if (synced)
          setState(current => ({
            ...current,
            tickets: current.tickets.map(item =>
              item.id === previous.id ? { ...item, syncState: 'synced' } : item,
            ),
          }));
      } catch (error) {
        setState(current => ({
          ...current,
          tickets: current.tickets.map(item =>
            item.id === previous.id ? previous : item,
          ),
        }));
        throw error;
      }
    },
    [performMutation],
  );

  const deleteTicket = useCallback(
    async (id: string) => {
      const previousTickets = stateRef.current.tickets;
      const ticket = previousTickets.find(
        item => item.id === id || item.backendId === id,
      );
      if (!ticket) throw new Error('The ticket record is no longer available.');
      setState(current => ({
        ...current,
        tickets: current.tickets.filter(item => item.id !== ticket.id),
      }));
      try {
        await performMutation({
          method: 'DELETE',
          path: Routes.ticket(ticket.backendId || id),
        });
      } catch (error) {
        setState(current => ({ ...current, tickets: previousTickets }));
        throw error;
      }
    },
    [performMutation],
  );

  const inviteVisitor = useCallback(async (input: NewVisitor) => {
    const buildingId = stateRef.current.user?.buildingId;
    if (!buildingId || !input.hostId)
      throw new Error('Select a building and host before inviting a visitor.');
    const phoneDigits = normalizeIndianPhone(input.phone);
    const response = await apiClient.post<Record<string, unknown>>(
      Routes.community.visitors,
      {
        name: input.name.trim(),
        ...(input.email.trim() ? { email: input.email.trim() } : {}),
        ...(phoneDigits ? { phone: `+91${phoneDigits}` } : {}),
        ...(input.company.trim() ? { companyName: input.company.trim() } : {}),
        ...(input.purpose.trim() ? { purpose: input.purpose.trim() } : {}),
        hostMemberId: input.hostId,
        expectedVisitDate: input.visitDate,
        expectedArrivalTime: toIsoDateTime(input.visitDate, input.arrivalTime),
        building: buildingId,
      },
    );
    const raw = unwrapData(response);
    const source =
      raw.visitor && typeof raw.visitor === 'object'
        ? (raw.visitor as Record<string, unknown>)
        : raw;
    const normalized = normalizeVisitor(source);
    const record: Visitor = {
      ...input,
      ...normalized,
      id: normalized.id || makeId('V'),
      status: normalized.status || 'Expected',
      syncState: 'synced',
    };
    setState(current => ({
      ...current,
      visitors: [
        record,
        ...current.visitors.filter(item => item.id !== record.id),
      ],
    }));
    return record;
  }, []);

  const setVisitorStatus = useCallback(
    async (id: string, status: Visitor['status'], badgeId?: string) => {
      const currentVisitor = stateRef.current.visitors.find(
        item => item.id === id,
      );
      if (!currentVisitor)
        throw new Error('The visitor record is no longer available.');
      let response: Record<string, unknown>;
      if (
        status === 'Checked In' &&
        currentVisitor.backendStatus === 'pending_checkin'
      ) {
        response = await apiClient.post<Record<string, unknown>>(
          Routes.approveVisitorCheckin(id),
        );
      } else if (status === 'Checked In') {
        response = await apiClient.patch<Record<string, unknown>>(
          Routes.checkinVisitor(id),
          {
            ...(badgeId?.trim() ? { badgeId: badgeId.trim() } : {}),
          },
        );
      } else if (status === 'Checked Out') {
        response = await apiClient.patch<Record<string, unknown>>(
          Routes.checkoutVisitor(id),
          {},
        );
      } else {
        throw new Error(
          'That visitor state change is not supported by the Community API.',
        );
      }
      const data = unwrapData(response);
      const raw =
        data.visitor && typeof data.visitor === 'object'
          ? (data.visitor as Record<string, unknown>)
          : data;
      const updated = normalizeVisitor(raw);
      setState(current => ({
        ...current,
        visitors: current.visitors.map(item =>
          item.id === id
            ? { ...item, ...updated, id, syncState: 'synced' }
            : item,
        ),
      }));
    },
    [],
  );

  const scanVisitorToken = useCallback(
    async (token: string, details?: { badgeId?: string; notes?: string }) => {
      const normalized = token.trim();
      if (!normalized) throw new Error('Enter a visitor invitation code.');
      const badgeId = details?.badgeId?.trim();
      const notes = details?.notes?.trim();
      const response = await apiClient.post<Record<string, unknown>>(
        Routes.community.scanVisitor,
        {
          token: normalized,
          ...(badgeId ? { badgeId } : {}),
          ...(notes ? { notes } : {}),
        },
      );
      const rawResponse =
        response.data && typeof response.data === 'object'
          ? response.data
          : response;
      const raw = rawResponse as Record<string, unknown>;
      const visitor = normalizeVisitor(
        raw.visitor && typeof raw.visitor === 'object'
          ? (raw.visitor as Record<string, unknown>)
          : raw,
      );
      if (!visitor.id)
        throw new Error('The scan API returned an incomplete visitor record.');
      const existingVisitor = stateRef.current.visitors.find(
        item => item.id === visitor.id,
      );
      const mergedVisitor = existingVisitor
        ? { ...existingVisitor, ...visitor }
        : visitor;
      setState(current => ({
        ...current,
        visitors: current.visitors.some(item => item.id === mergedVisitor.id)
          ? current.visitors.map(item =>
              item.id === mergedVisitor.id ? mergedVisitor : item,
            )
          : [mergedVisitor, ...current.visitors],
      }));
      return mergedVisitor;
    },
    [],
  );

  const createBooking = useCallback(async (input: NewBooking) => {
    if (!input.roomId) throw new Error('Select a meeting room before booking.');
    const paymentMethod = input.paymentMethod || 'razorpay';
    const discountPercent = Math.max(
      0,
      Math.min(100, Number(input.discountPercent) || 0),
    );
    const response = await apiClient.post<Record<string, unknown>>(
      Routes.community.meetingBookings,
      {
        room: input.roomId,
        ...(input.clientId ? { client: input.clientId } : {}),
        ...(input.memberId ? { memberId: input.memberId } : {}),
        ...(input.guestId ? { guestId: input.guestId } : {}),
        start: toApiLocalDateTime(input.date, input.startTime),
        end: toApiLocalDateTime(input.date, input.endTime),
        amenitiesRequested: [],
        notes: input.purpose,
        idempotencyKey: `community-mobile-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`,
        paymentMethod,
        ...(paymentMethod !== 'credits' && discountPercent > 0
          ? {
              discount: {
                percent: discountPercent,
                reason:
                  input.discountReason?.trim() ||
                  'Community promotional discount',
              },
              usingDefaultBuildingDiscount:
                input.usingDefaultBuildingDiscount !== false,
            }
          : {}),
      },
    );
    const data =
      response.data && typeof response.data === 'object'
        ? (response.data as Record<string, unknown>)
        : response;
    const bookingData = (
      data.booking && typeof data.booking === 'object' ? data.booking : data
    ) as Record<string, unknown>;
    const raw = {
      ...bookingData,
      discountStatus: bookingData.discountStatus || data.discountStatus,
      status: bookingData.status || data.status,
    };
    const record: RoomBooking = mergeBookingDetails(
      input,
      normalizeBooking(raw),
    );
    const approvalPending =
      record.discountStatus === 'pending' ||
      normalizeStatus(record.status) === 'approval pending';
    if (paymentMethod === 'razorpay' && !approvalPending && record.id) {
      try {
        const order = await apiClient.post<Record<string, unknown>>(
          Routes.razorpayCreateOrder,
          {
            meetingBookingId: record.id,
            ...(record.clientId ? { clientId: record.clientId } : {}),
          },
        );
        record.paymentOrder = paymentOrderFrom(order);
        if (!record.paymentOrder) {
          const payment = await apiClient.post<Record<string, unknown>>(
            Routes.razorpayCreatePaymentLink,
            { meetingBookingId: record.id },
          );
          record.paymentUrl = paymentLinkFrom(payment) || undefined;
        }
      } catch {
        /* The booking remains valid; payment can be retried from its backend record. */
      }
    }
    setState(current => ({
      ...current,
      bookings: [
        record,
        ...current.bookings.filter(item => item.id !== record.id),
      ],
    }));
    return record;
  }, []);

  const createDayPass = useCallback(async (input: NewDayPass) => {
    const recipientId =
      input.purchaseType === 'member' ? input.memberId : input.customerId;
    const buildingId = input.buildingId || stateRef.current.user?.buildingId;
    if (!recipientId || !buildingId)
      throw new Error('Select a recipient and building before booking.');
    const paymentMethod = input.paymentMethod || 'credits';
    const response = await apiClient.post<Record<string, unknown>>(
      `${Routes.community.dayPasses}/single`,
      createDayPassPurchasePayload(input, buildingId),
      { headers: { 'X-Ofis-Building-Ids': buildingId } },
    );
    const data =
      response.data && typeof response.data === 'object'
        ? (response.data as Record<string, unknown>)
        : response;
    const dayPassData = (
      data.dayPass && typeof data.dayPass === 'object' ? data.dayPass : data
    ) as Record<string, unknown>;
    const raw = {
      ...dayPassData,
      discountStatus: dayPassData.discountStatus || data.discountStatus,
      status: dayPassData.status || data.status,
    };
    const record = mergeCreatedDayPass(input, normalizeDayPass(raw));
    if (
      paymentMethod === 'razorpay' &&
      record.discountStatus !== 'pending' &&
      record.id
    ) {
      try {
        const order = await apiClient.post<Record<string, unknown>>(
          Routes.razorpayCreateOrder,
          { dayPassId: record.id },
        );
        record.paymentOrder = paymentOrderFrom(order);
        if (!record.paymentOrder) {
          const payment = await apiClient.post<Record<string, unknown>>(
            Routes.razorpayCreatePaymentLink,
            { dayPassId: record.id },
          );
          record.paymentUrl = paymentLinkFrom(payment) || undefined;
        }
      } catch {
        /* The created pass remains valid if payment-link generation is temporarily unavailable. */
      }
    }
    setState(current => ({
      ...current,
      dayPasses: [
        record,
        ...current.dayPasses.filter(item => item.id !== record.id),
      ],
    }));
    return record;
  }, []);

  const createDayPassBundle = useCallback(
    async ({
      count,
      paymentMethod,
      discountBundleId,
      discountBundleOptionId: _discountBundleOptionId,
      ...input
    }: NewDayPassBundle) => {
      const customerId = input.customerId;
      const buildingId = input.buildingId || stateRef.current.user?.buildingId;
      if (!customerId || !buildingId)
        throw new Error('Select a customer and building before booking.');
      const safeCount = Math.max(1, Math.min(100, count));
      const discountPercent = Math.max(
        0,
        Math.min(100, Number(input.discountPercent) || 0),
      );
      const response = await apiClient.post<Record<string, unknown>>(
        `${Routes.community.dayPasses}/bundles`,
        {
          customerId,
          buildingId,
          discountBundleId,
          no_of_dayPasses: safeCount,
          paymentMethod,
          idempotencyKey: createCommunityIdempotencyKey('day-pass-bundle'),
          ...(paymentMethod !== 'credits' && discountPercent > 0
            ? {
                discount: {
                  percent: discountPercent,
                  reason:
                    input.discountReason?.trim() ||
                    'Community promotional discount',
                },
                usingDefaultBuildingDiscount: true,
              }
            : {}),
        },
        { headers: { 'X-Ofis-Building-Ids': buildingId } },
      );
      const data =
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : response;
      const bundle =
        data.bundle && typeof data.bundle === 'object'
          ? (data.bundle as Record<string, unknown>)
          : data;
      const rawPasses = extractList<Record<string, unknown>>(bundle, [
        'dayPasses',
        'passes',
      ]);
      const bundleDiscountStatus = bundle.discountStatus || data.discountStatus;
      const bundleStatus = bundle.status || data.status;
      const records: DayPass[] = rawPasses.length
        ? rawPasses.map(raw =>
            normalizeDayPass({
              ...raw,
              discountStatus: raw.discountStatus || bundleDiscountStatus,
              status: raw.status || bundleStatus,
            }),
          )
        : [
            {
              ...input,
              ...normalizeDayPass({
                ...bundle,
                discountStatus: bundleDiscountStatus,
                status: bundleStatus,
              }),
              passType: `${input.passType} bundle`,
            },
          ];
      const bundleId = objectId(bundle);
      if (bundleId)
        records.forEach(record => {
          record.bundleId = bundleId;
        });
      if (
        paymentMethod === 'razorpay' &&
        normalizeStatus(bundleDiscountStatus) !== 'pending' &&
        bundleId
      ) {
        try {
          const order = await apiClient.post<Record<string, unknown>>(
            Routes.razorpayCreateOrder,
            { bundleId },
          );
          const paymentOrder = paymentOrderFrom(order);
          if (paymentOrder)
            records.forEach(record => {
              record.paymentOrder = paymentOrder;
            });
          else {
            const payment = await apiClient.post<Record<string, unknown>>(
              Routes.razorpayCreatePaymentLink,
              { bundleId },
            );
            const paymentUrl = paymentLinkFrom(payment) || undefined;
            records.forEach(record => {
              record.paymentUrl = paymentUrl;
            });
          }
        } catch {
          /* The created bundle remains valid if payment-link generation is temporarily unavailable. */
        }
      }
      setState(current => ({
        ...current,
        dayPasses: [
          ...records,
          ...current.dayPasses.filter(
            item => !records.some(record => record.id === item.id),
          ),
        ],
      }));
      return records;
    },
    [],
  );

  const checkDayPassAvailability = useCallback(async (date: string, requestedBuildingId?: string) => {
    const buildingId = requestedBuildingId || stateRef.current.user?.buildingId;
    if (!buildingId)
      throw new Error('Select a building before checking availability.');
    const response = await apiClient.get<Record<string, unknown>>(
      `${Routes.community.dayPasses}/availability`,
      { buildingId, date },
      { headers: { 'X-Ofis-Building-Ids': buildingId } },
    );
    const raw =
      response.data && typeof response.data === 'object'
        ? (response.data as Record<string, unknown>)
        : response;
    const capacity = Number(raw.capacity || raw.totalCapacity || 0);
    const available = Number(
      raw.available ||
        raw.remaining ||
        Math.max(0, capacity - Number(raw.booked || 0)),
    );
    return { capacity, available };
  }, []);

  const updateDayPass = useCallback(
    async (id: string, patch: Partial<DayPass>) => {
      const pass = stateRef.current.dayPasses.find(item => item.id === id);
      if (!pass) throw new Error('The day-pass record is no longer available.');
      if (patch.status === 'Checked In') {
        const response = await apiClient.post<Record<string, unknown>>(
          Routes.provisionDayPassAccess(id),
        );
        const data = unwrapData(response);
        const raw =
          data.dayPass && typeof data.dayPass === 'object'
            ? (data.dayPass as Record<string, unknown>)
            : data;
        const backendPatch =
          raw._id || raw.id || raw.status ? normalizeDayPass(raw) : {};
        setState(current => ({
          ...current,
          dayPasses: current.dayPasses.map(item =>
            item.id === id
              ? { ...item, ...backendPatch, id, syncState: 'synced' }
              : item,
          ),
        }));
        return;
      }
      if (patch.rfidCard) {
        if (!pass.phone)
          throw new Error(
            'This day-pass customer has no phone number for Matrix access lookup.',
          );
        const matrixResponse = await apiClient.get<Record<string, unknown>>(
          Routes.matrixUserByPhone,
          { phone: pass.phone },
        );
        const matrixData = unwrapData(matrixResponse);
        const matrixUser =
          matrixData.user && typeof matrixData.user === 'object'
            ? (matrixData.user as Record<string, unknown>)
            : matrixData;
        const matrixUserId = objectId(matrixUser);
        if (!matrixUserId)
          throw new Error('No Matrix access user was found for this customer.');
        await apiClient.post(Routes.setMatrixCard(matrixUserId), {
          rfidCardId: patch.rfidCard,
          dayPassId: id,
        });
        setState(current => ({
          ...current,
          dayPasses: current.dayPasses.map(item =>
            item.id === id ? { ...item, ...patch, syncState: 'synced' } : item,
          ),
        }));
        return;
      }
      throw new Error(
        'That day-pass change is not supported by the documented Community API.',
      );
    },
    [],
  );

  const updateMember = useCallback(
    async (_id: string, _patch: Partial<Member>) => {
      throw new Error(
        'Member updates are not supported by the documented Community API.',
      );
    },
    [],
  );

  const createEvent = useCallback(async (input: NewEvent) => {
    const {
      coverImageFile,
      additionalImageFile,
      speakerImageFiles,
      ...fields
    } = input;
    const buildingId = fields.buildingId || stateRef.current.user?.buildingId;
    if (
      !buildingId ||
      !fields.description ||
      !fields.categoryId ||
      !fields.startTime ||
      !fields.endTime
    ) {
      throw new Error(
        'Event description, category, start/end time, and building are required.',
      );
    }
    const draft: EventRecord = {
      ...fields,
      coverImage: coverImageFile?.uri || fields.coverImage,
      additionalImage: additionalImageFile?.uri || fields.additionalImage,
      id: makeId('E'),
      rsvpCount: 0,
      status: 'Draft',
      syncState: 'pending',
    };
    const form = new FormData();
    appendMultipartFields(form, {
      title: fields.title,
      description: fields.description,
      category: fields.categoryId,
      ...(fields.subcategoryId ? { subcategory: fields.subcategoryId } : {}),
      startDate: toIsoDateTime(fields.date, fields.startTime),
      endDate: toIsoDateTime(fields.date, fields.endTime),
      capacity: fields.capacity,
      status: 'draft',
      buildingId,
      ...(fields.rsvpClosingDate && fields.rsvpClosingTime
        ? {
            rsvpClosingDate: toIsoDateTime(
              fields.rsvpClosingDate,
              fields.rsvpClosingTime,
            ),
          }
        : {}),
      'location[address]': fields.isExternal
        ? fields.venueAddress || fields.location
        : fields.buildingName || fields.location,
      'location[googleMapLink]': fields.isExternal
        ? fields.googleMapLink || ''
        : '',
      speakers: fields.speakers || [],
    });
    if (coverImageFile) appendMultipartFile(form, 'thumbnail', coverImageFile);
    if (additionalImageFile)
      appendMultipartFile(form, 'mainImage', additionalImageFile);
    speakerImageFiles?.forEach(file =>
      appendMultipartFile(form, 'speakerImages', file),
    );
    if (fields.speakerImageIndexes?.length) {
      form.append('speakerImageIndexes', JSON.stringify(fields.speakerImageIndexes));
    }
    const response = await apiClient.post<Record<string, unknown>>(
      Routes.community.events,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const data =
      response.data && typeof response.data === 'object'
        ? (response.data as Record<string, unknown>)
        : response;
    const raw =
      data.event && typeof data.event === 'object'
        ? (data.event as Record<string, unknown>)
        : data;
    const normalized = normalizeEvent(raw);
    const record: EventRecord = {
      ...mergeEventSelections(draft, normalized),
      title: normalized.title || draft.title,
      id: objectId(raw._id || raw.id) || draft.id,
      syncState: 'synced',
    };
    setState(current => ({
      ...current,
      events: [record, ...current.events.filter(item => item.id !== record.id)],
    }));
    return record;
  }, []);

  const updateEvent = useCallback(async (id: string, patch: EventPatch) => {
    const {
      coverImageFile,
      additionalImageFile,
      speakerImageFiles,
      ...fields
    } = patch;
    if (fields.status === 'Published') {
      await apiClient.patch(`${Routes.event(id)}/publish`);
      setState(current => ({
        ...current,
        events: current.events.map(item =>
          item.id === id
            ? { ...item, status: 'Published', syncState: 'synced' }
            : item,
        ),
      }));
      return;
    }
    const existing = stateRef.current.events.find(item => item.id === id);
    const merged = { ...existing, ...fields } as EventRecord;
    const buildingId = merged.buildingId || stateRef.current.user?.buildingId;
    if (
      !buildingId ||
      !merged.categoryId ||
      !merged.date ||
      !merged.startTime ||
      !merged.endTime
    )
      throw new Error('The event is missing required details.');
    const form = new FormData();
    appendMultipartFields(form, {
      title: merged.title,
      description: merged.description,
      category: merged.categoryId,
      ...(merged.subcategoryId
        ? { subcategory: merged.subcategoryId }
        : {}),
      startDate: toIsoDateTime(merged.date, merged.startTime),
      endDate: toIsoDateTime(merged.date, merged.endTime),
      capacity: merged.capacity,
      status: merged.status.toLowerCase(),
      buildingId,
      ...(merged.rsvpClosingDate && merged.rsvpClosingTime
        ? {
            rsvpClosingDate: toIsoDateTime(
              merged.rsvpClosingDate,
              merged.rsvpClosingTime,
            ),
          }
        : {}),
      'location[address]': merged.isExternal
        ? merged.venueAddress || merged.location
        : merged.buildingName || merged.location,
      'location[googleMapLink]': merged.isExternal
        ? merged.googleMapLink || ''
        : '',
      speakers: merged.speakers || [],
    });
    if (coverImageFile) appendMultipartFile(form, 'thumbnail', coverImageFile);
    if (additionalImageFile)
      appendMultipartFile(form, 'mainImage', additionalImageFile);
    speakerImageFiles?.forEach(file =>
      appendMultipartFile(form, 'speakerImages', file),
    );
    if (fields.speakerImageIndexes?.length) {
      form.append('speakerImageIndexes', JSON.stringify(fields.speakerImageIndexes));
    }
    const response = await apiClient.put<Record<string, unknown>>(
      Routes.event(id),
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const data =
      response.data && typeof response.data === 'object'
        ? (response.data as Record<string, unknown>)
        : response;
    const raw =
      data.event && typeof data.event === 'object'
        ? (data.event as Record<string, unknown>)
        : data;
    const hasRecord = Boolean(raw._id || raw.id || raw.title || raw.name);
    const serverPatch = hasRecord
      ? mergeEventSelections(merged, normalizeEvent(raw))
      : merged;
    setState(current => ({
      ...current,
      events: current.events.map(item =>
        item.id === id
          ? { ...item, ...serverPatch, id, syncState: 'synced' }
          : item,
      ),
    }));
  }, []);

  const loadEventRsvps = useCallback(async (id: string) => {
    const response = await apiClient.get<unknown>(Routes.eventRsvps(id));
    const records = extractList<Record<string, unknown>>(response, [
      'rsvps',
      'attendees',
      'items',
    ]);
    const attendees: NonNullable<EventRecord['attendees']> = records.map(
      (raw, index) => {
        const member =
          raw.member && typeof raw.member === 'object'
            ? (raw.member as Record<string, unknown>)
            : raw;
        return {
          id: objectId(raw) || objectId(member) || `attendee-${index}`,
          name: displayName(member) || text(raw.email),
          email: text(member.email || raw.email),
          phone: text(member.phone || member.mobile || raw.phone),
          company:
            displayName(member.company || raw.company) || text(raw.companyName),
          role: text(member.role || raw.role),
        };
      },
    );
    setState(current => ({
      ...current,
      events: current.events.map(event =>
        event.id === id
          ? { ...event, attendees, rsvpCount: attendees.length }
          : event,
      ),
    }));
    return attendees;
  }, []);

  const deleteEvent = useCallback(
    async (id: string) => {
      const previousEvents = stateRef.current.events;
      setState(current => ({
        ...current,
        events: current.events.filter(item => item.id !== id),
      }));
      try {
        await performMutation({ method: 'DELETE', path: Routes.event(id) });
      } catch (error) {
        setState(current => ({ ...current, events: previousEvents }));
        throw error;
      }
    },
    [performMutation],
  );

  const sendNotification = useCallback(
    async (input: SendNotificationInput) => {
      const { memberId, channels, emailSubject, emailHtml, ...displayInput } =
        input;
      const record: NotificationRecord = {
        ...displayInput,
        id: makeId('N'),
        sentAt: new Date().toISOString(),
        sentBy: displayInput.sentBy || stateRef.current.user?.name || undefined,
        syncState: 'pending',
      };
      setState(current => ({
        ...current,
        notifications: [record, ...current.notifications],
      }));
      try {
        const synced = await performMutation({
          method: 'POST',
          path: Routes.community.sendNotification,
          body: {
            title: input.title.trim(),
            message: input.message.trim(),
            audienceType: memberId
              ? 'specific'
              : input.audience === 'Community Staff'
              ? 'community_staff'
              : 'all_members',
            channels: channels || { inApp: true, email: false, sms: false },
            ...(memberId ? { memberId } : {}),
            ...(channels?.email && emailSubject?.trim()
              ? { emailSubject: emailSubject.trim() }
              : {}),
            ...(channels?.email && emailHtml?.trim()
              ? { emailHtml: emailHtml.trim() }
              : {}),
          },
        });
        const completed = {
          ...record,
          syncState: synced ? ('synced' as const) : ('pending' as const),
        };
        setState(current => ({
          ...current,
          notifications: current.notifications.map(item =>
            item.id === record.id ? completed : item,
          ),
        }));
        return completed;
      } catch (error) {
        setState(current => ({
          ...current,
          notifications: current.notifications.filter(
            item => item.id !== record.id,
          ),
        }));
        throw error;
      }
    },
    [performMutation],
  );

  const createLead = useCallback(async (input: NewLead) => {
    const buildingId = stateRef.current.user?.buildingId;
    if (!buildingId)
      throw new Error('Select a building before creating a lead.');
    const { kycDocument, ...leadInput } = input;
    const nameParts = leadInput.name.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ');
    if (
      !firstName ||
      !lastName ||
      !leadInput.email.trim() ||
      normalizeIndianPhone(leadInput.phone).length !== 10
    ) {
      throw new Error(
        'First name, last name, email, and a valid 10-digit phone number are required.',
      );
    }
    const form = new FormData();
    appendMultipartFields(form, {
      firstName,
      lastName,
      name: leadInput.name.trim(),
      email: leadInput.email.trim(),
      phone: normalizeIndianPhone(leadInput.phone),
      company: leadInput.company.trim(),
      address: leadInput.address?.trim(),
      pincode: leadInput.pincode?.trim(),
      purpose: 'day_pass',
      buildingId,
    });
    if (kycDocument)
      appendMultipartFile(form, 'kycDocuments', kycDocument);
    const response = await apiClient.post<Record<string, unknown>>(
      Routes.community.leads,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const data =
      response.data && typeof response.data === 'object'
        ? (response.data as Record<string, unknown>)
        : response;
    const raw = (
      data.lead && typeof data.lead === 'object' ? data.lead : data
    ) as Record<string, unknown>;
    const normalized = normalizeLead(raw);
    const record: Lead = {
      ...leadInput,
      ...normalized,
      name: normalized.name || leadInput.name,
      email: normalized.email || leadInput.email,
      phone: normalized.phone || leadInput.phone,
      company: normalized.company || leadInput.company,
      address: normalized.address || leadInput.address,
      pincode: normalized.pincode || leadInput.pincode,
      kycStatus:
        normalized.kycStatus || (kycDocument ? 'Pending Review' : undefined),
      kycDocuments:
        normalized.kycDocuments ||
        (kycDocument ? [{ name: kycDocument.name }] : undefined),
    };
    setState(current => ({
      ...current,
      leads: [record, ...current.leads.filter(item => item.id !== record.id)],
    }));
    return record;
  }, []);

  const verifyLeadKyc = useCallback(
    async (leadId: string, documents: FileAttachment[]) => {
      if (!leadId || documents.length === 0)
        throw new Error('Select the required KYC documents.');
      const form = new FormData();
      documents.forEach(document =>
        appendMultipartFile(form, 'kycDocuments', document),
      );
      await apiClient.put(Routes.leadKyc(leadId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setState(current => ({
        ...current,
        leads: current.leads.map(item =>
          item.id === leadId
            ? {
                ...item,
                kycStatus: 'Pending Review',
                kycDocuments: documents.map(document => ({
                  name: document.name,
                })),
                syncState: 'synced',
              }
            : item,
        ),
      }));
    },
    [],
  );

  const updateLead = useCallback(async (_id: string, _patch: Partial<Lead>) => {
    throw new Error(
      'Lead status changes are not supported by the documented Community API.',
    );
  }, []);

  const addRfidCard = useCallback(
    async (_input: Omit<RfidCard, 'id' | 'syncState'>) => {
      throw new Error(
        'RFID cards must be created through the documented file-import workflow.',
      );
    },
    [],
  );

  const importRfidCards = useCallback(
    async (file: FileAttachment, mode: 'insert' | 'upsert' = 'insert') => {
      const buildingId = stateRef.current.user?.buildingId;
      if (!buildingId)
        throw new Error('Select a building before importing RFID cards.');
      const upload = (dryRun: boolean) => {
        const form = new FormData();
        appendMultipartFile(form, 'file', file);
        return apiClient.post<Record<string, unknown>>(
          `${Routes.community.rfidCards}/import`,
          form,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            params: { dryRun, mode, buildingId },
          },
        );
      };
      const preview = await upload(true);
      const previewData = unwrapData(preview);
      const previewErrors = Array.isArray(previewData.errors)
        ? previewData.errors
        : [];
      if (previewErrors.length)
        throw new Error(
          `Import validation failed: ${previewErrors
            .map(text)
            .filter(Boolean)
            .join(', ')}`,
        );
      const response = await upload(false);
      const responseData =
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : response;
      const responseCards = extractList<Record<string, unknown>>(response, [
        'cards',
        'rfidCards',
      ]);
      let refreshedPayload = responseCards;
      if (!refreshedPayload.length) {
        try {
          refreshedPayload = extractList<Record<string, unknown>>(
            await apiClient.get(Routes.community.rfidCards),
            ['cards', 'rfidCards'],
          );
        } catch {
          /* The import may still have succeeded even if the refresh endpoint is temporarily unavailable. */
        }
      }
      const imported = refreshedPayload.map(normalizeRfidCard);
      setState(current => ({
        ...current,
        rfidCards: imported.length ? imported : current.rfidCards,
      }));
      return Number(
        responseData.importedCount ||
          responseData.count ||
          response.importedCount ||
          response.count ||
          responseCards.length,
      );
    },
    [],
  );

  const updateRfidCard = useCallback(
    async (id: string, patch: Partial<RfidCard>) => {
      const action =
        patch.status === 'Inactive'
          ? 'deactivate'
          : patch.status === 'Lost'
          ? 'lost'
          : null;
      if (!action)
        throw new Error(
          'Only deactivate and lost-card actions are supported by the documented API.',
        );
      await performMutation({
        method: 'POST',
        path: `${Routes.rfidCard(id)}/${action}`,
      });
      setState(current => ({
        ...current,
        rfidCards: current.rfidCards.map(item =>
          item.id === id ? { ...item, ...patch, syncState: 'synced' } : item,
        ),
      }));
    },
    [performMutation],
  );

  const assignRfidCard = useCallback(
    async (id: string, companyId: string, company: string) => {
      const previousCards = stateRef.current.rfidCards;
      const patch: Partial<RfidCard> = { company, companyId };
      setState(current => ({
        ...current,
        rfidCards: current.rfidCards.map(item =>
          item.id === id ? { ...item, ...patch, syncState: 'pending' } : item,
        ),
      }));
      try {
        const response = await apiClient.post<Record<string, unknown>>(
          `${Routes.rfidCard(id)}/assign-client`,
          { clientId: companyId },
        );
        const data = unwrapData(response);
        const raw =
          data.card && typeof data.card === 'object'
            ? (data.card as Record<string, unknown>)
            : data;
        const backendCard = objectId(raw) ? normalizeRfidCard(raw) : null;
        setState(current => ({
          ...current,
          rfidCards: current.rfidCards.map(item =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  ...(backendCard || {}),
                  id,
                  syncState: 'synced',
                }
              : item,
          ),
        }));
      } catch (error) {
        setState(current => ({ ...current, rfidCards: previousCards }));
        throw error;
      }
    },
    [],
  );

  const updatePrinterRequest = useCallback(
    async (id: string, patch: Partial<PrinterRequest>) => {
      const suffix =
        patch.status === 'Ready'
          ? 'ready'
          : patch.status === 'Completed'
          ? 'complete'
          : 'status';
      if (!['ready', 'complete'].includes(suffix))
        throw new Error('That printer status change is not supported.');
      if (
        suffix === 'complete' &&
        (!Number.isFinite(patch.credits) || Number(patch.credits) <= 0)
      )
        throw new Error('A positive credit charge is required.');
      await performMutation({
        method: patch.status === 'Completed' ? 'POST' : 'PATCH',
        path: `${Routes.printerRequest(id)}/${suffix}`,
        body:
          patch.status === 'Completed'
            ? { creditsToDeduct: Number(patch.credits) }
            : undefined,
      });
      setState(current => ({
        ...current,
        printerRequests: current.printerRequests.map(item =>
          item.id === id ? { ...item, ...patch, syncState: 'synced' } : item,
        ),
      }));
    },
    [performMutation],
  );

  const createPrinterRequest = useCallback(async (input: NewPrinterRequest) => {
    if (!input.attachment) throw new Error('Choose a document to print.');
    if (!input.clientId)
      throw new Error('Choose the client requesting the print.');
    if (!input.buildingId)
      throw new Error('Select a building before creating a print request.');
    if (
      !Number.isInteger(input.copies) ||
      input.copies < 1 ||
      input.copies > 99
    )
      throw new Error('Copies must be between 1 and 99.');
    if (input.attachment.size && input.attachment.size > 10 * 1024 * 1024)
      throw new Error('The document must be 10 MB or smaller.');

    const form = new FormData();
    appendMultipartFile(form, 'document', input.attachment);
    appendMultipartFields(form, {
      clientId: input.clientId,
      memberId: input.memberId || undefined,
      buildingId: input.buildingId,
      fileName: input.fileName?.trim() || input.attachment.name,
      copies: input.copies,
      printType: input.printType,
      paperSize: input.paperSize,
      sides: input.sides,
      comments: input.comments?.trim() || undefined,
    });
    const response = await apiClient.post<Record<string, unknown>>(
      Routes.community.printerRequests,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
      },
    );
    const data = unwrapData(response);
    const raw =
      data.request && typeof data.request === 'object'
        ? (data.request as Record<string, unknown>)
        : data;
    const created = normalizePrinter(raw);
    const completed: PrinterRequest = {
      ...created,
      fileName: created.fileName || input.fileName || input.attachment.name,
      requestedBy: created.requestedBy || input.requestedBy || '',
      company: created.company || input.company || '',
      clientId: created.clientId || input.clientId,
      memberId: created.memberId || input.memberId,
      copies: created.copies || input.copies,
      color: input.printType === 'color',
      printType: input.printType,
      paperSize: input.paperSize,
      sides: input.sides,
      comments: created.comments || input.comments,
      status: created.status || 'Pending',
      syncState: 'synced',
    };
    setState(current => ({
      ...current,
      printerRequests: [
        completed,
        ...current.printerRequests.filter(item => item.id !== completed.id),
      ],
    }));
    return completed;
  }, []);

  const createPost = useCallback(
    async (input: NewPost) => {
      const message = input.message.trim();
      if (!message)
        throw new Error('Enter a community message before posting.');
      const record: CommunityPost = {
        ...input,
        message,
        id: makeId('POST'),
        createdAt: new Date().toISOString(),
        likes: 0,
        liked: false,
        syncState: 'pending',
      };
      setState(current => ({ ...current, posts: [record, ...current.posts] }));
      try {
        const synced = await performMutation({
          method: 'POST',
          path: Routes.community.sendNotification,
          body: {
            title: message.length > 60 ? `${message.slice(0, 57)}...` : message,
            message,
            audienceType: 'all_members',
            channels: { inApp: true, email: false, sms: false },
          },
        });
        const completed = {
          ...record,
          syncState: synced ? ('synced' as const) : ('pending' as const),
        };
        setState(current => ({
          ...current,
          posts: current.posts.map(item =>
            item.id === record.id ? completed : item,
          ),
        }));
        return completed;
      } catch (error) {
        setState(current => ({
          ...current,
          posts: current.posts.filter(item => item.id !== record.id),
        }));
        throw error;
      }
    },
    [performMutation],
  );

  const togglePostLike = useCallback((id: string) => {
    setState(current => ({
      ...current,
      posts: current.posts.map(item =>
        item.id === id
          ? {
              ...item,
              liked: !item.liked,
              likes: Math.max(0, item.likes + (item.liked ? -1 : 1)),
            }
          : item,
      ),
    }));
  }, []);

  const saveCommonArea = useCallback(
    async (_input: NewArea & { id?: string }) => {
      throw new Error(
        'Common-area creation and editing are outside the documented Community API scope.',
      );
    },
    [],
  );

  const deleteCommonArea = useCallback(async (_id: string) => {
    throw new Error(
      'Common-area deletion is outside the documented Community API scope.',
    );
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      sendOtp,
      login,
      register,
      logout,
      syncAll,
      resetLocalData,
      selectBuilding,
      createTicket,
      updateTicket,
      deleteTicket,
      inviteVisitor,
      setVisitorStatus,
      scanVisitorToken,
      createBooking,
      createDayPass,
      createDayPassBundle,
      checkDayPassAvailability,
      updateDayPass,
      updateMember,
      createEvent,
      loadEventRsvps,
      updateEvent,
      deleteEvent,
      sendNotification,
      createLead,
      verifyLeadKyc,
      updateLead,
      addRfidCard,
      importRfidCards,
      updateRfidCard,
      assignRfidCard,
      updatePrinterRequest,
      createPrinterRequest,
      createPost,
      togglePostLike,
      saveCommonArea,
      deleteCommonArea,
    }),
    [
      state,
      sendOtp,
      login,
      register,
      logout,
      syncAll,
      resetLocalData,
      selectBuilding,
      createTicket,
      updateTicket,
      deleteTicket,
      inviteVisitor,
      setVisitorStatus,
      scanVisitorToken,
      createBooking,
      createDayPass,
      createDayPassBundle,
      checkDayPassAvailability,
      updateDayPass,
      updateMember,
      createEvent,
      loadEventRsvps,
      updateEvent,
      deleteEvent,
      sendNotification,
      createLead,
      verifyLeadKyc,
      updateLead,
      addRfidCard,
      importRfidCards,
      updateRfidCard,
      assignRfidCard,
      updatePrinterRequest,
      createPrinterRequest,
      createPost,
      togglePostLike,
      saveCommonArea,
      deleteCommonArea,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider.');
  return value;
};
