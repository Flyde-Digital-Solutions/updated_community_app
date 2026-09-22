import { Alert, Linking } from 'react-native';

export async function openExternalLink(url: string, unavailableMessage = 'This action is not available on this device.') {
  if (!url.trim()) {
    Alert.alert('Details unavailable', unavailableMessage);
    return false;
  }

  try {
    if (!await Linking.canOpenURL(url)) {
      Alert.alert('Unable to open', unavailableMessage);
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Unable to open', unavailableMessage);
    return false;
  }
}
