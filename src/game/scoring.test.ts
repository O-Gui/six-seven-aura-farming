import {
  errorMargin,
  isEarlyDefeat,
  minHitsToSurvive,
  starsFor,
  unlocksNextLevel,
  earnsReward67,
} from './scoring';

describe('minHitsToSurvive', () => {
  it('arredonda para cima', () => {
    expect(minHitsToSurvive(100)).toBe(51);
    expect(minHitsToSurvive(10)).toBe(6); // 5,1 -> 6
    expect(minHitsToSurvive(250)).toBe(128); // 127,5 -> 128
    expect(minHitsToSurvive(300)).toBe(153); // sem erro de ponto flutuante
  });
});

describe('isEarlyDefeat', () => {
  it('só perde quando A + R < M', () => {
    // N = 100, M = 51
    expect(isEarlyDefeat(40, 11, 100)).toBe(false); // 51 = M: ainda pode sobreviver
    expect(isEarlyDefeat(40, 10, 100)).toBe(true); // 50 < 51
  });
});

describe('errorMargin', () => {
  it('é zero quando precisa acertar todas as restantes', () => {
    expect(errorMargin(40, 11, 100)).toBe(0);
    expect(errorMargin(40, 20, 100)).toBe(9);
  });
});

describe('starsFor', () => {
  it('0 estrelas abaixo de 51%', () => {
    expect(starsFor(50, 100)).toBe(0);
  });
  it('1 estrela de 51% a menos de 65%', () => {
    expect(starsFor(51, 100)).toBe(1);
    expect(starsFor(64, 100)).toBe(1);
  });
  it('2 estrelas de 65% a menos de 100%', () => {
    expect(starsFor(65, 100)).toBe(2);
    expect(starsFor(99, 100)).toBe(2);
  });
  it('3 estrelas só com 100%', () => {
    expect(starsFor(100, 100)).toBe(3);
  });
});

describe('desbloqueio e recompensa', () => {
  it('libera próxima fase com 2 estrelas ou mais', () => {
    expect(unlocksNextLevel(1)).toBe(false);
    expect(unlocksNextLevel(2)).toBe(true);
    expect(unlocksNextLevel(3)).toBe(true);
  });
  it('recompensa 67 só com 3 estrelas', () => {
    expect(earnsReward67(2)).toBe(false);
    expect(earnsReward67(3)).toBe(true);
  });
});