
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

type Props = {
  percent: number;
  risk?: number;
};

export default function AuraBar({
  percent,
  risk = 0,
}: Props) {
  const fill = useSharedValue(
    Math.max(0, Math.min(100, percent))
  );

  const riskValue = useSharedValue(
    Math.max(0, Math.min(1, risk))
  );

  useEffect(() => {
    fill.value = withTiming(
      Math.max(0, Math.min(100, percent)),
      {
        duration: 250,
        easing: Easing.out(Easing.quad),
      }
    );
  }, [percent]);

  useEffect(() => {
    riskValue.value = withTiming(
      Math.max(0, Math.min(1, risk)),
      {
        duration: 350,
        easing: Easing.inOut(Easing.quad),
      }
    );
  }, [risk]);

  const fillStyle = useAnimatedStyle(() => {
    // Cor-base baseada na porcentagem real de acertos.
    const performanceColor = interpolateColor(
      fill.value,
      [0, 51, 65, 90, 100],
      [
        colors.auraYellow,
        colors.auraYellow,
        '#90FFA8',
        '#90FFA8',
        '#7A90FF',
      ]
    );

    // O risco aproxima a cor-base do vermelho.
    const finalColor = interpolateColor(
      riskValue.value,
      [0, 1],
      [performanceColor, '#FF2020']
    );

    return {
      width: `${fill.value}%` as `${number}%`,
      backgroundColor: finalColor,
    };
  });

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/aura-bar.png')}
        style={styles.frame}
        resizeMode="stretch"
      />

      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, fillStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 7.6,
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
