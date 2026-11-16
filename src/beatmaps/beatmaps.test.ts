
import { describe, expect, it } from '@jest/globals';
import { getBeatmap } from './index';

describe.each([1])('beatmap da fase %i', (levelId) => {
  const beatmap = getBeatmap(levelId);

  it('tem notas', () => {
    expect(beatmap.notes.length).toBeGreaterThan(0);
  });

  it('só usa as pistas left e right', () => {
    for (const note of beatmap.notes) {
      expect(['left', 'right']).toContain(note.lane);
    }
  });

  it('tem tempos não negativos e em ordem crescente', () => {
    let previous = -1;

    for (const note of beatmap.notes) {
      expect(note.timeMs).toBeGreaterThanOrEqual(0);
      expect(note.timeMs).toBeGreaterThanOrEqual(previous);
      previous = note.timeMs;
    }
  });

  it('possui identificadores únicos para as notas', () => {
    const ids = beatmap.notes.map((note) => note.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('possui BPM e tempo de aproximação válidos', () => {
    expect(beatmap.bpm).toBeGreaterThan(0);
    expect(beatmap.approachTimeMs).toBeGreaterThan(0);
  });
});
