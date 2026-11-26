
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
  resetProgress: () => void;
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      stars: {},
      lastPlayedLevel: null,

      setStars: (levelId, stars) => {
        const currentStars = get().stars;
        if (stars <= (currentStars[levelId] ?? 0)) return;

        set({ stars: { ...currentStars, [levelId]: stars } });
      },

      setLastPlayedLevel: (levelId) => {
        if (get().lastPlayedLevel === levelId) return;

        set({ lastPlayedLevel: levelId });
      },
      // Apaga todo o progresso salvo.
      resetProgress: () =>
        set({
          stars: {},
          lastPlayedLevel: null,
        }),
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
