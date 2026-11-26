import type { LevelOutcome } from '../store/gameStore';

type LevelResult = {
  levelId: number;
  hits: number;
  misses: number;
  totalNotes: number;
  stars: 0 | 1 | 2 | 3;
  outcome: LevelOutcome;
};

export type RootStackParamList = {
  Home: undefined;
  LevelsList: undefined;
  Game: { levelId: number };
  Result: LevelResult;
};