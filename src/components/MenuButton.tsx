import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  background: ImageSourcePropType;
  icon?: ImageSourcePropType;
  textColor: string;
  glowColor?: string;
  fontSize?: number;
  onPress: () => void;
};

export default function MenuButton({
  label,
  background,
  icon,
  textColor,
  glowColor = colors.cyan,
  fontSize = 24,
  onPress,
}: Props) {
  const glow = useSharedValue(0);

  const haloGlow = useAnimatedStyle(() => ({ opacity: glow.value * 0.1 }));
  const outerGlow = useAnimatedStyle(() => ({ opacity: glow.value * 0.1 }));
  const innerGlow = useAnimatedStyle(() => ({ opacity: glow.value * 0.1 }));
  const whiteFlash = useAnimatedStyle(() => ({ opacity: glow.value * 0.1 }));
  const body = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - glow.value * 0.03 }],
  }));
  const textGlow = useAnimatedStyle(() => ({
    textShadowRadius: glow.value * 10,
  }));

  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      onPressIn={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        glow.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        glow.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.quad),
        });
      }}
    >
      <Animated.View style={[styles.fill, body]}>
        <Image source={background} style={styles.fill} resizeMode="contain" />

        {/* camadas de luz, da mais externa para a mais interna */}
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { backgroundColor: glowColor }, haloGlow]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.glowOuter, { backgroundColor: glowColor }, outerGlow]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowInner,
            { backgroundColor: glowColor, borderColor: glowColor },
            innerGlow,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.glowInner, styles.white, whiteFlash]}
        />

        <View style={styles.content}>
          {icon && <Image source={icon} style={styles.icon} resizeMode="contain" />}
          <Animated.Text
            style={[
              styles.label,
              { color: textColor, fontSize, textShadowColor: glowColor },
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
    width: '56%',
    aspectRatio: 3.3,
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
    top: -4,
    bottom: -4,
    left: -6,
    right: -6,
    borderRadius: 999,
  },
  glowOuter: {
    position: 'absolute',
    top: '3%',
    bottom: '3%',
    left: 0,
    right: 0,
    borderRadius: 999,
  },
  glowInner: {
    position: 'absolute',
    top: '8%',
    bottom: '8%',
    left: '3%',
    right: '3%',
    borderRadius: 999,
    borderWidth: 2,
  },
  white: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
  },
});