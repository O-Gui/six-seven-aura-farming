
import * as Haptics from 'expo-haptics';
import {
  createRef,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { createAudioPlayer, preload } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { colors } from '../theme/colors';
import { TARGET_CENTER_RATIO } from '../game/notePosition';

const TARGET = require('../../assets/images/botao-de-impacto.png');
const IMPACT_SOUND = require('../../assets/sounds/som_botao_impacto.mp3');

void preload(IMPACT_SOUND).catch(() => {});

const TARGET_TOP = (TARGET_CENTER_RATIO * 100).toFixed(0) + '%' as `${number}%`;
const WAVE_SLOTS = Array.from({ length: 8 }, (_, index) => index);
const IMPACT_PLAYER_COUNT = 4;

type ImpactWaveHandle = {
  start: () => void;
};

type ImpactWaveProps = {
  size: number;
};

// Cada onda possui seus próprios valores compartilhados.
// O componente permanece montado e só inicia quando recebe start().
const ImpactWave = memo(forwardRef<ImpactWaveHandle, ImpactWaveProps>(
  function ImpactWave({ size }, ref) {
    const scale = useSharedValue(0.65);
    const opacity = useSharedValue(0);

    useEffect(() => () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    }, [opacity, scale]);

    useImperativeHandle(
      ref,
      () => ({
        start() {
          cancelAnimation(scale);
          cancelAnimation(opacity);
          scale.value = 0.65;
          opacity.value = 0.9;

          scale.value = withTiming(1.9, {
            duration: 215,
            easing: Easing.out(Easing.ease),
          });

          opacity.value = withTiming(0, {
            duration: 215,
            easing: Easing.out(Easing.ease),
          });
        },
      }),
      [scale, opacity],
    );

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.impactAura,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            marginTop: -size / 2,
          },
          animatedStyle,
        ]}
      />
    );
  },
));

type AudioPoolEntry = {
  player: AudioPlayer;
  busy: boolean;
  needsReset: boolean;
  subscription?: { remove: () => void };
};

type Props = {
  width: number;
  children?: ReactNode;
  onHeightChange?: (height: number) => void;
  onPress?: () => void;
  canInteract?: boolean;
};

export default function Lane({
  width,
  children,
  onHeightChange,
  onPress,
  canInteract = true,
}: Props) {
  const targetSize = width;

  // --------------------------------------------------
  // POOL DE ONDAS
  // --------------------------------------------------

  const nextWave = useRef(0);
  const waveRefs = useMemo(() => WAVE_SLOTS.map(() => createRef<ImpactWaveHandle>()), []);

  const triggerWave = useCallback(() => {
    // Reutiliza a onda mais antiga quando os oito slots giram.
    const slot = nextWave.current;
    nextWave.current = (slot + 1) % WAVE_SLOTS.length;
    waveRefs[slot].current?.start();
  }, [waveRefs]);

  const audioPool = useRef<AudioPoolEntry[]>([]);
  const mounted = useRef(true);

  const createPoolPlayer = useCallback(() => {
    const player = createAudioPlayer(IMPACT_SOUND);

    const entry: AudioPoolEntry = {
      player,
      busy: false,
      needsReset: false,
    };

    audioPool.current.push(entry);

    entry.subscription = player.addListener(
      'playbackStatusUpdate',
      (status) => {
        if (status.didJustFinish) {
          entry.busy = false;
          entry.needsReset = true;
        }
      },
    );

    return entry;
  }, []);

  const playImpactSound = useCallback(() => {
    if (!mounted.current) return;

    const entry = audioPool.current.find((item) => !item.busy);
    if (!entry) return;

    entry.busy = true;
    try {
      if (!entry.needsReset) {
        entry.player.play();
        return;
      }

      void entry.player.seekTo(0).then(() => {
        if (audioPool.current.includes(entry)) {
          entry.player.play();
          entry.needsReset = false;
        }
      }).catch(() => {
        entry.busy = false;
      });
    } catch {
      entry.busy = false;
    }
  }, []);

  // --------------------------------------------------
  // CICLO DE VIDA
  // --------------------------------------------------

  useEffect(() => {
    mounted.current = true;
    for (let index = 0; index < IMPACT_PLAYER_COUNT; index++) {
      try {
        createPoolPlayer();
      } catch (error) {
        console.warn('Erro ao preparar som de impacto:', error);
        break;
      }
    }

    return () => {
      mounted.current = false;

      for (const entry of audioPool.current) {
        entry.subscription?.remove();

        try {
          entry.player.release();
        } catch {
          // Player já liberado.
        }
      }

      audioPool.current = [];
    };
  }, [createPoolPlayer]);

  // --------------------------------------------------
  // IMPACTO
  // --------------------------------------------------

  const triggerImpact = useCallback(() => {
    triggerWave();
    playImpactSound();

    void Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Heavy,
    ).catch(() => {});
  }, [triggerWave, playImpactSound]);

  // --------------------------------------------------
  // TOQUE
  // --------------------------------------------------

  function handleTouchStart(event: GestureResponderEvent) {
    if (!canInteract || !onPress) return;

    const touchCount = Math.max(
      1,
      event.nativeEvent.changedTouches?.length ?? 1,
    );

    for (let i = 0; i < touchCount; i++) {
      onPress();
      triggerImpact();
    }
  }

  return (
    <View
      style={[styles.lane, { width }]}
      onLayout={(event) => {
        onHeightChange?.(event.nativeEvent.layout.height);
      }}
    >
      {/* Notas do jogo */}
      <View style={styles.notesViewport} pointerEvents="none">
        {children}
      </View>

      {/* Botão visual */}
      <View
        pointerEvents="none"
        style={[
          styles.target,
          {
            top: TARGET_TOP,
            marginTop: -targetSize / 2,
            width: targetSize,
            height: targetSize,
          },
        ]}
      >
        <Image
          source={TARGET}
          resizeMode="contain"
          style={styles.targetImage}
        />
      </View>

      {/* Pool de ondas independentes */}
      {WAVE_SLOTS.map((id) => (
        <ImpactWave
          key={id}
          ref={waveRefs[id]}
          size={targetSize}
        />
      ))}

      {/* Área de toque */}
      <View
        collapsable={false}
        onTouchStart={handleTouchStart}
        style={styles.touchZone}
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
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  impactAura: {
    position: 'absolute',
    left: 0,
    top: TARGET_TOP,
    zIndex: 2,
    borderWidth: 3,
    borderColor: '#39FF70',
    backgroundColor: 'rgba(57, 255, 112, 0.13)',
  },

  touchZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },

  targetImage: {
    width: '100%',
    height: '100%',
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
