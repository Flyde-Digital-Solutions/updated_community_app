export type LeadDocument = { name: string; url?: string };

type RecordValue = Record<string, unknown>;

export const leadRecord = (value: unknown): RecordValue =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : {};

export const duplicateExists = (response: unknown): boolean | null => {
  const root = leadRecord(response);
  const data = leadRecord(root.data);
  const value = typeof root.exists === 'boolean' ? root.exists : data.exists;
  return typeof value === 'boolean' ? value : null;
};

export const checkLeadContactDuplicates = async (
  email: string,
  phone: string,
  lookup: (params: { email: string } | { phone: string }) => Promise<unknown>,
) => {
  const [emailResponse, phoneResponse] = await Promise.all([
    lookup({ email }),
    lookup({ phone }),
  ]);
  const emailExists = duplicateExists(emailResponse);
  const phoneExists = duplicateExists(phoneResponse);
  if (emailExists === null || phoneExists === null)
    throw new Error('Could not verify email and phone availability. Please try again.');
  return { emailExists, phoneExists };
};

export const leadDuplicateMessage = (emailExists: boolean, phoneExists: boolean) =>
  emailExists && phoneExists
    ? 'This email and phone number already exist. Use different contact details.'
    : emailExists
    ? 'This email already exists. Use a different email address.'
    : phoneExists
    ? 'This phone number already exists. Use a different phone number.'
    : undefined;

export const unwrapLead = (response: unknown): RecordValue => {
  const root = leadRecord(response);
  const data = leadRecord(root.data);
  const nested = leadRecord(data.lead || root.lead);
  return Object.keys(nested).length ? nested : Object.keys(data).length ? data : root;
};

const fileExtension = (url: string): string => {
  const pathname = url.split(/[?#]/)[0];
  const extension = pathname.match(/\.([a-z0-9]{2,8})$/i)?.[1]?.toLowerCase();
  return extension === 'jpeg' ? 'jpg' : extension || '';
};

export const leadDocuments = (value: unknown): LeadDocument[] => {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(leadRecord(value).files)
      ? leadRecord(value).files as unknown[]
      : [];
  return source.map((item, index) => {
    const record = leadRecord(item);
    const url = typeof item === 'string'
      ? item
      : String(record.url || record.fileUrl || record.path || '');
    const extension = fileExtension(url);
    return {
      // Storage filenames contain private UUIDs; use a neutral label unless
      // the API explicitly provides a human-readable document name.
      name: String(record.name || record.fileName || `Document ${index + 1}${extension ? `.${extension}` : ''}`),
      url: url || undefined,
    };
  });
};

export const leadDocumentsFromRecord = (value: unknown): LeadDocument[] => {
  const raw = leadRecord(value);
  const current = leadDocuments(raw.kycDocuments);
  if (current.length) return current;
  const legacy = raw.kycDocument || raw.kycDocumentUrl || raw.documentUrl;
  return legacy ? leadDocuments([legacy]) : [];
};

export const leadDocumentIdentity = (url: string) => url.split(/[?#]/)[0];

export const leadBillingPayload = (value: {
  address: string; city: string; state: string; stateCode: string; zip: string; country: string;
} | undefined) => value ? {
  address: value.address,
  city: value.city,
  state: value.state,
  state_code: value.stateCode,
  zip: value.zip,
  country: value.country,
} : undefined;

export const leadBillingAddress = (value: unknown) => {
  const raw = leadRecord(value);
  const billing = leadRecord(raw.billingAddress);
  const stringValue = (input: unknown) => typeof input === 'string' ? input : '';
  return {
    address: stringValue(billing.address || raw.address),
    city: stringValue(billing.city || raw.billingCity),
    state: stringValue(billing.state || raw.billingState),
    stateCode: stringValue(billing.state_code || billing.stateCode || raw.billingStateCode),
    zip: stringValue(billing.zip || raw.pincode),
    country: stringValue(billing.country || raw.country),
  };
};
