import { checkLeadContactDuplicates, duplicateExists, leadBillingAddress, leadBillingPayload, leadDocuments, leadDocumentsFromRecord, leadDuplicateMessage, unwrapLead } from '../src/utils/leadData';
import { normalizeLead } from '../src/context/AppContext';

describe('OD lead and KYC data', () => {
  const signedUrl = 'https://files.example.com/private/uuid-kyc-photo.jpg?X-Amz-Signature=private';

  it('reads independent email and phone duplicate checks', () => {
    expect(duplicateExists({ exists: true, message: 'Email already exists' })).toBe(true);
    expect(duplicateExists({ exists: false })).toBe(false);
    expect(duplicateExists({ data: { exists: true } })).toBe(true);
    expect(duplicateExists({ error: 'Unavailable' })).toBeNull();
  });

  it('checks both contacts separately before allowing lead creation', async () => {
    const lookup = jest.fn(async (params: { email: string } | { phone: string }) =>
      'email' in params ? { exists: false } : { exists: true },
    );
    await expect(checkLeadContactDuplicates('qa@example.com', '9876543210', lookup))
      .resolves.toEqual({ emailExists: false, phoneExists: true });
    expect(lookup).toHaveBeenNthCalledWith(1, { email: 'qa@example.com' });
    expect(lookup).toHaveBeenNthCalledWith(2, { phone: '9876543210' });
    expect(leadDuplicateMessage(false, true)).toContain('phone number already exists');
    await expect(checkLeadContactDuplicates('qa@example.com', '9876543210', async () => ({})))
      .rejects.toThrow('Could not verify');
  });

  it('unwraps the Community lead-detail response', () => {
    expect(unwrapLead({ success: true, data: { lead: { fullName: 'QA Reviewer' } } }))
      .toEqual({ fullName: 'QA Reviewer' });
  });

  it('reads the nested files array without showing storage identifiers', () => {
    expect(leadDocuments({ files: [signedUrl] })).toEqual([
      { name: 'Document 1.jpg', url: signedUrl },
    ]);
    expect(leadDocuments({ files: [] })).toEqual([]);
    expect(leadDocumentsFromRecord({ kycDocuments: { files: [signedUrl] } })).toHaveLength(1);
  });

  it('maps the Web Panel billing fields and KYC files from a lead', () => {
    const raw = {
      _id: 'lead-1', firstName: 'QA', lastName: 'Reviewer',
      companyName: 'Example Ltd', gender: 'male', gstNo: '06AAACC4175D1Z2',
      gstTreatment: 'business_gst', placeOfSupply: 'HR',
      billingAddress: {
        address: 'Tower Road', city: 'Gurugram', state: 'Haryana',
        state_code: 'HR', zip: '122001', country: 'IN',
      },
      building: { _id: 'building-1', name: '12th Floor' },
      kycDocuments: { files: [signedUrl] },
    };
    expect(leadBillingAddress(raw)).toEqual({
      address: 'Tower Road', city: 'Gurugram', state: 'Haryana',
      stateCode: 'HR', zip: '122001', country: 'IN',
    });
    expect(leadBillingPayload(leadBillingAddress(raw))).toEqual({
      address: 'Tower Road', city: 'Gurugram', state: 'Haryana',
      state_code: 'HR', zip: '122001', country: 'IN',
    });
    expect(normalizeLead(raw)).toMatchObject({
      name: 'QA Reviewer', company: 'Example Ltd', gender: 'male',
      gstNo: '06AAACC4175D1Z2', gstTreatment: 'business_gst',
      placeOfSupply: 'HR', buildingName: '12th Floor',
      kycDocuments: [{ name: 'Document 1.jpg', url: signedUrl }],
    });
  });
});
