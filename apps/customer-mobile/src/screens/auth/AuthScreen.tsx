
import React, { useState } from 'react';

import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';

interface AuthScreenProps {
  onLogin?: (email: string, password: string) => Promise<void> | void;

  onRegister?: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<void> | void;
}

export default function AuthScreen({
  onLogin,
  onRegister,
}: AuthScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'signup'>(
    'login',
  );

  if (currentScreen === 'signup') {
    return (
      <SignupScreen
        onRegister={onRegister}
        onLogin={() => setCurrentScreen('login')}
      />
    );
  }

  return (
    <LoginScreen
      onLogin={onLogin}
      onSignup={() => setCurrentScreen('signup')}
    />
  );
}
