
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'expo-audio';
import type { AudioStatus } from 'expo-audio';
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
import { useButtonSound } from '../audio/buttonSound';
import { getBeatmap } from '../beatmaps';

import {
  canHitNote,
  getImpactHitboxRadius,
  getNoteEndTop,
  getNotePosition,
} from '../game/notePosition';
import { isLevelImplemented } from '../game/levels';
import { useProgressStore } from '../store/progressStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const HEADER_ROW = 44;
const FOOTER_HEIGHT = 76;
const COUNTDOWN_DURATION = 4000;

type Beatmap = ReturnType<typeof getBeatmap>;
type GameStatus = ReturnType<typeof useGameStore.getState>['status'];
type Note = Beatmap['notes'][number];

type ScheduledNote = {
  index: number;
  startMs: number;
  missAfterMs: number;
  visibleUntilMs: number;
  hitEffectUntilMs: number;
};

type PreparedBeatmap = {
  schedule: ScheduledNote[];
  notesByIndex: ScheduledNote[];
};

type AudioClockBridgeProps = {
  player: ReturnType<typeof useAudioPlayer>;
  status: GameStatus;
  isFocused: boolean;
  preparedBeatmap: PreparedBeatmap;
  gameClock: SharedValue<number>;
  gameTimeRef: { current: number };
  nextNoteCursor: { current: number };
  activeNoteIndicesRef: { current: number[] };
  setActiveNoteIndices: Dispatch<SetStateAction<number[]>>;
};

// Converte a geometria da pista em horários quando o layout muda.
function prepareBeatmap(beatmap: Beatmap, laneWidth: number, laneHeight: number): PreparedBeatmap {
  const { approachTimeMs } = beatmap;
  const geometry = getNotePosition(laneWidth, laneHeight, 0, 0, approachTimeMs);
  let missOffsetMs = Infinity;
  let visibleOffsetMs = Infinity;
  if (geometry) {
    const { noteHeight, targetCenterY } = geometry;
    const msPerPoint = approachTimeMs / (targetCenterY + noteHeight / 2);
    const hitboxBottom = targetCenterY + getImpactHitboxRadius(laneWidth);
    const endTop = getNoteEndTop(laneWidth, laneHeight, approachTimeMs);
    missOffsetMs = (hitboxBottom + noteHeight) * msPerPoint;
    visibleOffsetMs = (endTop + noteHeight) * msPerPoint;
  }

  const notesByIndex = beatmap.notes.map((note, index) => {
    const startMs = note.timeMs - approachTimeMs;
    return {
      index,
      startMs,
      missAfterMs: startMs + missOffsetMs,
      visibleUntilMs: startMs + visibleOffsetMs,
      hitEffectUntilMs: note.timeMs + 1000,
    };
  });
  const schedule = notesByIndex.slice().sort((a, b) => a.startMs - b.startMs);
  return { schedule, notesByIndex };
}

function updateActiveNotes(
  currentTimeMs: number,
  prepared: PreparedBeatmap,
  nextNoteCursor: { current: number },
  activeNoteIndicesRef: { current: number[] },
  setter: Dispatch<SetStateAction<number[]>>,
) {
  const previous = activeNoteIndicesRef.current;
  const { schedule, notesByIndex } = prepared;
  let cursor = nextNoteCursor.current;
  const nextScheduled = schedule[cursor];
  if (!previous.length && (!nextScheduled || nextScheduled.startMs > currentTimeMs)) return;

  const { resolved, resolveMisses } = useGameStore.getState();
  let nextIndices: number[] | undefined;
  let expiredIndices: number[] | undefined;

  for (let position = 0; position < previous.length; position++) {
    const index = previous[position];
    const note = notesByIndex[index];
    const result = resolved[index];

    if (result === undefined && currentTimeMs > note.missAfterMs) {
      (expiredIndices ??= []).push(index);
    }

    const visibleUntilMs = result === 'hit' ? note.hitEffectUntilMs : note.visibleUntilMs;
    if (currentTimeMs > visibleUntilMs) {
      nextIndices ??= previous.slice(0, position);
    } else {
      nextIndices?.push(index);
    }
  }

  while (cursor < schedule.length && schedule[cursor].startMs <= currentTimeMs) {
    const note = schedule[cursor++];
    if (resolved[note.index] === undefined && currentTimeMs > note.missAfterMs) {
      (expiredIndices ??= []).push(note.index);
    }
    if (currentTimeMs <= note.visibleUntilMs) {
      (nextIndices ??= previous.slice()).push(note.index);
    }
  }
  nextNoteCursor.current = cursor;

  if (expiredIndices) resolveMisses(expiredIndices);
  if (nextIndices) {
    activeNoteIndicesRef.current = nextIndices;
    setter(nextIndices);
  }
}

