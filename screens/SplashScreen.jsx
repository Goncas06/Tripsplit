import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, StatusBar, Dimensions } from 'react-native';

const { width: W } = Dimensions.get('window');
const PRIMARY = '#5B8AFF';

export default function SplashScreen() {
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;
  const carX      = useRef(new Animated.Value(-80)).current;
  const carBob    = useRef(new Animated.Value(0)).current;
  const dashOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();

      // Loading dots
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.delay(180),
          Animated.parallel([
            Animated.timing(dot1, { toValue: 0.2, duration: 260, useNativeDriver: true }),
            Animated.timing(dot2, { toValue: 0.2, duration: 260, useNativeDriver: true }),
            Animated.timing(dot3, { toValue: 0.2, duration: 260, useNativeDriver: true }),
          ]),
          Animated.delay(80),
        ])
      ).start();
    });

    // Car loop
    Animated.loop(
      Animated.timing(carX, { toValue: W + 80, duration: 3000, useNativeDriver: true })
    ).start();

    // Car bob
    Animated.loop(
      Animated.sequence([
        Animated.timing(carBob, { toValue: -2, duration: 160, useNativeDriver: true }),
        Animated.timing(carBob, { toValue: 2,  duration: 160, useNativeDriver: true }),
        Animated.timing(carBob, { toValue: -1, duration: 120, useNativeDriver: true }),
        Animated.timing(carBob, { toValue: 0,  duration: 120, useNativeDriver: true }),
      ])
    ).start();

    // Road dashes
    Animated.loop(
      Animated.timing(dashOffset, { toValue: -60, duration: 380, useNativeDriver: true })
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      {/* Subtle background glow */}
      <Animated.View style={[styles.bgGlow, { opacity: glowOpacity }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoRing}>
          <View style={styles.logoCard}>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.appName}>TripSplit</Text>
        <Text style={styles.tagline}>Divide despesas, guarda memórias</Text>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>
      </Animated.View>

      {/* Road scene */}
      <View style={styles.roadScene}>
        <View style={styles.roadGround} />
        <View style={styles.road}>
          {/* Dashes */}
          <View style={styles.dashRow}>
            <Animated.View style={[styles.dashTrack, { transform: [{ translateX: dashOffset }] }]}>
              {Array.from({ length: 14 }).map((_, i) => (
                <View key={i} style={styles.dash} />
              ))}
            </Animated.View>
          </View>
          {/* Car */}
          <Animated.Text style={[styles.car, { transform: [{ translateX: carX }, { translateY: carBob }] }]}>
            🚗
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#000000',
    justifyContent: 'center', alignItems: 'center',
  },

  // Subtle blue glow in center
  bgGlow: {
    position: 'absolute',
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(91,138,255,0.06)',
    top: '20%',
  },

  logoWrap:  { marginBottom: 32 },
  logoRing:  {
    width: 128, height: 128, borderRadius: 64,
    borderWidth: 1, borderColor: 'rgba(91,138,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoCard:  {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: '#0D0D18',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: PRIMARY, shadowOpacity: 0.35,
    shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  logo: { width: 72, height: 72 },

  textBlock: { alignItems: 'center', marginBottom: 16 },
  appName:   {
    fontSize: 36, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.8, marginBottom: 8,
  },
  tagline:   {
    fontSize: 14, color: 'rgba(148,163,184,0.9)',
    marginBottom: 36, letterSpacing: 0.1,
  },
  dotsRow:   { flexDirection: 'row', gap: 8 },
  dot:       {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: PRIMARY,
  },

  // Road
  roadScene: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
    overflow: 'hidden',
  },
  roadGround: {
    position: 'absolute', bottom: 56, left: 0, right: 0, height: 18,
    backgroundColor: 'rgba(91,138,255,0.04)',
  },
  road: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 56,
    backgroundColor: '#0A0A14',
    borderTopWidth: 1, borderTopColor: 'rgba(91,138,255,0.12)',
    justifyContent: 'center', overflow: 'hidden',
  },
  dashRow:   {
    position: 'absolute', top: '50%', left: 0, right: 0,
    height: 5, marginTop: -2.5, overflow: 'hidden',
  },
  dashTrack: { flexDirection: 'row', alignItems: 'center' },
  dash:      {
    width: 32, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(91,138,255,0.35)', marginRight: 28,
  },
  car: {
    position: 'absolute', bottom: 6,
    fontSize: 34, left: 0,
  },
});
