import { keepLocalCopy, type DocumentPickerResponse } from '@react-native-documents/picker';
import { Platform } from 'react-native';
import type { FileAttachment } from '../types/domain';

export const UPLOAD_TIMEOUT_MS = 120_000;

/** Keep picker-owned files readable after the picker closes on either platform. */
export const pickedAttachment = async (
  file: DocumentPickerResponse,
  fileName?: string,
): Promise<FileAttachment> => {
  const attachment: FileAttachment = {
    uri: file.uri,
    name: fileName || file.name || 'document',
    type: file.type || 'application/octet-stream',
    size: file.size || undefined,
  };

  const needsLocalCopy =
    (Platform.OS === 'android' && file.uri.startsWith('content://')) ||
    (Platform.OS === 'ios' && file.uri.startsWith('file://'));
  if (!needsLocalCopy)
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
