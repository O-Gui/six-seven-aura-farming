
export type LaneId = 'left' | 'right';

export type BeatmapNote = {
  id: string;
  timeMs: number;
  lane: LaneId;
};

export type NoteResult = 'hit' | 'miss';

export type Beatmap = {
  id: string;
  title: string;
  bpm: number;
  approachTimeMs: number;
  notes: BeatmapNote[];
};
