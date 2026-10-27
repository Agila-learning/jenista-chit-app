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
  const { loginAsCustomer, loginAsAdminOrStaff } = useAuth();
  const [authMode, setAuthMode] = useState<'CUSTOMER' | 'STAFF_ADMIN'>('CUSTOMER');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setError(authMode === 'CUSTOMER' ? 'Please enter mobile number' : 'Please enter username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password / OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (authMode === 'CUSTOMER') {
        await loginAsCustomer(identifier, password);
      } else {
        await loginAsAdminOrStaff(identifier, password);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
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
          {/* Header Banner */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 72, height: 72, borderRadius: 16 }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appTitle}>JENISTA CHITS</Text>
            <Text style={styles.appSubtitle}>Smart Chit Fund Management</Text>
          </View>

          {/* Card Container */}
          <View style={styles.card}>
            {/* Mode Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, authMode === 'CUSTOMER' && styles.tabActive]}
                onPress={() => {
                  setAuthMode('CUSTOMER');
                  setError('');
                }}
              >
                <Ionicons
                  name="person"
                  size={16}
                  color={authMode === 'CUSTOMER' ? Colors.secondary[900] : Colors.neutral[500]}
                />
                <Text
                  style={[styles.tabText, authMode === 'CUSTOMER' && styles.tabTextActive]}
                >
                  Customer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, authMode === 'STAFF_ADMIN' && styles.tabActive]}
                onPress={() => {
                  setAuthMode('STAFF_ADMIN');
                  setError('');
                }}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={authMode === 'STAFF_ADMIN' ? Colors.secondary[900] : Colors.neutral[500]}
                />
                <Text
                  style={[styles.tabText, authMode === 'STAFF_ADMIN' && styles.tabTextActive]}
                >
                  Admin / Staff
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error banner */}
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {/* Fields */}
            {authMode === 'CUSTOMER' ? (
              <Input
                label="Registered Mobile Number"
                placeholder="e.g. 9840123456"
                keyboardType="phone-pad"
                value={identifier}
                onChangeText={setIdentifier}
                leftIcon={<Ionicons name="call-outline" size={18} color={Colors.neutral[400]} />}
              />
            ) : (
              <Input
                label="Username / Staff ID"
                placeholder="e.g. admin or staff"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
                leftIcon={<Ionicons name="person-outline" size={18} color={Colors.neutral[400]} />}
              />
            )}

            <Input
              label="Password / Security PIN"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
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
              title={authMode === 'CUSTOMER' ? 'Sign In to Account' : 'Authenticate & Sign In'}
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Secure Chit Fund Platform v1.0.6</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.navy.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 191, 50, 0.4)',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: Colors.gold.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.gold.primary,
    shadowColor: Colors.gold.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#0B1A30',
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorMessage: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  submitBtn: {
    marginTop: 8,
  },
  demoHelper: {
    marginTop: 20,
    padding: 12,
    backgroundColor: Colors.secondary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondary[200],
  },
  demoHelperTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary[600],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  demoHelperRow: {
    fontSize: 12,
    color: Colors.secondary[700],
    marginVertical: 1,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
});
