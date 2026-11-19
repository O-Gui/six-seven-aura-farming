
import { memo, useEffect } from 'react';
import {
  ImageSourcePropType,
  StyleSheet,
} from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

type Props = {
  source: ImageSourcePropType;
  trailSource: ImageSourcePropType;
  laneWidth: number;
  laneHeight: number;
  gameClock: SharedValue<number>;
  timeMs: number;
  approachTimeMs: number;
  isHit: boolean;
  isMiss: boolean;
  onHitAnimationComplete?: () => void;
};

function FallingNote({
  source,
  trailSource,
  laneWidth,
  laneHeight,
  gameClock,
  timeMs,
  approachTimeMs,
  isHit,
  isMiss,
  onHitAnimationComplete,
}: Props) {
  const opacity = useSharedValue(1);

  const noteWidth = laneWidth * 0.59;
  const noteHeight = noteWidth / 0.76;
  const targetCenterY = laneHeight * 0.73;

  // Altura do rastro em relação ao tamanho da nota.
  const trailWidth = noteWidth;
  const trailHeight = noteHeight * 1.2;

  const hitboxBottom = targetCenterY + laneWidth / 2 + 3;

  useEffect(() => {
    if (!isHit) return;

    cancelAnimation(opacity);

    opacity.value = withDelay(
      100,
      withTiming(0, { duration: 220 }, (finished) => {
        if (finished && onHitAnimationComplete) {
          runOnJS(onHitAnimationComplete)();
        }
      }),
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [isHit, opacity, onHitAnimationComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    if (approachTimeMs <= 0) {
      return {
        top: 0,
        opacity: 0,
      };
    }

    const progress =
      (gameClock.value - (timeMs - approachTimeMs)) /
      approachTimeMs;

    const top =
      -noteHeight +
      progress * (targetCenterY + noteHeight / 2);

    const passedTarget = top > hitboxBottom;

    return {
      top,
      opacity: isHit
        ? opacity.value
        : progress >= 0 && progress <= 1.25
          ? 1
          : 0,
      tintColor: isHit
        ? '#FFFFFF'
        : isMiss || passedTarget
          ? '#FF8C00'
          : undefined,
    };
  });

  const animatedTrailStyle = useAnimatedStyle(() => {
    if (approachTimeMs <= 0) {
      return {
        top: 0,
        opacity: 0,
      };
    }

    const progress =
      (gameClock.value - (timeMs - approachTimeMs)) /
      approachTimeMs;

    const noteTop =
      -noteHeight +
      progress * (targetCenterY + noteHeight / 2);

    return {
      // Mantém o rastro conectado à parte superior da nota.
      top: noteTop - trailHeight + noteHeight * 0.12,
      opacity: isHit
        ? opacity.value
        : progress >= 0 && progress <= 1.25
          ? 1
          : 0,
    };
  });

  if (
    laneWidth <= 0 ||
    laneHeight <= 0 ||
    approachTimeMs <= 0
  ) {
    return null;
  }

  return (
    <>
      <Animated.Image
        source={trailSource}
        resizeMode="stretch"
        pointerEvents="none"
        style={[
          styles.trail,
          {
            left: (laneWidth - trailWidth) / 2,
            width: trailWidth,
            height: trailHeight,
            opacity: 0.85,
          },
          animatedTrailStyle,
        ]}
      />

      <Animated.Image
        source={source}
        resizeMode="contain"
        pointerEvents="none"
        style={[
          styles.note,
          {
            left: (laneWidth - noteWidth) / 2,
            width: noteWidth,
            height: noteHeight,
          },
          animatedStyle,
        ]}
      />
    </>
  );
}

export default memo(FallingNote);

const styles = StyleSheet.create({
  trail: {
    position: 'absolute',
  },
  note: {
    position: 'absolute',
  },
});
