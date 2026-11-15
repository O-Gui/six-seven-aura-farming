import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import AuraBar from '../components/AuraBar';
import Lane from '../components/Lane';
import MenuButton from '../components/MenuButton';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const HEADER_ROW = 48;
const FOOTER_HEIGHT = 84;

export default function GameScreen({ navigation, route }: Props) {
  const { levelId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [paused, setPaused] = useState(false);

  // Valor provisório só para ver a barra; depois vem da lógica do jogo
  const auraPercent = 40;

  // Medidas das pistas, proporcionais à largura da tela (como no mockup)
  const laneWidth = width * 0.29;
  const laneGap = width * 0.18;
  const noteWidth = laneWidth * 0.59;
  const noteLeft = (laneWidth - noteWidth) / 2;
  const noteStyle = {
    position: 'absolute' as const,
    left: noteLeft,
    width: noteWidth,
    aspectRatio: 0.76,
  };

  return (
    <View style={styles.root}>
      {/* Cabeçalho */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Image
          source={require('../../assets/images/headline.png')}
          style={styles.headerBackground}
          resizeMode="stretch"
        />

        <View style={styles.titleRow}>
          <Pressable
            onPress={() => setPaused(true)}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <Feather
              name="arrow-left"
              size={30}
              color={colors.backArrow}
              style={styles.backIcon}
            />
          </Pressable>
          <Text style={styles.title}>AURA FARMING</Text>
        </View>

        <View style={[styles.barWrap, { paddingHorizontal: width * 0.02 }]}>
          <AuraBar percent={auraPercent} />
        </View>
      </View>

      {/* Área do jogo: duas pistas */}
      <View style={[styles.playfield, { gap: laneGap }]}>
        <Lane width={laneWidth}>
          <Image
            source={require('../../assets/images/nota-vermelho6.png')}
            style={[noteStyle, { top: '20%' }]}
            resizeMode="contain"
          />
        </Lane>
        <Lane width={laneWidth}>
          <Image
            source={require('../../assets/images/nota-azul7.png')}
            style={[noteStyle, { top: '44%' }]}
            resizeMode="contain"
          />
        </Lane>
      </View>

      {/* Rodapé */}
      <View
        style={[
          styles.footer,
          { height: FOOTER_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <Image
          source={require('../../assets/images/backgroundlines-fase.png')}
          style={styles.footerBackground}
          resizeMode="stretch"
        />
        <Text style={styles.footerText}>LEVEL {levelId}</Text>
      </View>

      {/* Menu de pausa (só visual por enquanto: ainda não pausa nada) */}
      <Modal
        visible={paused}
        transparent
        animationType="fade"
        onRequestClose={() => setPaused(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>PAUSE</Text>

            <View style={styles.pauseButtons}>
              <MenuButton
                label="RESUME"
                fontSize={22}
                textColor={colors.cyan}
                glowColor={colors.cyan}
                background={require('../../assets/images/botao-menu-azul.png')}
                onPress={() => setPaused(false)}
              />
              <MenuButton
                label="MENU"
                fontSize={22}
                textColor={colors.purpleText}
                glowColor={colors.purpleText}
                background={require('../../assets/images/botao-menu-roxo.png')}
                onPress={() => {
                  setPaused(false);
                  navigation.navigate('Home');
                }}
              />
            </View>

            {/* Temporário: remover quando a fase terminar sozinha */}
            <Pressable
              onPress={() => {
                setPaused(false);
                navigation.replace('Result', { levelId });
              }}
            >
              <Text style={styles.testLink}>(teste) FINALIZAR FASE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerLine,
    paddingBottom: 8,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  titleRow: {
    height: HEADER_ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: 8,
    width: 56,
    height: HEADER_ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.9 }],
  },
  backIcon: {
    textShadowColor: colors.backArrow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  title: {
    color: colors.cyan,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  barWrap: {
    width: '100%',
  },
  playfield: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  footer: {
    backgroundColor: colors.gameFooter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  footerText: {
    color: colors.gameFooterText,
    fontSize: 22,
    letterSpacing: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pauseCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderColor: colors.cyan,
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  pauseTitle: {
    color: colors.cyanLight,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pauseButtons: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  testLink: {
    color: colors.purpleText,
    fontSize: 12,
  },
});