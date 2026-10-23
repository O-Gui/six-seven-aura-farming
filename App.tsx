import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setVisibilityAsync('hidden');
        // @ts-ignore - Ignora o erro do TypeScript caso a tipagem da sua versão esteja desatualizada
        NavigationBar.setBehaviorAsync('overlay-swipe');
      } catch (error) {
        console.log('Modo imersivo não suportado nesta execução', error);
      }
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" hidden={true} />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}