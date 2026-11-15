import { beforeEach, describe, expect, it } from '@jest/globals';
import { useGameStore, selectMargin, selectHitPercent } from './gameStore';
import { useProgressStore } from './progressStore';

const game = () => useGameStore.getState();

beforeEach(() => {
  game().reset();
  useProgressStore.setState({ stars: {} });
});

describe('gameStore', () => {
  it('fase perfeita: 100% dá 3 estrelas e resultado perfect', () => {
    game().startLevel(1, 10);
    for (let i = 0; i < 10; i++) game().resolveNote(i, 'hit');

    expect(game().status).toBe('finished');
    expect(game().outcome).toBe('perfect');
    expect(game().stars).toBe(3);
    expect(useProgressStore.getState().stars[1]).toBe(3);
  });

  it('70% de acertos dá 2 estrelas e libera a próxima fase', () => {
    game().startLevel(1, 10);
    for (let i = 0; i < 7; i++) game().resolveNote(i, 'hit');
    for (let i = 7; i < 10; i++) game().resolveNote(i, 'miss');

    expect(game().outcome).toBe('completed');
    expect(game().stars).toBe(2);
    expect(useProgressStore.getState().stars[1]).toBe(2);
  });

  it('derrota antecipada só quando A + R < M (N = 10, M = 6)', () => {
    game().startLevel(1, 10);
    for (let i = 0; i < 4; i++) game().resolveNote(i, 'miss');

    // A = 0, R = 6, M = 6: margem zero, mas a fase continua
    expect(game().status).toBe('playing');
    expect(selectMargin(game())).toBe(0);

    game().resolveNote(4, 'miss'); // A + R = 5 < 6
    expect(game().status).toBe('finished');
    expect(game().outcome).toBe('lost');
    expect(game().stars).toBe(0);
  });

  it('não conta a mesma nota duas vezes', () => {
    game().startLevel(1, 10);
    game().resolveNote(0, 'hit');
    game().resolveNote(0, 'hit');
    game().resolveNote(0, 'miss');

    expect(game().hits).toBe(1);
    expect(game().misses).toBe(0);
  });

  it('não conta notas enquanto pausado e volta a contar ao retomar', () => {
    game().startLevel(1, 10);
    game().pause();
    game().resolveNote(0, 'hit');
    expect(game().hits).toBe(0);

    game().resume();
    game().resolveNote(0, 'hit');
    expect(game().hits).toBe(1);
    expect(selectHitPercent(game())).toBe(10);
  });
});