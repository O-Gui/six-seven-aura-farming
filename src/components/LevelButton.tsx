import { Image, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

const BG_UNLOCKED = require('../../assets/images/botao-list-verde.png');
const BG_LOCKED = require('../../assets/images/botao-list-vermelho.png');
const ICON_PLAY = require('../../assets/images/icon-play-list.png');
const ICON_LOCK = require('../../assets/images/icon-lock-list.png');

const LOCK_RED = '#FF3B3B';
const LOCK_WHITE = '#FFFFFF';
const ICON_SIZE = 38;

// Linha do tempo do cadeado (progresso de 0 a 1):
// branco -> vermelho -> branco -> vermelho -> volta ao normal
const WHITE_IN = [0, 0.01, 0.14, 0.15, 0.4, 0.41, 0.54, 0.55, 1];
const WHITE_OUT = [0, 1, 1, 0, 0, 1, 1, 0, 0];
const RED_IN = [0, 0.14, 0.15, 0.4, 0.41, 0.54, 0.55, 0.8, 1];
const RED_OUT = [0, 0, 1, 1, 0, 0, 1, 1, 0];

// Círculo centrado no cadeado, usado para simular o brilho
function disc(size: number, color: string, opacity: number) {
  return {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    left: (ICON_SIZE - size) / 2,
    top: (ICON_SIZE - size) / 2,
    backgroundColor: color,
    opacity,
  };
}

type Props = {
  label: string;
  locked: boolean;
  onPress: () => void;
};

export default function LevelButton({ label, locked, onPress }: Props) {
  // Fase liberada
  const glow = useSharedValue(0);
  // Fase bloqueada (só o cadeado)
  const lockProgress = useSharedValue(0);
  const lockShake = useSharedValue(0);

  const glowColor = colors.levelUnlockedGlow;
  const textColor = locked ? colors.levelLockedText : colors.levelUnlockedText;

  // --- Estilos da fase liberada ---
  const haloStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.35 }));
  const outerStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.45 }));
  const innerStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.8 }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - glow.value * 0.03 }],
  }));
  const textGlow = useAnimatedStyle(() => ({
    textShadowRadius: glow.value * 18,
  }));

  // --- Estilos do cadeado ---
  const lockShakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lockShake.value },
      { rotate: `${lockShake.value * 1.5}deg` },
    ],
  }));
  const whiteTint = useAnimatedStyle(() => ({
    opacity: interpolate(lockProgress.value, WHITE_IN, WHITE_OUT),
  }));
  const redTint = useAnimatedStyle(() => ({
    opacity: interpolate(lockProgress.value, RED_IN, RED_OUT),
  }));
  const whiteHalo = useAnimatedStyle(() => ({
    opacity: interpolate(lockProgress.value, WHITE_IN, WHITE_OUT) * 0.6,
  }));
  const redHalo = useAnimatedStyle(() => ({
    opacity: interpolate(lockProgress.value, RED_IN, RED_OUT),
  }));

  const triggerLockedFeedback = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    lockProgress.value = 0;
    lockProgress.value = withTiming(1, { duration: 800, easing: Easing.linear });

    lockShake.value = withSequence(
      withTiming(-6, { duration: 40 }),
      withRepeat(withTiming(6, { duration: 80 }), 9, true),
      withTiming(0, { duration: 40 })
    );
  };

  const handlePressIn = () => {
    if (locked) {
      triggerLockedFeedback();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    glow.value = withTiming(1, { duration: 80 });
  };

  const handlePressOut = () => {
    if (locked) return;
    glow.value = withTiming(0, { duration: 450, easing: Easing.out(Easing.quad) });
  };

  const handlePress = () => {
    if (!locked) onPress();
  };

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.fill, bodyStyle]}>
        <Image
          source={locked ? BG_LOCKED : BG_UNLOCKED}
          style={styles.fill}
          resizeMode="contain"
        />

        {/* Brilho do botão: só nas fases liberadas */}
        {!locked && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.halo, { backgroundColor: glowColor }, haloStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.glowOuter, { backgroundColor: glowColor }, outerStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glowInner,
                { backgroundColor: glowColor, borderColor: glowColor },
                innerStyle,
              ]}
            />
          </>
        )}

        <View style={styles.iconSlot}>
          {locked ? (
            <Animated.View style={[styles.iconBox, lockShakeStyle]}>
              {/* Brilho branco */}
              <Animated.View pointerEvents="none" style={[styles.haloGroup, whiteHalo]}>
                <View style={disc(76, LOCK_WHITE, 0.12)} />
                <View style={disc(58, LOCK_WHITE, 0.2)} />
                <View style={disc(44, LOCK_WHITE, 0.3)} />
              </Animated.View>

              {/* Brilho vermelho */}
              <Animated.View pointerEvents="none" style={[styles.haloGroup, redHalo]}>
                <View style={disc(76, LOCK_RED, 0.14)} />
                <View style={disc(58, LOCK_RED, 0.24)} />
                <View style={disc(44, LOCK_RED, 0.36)} />
              </Animated.View>

              {/* Cadeado normal + versões tingidas por cima */}
              <Image source={ICON_LOCK} style={styles.icon} resizeMode="contain" />
              <Animated.Image
                source={ICON_LOCK}
                resizeMode="contain"
                style={[styles.icon, styles.iconOverlay, { tintColor: LOCK_WHITE }, whiteTint]}
              />
              <Animated.Image
                source={ICON_LOCK}
                resizeMode="contain"
                style={[styles.icon, styles.iconOverlay, { tintColor: LOCK_RED }, redTint]}
              />
            </Animated.View>
          ) : (
            <View style={styles.iconBox}>
              <Image source={ICON_PLAY} style={styles.icon} resizeMode="contain" />
            </View>
          )}
        </View>

        <View style={styles.labelWrap}>
          <Animated.Text
            style={[
              styles.label,
              { color: textColor, textShadowColor: glowColor },
              textGlow,
            ]}
          >
            {label}
          </Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '88%',
    aspectRatio: 3.7, // largura/altura do PNG do botão; ajuste se esticar
    alignSelf: 'center',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  halo: {
    position: 'absolute',
    top: '4%',
    bottom: '4%',
    left: 0,
    right: 0,
    borderRadius: 999,
  },
  glowOuter: {
    position: 'absolute',
    top: '8%',
    bottom: '8%',
    left: '1%',
    right: '1%',
    borderRadius: 999,
  },
  glowInner: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    left: '2.5%',
    right: '2.5%',
    borderRadius: 999,
    borderWidth: 2,
  },
  iconSlot: {
    position: 'absolute',
    left: '9%',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  haloGroup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  labelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 28,
  },
  label: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
  },
});