/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Data is intentionally not persisted or navigated from a headless callback.
// The authorized record is resolved only after the user opens the notification.
try {
  setBackgroundMessageHandler(getMessaging(getApp()), async () => undefined);
} catch {
  // Builds without environment Firebase files remain usable for non-push QA.
}

AppRegistry.registerComponent(appName, () => App);
