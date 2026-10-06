import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState as NativeAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  RemoteMessage,
} from '@react-native-firebase/messaging';
import { useApp } from './AppContext';
import {
  clearPushBinding,
  enablePushDevice,
  isPushOptedIn,
  PushDeviceState,
  readPushPermission,
  reconcilePushDevice,
  registerPushToken,
  revokePushDevice,
} from '../services/pushDeviceService';
import {
  CommunityPushIntent,
  parseCommunityPushIntent,
} from '../utils/pushNotifications';

const PENDING_INTENT_KEY = '@ofis/community/pending-push-intent';
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type NavigationRef = {
  isReady(): boolean;
  navigate(name: never, params?: never): void;
};

type PushContextValue = PushDeviceState & {
  enable(): Promise<void>;
  disable(): Promise<void>;
  retry(): Promise<void>;
};

const initialState: PushDeviceState = {
  optedIn: false,
  permission: 'unknown',
  registration: 'checking',
};

const PushContext = createContext<PushContextValue | null>(null);

const errorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Push setup failed.';
  if (/no firebase app|default firebase app|google-services|GoogleService-Info/i.test(message))
    return 'Firebase configuration is missing from this build.';
  return message.replace(/\bbackend\b/gi, 'service');
};

export function PushNotificationProvider({
  navigationRef,
  navigationReady,
  children,
}: PropsWithChildren<{ navigationRef: NavigationRef; navigationReady: boolean }>) {
  const { authenticated, user, syncAll } = useApp();
  const [state, setState] = useState<PushDeviceState>(initialState);
  const processedIds = useRef(new Set<string>());
  const previousUserId = useRef<string | null>(null);

  const savePending = useCallback(async (intent: CommunityPushIntent) => {
    await AsyncStorage.setItem(PENDING_INTENT_KEY, JSON.stringify({ intent, savedAt: Date.now() }));
  }, []);

  const navigateIntent = useCallback(async (intent: CommunityPushIntent) => {
    if (processedIds.current.has(intent.notificationId)) return;
    if (!authenticated || !user || !navigationRef.isReady()) {
      await savePending(intent);
      return;
    }
    processedIds.current.add(intent.notificationId);
    await AsyncStorage.removeItem(PENDING_INTENT_KEY);
    syncAll().catch(() => undefined);
    if (intent.routeKey === 'community_visitor_details') {
      navigationRef.navigate('VisitorDetailScreen' as never, { visitorId: intent.entityId } as never);
      return;
    }
    if (intent.routeKey === 'community_access_issue') {
      navigationRef.navigate('IncidentDetailScreen' as never, {
        incidentId: intent.entityId,
        kind: 'access_safety',
      } as never);
      return;
    }
    if (intent.routeKey === 'building_incident_details') {
      navigationRef.navigate('IncidentDetailScreen' as never, {
        incidentId: intent.entityId,
        kind: 'building_incident',
      } as never);
      return;
    }
    // The contract cannot distinguish a support ticket ID from a nested exit task ID.
    Alert.alert(
      'Task notification received',
      'Open the current ticket and operations lists to find this task. The notification payload does not yet identify its source safely.',
    );
    navigationRef.navigate('AllTicketsScreen' as never);
  }, [authenticated, navigationRef, savePending, syncAll, user]);

  const intentFromMessage = useCallback((message: RemoteMessage) =>
    parseCommunityPushIntent(message.data), []);

  const processOpenedMessage = useCallback(async (message: RemoteMessage | null) => {
    const intent = message ? intentFromMessage(message) : null;
    if (intent) await navigateIntent(intent);
  }, [intentFromMessage, navigateIntent]);

  const retry = useCallback(async () => {
    if (!user) return;
    setState(current => ({ ...current, registration: 'registering', error: undefined }));
    try {
      const enabled = await reconcilePushDevice(user.id);
      const permission = await readPushPermission();
      setState({
        optedIn: await isPushOptedIn(),
        permission,
        registration: enabled ? 'enabled' : 'disabled',
      });
    } catch (error) {
      setState(current => ({
        ...current,
        registration: 'error',
        error: errorMessage(error),
      }));
    }
  }, [user]);

  const enable = useCallback(async () => {
    if (!user) throw new Error('Sign in before enabling push notifications.');
    setState(current => ({ ...current, registration: 'registering', error: undefined }));
    try {
      await enablePushDevice(user.id);
      setState({ optedIn: true, permission: 'granted', registration: 'enabled' });
    } catch (error) {
      const message = errorMessage(error);
      const permission = await readPushPermission().catch(() => 'unknown' as const);
      setState({ optedIn: false, permission, registration: 'error', error: message });
      throw new Error(message);
    }
  }, [user]);

  const disable = useCallback(async () => {
    setState(current => ({ ...current, registration: 'checking', error: undefined }));
    try {
      if (authenticated) await revokePushDevice();
      else await clearPushBinding();
      setState(current => ({ ...current, optedIn: false, registration: 'disabled' }));
    } catch (error) {
      const message = errorMessage(error);
      setState(current => ({ ...current, registration: 'error', error: message }));
      throw new Error(message);
    }
  }, [authenticated]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      isPushOptedIn(),
      readPushPermission().catch(() => 'unknown' as const),
    ]).then(([optedIn, permission]) => {
      if (!cancelled) setState({
        optedIn,
        permission,
        registration: optedIn ? 'checking' : 'disabled',
      });
    }).catch(error => {
      if (!cancelled) setState({
        optedIn: false,
        permission: 'unknown',
        registration: 'unavailable',
        error: errorMessage(error),
      });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authenticated || !user) {
      if (previousUserId.current) {
        AsyncStorage.removeItem(PENDING_INTENT_KEY).catch(() => undefined);
        processedIds.current.clear();
        setState(current => ({ ...current, optedIn: false, registration: 'disabled' }));
      }
      previousUserId.current = null;
      return;
    }
    if (previousUserId.current && previousUserId.current !== user.id) {
      AsyncStorage.removeItem(PENDING_INTENT_KEY).catch(() => undefined);
      processedIds.current.clear();
    }
    previousUserId.current = user.id;
    retry();
  }, [authenticated, retry, user]);

  useEffect(() => {
    let messaging;
    try {
      messaging = getMessaging(getApp());
    } catch (error) {
      setState(current => ({
        ...current,
        registration: 'unavailable',
        error: errorMessage(error),
      }));
      return;
    }
    const unsubscribeOpen = onNotificationOpenedApp(messaging, processOpenedMessage);
    const unsubscribeMessage = onMessage(messaging, message => {
      const intent = intentFromMessage(message);
      if (!intent || processedIds.current.has(intent.notificationId)) return;
      Alert.alert(
        'New Ofis notification',
        'Open the latest authorized record in the Community App?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open', onPress: () => navigateIntent(intent) },
        ],
      );
    });
    const unsubscribeToken = onTokenRefresh(messaging, token => {
      if (!authenticated || !user) return;
      isPushOptedIn().then(optedIn => {
        if (!optedIn) return;
        setState(current => ({ ...current, registration: 'registering', error: undefined }));
        registerPushToken(user.id, token)
          .then(() => setState(current => ({ ...current, optedIn: true, registration: 'enabled' })))
          .catch(error => setState(current => ({
            ...current,
            registration: 'error',
            error: errorMessage(error),
          })));
      });
    });
    getInitialNotification(messaging).then(processOpenedMessage).catch(() => undefined);
    return () => {
      unsubscribeOpen();
      unsubscribeMessage();
      unsubscribeToken();
    };
  }, [authenticated, intentFromMessage, navigateIntent, processOpenedMessage, user]);

  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', next => {
      if (next === 'active' && authenticated && user) retry();
    });
    return () => subscription.remove();
  }, [authenticated, retry, user]);

  useEffect(() => {
    if (!authenticated || !user || !navigationReady || !navigationRef.isReady()) return;
    AsyncStorage.getItem(PENDING_INTENT_KEY).then(raw => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { intent?: unknown; savedAt?: unknown };
        const intent = parseCommunityPushIntent(parsed.intent);
        if (!intent || typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > PENDING_MAX_AGE_MS) {
          AsyncStorage.removeItem(PENDING_INTENT_KEY).catch(() => undefined);
          return;
        }
        navigateIntent(intent);
      } catch {
        AsyncStorage.removeItem(PENDING_INTENT_KEY).catch(() => undefined);
      }
    });
  }, [authenticated, navigateIntent, navigationReady, navigationRef, user]);

  const value = useMemo<PushContextValue>(() => ({
    ...state,
    enable,
    disable,
    retry,
  }), [disable, enable, retry, state]);

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

export const usePushNotifications = () => {
  const value = useContext(PushContext);
  if (!value) throw new Error('usePushNotifications must be used within PushNotificationProvider.');
  return value;
};
