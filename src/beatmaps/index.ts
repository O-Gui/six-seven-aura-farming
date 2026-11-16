import type { Beatmap } from '../game/types';
import level1 from './level1.json';

const beatmaps: Record<number, Beatmap> = {
  1: level1 as Beatmap,
};

// Enquanto as outras fases não têm música, usam o beatmap da fase 1 como provisório
export function getBeatmap(levelId: number): Beatmap {
  return beatmaps[levelId] ?? beatmaps[1];
}