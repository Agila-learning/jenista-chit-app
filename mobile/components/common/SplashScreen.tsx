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
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const [loadingStep, setLoadingStep] = useState('Securing session...');

  useEffect(() => {
    // 1. Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // 2. Pulse animation for brand glow
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulseLoop.start();

    // 3. Progress bar fill
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: minDurationMs,
      useNativeDriver: false,
    }).start();

    // Step text updates
    const t1 = setTimeout(() => setLoadingStep('Syncing Chit Ledgers...'), 600);
    const t2 = setTimeout(() => setLoadingStep('Ready to Serve'), 1200);

    // 4. Exit sequence
    const exitTimer = setTimeout(() => {
      finishSplash();
    }, minDurationMs);

    return () => {
      pulseLoop.stop();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(exitTimer);
    };
  }, [minDurationMs]);

  const finishSplash = () => {
    Animated.timing(exitAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      if (onFinish) onFinish();
    });
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: exitAnim }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Skip button in header */}
        <View style={styles.topBar}>
          <View style={styles.govBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#F59E0B" />
            <Text style={styles.govBadgeText}>GOVT. REGISTERED CHIT FUND</Text>
          </View>
          <TouchableOpacity onPress={finishSplash} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipBtnText}>Skip</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        </View>

        {/* Center Animated Brand Content */}
        <Animated.View
          style={[
            styles.centerBox,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Glowing Aura Ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Logo Card */}
          <View style={styles.logoCard}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Brand Titles */}
          <Text style={styles.brandTitle}>JENISTA CHITS</Text>
          <Text style={styles.brandTagline}>Smart • Transparent • Secure Savings</Text>

          {/* Animated Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#D7A928" />
              <Text style={styles.loadingStepText}>{loadingStep}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLegal}>Jenista Chit Funds Pvt. Ltd. • Govt. Act 1982</Text>
          <Text style={styles.footerSecurity}>
            <Ionicons name="lock-closed" size={11} color="rgba(215, 169, 40, 0.7)" /> 256-Bit Bank Grade Secured
          </Text>
        </View>
      </SafeAreaView>
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
    backgroundColor: '#0B1B3D',
    zIndex: 99999,
    elevation: 99999,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'android' ? 24 : 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  govBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(215, 169, 40, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(215, 169, 40, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  govBadgeText: {
    color: '#E6B024',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skipBtnText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glowRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(215, 169, 40, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(215, 169, 40, 0.35)',
  },
  logoCard: {
    width: 112,
    height: 112,
    borderRadius: 30,
    backgroundColor: '#0F2450',
    borderWidth: 2,
    borderColor: 'rgba(215, 169, 40, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D7A928',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D7A928',
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  progressContainer: {
    width: Math.min(width * 0.75, 280),
    marginTop: 36,
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#D7A928',
    borderRadius: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingStepText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 8,
  },
  footerLegal: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  footerSecurity: {
    color: 'rgba(215, 169, 40, 0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
});
