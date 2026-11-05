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

  const handleQuickFill = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Banner with Project Logo */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appTitle}>JENISTA CHITS</Text>
            <Text style={styles.appSubtitle}>Smart Chit Fund Management</Text>
          </View>

          {/* Single Unified Role-Based Login Card */}
          <View style={styles.card}>
            {/* Unified Role Badge */}
            <View style={styles.roleBanner}>
              <View style={styles.roleIconCircle}>
                <Ionicons name="shield-checkmark" size={16} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleBannerTitle}>Universal Sign In</Text>
                <Text style={styles.roleBannerSubtitle}>Customer • Staff • Administrator</Text>
              </View>
            </View>

            {/* Error banner */}
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {/* Unified Identifier Input */}
            <Input
              label="Mobile Number / Username / Staff ID"
              placeholder="e.g. 9840123456, admin, staff"
              autoCapitalize="none"
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (error) setError('');
              }}
              leftIcon={<Ionicons name="person-circle-outline" size={20} color={Colors.neutral[400]} />}
            />

            {/* Password Input */}
            <Input
              label="Password / Security PIN"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.neutral[400]} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={Colors.neutral[400]}
                  />
                </TouchableOpacity>
              }
            />

            <Button
              title="Sign In to Account"
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.submitBtn}
            />

            {/* Quick Demo Credentials Access */}
            <View style={styles.quickAccessSection}>
              <Text style={styles.quickAccessLabel}>QUICK TEST LOGIN</Text>
              <View style={styles.quickChipsRow}>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleQuickFill('admin', 'admin')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shield" size={12} color="#1D4ED8" />
                  <Text style={styles.quickChipText}>Admin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleQuickFill('staff', 'staff')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="briefcase" size={12} color="#059669" />
                  <Text style={styles.quickChipText}>Staff</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleQuickFill('customer', 'customer')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person" size={12} color="#7C3AED" />
                  <Text style={styles.quickChipText}>Customer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Jenista Chit Funds • ISO Certified • Secure 256-Bit</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 440,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  logoImg: {
    width: 76,
    height: 76,
    borderRadius: 18,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#38BDF8',
    marginTop: 3,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 10,
  },
  roleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  roleBannerSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorMessage: {
    flex: 1,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 8,
  },
  quickAccessSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  quickAccessLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '500',
  },
});
