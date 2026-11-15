// Mínimo de acertos para sobreviver: teto(N × 0,51), em aritmética inteira
// para evitar erros de ponto flutuante (por exemplo 300 × 0,51).
export function minHitsToSurvive(totalNotes: number): number {
  return Math.floor((totalNotes * 51 + 99) / 100);
}

// Porcentagem real de acertos (barra de aura e tela de resultado)
export function hitPercent(hits: number, totalNotes: number): number {
  if (totalNotes <= 0) return 0;
  return (hits / totalNotes) * 100;
}

// Porcentagem de erros
export function missPercent(misses: number, totalNotes: number): number {
  if (totalNotes <= 0) return 0;
  return (misses / totalNotes) * 100;
}

// margem = acertos + notas ainda não resolvidas − mínimo
// Quantos erros ainda são toleráveis se todas as notas restantes forem acertadas.
export function errorMargin(
  hits: number,
  remainingNotes: number,
  totalNotes: number
): number {
  return hits + remainingNotes - minHitsToSurvive(totalNotes);
}

// Derrota antecipada: A + R < M
export function isEarlyDefeat(
  hits: number,
  remainingNotes: number,
  totalNotes: number
): boolean {
  return hits + remainingNotes < minHitsToSurvive(totalNotes);
}

export function didSurvive(hits: number, totalNotes: number): boolean {
  return hits >= minHitsToSurvive(totalNotes);
}

// 0 = Game Over | 1 = 51% a <65% | 2 = 65% a <100% | 3 = 100%
export function starsFor(hits: number, totalNotes: number): 0 | 1 | 2 | 3 {
  if (totalNotes <= 0 || !didSurvive(hits, totalNotes)) return 0;
  if (hits === totalNotes) return 3;
  if (hits * 100 >= 65 * totalNotes) return 2;
  return 1;
}

// Libera a próxima fase com pelo menos 2 estrelas
export function unlocksNextLevel(stars: number): boolean {
  return stars >= 2;
}

// Recompensa "67": só com 100% de acertos
export function earnsReward67(stars: number): boolean {
  return stars === 3;
}