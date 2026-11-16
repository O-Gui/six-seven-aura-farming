
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Dispatch,
  SetStateAction,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { RootStackParamList } from '../navigation/types';
import AuraBar from '../components/AuraBar';
import Lane from '../components/Lane';
import MenuButton from '../components/MenuButton';
import FallingNote from '../components/FallingNote';

import {
  useGameStore,
  selectHitPercent,
  selectRisk,
} from '../store/gameStore';

import { colors } from '../theme/colors';
import { getBeatmap } from '../beatmaps';

import {
  canHitNote,
  getNotePosition,
} from '../game/notePosition';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const HEADER_ROW = 48;
const FOOTER_HEIGHT = 110;
const COUNTDOWN_DURATION = 3000;

type Beatmap = ReturnType<typeof getBeatmap>;
type GameStatus = ReturnType<typeof useGameStore.getState>['status'];
type Note = Beatmap['notes'][number];

type ScheduledNote = {
  index: number;
  startMs: number;
  endMs: number;
};

type PreparedBeatmap = {
  schedule: ScheduledNote[];
  endTimes: number[];
};

type AudioClockBridgeProps = {
  player: ReturnType<typeof useAudioPlayer>;
  status: GameStatus;
  laneWidth: number;
  laneHeight: number;
  preparedBeatmap: PreparedBeatmap;
  beatmap: Beatmap;
  gameClock: SharedValue<number>;
  gameTimeRef: { current: number };
  nextNoteCursor: { current: number };
  activeNoteIndicesRef: { current: number[] };
  setActiveNoteIndices: Dispatch<SetStateAction<number[]>>;
};

// Prepara a sequência uma única vez antes da partida.
function prepareBeatmap(beatmap: Beatmap): PreparedBeatmap {
  const schedule: ScheduledNote[] = [];
  const endTimes: number[] = [];

  beatmap.notes.forEach((note, index) => {
    const startMs = note.timeMs - beatmap.approachTimeMs;
    const endMs =
      startMs + beatmap.approachTimeMs * 1.25;

    schedule.push({
      index,
      startMs,
      endMs,
    });

    endTimes[index] = endMs;
  });

  schedule.sort((a, b) => a.startMs - b.startMs);

  return {
    schedule,
    endTimes,
  };
}

// Atualiza somente as notas que estão na janela de execução.
// Uma nota só vira erro quando passa completamente pela hitbox.
function updateActiveNotes(
  currentTimeMs: number,
  beatmap: Beatmap,
  prepared: PreparedBeatmap,
  nextNoteCursor: { current: number },
  activeNoteIndicesRef: { current: number[] },
  setter: Dispatch<SetStateAction<number[]>>,
  laneWidth: number,
  laneHeight: number,
) {
  const resolved = useGameStore.getState().resolved;
  const expiredIndices: number[] = [];

  const hasPassedHitbox = (index: number) => {
    if (laneWidth <= 0 || laneHeight <= 0) {
      return false;
    }

    const note = beatmap.notes[index];

    const position = getNotePosition(
      laneWidth,
      laneHeight,
      currentTimeMs,
      note.timeMs,
      beatmap.approachTimeMs,
    );

    if (!position) return false;

    const hitboxBottom =
      position.targetCenterY + laneWidth / 2 + 3;

    // A borda superior já ultrapassou a hitbox.
    return position.top >= hitboxBottom;
  };

  const nextIndices = activeNoteIndicesRef.current.filter((index) => {
    const stillVisible =
      currentTimeMs <= prepared.endTimes[index];

    const wasRecentlyHit =
      resolved[index] === 'hit' &&
      currentTimeMs <= beatmap.notes[index].timeMs + 1000;

    const passedHitbox = hasPassedHitbox(index);

    if (
      passedHitbox &&
      resolved[index] === undefined
    ) {
      expiredIndices.push(index);
    }

    return stillVisible || wasRecentlyHit;
  });

  let cursor = nextNoteCursor.current;

  while (cursor < prepared.schedule.length) {
    const scheduled = prepared.schedule[cursor];

    if (scheduled.startMs > currentTimeMs) {
      break;
    }

    const alreadyPassed = hasPassedHitbox(scheduled.index);

    if (!alreadyPassed) {
      nextIndices.push(scheduled.index);
    } else if (resolved[scheduled.index] === undefined) {
      expiredIndices.push(scheduled.index);
    }

    cursor++;
  }

  nextNoteCursor.current = cursor;

  // Registra os erros das notas que ultrapassaram a hitbox.
  for (const index of expiredIndices) {
    useGameStore.getState().resolveNote(index, 'miss');
  }

  const previous = activeNoteIndicesRef.current;

  const unchanged =
    previous.length === nextIndices.length &&
    previous.every((index, position) => index === nextIndices[position]);

  if (!unchanged) {
    activeNoteIndicesRef.current = nextIndices;
    setter(nextIndices);
  }
}

