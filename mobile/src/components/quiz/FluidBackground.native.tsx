import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function FluidBackground() {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const driftC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(driftA, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftA, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(driftB, {
          toValue: 1,
          duration: 11000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftB, {
          toValue: 0,
          duration: 11000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const loopC = Animated.loop(
      Animated.sequence([
        Animated.timing(driftC, {
          toValue: 1,
          duration: 13000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftC, {
          toValue: 0,
          duration: 13000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loopA.start();
    loopB.start();
    loopC.start();

    return () => {
      loopA.stop();
      loopB.stop();
      loopC.stop();
    };
  }, [driftA, driftB, driftC]);

  const blobATranslateX = driftA.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const blobATranslateY = driftA.interpolate({ inputRange: [0, 1], outputRange: [-14, 18] });
  const blobAScale = driftA.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.1] });

  const blobBTranslateX = driftB.interpolate({ inputRange: [0, 1], outputRange: [24, -24] });
  const blobBTranslateY = driftB.interpolate({ inputRange: [0, 1], outputRange: [-12, 20] });
  const blobBScale = driftB.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.16] });

  const blobCTranslateX = driftC.interpolate({ inputRange: [0, 1], outputRange: [-16, 14] });
  const blobCTranslateY = driftC.interpolate({ inputRange: [0, 1], outputRange: [18, -16] });
  const blobCScale = driftC.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  const blobDTranslateX = driftB.interpolate({ inputRange: [0, 1], outputRange: [-12, 16] });
  const blobDTranslateY = driftA.interpolate({ inputRange: [0, 1], outputRange: [14, -10] });
  const blobDScale = driftC.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  const blobETranslateX = driftC.interpolate({ inputRange: [0, 1], outputRange: [10, -12] });
  const blobETranslateY = driftB.interpolate({ inputRange: [0, 1], outputRange: [-10, 12] });
  const blobEScale = driftA.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] });

  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient colors={['#FFFDF7', '#F6ECE0', '#EFE2D1']} style={StyleSheet.absoluteFill} />

      <LinearGradient
        colors={['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topMist}
      />

      <Animated.View
        style={[
          styles.blob,
          styles.blobA,
          {
            transform: [
              { translateX: blobATranslateX },
              { translateY: blobATranslateY },
              { scale: blobAScale },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.blob,
          styles.blobB,
          {
            transform: [
              { translateX: blobBTranslateX },
              { translateY: blobBTranslateY },
              { scale: blobBScale },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.blob,
          styles.blobC,
          {
            transform: [
              { translateX: blobCTranslateX },
              { translateY: blobCTranslateY },
              { scale: blobCScale },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.blob,
          styles.blobD,
          {
            transform: [
              { translateX: blobDTranslateX },
              { translateY: blobDTranslateY },
              { scale: blobDScale },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.blob,
          styles.blobE,
          {
            transform: [
              { translateX: blobETranslateX },
              { translateY: blobETranslateY },
              { scale: blobEScale },
            ],
          },
        ]}
      />

      <View style={styles.textureLayer} />

      <LinearGradient
        colors={['rgba(132, 109, 89, 0.05)', 'rgba(132, 109, 89, 0.0)']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.bottomDepth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: '#F7F0E6',
  },
  topMist: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobA: {
    width: 270,
    height: 270,
    top: -82,
    left: -76,
    backgroundColor: 'rgba(255, 196, 146, 0.25)',
  },
  blobB: {
    width: 320,
    height: 320,
    right: -120,
    bottom: -120,
    backgroundColor: 'rgba(173, 202, 252, 0.24)',
  },
  blobC: {
    width: 210,
    height: 210,
    top: '22%',
    left: '55%',
    backgroundColor: 'rgba(189, 227, 208, 0.2)',
  },
  blobD: {
    width: 220,
    height: 220,
    top: '48%',
    left: '-14%',
    backgroundColor: 'rgba(255, 221, 184, 0.2)',
  },
  blobE: {
    width: 180,
    height: 180,
    top: '8%',
    left: '26%',
    backgroundColor: 'rgba(215, 223, 255, 0.22)',
  },
  textureLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(120, 92, 72, 0.024)',
  },
  bottomDepth: {
    ...StyleSheet.absoluteFillObject,
  },
});
