import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { PermissionsAndroid, Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  hasPermission,
  requestPermission,
} from '@react-native-firebase/messaging';
import { apiClient, ApiError } from './apiClient';
import { Routes } from './routes';

const INSTALLATION_SERVICE = 'com.ofis.community.push.installation';
const PUSH_OPT_IN_KEY = '@ofis/community/push-opt-in';
const PUSH_ACCOUNT_KEY = '@ofis/community/push-account';
const DEVICE_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export type PushPermissionState = 'unknown' | 'granted' | 'denied';
export type PushRegistrationState =
  | 'disabled'
  | 'checking'
  | 'registering'
  | 'enabled'
  | 'error'
  | 'unavailable';

export type PushDeviceState = {
  optedIn: boolean;
  permission: PushPermissionState;
  registration: PushRegistrationState;
  error?: string;
};

const randomPart = () => Math.random().toString(36).slice(2, 12);

export const getInstallationId = async () => {
  const saved = await Keychain.getGenericPassword({ service: INSTALLATION_SERVICE });
  if (saved && DEVICE_ID_PATTERN.test(saved.password)) return saved.password;
  const deviceId = `community_${Date.now().toString(36)}_${randomPart()}${randomPart()}`;
  await Keychain.setGenericPassword('installation', deviceId, {
    service: INSTALLATION_SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return deviceId;
};

export const isPushOptedIn = async () =>
  (await AsyncStorage.getItem(PUSH_OPT_IN_KEY)) === 'true';

const setPushOptedIn = (enabled: boolean) =>
  AsyncStorage.setItem(PUSH_OPT_IN_KEY, String(enabled));

const permissionGranted = (status: number) =>
  status === AuthorizationStatus.AUTHORIZED ||
  status === AuthorizationStatus.PROVISIONAL;

export const readPushPermission = async (): Promise<PushPermissionState> => {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    return (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS))
      ? 'granted'
      : 'denied';
  }
  if (Platform.OS === 'android') return 'granted';
  return permissionGranted(await hasPermission(getMessaging(getApp())))
    ? 'granted'
    : 'denied';
};

export const requestPushPermission = async (): Promise<PushPermissionState> => {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
  }
  if (Platform.OS === 'android') return 'granted';
  return permissionGranted(await requestPermission(getMessaging(getApp())))
    ? 'granted'
    : 'denied';
};

const validatedToken = async () => {
  const token = await getToken(getMessaging(getApp()));
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    throw new Error('Firebase did not return a valid registration token.');
  }
  return token;
};

export const registerPushToken = async (userId: string, suppliedToken?: string) => {
  const deviceId = await getInstallationId();
  const token = suppliedToken || await validatedToken();
  if (token.length < 20 || token.length > 4096)
    throw new Error('Firebase did not return a valid registration token.');
  let attempt = 0;
  while (true) {
    try {
      await apiClient.put(Routes.community.pushDevices, {
        deviceId,
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      await Promise.all([
        setPushOptedIn(true),
        AsyncStorage.setItem(PUSH_ACCOUNT_KEY, userId),
      ]);
      return;
    } catch (error) {
      attempt += 1;
      if (!(error instanceof ApiError) || error.status !== 503 || attempt >= 3)
        throw error;
      await new Promise<void>(resolve => setTimeout(() => resolve(), attempt * 1000));
    }
  }
};

export const enablePushDevice = async (userId: string) => {
  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    await setPushOptedIn(false);
    throw new Error('Notification permission was not granted. Enable it in phone settings and retry.');
  }
  await registerPushToken(userId);
};

export const reconcilePushDevice = async (userId: string) => {
  if (!(await isPushOptedIn())) return false;
  const boundAccount = await AsyncStorage.getItem(PUSH_ACCOUNT_KEY);
  if (boundAccount && boundAccount !== userId) {
    await setPushOptedIn(false);
    return false;
  }
  if ((await readPushPermission()) !== 'granted') return false;
  await registerPushToken(userId);
  return true;
};

export const revokePushDevice = async () => {
  const deviceId = await getInstallationId();
  await apiClient.delete(Routes.community.pushDevices, { data: { deviceId } });
  await clearPushBinding();
};

export const clearPushBinding = async () => {
  await Promise.all([
    setPushOptedIn(false),
    AsyncStorage.removeItem(PUSH_ACCOUNT_KEY),
  ]);
};
