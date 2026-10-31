import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1800,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 1. Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // 2. Pulse glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // 3. Exit animation after duration
    const timer = setTimeout(() => {
      Animated.timing(exitAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setVisible(false);
        if (onFinish) onFinish();
      });
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: exitAnim }]}>
      <Animated.View
        style={[
          styles.contentBox,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Glowing Badge Container */}
        <Animated.View style={[styles.logoWrapper, { opacity: glowAnim }]}>
          <View style={styles.glowOuterCircle} />
        </Animated.View>

        <View style={styles.logoCircle}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Brand Titles */}
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>GOVERNMENT APPROVED</Text>
        </View>

        <Text style={styles.brandTitle}>JENISTA CHITS</Text>
        <Text style={styles.brandSubtitle}>Smart Chit Fund Management</Text>

        {/* Loader Indicator */}
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={Colors.gold.primary} />
          <Text style={styles.loadingText}>Initializing secure workspace...</Text>
        </View>
      </Animated.View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <Text style={styles.footerTag}>100% Transparent & Legally Registered</Text>
        <Text style={styles.footerVersion}>v1.0.6 • Enterprise Edition</Text>
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#070E1A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  contentBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 420,
    width: '100%',
  },
  logoWrapper: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuterCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 191, 50, 0.15)',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255, 191, 50, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
    marginBottom: 20,
  },
  logoImage: {
    width: 86,
    height: 86,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 191, 50, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 191, 50, 0.35)',
    marginBottom: 10,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gold.primary,
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gold.primary,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    alignItems: 'center',
    gap: 4,
  },
  footerTag: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.2,
  },
  footerVersion: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 191, 50, 0.7)',
  },
});
