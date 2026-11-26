
import { memo, useEffect } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
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
import {
  getImpactHitboxRadius,
  getNoteEndTop,
  MISS_COLOR_TRANSITION_MS,
  NOTE_ASPECT_RATIO,
  NOTE_WIDTH_RATIO,
  TARGET_CENTER_RATIO,
} from '../game/notePosition';

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

function MissTint({ source, gameClock, missTime }: {
  source: ImageSourcePropType;
  gameClock: SharedValue<number>;
  missTime: number;
}) {
  const colorStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (gameClock.value - missTime) / MISS_COLOR_TRANSITION_MS)),
  }));

  return (
    <Animated.Image
      source={source}
      resizeMode="contain"
      style={[styles.sprite, styles.miss, colorStyle]}
    />
  );
}

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

  const noteWidth = laneWidth * NOTE_WIDTH_RATIO;
  const noteHeight = noteWidth / NOTE_ASPECT_RATIO;
  const targetCenterY = laneHeight * TARGET_CENTER_RATIO;
  const endTop = getNoteEndTop(laneWidth, laneHeight, approachTimeMs);
  const travel = targetCenterY + noteHeight / 2;
  const hitboxBottom = targetCenterY + getImpactHitboxRadius(laneWidth);
  const missTime = timeMs - approachTimeMs + (hitboxBottom + noteHeight) * approachTimeMs / travel;

  // Altura do rastro em relação ao tamanho da nota.
  const trailWidth = noteWidth;
  const trailHeight = noteHeight * 1.2;

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
    const progress = (gameClock.value - (timeMs - approachTimeMs)) / approachTimeMs;
    const top = -noteHeight + progress * travel;
    const visible = progress >= 0 && top <= endTop;

    return {
      transform: [{ translateY: top }],
      opacity: isHit ? opacity.value : Number(visible),
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
    <Animated.View
      pointerEvents="none"
      style={[styles.group, { width: laneWidth, height: noteHeight }, animatedStyle]}
    >
      <Image
        source={trailSource}
        resizeMode="stretch"
        pointerEvents="none"
        style={[
          styles.trail,
          {
            left: (laneWidth - trailWidth) / 2,
            width: trailWidth,
            height: trailHeight,
            top: -trailHeight + noteHeight * 0.12,
          },
        ]}
      />

      <View style={[styles.note, { left: (laneWidth - noteWidth) / 2, width: noteWidth, height: noteHeight }]}>
        <Image
          source={source}
          resizeMode="contain"
          style={[styles.sprite, isHit && styles.hit]}
        />
        {isMiss && (
          <MissTint source={source} gameClock={gameClock} missTime={missTime} />
        )}
      </View>
    </Animated.View>
  );
}

export default memo(FallingNote);

const styles = StyleSheet.create({
  sprite: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  group: { position: 'absolute', top: 0, left: 0 },
  hit: { tintColor: '#FFFFFF' },
  miss: { tintColor: '#FF8C00' },
  trail: {
    position: 'absolute',
  },
  note: {
    position: 'absolute',
  },
});
