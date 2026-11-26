
import { preload, useAudioPlayer } from 'expo-audio';
import { createContext, createElement, useCallback, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { PropsWithChildren } from 'react';

const BUTTON_SOUND = require('../../assets/sounds/som_botoes_menu.mp3');

const SOUND_WARMUP_LIMIT_MS = 800;
const isWeb = Platform.OS === 'web';

if (isWeb) {
  void preload(BUTTON_SOUND).catch((error) => {
    console.warn('Erro ao pré-carregar som dos botões:', error);
  });
}

const ButtonSoundContext = createContext<(() => void) | null>(null);

type ButtonSoundProviderProps = PropsWithChildren<{ onReady: () => void }>;

export function ButtonSoundProvider({ children, onReady }: ButtonSoundProviderProps) {
  const player = useAudioPlayer(BUTTON_SOUND, {
    downloadFirst: !isWeb,
    keepAudioSessionActive: !isWeb,
  });
  const warmedUp = useRef(isWeb);
  const pendingSound = useRef(false);

  const playFromStart = useCallback(() => {
    try {
      // Um player novo já está no início. O primeiro toque pode tocar direto.
      if (player.currentTime === 0) {
        player.play();
        return;
      }

      void player.seekTo(0).then(() => player.play()).catch((error) => {
        console.warn('Erro ao repetir som do botão:', error);
      });
    } catch (error) {
      console.warn('Erro ao reproduzir som do botão:', error);
    }
  }, [player]);

  useEffect(() => {
    if (isWeb) return;

    let active = true;
    let phase: 'waiting' | 'warming' | 'rewinding' = 'waiting';
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finishWarmup = async () => {
      if (phase !== 'warming') return;
      phase = 'rewinding';
      clearTimeout(timer);

      try {
        player.pause();
        await player.seekTo(0);
      } catch (error) {
        console.warn('Erro ao reiniciar som dos botões após a preparação:', error);
      } finally {
        if (active) {
          player.muted = false;
          warmedUp.current = true;
          onReady();
          if (pendingSound.current) {
            pendingSound.current = false;
            playFromStart();
          }
        }
      }
    };

    const startWarmup = () => {
      if (warmedUp.current || phase !== 'waiting') return;
      phase = 'warming';
      // Executa o primeiro ciclo do player em silêncio durante a splash.
      player.muted = true;
      timer = setTimeout(() => void finishWarmup(), SOUND_WARMUP_LIMIT_MS);
      try {
        player.play();
      } catch {
        void finishWarmup();
      }
    };

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) void finishWarmup();
      if (status.isLoaded) startWarmup();
    });
    if (player.currentStatus.isLoaded) startWarmup();

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [onReady, player, playFromStart]);

  const playButtonSound = useCallback(() => {
    // Na web, mantém a chamada dentro do gesto que autoriza o áudio.
    if (!warmedUp.current) {
      pendingSound.current = true;
      return;
    }

    pendingSound.current = false;
    playFromStart();
  }, [player, playFromStart]);

  return createElement(ButtonSoundContext.Provider, { value: playButtonSound }, children);
}

export function useButtonSound() {
  const playButtonSound = useContext(ButtonSoundContext);
  if (!playButtonSound) throw new Error('ButtonSoundProvider ausente');
  return playButtonSound;
}
