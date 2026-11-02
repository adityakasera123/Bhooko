import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Theme } from '../../theme';
import type { HomeTab } from '../../screens/home/HomeScreen';

type BottomTabBarProps = {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
};

const tabs: { key: HomeTab; label: string; symbol: string }[] = [
  { key: 'home', label: 'Home', symbol: '⌂' },
  { key: 'search', label: 'Search', symbol: '⌕' },
  { key: 'orders', label: 'Orders', symbol: '▤' },
  { key: 'profile', label: 'Profile', symbol: '○' },
];

export default function BottomTabBar({
  activeTab,
  onTabChange,
}: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.symbol, isActive && styles.activeText]}>
              {tab.symbol}
            </Text>
            <Text style={[styles.label, isActive && styles.activeText]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  symbol: {
    fontSize: 23,
    color: Theme.colors.textSecondary,
  },
  label: {
    fontSize: Theme.typography.size.xs,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  activeText: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -Theme.spacing.sm,
    width: 20,
    height: 3,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.primary,
  },
});
