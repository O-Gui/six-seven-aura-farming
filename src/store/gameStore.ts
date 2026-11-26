
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
  | 'finishing'
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
  finalHitIndex: number | null;
  outcome: LevelOutcome | null;
  stars: 0 | 1 | 2 | 3;

  startLevel: (levelId: number, totalNotes: number) => void;
  beginPlaying: () => void;
  resolveNote: (noteIndex: number, result: NoteResult) => void;
  resolveMisses: (noteIndices: readonly number[]) => void;
  finishLastHit: (noteIndex: number) => void;
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
  finalHitIndex: null as number | null,
  outcome: null as LevelOutcome | null,
  stars: 0 as 0 | 1 | 2 | 3,
};

function isUnresolvedNote(index: number, totalNotes: number, resolved: GameState['resolved']) {
  return Number.isInteger(index) && index >= 0 && index < totalNotes && resolved[index] === undefined;
}

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
    if (state.status !== 'playing') return;
    if (result === 'miss') {
      state.resolveMisses([noteIndex]);
      return;
    }
    if (!isUnresolvedNote(noteIndex, state.totalNotes, state.resolved)) return;

    const hits = state.hits + 1;
    const resolved = { ...state.resolved, [noteIndex]: result };
    if (hits + state.misses === state.totalNotes) {
      set({ hits, resolved, status: 'finishing', finalHitIndex: noteIndex });
      return;
    }

    set({ hits, resolved });
  },

  resolveMisses: (noteIndices) => {
    const state = get();
    if (state.status !== 'playing') return;

    const { hits, totalNotes, levelId } = state;
    let misses = state.misses;
    let resolved = state.resolved;
    for (const index of noteIndices) {
      if (!isUnresolvedNote(index, totalNotes, resolved)) continue;

      if (resolved === state.resolved) resolved = { ...resolved };
      resolved[index] = 'miss';
      misses++;
      const remaining = totalNotes - hits - misses;
      if (isEarlyDefeat(hits, remaining, totalNotes)) {
        set({ misses, resolved, status: 'finished', pausedFrom: null, outcome: 'lost', stars: 0 });
        return;
      }
      if (remaining === 0) {
        const stars = starsFor(hits, totalNotes);
        useProgressStore.getState().setStars(levelId, stars);
        set({
          misses,
          resolved,
          status: 'finished',
          pausedFrom: null,
          outcome: stars === 3 ? 'perfect' : 'completed',
          stars,
        });
        return;
      }
    }

    if (resolved !== state.resolved) set({ misses, resolved });
  },

  finishLastHit: (noteIndex) => {
    const state = get();
    if (state.status !== 'finishing' || state.finalHitIndex !== noteIndex) return;

    const stars = starsFor(state.hits, state.totalNotes);
    useProgressStore.getState().setStars(state.levelId, stars);
    set({
      status: 'finished',
      finalHitIndex: null,
      outcome: stars === 3 ? 'perfect' : 'completed',
      stars,
    });
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
