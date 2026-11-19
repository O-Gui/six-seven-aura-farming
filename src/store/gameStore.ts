
import { create } from 'zustand';
import {
  errorMargin,
  hitPercent,
  isEarlyDefeat,
  riskLevel,
  starsFor,
} from '../game/scoring';
import type { NoteResult } from '../game/types';
import { useProgressStore } from './progressStore';

export type GameStatus =
  | 'idle'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'finished';

export type LevelOutcome = 'lost' | 'completed' | 'perfect';

type GameState = {
  status: GameStatus;
  pausedFrom: 'countdown' | 'playing' | null;
  levelId: number;
  totalNotes: number;
  hits: number;
  misses: number;
  resolved: Record<number, NoteResult>;
  outcome: LevelOutcome | null;
  stars: 0 | 1 | 2 | 3;

  startLevel: (levelId: number, totalNotes: number) => void;
  beginPlaying: () => void;
  resolveNote: (noteIndex: number, result: NoteResult) => void;
  failRemainingNotes: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

const initialState = {
  status: 'idle' as GameStatus,
  pausedFrom: null as 'countdown' | 'playing' | null,
  levelId: 0,
  totalNotes: 0,
  hits: 0,
  misses: 0,
  resolved: {} as Record<number, NoteResult>,
  outcome: null as LevelOutcome | null,
  stars: 0 as 0 | 1 | 2 | 3,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  // Prepara a partida e inicia a contagem regressiva.
  startLevel: (levelId, totalNotes) =>
    set({
      ...initialState,
      status: 'countdown',
      levelId,
      totalNotes,
    }),

  // Chamado quando a contagem regressiva terminar.
  beginPlaying: () => {
    if (get().status !== 'countdown') return;

    set({ status: 'playing' });
  },

  resolveNote: (noteIndex, result) => {
    const state = get();

    // Só conta durante a partida.
    if (state.status !== 'playing') return;

    // Impede índices inválidos e notas duplicadas.
    if (
      !Number.isInteger(noteIndex) ||
      noteIndex < 0 ||
      noteIndex >= state.totalNotes ||
      state.resolved[noteIndex] !== undefined
    ) {
      return;
    }

    const hits = state.hits + (result === 'hit' ? 1 : 0);
    const misses = state.misses + (result === 'miss' ? 1 : 0);
    const remaining = state.totalNotes - hits - misses;
    const resolved = {
      ...state.resolved,
      [noteIndex]: result,
    };

    // Derrota antecipada: não é mais possível alcançar 51%.
    if (isEarlyDefeat(hits, remaining, state.totalNotes)) {
      set({
        hits,
        misses,
        resolved,
        status: 'finished',
        pausedFrom: null,
        outcome: 'lost',
        stars: 0,
      });
      return;
    }

    // Todas as notas foram resolvidas.
    if (remaining === 0) {
      const stars = starsFor(hits, state.totalNotes);

      useProgressStore.getState().setStars(state.levelId, stars);

      set({
        hits,
        misses,
        resolved,
        status: 'finished',
        pausedFrom: null,
        outcome: stars === 3 ? 'perfect' : 'completed',
        stars,
      });
      return;
    }

    set({ hits, misses, resolved });
  },

  // Fim da música: toda nota ainda sem resultado vira erro.
  failRemainingNotes: () => {
    const state = get();

    if (state.status !== 'playing') return;

    const resolved = { ...state.resolved };
    let misses = state.misses;

    for (let i = 0; i < state.totalNotes; i++) {
      if (resolved[i] === undefined) {
        resolved[i] = 'miss';
        misses++;
      }
    }

    const stars = starsFor(state.hits, state.totalNotes);

    // Se não alcançou a pontuação mínima, é derrota.
    if (stars === 0) {
      set({
        resolved,
        misses,
        status: 'finished',
        pausedFrom: null,
        outcome: 'lost',
        stars: 0,
      });
      return;
    }

    useProgressStore.getState().setStars(state.levelId, stars);

    set({
      resolved,
      misses,
      status: 'finished',
      pausedFrom: null,
      outcome: stars === 3 ? 'perfect' : 'completed',
      stars,
    });
  },

  // Pausa tanto a contagem quanto a música.
  pause: () => {
    const status = get().status;

    if (status === 'countdown' || status === 'playing') {
      set({
        status: 'paused',
        pausedFrom: status,
      });
    }
  },

  // Retoma exatamente o estado anterior à pausa.
  resume: () => {
    const pausedFrom = get().pausedFrom;

    if (get().status !== 'paused' || pausedFrom === null) return;

    set({
      status: pausedFrom,
      pausedFrom: null,
    });
  },

  reset: () => set({ ...initialState }),
}));

// Valores derivados para utilizar nas telas.
export const selectRemaining = (s: GameState) =>
  s.totalNotes - s.hits - s.misses;

export const selectHitPercent = (s: GameState) =>
  hitPercent(s.hits, s.totalNotes);

export const selectMargin = (s: GameState) =>
  errorMargin(s.hits, selectRemaining(s), s.totalNotes);

export const selectRisk = (s: GameState) =>
  riskLevel(s.hits, selectRemaining(s), s.totalNotes);
