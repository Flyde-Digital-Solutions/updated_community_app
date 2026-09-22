const EXPLICIT_IDENTIFIER_KEYS = new Set([
  'backendid',
  'zohoid',
  'zohocontactid',
  'razorpayid',
  'razorpayorderid',
  'razorpaypaymentid',
]);

const SENSITIVE_KEYS = new Set([
  'qrtoken',
  'accesstoken',
  'refreshtoken',
  'password',
  'secret',
]);

const TECHNICAL_KEYS = new Set([
  'backendstatus',
  'syncstate',
  'usingdefaultbuildingdiscount',
]);

const USER_FACING_REFERENCE_KEYS = new Set([
  'badgeid',
  'rfid',
  'uid',
]);

export const normalizeRecordKey = (key: string) => key.replace(/[^a-z0-9]/gi, '').toLowerCase();

/** Fields that are implementation details or credentials and must not be shown in the UI. */
export const isHiddenRecordKey = (key: string) => {
  const compact = normalizeRecordKey(key);
  return SENSITIVE_KEYS.has(compact) || TECHNICAL_KEYS.has(compact);
};

const FRIENDLY_LABELS: Record<string, string> = {
  communitymaxdiscountpercent: 'Maximum community discount',
  isbookingclosed: 'Booking closed',
  kycstatus: 'KYC status',
  qrexpiresat: 'QR expires at',
};

export const formatRecordLabel = (key: string) => {
  const compact = normalizeRecordKey(key);
  return FRIENDLY_LABELS[compact] || key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/^./, value => value.toUpperCase());
};

const titleCase = (value: string) => value
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, character => character.toUpperCase());

/** Formats raw API values into readable labels without exposing opaque identifiers. */
export const formatRecordValue = (key: string, value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value
      .map(item => formatRecordValue(key, item))
      .filter(item => item && !looksLikeInternalIdentifier(item))
      .join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return formatRecordValue(
      key,
      record.name || record.companyName || record.label || record.title || '',
    );
  }

  const text = String(value).trim();
  if (!text || looksLikeInternalIdentifier(text)) return '';
  const compactKey = normalizeRecordKey(key);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? text
      : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime())
      ? text
      : parsed.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }
  if (/(?:amount|price|rent|balance|total)$/.test(compactKey) && /^-?\d+(?:\.\d+)?$/.test(text)) {
    return `₹${Number(text).toLocaleString('en-IN')}`;
  }
  if (compactKey.endsWith('percent') && /^-?\d+(?:\.\d+)?$/.test(text)) return `${text}%`;
  if (['status', 'type', 'method', 'state'].some(suffix => compactKey.endsWith(suffix))) return titleCase(text);
  if (/^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(text)) return titleCase(text);
  return text;
};

export const isImageRecordValue = (key: string, value: unknown) => {
  const compact = normalizeRecordKey(key);
  if (!/^(?:image|images|thumbnail|coverimage|additionalimage|mainimage)$/.test(compact)) return false;
  const candidate = Array.isArray(value) ? value.find(item => typeof item === 'string') : value;
  return typeof candidate === 'string' && /^https?:\/\//i.test(candidate);
};

/** True for database/relation keys that should never be rendered to a user. */
export const isInternalIdentifierKey = (key: string) => {
  const compact = normalizeRecordKey(key);
  if (USER_FACING_REFERENCE_KEYS.has(compact)) return false;
  if (compact === 'id' || compact === 'ids' || compact === 'v') return true;
  if (EXPLICIT_IDENTIFIER_KEYS.has(compact)) return true;
  if (/(?:^|[_-])ids?$/i.test(key)) return true;
  if (/[A-Z](?:Id|ID|Ids|IDs)$/.test(key)) return true;
  return /^(?:backend|company|client|customer|member|booking|building|host|category|subcategory|speaker|assignedto|room|visitor|guest|lead|invoice|request|card|bundle|option|item)ids?$/.test(compact);
};

/** Common opaque database identifiers, irrespective of the field name used by an API. */
export const looksLikeInternalIdentifier = (value: unknown) => {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return /^[a-f0-9]{24}$/i.test(text) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(text);
};
