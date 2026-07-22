import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/store/appStore';
import { AuthProvider } from './src/store/authStore';
import { MessagesProvider } from './src/store/messagesStore';
import { ToastProvider } from './src/components/ui/Toast';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initMonitoring } from './src/lib/monitoring';

initMonitoring();

function ThemedStatusBar() {
  const { isDark } = useApp();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AuthProvider>
          <MessagesProvider>
            <ToastProvider>
              <ThemedStatusBar />
              <RootNavigator />
            </ToastProvider>
          </MessagesProvider>
        </AuthProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
