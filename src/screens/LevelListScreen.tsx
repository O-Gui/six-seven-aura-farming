import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import AnimatedBackground from '../components/AnimatedBackground';
import LevelButton from '../components/LevelButton';
import { LEVELS } from '../game/levels';
import { isLevelUnlocked, useProgressStore } from '../store/progressStore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelsList'>;

const HEADER_HEIGHT = 64;

export default function LevelListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const stars = useProgressStore((state) => state.stars);

  return (
    <View style={styles.root}>
      <AnimatedBackground />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: insets.top + HEADER_HEIGHT + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {LEVELS.map((level) => (
          <LevelButton
            key={level.id}
            label={`LEVEL ${level.id}`}
            locked={!isLevelUnlocked(stars, level.id)}
            onPress={() => navigation.navigate('Game', { levelId: level.id })}
          />
        ))}
      </ScrollView>

      {/* Cabeçalho fixo por cima da lista */}
      <View style={[styles.header, { height: insets.top + HEADER_HEIGHT }]}>
        <Image
          source={require('../../assets/images/headline.png')}
          style={styles.headerBackground}
          resizeMode="stretch"
        />

        <Pressable
  onPress={() =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')
  }
  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
  hitSlop={12}
  style={({ pressed }) => [
    styles.back,
    { top: insets.top },
    pressed && styles.backPressed,
  ]}
>
  <Feather
    name="arrow-left"
    size={30}
    color={colors.backArrow}
    style={styles.backIcon}
  />
</Pressable>

        <Text style={[styles.title, { marginTop: insets.top }]}>LEVELS LIST</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    gap: 14,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerLine,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  back: {
    position: 'absolute',
    left: 8,
    width: 56,
    height: HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.9 }],
  },
  backIcon: {
    textShadowColor: colors.backArrow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  title: {
    color: colors.cyan,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
  },
});