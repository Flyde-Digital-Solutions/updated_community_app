import type { FileAttachment } from '../types/domain';

const extensionByType: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const supportedExtensions = new Set([
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp',
]);

/** The printer API validates the multipart document filename, not fileName. */
export function printerDocumentFileName(
  file: Pick<FileAttachment, 'name' | 'type' | 'uri'>,
  preferredName?: string,
): string {
  const selectedName = (preferredName?.trim() || file.name?.trim() || 'document')
    .split(/[\\/]/)
    .pop() || 'document';
  const name = selectedName.replace(/[\\/:*?"<>|]/g, '_');
  const nameExtension = name.match(/\.([a-z\d]+)$/i)?.[1].toLowerCase();
  const originalExtension = file.name.match(/\.([a-z\d]+)$/i)?.[1].toLowerCase();
  const uriExtension = file.uri.split(/[?#]/)[0].match(/\.([a-z\d]+)$/i)?.[1].toLowerCase();
  const type = file.type.split(';')[0].trim().toLowerCase();
  const extension = extensionByType[type] ||
    [nameExtension, originalExtension, uriExtension].find(value => value && supportedExtensions.has(value));
  if (!extension)
    throw new Error('Choose a PDF, Word, PowerPoint, JPG, PNG or WebP file.');

  const basename = nameExtension ? name.slice(0, -(nameExtension.length + 1)) : name;
  return `${basename || 'document'}.${extension}`;
}
