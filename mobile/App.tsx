import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './store/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import { SplashScreen } from './components/common/SplashScreen';

export default function App() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
        {!isSplashDone && (
          <SplashScreen onFinish={() => setIsSplashDone(true)} minDurationMs={1800} />
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}

