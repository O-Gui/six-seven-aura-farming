
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ButtonSoundProvider } from './src/audio/buttonSound';
import AppNavigator from './src/navigation/AppNavigator';

// Impede que a splash desapareça automaticamente.
SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_MIN_MS = 1000;
const SPLASH_MAX_MS = 3000;

export default function App() {
  const [soundReady, setSoundReady] = useState(Platform.OS === 'web');
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [startupTimedOut, setStartupTimedOut] = useState(false);
  const handleSoundReady = useCallback(() => setSoundReady(true), []);

  useEffect(() => {
    const minimumTimer = setTimeout(() => setMinimumElapsed(true), SPLASH_MIN_MS);
    const fallbackTimer = setTimeout(() => setStartupTimedOut(true), SPLASH_MAX_MS);
    return () => {
      clearTimeout(minimumTimer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const canHideSplash = (minimumElapsed && soundReady) || startupTimedOut;
  useEffect(() => {
    if (!canHideSplash) return;
    SplashScreen.hideAsync().catch((error) => {
      console.warn('Erro ao esconder a Splash Screen:', error);
    });
  }, [canHideSplash]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setVisibilityAsync('hidden');

        // @ts-ignore
        NavigationBar.setBehaviorAsync('overlay-swipe');
      } catch (error) {
        console.log(
          'Modo imersivo não suportado nesta execução',
          error
        );
      }
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" hidden={true} />
      <ButtonSoundProvider onReady={handleSoundReady}>
        <AppNavigator />
      </ButtonSoundProvider>
    </GestureHandlerRootView>
  );
}
