
export const NOTE_WIDTH_RATIO = 0.59;
export const NOTE_ASPECT_RATIO = 0.76;
export const TARGET_CENTER_RATIO = 0.64;
export const MISS_COLOR_TRANSITION_MS = 140;
const MISS_COLOR_HOLD_MS = 100;
const AFTER_TARGET_PROGRESS = 0.25;

// O contorno sólido externo mede cerca de 96 px na imagem de 119 px.
const IMPACT_RING_DIAMETER_RATIO = 96 / 119;

export function getImpactHitboxRadius(targetSize: number) {
  return (targetSize * IMPACT_RING_DIAMETER_RATIO) / 2;
}

export function getNoteEndTop(laneWidth: number, laneHeight: number, approachTimeMs: number) {
  const noteHeight = (laneWidth * NOTE_WIDTH_RATIO) / NOTE_ASPECT_RATIO;
  const targetCenterY = laneHeight * TARGET_CENTER_RATIO;
  const hitboxBottom = targetCenterY + getImpactHitboxRadius(laneWidth);
  const travel = targetCenterY + noteHeight / 2;
  const previousEnd = -noteHeight + (1 + AFTER_TARGET_PROGRESS) * travel;
  const missEffectDistance = travel * (MISS_COLOR_TRANSITION_MS + MISS_COLOR_HOLD_MS) / approachTimeMs;
  return Math.max(previousEnd, hitboxBottom + missEffectDistance);
}

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
  const radius = getImpactHitboxRadius(targetSize);
  const hitboxTop = position.targetCenterY - radius;
  const hitboxBottom = position.targetCenterY + radius;

  return (
    position.noteBottom >= hitboxTop &&
    position.top <= hitboxBottom
  );
}