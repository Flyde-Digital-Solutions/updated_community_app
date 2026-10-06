import {
  CommunityPushPreferences,
  PushDeliveryStatus,
} from '../types/domain';

export const COMMUNITY_PUSH_DESTINATIONS = {
  community_access_safety: 'community_access_issue',
  community_visitor_processing: 'community_visitor_details',
  community_building_incident: 'building_incident_details',
  community_task_sla: 'community_task_details',
} as const;

export type CommunityPushEventType = keyof typeof COMMUNITY_PUSH_DESTINATIONS;
export type CommunityPushRouteKey = typeof COMMUNITY_PUSH_DESTINATIONS[CommunityPushEventType];

export type CommunityPushIntent = {
  notificationId: string;
  eventType: CommunityPushEventType;
  routeKey: CommunityPushRouteKey;
  entityId: string;
};

const RECORD_ID = /^[A-Za-z0-9_-]{8,128}$/;

/** Treat FCM data as untrusted navigation hints and accept only documented pairs. */
export const parseCommunityPushIntent = (
  value: unknown,
): CommunityPushIntent | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const notificationId = data.notificationId;
  const eventType = data.eventType;
  const routeKey = data.routeKey;
  const entityId = data.entityId;
  if (
    typeof notificationId !== 'string' ||
    typeof eventType !== 'string' ||
    typeof routeKey !== 'string' ||
    typeof entityId !== 'string' ||
    !RECORD_ID.test(notificationId) ||
    !RECORD_ID.test(entityId)
  ) return null;
  if (!(eventType in COMMUNITY_PUSH_DESTINATIONS)) return null;
  const typedEvent = eventType as CommunityPushEventType;
  if (COMMUNITY_PUSH_DESTINATIONS[typedEvent] !== routeKey) return null;
  return {
    notificationId,
    eventType: typedEvent,
    routeKey: routeKey as CommunityPushRouteKey,
    entityId,
  };
};

const numberValue = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const defaultCommunityPushPreferences: CommunityPushPreferences = {
  accessSafety: true,
  visitorProcessing: true,
  buildingIncident: true,
  taskSla: true,
};

export const communityPushPreferencesFrom = (
  value: unknown,
): CommunityPushPreferences => {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  return {
    accessSafety: typeof source.accessSafety === 'boolean' ? source.accessSafety : true,
    visitorProcessing: typeof source.visitorProcessing === 'boolean' ? source.visitorProcessing : true,
    buildingIncident: typeof source.buildingIncident === 'boolean' ? source.buildingIncident : true,
    taskSla: typeof source.taskSla === 'boolean' ? source.taskSla : true,
  };
};

export const pushDeliveryStatusFrom = (value: unknown): PushDeliveryStatus => {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const queued = numberValue(source.queued ?? source.queuedCount);
  const sent = numberValue(source.sent);
  const failed = numberValue(source.failed);
  const skipped = numberValue(source.skipped ?? source.skippedCount);
  const hasExplicitTotal = source.total != null || source.count != null;
  return {
    total: hasExplicitTotal
      ? numberValue(source.total ?? source.count)
      : queued + sent + failed + skipped,
    queued,
    sent,
    failed,
    skipped,
  };
};

export const isPushDeliveryTerminal = (status?: PushDeliveryStatus) => {
  if (!status) return true;
  return status.queued === 0 &&
    status.sent + status.failed + status.skipped >= status.total;
};
