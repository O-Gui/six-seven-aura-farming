
export const NOTE_WIDTH_RATIO = 0.59;
export const NOTE_ASPECT_RATIO = 0.76;
export const TARGET_CENTER_RATIO = 0.73;
export const AFTER_TARGET_PROGRESS = 0.25;

export function getNotePosition(
  laneWidth: number,
  laneHeight: number,
  currentTimeMs: number,
  timeMs: number,
  approachTimeMs: number,
) {
  if (
    laneWidth <= 0 ||
    laneHeight <= 0 ||
    approachTimeMs <= 0
  ) {
    return null;
  }

  const noteWidth = laneWidth * NOTE_WIDTH_RATIO;
  const noteHeight = noteWidth / NOTE_ASPECT_RATIO;
  const targetCenterY = laneHeight * TARGET_CENTER_RATIO;

  const progress =
    (currentTimeMs - (timeMs - approachTimeMs)) /
    approachTimeMs;

  const top =
    -noteHeight +
    progress * (targetCenterY + noteHeight / 2);

  return {
    progress,
    top,
    noteWidth,
    noteHeight,
    noteBottom: top + noteHeight,
    targetCenterY,
  };
}

export function canHitNote(
  position: NonNullable<ReturnType<typeof getNotePosition>>,
  targetSize: number,
) {
  const hitboxTop = position.targetCenterY - targetSize / 2 - 3;
  const hitboxBottom = position.targetCenterY + targetSize / 2 + 3;

  return (
    position.noteBottom >= hitboxTop &&
    position.top <= hitboxBottom
  );
}