// Recebe o relógio do áudio e atualiza o agendamento incremental.
function AudioClockBridge({
  player,
  status,
  preparedBeatmap,
  beatmap,
  gameClock,
  gameTimeRef,
  nextNoteCursor,
  activeNoteIndicesRef,
  setActiveNoteIndices,
  laneWidth,
  laneHeight,
}: AudioClockBridgeProps) {
  const audioStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status === 'paused' || status === 'countdown') {
      return;
    }

    if (status !== 'playing') {
      nextNoteCursor.current = 0;
      activeNoteIndicesRef.current = [];
      setActiveNoteIndices([]);
      return;
    }

    const currentTimeMs = audioStatus.currentTime * 1000;

    gameClock.value = currentTimeMs;
    gameTimeRef.current = currentTimeMs;

    updateActiveNotes(
      currentTimeMs,
      beatmap,
      preparedBeatmap,
      nextNoteCursor,
      activeNoteIndicesRef,
      setActiveNoteIndices,
      laneWidth,
      laneHeight,
    );
  }, [
    audioStatus.currentTime,
    status,
    beatmap,
    preparedBeatmap,
    gameClock,
    gameTimeRef,
    nextNoteCursor,
    activeNoteIndicesRef,
    setActiveNoteIndices,
    laneWidth,
    laneHeight,
  ]);

  useEffect(() => {
    if (audioStatus.didJustFinish) {
      useGameStore.getState().failRemainingNotes();
    }
  }, [audioStatus.didJustFinish]);

  return null;
}

type ActiveNoteProps = {
  index: number;
  note: Note;
  laneWidth: number;
  laneHeight: number;
  gameClock: SharedValue<number>;
  approachTimeMs: number;
  source: number;
};

// Cada nota observa somente o próprio estado de acerto.
const ActiveNote = memo(function ActiveNote({
  index,
  note,
  laneWidth,
  laneHeight,
  gameClock,
  approachTimeMs,
  source,
}: ActiveNoteProps) {
  const isHit = useGameStore(
    (state) => state.resolved[index] === 'hit',
  );

  const isMiss = useGameStore(
    (state) => state.resolved[index] === 'miss',
  );

  return (
    <FallingNote
      source={source}
      laneWidth={laneWidth}
      laneHeight={laneHeight}
      gameClock={gameClock}
      timeMs={note.timeMs}
      approachTimeMs={approachTimeMs}
      isHit={isHit}
      isMiss={isMiss}
    />
  );
});

// HUD isolada.
const AuraDisplay = memo(function AuraDisplay() {
  const percent = useGameStore(selectHitPercent);
  const risk = useGameStore(selectRisk);

  return <AuraBar percent={percent} risk={risk} />;
});

