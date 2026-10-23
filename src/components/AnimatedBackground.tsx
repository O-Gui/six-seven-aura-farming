import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

const PARTICLE_COUNT = 50;

type ParticleData = {
  x: number;
  y: number;
  size: number;
  travel: number;
  duration: number;
  offset: number;
};

function Particle({ data }: { data: ParticleData }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: data.duration, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const p = (progress.value + data.offset) % 1;
    return {
      opacity: interpolate(p, [0, 0.2, 0.8, 1], [0, 0.7, 0.7, 0]),
      transform: [{ translateY: -p * data.travel }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: data.x,
          top: data.y,
          width: data.size,
          height: data.size,
          borderRadius: data.size / 2,
        },
        style,
      ]}
    />
  );
}

export default function AnimatedBackground() {
  const { width, height } = useWindowDimensions();

  const particles = useMemo<ParticleData[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: height * 0.15 + Math.random() * height * 0.75,
        size: 2 + Math.random() * 3,
        travel: 120 + Math.random() * 200,
        duration: 9000 + Math.random() * 8000,
        offset: Math.random(),
      })),
    [width, height]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} data={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    backgroundColor: colors.cyan,
  },
});