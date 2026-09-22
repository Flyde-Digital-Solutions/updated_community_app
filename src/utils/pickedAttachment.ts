import { keepLocalCopy, type DocumentPickerResponse } from '@react-native-documents/picker';
import { Platform } from 'react-native';
import type { FileAttachment } from '../types/domain';

export const UPLOAD_TIMEOUT_MS = 120_000;

/** Keep Android provider-backed files readable after the picker closes. */
export const pickedAttachment = async (
  file: DocumentPickerResponse,
): Promise<FileAttachment> => {
  const attachment: FileAttachment = {
    uri: file.uri,
    name: file.name || 'document',
    type: file.type || 'application/octet-stream',
    size: file.size || undefined,
  };

  if (Platform.OS !== 'android' || !file.uri.startsWith('content://'))
    return attachment;

  const [copy] = await keepLocalCopy({
    files: [{ uri: file.uri, fileName: attachment.name }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success' || !copy.localUri)
    throw new Error(
      'This file could not be read. Save it on your device and choose it again.',
    );
  return { ...attachment, uri: copy.localUri };
};
