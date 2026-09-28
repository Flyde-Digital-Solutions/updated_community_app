import { Platform, Share } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Environment } from '../config/environment';
import { getApiSession } from '../services/apiClient';
import { extensionForMimeType } from './attachmentMime';

export function downloadRequest(path: string, token: string | null, buildingId: string | null) {
  const base = Environment.apiBaseUrl.replace(/\/+$/, '');
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const apiOrigin = base.match(/^https?:\/\/[^/]+/i)?.[0].toLowerCase();
  const targetOrigin = url.match(/^https?:\/\/[^/]+/i)?.[0].toLowerCase();
  const isApiUrl = Boolean(apiOrigin && targetOrigin === apiOrigin);
  const headers: Record<string, string> = { Accept: '*/*' };
  if (isApiUrl && token) headers.Authorization = `Bearer ${token}`;
  const apiPath = isApiUrl ? url.slice(targetOrigin!.length) : '';
  if (
    isApiUrl &&
    buildingId &&
    (apiPath.startsWith('/api/community/') ||
      apiPath.startsWith('/api/extended-hours/'))
  ) {
    headers['X-Ofis-Building-Ids'] = buildingId;
  }
  return { url, headers, isApiUrl };
}

function isCompletedDownloadManagerResolutionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /download manager could not resolve downloaded file (?:uri|path)\.?/i.test(message);
}

