import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  Platform,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

const SCREENS = [
  {
    id: 1,
    title: 'Jenista CHITS',
    subtitle: 'Your Trust • Our Commitment',
    tagline: 'Together Towards Your Bigger Dreams',
    image: require('../../assets/loading-screen-1.png'),
    progress: '33%',
    progressStep: 1,
  },
  {
    id: 2,
    title: 'Jenista CHITS',
    subtitle: 'Save Today • Grow Tomorrow',
    tagline: 'Small Steps Build Big Futures',
    image: require('../../assets/loading-screen-2.png'),
    progress: '66%',
    progressStep: 2,
  },
  {
    id: 3,
    title: 'Jenista CHITS',
    subtitle: 'Plan • Save • Achieve',
    tagline: 'Your Growth Is Our Success',
    image: require('../../assets/loading-screen-3.png'),
    progress: '100%',
    progressStep: 3,
  },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 2000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.33)).current;

  // Auto progression timer across the 3 screens
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev < SCREENS.length - 1) {
          const nextIndex = prev + 1;
          animateToStep(nextIndex);
          return nextIndex;
        } else {
          clearInterval(timer);
          finishSequence();
          return prev;
        }
      });
    }, minDurationMs);

    return () => clearInterval(timer);
  }, [minDurationMs]);

  const animateToStep = (index: number) => {
    // Quick cross fade
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Progress bar fill
    Animated.timing(progressAnim, {
      toValue: (index + 1) / SCREENS.length,
      duration: 350,
      useNativeDriver: false,
    }).start();
  };

  const handleNext = () => {
    if (currentIndex < SCREENS.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      animateToStep(nextIndex);
    } else {
      finishSequence();
    }
  };

  const finishSequence = () => {
    Animated.timing(exitAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      if (onFinish) onFinish();
    });
  };

  const currentScreen = SCREENS[currentIndex];

  return (
    <Animated.View style={[styles.container, { opacity: exitAnim }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header with Skip Button */}
        <View style={styles.topBar}>
          <View style={styles.brandBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.gold.primary} />
            <Text style={styles.brandBadgeText}>GOVERNMENT REGISTERED</Text>
          </View>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={finishSequence}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.gold.primary} />
          </TouchableOpacity>
        </View>

        {/* Screen Content */}
        <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
          {/* Main Cropped Screen Image */}
          <View style={styles.imageCard}>
            <Image
              source={currentScreen.image}
              style={styles.screenImage}
              resizeMode="contain"
            />
          </View>

          {/* Stepper Dots & Indicator */}
          <View style={styles.stepperRow}>
            {SCREENS.map((s, idx) => (
              <View
                key={s.id}
                style={[
                  styles.stepDot,
                  idx === currentIndex && styles.stepDotActive,
                  idx < currentIndex && styles.stepDotCompleted,
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Bottom Bar: Action & Continuous Progress */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === SCREENS.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={currentIndex === SCREENS.length - 1 ? 'arrow-forward' : 'arrow-forward-outline'}
              size={18}
              color="#0B1A30"
            />
          </TouchableOpacity>

          <Text style={styles.footerLegal}>
            Jenista Chit Funds • Secure & Transparent Savings
          </Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#070E1A',
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
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  brandBadgeText: {
    color: Colors.gold.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skipButtonText: {
    color: Colors.gold.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  imageCard: {
    width: Math.min(width * 0.88, 360),
    height: Math.min(height * 0.65, 580),
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0A1322',
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    shadowColor: Colors.gold.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenImage: {
    width: '100%',
    height: '100%',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    width: 28,
    backgroundColor: Colors.gold.primary,
  },
  stepDotCompleted: {
    backgroundColor: 'rgba(217, 119, 6, 0.6)',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  nextButton: {
    backgroundColor: Colors.gold.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    color: '#0B1A30',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  footerLegal: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
