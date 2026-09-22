import { keepLocalCopy, type DocumentPickerResponse } from '@react-native-documents/picker';
import { Platform } from 'react-native';
import { pickedAttachment, UPLOAD_TIMEOUT_MS } from '../src/utils/pickedAttachment';

const selectedFile = {
  uri: 'content://provider/document/1',
  name: 'request.pdf',
  type: 'application/pdf',
  size: 2048,
} as DocumentPickerResponse;

describe('picked document uploads', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOS;
    jest.clearAllMocks();
  });

  it('copies Android provider files before using them in multipart requests', async () => {
    (Platform as { OS: string }).OS = 'android';
    (keepLocalCopy as jest.Mock).mockResolvedValue([
      {
        status: 'success',
        sourceUri: selectedFile.uri,
        localUri: 'file:///app/cache/request.pdf',
      },
    ]);

    await expect(pickedAttachment(selectedFile)).resolves.toEqual({
      uri: 'file:///app/cache/request.pdf',
      name: 'request.pdf',
      type: 'application/pdf',
      size: 2048,
    });
    expect(keepLocalCopy).toHaveBeenCalledWith({
      files: [{ uri: selectedFile.uri, fileName: 'request.pdf' }],
      destination: 'cachesDirectory',
    });
    expect(UPLOAD_TIMEOUT_MS).toBeGreaterThan(15_000);
  });

  it('reports an unreadable Android provider file before attempting upload', async () => {
    (Platform as { OS: string }).OS = 'android';
    (keepLocalCopy as jest.Mock).mockResolvedValue([
      { status: 'error', sourceUri: selectedFile.uri, copyError: 'unavailable' },
    ]);
    await expect(pickedAttachment(selectedFile)).rejects.toThrow(
      'This file could not be read',
    );
  });

  it('uses an iOS file directly', async () => {
    (Platform as { OS: string }).OS = 'ios';
    await expect(
      pickedAttachment({ ...selectedFile, uri: 'file:///app/request.pdf' }),
    ).resolves.toMatchObject({ uri: 'file:///app/request.pdf' });
    expect(keepLocalCopy).not.toHaveBeenCalled();
  });
});
