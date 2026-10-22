import { View, Text, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelsList'>;

export default function LevelListScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LEVELS LIST</Text>
      <Button title="LEVEL 1" onPress={() => navigation.navigate('Game', { levelId: 1 })} />
      <Button title="LEVEL 2" onPress={() => navigation.navigate('Game', { levelId: 2 })} />
      <Button title="VOLTAR" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14142B', alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { color: '#fff', fontSize: 22 },
});