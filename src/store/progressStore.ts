
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
} from 'zustand/middleware';

type ProgressState = {
  stars: Record<number, number>;
  lastPlayedLevel: number | null;

  setStars: (levelId: number, stars: number) => void;
  setLastPlayedLevel: (levelId: number) => void;
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      stars: {},
      lastPlayedLevel: null,

      setStars: (levelId, stars) =>
        set((state) => ({
          stars: {
            ...state.stars,
            [levelId]: Math.max(
              state.stars[levelId] ?? 0,
              stars
            ),
          },
        })),

      setLastPlayedLevel: (levelId) =>
        set({ lastPlayedLevel: levelId }),
    }),
    {
      name: 'six-seven-progress',
      storage: createJSONStorage(() => AsyncStorage),

      // Persiste somente o progresso permanente.
      partialize: (state) => ({
        stars: state.stars,
        lastPlayedLevel: state.lastPlayedLevel,
      }),
    }
  )
);

// Nível 1 começa liberado.
// Os demais exigem pelo menos 2 estrelas no anterior.
export function isLevelUnlocked(
  stars: Record<number, number>,
  levelId: number
) {
  return (
    levelId === 1 ||
    (stars[levelId - 1] ?? 0) >= 2
  );
}
