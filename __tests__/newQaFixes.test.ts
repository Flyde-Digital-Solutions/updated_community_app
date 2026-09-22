import { isPastDateTime, localDateString } from '../src/utils/dateTimeValidation';
import { normalizeTicket } from '../src/context/AppContext';
import { downloadRequest } from '../src/utils/downloadFile';
import { selectedRoomAvailability } from '../src/utils/roomAvailability';

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

  it('authenticates API downloads without leaking credentials to external file hosts', () => {
    const api = downloadRequest('/api/community/rfid-cards/export', 'test-token', 'building-1');
    expect(api.headers.Authorization).toBe('Bearer test-token');
    expect(api.headers['X-Ofis-Building-Ids']).toBe('building-1');

    const external = downloadRequest('https://files.example.com/document.pdf?signature=abc', 'test-token', 'building-1');
    expect(external.headers.Authorization).toBeUndefined();
    expect(external.headers['X-Ofis-Building-Ids']).toBeUndefined();
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