export default function GameScreen({ navigation, route }: Props) {
  const { levelId } = route.params;

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();

  const laneWidth = width * 0.29;
  const laneGap = width * 0.18;

  // Carrega e prepara o level uma única vez por ID.
  const beatmap = useMemo(
    () => getBeatmap(levelId),
    [levelId],
  );

  const preparedBeatmap = useMemo(
    () => prepareBeatmap(beatmap),
    [beatmap],
  );

  // Calcula automaticamente o pré-roll com base na primeira nota.
  const preRollDurationMs = useMemo(() => {
    if (beatmap.notes.length === 0) return 0;

    const firstNoteTimeMs = beatmap.notes.reduce(
      (earliest, note) => Math.min(earliest, note.timeMs),
      Number.POSITIVE_INFINITY,
    );

    return Math.max(
      0,
      beatmap.approachTimeMs - firstNoteTimeMs,
    );
  }, [beatmap]);

  const player = useAudioPlayer(
    require('../../assets/music/Korobeiniki_funk.mp3'),
    { updateInterval: 16 },
  );

  const gameClock = useSharedValue(-COUNTDOWN_DURATION);
  const gameTimeRef = useRef(-COUNTDOWN_DURATION);

  const nextNoteCursor = useRef(0);
  const activeNoteIndicesRef = useRef<number[]>([]);

  const [activeNoteIndices, setActiveNoteIndices] = useState<number[]>([]);
  const [laneHeight, setLaneHeight] = useState(0);
  const [countdownLabel, setCountdownLabel] = useState('3');

  const countdownRemaining = useRef(COUNTDOWN_DURATION);

  // A tela observa somente o status da partida.
  const status = useGameStore((state) => state.status);

  const {
    startLevel,
    beginPlaying,
    resolveNote,
    pause,
    resume,
  } = useGameStore.getState();

  // Inicialização da fase.
  useEffect(() => {
    if (!isFocused) {
      player.pause();
      player.seekTo(0);
      return;
    }

    countdownRemaining.current = COUNTDOWN_DURATION;

    nextNoteCursor.current = 0;
    activeNoteIndicesRef.current = [];

    setCountdownLabel('3');
    setActiveNoteIndices([]);
    setLaneHeight(0);

    gameClock.value = -COUNTDOWN_DURATION;
    gameTimeRef.current = -COUNTDOWN_DURATION;

    player.pause();
    player.seekTo(0);

    startLevel(levelId, beatmap.notes.length);
  }, [isFocused, levelId]);

  // Countdown seguido pelo pré-roll das notas.
  useEffect(() => {
    if (!isFocused || status !== 'countdown') return;

    const endAt = Date.now() + countdownRemaining.current;

    let cancelled = false;

    let preRollInterval: ReturnType<typeof setInterval> | null = null;

    const startPreRoll = async () => {
      // Garante que a música esteja posicionada no início.
      try {
        await player.seekTo(0);
      } catch {
        return;
      }

      if (cancelled || !isFocused) return;

      // Reinicia o agendamento das notas.
      nextNoteCursor.current = 0;
      activeNoteIndicesRef.current = [];
      setActiveNoteIndices([]);

      const preRollStartAt = Date.now();

      const updatePreRoll = () => {
        if (cancelled || !isFocused) return;

        const elapsed = Date.now() - preRollStartAt;

        // O relógio começa negativo e termina em zero.
        const visualTime = Math.min(
          elapsed - preRollDurationMs,
          0,
        );

        gameClock.value = visualTime;
        gameTimeRef.current = visualTime;

        // Faz as notas começarem a cair antes da música.
        updateActiveNotes(
          visualTime,
          beatmap,
          preparedBeatmap,
          nextNoteCursor,
          activeNoteIndicesRef,
          setActiveNoteIndices,
          laneWidth,
          laneHeight,
        );

        // Quando o pré-roll termina, começa a música.
        if (elapsed >= preRollDurationMs) {
          if (preRollInterval !== null) {
            clearInterval(preRollInterval);
            preRollInterval = null;
          }

          gameClock.value = 0;
          gameTimeRef.current = 0;

          beginPlaying();
          player.play();
        }
      };

      // Atualiza imediatamente para mostrar a primeira nota.
      preRollInterval = setInterval(updatePreRoll, 16);
      updatePreRoll();
    };

    const updateCountdown = () => {
      const remaining = endAt - Date.now();

      if (!isFocused || cancelled) return;

      const countdownTime = -Math.max(remaining, 0);

      gameClock.value = countdownTime;
      gameTimeRef.current = countdownTime;

      if (remaining <= 0) {
        clearInterval(countdownInterval);

        countdownRemaining.current = 0;
        setCountdownLabel('GO!');

        // Inicia o pré-roll, sem iniciar a música ainda.
        void startPreRoll();

        return;
      }

      setCountdownLabel(String(Math.ceil(remaining / 1000)));
    };

    const countdownInterval = setInterval(updateCountdown, 50);

    updateCountdown();

    return () => {
      cancelled = true;

      clearInterval(countdownInterval);

      if (preRollInterval !== null) {
        clearInterval(preRollInterval);
      }

      const remaining = endAt - Date.now();

      if (remaining > 0) {
        countdownRemaining.current = remaining;
      }
    };
  }, [
    status,
    isFocused,
    player,
    preRollDurationMs,
    beginPlaying,
    beatmap,
    preparedBeatmap,
    gameClock,
    gameTimeRef,
    nextNoteCursor,
    activeNoteIndicesRef,
    setActiveNoteIndices,
    laneWidth,
    laneHeight,
  ]);

  const audioBridge = (
    <AudioClockBridge
      player={player}
      status={status}
      beatmap={beatmap}
      preparedBeatmap={preparedBeatmap}
      gameClock={gameClock}
      gameTimeRef={gameTimeRef}
      nextNoteCursor={nextNoteCursor}
      activeNoteIndicesRef={activeNoteIndicesRef}
      setActiveNoteIndices={setActiveNoteIndices}
      laneWidth={laneWidth}
      laneHeight={laneHeight}
    />
  );

  // Remove o GO depois de 500 ms.
  useEffect(() => {
    if (countdownLabel !== 'GO!') return;

    const timeout = setTimeout(() => {
      setCountdownLabel('');
    }, 500);

    return () => clearTimeout(timeout);
  }, [countdownLabel]);

  // Para o áudio ao terminar.
  useEffect(() => {
    if (status === 'finished') {
      player.pause();
    }
  }, [status]);

  // Abre a tela de resultado.
  useEffect(() => {
    if (status === 'finished') {
      navigation.replace('Result', { levelId });
    }
  }, [status, levelId, navigation]);

  const goToMenu = () => {
    player.pause();
    player.seekTo(0);

    useGameStore.getState().reset();

    navigation.navigate('Home');
  };

  const pauseGame = () => {
    const currentStatus = useGameStore.getState().status;

    pause();

    if (currentStatus === 'playing') {
      player.pause();
    }
  };

  const resumeGame = () => {
    const previousStatus = useGameStore.getState().pausedFrom;

    resume();

    if (previousStatus === 'playing') {
      player.play();
    }
  };

  // Procura somente entre as notas atualmente ativas.
  const handleLanePress = (lane: 'left' | 'right') => {
    const game = useGameStore.getState();

    if (game.status !== 'playing' || laneHeight <= 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentTimeMs = gameTimeRef.current;
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const index of activeNoteIndicesRef.current) {
      const note = beatmap.notes[index];

      if (note.lane !== lane) continue;
      if (game.resolved[index] !== undefined) continue;

      const position = getNotePosition(
        laneWidth,
        laneHeight,
        currentTimeMs,
        note.timeMs,
        beatmap.approachTimeMs,
      );

      if (!position || !canHitNote(position, laneWidth)) {
        continue;
      }

      const distance = Math.abs(
        position.top +
        position.noteHeight / 2 -
        position.targetCenterY,
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    if (bestIndex !== -1) {
      resolveNote(bestIndex, 'hit');
    }
  };

  return (
    <View style={styles.root}>
      {audioBridge}

      {/* Cabeçalho */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Image
          source={require('../../assets/images/headline.png')}
          style={styles.headerBackground}
          resizeMode="stretch"
        />

        <View style={styles.titleRow}>
          <Pressable
            onPress={pauseGame}
            onPressIn={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            hitSlop={12}
            style={({ pressed }) => [
              styles.back,
              pressed && styles.backPressed,
            ]}
          >
            <Feather
              name="arrow-left"
              size={30}
              color={colors.backArrow}
              style={styles.backIcon}
            />
          </Pressable>

          <Text style={styles.title}>AURA FARMING</Text>
        </View>

        <View style={[styles.barWrap, { paddingHorizontal: width * 0.02 }]}>
          <AuraDisplay />
        </View>
      </View>

      {/* Área do jogo */}
      <View style={[styles.playfield, { gap: laneGap }]}>
        <Lane
          width={laneWidth}
          onHeightChange={setLaneHeight}
          onPress={() => handleLanePress('left')}
        >
          {activeNoteIndices.map((index) => {
            const note = beatmap.notes[index];

            if (note.lane !== 'left') return null;

            return (
              <ActiveNote
                key={note.id}
                index={index}
                note={note}
                source={require('../../assets/images/nota-vermelho6.png')}
                laneWidth={laneWidth}
                laneHeight={laneHeight}
                gameClock={gameClock}
                approachTimeMs={beatmap.approachTimeMs}
              />
            );
          })}
        </Lane>

        <Lane
          width={laneWidth}
          onHeightChange={setLaneHeight}
          onPress={() => handleLanePress('right')}
        >
          {activeNoteIndices.map((index) => {
            const note = beatmap.notes[index];

            if (note.lane !== 'right') return null;

            return (
              <ActiveNote
                key={note.id}
                index={index}
                note={note}
                source={require('../../assets/images/nota-azul7.png')}
                laneWidth={laneWidth}
                laneHeight={laneHeight}
                gameClock={gameClock}
                approachTimeMs={beatmap.approachTimeMs}
              />
            );
          })}
        </Lane>

        {(
          (status === 'countdown' && countdownLabel !== '') ||
          (status === 'playing' && countdownLabel === 'GO!')
        ) ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdownLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Rodapé */}
      <View
        style={[
          styles.footer,
          {
            height: FOOTER_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <Image
          source={require('../../assets/images/backgroundlines-fase.png')}
          style={styles.footerBackground}
          resizeMode="stretch"
        />

        <Text style={styles.footerText}>LEVEL {levelId}</Text>
      </View>

      {/* Menu de pausa */}
      <Modal
        visible={status === 'paused'}
        transparent
        animationType="fade"
        onRequestClose={resumeGame}
      >
        <View style={styles.overlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>PAUSE</Text>

            <View style={styles.pauseButtons}>
              <MenuButton
                label="RESUME"
                fontSize={22}
                textColor={colors.cyan}
                glowColor={colors.cyan}
                background={require('../../assets/images/botao-menu-azul.png')}
                onPress={resumeGame}
              />

              <MenuButton
                label="MENU"
                fontSize={22}
                textColor={colors.purpleText}
                glowColor={colors.purpleText}
                background={require('../../assets/images/botao-menu-roxo.png')}
                onPress={goToMenu}
              />
            </View>

            <Pressable
              onPress={() => navigation.replace('Result', { levelId })}
            >
              <Text style={styles.testLink}>
                (teste) FINALIZAR FASE
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerLine,
    paddingBottom: 8,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '30%',
  },
  titleRow: {
    height: HEADER_ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: 8,
    width: 56,
    height: HEADER_ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.9 }],
  },
  backIcon: {
    textShadowColor: colors.backArrow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  title: {
    color: colors.cyan,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  barWrap: {
    width: '90%',
    alignSelf: 'center',
  },
  playfield: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 0,
    paddingHorizontal: 10,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  countdownText: {
    color: colors.cyan,
    fontSize: 76,
    fontWeight: '900',
    textShadowColor: colors.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  debugBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  debugText: {
    color: colors.cyanLight,
    fontSize: 12,
  },
  footer: {
    backgroundColor: colors.gameFooter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  footerText: {
    color: colors.gameFooterText,
    fontSize: 22,
    letterSpacing: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pauseCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderColor: colors.cyan,
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  pauseTitle: {
    color: colors.cyanLight,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pauseButtons: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  testLink: {
    color: colors.purpleText,
    fontSize: 12,
  },
});
