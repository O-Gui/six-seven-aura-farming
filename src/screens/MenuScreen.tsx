import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import MenuButton from '../components/MenuButton';
import AnimatedBackground from '../components/AnimatedBackground';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function MenuScreen({ navigation }: Props) {
  const [creditsVisible, setCreditsVisible] = useState(false);

  const breathe = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  // bordas neon "respirando"
  const frameStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breathe.value * 0.45,
  }));

  // logo pulsando de leve
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.03 }],
  }));

  return (
    <View style={styles.root}>
      {/* Bordas laterais */}
      <Animated.View
        style={[styles.backgroundContainer, frameStyle]}
        pointerEvents="none"
      >
        <Image
          source={require('../../assets/images/bg-left-menu.png')}
          style={styles.leftImage}
          resizeMode="contain"
        />
        <Image
          source={require('../../assets/images/bg-right-menu.png')}
          style={styles.rightImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Partículas e faixa de luz */}
      <AnimatedBackground />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <Animated.View style={[styles.logoWrap, logoStyle]}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <View style={styles.buttons}>
            <MenuButton
              label="PLAY"
              fontSize={28}
              textColor={colors.cyan}
              glowColor={colors.cyan}
              background={require('../../assets/images/botao-menu-azul.png')}
              icon={require('../../assets/images/icon-playmenu.png')}
              onPress={() => navigation.navigate('Game', { levelId: 1 })}
            />
            <MenuButton
              label="LEVELS LIST"
              fontSize={22}
              textColor={colors.cyan}
              glowColor={colors.cyan}
              background={require('../../assets/images/botao-menu-azul.png')}
              icon={require('../../assets/images/icon-list-menu.png')}
              onPress={() => navigation.navigate('LevelsList')}
            />
            <MenuButton
              label="CREDITS"
              fontSize={22}
              textColor={colors.purpleText}
              glowColor={colors.purpleText}
              background={require('../../assets/images/botao-menu-roxo.png')}
              onPress={() => setCreditsVisible(true)}
            />
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={creditsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreditsVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setCreditsVisible(false)}>
          <View style={styles.creditsCard}>
            <Text style={styles.creditsTitle}>CREDITS</Text>
            <Text style={styles.creditsText}>UNWAKE STUDIO</Text>
            <Text style={styles.creditsHint}>Toque para fechar</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  leftImage: {
    position: 'absolute',
    left: 10,
    top: 0,
    bottom: 0,
    width: '35%',
    height: '100%',
  },
  rightImage: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: '35%',
    height: '100%',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    height: '35%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '65%',
    height: '100%',
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  creditsCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderColor: colors.cyan,
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  creditsTitle: {
    color: colors.cyanLight,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  creditsText: {
    color: colors.cyanLight,
    fontSize: 16,
    textAlign: 'center',
  },
  creditsHint: {
    color: colors.purpleText,
    fontSize: 12,
  },
});