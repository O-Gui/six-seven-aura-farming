export type LevelInfo = {
  id: number;
};

// Por enquanto só o id. Depois entram nome da música, BPM e o beatmap de cada fase.
export const LEVELS: LevelInfo[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
}));