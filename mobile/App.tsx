import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './store/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import { SplashScreen } from './components/common/SplashScreen';
import { PushNotificationService } from './services/pushNotifications';

export default function App() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  useEffect(() => {
    // Initialize notification channels and register push token for background notifications
    PushNotificationService.registerForPushNotifications().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
        {!isSplashDone && (
          <SplashScreen onFinish={() => setIsSplashDone(true)} minDurationMs={1800} />
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}

