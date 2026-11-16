
import { memo, useEffect } from 'react';
import {
  ImageSourcePropType,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

type Props = {
  source: ImageSourcePropType;
  laneWidth: number;
  laneHeight: number;
  gameClock: SharedValue<number>;
  timeMs: number;
  approachTimeMs: number;
  isHit: boolean;
  isMiss: boolean;
};

function FallingNote({
  source,
  laneWidth,
  laneHeight,
  gameClock,
  timeMs,
  approachTimeMs,
  isHit,
  isMiss,
}: Props) {
  const opacity = useSharedValue(1);

  const noteWidth = laneWidth * 0.59;
  const noteHeight = noteWidth / 0.76;
  const targetCenterY = laneHeight * 0.73;

  // Mesmo limite inferior utilizado pela hitbox.
  const hitboxBottom = targetCenterY + laneWidth / 2 + 3;

  useEffect(() => {
    if (isHit) {
      opacity.value = withTiming(0, {
        duration: 220,
      });
    }
  }, [isHit, opacity]);

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

    // A nota fica laranja quando ultrapassa o limite de acerto.
    const passedTarget = top > hitboxBottom;

    return {
      top,
      opacity:
        progress >= 0 && progress <= 1.25
          ? opacity.value
          : 0,
      tintColor: isHit
        ? '#FFFFFF'
        : isMiss || passedTarget
          ? '#FF8C00'
          : undefined,
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
  );
}

export default memo(FallingNote);

const styles = StyleSheet.create({
  note: {
    position: 'absolute',
  },
});
