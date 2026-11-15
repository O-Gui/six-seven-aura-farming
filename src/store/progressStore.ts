import { create } from 'zustand';

type ProgressState = {
  stars: Record<number, number>; // levelId -> melhor resultado em estrelas
  setStars: (levelId: number, stars: number) => void;
};

export const useProgressStore = create<ProgressState>((set) => ({
  stars: {}, // para testar o desbloqueio, use por exemplo { 1: 2 }
  setStars: (levelId, stars) =>
    set((state) => ({
      stars: {
        ...state.stars,
        [levelId]: Math.max(state.stars[levelId] ?? 0, stars),
      },
    })),
}));

// Regra da especificação: o nível 1 começa liberado; os demais exigem
// pelo menos 2 estrelas na fase anterior.
export function isLevelUnlocked(stars: Record<number, number>, levelId: number) {
  return levelId === 1 || (stars[levelId - 1] ?? 0) >= 2;
}