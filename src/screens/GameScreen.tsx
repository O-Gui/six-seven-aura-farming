import { View, Text, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function MenuScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SIX SEVEN - AURA FARMING</Text>
      <Button title="PLAY" onPress={() => navigation.navigate('Game', { levelId: 1 })} />
      <Button title="LEVELS LIST" onPress={() => navigation.navigate('LevelsList')} />
      <Button title="CREDITS" onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14142B', alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { color: '#fff', fontSize: 22 },
});