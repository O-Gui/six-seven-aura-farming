
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import AnimatedBackground from '../components/AnimatedBackground';
import { isLevelImplemented } from '../game/levels';
import {
  hitPercent,
  missPercent,
  unlocksNextLevel,
} from '../game/scoring';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const DESIGN_W = 463;
const DESIGN_H = 1037;

const STAR = require('../../assets/images/star.png');

const STAR_67 = require('../../assets/images/67star.png');
const STAR_67_SOURCE = Image.resolveAssetSource(STAR_67) ?? {
  width: 1,
  height: 1,
};
const STAR_67_WIDTH = STAR_67_SOURCE.width ?? 1;
const STAR_67_HEIGHT = STAR_67_SOURCE.height ?? 1;
const STAR_67_ASPECT = STAR_67_WIDTH / STAR_67_HEIGHT;

const SMALL_STARS = [
  { x: 104, y: 128, size: 84 },
  { x: 191, y: 78, size: 98 },
  { x: 296, y: 128, size: 84 },
];

function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function PopIn({
  delay,
  enabled,
  style,
  children,
}: {
  delay: number;
  enabled: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const progress = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (enabled) {
      progress.value = withDelay(
        delay,
        withSpring(1, { damping: 9, stiffness: 140 })
      );
    }
    return () => cancelAnimation(progress);
  }, [delay, enabled, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value * 2, 1),
    transform: [{ scale: 0.3 + progress.value * 0.7 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

export default function PosGameScreen({ navigation, route }: Props) {
  const { levelId, hits, misses, totalNotes, stars, outcome } = route.params;
  const leaving = useRef(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const hitsPct = hitPercent(hits, totalNotes);
  const missesPct = missPercent(misses, totalNotes);
  const accuracyPct = hitsPct;
  const isPerfect = outcome === 'perfect';

  // A próxima fase precisa existir e estar desbloqueada.
  const nextLevelId = levelId + 1;
  const nextLevelImplemented = isLevelImplemented(nextLevelId);
  const canGoNext =
    nextLevelImplemented && unlocksNextLevel(stars);

  const availableHeight = height - insets.top - insets.bottom;
  const scale = Math.min(width / DESIGN_W, availableHeight / DESIGN_H);
  const u = (n: number) => n * scale;
  const offsetX = (width - u(DESIGN_W)) / 2;
  const offsetY = insets.top + (availableHeight - u(DESIGN_H)) / 2;

  const box = (cx: number, cy: number, w: number, h: number) => ({
    position: 'absolute' as const,
    left: u(cx - w / 2),
    top: u(cy - h / 2),
    width: u(w),
    height: u(h),
    lineHeight: u(h),
    textAlign: 'center' as const,
    includeFontPadding: false,
  });

  const stateLabel =
    outcome === 'lost' ? 'FASE PERDIDA' : 'FASE CONCLUÍDA';

  const startLevel = (nextId: number) => {
    if (leaving.current || !navigation.isFocused()) return;

    leaving.current = true;
    navigation.replace('Game', { levelId: nextId });
  };

  const goNext = () => {
    if (canGoNext) startLevel(nextLevelId);
  };

  const replayLevel = () => startLevel(levelId);

  const goToLevelList = () => {
    if (leaving.current || !navigation.isFocused()) return;

    leaving.current = true;
    navigation.popTo('LevelsList');
  };

  return (
    <View style={styles.root}>
      {/* Bordas laterais */}
      <View style={styles.frames} pointerEvents="none">
        <Image
          source={require('../../assets/images/bg-left-menu.png')}
          style={styles.leftImage}
          resizeMode="contain"
        />
        <Image
          source={require('../../assets/images/bg-right-menu.png')}
          style={styles.rightImage}
          resizeMode="contain"
        />
      </View>

      <AnimatedBackground />

      <View
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: u(DESIGN_W),
          height: u(DESIGN_H),
        }}
      >
        {/* Três estrelas pequenas */}
        {SMALL_STARS.map((star, i) => {
          const earned = stars > i;

          return (
            <PopIn
              key={i}
              enabled={earned}
              delay={300 + i * 300}
              style={{
                position: 'absolute',
                left: u(star.x),
                top: u(star.y),
                width: u(star.size),
                height: u(star.size),
              }}
            >
              <Image
                source={STAR}
                style={{
                  width: '100%',
                  height: '100%',
                  tintColor: earned ? undefined : colors.starOff,
                }}
                resizeMode="contain"
              />
            </PopIn>
          );
        })}

        {/* Estrela 67: só com 100% de acertos */}
        {isPerfect ? (
          <PopIn
            enabled
            delay={1300}
            style={{
              position: 'absolute',
              left: u(65),
              top: u(195),
              width: u(350),
              aspectRatio: STAR_67_ASPECT,
            }}
          >
            <Image
              source={STAR_67}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </PopIn>
        ) : (
          <Text
            style={[
              box(240, 315, 340, 60),
              styles.stateLabel,
              {
                fontSize: u(34),
                color:
                  outcome === 'lost'
                    ? colors.resultRed
                    : colors.starYellow,
              },
            ]}
          >
            {stateLabel}
          </Text>
        )}

        {/* RESULTADOS: agora aparecem em qualquer resultado */}
        <Text
          style={[
            box(237, 452, 200, 30),
            styles.levelLabel,
            { fontSize: u(22) },
          ]}
        >
          LEVEL {levelId}
        </Text>

        {/* Painel: acertos, erros e acurácia */}
        <View
          style={{
            position: 'absolute',
            left: u(85),
            top: u(483),
            width: u(304),
            height: u(259),
            borderRadius: u(38),
            borderWidth: 2,
            borderColor: colors.resultBorder,
            backgroundColor: colors.resultPanel,
          }}
        />

        {[
          {
            label: 'ACERTOS',
            value: hitsPct,
            color: colors.resultGreen,
            line: colors.resultLine,
            top: 538,
          },
          {
            label: 'ERROS',
            value: missesPct,
            color: colors.resultRed,
            line: colors.resultLineMuted,
            top: 593,
          },
          {
            label: 'ACURÁCIA',
            value: accuracyPct,
            color: colors.resultGreen,
            line: colors.resultLine,
            top: 648,
          },
        ].map((row) => (
          <View
            key={row.label}
            style={{
              position: 'absolute',
              left: u(104),
              top: u(row.top),
              width: u(261),
              height: u(36),
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingBottom: u(3),
              borderBottomWidth: 2,
              borderBottomColor: row.line,
            }}
          >
            <Text style={{ color: colors.resultLabel, fontSize: u(21) }}>
              {row.label}
            </Text>

            <Text style={{ color: row.color, fontSize: u(21) }}>
              {formatPercent(row.value)}
            </Text>
          </View>
        ))}

        {/* Notas acertadas */}
        <Image
          source={require('../../assets/images/box-de-acertos.png')}
          style={{
            position: 'absolute',
            left: u(40),
            top: u(770),
            width: u(385),
            height: u(165),
          }}
          resizeMode="stretch"
        />

        <Text
          style={[
            box(233, 826, 300, 26),
            styles.notesLabel,
            { fontSize: u(19) },
          ]}
        >
          NOTAS ACERTADAS
        </Text>

        <Text
          style={[
            box(238, 882, 300, 74),
            styles.notesNumber,
            { fontSize: u(64) },
          ]}
        >
          {hits}
        </Text>

        {/* Navegação */}
        <Pressable
          onPress={goToLevelList}
          onPressIn={() =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
          hitSlop={12}
          style={({ pressed }) => [
            styles.linkButton,
            {
              left: u(20),
              top: u(944),
              height: u(40),
              gap: u(4),
            },
            pressed && styles.linkPressed,
          ]}
        >
          <Feather
            name="arrow-left"
            size={u(30)}
            color={colors.backArrow}
          />
          <Text
            style={[
              styles.linkText,
              { fontSize: Math.max(10, u(11)) },
            ]}
          >
            LEVEL LIST
          </Text>
        </Pressable>

        <Pressable
          onPress={replayLevel}
          onPressIn={() =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
          hitSlop={12}
          style={({ pressed }) => [
            styles.linkButton,
            {
              left: '50%',
              top: u(944),
              height: u(40),
              gap: u(4),
              transform: [{ translateX: u(-43) }],
            },
            pressed && styles.linkPressed,
          ]}
        >
          <Feather
            name="refresh-cw"
            size={u(25)}
            color={colors.backArrow}
          />
          <Text
            style={[
              styles.linkText,
              { fontSize: Math.max(10, u(11)) },
            ]}
          >
            REPLAY
          </Text>
        </Pressable>

        <Pressable
          disabled={!canGoNext}
          onPress={goNext}
          onPressIn={() =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
          hitSlop={12}
          style={({ pressed }) => [
            styles.linkButton,
            {
              right: u(20),
              top: u(944),
              height: u(40),
              gap: u(4),
            },
            !canGoNext && styles.linkDisabled,
            pressed && styles.linkPressed,
          ]}
        >
          <Text
            style={[
              styles.linkText,
              { fontSize: Math.max(10, u(11)) },
            ]}
          >
            {nextLevelImplemented ? 'NEXT LEVEL' : 'EM BREVE'}
          </Text>

          {nextLevelImplemented && (
            <Feather
              name="arrow-right"
              size={u(30)}
              color={colors.backArrow}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  frames: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  leftImage: {
    position: 'absolute',
    left: 10,
    top: 0,
    bottom: 0,
    width: '35%',
    height: '100%',
  },
  rightImage: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: '35%',
    height: '100%',
  },
  stateLabel: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  sideText: {
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bigNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  levelLabel: {
    color: colors.resultLabel,
    letterSpacing: 1,
  },
  notesLabel: {
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  notesNumber: {
    color: '#FFFFFF',
  },
  linkButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    color: colors.backArrow,
    letterSpacing: 1,
  },
  linkDisabled: {
    opacity: 0.3,
  },
  linkPressed: {
    opacity: 0.6,
  },
});
