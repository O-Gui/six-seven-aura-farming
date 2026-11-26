import { useRef } from 'react';
import { useButtonSound } from '../audio/buttonSound';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import AnimatedBackground from '../components/AnimatedBackground';
import LevelButton from '../components/LevelButton';
import { LEVELS, isLevelImplemented } from '../game/levels';
import { isLevelUnlocked, useProgressStore } from '../store/progressStore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelsList'>;

const HEADER_HEIGHT = 64;

export default function LevelListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const stars = useProgressStore((state) => state.stars);

  const playButtonSound = useButtonSound();
  const leaving = useRef(false);

  const handleBack = () => {
    if (leaving.current || !navigation.isFocused()) return;

    leaving.current = true;
    playButtonSound();
    navigation.popTo('Home');
  };

  return (
    <View style={styles.root}>
      <AnimatedBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + HEADER_HEIGHT + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.levelsContainer}>
          {LEVELS.map((level) => {
            const implemented = isLevelImplemented(level.id);
            const unlocked = isLevelUnlocked(stars, level.id);

            return (
              <LevelButton
                key={level.id}
                label={implemented ? `LEVEL ${level.id}` : 'EM BREVE'}
                earnedStars={stars[level.id] ?? 0}
                locked={implemented && !unlocked}
                comingSoon={!implemented}
                onPress={() => {
                  if (!implemented || !unlocked || leaving.current || !navigation.isFocused()) return;

                  leaving.current = true;

                  playButtonSound();

                  navigation.navigate('Game', {
                    levelId: level.id,
                  });
                }}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Cabeçalho */}
      <View
        style={[
          styles.header,
          {
            height: HEADER_HEIGHT + insets.top,
            paddingTop: insets.top,
          },
        ]}
      >
        <Pressable
          onPress={handleBack}
          onPressIn={() =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
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

        <Text style={styles.title}>LEVELS LIST</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  levelsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerLine,
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