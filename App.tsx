
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';

// Impede que a splash desapareça automaticamente.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    // Mantém a splash visível por 3 segundos.
    const splashTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch((error) => {
        console.warn('Erro ao esconder a Splash Screen:', error);
      });
    }, 3000);

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

    return () => clearTimeout(splashTimer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" hidden={true} />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
