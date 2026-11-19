
import * as Haptics from 'expo-haptics';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { createAudioPlayer, preload } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { colors } from '../theme/colors';

const TARGET = require('../../assets/images/botao-de-impacto.png');
const IMPACT_SOUND = require('../../assets/sounds/som_botao_impacto.mp3');

void preload(IMPACT_SOUND).catch(() => {});

const INITIAL_WAVE_SLOTS = 8;

type ImpactWaveHandle = {
  start: () => void;
};

type ImpactWaveProps = {
  id: number;
  size: number;
  onComplete: (id: number) => void;
};

// Cada onda possui seus próprios valores compartilhados.
// O componente permanece montado e só inicia quando recebe start().
const ImpactWave = forwardRef<ImpactWaveHandle, ImpactWaveProps>(
  function ImpactWave({ id, size, onComplete }, ref) {
    const scale = useSharedValue(0.65);
    const opacity = useSharedValue(0);

    useImperativeHandle(
      ref,
      () => ({
        start() {
          scale.value = 0.65;
          opacity.value = 0.9;

          scale.value = withTiming(
            1.9,
            {
              duration: 215,
              easing: Easing.out(Easing.ease),
            },
            (finished) => {
              if (finished) {
                runOnJS(onComplete)(id);
              }
            },
          );

          opacity.value = withTiming(0, {
            duration: 215,
            easing: Easing.out(Easing.ease),
          });
        },
      }),
      [id, onComplete, scale, opacity],
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
            marginTop: -size / 2,
          },
          animatedStyle,
        ]}
      />
    );
  },
);

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
  laneId: 'left' | 'right';
};

export default function Lane({
  width,
  children,
  onHeightChange,
  onPress,
  canInteract = true,
  laneId,
}: Props) {
  const targetSize = width;

  // --------------------------------------------------
  // POOL DE ONDAS
  // --------------------------------------------------

  const [waveSlots, setWaveSlots] = useState<number[]>(() =>
    Array.from({ length: INITIAL_WAVE_SLOTS }, (_, index) => index),
  );

  const waveSlotsRef = useRef(waveSlots);
  const nextWaveId = useRef(INITIAL_WAVE_SLOTS);

  // Slots atualmente executando animações.
  const busyWaves = useRef(new Set<number>());

  // Referências imperativas dos componentes de onda.
  const waveRefs = useRef(new Map<number, ImpactWaveHandle>());

  // Toques que aguardam a montagem de novos slots.
  const pendingWaveStarts = useRef(0);

  const finishWave = useCallback((id: number) => {
    busyWaves.current.delete(id);
  }, []);

  const startAvailableWave = useCallback(() => {
    const availableId = waveSlotsRef.current.find(
      (id) => !busyWaves.current.has(id),
    );

    if (availableId === undefined) {
      return false;
    }

    const wave = waveRefs.current.get(availableId);

    if (!wave) {
      return false;
    }

    busyWaves.current.add(availableId);
    wave.start();

    return true;
  }, []);

  const triggerWave = useCallback(() => {
    // Primeiro tenta utilizar um slot já montado.
    if (startAvailableWave()) {
      return;
    }

    // Se todos estiverem ocupados, cria um novo slot.
    // Nenhuma animação ativa é interrompida.
    const newId = nextWaveId.current++;

    waveSlotsRef.current = [...waveSlotsRef.current, newId];
    pendingWaveStarts.current += 1;

    setWaveSlots(waveSlotsRef.current);
  }, [startAvailableWave]);

  // Depois que novos componentes são montados,
  // inicia os impactos que estavam aguardando.
  useEffect(() => {
    while (
      pendingWaveStarts.current > 0 &&
      startAvailableWave()
    ) {
      pendingWaveStarts.current -= 1;
    }
  }, [waveSlots, startAvailableWave]);

  // --------------------------------------------------
  // POOL DE ÁUDIO
  // --------------------------------------------------

  const audioPool = useRef<AudioPoolEntry[]>([]);
  const mounted = useRef(true);

  const createPoolPlayer = useCallback(() => {
    const player = createAudioPlayer(IMPACT_SOUND);

    const entry: AudioPoolEntry = {
      player,
      busy: true,
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

    try {
      // Procura um player que não esteja reproduzindo.
      let entry = audioPool.current.find(
        (item) => !item.busy,
      );

      // Se todos estiverem ocupados, cria outro.
      if (!entry) {
        entry = createPoolPlayer();
      } else {
        entry.busy = true;
      }

      const player = entry.player;

      // Players novos já começam no início.
      if (!entry.needsReset) {
        player.play();
        return;
      }

      // Só reposiciona players cuja reprodução terminou.
      // Nunca altera o áudio de um player ocupado.
      entry.needsReset = false;

      void player
        .seekTo(0)
        .then(() => {
          if (mounted.current) {
            player.play();
          }
        })
        .catch((error) => {
          entry!.busy = false;
          console.warn('[IMPACTO] Erro ao reiniciar áudio:', error);
        });
    } catch (error) {
      console.warn('[IMPACTO] Erro ao reproduzir áudio:', error);
    }
  }, [createPoolPlayer]);

  // --------------------------------------------------
  // CICLO DE VIDA
  // --------------------------------------------------

  useEffect(() => {
    mounted.current = true;

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
      busyWaves.current.clear();
      waveRefs.current.clear();
    };
  }, []);

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

    console.log(
      `[IMPACTO] Pista: ${laneId} | Toques: ${touchCount}`,
    );

    for (let i = 0; i < touchCount; i++) {
      triggerImpact();
      onPress();
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
            top: '73%',
            marginTop: -targetSize / 2,
            width: targetSize,
            height: targetSize,
          },
        ]}
      >
        <View style={styles.glow} />

        <Image
          source={TARGET}
          resizeMode="contain"
          style={styles.targetImage}
        />
      </View>

      {/* Pool de ondas independentes */}
      {waveSlots.map((id) => (
        <ImpactWave
          key={id}
          ref={(instance) => {
            if (instance) {
              waveRefs.current.set(id, instance);
            } else {
              waveRefs.current.delete(id);
            }
          }}
          id={id}
          size={targetSize}
          onComplete={finishWave}
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
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  impactAura: {
    position: 'absolute',
    left: 0,
    top: '73%',
    zIndex: 2,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#39FF70',
    backgroundColor: 'rgba(57, 255, 112, 0.13)',
    shadowColor: '#39FF70',
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
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
