export const HIT_WINDOW_MS = 100; // valor inicial proposto (±100 ms), ajustável nos testes

// erroTemporalMs = tempoDoToqueMs − timeToHitMs − offsetDeCalibracaoMs
export function timingErrorMs(
  touchTimeMs: number,
  timeToHitMs: number,
  calibrationOffsetMs = 0
): number {
  return touchTimeMs - timeToHitMs - calibrationOffsetMs;
}

export function isWithinHitWindow(
  touchTimeMs: number,
  timeToHitMs: number,
  calibrationOffsetMs = 0,
  windowMs = HIT_WINDOW_MS
): boolean {
  return Math.abs(timingErrorMs(touchTimeMs, timeToHitMs, calibrationOffsetMs)) <= windowMs;
}

// Passou do prazo sem toque válido: a nota vira erro
export function isExpired(
  currentTimeMs: number,
  timeToHitMs: number,
  calibrationOffsetMs = 0,
  windowMs = HIT_WINDOW_MS
): boolean {
  return currentTimeMs - calibrationOffsetMs > timeToHitMs + windowMs;
}