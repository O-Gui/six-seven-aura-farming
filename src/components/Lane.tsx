import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

const TARGET = require('../../assets/images/botao-de-impacto.png');

type Props = {
  width: number;
  children?: ReactNode; // as notas entram aqui
};

export default function Lane({ width, children }: Props) {
  const targetSize = width;

  return (
    <View style={[styles.lane, { width }]}>
      <Image
        source={TARGET}
        resizeMode="contain"
        style={{
          position: 'absolute',
          left: (width - targetSize) / 2,
          top: '73%',
          width: targetSize,
          height: targetSize,
          marginTop: -targetSize / 2,
        }}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  lane: {
    height: '100%',
    backgroundColor: colors.gameLane,
  },
});