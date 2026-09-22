import { Platform, Share } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Environment } from '../config/environment';
import { getApiSession } from '../services/apiClient';

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

export async function downloadAuthenticatedFile(
  path: string,
  fileName: string,
  mode: 'view' | 'share' = 'share',
) {
  const session = getApiSession();
  const request = downloadRequest(path, session.token, session.buildingId);
  if (request.isApiUrl && !session.token)
    throw new Error('Your session is no longer available. Please sign in again.');
  const destination = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`;
  // `destination` already contains the user-facing extension. Supplying
  // `appendExt` as well creates malformed names on iOS (for example,
  // `sample.csv.csv`) and the document picker can no longer recognise the
  // downloaded sample as an importable CSV.
  const response = await ReactNativeBlobUtil.config({ path: destination, fileCache: true }).fetch(
    'GET',
    request.url,
    request.headers,
  );
  if (response.info().status >= 400) {
    await ReactNativeBlobUtil.fs.unlink(response.path()).catch(() => undefined);
    throw new Error(`Download failed with status ${response.info().status}.`);
  }
  if (Platform.OS === 'android') {
    await ReactNativeBlobUtil.android.actionViewIntent(response.path(), response.info().headers['Content-Type'] || 'application/octet-stream');
  } else if (mode === 'view') {
    await ReactNativeBlobUtil.ios.openDocument(response.path());
  } else {
    await Share.share({ title: fileName, url: `file://${response.path()}` });
  }
  return response.path();
}
