
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

interface LoginScreenProps {
  onLogin?: (email: string, password: string) => Promise<void> | void;
  onSignup?: () => void;
}

export default function LoginScreen({
  onLogin,
  onSignup,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const handleLogin = async () => {
    if (loading) return;

    const newErrors = {
      email: '',
      password: '',
    };

    if (!email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Please enter your password';
    } else if (password.length < 8 || password.length > 128) {
      newErrors.password = 'Password must be 8–128 characters';
    }

    setErrors(newErrors);

    if (newErrors.email || newErrors.password) {
      return;
    }

    if (!onLogin) {
      Alert.alert(
        'UI Preview',
        'Login UI is ready. Backend integration is not connected yet.',
      );
      return;
    }

    try {
      setLoading(true);
      await onLogin(email.trim(), password);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';

      Alert.alert('Login Failed', message);
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
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>B</Text>
              </View>

              <Text style={styles.brandName}>BHOOKO</Text>

              <Text style={styles.tagline}>
                Good food. Good mood.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.heading}>Welcome back!</Text>

              <Text style={styles.subheading}>
                Sign in to discover delicious food near you.
              </Text>

              <View style={styles.inputContainer}>
                <AuthInput
                  label="Email address"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errors.email) {
                      setErrors((prev) => ({
                        ...prev,
                        email: '',
                      }));
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                  error={errors.email}
                  returnKeyType="next"
                />

                <View style={styles.passwordWrapper}>
                  <AuthInput
                    label="Password"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (errors.password) {
                        setErrors((prev) => ({
                          ...prev,
                          password: '',
                        }));
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    editable={!loading}
                    error={errors.password}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
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
              </View>

              <PrimaryButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
              />

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>
                  Don't have an account?{' '}
                </Text>

                <Pressable
                  onPress={onSignup}
                  hitSlop={8}
                  disabled={loading}
                >
                  <Text style={styles.signupLink}>
                    Create account
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
    paddingTop: 38,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 42,
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  logoText: {
    color: Colors.white,
    fontSize: 44,
    fontWeight: '800',
  },
  brandName: {
    color: Colors.brown,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 3,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
  },
  heading: {
    color: Colors.text,
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 9,
  },
  subheading: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 8,
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
  },
  signupText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  signupLink: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
  },
});
