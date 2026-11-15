export type LaneId = 'left' | 'right';

export type BeatmapNote = {
  lane: LaneId;
  timeToHitMs: number; // instante ideal do toque, em ms desde o início da música
};

export type NoteResult = 'hit' | 'miss';