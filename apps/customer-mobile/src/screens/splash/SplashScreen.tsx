import { useEffect, useRef } from 'react';

import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({
  onFinish,
}: SplashScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 14,
          bounciness: 5,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(850),
    ]);

    intro.start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });

    return () => {
      intro.stop();
    };
  }, [opacity, scale, translateY, onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Animated.View
          style={[
            styles.logoMark,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Text style={styles.logoLetter}>B</Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity,
            transform: [{ translateY }],
          }}
        >
          <Text style={styles.logoText}>BHOOKO</Text>
          <Text style={styles.tagline}>
            Your cravings, delivered.
          </Text>
        </Animated.View>
      </View>

      <Text style={styles.footer}>
        MADE FOR YOUR CRAVINGS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: '#F36C3D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#B94A25',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 60,
  },
  logoText: {
    color: '#27211E',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 5,
    textAlign: 'center',
  },
  tagline: {
    color: '#786B64',
    fontSize: 14,
    marginTop: 9,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: 42,
    color: '#A18E83',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
