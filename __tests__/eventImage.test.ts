import { eventImageAttachment } from '../src/utils/eventImage';

describe('event image multipart file', () => {
  it('keeps a supported filename and MIME type', () => {
    expect(eventImageAttachment({
      uri: 'file:///tmp/image.png',
      name: 'qa-event-lamp.png',
      type: 'image/png',
    })).toMatchObject({ name: 'qa-event-lamp.png', type: 'image/png' });
  });

  it('derives a safe extension and filename from the image MIME type', () => {
    expect(eventImageAttachment({
      uri: 'file:///tmp/uuid',
      name: 'ChatGPT Image 22 Sept 2026',
      type: 'image/jpeg; charset=binary',
    })).toMatchObject({
      name: 'ChatGPT_Image_22_Sept_2026.jpg',
      type: 'image/jpeg',
    });
  });

  it('rejects non-image files', () => {
    expect(() => eventImageAttachment({
      uri: 'file:///tmp/file.pdf',
      name: 'file.pdf',
      type: 'application/pdf',
    })).toThrow('Event images must be an image file.');
  });
});
