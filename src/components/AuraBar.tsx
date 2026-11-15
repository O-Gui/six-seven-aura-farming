import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

type Props = {
  percent: number; // 0 a 100: porcentagem real de acertos
  color?: string;
};

export default function AuraBar({ percent, color = colors.auraYellow }: Props) {
  const fill = useSharedValue(percent);

  useEffect(() => {
    fill.value = withTiming(Math.max(0, Math.min(100, percent)), {
      duration: 250,
      easing: Easing.out(Easing.quad),
    });
  }, [percent]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value}%` as `${number}%`,
  }));

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/aura-bar.png')}
        style={styles.frame}
        resizeMode="stretch"
      />
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 7.6, // largura/altura do PNG da barra; ajuste se esticar
  },
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  track: {
    position: 'absolute',
    left: '2.4%',
    right: '2.4%',
    top: '20%',
    bottom: '20%',
    borderRadius: 999,
    overflow: 'hidden',
    padding: 3,
    backgroundColor: colors.auraTrack,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});