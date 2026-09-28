import { isPastDateTime, localDateString } from '../src/utils/dateTimeValidation';
import { normalizeEvent, normalizeTicket } from '../src/context/AppContext';
import { downloadRequest } from '../src/utils/downloadFile';
import { downloadAuthenticatedFile } from '../src/utils/downloadFile';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { selectedRoomAvailability } from '../src/utils/roomAvailability';
import { meetingRoomCreditAmount, meetingRoomPayableAmount } from '../src/utils/meetingRoomPrice';
import { canManageIssuedRfidCard, isRfidCardAssigned, isRfidCardAvailableForAssignment, mergeImportedRfidCards } from '../src/utils/rfidCard';
import { setApiSession } from '../src/services/apiClient';
import { Platform } from 'react-native';

describe('new QA fixes', () => {
  it('rejects past times on the current date and allows future dates', () => {
    const now = new Date(2026, 8, 21, 12, 0);
    expect(localDateString(now)).toBe('2026-09-21');
    expect(isPastDateTime('2026-09-21', '11:59', now)).toBe(true);
    expect(isPastDateTime('2026-09-21', '12:30', now)).toBe(false);
    expect(isPastDateTime('2026-09-22', '00:00', now)).toBe(false);
  });

  it('keeps a string ticket attachment as an openable URL', () => {
    const ticket = normalizeTicket({
      _id: 'ticket-1',
      subject: 'QA attachment',
      attachment: '/api/community/files/proof.jpg',
    });
    expect(ticket.attachmentName).toBe('proof.jpg');
    expect(ticket.attachmentUrl).toBe('/api/community/files/proof.jpg');
  });

  it('labels an embedded PDF without exposing the encoded file data', () => {
    const ticket = normalizeTicket({ images: ['data:application/pdf;base64,cGRm'] });
    expect(ticket.attachmentName).toBe('ticket-attachment.pdf');
    expect(ticket.attachmentUrl).toBe('data:application/pdf;base64,cGRm');
  });

  it('retains the Word extension for an embedded office attachment', () => {
    const uri = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBA==';
    const ticket = normalizeTicket({ images: [uri] });
    expect(ticket.attachmentName).toBe('ticket-attachment.docx');
    expect(ticket.attachments?.[0]).toEqual({ name: 'ticket-attachment.docx', url: uri });
  });

  it('keeps an external venue selected when editing a fetched event', () => {
    const event = normalizeEvent({
      _id: 'event-1',
      title: 'Off-site meetup',
      location: {
        building: { _id: 'building-1', name: 'Ofis Square', address: 'Tower Road' },
        address: 'Convention Centre',
      },
    });
    expect(event.isExternal).toBe(true);
    expect(event.venueAddress).toBe('Convention Centre');
    expect(event.buildingId).toBe('building-1');
    expect(event.buildingName).toBe('Ofis Square');
  });

  it('maps ticket image URLs to openable attachments, including multiple images', () => {
    const ticket = normalizeTicket({
      _id: 'ticket-with-images',
      images: [
        'https://assets.ofissquare.com/tickets/first%20photo.jpg?signature=abc',
        { url: 'https://assets.ofissquare.com/tickets/second.png', name: 'Second photo.png' },
      ],
    });

    expect(ticket.attachmentName).toBe('first photo.jpg');
    expect(ticket.attachmentUrl).toBe('https://assets.ofissquare.com/tickets/first%20photo.jpg?signature=abc');
    expect(ticket.attachments).toEqual([
      { name: 'first photo.jpg', url: 'https://assets.ofissquare.com/tickets/first%20photo.jpg?signature=abc' },
      { name: 'Second photo.png', url: 'https://assets.ofissquare.com/tickets/second.png' },
    ]);
  });

  it('keeps a separately named attachment and avoids duplicate image links', () => {
    const url = 'https://assets.ofissquare.com/tickets/proof.jpg';
    const ticket = normalizeTicket({ attachment: url, images: [url], attachmentName: 'Proof.jpg' });

    expect(ticket.attachments).toEqual([{ name: 'Proof.jpg', url }]);
    expect(ticket.attachmentName).toBe('Proof.jpg');
  });

  it('does not show a storage identifier in the attachment label', () => {
    const ticket = normalizeTicket({
      images: ['https://assets.ofissquare.com/tickets/d420b91f-abf2-461c-a061-4c40a44de30b-community-ticket-1789378557998-photo.jpg'],
    });

    expect(ticket.attachmentName).toBe('photo.jpg');
    expect(ticket.attachments?.[0].name).toBe('photo.jpg');
  });

  it('authenticates API downloads without leaking credentials to external file hosts', () => {
    const api = downloadRequest('/api/community/rfid-cards/export?buildingId=building-1', 'test-token', 'building-1');
    expect(api.url).toBe('https://api.ofissquare.com/api/community/rfid-cards/export?buildingId=building-1');
    expect(api.headers.Authorization).toBe('Bearer test-token');
    expect(api.headers['X-Ofis-Building-Ids']).toBe('building-1');

    const sample = downloadRequest('/api/community/rfid-cards/import/sample', 'test-token', 'building-1');
    expect(sample.url).toBe('https://api.ofissquare.com/api/community/rfid-cards/import/sample');
    expect(sample.headers.Authorization).toBe('Bearer test-token');
    expect(sample.headers['X-Ofis-Building-Ids']).toBe('building-1');

    const external = downloadRequest('https://files.example.com/document.pdf?signature=abc', 'test-token', 'building-1');
    expect(external.headers.Authorization).toBeUndefined();
    expect(external.headers['X-Ofis-Building-Ids']).toBeUndefined();
  });

  it('opens an embedded PDF without sending its contents as a download URL', async () => {
    await expect(downloadAuthenticatedFile('data:application/pdf;base64,cGRm', 'ticket-attachment.pdf', 'view'))
      .resolves.toBe('/tmp/ticket-attachment.pdf');
    expect(ReactNativeBlobUtil.fs.writeFile).toHaveBeenCalledWith(
      '/tmp/ticket-attachment.pdf', 'cGRm', 'base64',
    );
    expect(ReactNativeBlobUtil.config).not.toHaveBeenCalled();
  });

  it('saves an RFID export locally without opening or sharing it', async () => {
    jest.clearAllMocks();
    setApiSession('test-token', 'building-1');
    await expect(
      downloadAuthenticatedFile(
        '/api/community/rfid-cards/export?buildingId=building-1',
        'rfid-cards.xlsx',
        'download',
        'building-1',
      ),
    ).resolves.toBe('/tmp/rfid-cards.xlsx');
    expect(ReactNativeBlobUtil.config).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/tmp/rfid-cards.xlsx' }),
    );
    const androidDownloadOptions = (ReactNativeBlobUtil.config as jest.Mock).mock.calls[0][0]
      .addAndroidDownloads;
    if (androidDownloadOptions) {
      expect(androidDownloadOptions).not.toHaveProperty('path');
    }
    expect(ReactNativeBlobUtil.ios.openDocument).not.toHaveBeenCalled();
    expect(ReactNativeBlobUtil.android.actionViewIntent).not.toHaveBeenCalled();
    setApiSession(null, null);
  });

  it('does not treat an Android DownloadManager path error as a failed download', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const fetch = jest.fn().mockResolvedValue({
      info: () => ({ status: 200, headers: {} }),
      path: () => {
        throw new Error('DownloadManager does not expose a BlobUtil path');
      },
    });
    (ReactNativeBlobUtil.config as jest.Mock).mockReturnValueOnce({ fetch });
    setApiSession('test-token', 'building-1');

    try {
      await expect(
        downloadAuthenticatedFile(
          '/api/community/rfid-cards/import/sample',
          'rfid_cards_sample.csv',
          'download',
          'building-1',
        ),
      ).resolves.toBe('/downloads/rfid_cards_sample.csv');
    } finally {
      setApiSession(null, null);
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    }
  });

  it('does not show a false failure when Android saved the download but cannot resolve its URI', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const fetch = jest.fn().mockRejectedValue(
      new Error('Download manager could not resolve downloaded file uri.'),
    );
    (ReactNativeBlobUtil.config as jest.Mock).mockReturnValueOnce({ fetch });
    setApiSession('test-token', 'building-1');

    try {
      await expect(
        downloadAuthenticatedFile(
          '/api/community/rfid-cards/export?buildingId=building-1',
          'rfid-cards.xlsx',
          'download',
          'building-1',
        ),
      ).resolves.toBe('/downloads/rfid-cards.xlsx');
    } finally {
      setApiSession(null, null);
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    }
  });

  it('accepts an Android DownloadManager rejection only after the fresh file exists', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ReactNativeBlobUtil.fs.exists as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const fetch = jest
      .fn()
      .mockRejectedValue(
        new Error('Download manager download failed, the file does not downloaded to destination.'),
      );
    (ReactNativeBlobUtil.config as jest.Mock).mockReturnValueOnce({ fetch });
    setApiSession('test-token', 'building-1');

    try {
      await expect(
        downloadAuthenticatedFile(
          '/api/community/rfid-cards/export?buildingId=building-1',
          'rfid-cards.xlsx',
          'download',
          'building-1',
        ),
      ).resolves.toBe('/downloads/rfid-cards.xlsx');
    } finally {
      setApiSession(null, null);
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    }
  });

  it('accepts Android DownloadManager collision renaming after a successful download', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ReactNativeBlobUtil.fs.exists as jest.Mock).mockResolvedValue(false);
    (ReactNativeBlobUtil.fs.ls as jest.Mock)
      .mockResolvedValueOnce(['rfid-cards.xlsx', 'rfid-cards-1.xlsx'])
      .mockResolvedValueOnce(['rfid-cards.xlsx', 'rfid-cards-1.xlsx', 'rfid-cards-2.xlsx']);
    const fetch = jest
      .fn()
      .mockRejectedValue(
        new Error('Download manager download failed, the file does not downloaded to destination.'),
      );
    (ReactNativeBlobUtil.config as jest.Mock).mockReturnValueOnce({ fetch });
    setApiSession('test-token', 'building-1');

    try {
      await expect(
        downloadAuthenticatedFile(
          '/api/community/rfid-cards/export?buildingId=building-1',
          'rfid-cards.xlsx',
          'download',
          'building-1',
        ),
      ).resolves.toBe('/downloads/rfid-cards-2.xlsx');
    } finally {
      (ReactNativeBlobUtil.fs.exists as jest.Mock).mockResolvedValue(false);
      (ReactNativeBlobUtil.fs.ls as jest.Mock).mockResolvedValue([]);
      setApiSession(null, null);
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    }
  });

  it('calculates the meeting-room price on the booking screen', () => {
    expect(meetingRoomPayableAmount(1800, 1)).toBe(2124);
    expect(meetingRoomPayableAmount(800, 0.5)).toBe(472);
    expect(meetingRoomPayableAmount(800, 1, 10)).toBe(849.6);
    expect(meetingRoomCreditAmount(8, 0.5)).toBe(4);
  });

  it('keeps issued RFID cards manageable after assignment', () => {
    const card = {
      status: 'Issued' as const,
      companyId: '',
      company: 'Example Client',
      assignedTo: 'Asha',
    };
    expect(canManageIssuedRfidCard(card)).toBe(true);
    expect(isRfidCardAssigned(card)).toBe(true);
  });

  it('shows active and issued unassigned RFID cards in assignment lists', () => {
    const card = (status: 'Active' | 'Issued' | 'Inactive', company = '') => ({
      id: status, uid: `CARD-${status}`, status, assignedTo: '', company,
      accessAreas: [], billingType: 'FREE' as const,
    });
    expect(isRfidCardAvailableForAssignment(card('Active'))).toBe(true);
    expect(isRfidCardAvailableForAssignment(card('Issued'))).toBe(true);
    expect(isRfidCardAvailableForAssignment(card('Inactive'))).toBe(false);
    expect(
      isRfidCardAvailableForAssignment(card('Issued', 'Assigned Client')),
    ).toBe(false);
  });

  it('adds refreshed RFID imports without removing cards already in the list', () => {
    const current = [{
      id: 'card-1', uid: 'OLD001', status: 'Inactive' as const,
      accessAreas: [], billingType: 'PAID' as const,
    }];
    const imported = [{
      id: 'card-2', uid: 'NEW002', status: 'Active' as const,
      accessAreas: [], billingType: 'FREE' as const,
    }];
    expect(mergeImportedRfidCards(current, imported).map(card => card.uid))
      .toEqual(['NEW002', 'OLD001']);
  });

  it('reads available meeting-room intervals from the live data-array response', () => {
    const response = {
      success: true,
      data: [
        { startTime: '09:00 AM', endTime: '10:00 AM' },
        { startTime: '10:00 AM', endTime: '11:00 AM' },
        { startTime: '11:00 AM', endTime: '12:00 PM' },
      ],
    };
    expect(selectedRoomAvailability(response, 10, 11)).toBe(true);
    expect(selectedRoomAvailability(response, 10.5, 11.5)).toBe(true);
    expect(selectedRoomAvailability(response, 12, 13)).toBe(false);
    expect(selectedRoomAvailability({ success: true }, 10, 11)).toBeNull();
  });
});
