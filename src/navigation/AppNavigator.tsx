import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuScreen from '../screens/MenuScreen';
import LevelListScreen from '../screens/LevelListScreen';
import GameScreen from '../screens/GameScreen';
import PosGameScreen from '../screens/PosGameScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={MenuScreen} />
        <Stack.Screen name="LevelsList" component={LevelListScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Result" component={PosGameScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}