import ReactNativeBlobUtil from 'react-native-blob-util';
import { ticketFileDataUri } from '../src/utils/ticketUpload';

describe('ticket JSON attachment upload', () => {
  afterEach(() => jest.clearAllMocks());

  it('encodes a locally copied PDF in the documented images field format', async () => {
    await expect(ticketFileDataUri({
      uri: 'file:///app/cache/QA%20attachment.pdf',
      name: 'QA attachment.pdf',
      type: 'application/pdf',
      size: 1024,
    })).resolves.toBe('data:application/pdf;base64,cGRm');
    expect(ReactNativeBlobUtil.fs.readFile).toHaveBeenCalledWith(
      '/app/cache/QA attachment.pdf', 'base64',
    );
  });

  it('rejects oversized files before reading them', async () => {
    await expect(ticketFileDataUri({
      uri: 'file:///large.pdf',
      name: 'large.pdf',
      type: 'application/pdf',
      size: 11 * 1024 * 1024,
    })).rejects.toThrow('smaller than 10 MB');
    expect(ReactNativeBlobUtil.fs.readFile).not.toHaveBeenCalled();
  });
});
