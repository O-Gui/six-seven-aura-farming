
import { preload } from 'expo-audio';

export const BUTTON_SOUND = require('../../assets/sounds/som_botoes_menu.mp3');

// Começa a carregar o efeito antes de o usuário apertar os botões.
void preload(BUTTON_SOUND).catch((error) => {
  console.warn('Erro ao pré-carregar som dos botões:', error);
});
