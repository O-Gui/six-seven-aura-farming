import { create } from 'zustand';
import {
  errorMargin,
  hitPercent,
  isEarlyDefeat,
  starsFor,
} from '../game/scoring';
import type { NoteResult } from '../game/types';
import { useProgressStore } from './progressStore';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type LevelOutcome = 'lost' | 'completed' | 'perfect';

type GameState = {
  status: GameStatus;
  levelId: number;
  totalNotes: number;
  hits: number;
  misses: number;
  resolved: Record<number, NoteResult>; // índice da nota -> resultado (evita contar duas vezes)
  outcome: LevelOutcome | null;
  stars: 0 | 1 | 2 | 3;

  startLevel: (levelId: number, totalNotes: number) => void;
  resolveNote: (noteIndex: number, result: NoteResult) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

const initialState = {
  status: 'idle' as GameStatus,
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

  startLevel: (levelId, totalNotes) =>
    set({
      ...initialState,
      status: 'playing',
      levelId,
      totalNotes,
    }),

  resolveNote: (noteIndex, result) => {
    const state = get();

    // Só conta durante a partida e só uma vez por nota
    if (state.status !== 'playing') return;
    if (state.resolved[noteIndex] !== undefined) return;

    const hits = state.hits + (result === 'hit' ? 1 : 0);
    const misses = state.misses + (result === 'miss' ? 1 : 0);
    const remaining = state.totalNotes - hits - misses;
    const resolved = { ...state.resolved, [noteIndex]: result };

    // Derrota antecipada: A + R < M
    if (isEarlyDefeat(hits, remaining, state.totalNotes)) {
      set({ hits, misses, resolved, status: 'finished', outcome: 'lost', stars: 0 });
      return;
    }

    // Todas as notas resolvidas e a fase foi vencida
    if (remaining === 0) {
      const stars = starsFor(hits, state.totalNotes);
      useProgressStore.getState().setStars(state.levelId, stars);
      set({
        hits,
        misses,
        resolved,
        status: 'finished',
        outcome: stars === 3 ? 'perfect' : 'completed',
        stars,
      });
      return;
    }

    set({ hits, misses, resolved });
  },

  pause: () => {
    if (get().status === 'playing') set({ status: 'paused' });
  },

  resume: () => {
    if (get().status === 'paused') set({ status: 'playing' });
  },

  reset: () => set({ ...initialState }),
}));

// Valores derivados (use como seletores nas telas)
export const selectRemaining = (s: GameState) => s.totalNotes - s.hits - s.misses;
export const selectHitPercent = (s: GameState) => hitPercent(s.hits, s.totalNotes);
export const selectMargin = (s: GameState) =>
  errorMargin(s.hits, selectRemaining(s), s.totalNotes);