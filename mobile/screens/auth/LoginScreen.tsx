import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setError('Please enter your mobile number, username, or staff ID');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password or PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Account Support',
      'For password or PIN reset assistance, please contact Jenista Chit Funds customer desk at 0422-2490123 or WhatsApp +91 9840123456.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Section */}
          <View style={styles.header}>
            {/* Logo without black border */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appTitle}>JENISTA CHITS</Text>

            <View style={styles.subDividerRow}>
              <View style={styles.subDividerLine} />
              <Text style={styles.appSubtitle}>Smart Chit Fund Management</Text>
              <View style={styles.subDividerLine} />
            </View>

            {/* Motivational Tagline from Screenshot 3 */}
            <View style={styles.quoteBox}>
              <Text style={styles.quoteText}>Plan Today...</Text>
              <Text style={styles.quoteTextBold}>Grow Tomorrow...</Text>
              <View style={styles.goldSwoosh} />
            </View>
          </View>

          {/* Floating White Card (Screenshot 3 Design) */}
          <View style={styles.card}>
            {/* Circular Avatar Header */}
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={28} color="#102B63" />
            </View>

            <Text style={styles.cardTitle}>Welcome Back!</Text>
            <Text style={styles.cardSubtitle}>Sign in to access your account</Text>

            {/* Carousel Dots */}
            <View style={styles.carouselDots}>
              <View style={styles.activeDash} />
              <View style={styles.inactiveDot} />
              <View style={styles.inactiveDot} />
            </View>

            {/* Error Banner */}
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={17} color={Colors.danger} />
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {/* Identifier Input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Mobile Number / Username / Staff ID</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="phone-portrait-outline" size={19} color="#102B63" style={styles.inputIcon} />
                <Input
                  label=""
                  placeholder="e.g. 9840123456, admin, staff"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (error) setError('');
                  }}
                  containerStyle={{ marginBottom: 0, flex: 1 }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Password / Security PIN</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={19} color="#102B63" style={styles.inputIcon} />
                <Input
                  label=""
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  containerStyle={{ marginBottom: 0, flex: 1 }}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={19}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  }
                />
              </View>
            </View>

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Big Navy Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {isLoading ? 'Signing In...' : 'Sign In to Account'}
              </Text>
            </TouchableOpacity>

            {/* Security Note */}
            <View style={styles.secureBadgeRow}>
              <Ionicons name="shield-checkmark" size={14} color="#102B63" />
              <Text style={styles.secureBadgeText}>Secure & Trusted</Text>
            </View>
          </View>

          {/* 3 Trust Pillars at Bottom */}
          <View style={styles.trustPillarsRow}>
            <View style={styles.pillarItem}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#102B63" />
              <Text style={styles.pillarText}>Secure Access</Text>
            </View>
            <View style={styles.pillarDivider} />
            <View style={styles.pillarItem}>
              <Ionicons name="hand-left-outline" size={18} color="#102B63" />
              <Text style={styles.pillarText}>Trusted Service</Text>
            </View>
            <View style={styles.pillarDivider} />
            <View style={styles.pillarItem}>
              <Ionicons name="trending-up-outline" size={18} color="#102B63" />
              <Text style={styles.pillarText}>Better Savings</Text>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F6FF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    maxWidth: 420,
  },
  logoContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  logoImg: {
    width: 68,
    height: 68,
    borderRadius: 14,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102B63',
    letterSpacing: 0.8,
  },
  subDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 8,
  },
  subDividerLine: {
    width: 24,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  quoteBox: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#1E3A8A',
  },
  quoteTextBold: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#102B63',
    marginTop: -2,
  },
  goldSwoosh: {
    width: 90,
    height: 3,
    backgroundColor: '#D7A928',
    borderRadius: 2,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 24,
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#102B63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#102B63',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  carouselDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 12,
  },
  activeDash: {
    width: 24,
    height: 4,
    backgroundColor: '#102B63',
    borderRadius: 2,
  },
  inactiveDot: {
    width: 14,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    width: '100%',
    gap: 8,
  },
  errorMessage: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  fieldWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
    marginBottom: 16,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#102B63',
    borderColor: '#102B63',
  },
  rememberMeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  forgotText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102B63',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    elevation: 2,
    shadowColor: '#102B63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secureBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  secureBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#102B63',
  },
  trustPillarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 380,
    marginTop: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillarItem: {
    alignItems: 'center',
    gap: 3,
  },
  pillarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#102B63',
  },
  pillarDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
});
