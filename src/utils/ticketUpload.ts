import ReactNativeBlobUtil from 'react-native-blob-util';
import type { FileAttachment } from '../types/domain';

const MAX_TICKET_FILE_BYTES = 10 * 1024 * 1024;

/** The Community ticket endpoint accepts data URIs in its JSON `images` field. */
export async function ticketFileDataUri(file: FileAttachment): Promise<string> {
  if (file.size && file.size > MAX_TICKET_FILE_BYTES) {
    throw new Error('Choose a ticket attachment smaller than 10 MB.');
  }
  const localPath = file.uri.replace(/^file:\/\//i, '');
  const path = decodeURIComponent(localPath);
  const base64 = await ReactNativeBlobUtil.fs.readFile(path, 'base64');
  if (!base64) throw new Error('The selected ticket attachment could not be read.');
  const mimeType = file.type?.trim() || 'application/octet-stream';
  return `data:${mimeType};base64,${base64}`;
}
