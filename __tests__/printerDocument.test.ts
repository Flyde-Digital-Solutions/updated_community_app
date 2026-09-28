import { printerDocumentFileName } from '../src/utils/printerDocument';
import { Environment } from '../src/config/environment';
import { Routes } from '../src/services/routes';
import { normalizePrinter } from '../src/context/AppContext';

describe('printer multipart document filename', () => {
  const pdf = {
    uri: 'content://provider/document/8',
    name: 'b993e532-3f27-4c3c-9e94-e8d1e281787f',
    type: 'application/pdf',
  };

  it('adds .pdf when the picker supplies a UUID without an extension', () => {
    expect(printerDocumentFileName(pdf)).toBe(`${pdf.name}.pdf`);
  });

  it('uses the actual PDF type even when the display name has a different extension', () => {
    expect(printerDocumentFileName(pdf, 'request.docx')).toBe('request.pdf');
  });

  it('accepts a supported filename extension when the picker reports a generic type', () => {
    expect(printerDocumentFileName({ ...pdf, name: 'request.pdf', type: 'application/octet-stream' }))
      .toBe('request.pdf');
  });

  it('rejects a file when neither MIME type nor name identifies a supported format', () => {
    expect(() => printerDocumentFileName({ ...pdf, type: 'application/octet-stream' }))
      .toThrow('Choose a PDF');
  });

  it('posts to the Community API, not the media host', () => {
    expect(`${Environment.apiBaseUrl}${Routes.community.printerRequests}`)
      .toBe('https://api.ofissquare.com/api/community/printer/requests');
  });

  it('does not show a raw client ID as the company name after creation', () => {
    const request = normalizePrinter({
      _id: 'request-id',
      fileName: 'printer-upload-test.pdf',
      client: '6a9aa2b20d22944f9664f744',
    });
    expect(request.company).toBe('');
  });
});