export async function downloadAuthenticatedFile(
  path: string,
  fileName: string,
  mode: 'view' | 'share' | 'download' = 'share',
  buildingIdOverride?: string,
) {
  const embeddedFile = path.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (embeddedFile) {
    const mimeType = embeddedFile[1].toLowerCase();
    const extension = extensionForMimeType(mimeType);
    const suppliedName = fileName.replace(/[\\/:*?"<>|]/g, '_') || 'attachment';
    const safeName = /\.[a-z0-9]{2,8}$/i.test(suppliedName)
      ? suppliedName
      : `${suppliedName}.${extension}`;
    const destinationDirectory =
      mode === 'download' && Platform.OS === 'android'
        ? ReactNativeBlobUtil.fs.dirs.DownloadDir
        : ReactNativeBlobUtil.fs.dirs.DocumentDir;
    const destination = `${destinationDirectory}/${safeName}`;
    await ReactNativeBlobUtil.fs.writeFile(destination, embeddedFile[2], 'base64');
    if (mode === 'download' && Platform.OS === 'android') {
      await ReactNativeBlobUtil.android.addCompleteDownload({
        title: safeName,
        description: 'Downloaded by OSPLCommunity',
        mime: mimeType,
        path: destination,
        showNotification: true,
      });
    } else if (Platform.OS === 'android') {
      await ReactNativeBlobUtil.android.actionViewIntent(destination, mimeType);
    } else if (mode === 'view') {
      await ReactNativeBlobUtil.ios.openDocument(destination);
    } else if (mode === 'share') {
      await Share.share({ title: safeName, url: `file://${destination}` });
    }
    return destination;
  }
  const session = getApiSession();
  const request = downloadRequest(
    path,
    session.token,
    buildingIdOverride || session.buildingId,
  );
  if (request.isApiUrl && !session.token)
    throw new Error('Your session is no longer available. Please sign in again.');
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_') || 'download';
  const destinationDirectory =
    mode === 'download' && Platform.OS === 'android'
      ? ReactNativeBlobUtil.fs.dirs.DownloadDir
      : ReactNativeBlobUtil.fs.dirs.DocumentDir;
  let destination = `${destinationDirectory}/${safeName}`;
  let androidDownloadEntriesBefore: string[] = [];
  if (mode === 'download' && Platform.OS === 'android') {
    androidDownloadEntriesBefore = await ReactNativeBlobUtil.fs
      .ls(destinationDirectory)
      .catch(() => []);
    // Android DownloadManager refuses to replace an existing destination.
    // Repeated exports therefore need a fresh filename instead of surfacing a
    // failure after the first successful download.
    const extensionIndex = safeName.lastIndexOf('.');
    const baseName = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName;
    const suffix = extensionIndex > 0 ? safeName.slice(extensionIndex) : '';
    let duplicateIndex = 1;
    while (await ReactNativeBlobUtil.fs.exists(destination)) {
      destination = `${destinationDirectory}/${baseName} (${duplicateIndex})${suffix}`;
      duplicateIndex += 1;
    }
  }
  const findCompletedAndroidDownload = async () => {
    if (await ReactNativeBlobUtil.fs.exists(destination)) return destination;

    // DownloadManager can silently replace a requested collision name with
    // its own form (`rfid-cards-4.xlsx`, for example). Compare the directory
    // before and after the request so that a file the manager really created
    // is treated as success without hiding genuine HTTP/download failures.
    const entriesAfter = await ReactNativeBlobUtil.fs
      .ls(destinationDirectory)
      .catch(() => []);
    const extensionIndex = safeName.lastIndexOf('.');
    const baseName = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName;
    const suffix = extensionIndex > 0 ? safeName.slice(extensionIndex) : '';
    const newDownload = entriesAfter.find(name => {
      if (androidDownloadEntriesBefore.includes(name)) return false;
      if (suffix && !name.toLowerCase().endsWith(suffix.toLowerCase())) return false;
      return (
        name === safeName ||
        name.startsWith(`${baseName}-`) ||
        name.startsWith(`${baseName} (`)
      );
    });
    return newDownload ? `${destinationDirectory}/${newDownload}` : null;
  };
  const extension = safeName.split('.').pop()?.toLowerCase();
  const mimeType = extension === 'csv'
    ? 'text/csv'
    : extension === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : extension === 'xls'
    ? 'application/vnd.ms-excel'
    : extension === 'pdf'
    ? 'application/pdf'
    : 'application/octet-stream';
  // `destination` already contains the user-facing extension. Supplying
  // `appendExt` as well creates malformed names on iOS (for example,
  // `sample.csv.csv`) and the document picker can no longer recognise the
  // downloaded sample as an importable CSV.
  const downloadedName = destination.slice(destination.lastIndexOf('/') + 1);
  let response;
  try {
    response = await ReactNativeBlobUtil.config({
      path: destination,
      fileCache: true,
      ...(mode === 'download' && Platform.OS === 'android'
        ? {
            addAndroidDownloads: {
              useDownloadManager: true,
              notification: true,
              mediaScannable: true,
              storeInDownloads: true,
              title: downloadedName,
              description: 'Downloaded by OSPLCommunity',
              mime: mimeType,
            },
          }
        : {}),
    }).fetch(
      'GET',
      request.url,
      request.headers,
    );
  } catch (error) {
    // react-native-blob-util emits these errors only after Android's
    // DownloadManager reports a non-failed completion. Android 10+ may keep
    // the completed download behind a content URI that the library cannot
    // translate back to a filesystem path. The file and system notification
    // already exist in that case, so do not show a false failure to the user.
    if (
      mode === 'download' &&
      Platform.OS === 'android' &&
      isCompletedDownloadManagerResolutionError(error)
    ) {
      return destination;
    }
    // Some Android versions report a DownloadManager destination error even
    // after writing the file. Accept that result only when the fresh target
    // chosen above really exists; otherwise preserve the genuine failure.
    if (mode === 'download' && Platform.OS === 'android') {
      const completedDownload = await findCompletedAndroidDownload();
      if (completedDownload) return completedDownload;
    }
    throw error;
  }
  const responseInfo = response.info();
  if (responseInfo.status >= 400) {
    // DownloadManager responses do not consistently expose a readable
    // react-native-blob-util path. Only ask for it when BlobUtil owns the
    // destination; otherwise the manager has already handled cleanup.
    if (!(mode === 'download' && Platform.OS === 'android')) {
      await ReactNativeBlobUtil.fs
        .unlink(response.path())
        .catch(() => undefined);
    }
    throw new Error(`Download failed with status ${responseInfo.status}.`);
  }
  if (mode === 'download') {
    // Android's DownloadManager owns the completed file and notification.
    // On iOS, retaining it in Documents makes it a real local download
    // without opening a browser or forcing the share sheet.
    // Calling `response.path()` for an Android DownloadManager response can
    // throw even after the file was saved successfully, which previously
    // caused the UI to show a false "Export failed" alert.
    if (Platform.OS === 'android') {
      return (await findCompletedAndroidDownload()) || destination;
    }
    return destination;
  } else if (Platform.OS === 'android') {
    await ReactNativeBlobUtil.android.actionViewIntent(
      response.path(),
      responseInfo.headers['Content-Type'] || 'application/octet-stream',
    );
  } else if (mode === 'view') {
    await ReactNativeBlobUtil.ios.openDocument(response.path());
  } else {
    await Share.share({ title: fileName, url: `file://${response.path()}` });
  }
  return response.path();
}
