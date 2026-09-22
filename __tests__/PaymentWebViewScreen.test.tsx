import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { PaymentWebViewScreen } from '../src/screens/PaymentWebViewScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      url: 'https://rzp.io/i/test-checkout',
      title: 'Day Pass Payment',
    },
  }),
}));

jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ syncAll: jest.fn().mockResolvedValue(undefined) }),
}));

describe('PaymentWebViewScreen', () => {
  it('renders the secure payment URL inside the embedded WebView', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<PaymentWebViewScreen />);
    });

    const webView = renderer!.root.findByProps({ testID: 'payment-webview' });
    expect(webView.props.source).toEqual({ uri: 'https://rzp.io/i/test-checkout' });
    expect(webView.props.originWhitelist).toEqual(['*']);
    expect(renderer!.root.findByProps({ children: 'Day Pass Payment' })).toBeTruthy();
  });
});
