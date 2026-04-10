import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onEnter: () => void;
};

const taglines = [
  'Elevate your everyday.',
  'The art of living well.',
  'Intentional living, curated.',
];

export function LandingExperience({ onEnter }: Props) {
  const [activeTagline, setActiveTagline] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 850, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveTagline((prev) => (prev + 1) % taglines.length);
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <LinearGradient colors={['#0F1A2B', '#1B355B', '#A2392B']} style={styles.root}>
      <View style={styles.overlayOrbOne} />
      <View style={styles.overlayOrbTwo} />

      <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
        <View style={styles.brandWrap}>
          <Text
            style={styles.brand}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.62}
            allowFontScaling={false}
          >
            Olive & Oak
          </Text>
        </View>
        <Text style={styles.tagline}>{taglines[activeTagline]}</Text>

        <Pressable style={styles.enterButton} onPress={onEnter}>
          <Text style={styles.enterText}>Enter Experience</Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  center: {
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
  },
  brandWrap: {
    width: '100%',
    paddingHorizontal: 6,
  },
  brand: {
    color: '#F7F2E9',
    fontSize: 56,
    lineHeight: 62,
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  tagline: {
    marginTop: 16,
    color: '#ECE6DB',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 12,
    textAlign: 'center',
  },
  enterButton: {
    marginTop: 26,
    borderWidth: 1,
    borderColor: 'rgba(247, 242, 233, 0.72)',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(10, 18, 30, 0.38)',
  },
  enterText: {
    color: '#F7F2E9',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 12,
  },
  overlayOrbOne: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 999,
    top: -100,
    left: -120,
    backgroundColor: 'rgba(109, 177, 242, 0.26)',
  },
  overlayOrbTwo: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 999,
    bottom: -120,
    right: -120,
    backgroundColor: 'rgba(200, 80, 52, 0.28)',
  },
});
