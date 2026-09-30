import {
  CommunityPushPreferences,
  PushDeliveryStatus,
} from '../types/domain';

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
