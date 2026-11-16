
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';
import { colors } from '../theme/colors';

const TARGET = require('../../assets/images/botao-de-impacto.png');
const IMPACT_SOUND = require('../../assets/sounds/som_botao_impacto.mp3');

const HITBOX_SCALE = 0.75;

type Props = {
  width: number;
  children?: ReactNode;
  onHeightChange?: (height: number) => void;
  onPress?: () => void;
};

export default function Lane({
  width,
  children,
  onHeightChange,
  onPress,
}: Props) {
  const targetSize = width;
  const hitboxSize = targetSize * HITBOX_SCALE;
  const hitboxOffset = (targetSize - hitboxSize) / 2;

  const player = useAudioPlayer(IMPACT_SOUND);
  const playbackRequest = useRef(0);

  const buttonScale = useSharedValue(1);
  const auraScale = useSharedValue(0.65);
  const auraOpacity = useSharedValue(0);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const animatedAuraStyle = useAnimatedStyle(() => ({
    opacity: auraOpacity.value,
    transform: [{ scale: auraScale.value }],
  }));

  function playImpactSound() {
    const request = ++playbackRequest.current;

    player.pause();
    player.volume = 1;

    void player.seekTo(0).then(() => {
      // Só a solicitação mais recente inicia a reprodução.
      if (request !== playbackRequest.current) return;

      player.play();
    }).catch(() => {
      // Evita erro não tratado caso o áudio falhe ao reiniciar.
    });
  }

  function handlePress() {
    // Registra o pressionamento imediatamente.
    onPress?.();

    // Reinicia o som desde o início.
    playImpactSound();

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Heavy
    );

    // Reinicia a animação do botão imediatamente.
    cancelAnimation(buttonScale);

    buttonScale.value = 1;

    buttonScale.value = withSequence(
      withTiming(1.09, { duration: 75 }),
      withTiming(1, { duration: 140 }),
    );

    // Reinicia a aura imediatamente.
    cancelAnimation(auraScale);
    cancelAnimation(auraOpacity);

    auraScale.value = 0.65;
    auraOpacity.value = 0;

    auraOpacity.value = 0.9;

    auraScale.value = withTiming(1.9, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });

    auraOpacity.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
  }

  return (
    <View
      style={[styles.lane, { width }]}
      onLayout={(event) => {
        onHeightChange?.(event.nativeEvent.layout.height);
      }}
    >
      <View style={styles.notesViewport} pointerEvents="none">
        {children}
      </View>

      {/* Botão visual */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.target,
          animatedButtonStyle,
          {
            top: '73%',
            marginTop: -targetSize / 2,
            width: targetSize,
            height: targetSize,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.aura,
            animatedAuraStyle,
          ]}
        />

        <View
          pointerEvents="none"
          style={styles.glow}
        />

        <Image
          source={TARGET}
          resizeMode="contain"
          style={styles.targetImage}
        />
      </Animated.View>

      {/* Área clicável */}
      <Pressable
        onPressIn={handlePress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel="Botão de impacto"
        style={[
          styles.hitbox,
          {
            top: '73%',
            marginTop: -targetSize / 2 + hitboxOffset,
            left: hitboxOffset,
            width: hitboxSize,
            height: hitboxSize,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lane: {
    height: '100%',
    backgroundColor: colors.gameLane,
  },

  target: {
    position: 'absolute',
    left: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hitbox: {
    position: 'absolute',
    zIndex: 3,
    backgroundColor: 'transparent',
  },

  aura: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#39FF70',
    backgroundColor: 'rgba(57, 255, 112, 0.13)',
    shadowColor: '#39FF70',
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },

  glow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    backgroundColor: 'rgba(57, 255, 112, 0.09)',
    shadowColor: '#39FF70',
    shadowOpacity: 0.9,
    shadowRadius: 13,
    elevation: 8,
  },

  targetImage: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },

  notesViewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