// Recebe o relógio do áudio e atualiza o agendamento incremental.
function AudioClockBridge({
  player,
  status,
  isFocused,
  preparedBeatmap,
  gameClock,
  gameTimeRef,
  nextNoteCursor,
  activeNoteIndicesRef,
  setActiveNoteIndices,
}: AudioClockBridgeProps) {
  useEffect(() => {
    if (status === 'paused' || status === 'countdown') return;

    if (!isFocused || (status !== 'playing' && status !== 'finishing')) {
      nextNoteCursor.current = 0;
      activeNoteIndicesRef.current = [];
      setActiveNoteIndices([]);
      return;
    }

    let subscribed = true;
    let lastTimeMs: number | undefined;
    const updateClock = (audioStatus: AudioStatus) => {
      if (!subscribed) return;
      const game = useGameStore.getState();
      if (game.status !== 'playing' && game.status !== 'finishing') return;

      const currentTimeMs = audioStatus.currentTime * 1000;
      if (lastTimeMs !== currentTimeMs && Number.isFinite(currentTimeMs)) {
        lastTimeMs = currentTimeMs;
        gameClock.value = currentTimeMs;
        gameTimeRef.current = currentTimeMs;
        if (game.status === 'playing') {
          updateActiveNotes(
            currentTimeMs,
            preparedBeatmap,
            nextNoteCursor,
            activeNoteIndicesRef,
            setActiveNoteIndices,
          );
        }
      }

      if (audioStatus.didJustFinish) game.failRemainingNotes();
    };

    const subscription = player.addListener('playbackStatusUpdate', updateClock);
    updateClock(player.currentStatus);
    return () => {
      subscribed = false;
      subscription.remove();
    };
  }, [
    player,
    status,
    isFocused,
    preparedBeatmap,
    gameClock,
    gameTimeRef,
    nextNoteCursor,
    activeNoteIndicesRef,
    setActiveNoteIndices,
  ]);

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
  trailSource: number;
  onFadeComplete: (index: number) => void;
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
  trailSource,
  onFadeComplete,
}: ActiveNoteProps) {
  const result = useGameStore((state) => state.resolved[index]);
  const handleFadeComplete = useCallback(() => onFadeComplete(index), [index, onFadeComplete]);

  return (
    <FallingNote
      source={source}
      trailSource={trailSource}
      laneWidth={laneWidth}
      laneHeight={laneHeight}
      gameClock={gameClock}
      timeMs={note.timeMs}
      approachTimeMs={approachTimeMs}
      isHit={result === 'hit'}
      isMiss={result === 'miss'}
      onHitAnimationComplete={handleFadeComplete}
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

  const beatmap = useMemo(
    () => getBeatmap(levelId),
    [levelId],
  );

  const [laneHeight, setLaneHeight] = useState(0);
  const preparedBeatmap = useMemo(
    () => prepareBeatmap(beatmap, laneWidth, laneHeight),
    [beatmap, laneWidth, laneHeight],
  );

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

 // Player da música conforme a fase.
const player = useAudioPlayer(
  levelId === 2
    ? require('../../assets/music/level2.mp3')
    : require('../../assets/music/Korobeiniki_funk.mp3'),
  { updateInterval: 16 },
);

  // Player exclusivo da contagem regressiva.
  const countdownPlayer = useAudioPlayer(
    require('../../assets/sounds/contagem_regressiva.mp3'),
  );

  const playButtonSound = useButtonSound();

  const gameClock = useSharedValue(-COUNTDOWN_DURATION);
  const gameTimeRef = useRef(-COUNTDOWN_DURATION);

  const sessionActive = useRef(false);
  const nextNoteCursor = useRef(0);
  const activeNoteIndicesRef = useRef<number[]>([]);

  const [activeNoteIndices, setActiveNoteIndices] = useState<number[]>([]);
  const removeFadedNote = useCallback((index: number) => {
    if (!sessionActive.current || !navigation.isFocused()) return;
    const game = useGameStore.getState();
    if (game.resolved[index] !== 'hit') return;

    const active = activeNoteIndicesRef.current;
    if (!active.includes(index)) return;

    const remaining = active.filter((activeIndex) => activeIndex !== index);
    activeNoteIndicesRef.current = remaining;
    setActiveNoteIndices(remaining);
    game.finishLastHit(index);
  }, [navigation]);
  const [countdownLabel, setCountdownLabel] = useState('3');

  const countdownRemaining = useRef(COUNTDOWN_DURATION);

  const countdownAudioEnabled = useRef(false);
  const countdownAudioStarted = useRef(false);

  const status = useGameStore((state) => state.status);

  const {
    startLevel,
    beginPlaying,
    resolveNote,
    pause,
    resume,
  } = useGameStore.getState();

  useEffect(() => {
    if (!isFocused) return;

    if (!isLevelImplemented(levelId)) {
      navigation.replace('LevelsList');
      return;
    }

    sessionActive.current = true;
    countdownAudioEnabled.current = true;
    countdownAudioStarted.current = false;
    countdownRemaining.current = COUNTDOWN_DURATION;
    useProgressStore.getState().setLastPlayedLevel(levelId);
    startLevel(levelId, beatmap.notes.length);

    return () => {
      sessionActive.current = false;
      countdownAudioEnabled.current = false;
      activeNoteIndicesRef.current = [];
      nextNoteCursor.current = 0;
      useGameStore.getState().reset();
    };
  }, [beatmap.notes.length, isFocused, levelId, navigation, startLevel]);

  useEffect(() => {
    if (!isFocused || status !== 'countdown' || !countdownAudioEnabled.current) return;

    if (countdownAudioStarted.current) {
      countdownPlayer.play();
      return;
    }

    let cancelled = false;
    void countdownPlayer.seekTo(0).then(() => {
      if (cancelled || !sessionActive.current || !navigation.isFocused()
        || !countdownAudioEnabled.current || useGameStore.getState().status !== 'countdown') return;

      countdownAudioStarted.current = true;
      countdownPlayer.play();
    }).catch((error) => {
      if (!cancelled) console.warn('Erro ao iniciar áudio da contagem:', error);
    });

    return () => { cancelled = true; };
  }, [countdownPlayer, isFocused, navigation, status]);

  // Countdown seguido pelo pré-roll das notas.
  useEffect(() => {
    if (!isFocused || status !== 'countdown') return;

    const endAt = Date.now() + countdownRemaining.current;

    let cancelled = false;

    let preRollInterval: ReturnType<typeof setInterval> | null = null;

    const startPreRoll = () => {
      if (cancelled || !sessionActive.current || !navigation.isFocused()) return;

      nextNoteCursor.current = 0;
      activeNoteIndicesRef.current = [];
      setActiveNoteIndices([]);

      const preRollStartAt = Date.now();

      const updatePreRoll = () => {
        if (cancelled || !sessionActive.current || !navigation.isFocused()) return;

        const elapsed = Date.now() - preRollStartAt;

        const visualTime = Math.min(
          elapsed - preRollDurationMs,
          0,
        );

        gameClock.value = visualTime;
        gameTimeRef.current = visualTime;

        updateActiveNotes(
          visualTime,
          preparedBeatmap,
          nextNoteCursor,
          activeNoteIndicesRef,
          setActiveNoteIndices,
        );

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

      preRollInterval = setInterval(updatePreRoll, 16);
      updatePreRoll();
    };

    const updateCountdown = () => {
      const remaining = endAt - Date.now();

      if (cancelled || !sessionActive.current || !navigation.isFocused()) return;

      const countdownTime = -Math.max(remaining, 0);

      gameClock.value = countdownTime;
      gameTimeRef.current = countdownTime;

      if (remaining <= 0) {
        clearInterval(countdownInterval);

        countdownRemaining.current = 0;
        setCountdownLabel('GO!');

        countdownAudioEnabled.current = false;
        countdownPlayer.pause();

        startPreRoll();

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
    countdownPlayer,
    navigation,
    preRollDurationMs,
    beginPlaying,
    preparedBeatmap,
    gameClock,
    gameTimeRef,
    nextNoteCursor,
    activeNoteIndicesRef,
    setActiveNoteIndices,
  ]);

  const audioBridge = (
    <AudioClockBridge
      player={player}
      status={status}
      isFocused={isFocused}
      preparedBeatmap={preparedBeatmap}
      gameClock={gameClock}
      gameTimeRef={gameTimeRef}
      nextNoteCursor={nextNoteCursor}
      activeNoteIndicesRef={activeNoteIndicesRef}
      setActiveNoteIndices={setActiveNoteIndices}
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

  useEffect(() => {
    if (status !== 'finished' || !navigation.isFocused()) return;
    const { hits, misses, totalNotes, stars, outcome } = useGameStore.getState();
    if (!outcome) return;

    player.pause();
    countdownPlayer.pause();
    navigation.replace('Result', { levelId, hits, misses, totalNotes, stars, outcome });
  }, [countdownPlayer, levelId, navigation, player, status]);

  const goToMenu = () => {
    playButtonSound();
    navigation.popTo('Home');
  };

  const pauseGame = () => {
    playButtonSound();

    const currentStatus = useGameStore.getState().status;

    pause();

    if (currentStatus === 'playing') {
      player.pause();
    }

    if (currentStatus === 'countdown') {
      countdownPlayer.pause();
    }
  };

  const resumeGame = () => {
    playButtonSound();

    const previousStatus = useGameStore.getState().pausedFrom;

    resume();

    if (previousStatus === 'playing') {
      player.play();
    }

  };

  // Procura somente entre as notas atualmente ativas.
  const handleLanePress = (lane: 'left' | 'right') => {
    const game = useGameStore.getState();

    // LOGS DE DEPURAÇÃO REMOVIDOS.
    if (game.status !== 'playing') return;
    if (laneHeight <= 0) return;

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

      if (!position || !canHitNote(position, laneWidth)) continue;

      const distance = Math.abs(
        position.top + position.noteHeight / 2 - position.targetCenterY,
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
            disabled={status === 'finishing' || status === 'finished'}
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
          canInteract={status === 'playing'}
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
                trailSource={require('../../assets/images/rastro_vermelho.png')}
                laneWidth={laneWidth}
                laneHeight={laneHeight}
                gameClock={gameClock}
                approachTimeMs={beatmap.approachTimeMs}
                onFadeComplete={removeFadedNote}
              />
            );
          })}
        </Lane>

        <Lane
          width={laneWidth}
          onHeightChange={setLaneHeight}
          onPress={() => handleLanePress('right')}
          canInteract={status === 'playing'}
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
                trailSource={require('../../assets/images/rastro_azul.png')}
                laneWidth={laneWidth}
                laneHeight={laneHeight}
                gameClock={gameClock}
                approachTimeMs={beatmap.approachTimeMs}
                onFadeComplete={removeFadedNote}
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
    paddingBottom: 5,
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
    opacity: 0.28,
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
