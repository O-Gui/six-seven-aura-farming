import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import type { PropsWithChildren } from 'react';
import { colors } from '../theme/colors';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuScreen from '../screens/MenuScreen';
import LevelListScreen from '../screens/LevelListScreen';
import GameScreen from '../screens/GameScreen';
import PosGameScreen from '../screens/PosGameScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// A pilha preserva o caminho de volta; só a tela em foco monta seu conteúdo.
function FocusedScreen({ children }: PropsWithChildren) {
  return useIsFocused() ? children : null;
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenLayout={({ children }) => <FocusedScreen>{children}</FocusedScreen>}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="Home" component={MenuScreen} />
        <Stack.Screen name="LevelsList" component={LevelListScreen} />
        <Stack.Screen name="Game" component={GameScreen} options={{ animation: 'none' }} />
        <Stack.Screen name="Result" component={PosGameScreen} options={{ animation: 'none' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}