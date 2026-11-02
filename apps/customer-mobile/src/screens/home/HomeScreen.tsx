import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import HomeSkeleton from '../../components/home/HomeSkeleton';
import { Theme } from '../../theme';

export type HomeTab = 'home' | 'search' | 'orders' | 'profile';

type HomeScreenProps = {
  activeTab: HomeTab;
};

const tabContent: Record<
  Exclude<HomeTab, 'home'>,
  { title: string; description: string; symbol: string }
> = {
  search: {
    title: 'Find your favourites',
    description: 'Search for dishes and restaurants will be available here.',
    symbol: '⌕',
  },
  orders: {
    title: 'Your orders',
    description: 'Your active and previous orders will appear here.',
    symbol: '▤',
  },
  profile: {
    title: 'Your profile',
    description: 'Your account details and preferences will appear here.',
    symbol: '○',
  },
};

export default function HomeScreen({ activeTab }: HomeScreenProps) {
  if (activeTab === 'home') {
    return <HomeSkeleton />;
  }

  const content = tabContent[activeTab];

  return (
    <View style={styles.placeholderContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{content.symbol}</Text>
      </View>

      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.description}>{content.description}</Text>
      <Text style={styles.comingSoon}>COMING SOON</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xxxl,
    backgroundColor: Theme.colors.background,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
  },
  icon: {
    fontSize: 34,
    color: Theme.colors.primary,
  },
  title: {
    fontSize: Theme.typography.size.xl,
    fontWeight: '700',
    color: Theme.colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: Theme.typography.size.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Theme.spacing.sm,
  },
  comingSoon: {
    marginTop: Theme.spacing.xl,
    color: Theme.colors.primary,
    fontSize: Theme.typography.size.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
