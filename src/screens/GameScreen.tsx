import { View, Text, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ navigation, route }: Props) {
  const { levelId } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LEVEL {levelId}</Text>
      <Button title="(teste) FINALIZAR FASE" onPress={() => navigation.replace('Result', { levelId })} />
      <Button title="MENU" onPress={() => navigation.navigate('Home')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14142B', alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { color: '#fff', fontSize: 22 },
});