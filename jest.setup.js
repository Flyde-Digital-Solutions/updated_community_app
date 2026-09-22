/* global jest */

import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: { dirs: { DocumentDir: '/tmp' }, unlink: jest.fn().mockResolvedValue(undefined) },
    config: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue({ path: () => '/tmp/export.csv', info: () => ({ status: 200, headers: {} }) }) })),
    android: { actionViewIntent: jest.fn().mockResolvedValue(undefined) },
    ios: { openDocument: jest.fn().mockResolvedValue(undefined) },
  },
}));
jest.mock('react-native-camera-kit', () => ({
  Camera: 'Camera',
  CameraType: { Back: 'back' },
}));
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: { IOS: { CAMERA: 'ios.permission.CAMERA' }, ANDROID: { CAMERA: 'android.permission.CAMERA' } },
  RESULTS: { GRANTED: 'granted' },
  request: jest.fn().mockResolvedValue('granted'),
}));
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  keepLocalCopy: jest.fn(),
  types: {
    allFiles: '*/*',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    images: 'image/*',
  },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: error => Boolean(error && error.code),
}));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
  getGenericPassword: jest.fn().mockResolvedValue(false),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));
