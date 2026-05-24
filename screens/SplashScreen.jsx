import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, StatusBar } from 'react-native';

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.delay(200),
          Animated.parallel([
            Animated.timing(dot1, { toValue: 0.3, duration: 280, useNativeDriver: true }),
            Animated.timing(dot2, { toValue: 0.3, duration: 280, useNativeDriver: true }),
            Animated.timing(dot3, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          ]),
          Animated.delay(100),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0062cc" translucent={false} />

      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />
      <View style={styles.circleSmall} />

      <Animated.View style={[styles.logoWrapper, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoCard}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.appName}>TripSplit</Text>
        <Text style={styles.tagline}>Divide despesas, guarda memórias</Text>

        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleTopRight: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -110,
    left: -70,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleSmall: {
    position: 'absolute',
    top: 100,
    left: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoWrapper: {
    marginBottom: 36,
  },
  logoCard: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  logo: {
    width: 90,
    height: 90,
  },
  textBlock: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 38,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 40,
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
