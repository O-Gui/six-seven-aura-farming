import { View, Text, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

export default function PosGameScreen({ navigation, route }: Props) {
  const { levelId } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESULTADO - LEVEL {levelId}</Text>
      <Button title="LEVEL LIST" onPress={() => navigation.navigate('LevelsList')} />
      <Button title="NEXT LEVEL" onPress={() => navigation.replace('Game', { levelId: levelId + 1 })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14142B', alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { color: '#fff', fontSize: 22 },
});