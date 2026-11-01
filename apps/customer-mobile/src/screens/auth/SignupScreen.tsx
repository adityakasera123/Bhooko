
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';

import AuthInput from '../../components/ui/AuthInput';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Colors } from '../../theme/colors';

interface SignupScreenProps {
  onRegister?: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<void> | void;

  onLogin?: () => void;
}

export default function SignupScreen({
  onRegister,
  onLogin,
}: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleRegister = async () => {
    if (loading) return;

    const newErrors = {
      name: '',
      email: '',
      phone: '',
      password: '',
    };

    if (name.trim().length < 2 || name.trim().length > 100) {
      newErrors.name = 'Name must be between 2 and 100 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!/^\+?[1-9]\d{9,14}$/.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (password.length < 8 || password.length > 128) {
      newErrors.password = 'Password must be 8–128 characters';
    }

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      return;
    }

    if (!onRegister) {
      Alert.alert(
        'UI Preview',
        'Signup UI is ready. Backend integration is not connected yet.',
      );
      return;
    }

    try {
      setLoading(true);

      await onRegister(
        name.trim(),
        email.trim(),
        phone.trim(),
        password,
      );

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';

      Alert.alert('Registration Failed', message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Pressable
              onPress={onLogin}
              style={styles.backButton}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>
                ← Back to Sign In
              </Text>
            </Pressable>

            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>B</Text>
              </View>

              <Text style={styles.brandName}>BHOOKO</Text>

              <Text style={styles.tagline}>
                Your food journey starts here.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.heading}>Create account</Text>

              <Text style={styles.subheading}>
                Join BHOOKO and discover your next favourite meal.
              </Text>

              <AuthInput
                label="Full name"
                placeholder="Enter your full name"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setErrors((prev) => ({
                    ...prev,
                    name: '',
                  }));
                }}
                autoCapitalize="words"
                autoComplete="name"
                error={errors.name}
                returnKeyType="next"
              />

              <AuthInput
                label="Email address"
                placeholder="Enter your email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrors((prev) => ({
                    ...prev,
                    email: '',
                  }));
                }}
                keyboardType="email-address"
                autoComplete="email"
                error={errors.email}
                returnKeyType="next"
              />

              <AuthInput
                label="Phone number"
                placeholder="e.g. 9876543210"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setErrors((prev) => ({
                    ...prev,
                    phone: '',
                  }));
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                error={errors.phone}
                returnKeyType="next"
              />

              <View style={styles.passwordWrapper}>
                <AuthInput
                  label="Password"
                  placeholder="Create a password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setErrors((prev) => ({
                      ...prev,
                      password: '',
                    }));
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  error={errors.password}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />

                <Pressable
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                  disabled={loading}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.passwordHint}>
                Use at least 8 characters for your password.
              </Text>

              <PrimaryButton
                title="Create Account"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={styles.registerButton}
              />

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>
                  Already have an account?{' '}
                </Text>

                <Pressable
                  onPress={onLogin}
                  hitSlop={8}
                  disabled={loading}
                >
                  <Text style={styles.loginLink}>
                    Sign In
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.footer}>
            Made with love for food lovers ❤️
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 20,
  },

  backButtonText: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    elevation: 3,
  },

  logoText: {
    color: Colors.white,
    fontSize: 38,
    fontWeight: '800',
  },

  brandName: {
    color: Colors.brown,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 3,
  },

  tagline: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  formContainer: {
    width: '100%',
  },

  heading: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },

  subheading: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 25,
  },

  passwordWrapper: {
    position: 'relative',
  },

  passwordToggle: {
    position: 'absolute',
    right: 15,
    top: 39,
    padding: 5,
  },

  passwordToggleText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },

  passwordHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 20,
  },

  registerButton: {
    marginTop: 4,
  },

  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },

  loginText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },

  loginLink: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },

  footer: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
  },
});
