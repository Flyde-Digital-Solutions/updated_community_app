import { extensionForMimeType } from '../src/utils/attachmentMime';

describe('attachment MIME extension', () => {
  it.each([
    ['application/pdf', 'pdf'],
    ['image/png', 'png'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
    ['application/msword', 'doc'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
    ['text/csv; charset=utf-8', 'csv'],
  ])('maps %s to .%s', (mimeType, extension) => {
    expect(extensionForMimeType(mimeType)).toBe(extension);
  });
});
