export type LevelInfo = {
  id: number;
  implemented: boolean;
};

// Fases disponíveis na lista.
// Apenas as fases implementadas podem ser iniciadas.
export const LEVELS: LevelInfo[] = [
  { id: 1, implemented: true },
  { id: 2, implemented: true }, // Level 2 habilitada
  { id: 3, implemented: false },
  { id: 4, implemented: false },
  { id: 5, implemented: false },
  { id: 6, implemented: false },
];

export function isLevelImplemented(levelId: number): boolean {
  return LEVELS.some(
    (level) => level.id === levelId && level.implemented
  );
}

export function getFirstAvailableLevel(): number {
  return LEVELS.find((level) => level.implemented)?.id ?? 1;
}