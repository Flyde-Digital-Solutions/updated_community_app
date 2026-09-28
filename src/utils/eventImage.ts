import type { FileAttachment } from '../types/domain';
import { extensionForMimeType } from './attachmentMime';

const IMAGE_EXTENSIONS = new Set(['gif', 'heic', 'heif', 'jpg', 'jpeg', 'png', 'webp']);

/** Keep the multipart filename both WAF-safe and consistent with its image MIME type. */
export function eventImageAttachment(file: FileAttachment): FileAttachment {
  const mimeType = file.type.trim().split(';')[0].toLowerCase();
  if (!mimeType.startsWith('image/'))
    throw new Error('Event images must be an image file.');

  const mimeExtension = extensionForMimeType(mimeType);
  if (mimeExtension === 'bin')
    throw new Error('Use a JPG, PNG, HEIC, GIF, or WebP event image.');

  const originalName = file.name.trim().split(/[\\/]/).pop() || 'event-image';
  const extension = originalName.includes('.')
    ? originalName.split('.').pop()!.toLowerCase()
    : '';
  const stem = originalName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'event-image';
  const outputExtension = IMAGE_EXTENSIONS.has(extension) && (
    extension === mimeExtension ||
    (mimeExtension === 'jpg' && extension === 'jpeg')
  ) ? extension : mimeExtension;

  return { ...file, name: `${stem}.${outputExtension}`, type: mimeType };
}
