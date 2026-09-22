import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MainStackNavigator } from './src/navigation/MainStackNavigator';
import { AppProvider } from './src/context/AppContext';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

export default function App() {
  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" translucent={false} backgroundColor="#0F0F10" />
          <SafeAreaView style={styles.safeViewport} edges={['top']}>
            <SafeAreaProvider>
              <AppProvider>
                <NavigationContainer>
                  <MainStackNavigator />
                </NavigationContainer>
              </AppProvider>
            </SafeAreaProvider>
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeViewport: { flex: 1, backgroundColor: '#0F0F10' },
});
