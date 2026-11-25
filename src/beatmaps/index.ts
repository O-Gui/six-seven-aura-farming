import type { Beatmap } from '../game/types';
import level1 from './level1.json';
import level2 from './level2.json';

const beatmaps: Record<number, Beatmap> = {
  1: level1 as Beatmap,
  2: level2 as Beatmap,
};

// Enquanto as outras fases não têm beatmap, usam o beatmap da fase 1 como provisório
export function getBeatmap(levelId: number): Beatmap {
  return beatmaps[levelId] ?? beatmaps[1];
}